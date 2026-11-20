import type { Frame } from "../lib/api";

interface Props {
  frames: Frame[];
  selectedId: string | null;
  busy: boolean;
  onPick: (id: string) => void;
}

// A file's top level can hold loose text or shapes too. Only these are screens or components worth comparing.
const SCREENS = new Set(["FRAME", "COMPONENT", "COMPONENT_SET", "SECTION"]);

/** The screens of a Figma file, grouped by page. Tap one to compare against it, tap it again to deselect. */
export default function FramePicker({ frames, selectedId, busy, onPick }: Props) {
  const usable = frames.filter((f) => SCREENS.has(f.type));
  const list = usable.length ? usable : frames;

  const pages: { name: string; frames: Frame[] }[] = [];
  for (const f of list) {
    const page = pages.find((p) => p.name === f.page_name);
    if (page) page.frames.push(f);
    else pages.push({ name: f.page_name, frames: [f] });
  }

  if (list.length === 0) {
    return <p className="mt-2 text-xs text-[var(--muted)]">This file has no frames to compare yet.</p>;
  }

  return (
    <div className="scroll mt-2 max-h-48 overflow-y-auto pr-2">
      {pages.map((page) => (
        <div key={page.name} className="mb-1.5">
          <p className="py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">{page.name}</p>
          <ul>
            {page.frames.map((f) => {
              const on = f.id === selectedId;
              return (
                <li key={f.id} className="border-t border-[var(--line)] first:border-t-0">
                  <button
                    type="button"
                    disabled={busy}
                    aria-pressed={on}
                    title={on ? "Click to deselect" : "Compare against this frame"}
                    onClick={() => onPick(f.id)}
                    className="group flex w-full cursor-pointer items-center justify-between gap-2 py-1.5 text-left disabled:cursor-wait disabled:opacity-60"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold text-[var(--ink)]">{f.name}</span>
                      {f.width && f.height && (
                        <span className="block text-[10px] text-[var(--muted)]">
                          {Math.round(f.width)} × {Math.round(f.height)}
                        </span>
                      )}
                    </span>
                    <span
                      className={`flex-none rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        on
                          ? "bg-[var(--badge-bg)] text-[var(--badge-text)]"
                          : "border-[1.5px] border-[var(--p1)] text-[var(--p1)]"
                      }`}
                    >
                      {on ? (
                        <>
                          <span className="group-hover:hidden">Selected ✓</span>
                          <span className="hidden group-hover:inline">Deselect</span>
                        </>
                      ) : (
                        "Use"
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
