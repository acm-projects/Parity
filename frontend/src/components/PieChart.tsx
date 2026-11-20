import { donutPaths } from "../lib/chart";
import type { Slice } from "./ScoreBreakdown";

interface Props {
  slices: Slice[];
  remainder: number;
  active: number | null;
  onHover: (i: number | null) => void;
  onSelect?: (id: string) => void;
  size?: number;
  centerValue: string;
  centerLabel: string;
}

export default function PieChart({
  slices,
  remainder,
  active,
  onHover,
  onSelect,
  size = 120,
  centerValue,
  centerLabel,
}: Props) {
  const { slices: paths, rest } = donutPaths(slices.map((s) => s.value), remainder);
  return (
    <div className="relative flex-none" style={{ width: size, height: size }}>
      {/* soft glow behind the donut */}
      <div
        className="pointer-events-none absolute -inset-4 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(143,114,240,.32) 0%, rgba(143,114,240,0) 68%)" }}
      />
      <svg viewBox="0 0 42 42" width={size} height={size} className="relative" aria-hidden="true">
        {rest && (
          <path
            d={rest}
            fill="var(--track)"
            stroke="var(--track-line)"
            strokeWidth=".55"
            strokeLinejoin="round"
            className="pointer-events-none"
          />
        )}
        {paths.map(
          (d, i) =>
            d && (
              <path
                key={slices[i].id}
                d={d}
                fill={slices[i].color}
                onMouseEnter={() => onHover(i)}
                onMouseLeave={() => onHover(null)}
                onClick={() => onSelect?.(slices[i].id)}
                style={{
                  cursor: onSelect ? "pointer" : "default",
                  transformOrigin: "21px 21px",
                  transition: "transform .15s, opacity .15s",
                  transform: active === i ? "scale(1.07)" : "scale(1)",
                  opacity: active === null || active === i ? 1 : 0.3,
                }}
              />
            )
        )}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-extrabold leading-none tracking-tight text-[var(--ink)]">
          {centerValue}
        </span>
        <span className="mt-1 text-[11px] font-bold text-[var(--muted)]">{centerLabel}</span>
      </div>
    </div>
  );
}