import { useState } from "react";
import type { Part, Report } from "../types/design";
import { score } from "../data/changes";
import PieChart from "./PieChart";
import Legend from "./Legend";

const VIEW_HEIGHT = 140;
const CHART_SIZE = 120;
const SPARK = "M12 1 Q14 10 23 12 Q14 14 12 23 Q10 14 1 12 Q10 10 12 1Z";

export interface Slice {
  id: string;
  name: string;
  color: string;
  value: number;
}
export interface CardData {
  title: string;
  slices: Slice[];
  total: number; // big number in the middle
  totalLabel: string; // small label under it
  remainderLabel: string; // name of the unfilled part
}

/** Overview card: one slice per part. */
export const overviewCard = (r: Report): CardData => ({
  title: r.title,
  slices: r.parts.map((p) => ({ id: p.id, name: p.name, color: p.color, value: p.share })),
  total: score(r),
  totalLabel: r.goodLabel,
  remainderLabel: r.remainderLabel,
});

/** Detail card: one part on its own. 22 of 30 points shows as 73%. */
export const partCard = (r: Report, p: Part): CardData => {
  const pct = Math.round((p.share / p.weight) * 100);
  return {
    title: p.name,
    slices: [{ id: p.id, name: r.goodLabel, color: p.color, value: pct }],
    total: pct,
    totalLabel: r.goodLabel,
    remainderLabel: r.detailRemainderLabel,
  };
};

interface Props {
  card: CardData;
  onSelect?: (id: string) => void;
}

export default function ScoreBreakdown({ card, onSelect }: Props) {
  const [active, setActive] = useState<number | null>(null);
  const rest = 100 - card.slices.reduce((n, s) => n + s.value, 0);
  const hovered = active !== null ? card.slices[active] : null;

  return (
    <section
      aria-label={card.title}
      className="rounded-2xl border border-[var(--card-border)] bg-[linear-gradient(160deg,var(--card)_0%,var(--card-grad)_100%)] px-4 py-5 shadow-[0_16px_36px_rgba(90,50,198,.24),0_2px_6px_rgba(90,50,198,.10)]"
    >
      <div className="flex items-center gap-4" style={{ minHeight: VIEW_HEIGHT }}>
        <PieChart
          slices={card.slices}
          remainder={rest}
          active={active}
          onHover={setActive}
          onSelect={onSelect}
          size={CHART_SIZE}
          centerValue={`${hovered ? hovered.value : card.total}%`}
          centerLabel={hovered ? hovered.name : card.totalLabel}
        />
        <div className="min-w-0 flex-1 space-y-3 [container-type:inline-size]">
          <h2 className="relative inline-block whitespace-nowrap pr-6 text-[clamp(11px,7.4cqw,16px)] font-bold leading-tight text-[var(--ink)]">
            {card.title}
            <svg viewBox="0 0 24 24" width="16" height="16" className="pointer-events-none absolute -top-1.5 right-0" aria-hidden="true">
              <path d={SPARK} fill="var(--p4)" />
            </svg>
            <svg viewBox="0 0 24 24" width="8" height="8" className="pointer-events-none absolute -bottom-1 right-3" aria-hidden="true">
              <path d={SPARK} fill="var(--p3)" />
            </svg>
          </h2>
          <Legend
            slices={card.slices}
            rest={rest}
            restLabel={card.remainderLabel}
            active={active}
            onHover={setActive}
            onSelect={onSelect}
          />
        </div>
      </div>
    </section>
  );
}