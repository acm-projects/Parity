import { useState } from "react";
import PillButton from "../components/PillButton";
import ConfirmCommit from "../components/ConfirmCommit";
import ScoreBreakdown, { type CardData } from "../components/ScoreBreakdown";
import type { ElementSnapshot } from "../lib/inspect";
import { scoreAccessibility, scoreDesign, type PartResult, type ScoreResult } from "../lib/score";
import { specFor } from "../lib/spec";

const card = "rounded-2xl bg-[var(--card)] p-4 shadow-[0_6px_18px_rgba(91,51,200,.10)]";

const luma = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
};

const toCard = (title: string, r: ScoreResult, good: string): CardData => ({
  title,
  slices: r.slices,
  total: r.total,
  totalLabel: good,
  remainderLabel: "To go",
});

// 0 = needs a fix, 1 = passes, 2 = does not apply
const rank = (p: PartResult) => (p.fraction === null ? 2 : p.fraction >= 1 ? 1 : 0);

/** One side of the Preview: a color swatch for every #hex in the text, then the text. */
function Tile({ label, text, site }: { label: string; text: string; site?: boolean }) {
  const hexes = text.match(/#[0-9a-fA-F]{6}/g) ?? [];
  return (
    <div
      className="force-light min-w-0 flex-1 rounded-xl px-3 py-2"
      style={{ background: site ? "#FFF8EE" : "#F6F3FF" }}
    >
      <div className="text-[11px] font-bold tracking-wide" style={{ color: site ? "#8A5200" : "#5A32C6" }}>
        {label}
      </div>
      <div className="mt-1 flex items-center gap-1.5">
        {hexes.map((h, i) => (
          <i
            key={i}
            className="h-3.5 w-3.5 flex-none rounded border border-black/10"
            style={{ background: h }}
          />
        ))}
        <span className="min-w-0 break-words text-[11px] font-semibold text-[var(--ink2)]">{text || "—"}</span>
      </div>
    </div>
  );
}

/** Same look as "Changes to Prioritize": icon tile, title, one-line subtitle, Preview + Commit. */
function Findings({ parts, goalLabel }: { parts: PartResult[]; goalLabel: string }) {
  const [open, setOpen] = useState<string | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());

  // TODO(real data): Commit should apply the change (write to code, open a PR) and persist.
  const toggleDone = (id: string) =>
    setDone((s) => {
      const n = new Set(s);
      if (!n.delete(id)) n.add(id);
      return n;
    });

  const rows = [...parts].filter((p) => rank(p) < 2).sort((a, b) => rank(a) - rank(b));
  const skipped = parts.filter((p) => rank(p) === 2).map((p) => p.name);
  const failing = rows.filter((p) => rank(p) === 0).length;

  return (
    <section className={card}>
      <h3 className="mb-2 text-sm font-semibold text-[var(--ink)]">
        {failing > 0 ? "Changes to Prioritize" : "All checks"}
      </h3>
      <ul className="scroll max-h-60 overflow-y-auto pr-2">
        {rows.map((p) => {
          const fix = rank(p) === 0;
          const ink = luma(p.color) > 0.6 ? "#3A1F78" : "#fff";
          const isOpen = open === p.id;
          const isDone = done.has(p.id);
          return (
            <li key={p.id} className="border-t border-[var(--line)] first:border-t-0">
              <div className="flex items-center gap-2.5 py-1.5">
                <span
                  className="flex h-6 w-6 flex-none items-center justify-center rounded-md"
                  style={{ background: p.color }}
                >
                  <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
                    <path d="M12 1 Q14 10 23 12 Q14 14 12 23 Q10 14 1 12 Q10 10 12 1Z" fill={ink} />
                  </svg>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-[var(--ink)]">{p.name}</p>
                  <p className="truncate text-[10px] text-[var(--muted)]" title={fix ? p.fix || p.note : p.note}>
                    {fix ? p.fix || p.note : p.note}
                  </p>
                </div>
                <PillButton
                  variant={isOpen ? "ghostOn" : "ghost"}
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : p.id)}
                >
                  Preview
                </PillButton>
                {fix ? (
                  <ConfirmCommit
                    done={isDone}
                    doneLabel="Committed ✓"
                    onConfirm={() => toggleDone(p.id)}
                    onUndo={() => toggleDone(p.id)}
                    className="sm:min-w-[84px]"
                  />
                ) : (
                  <span className="rounded-full bg-[var(--badge-bg)] px-2.5 py-0.5 text-center text-xs font-semibold text-[var(--badge-text)] sm:min-w-[84px]">
                    Passing ✓
                  </span>
                )}
              </div>
              {isOpen && (
                <div className="flex gap-2 pb-2">
                  <Tile label={goalLabel} text={p.goal} />
                  <Tile label="YOUR SITE" text={p.site} site />
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {skipped.length > 0 && (
        <p className="mt-2 border-t border-[var(--line)] pt-2 text-[10px] text-[var(--muted)]">
          Not applicable to this element: {skipped.join(", ")}.
        </p>
      )}
    </section>
  );
}

interface Props {
  el: ElementSnapshot;
  tab: "design" | "accessibility";
  onBack: () => void;
}

export default function ElementScore({ el, tab, onBack }: Props) {
  const isDesign = tab === "design";
  const result = isDesign ? scoreDesign(el, specFor(el)) : scoreAccessibility(el);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="flex-none cursor-pointer text-[11px] font-semibold text-[var(--p1)]"
        >
          &#8249; Back
        </button>
        <span
          className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-[var(--card)] px-3 py-1 text-[11px] font-semibold text-[var(--ink2)]"
          title={el.text ? `${el.selector} — ${el.text}` : el.selector}
        >
          <code className="flex-none rounded bg-[var(--card-tint)] px-1 text-[10px] text-[var(--p1)]">&lt;{el.tag}&gt;</code>
          <span className="truncate">{el.selector}</span>
          {el.text && <span className="truncate font-normal text-[var(--muted)]">“{el.text}”</span>}
        </span>
      </div>

      <ScoreBreakdown
        card={toCard(
          isDesign ? "Design Similarity Score" : "Accessibility Score",
          result,
          isDesign ? "Similar" : "Accessible"
        )}
      />

      {!isDesign && result.checked === 0 && (
        <p className="px-1 text-[11px] text-[var(--muted)]">
          Nothing here to check except the page language, since this element has no text, image or control of its own.
          Select a button, link, image or heading to see more.
        </p>
      )}

      <Findings parts={result.parts} goalLabel={isDesign ? "FIGMA" : "GOAL"} />
    </div>
  );
}