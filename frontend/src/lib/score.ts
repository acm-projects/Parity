import type { ElementSnapshot } from "./inspect";

/** The Figma side of the comparison. Any field left out is skipped. */
export interface DesignSpec {
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  background?: string;
  padding?: number;
  gap?: number;
  width?: number;
  height?: number;
}

export interface PartResult {
  id: string;
  name: string;
  color: string;
  weight: number;
  fraction: number | null; // 0..1, null = does not apply to this element
  note: string;
  fix: string;
  site: string; // what the page has now
  goal: string; // what it should have (the Figma value, or the accessibility target)
  css?: Record<string, string>; // CSS that fixes it, e.g. { "font-size": "16px" }. Used by Preview and Commit.
  selector?: string; // which elements the fix is for. Unset = the element selected in DevTools.
}

export interface ScoreResult {
  total: number; // 0..100
  parts: PartResult[];
  slices: { id: string; name: string; color: string; value: number }[];
  checked: number; // checks that apply to this element (the page-level "Other" check does not count)
}

const C = ["#7C5CE8", "#9D86F2", "#B7A3F5", "#EFB87A", "#F7D9B4"];
export const PALETTE = C;

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const avg = (xs: number[]) => xs.reduce((n, x) => n + x, 0) / xs.length;
const px = (n: number) => `${Math.round(n * 10) / 10}px`;
const rgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const lin = (v: number) => {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};
const lum = (hex: string) => {
  const [r, g, b] = rgb(hex);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};
export const contrastRatio = (a: string, b: string) => {
  const x = lum(a);
  const y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

const toHex = (c: [number, number, number]) =>
  "#" + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");

/** The text color closest to the current one that passes: slide it toward black or white until it does. */
export function suggestTextColor(fg: string, bg: string, need: number): string {
  const end: [number, number, number] = contrastRatio("#000000", bg) >= contrastRatio("#ffffff", bg) ? [0, 0, 0] : [255, 255, 255];
  const from = rgb(fg);
  for (let t = 0.05; t < 1; t += 0.05) {
    const c = toHex([0, 1, 2].map((i) => from[i] + (end[i] - from[i]) * t) as [number, number, number]);
    if (contrastRatio(c, bg) >= need) return c;
  }
  return toHex(end);
}

const part = (
  id: string,
  name: string,
  color: string,
  weight: number,
  fraction: number | null,
  note: string,
  fix = "",
  site = "",
  goal = ""
): PartResult => ({ id, name, color, weight, fraction, note, fix, site, goal });

/**
 * Parts that do not apply are dropped and the rest are rescaled to 100.
 * Slice percentages use the largest-remainder method, so they always add up to the
 * rounded total (a perfect element is exactly 100%, never 99% with a stray "To go 1%").
 */
export function buildResult(parts: PartResult[]): ScoreResult {
  const live = parts.filter((p) => p.fraction !== null);
  const W = live.reduce((n, p) => n + p.weight, 0) || 1;
  const exact = live.map((p) => (((p.fraction ?? 0) * p.weight) / W) * 100);
  const total = Math.round(exact.reduce((n, x) => n + x, 0));
  const values = exact.map((x) => Math.floor(x));
  let left = total - values.reduce((n, v) => n + v, 0);
  const order = exact.map((x, i) => ({ i, r: x - Math.floor(x) })).sort((a, b) => b.r - a.r);
  for (const o of order) {
    if (left <= 0) break;
    values[o.i] += 1;
    left -= 1;
  }
  const slices = live.map((p, i) => ({ id: p.id, name: p.name, color: p.color, value: values[i] }));
  return { total, parts, slices, checked: live.filter((p) => p.id !== "other").length };
}

export function scoreAccessibility(s: ElementSnapshot): ScoreResult {
  // Contrast (30)
  let contrast: PartResult;
  if (s.hasOwnText) {
    const ratio = contrastRatio(s.color, s.background);
    const large = s.fontSize >= 24 || (s.fontSize >= 18.66 && s.fontWeight >= 700);
    const need = large ? 3 : 4.5;
    const shown = Math.floor(ratio * 10) / 10;
    const pass = ratio >= need;
    const better = pass ? "" : suggestTextColor(s.color, s.background, need);
    contrast = part(
      "contrast", "Contrast", C[0], 30,
      pass ? 1 : clamp01((ratio - 1) / (need - 1)),
      `${s.color} on ${s.background} is ${shown}:1 (needs ${need}:1)`,
      pass ? "" : `Change the text color to ${better}, or use a lighter background.`,
      `${s.color} on ${s.background} · ${shown}:1`,
      pass ? `${need}:1 or higher` : `${better} on ${s.background} · ${need}:1 or higher`
    );
    if (!pass) contrast.css = { color: better };
  } else {
    contrast = part("contrast", "Contrast", C[0], 30, null, "No text directly in this element.");
  }

  // Labels (25)
  let labels: PartResult;
  if (s.isImage || s.interactive) {
    if (s.isImage && s.tag === "img") {
      const ok = s.hasAlt || !!s.name;
      labels = part(
        "labels", "Labels", C[1], 25, ok ? 1 : 0,
        ok ? (s.name ? `alt text: "${s.name.slice(0, 40)}"` : "Empty alt marks it as decorative.") : "Image has no alt attribute.",
        ok ? "" : 'Add alt="..." describing the image (alt="" if decorative).',
        s.hasAlt ? (s.name ? `alt="${s.name.slice(0, 30)}"` : 'alt="" (decorative)') : "No alt attribute",
        "Descriptive alt text"
      );
    } else {
      const ok = !!s.name;
      labels = part(
        "labels", "Labels", C[1], 25, ok ? 1 : 0,
        ok ? `Accessible name: "${s.name.slice(0, 40)}"` : "No accessible name.",
        ok ? "" : "Add visible text or an aria-label.",
        ok ? `"${s.name.slice(0, 30)}"` : "No accessible name",
        "A clear name"
      );
    }
  } else {
    labels = part("labels", "Labels", C[1], 25, null, "Not a control or image.");
  }

  // Semantics (20)
  let semantics: PartResult;
  if (s.interactive) {
    if (s.native) {
      semantics = part(
        "semantics", "Semantics", C[2], 20, 1,
        `Native <${s.tag}> is announced as ${s.role || "a control"}.`, "",
        `<${s.tag}>`, `<${s.tag}>`
      );
    } else if (s.explicitRole) {
      const kb = s.tabindex !== null && s.tabindex >= 0;
      semantics = part(
        "semantics", "Semantics", C[2], 20, kb ? 0.7 : 0.4,
        `role="${s.explicitRole}" on a <${s.tag}>${kb ? "" : " with no tabindex"}.`,
        "Use a native <button> or <a href> so keyboard and screen readers work for free.",
        `<${s.tag} role="${s.explicitRole}">`, "<button> or <a href>"
      );
    } else {
      semantics = part(
        "semantics", "Semantics", C[2], 20, 0,
        `Clickable <${s.tag}> is announced as plain text.`,
        `Use a <button> (or <a href>) instead of a <${s.tag}>.`,
        `<${s.tag}> (plain text)`, "<button> or <a href>"
      );
    }
  } else {
    semantics = part("semantics", "Semantics", C[2], 20, null, "Not an interactive element.");
  }

  // Interaction (15)
  let interaction: PartResult;
  if (s.interactive) {
    const small = Math.min(s.width, s.height);
    const f = small >= 44 ? 1 : small >= 24 ? 0.6 : 0.2;
    interaction = part(
      "interaction", "Interaction", C[3], 15, f,
      `${s.width} × ${s.height} px target (44 × 44 recommended).`,
      f >= 1 ? "" : "Make the clickable area at least 44 × 44 px (padding works).",
      `${s.width} × ${s.height} px`, "44 × 44 px"
    );
  } else {
    interaction = part("interaction", "Interaction", C[3], 15, null, "Not an interactive element.");
  }

  // Other (10): always applies
  const problems: string[] = [];
  let other = 1;
  if (!s.langSet) { other -= 0.6; problems.push("The page has no lang attribute."); }
  if (s.tabindex !== null && s.tabindex > 0) { other -= 0.2; problems.push("Positive tabindex breaks the tab order."); }
  if (s.ariaHidden && s.interactive) { other -= 0.2; problems.push("aria-hidden on something focusable."); }
  const otherPart = part(
    "other", "Other", C[4], 10, Math.max(0, other),
    problems.length ? problems.join(" ") : "Page language is set, no tab-order or hidden-focus problems.",
    problems.length ? "Fix the items above." : "",
    problems.length ? problems.join(" ") : "No problems found",
    "lang set, sensible tab order"
  );

  return buildResult([contrast, labels, semantics, interaction, otherPart]);
}

export function scoreDesign(s: ElementSnapshot, spec: DesignSpec): ScoreResult {
  // Fonts (30)
  const fBits: number[] = [];
  const fSite: string[] = [];
  const fFigma: string[] = [];
  if (spec.fontFamily !== undefined) {
    fBits.push(s.fontFamily.toLowerCase() === spec.fontFamily.toLowerCase() ? 1 : 0);
    fSite.push(s.fontFamily);
    fFigma.push(spec.fontFamily);
  }
  if (spec.fontSize !== undefined) {
    const d = Math.abs(s.fontSize - spec.fontSize);
    fBits.push(clamp01(1 - d / (spec.fontSize * 0.5)));
    fSite.push(px(s.fontSize));
    fFigma.push(px(spec.fontSize));
  }
  const fonts = fBits.length
    ? part("fonts", "Fonts", C[0], 30, avg(fBits), `Site: ${fSite.join(" ")} | Figma: ${fFigma.join(" ")}`,
        avg(fBits) >= 1 ? "" : `Change the site to ${fFigma.join(" ")}.`, fSite.join(" "), fFigma.join(" "))
    : part("fonts", "Fonts", C[0], 30, null, "No font in the Figma data.");

  // Color (25)
  const cBits: number[] = [];
  const cSite: string[] = [];
  const cFigma: string[] = [];
  const dist = (a: string, b: string) => {
    const [r1, g1, b1] = rgb(a);
    const [r2, g2, b2] = rgb(b);
    return Math.hypot(r1 - r2, g1 - g2, b1 - b2);
  };
  if (spec.color !== undefined) {
    cBits.push(clamp01(1 - Math.max(0, dist(s.color, spec.color) - 6) / 120));
    cSite.push(`text ${s.color}`);
    cFigma.push(`text ${spec.color}`);
  }
  if (spec.background !== undefined) {
    cBits.push(clamp01(1 - Math.max(0, dist(s.background, spec.background) - 6) / 120));
    cSite.push(`bg ${s.background}`);
    cFigma.push(`bg ${spec.background}`);
  }
  const color = cBits.length
    ? part("color", "Color", C[1], 25, avg(cBits), `Site: ${cSite.join(", ")} | Figma: ${cFigma.join(", ")}`,
        avg(cBits) >= 1 ? "" : `Use ${cFigma.join(", ")}.`, cSite.join(", "), cFigma.join(", "))
    : part("color", "Color", C[1], 25, null, "No colors in the Figma data.");

  // Spacing (20)
  const rel = (a: number, b: number, floor: number) => clamp01(1 - Math.abs(a - b) / Math.max(b, floor));
  const sBits: number[] = [];
  const sSite: string[] = [];
  const sFigma: string[] = [];
  if (spec.padding !== undefined) {
    sBits.push(rel(s.padding, spec.padding, 4));
    sSite.push(`padding ${px(s.padding)}`);
    sFigma.push(`padding ${px(spec.padding)}`);
  }
  if (spec.gap !== undefined) {
    sBits.push(rel(s.gap, spec.gap, 4));
    sSite.push(`gap ${px(s.gap)}`);
    sFigma.push(`gap ${px(spec.gap)}`);
  }
  const spacing = sBits.length
    ? part("spacing", "Spacing", C[2], 20, avg(sBits), `Site: ${sSite.join(", ")} | Figma: ${sFigma.join(", ")}`,
        avg(sBits) >= 1 ? "" : `Set ${sFigma.join(", ")}.`, sSite.join(", "), sFigma.join(", "))
    : part("spacing", "Spacing", C[2], 20, null, "No spacing in the Figma data.");

  // Sizing (25)
  const zBits: number[] = [];
  const zSite: string[] = [];
  const zFigma: string[] = [];
  if (spec.width !== undefined) {
    zBits.push(rel(s.width, spec.width, 1));
    zSite.push(`w ${px(s.width)}`);
    zFigma.push(`w ${px(spec.width)}`);
  }
  if (spec.height !== undefined) {
    zBits.push(rel(s.height, spec.height, 1));
    zSite.push(`h ${px(s.height)}`);
    zFigma.push(`h ${px(spec.height)}`);
  }
  const sizing = zBits.length
    ? part("sizing", "Sizing", C[3], 25, avg(zBits), `Site: ${zSite.join(", ")} | Figma: ${zFigma.join(", ")}`,
        avg(zBits) >= 1 ? "" : `Resize to ${zFigma.join(", ")}.`, zSite.join(", "), zFigma.join(", "))
    : part("sizing", "Sizing", C[3], 25, null, "No size in the Figma data.");

  return buildResult([fonts, color, spacing, sizing]);
}