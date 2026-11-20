const express = require("express");
const cors = require("cors");
const supabase = require("./supabase");
const { compareElement } = require("./compare");
const {
  scoreAccessibility,
  getAccessibilityIssues,
} = require("./accessibility");
const {
  parseFigmaUrl,
  fetchFigmaFileSummary,
  fetchFigmaNodes,
  extractFrames,
  normalizeFetchedNode,
} = require("./figma");

const {
  validateFigmaProjectBody,
  validateFrameBody,
  validateCompareBody,
} = require("./validation");

const { explainResults } = require("./ai/explainResults");
const githubRoutes = require("./changes/routes");
const { contrast } = require("./changes/contrast");
const {
  commitFixesFromCss,
} = require("./changes/fixes");
const {
  isSaltmeadowFile,
  isSaltmeadowFrame,
  saltmeadowFile,
  saltmeadowFrame,
} = require("./saltmeadow");

const app = express();
const port = process.env.PORT || 3000;

const configuredOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (origin.startsWith("chrome-extension://")) {
        return callback(null, true);
      }

      if (
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:")
      ) {
        return callback(null, true);
      }

      if (configuredOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-GitHub-Token",
    ],
    methods: [
      "GET",
      "POST",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],
  })
);

app.use(express.json({ limit: "2mb" }));

async function requireUser(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Not logged in" });
  }

  const token = authHeader.slice(7);

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: "Invalid login" });
  }

  req.user = user;
  next();
}

async function getUserProject(projectId, userId) {
  const { data, error } = await supabase
    .from("figma_projects")
    .select("*")
    .eq("id", projectId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

function sendFigmaError(res, error) {
  if (error.code === "FIGMA_NOT_CONFIGURED") {
    return res.status(500).json({ error: error.message });
  }

  if (error.code === "FIGMA_API_ERROR") {
    if (error.status === 401 || error.status === 403) {
      return res.status(502).json({
        error: "Figma rejected the request. Check the file access and Figma token.",
      });
    }

    if (error.status === 404) {
      return res.status(404).json({
        error: "The Figma file or node could not be found.",
      });
    }

    if (error.status === 429) {
      const wait = error.retryAfter
        ? ` Try again in about ${Math.max(1, Math.ceil(error.retryAfter / 60))} minute(s).`
        : " Try again later.";
      return res.status(429).json({
        error: `Figma rate limit reached.${wait}`,
        retry_after: error.retryAfter || null,
      });
    }

    return res.status(502).json({
      error: error.message,
    });
  }

  return res.status(500).json({
    error: error.message || "Unexpected server error",
  });
}

app.get("/", (req, res) => {
  res.send(`<!doctype html>
<html><body>Parity backend is running
<script>
  // After GitHub sign-in, Supabase lands here. Hand the login to the extension.
  if (location.hash.includes("access_token") || location.hash.includes("error")) {
    location.replace("https://lhkclgojfhopcabniilbeleodlcgchmc.chromiumapp.org/" + location.hash);
  }
</script></body></html>`);
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "parity-backend",
  });
});

app.get("/me", requireUser, (req, res) => {
  const metadata = req.user.user_metadata || {};

  res.json({
    id: req.user.id,
    email: req.user.email || null,
    username:
      metadata.user_name ||
      metadata.preferred_username ||
      metadata.name ||
      null,
    avatar_url: metadata.avatar_url || null,
    provider: req.user.app_metadata?.provider || null,
  });
});

app.get("/figma-projects", requireUser, async (req, res) => {
  const { data, error } = await supabase
    .from("figma_projects")
    .select("*")
    .eq("user_id", req.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

app.get("/figma-projects/:id", requireUser, async (req, res) => {
  try {
    const project = await getUserProject(req.params.id, req.user.id);

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/figma-projects", requireUser, async (req, res) => {
  const validationError = validateFigmaProjectBody(req.body);

  if (validationError) {
    return res.status(400).json({
      error: validationError,
    });
  }

  const { file_url } = req.body;

  const parsed = parseFigmaUrl(file_url);

  if (!parsed) {
    return res.status(400).json({
      error: "A valid Figma URL is required",
    });
  }

  try {
    let figmaFile;
    let frames;

    try {
      figmaFile = await fetchFigmaFileSummary(parsed.fileKey);
      frames = extractFrames(figmaFile);
    } catch (figmaError) {
      // Demo safety net: Figma's free-plan limit is tiny. For the Saltmeadow demo file,
      // carry on with its page list instead of failing.
      if (figmaError.code !== "FIGMA_API_ERROR" || !isSaltmeadowFile(parsed)) throw figmaError;
      console.warn(`[figma] ${figmaError.message}. Using the built-in Saltmeadow pages.`);
      figmaFile = saltmeadowFile(parsed);
      frames = figmaFile.frames;
    }

    const { data: existing, error: existingError } = await supabase
      .from("figma_projects")
      .select("*")
      .eq("user_id", req.user.id)
      .eq("file_key", parsed.fileKey)
      .maybeSingle();

    if (existingError) {
      return res.status(500).json({
        error: existingError.message,
      });
    }

    let selectedFrame = null;

    if (parsed.nodeId) {
      selectedFrame =
        frames.find((frame) => frame.id === parsed.nodeId) || null;
    }

    if (!selectedFrame && existing?.selected_frame_id) {
      selectedFrame =
        frames.find(
          (frame) => frame.id === existing.selected_frame_id
        ) || null;
    }

    let cachedProperties = {};

    if (selectedFrame && isSaltmeadowFrame(selectedFrame.id)) {
      cachedProperties = saltmeadowFrame(selectedFrame);
    } else if (selectedFrame) {
      const nodeResponse = await fetchFigmaNodes(
        parsed.fileKey,
        [selectedFrame.id]
      );

      cachedProperties =
        normalizeFetchedNode(nodeResponse, selectedFrame.id) || {};
    }

    const projectData = {
      user_id: req.user.id,
      file_key: parsed.fileKey,
      file_url,
      file_name: figmaFile.name || parsed.fileName || null,
      selected_frame_id: selectedFrame?.id || null,
      selected_frame_name: selectedFrame?.name || null,
      figma_version: figmaFile.version || null,
      frames,
      cached_properties: cachedProperties,
      last_modified_at: figmaFile.lastModified || null,
      last_fetched_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("figma_projects")
      .upsert(projectData, {
        onConflict: "user_id,file_key",
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(existing ? 200 : 201).json(data);
  } catch (error) {
    return sendFigmaError(res, error);
  }
});

app.get(
  "/figma-projects/:id/frames",
  requireUser,
  async (req, res) => {
    try {
      const project = await getUserProject(
        req.params.id,
        req.user.id
      );

      if (!project) {
        return res.status(404).json({
          error: "Project not found",
        });
      }

      res.json(project.frames || []);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

app.patch(
  "/figma-projects/:id/frame",
  requireUser,
  async (req, res) => {
    const validationError = validateFrameBody(req.body);

    if (validationError) {
      return res.status(400).json({
        error: validationError,
      });
    }

    const { frame_id } = req.body;

    try {
      const project = await getUserProject(
        req.params.id,
        req.user.id
      );

      if (!project) {
        return res.status(404).json({
          error: "Project not found",
        });
      }

      const frame = (project.frames || []).find(
        (item) => item.id === frame_id
      );

      if (!frame) {
        return res.status(400).json({
          error: "That frame does not belong to this Figma project",
        });
      }

      let cachedProperties;

      if (isSaltmeadowFrame(frame.id)) {
        cachedProperties = saltmeadowFrame(frame);
      } else {
        const nodeResponse = await fetchFigmaNodes(
          project.file_key,
          [frame.id]
        );

        cachedProperties = normalizeFetchedNode(nodeResponse, frame.id);
      }

      if (!cachedProperties) {
        return res.status(502).json({
          error: "Figma did not return the selected frame",
        });
      }

      const { data, error } = await supabase
        .from("figma_projects")
        .update({
          selected_frame_id: frame.id,
          selected_frame_name: frame.name,
          cached_properties: cachedProperties,
          last_fetched_at: new Date().toISOString(),
        })
        .eq("id", project.id)
        .eq("user_id", req.user.id)
        .select()
        .single();

      if (error) {
        return res.status(500).json({
          error: error.message,
        });
      }

      res.json(data);
    } catch (error) {
      return sendFigmaError(res, error);
    }
  }
);

// Deselect the frame: the user clicked "Selected" again.
app.delete(
  "/figma-projects/:id/frame",
  requireUser,
  async (req, res) => {
    try {
      const project = await getUserProject(req.params.id, req.user.id);

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const { data, error } = await supabase
        .from("figma_projects")
        .update({
          selected_frame_id: null,
          selected_frame_name: null,
          cached_properties: {},
        })
        .eq("id", project.id)
        .eq("user_id", req.user.id)
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

app.post(
  "/figma-projects/:id/refresh",
  requireUser,
  async (req, res) => {
    try {
      const project = await getUserProject(
        req.params.id,
        req.user.id
      );

      if (!project) {
        return res.status(404).json({
          error: "Project not found",
        });
      }

      let figmaFile;
      let frames;

      try {
        figmaFile = await fetchFigmaFileSummary(project.file_key);
        frames = extractFrames(figmaFile);
      } catch (figmaError) {
        if (figmaError.code !== "FIGMA_API_ERROR" || !isSaltmeadowFile({ fileName: project.file_name })) throw figmaError;
        figmaFile = saltmeadowFile({ fileName: project.file_name });
        frames = figmaFile.frames;
      }

      const selectedFrame = project.selected_frame_id
        ? frames.find(
            (frame) => frame.id === project.selected_frame_id
          ) || null
        : null;

      let cachedProperties = {};

      if (selectedFrame && isSaltmeadowFrame(selectedFrame.id)) {
        cachedProperties = saltmeadowFrame(selectedFrame);
      } else if (selectedFrame) {
        const nodeResponse = await fetchFigmaNodes(
          project.file_key,
          [selectedFrame.id]
        );

        cachedProperties =
          normalizeFetchedNode(
            nodeResponse,
            selectedFrame.id
          ) || {};
      }

      const { data, error } = await supabase
        .from("figma_projects")
        .update({
          file_name: figmaFile.name || project.file_name,
          selected_frame_id: selectedFrame?.id || null,
          selected_frame_name: selectedFrame?.name || null,
          figma_version: figmaFile.version || null,
          frames,
          cached_properties: cachedProperties,
          last_modified_at: figmaFile.lastModified || null,
          last_fetched_at: new Date().toISOString(),
        })
        .eq("id", project.id)
        .eq("user_id", req.user.id)
        .select()
        .single();

      if (error) {
        return res.status(500).json({
          error: error.message,
        });
      }

      res.json(data);
    } catch (error) {
      return sendFigmaError(res, error);
    }
  }
);

app.post("/compare/element", requireUser, async (req, res) => {
  const validationError = validateCompareBody(req.body);

  if (validationError) {
    return res.status(400).json({
      error: validationError,
    });
  }

  const {
    project_id,
    element,
    figma_node_id = null,
  } = req.body;

  try {
    const project = await getUserProject(
      project_id,
      req.user.id
    );

    if (!project) {
      return res.status(404).json({
        error: "Project not found",
      });
    }

    if (!project.selected_frame_id) {
      return res.status(400).json({
        error: "Select a Figma frame before comparing an element",
      });
    }

    if (isSaltmeadowFrame(project.selected_frame_id)) {
      return res.status(400).json({
        error: "Figma is rate-limiting this file, so only the built-in Saltmeadow fixes are available. Inspect the Saltmeadow site to see them.",
      });
    }

    let cachedProperties =
      project.cached_properties || {};

    let nodes = Array.isArray(cachedProperties.nodes)
      ? cachedProperties.nodes
      : [];

    if (nodes.length === 0) {
      const nodeResponse = await fetchFigmaNodes(
        project.file_key,
        [project.selected_frame_id]
      );

      cachedProperties =
        normalizeFetchedNode(
          nodeResponse,
          project.selected_frame_id
        ) || {};

      nodes = Array.isArray(cachedProperties.nodes)
        ? cachedProperties.nodes
        : [];

      if (nodes.length === 0) {
        return res.status(502).json({
          error: "The selected Figma frame has no nodes",
        });
      }

      const { error: cacheError } = await supabase
        .from("figma_projects")
        .update({
          cached_properties: cachedProperties,
          last_fetched_at: new Date().toISOString(),
        })
        .eq("id", project.id)
        .eq("user_id", req.user.id);

      if (cacheError) {
        return res.status(500).json({
          error: cacheError.message,
        });
      }
    }

    const result = compareElement({
      element,
      nodes,
      figmaNodeId: figma_node_id,
    });
    const accessibility =
      scoreAccessibility(element);

    const accessibilityIssues =
      getAccessibilityIssues(accessibility);

    // A value the GitHub step can't safely write (e.g. an odd font name) must not
    // throw away a comparison that otherwise worked, so those fixes are just left out.
    let commitFixes = [];

    if (element.selector) {
      try {
        commitFixes = commitFixesFromCss(
          element.selector,
          result.css_fixes
        );
      } catch {
        commitFixes = [];
      }
    }

    const ai = await explainResults(result, {
      accessibility_score: accessibility.total,
      accessibility_categories: accessibility.parts,
      accessibility_issues: accessibilityIssues,
    });

    res.json({
      project: {
        id: project.id,
        file_key: project.file_key,
        file_name: project.file_name,
        frame_id: project.selected_frame_id,
        frame_name: project.selected_frame_name,
      },
      element: {
        selector: element.selector || null,
        tag: element.tag || null,
        text: element.text || null,
      },
      ...result,
      accessibility_score: accessibility.total,
      accessibility_categories: accessibility.parts,
      accessibility_issues: accessibilityIssues,
      commit_fixes: commitFixes,
      ...ai,
    });
  } catch (error) {
    if (
      error.code === "FIGMA_API_ERROR" ||
      error.code === "FIGMA_NOT_CONFIGURED"
    ) {
      return sendFigmaError(res, error);
    }

    return res.status(400).json({
      error: error.message || "Comparison failed",
    });
  }
});

app.delete("/figma-projects/:id", requireUser, async (req, res) => {
  const { data, error } = await supabase
    .from("figma_projects")
    .delete()
    .eq("id", req.params.id)
    .eq("user_id", req.user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return res.status(500).json({
      error: error.message,
    });
  }

  if (!data) {
    return res.status(404).json({
      error: "Project not found",
    });
  }

  res.status(204).end();
});

app.post("/api/contrast", (req, res) => {
  try {
    const { foreground, background } = req.body || {};
    res.json(contrast(foreground, background));
  } catch (error) {
    res.status(400).json({
      error: error.message,
    });
  }
});

app.use("/api/github", requireUser, githubRoutes);

app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
  });
});

app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return res.status(400).json({
      error: "Invalid JSON body",
    });
  }

  console.error(error);

  return res.status(500).json({
    error: "Unexpected server error",
  });
});

app.listen(port, () => {
  console.log(`Parity backend running on port ${port}`);
});