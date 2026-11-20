import type { Comparison } from "./api";
import { PALETTE, buildResult, type PartResult, type ScoreResult } from "./score";

const COLOR: Record<string, string> = { fonts: PALETTE[0], color: PALETTE[1], spacing: PALETTE[2], sizing: PALETTE[3] };

/** Which score part a CSS property belongs to. */
const PART_OF: Record<string, string> = {
  "font-family": "fonts",
  "font-size": "fonts",
  "font-weight": "fonts",
  color: "color",
  "background-color": "color",
  padding: "spacing",
  gap: "spacing",
  width: "sizing",
  height: "sizing",
  "border-radius": "sizing",
};

/** Turns the backend's comparison into the same shape the rest of the UI already draws. */
export function designFromComparison(c: Comparison): ScoreResult {
  const parts: PartResult[] = c.categories.map((k) => {
    const css: Record<string, string> = {};
    for (const [prop, value] of Object.entries(c.css_fixes ?? {})) {
      if (PART_OF[prop] === k.id) css[prop] = value;
    }
    const site = k.current ?? "";
    const goal = k.expected ?? "";
    return {
      id: k.id,
      name: k.name,
      color: COLOR[k.id] ?? PALETTE[4],
      weight: k.weight,
      fraction: k.fraction,
      note: k.fraction === null ? `No ${k.name.toLowerCase()} in the Figma data.` : `Site: ${site} | Figma: ${goal}`,
      fix: k.fix,
      site,
      goal,
      css: Object.keys(css).length ? css : undefined,
    };
  });
  return buildResult(parts);
}

/** A low match score means Parity was guessing which Figma layer this element is. */
export const isWeakMatch = (c: Comparison) => (c.matched_node.match_score ?? 0) < 45;
