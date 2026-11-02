import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import PillButton from "./PillButton";

interface Props {
  done: boolean; // already committed / queued
  doneLabel: string; // what the button says once it is done, e.g. "Committed ✓"
  onConfirm: () => void; // they said Yes
  onUndo: () => void; // they clicked the finished button to take it back
  note?: string; // optional small line under the question
  className?: string;
}

const WIDTH = 232;
const GAP = 8; // space between the button and the popup

type Pos = { left: number; top: number; caret: number; above: boolean };

/**
 * The Commit button. Clicking it opens a small "Are you sure?" popup next to the button
 * with Yes / No. The popup is drawn on <body> so a scrolling list can never clip it.
 */
export default function ConfirmCommit({ done, doneLabel, onConfirm, onUndo, note, className }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);
  const anchor = useRef<HTMLSpanElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const viaKey = useRef(false); // opened with Enter/Space rather than a mouse click

  // refocus = give the Commit button focus back (only worth it for keyboard users, otherwise a focus ring lingers)
  const close = (refocus = false) => {
    setOpen(false);
    setPos(null);
    if (refocus) anchor.current?.querySelector("button")?.focus({ preventScroll: true });
  };

  // Place the popup under the button (above it when there is no room), lined up with its right edge.
  useLayoutEffect(() => {
    if (!open || !anchor.current || !pop.current) return;
    const a = anchor.current.getBoundingClientRect();
    const h = pop.current.offsetHeight;
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    const left = Math.max(8, Math.min(a.right - WIDTH, vw - WIDTH - 8));
    const above = a.bottom + GAP + h > vh && a.top - GAP - h > 0;
    setPos({
      left,
      top: above ? a.top - GAP - h : a.bottom + GAP,
      caret: Math.max(16, Math.min(WIDTH - 16, a.left + a.width / 2 - left)),
      above,
    });
  }, [open]);

  // Escape, a click outside, scrolling or resizing all close it without committing.
  useEffect(() => {
    if (!open) return;
    if (viaKey.current) pop.current?.querySelectorAll("button")[1]?.focus({ preventScroll: true }); // "No" is the safe default
    const shut = () => {
      setOpen(false);
      setPos(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(viaKey.current);
    };
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!pop.current?.contains(t) && !anchor.current?.contains(t)) shut();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("resize", shut);
    // A scroll that is still settling from the click itself should not shut the popup the moment it opens.
    const listen = setTimeout(() => window.addEventListener("scroll", shut, true), 150);
    return () => {
      clearTimeout(listen);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("resize", shut);
      window.removeEventListener("scroll", shut, true);
    };
  }, [open]);

  return (
    <span ref={anchor} className="inline-flex">
      <PillButton
        variant={done ? "soft" : "primary"}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={(e) => {
          if (done) return onUndo();
          viaKey.current = e.detail === 0; // a keyboard "click" reports 0 clicks
          setOpen((o) => !o);
        }}
        // py-[3.5px]: matches the height of the outlined Preview button, whose border adds 3px
        className={`py-[3.5px] ${className ?? ""}`}
      >
        {done ? doneLabel : "Commit"}
      </PillButton>

      {open &&
        createPortal(
          <div
            ref={pop}
            role="dialog"
            aria-label="Confirm commit"
            style={{
              position: "fixed",
              left: pos?.left ?? 0,
              top: pos?.top ?? 0,
              width: WIDTH,
              visibility: pos ? "visible" : "hidden", // measured first, then shown in the right place
              zIndex: 50,
            }}
            className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-3 shadow-[0_16px_36px_rgba(90,50,198,.24),0_2px_6px_rgba(90,50,198,.10)]"
          >
            {/* little arrow pointing at the button */}
            <i
              aria-hidden="true"
              className="absolute h-2.5 w-2.5 rotate-45 bg-[var(--card)]"
              style={{
                left: (pos?.caret ?? 16) - 5,
                [pos?.above ? "bottom" : "top"]: -6,
                borderStyle: "solid",
                borderColor: "var(--card-border)",
                borderWidth: pos?.above ? "0 1px 1px 0" : "1px 0 0 1px",
              }}
            />
            <p className="text-xs font-semibold text-[var(--ink)]">Commit this change to GitHub?</p>
            {note && <p className="mt-0.5 text-[10px] text-[var(--muted)]">{note}</p>}
            <div className="mt-2.5 flex gap-2">
              <PillButton
                className="flex-1"
                onClick={() => {
                  close(viaKey.current);
                  onConfirm();
                }}
              >
                Yes
              </PillButton>
              <PillButton variant="ghost" className="flex-1" onClick={() => close(viaKey.current)}>
                No
              </PillButton>
            </div>
          </div>,
          document.body
        )}
    </span>
  );
}