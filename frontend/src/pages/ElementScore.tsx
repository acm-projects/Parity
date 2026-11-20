import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PillButton from "../components/PillButton";
import StageButton from "../components/StageButton";
import ScoreBreakdown, { type CardData } from "../components/ScoreBreakdown";
import CommitSheet from "./CommitSheet";
import { compareElement, type CommitFix, type Comparison } from "../lib/api";
import { designFromComparison, isWeakMatch } from "../lib/compare";
import type { ElementSnapshot } from "../lib/inspect";
import { applyCss, canTryOnPage, undoCss, undoCssOn } from "../lib/livefix";
import { fixRows, isSaltmeadow, saltmeadowFixes, saltmeadowPageScore, saltmeadowScore } from "../lib/saltmeadow";
import { scoreAccessibility, scoreDesign, type PartResult, type ScoreResult } from "../lib/score";
import { specFor } from "../lib/spec";

/** Where the design numbers come from. */
export type ScoreMode =
  | { kind: "sample" } // demo mode: placeholder Figma values
  | { kind: "needsFigma" } // signed in, but no Figma frame picked yet
  | { kind: "live"; projectId: number; frame: string }; // real Figma data from the backend

interface Props {
  el: ElementSnapshot;
  tab: "design" | "accessibility";
  mode: ScoreMode;
  onBack: () => void;
  onFigma: () => void; // go to the Figma Link tab
  wholePage?: boolean; // Design tab page view: every fix on the page, no selected element
}

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

const cssText = (css: Record<string, string>) =>
  Object.entries(css)
    .map(([k, v]) => `${k}: ${v}`)
    .join("; ");

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

interface FindingsProps {
  ns: string;
  title?: string;
  parts: PartResult[];
  goalLabel: string;
  live: boolean; // real backend: Stage queues a GitHub commit. Demo: it just toggles.
  queued: Set<string>;
  onQueue: (key: string) => void;
  onQueueAll: (keys: string[], on: boolean) => void;
  applied: Set<string>;
  onTry: (key: string, part: PartResult) => void;
  onTryAll: (rows: { key: string; part: PartResult }[], on: boolean) => void;
}

/** "Changes to Prioritize": icon tile, title, one-line subtitle, Preview + Stage. */
function Findings({ ns, title, parts, goalLabel, live, queued, onQueue, onQueueAll, applied, onTry, onTryAll }: FindingsProps) {
  const [open, setOpen] = useState<Set<string>>(new Set());

  const rows = [...parts].filter((p) => rank(p) < 2).sort((a, b) => rank(a) - rank(b));
  const skipped = parts.filter((p) => rank(p) === 2).map((p) => p.name);
  const failing = rows.filter((p) => rank(p) === 0);
  const tryable = canTryOnPage();

  // Rows that can be previewed on the page / staged for a commit.
  const previewable = failing.filter((p) => p.css && tryable).map((p) => ({ key: `${ns}:${p.id}`, part: p }));
  const stageable = failing.filter((p) => !live || p.css).map((p) => `${ns}:${p.id}`);
  const allPreviewed = previewable.length > 0 && previewable.every((r) => applied.has(r.key));
  const allStaged = stageable.length > 0 && stageable.every((k) => queued.has(k));

  const flip = (id: string) =>
    setOpen((s) => {
      const n = new Set(s);
      if (!n.delete(id)) n.add(id);
      return n;
    });

  return (
    <section className={card}>
      {/* Title on the left, Preview all / Stage all on the same line on the right (they drop below it when narrow). */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <h3 className="text-sm font-semibold text-[var(--ink)]">
          {title ?? (failing.length > 0 ? "Changes to Prioritize" : "All checks")}
        </h3>
        {failing.length > 0 && (
          <div className="flex flex-none gap-2">
            <PillButton
              variant={allPreviewed ? "ghostOn" : "ghost"}
              disabled={previewable.length === 0}
              title={tryable ? "Preview every change on the page" : "Previews run inside Chrome DevTools."}
              onClick={() => onTryAll(previewable, !allPreviewed)}
              className="disabled:cursor-not-allowed disabled:opacity-60"
            >
              {allPreviewed ? "Undo all" : "Preview all"}
            </PillButton>
            <PillButton
              variant={allStaged ? "soft" : "primary"}
              disabled={stageable.length === 0}
              title="Stage every change for the next commit"
              onClick={() => onQueueAll(stageable, !allStaged)}
              className="py-[3.5px] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {allStaged ? "Unstage all" : "Stage all"}
            </PillButton>
          </div>
        )}
      </div>
      <ul className="scroll max-h-72 overflow-y-auto pr-2">
        {rows.map((p) => {
          const fix = rank(p) === 0;
          const key = `${ns}:${p.id}`;
          const ink = luma(p.color) > 0.6 ? "#3A1F78" : "#fff";
          const isApplied = applied.has(key);
          const isOpen = open.has(p.id) || isApplied;
          const isQueued = queued.has(key);
          const canStage = !live || !!p.css;
          // Preview shows the details and, when it can, tries the fix on the page. Clicking again undoes it.
          const preview = () => {
            if (fix && p.css && tryable) {
              if (isApplied)
                setOpen((s) => {
                  const n = new Set(s);
                  n.delete(p.id);
                  return n;
                });
              onTry(key, p);
            } else flip(p.id);
          };
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
                <PillButton variant={isOpen ? "ghostOn" : "ghost"} aria-pressed={isOpen} onClick={preview}>
                  {isApplied ? "Previewing" : "Preview"}
                </PillButton>
                {!fix ? (
                  <span className="rounded-full bg-[var(--badge-bg)] px-2.5 py-0.5 text-center text-xs font-semibold text-[var(--badge-text)] sm:min-w-[84px]">
                    Passing ✓
                  </span>
                ) : canStage ? (
                  <StageButton staged={isQueued} onToggle={() => onQueue(key)} className="sm:min-w-[84px]" />
                ) : (
                  <PillButton
                    variant="soft"
                    disabled
                    title="Parity can’t write this one into your code yet. Follow the tip on the left."
                    className="cursor-not-allowed opacity-70 sm:min-w-[84px]"
                  >
                    Manual fix
                  </PillButton>
                )}
              </div>
              {isOpen && (
                <div className="pb-2">
                  <div className="flex gap-2">
                    <Tile label={goalLabel} text={p.goal} />
                    <Tile label="YOUR SITE" text={p.site} site />
                  </div>
                  {fix && p.css && (
                    <code className="mt-2 block break-words rounded-lg bg-[var(--card-tint)] px-2 py-1 text-[10px] text-[var(--ink2)]">
                      {p.selector ? `${p.selector} { ${cssText(p.css)} }` : cssText(p.css)}
                    </code>
                  )}
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

type Cmp =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; data: Comparison }
  | { status: "error"; message: string };

export default function ElementScore({ el, tab, mode, onBack, onFigma, wholePage = false }: Props) {
  const isDesign = tab === "design";
  const live = mode.kind === "live";
  // Saltmeadow demo site: Parity already knows its exact fixes, so it skips the Figma comparison.
  const sm = useMemo(
    () => (isSaltmeadow(el) && mode.kind !== "needsFigma" ? saltmeadowFixes(el, wholePage) : null),
    [el, mode.kind, wholePage]
  );
  const projectId = mode.kind === "live" && !sm ? mode.projectId : null;

  const [cmp, setCmp] = useState<Cmp>({ status: "idle" });
  const [queued, setQueued] = useState<Set<string>>(new Set());
  const [applied, setApplied] = useState<Set<string>>(new Set());
  const [sheet, setSheet] = useState(false);

  // Ask the backend once per selected element, the first time the Design tab is shown.
  const asked = useRef(false);
  const ask = useCallback(() => {
    if (projectId === null) return;
    setCmp({ status: "loading" });
    compareElement(projectId, el).then(
      (data) => setCmp({ status: "done", data }),
      (e: unknown) => setCmp({ status: "error", message: e instanceof Error ? e.message : "The comparison failed." })
    );
  }, [projectId, el]);
  useEffect(() => {
    if (isDesign && projectId !== null && !asked.current) {
      asked.current = true;
      ask();
    }
  }, [isDesign, projectId, ask]);

  // Anything previewed on the page is temporary: put it back when this element is left.
  useEffect(() => () => void undoCss(), []);

  const smRows = useMemo(() => (sm ? fixRows(sm.fixes) : []), [sm]);
  const smPreviewed = useMemo(
    () => new Set([...applied].filter((k) => k.startsWith("design:")).map((k) => k.slice("design:".length))),
    [applied]
  );

  const a11y = useMemo(() => scoreAccessibility(el), [el]);
  const design = useMemo<ScoreResult | null>(() => {
    if (sm && wholePage) return saltmeadowPageScore(sm.page, sm.fixes, smPreviewed) ?? saltmeadowScore(sm.fixes, smPreviewed);
    if (sm) return saltmeadowScore(sm.fixes, smPreviewed);
    if (mode.kind === "sample") return scoreDesign(el, specFor(el));
    if (mode.kind === "live" && cmp.status === "done") return designFromComparison(cmp.data);
    return null;
  }, [sm, wholePage, smPreviewed, mode.kind, cmp, el]);
  const result = isDesign ? design : a11y;
  // The rows under the score: one per fix on Saltmeadow, one per category everywhere else.
  const findingRows = isDesign && sm ? smRows : (result?.parts ?? []);

  const toggle = (set: Set<string>, key: string) => {
    const next = new Set(set);
    if (!next.delete(key)) next.add(key);
    return next;
  };

  const unapply = (part: PartResult) =>
    part.selector ? undoCssOn(part.selector, Object.keys(part.css ?? {})) : undoCss(Object.keys(part.css ?? {}));

  const tryOnPage = async (key: string, part: PartResult) => {
    if (!part.css) return;
    if (applied.has(key)) await unapply(part);
    else if (!(await applyCss(part.css, part.selector))) return;
    setApplied((s) => toggle(s, key));
  };

  const tryAll = async (rows: { key: string; part: PartResult }[], on: boolean) => {
    const done = new Set(applied);
    for (const { key, part } of rows) {
      if (!part.css) continue;
      if (on && !done.has(key)) {
        if (await applyCss(part.css, part.selector)) done.add(key);
      } else if (!on && done.has(key)) {
        await unapply(part);
        done.delete(key);
      }
    }
    setApplied(done);
  };

  const queueAll = (keys: string[], on: boolean) =>
    setQueued((s) => {
      const next = new Set(s);
      for (const k of keys) {
        if (on) next.add(k);
        else next.delete(k);
      }
      return next;
    });

  // Every staged row, so the count matches what was staged (one row can carry several CSS properties).
  const stagedRows = useMemo(() => {
    const out: { key: string; part: PartResult }[] = [];
    for (const key of queued) {
      const [ns, id] = key.split(":");
      const pool = ns === "design" ? (sm ? smRows : (design?.parts ?? [])) : (a11y.parts ?? []);
      const part = pool.find((p) => p.id === id);
      if (part) out.push({ key, part });
    }
    return out;
  }, [queued, sm, smRows, design, a11y]);

  // What gets committed: one entry per CSS property of every staged row.
  const fixes = useMemo<CommitFix[]>(() => {
    const byRule = new Map<string, CommitFix>();
    for (const { key, part } of stagedRows) {
      const selector = part.selector ?? el.selector;
      for (const [property, value] of Object.entries(part.css ?? {})) {
        byRule.set(`${selector}|${property}`, { id: `${key.replace(":", "-")}-${property}`, selector, property, value });
      }
    }
    return [...byRule.values()];
  }, [stagedRows, el.selector]);

  const goalLabel = isDesign ? "FIGMA" : "GOAL";
  const matched = cmp.status === "done" ? cmp.data : null;

  return (
    <div className="space-y-3">
      {!wholePage && (
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
      )}

      {sheet ? (
        <CommitSheet
          fixes={fixes}
          preferFile={sm ? "public/css/styles.css" : undefined}
          onBack={() => setSheet(false)}
          onCommitted={() => {
            setQueued(new Set());
          }}
        />
      ) : (
        <>
          {isDesign && sm && (
            <p className="px-1 text-[10px] text-[var(--muted)]">
              Saltmeadow: {sm.fixes.length} difference{sm.fixes.length === 1 ? "" : "s"} from Figma on {sm.label}.
              {wholePage
                ? " Score measured against the Figma design pixel by pixel. Select an element to focus on one section."
                : " Preview them on the page, stage the ones you want, then commit them to a new branch."}
            </p>
          )}
          {isDesign && !sm && mode.kind === "sample" && (
            <p className="px-1 text-[10px] font-semibold text-[#B35C00]">
              Sample Figma data. Sign in and connect a Figma file for real numbers.
            </p>
          )}
          {isDesign && !sm && mode.kind === "live" && (
            <p className="px-1 text-[10px] text-[var(--muted)]">
              {matched
                ? `Matched with “${matched.matched_node.name || matched.matched_node.text || "a Figma layer"}” in ${mode.frame}.`
                : `Comparing with ${mode.frame}…`}
              {matched && isWeakMatch(matched) && (
                <span className="font-semibold text-[#B35C00]">
                  {" "}
                  Not a confident match, so these numbers may be off.
                </span>
              )}
            </p>
          )}

          {isDesign && mode.kind === "needsFigma" && (
            <section className={card}>
              <h2 className="text-base font-semibold text-[var(--ink)]">Pick a Figma frame first</h2>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Parity needs the design to compare this element against.
              </p>
              <PillButton onClick={onFigma} className="mt-3">
                Go to Figma Link
              </PillButton>
            </section>
          )}

          {isDesign && projectId !== null && cmp.status === "loading" && (
            <section className={card} role="status" aria-live="polite">
              <p className="text-xs font-semibold text-[var(--ink)]">Comparing with your Figma frame…</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--track)]">
                <div className="h-full w-1/3 animate-pulse rounded-full bg-[var(--fill)]" />
              </div>
            </section>
          )}

          {isDesign && projectId !== null && cmp.status === "error" && (
            <section className={card} role="alert">
              <h2 className="text-base font-semibold text-[var(--ink)]">Couldn’t compare this element</h2>
              <p className="mt-1 text-xs text-[var(--err)]">{cmp.message}</p>
              <PillButton onClick={ask} className="mt-3">
                Try again
              </PillButton>
            </section>
          )}

          {result && (
            <>
              <ScoreBreakdown
                card={toCard(
                  isDesign ? "Design Similarity Score" : "Accessibility Score",
                  result,
                  isDesign ? "Similar" : "Accessible"
                )}
              />

              {!isDesign && result.checked === 0 && (
                <p className="px-1 text-[11px] text-[var(--muted)]">
                  Nothing here to check except the page language, since this element has no text, image or control of its
                  own. Select a button, link, image or heading to see more.
                </p>
              )}

              <Findings
                ns={tab}
                title={isDesign && sm ? (sm.fixes.length ? "Changes to Prioritize" : "Matches Figma") : undefined}
                parts={findingRows}
                goalLabel={goalLabel}
                live={live}
                queued={queued}
                onQueue={(key) => setQueued((s) => toggle(s, key))}
                onQueueAll={queueAll}
                applied={applied}
                onTry={tryOnPage}
                onTryAll={tryAll}
              />

              {live && stagedRows.length > 0 && (
                <section className={`${card} flex items-center gap-3`}>
                  <p className="min-w-0 flex-1 text-xs font-semibold text-[var(--ink)]">
                    {stagedRows.length} change{stagedRows.length === 1 ? "" : "s"} ready to commit
                  </p>
                  <PillButton onClick={() => setSheet(true)}>Review &amp; commit &#8250;</PillButton>
                </section>
              )}

              {isDesign && matched?.aiStatus === "completed" && matched.aiSummary && (
                <section className={card}>
                  <h3 className="mb-1 text-sm font-semibold text-[var(--ink)]">What Parity noticed</h3>
                  <p className="text-xs text-[var(--ink2)]">{matched.aiSummary}</p>
                  {!!matched.recommendations?.length && (
                    <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] text-[var(--ink2)]">
                      {matched.recommendations.slice(0, 3).map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  )}
                </section>
              )}

              {isDesign && !sm && mode.kind === "sample" && (
                <p className="px-1 text-[10px] text-[var(--muted)]">
                  The numbers above compare against placeholder Figma values until you connect a file.
                </p>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
