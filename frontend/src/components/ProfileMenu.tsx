import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import ThemeSwitch from "./ThemeSwitch";
import type { Theme } from "../global";

interface Props {
  initials: string;
  name: string;
  theme: Theme;
  onTheme: (t: Theme) => void;
  onSettings: () => void;
  onSignOut: () => void;
}

const svg = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

const RefreshIcon = (
  <svg {...svg}>
    <path d="M20 12a8 8 0 1 1-2.34-5.66" />
    <path d="M20 4v5h-5" />
  </svg>
);
const GearIcon = (
  <svg {...svg}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);
const SignOutIcon = (
  <svg {...svg}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5M21 12H9" />
  </svg>
);

function Item({ icon, onClick, children }: { icon: ReactNode; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left text-sm font-semibold text-[var(--ink)] hover:bg-[var(--card-soft)]"
    >
      <span className="flex h-5 w-5 items-center justify-center">{icon}</span>
      {children}
    </button>
  );
}

/** Avatar button that opens a dropdown: theme switch, Settings, Sign out. */
export default function ProfileMenu({ initials, name, theme, onTheme, onSettings, onSignOut }: Props) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  // close on outside click or Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-gradient-to-br from-[#7A52E8] to-[#4B2BB0] text-xs font-bold text-white ring-2 ring-[var(--card)]"
      >
        {initials || "?"}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-2 w-60 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-2 shadow-[0_12px_32px_rgba(40,20,110,.22)]"
        >
          {name && <p className="px-2 pb-1 pt-1 text-sm font-semibold text-[var(--muted)]">{name}</p>}
          <Item icon={RefreshIcon} onClick={pick(() => window.location.reload())}>
            Refresh page
          </Item>
          <ThemeSwitch theme={theme} onChange={onTheme} className="justify-between px-2 py-2" />
          <Item icon={GearIcon} onClick={pick(onSettings)}>
            Settings
          </Item>
          <div className="my-1 border-t border-[var(--line)]" />
          <Item icon={SignOutIcon} onClick={pick(onSignOut)}>
            Sign out
          </Item>
        </div>
      )}
    </div>
  );
}