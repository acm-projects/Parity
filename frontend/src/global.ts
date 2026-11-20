import type { Auth } from "./lib/auth";

export type TabId = "figma" | "design" | "accessibility";

export type Theme = "light" | "dark";

export interface TabItem {
  id: TabId;
  label: string;
}

export const TABS: TabItem[] = [
  { id: "figma", label: "Figma Link" },
  { id: "design", label: "Design" },
  { id: "accessibility", label: "Accessibility" },
];

/** Full-screen steps that come before / replace the tabbed app. */
export type Screen = "landing" | "githubLogin" | "githubAuth" | "connecting" | "app";

/** What is saved between sessions. user === "" means signed out. */
export interface Session {
  user: string;
  file: string;
  url: string;
  auth?: Auth | null; // GitHub sign-in (live mode only)
  projectId?: number | null; // the connected Figma file on the backend
}

export interface User {
  name: string;
}