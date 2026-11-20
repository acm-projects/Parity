import type { Theme } from "../global";

interface Props {
  theme: Theme;
  onChange: (t: Theme) => void;
  className?: string;
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

/** sun · switch · moon. Used in the profile menu and on the Settings page. */
export default function ThemeSwitch({ theme, onChange, className = "" }: Props) {
  const dark = theme === "dark";
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <button
        type="button"
        aria-label="Light mode"
        onClick={() => onChange("light")}
        className="flex h-6 w-6 items-center justify-center"
        style={{ color: dark ? "var(--muted)" : "var(--p1)" }}
      >
        <svg {...svg}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      </button>

      <button
        type="button"
        role="switch"
        aria-checked={dark}
        aria-label="Dark mode"
        onClick={() => onChange(dark ? "light" : "dark")}
        className={`relative h-6 w-11 flex-none rounded-full transition-colors ${
          dark ? "bg-[var(--fill)]" : "bg-[var(--switch-off)]"
        }`}
      >
        <i
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
            dark ? "left-[22px]" : "left-0.5"
          }`}
        />
      </button>

      <button
        type="button"
        aria-label="Dark mode"
        onClick={() => onChange("dark")}
        className="flex h-6 w-6 items-center justify-center"
        style={{ color: dark ? "var(--p1)" : "var(--muted)" }}
      >
        <svg {...svg}>
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      </button>
    </div>
  );
}