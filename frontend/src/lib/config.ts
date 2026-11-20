/**
 * Where the backend lives and how to sign in. Set these in frontend/.env (see .env.example).
 * Leave the Supabase ones empty to run in demo mode: sample data, no sign-in, no backend needed.
 */
const env = import.meta.env;

export const API_URL: string = (env.VITE_API_URL || env.VITE_API_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
export const SUPABASE_URL: string = (env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
export const SUPABASE_ANON_KEY: string = env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

/** true = real sign-in and the real backend; false = demo mode. */
export const LIVE = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
