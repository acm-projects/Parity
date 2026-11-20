require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");

const BASE_URL = "http://localhost:3000";

const FIGMA_URL =
  "https://www.figma.com/design/9dtimSnkgQchUmo2FWyMZC/Parity?node-id=99-9";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  }
);

async function api(path, token, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  const text = await response.text();

  let body = null;

  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!response.ok) {
    throw new Error(
      `${options.method || "GET"} ${path} failed (${response.status}): ${
        typeof body === "string"
          ? body
          : JSON.stringify(body)
      }`
    );
  }

  return body;
}

async function run() {
  const timestamp = Date.now();

  const email =
    `parity-e2e-${timestamp}@example.com`;

  const password =
    `Parity-${timestamp}-Test!`;

  let userId = null;
  let projectId = null;

  try {
    const { data: created, error: createError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (createError) {
      throw createError;
    }

    userId = created.user.id;

    console.log("Temporary user: OK");

    const { data: login, error: loginError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (loginError) {
      throw loginError;
    }

    const token = login.session?.access_token;

    if (!token) {
      throw new Error(
        "Supabase did not return an access token"
      );
    }

    console.log("Authentication: OK");

    const me = await api("/me", token);

    if (me.id !== userId) {
      throw new Error(
        "Authenticated user does not match temporary user"
      );
    }

    console.log("/me: OK");

    const project = await api(
      "/figma-projects",
      token,
      {
        method: "POST",
        body: JSON.stringify({
          file_url: FIGMA_URL,
        }),
      }
    );

    projectId = project.id;

    console.log("Figma project storage: OK");

    const frames = await api(
      `/figma-projects/${projectId}/frames`,
      token
    );

    if (!Array.isArray(frames) || frames.length === 0) {
      throw new Error(
        "No Figma frames were returned"
      );
    }

    const frame =
      frames.find((item) => item.type === "FRAME") ||
      frames[0];

    await api(
      `/figma-projects/${projectId}/frame`,
      token,
      {
        method: "PATCH",
        body: JSON.stringify({
          frame_id: frame.id,
        }),
      }
    );

    console.log("Frame selection: OK");

    const comparison = await api(
      "/compare/element",
      token,
      {
        method: "POST",
        body: JSON.stringify({
          project_id: projectId,
          element: {
            tag: "div",
            selector: ".parity-e2e-element",
            text: "",
            role: "",
            name: "",
            interactive: false,
            native: false,
            explicitRole: "",
            hasOwnText: false,
            isImage: false,
            hasAlt: false,
            tabindex: null,
            ariaHidden: false,
            langSet: true,
            fontFamily: "Inter",
            fontSize: 16,
            fontWeight: 400,
            color: "#000000",
            background: "#FFFFFF",
            width: 100,
            height: 40,
            padding: 0,
            gap: 0,
            borderRadius: 0,
          },
        }),
      }
    );

    if (
      typeof comparison.design_score !== "number" ||
      typeof comparison.accessibility_score !==
        "number" ||
      !Array.isArray(comparison.suggested_fixes) ||
      !Array.isArray(comparison.commit_fixes)
    ) {
      throw new Error(
        "Comparison response is missing expected fields"
      );
    }

    console.log("Element comparison: OK");
    console.log(
      `Design score: ${comparison.design_score}`
    );
    console.log(
      `Accessibility score: ${comparison.accessibility_score}`
    );
    console.log(
      `Suggested fixes: ${comparison.suggested_fixes.length}`
    );
    console.log(
      `GitHub-ready fixes: ${comparison.commit_fixes.length}`
    );

    console.log("E2E TEST: PASSED");
  } finally {
    if (projectId && userId) {
      await supabase
        .from("figma_projects")
        .delete()
        .eq("id", projectId)
        .eq("user_id", userId);
    }

    if (userId) {
      await supabase.auth.admin.deleteUser(userId);
    }
  }
}

run().catch((error) => {
  console.error("E2E TEST: FAILED");
  console.error(error.message);
  process.exitCode = 1;
});