import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

/** What we keep after signing in with GitHub through Supabase. */
export interface Auth {
  access: string; // Supabase JWT, sent to our backend as a Bearer token
  refresh: string;
  expiresAt: number; // ms since epoch
  github: string; // GitHub token (for committing fixes). Empty if GitHub did not give us one.
}

let current: Auth | null = null;
let listener: ((a: Auth | null) => void) | null = null;
let inflight: Promise<Auth> | null = null;

export const getAuth = () => current;

/** Tell this module who is signed in (e.g. after loading the saved session). Does not notify. */
export const syncAuth = (a: Auth | null) => {
  current = a;
};

/** App registers here so refreshed tokens get saved. */
export const onAuthChange = (fn: (a: Auth | null) => void) => {
  listener = fn;
  return () => {
    if (listener === fn) listener = null;
  };
};

function fromParams(p: URLSearchParams, previous?: Auth): Auth {
  const access = p.get("access_token");
  if (!access) throw new Error("GitHub sign-in did not return a session.");
  const exp = Number(p.get("expires_at"));
  const inSec = Number(p.get("expires_in"));
  return {
    access,
    refresh: p.get("refresh_token") || previous?.refresh || "",
    expiresAt: exp ? exp * 1000 : Date.now() + (inSec || 3600) * 1000,
    github: p.get("provider_token") || previous?.github || "",
  };
}

/**
 * Opens GitHub's sign-in window (through Supabase) and returns the session.
 * Needs the extension: chrome.identity does not exist on a normal web page.
 * Supabase must list chrome.identity.getRedirectURL() under Auth > URL Configuration > Redirect URLs.
 */
export async function signInWithGitHub(): Promise<Auth> {
  const identity = typeof chrome === "undefined" ? undefined : chrome?.identity;
  if (!identity) {
    throw new Error("GitHub sign-in only works inside the Parity extension. Load it in Chrome, or leave the Supabase variables empty for demo mode.");
  }
  const url =
    `${SUPABASE_URL}/auth/v1/authorize?` +
    new URLSearchParams({
      provider: "github",
      redirect_to: identity.getRedirectURL(),
      scopes: "repo",
      prompt: "select_account",
    });

  const back = await new Promise<string>((resolve, reject) => {
    identity.launchWebAuthFlow({ url, interactive: true }, (redirect) => {
      const err = chrome?.runtime?.lastError;
      if (err || !redirect) reject(new Error(err?.message || "Sign-in was cancelled."));
      else resolve(redirect);
    });
  });

  const u = new URL(back);
  const params = new URLSearchParams(u.hash.replace(/^#/, ""));
  const problem = params.get("error_description") || u.searchParams.get("error_description") || params.get("error");
  if (problem) throw new Error(problem.replace(/\+/g, " "));
  return fromParams(params);
}

/** Trades the refresh token for a new session. Calls made at the same time share one request. */
export function refreshAuth(): Promise<Auth> {
  const old = current;
  if (!old?.refresh) return Promise.reject(new Error("Your session expired. Please sign in again."));
  inflight ??= (async () => {
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: "POST",
        headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: old.refresh }),
      });
      if (!res.ok) throw new Error("Your session expired. Please sign in again.");
      const d = await res.json();
      const next: Auth = {
        access: d.access_token,
        refresh: d.refresh_token || old.refresh,
        expiresAt: d.expires_at ? d.expires_at * 1000 : Date.now() + (d.expires_in || 3600) * 1000,
        github: old.github, // GitHub tokens are not part of a refresh
      };
      current = next;
      listener?.(next);
      return next;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** Signs out: ends the Supabase session on the server and forgets it here. */
export async function signOut(): Promise<void> {
  const old = current;
  current = null;
  inflight = null;
  listener?.(null); // lets App clear the saved session
  if (old?.access) {
    try {
      await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: "POST",
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${old.access}` },
      });
    } catch {
      // offline or already expired: still signed out locally
    }
  }
}
