import { API_URL } from "./config";
import { getAuth, refreshAuth, type Auth } from "./auth";
import type { ElementSnapshot } from "./inspect";

// ---------- shapes the backend sends back ----------

export interface Me {
  id: string;
  email: string | null;
  username: string | null;
  avatar_url: string | null;
}

export interface Frame {
  id: string;
  name: string;
  type: string;
  page_id: string;
  page_name: string;
  width: number | null;
  height: number | null;
}

export interface Project {
  id: number;
  file_key: string;
  file_url: string;
  file_name: string | null;
  selected_frame_id: string | null;
  selected_frame_name: string | null;
  frames: Frame[];
}

/** One scored category as the backend reports it (null = does not apply). */
export interface BackendCategory {
  id: string;
  name: string;
  weight: number;
  fraction: number | null;
  current: string | null;
  expected: string | null;
  fix: string;
}

export interface CommitFix {
  id: string;
  selector: string;
  property: string;
  value: string;
}

export interface Comparison {
  matched_node: { id: string; name: string; type: string; text: string | null; match_score: number | null };
  design_score: number;
  categories: BackendCategory[];
  css_fixes: Record<string, string>;
  commit_fixes: CommitFix[];
  tailwind_classes: string[];
  aiStatus?: "completed" | "unavailable";
  aiSummary?: string | null;
  recommendations?: string[];
}

export interface Repo {
  owner: string;
  name: string;
  defaultBranch: string;
  canPush: boolean;
}

export interface Plan {
  id: string;
  files: { path: string; before: string | null; after: string; note?: string }[];
  css: string;
  warning: string;
}

export interface Committed {
  branch: string;
  commitSha: string;
  url: string;
}

// ---------- the client ----------

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

interface Options {
  method?: string;
  body?: unknown;
  github?: boolean; // also send the GitHub token
}

async function send(path: string, o: Options, auth: Auth): Promise<Response> {
  const headers: Record<string, string> = { Authorization: `Bearer ${auth.access}` };
  if (o.body !== undefined) headers["Content-Type"] = "application/json";
  if (o.github) headers["X-GitHub-Token"] = auth.github;
  try {
    return await fetch(API_URL + path, {
      method: o.method ?? (o.body === undefined ? "GET" : "POST"),
      headers,
      body: o.body === undefined ? undefined : JSON.stringify(o.body),
    });
  } catch {
    throw new ApiError(`Can’t reach the Parity server at ${API_URL}. Is the backend running?`, 0);
  }
}

async function call<T>(path: string, o: Options = {}): Promise<T> {
  let auth = getAuth();
  if (!auth) throw new ApiError("You are signed out. Please sign in again.", 401);
  if (auth.expiresAt - Date.now() < 60_000) auth = await refreshAuth();

  let res = await send(path, o, auth);
  if (res.status === 401) res = await send(path, o, await refreshAuth());

  if (!res.ok) {
    let message = `The server answered ${res.status}.`;
    try {
      const body = await res.json();
      if (body?.error) message = String(body.error);
    } catch {
      /* not JSON: keep the generic message */
    }
    throw new ApiError(message, res.status);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

/** The backend also returns every cached Figma node. We only need the summary. */
const slim = (p: Project & { cached_properties?: unknown }): Project => ({
  id: p.id,
  file_key: p.file_key,
  file_url: p.file_url,
  file_name: p.file_name,
  selected_frame_id: p.selected_frame_id,
  selected_frame_name: p.selected_frame_name,
  frames: p.frames ?? [],
});

export const me = () => call<Me>("/me");

/** Connect (or reconnect) a Figma file. The backend remembers which frame was picked last time. */
export const connectProject = async (fileUrl: string) =>
  slim(await call<Project>("/figma-projects", { body: { file_url: fileUrl } }));

export const getProject = async (id: number) => slim(await call<Project>(`/figma-projects/${id}`));

export const selectFrame = async (id: number, frameId: string) =>
  slim(await call<Project>(`/figma-projects/${id}/frame`, { method: "PATCH", body: { frame_id: frameId } }));

/** Clears the chosen frame (the user clicked "Selected" again). */
export const deselectFrame = async (id: number) =>
  slim(await call<Project>(`/figma-projects/${id}/frame`, { method: "DELETE" }));

export const refreshProject = async (id: number) =>
  slim(await call<Project>(`/figma-projects/${id}/refresh`, { method: "POST", body: {} }));

export const compareElement = (projectId: number, element: ElementSnapshot) =>
  call<Comparison>("/compare/element", { body: { project_id: projectId, element } });

export async function listRepos(): Promise<Repo[]> {
  const all: Repo[] = [];
  for (let page = 1; page <= 5; page++) {
    const got = await call<Repo[]>(`/api/github/repositories?page=${page}`, { github: true });
    all.push(...got);
    if (got.length < 100) break;
  }
  return all;
}

export const listFiles = (owner: string, repo: string, branch: string) =>
  call<{ truncated: boolean; files: string[] }>("/api/github/files", { github: true, body: { owner, repo, branch } });

export const planCommit = (b: {
  owner: string;
  repo: string;
  branch: string;
  entryFile: string;
  websiteUrl: string;
  fixes: CommitFix[];
}) => call<Plan>("/api/github/plan", { github: true, body: b });

export const commitPlan = (planId: string) =>
  call<Committed>("/api/github/commit", { github: true, body: { planId, confirm: true } });
