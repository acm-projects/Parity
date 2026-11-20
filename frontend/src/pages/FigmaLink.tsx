import { useRef, useState } from "react";
import { parseFigma } from "../lib/figma";
import { usePersistentState } from "../hooks/usePersistentState";
import PillButton from "../components/PillButton";
import FramePicker from "../components/FramePicker";
import type { Project } from "../lib/api";

interface Recent {
  name: string;
  url: string;
}

interface Props {
  url: string; // last link used, to prefill the box
  error: boolean; // the last attempt did not work
  message?: string; // why, when the server told us. Empty = "not a Figma link".
  project?: Project | null; // the connected file (real backend only)
  busy?: boolean; // a frame is being selected or the file is syncing
  onConnect: (url: string) => void;
  onOpen: (url: string) => void;
  onPickFrame?: (id: string) => void;
  onSync?: () => void;
}

const EXAMPLE = "https://www.figma.com/design/Xk29aQ/Homepage-redesign?node-id=0-1";
const card = "rounded-2xl bg-[var(--card)] p-4 shadow-[0_6px_18px_rgba(91,51,200,.10)]";

export default function FigmaLink({ url, error, message, project, busy = false, onConnect, onOpen, onPickFrame, onSync }: Props) {
  const [value, setValue] = useState(url);
  const [dismissed, setDismissed] = useState(false);
  const [recents, setRecents] = usePersistentState<Recent[]>("parity-recents", []);
  const input = useRef<HTMLInputElement>(null);
  const showError = error && !dismissed;

  const submit = () => {
    setDismissed(false);
    const ref = parseFigma(value);
    if (ref) {
      const link = value.trim();
      setRecents((r) => [{ name: ref.name, url: link }, ...r.filter((x) => x.url !== link)].slice(0, 20));
    }
    onConnect(value);
  };
  const retry = () => {
    setDismissed(true);
    input.current?.focus();
  };

  return (
    <div className="space-y-3">
      <section className={card}>
        <h1 className="text-base font-semibold text-[var(--ink)]">Connect your Figma Design Here:</h1>
        <p className="mt-1 text-xs text-[var(--muted)]">Paste your Figma File URL</p>

        <input
          id="figurl"
          ref={input}
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setDismissed(true);
          }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="figma.com/file/..."
          aria-label="Figma file URL"
          aria-invalid={showError}
          className={`mt-2 w-full rounded-lg border-[1.5px] bg-[var(--field)] px-3 py-2 text-xs text-[var(--ink)] outline-none ${
            showError ? "border-[var(--err)]" : "border-[var(--field-border)] focus:border-[var(--p1)]"
          }`}
        />

        {showError ? (
          <p role="alert" className="mt-2 text-[11px] font-semibold text-[var(--err)]">
            {message || "That doesn’t look like a Figma file link"}
          </p>
        ) : (
          <div className="mt-2 flex justify-between text-[11px] text-[var(--muted)]">
            <span>Make sure the Figma URL is public</span>
            {import.meta.env.DEV && (
              <button
                type="button"
                className="cursor-pointer font-bold text-[var(--p1)]"
                onClick={() => {
                  setValue(EXAMPLE);
                  input.current?.focus();
                }}
              >
                Try an example
              </button>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={submit}
          className="mt-2 w-full cursor-pointer rounded-lg bg-[linear-gradient(180deg,#6F47DB,#5A32C6)] py-2 text-xs font-semibold text-white"
        >
          Connect Design
        </button>
      </section>

      {project && onPickFrame && (
        <section className={card}>
          <div className="flex items-center justify-between gap-2">
            <h2 className="min-w-0 truncate text-base font-semibold text-[var(--ink)]">
              {project.selected_frame_id ? "Frame to compare" : "Pick a frame to compare"}
            </h2>
            {onSync && (
              <PillButton variant="ghost" onClick={onSync} disabled={busy} className="flex-none">
                {busy ? "Working…" : "Sync from Figma"}
              </PillButton>
            )}
          </div>
          <p className="mt-0.5 truncate text-[11px] text-[var(--muted)]">{project.file_name}</p>
          <FramePicker frames={project.frames} selectedId={project.selected_frame_id} busy={busy} onPick={onPickFrame} />
        </section>
      )}

      {showError ? (
        <section className={card}>
          <h2 className="text-base font-semibold text-[var(--ink)]">Try this</h2>
          <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-xs">
            <li>Open the file in Figma and click Share.</li>
            <li>Set access to “Anyone with the link can view”.</li>
            <li>Copy the link and paste it above.</li>
          </ol>
          <div className="mt-3 flex gap-2">
            <PillButton onClick={retry} className="flex-1 text-xs">
              Try again
            </PillButton>
            <PillButton variant="ghost" onClick={retry} className="flex-1 text-xs">
              Back to Figma history
            </PillButton>
          </div>
        </section>
      ) : (
        <section className={card}>
          <h2 className="text-base font-semibold text-[var(--ink)]">Figma History</h2>
          {recents.length > 0 ? (
            <ul className="scroll mt-2 max-h-28 overflow-y-auto pr-2">
              {recents.map((r) => (
                <li
                  key={r.url}
                  className="flex items-center justify-between border-t border-[var(--line)] py-2 first:border-t-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-[var(--ink)]">{r.name}</p>
                    <p className="truncate text-[11px] text-[var(--muted)]">
                      {r.url.replace(/^https?:\/\/(www\.)?/, "")}
                    </p>
                  </div>
                  <PillButton
                    variant="ghost"
                    onClick={() => onOpen(r.url)}
                    className="ml-3 shrink-0 py-0.5 text-xs"
                  >
                    Open
                  </PillButton>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-2 pb-1 pt-3 text-center">
              <p className="text-sm font-semibold text-[var(--ink)]">No files yet</p>
              <p className="mt-0.5 text-xs text-[var(--muted)]">Paste a Figma link above to get started.</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}