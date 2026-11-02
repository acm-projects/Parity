import type { Slice } from "./ScoreBreakdown";

interface Props {
  slices: Slice[];
  rest: number;
  restLabel: string;
  active: number | null;
  onHover: (i: number | null) => void;
  onSelect?: (id: string) => void;
}

export default function Legend({ slices, rest, restLabel, active, onHover, onSelect }: Props) {
  return (
    <ul className="list-none space-y-0.5">
      {slices.map((s, i) => {
        const cls =
          "flex w-full items-center gap-2.5 rounded-md px-2 py-1 text-left text-[clamp(10.5px,6.6cqw,13px)] font-semibold transition";
        const style = {
          opacity: active === null || active === i ? 1 : 0.45,
          background: active === i ? "var(--card-soft)" : "transparent",
        };
        const body = (
          <>
            <i className="h-2.5 w-2.5 flex-none rounded-sm" style={{ background: s.color }} />
            <span className="flex-1">{s.name}</span>
            <span className="tabular-nums">{s.value}%</span>
          </>
        );
        return (
          <li key={s.id}>
            {onSelect ? (
              <button
                type="button"
                className={`${cls} cursor-pointer`}
                style={style}
                onMouseEnter={() => onHover(i)}
                onMouseLeave={() => onHover(null)}
                onFocus={() => onHover(i)}
                onBlur={() => onHover(null)}
                onClick={() => onSelect(s.id)}
              >
                {body}
              </button>
            ) : (
              <div className={cls} style={style}>
                {body}
              </div>
            )}
          </li>
        );
      })}
      {rest > 0 && (
        <li className="mt-1 flex items-center gap-2.5 border-t border-dashed border-[var(--track-line)] px-2 pb-0.5 pt-2 text-[clamp(10.5px,6.6cqw,13px)] font-semibold text-[var(--muted)]">
          <i className="h-2.5 w-2.5 flex-none rounded-sm border border-[var(--track-line)] bg-[var(--track)]" />
          <span className="flex-1">{restLabel}</span>
          <span className="tabular-nums">{rest}%</span>
        </li>
      )}
    </ul>
  );
}