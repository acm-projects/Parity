import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { TabId, TabItem } from "../global";

interface Props {
  tabs: TabItem[];
  active: TabId | null; // null = nothing highlighted (Settings page)
  onChange: (t: TabId) => void;
}

type Pill = { x: number; w: number; visible: boolean };

export default function TabBar({ tabs, active, onChange }: Props) {
  const btns = useRef<Record<string, HTMLButtonElement | null>>({});
  const [pill, setPill] = useState<Pill | null>(null);
  // no slide on first paint, only when switching tabs
  const [ready, setReady] = useState(false);

  // measure the active tab so the pill can slide to it
  useLayoutEffect(() => {
    const measure = () => {
      const el = active ? btns.current[active] : null;
      setPill((prev) =>
        el
          ? { x: el.offsetLeft, w: el.offsetWidth, visible: true }
          : prev && { ...prev, visible: false } // Settings: fade out in place
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    Object.values(btns.current).forEach((b) => b && ro.observe(b));
    return () => ro.disconnect();
  }, [active, tabs]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <nav
      aria-label="Sections"
      className="relative flex gap-1 rounded-full bg-[var(--card)] p-1 shadow-[0_2px_8px_rgba(91,51,200,.08)]"
    >
      {/* sliding highlight */}
      {pill && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-1 left-0 top-1 rounded-full bg-[var(--fill)]"
          style={{
            width: pill.w,
            transform: `translateX(${pill.x}px)`,
            opacity: pill.visible ? 1 : 0,
            transition: ready
              ? "transform .35s cubic-bezier(.65,0,.35,1), width .35s cubic-bezier(.65,0,.35,1), opacity .2s ease"
              : "none",
          }}
        />
      )}

      {tabs.map((t) => {
        const on = t.id === active;
        return (
          <button
            key={t.id}
            ref={(el) => { btns.current[t.id] = el; }}
            type="button"
            aria-current={on ? "page" : undefined}
            onClick={() => onChange(t.id)}
            className={`relative z-10 flex-1 cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold transition-colors duration-300 ${
              on ? "text-white" : "text-[var(--ink2)]"
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </nav>
  );
}