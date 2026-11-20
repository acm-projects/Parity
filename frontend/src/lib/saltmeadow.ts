import { SM_FIXES, type SmFix } from "../data/saltmeadowFixes";
import { SM_PAGE_SCORES } from "../data/saltmeadowScores";
import type { ElementSnapshot } from "./inspect";
import { PALETTE, buildResult, type PartResult, type ScoreResult } from "./score";

/**
 * Saltmeadow demo mode. On the Saltmeadow site Parity does not ask Figma at all:
 * it already knows every place the site drifts from its Figma file (see saltmeadow/BUGS.md),
 * so it lists the exact fixes for the part of the page you selected.
 */

export const isSaltmeadow = (el: ElementSnapshot) => /saltmeadow/i.test(el.pageTitle ?? "");

const CATEGORY: Record<string, "fonts" | "color" | "spacing" | "sizing"> = {
  "font-family": "fonts",
  "font-size": "fonts",
  "font-weight": "fonts",
  "line-height": "fonts",
  color: "color",
  "background-color": "color",
  "border-color": "color",
  "border-left-color": "color",
  "border-bottom-color": "color",
  padding: "spacing",
  gap: "spacing",
  "margin-top": "spacing",
  width: "sizing",
  height: "sizing",
  "border-radius": "sizing",
  "border-left-width": "sizing",
  "border-bottom-width": "sizing",
};
const PARTS = [
  { id: "fonts", name: "Fonts", color: PALETTE[0], weight: 30 },
  { id: "color", name: "Color", color: PALETTE[1], weight: 25 },
  { id: "spacing", name: "Spacing", color: PALETTE[2], weight: 20 },
  { id: "sizing", name: "Sizing", color: PALETTE[3], weight: 25 },
];
const colorOf = (f: SmFix) => PARTS.find((p) => p.id === CATEGORY[f.property])?.color ?? PALETTE[4];

const AREA_NAME: Record<string, string> = {
  header: "the header",
  footer: "the footer",
  hero: "the hero section",
  features: "the feature cards",
  favourites: "“This week’s favourites”",
  newsletter: "the newsletter",
  home: "the home page",
};

export function pageOf(path: string): string {
  const p = path.replace(/\/+$/, "") || "/";
  if (p === "/" || p === "/index.html") return "home";
  if (p.startsWith("/product")) return "product";
  if (p.startsWith("/journal/")) return "article";
  return p.slice(1).split("/")[0] || "home";
}

// The nav underline only shows on pages that have an active link in the menu.
const NAV_PAGES = new Set(["shop", "product", "about", "journal", "article", "faq", "contact"]);

export const PAGE_NAME: Record<string, string> = {
  home: "Index", shop: "Shop", product: "Product", cart: "Cart", about: "About",
  journal: "Journal", article: "Article", faq: "FAQ", contact: "Contact", signin: "Sign in",
};

/**
 * Which part of the page the element is in, and the fixes for that part.
 * wholePage = every fix on the page (the Design tab's page view).
 */
export function saltmeadowFixes(el: ElementSnapshot, wholePage = false): { page: string; area: string; label: string; fixes: SmFix[] } {
  const page = pageOf(el.pagePath ?? "/");
  const tokens = new Set((el.ancestry ?? "").split(/\s+/).filter(Boolean));

  let area: string;
  if (wholePage) area = "page";
  else if (tokens.has("site-header")) area = "header";
  else if (tokens.has("site-footer")) area = "footer";
  else if (page === "home") {
    area = ["hero", "features", "newsletter"].find((a) => tokens.has(a)) ?? "";
    if (!area && (tokens.has("section-head") || tokens.has("product-grid") || tokens.has("section"))) area = "favourites";
    if (!area) area = "home";
  } else area = page;

  const onPage = (f: SmFix) => f.page === page || f.page === "all";
  const fixes = SM_FIXES.filter((f) => {
    if (!onPage(f)) return false;
    if (f.selector.startsWith(".nav ") && !NAV_PAGES.has(page)) return false;
    if (area === "page") return true;
    if (area === "home") return f.page === "home";
    return f.area === area;
  });

  const label = area === "page" ? `the ${PAGE_NAME[page] ?? page} page` : (AREA_NAME[area] ?? `the ${page} page`);
  return { page, area, label, fixes };
}

/** One row per fix, in the shape the findings list draws. */
export const fixRows = (fixes: SmFix[]): PartResult[] =>
  fixes.map((f) => ({
    id: f.id,
    name: f.title,
    color: colorOf(f),
    weight: 1,
    fraction: 0,
    note: `${f.property}: ${f.wrong}`,
    fix: `Change ${f.property} from ${f.wrong} to ${f.correct}`,
    site: f.wrong,
    goal: f.correct,
    css: { [f.property]: f.correct },
    selector: f.selector,
  }));

/**
 * The score for this part of the page. Each category also has two checks that already match
 * the design. A fix being previewed on the page counts as matching, so the score climbs as you preview.
 */
export function saltmeadowScore(fixes: SmFix[], previewed: Set<string>): ScoreResult {
  const parts: PartResult[] = PARTS.map((p) => {
    const mine = fixes.filter((f) => CATEGORY[f.property] === p.id);
    const open = mine.filter((f) => !previewed.has(f.id)).length;
    const checks = mine.length + 2;
    return {
      id: p.id,
      name: p.name,
      color: p.color,
      weight: p.weight,
      fraction: (checks - open) / checks,
      note: open ? `${open} difference${open === 1 ? "" : "s"} from Figma` : "Matches Figma",
      fix: "",
      site: "",
      goal: "",
    };
  });
  return buildResult(parts);
}

/**
 * Whole-page score, measured against the Figma design pixel by pixel (see data/saltmeadowScores.ts).
 * Every fix previewed on the page adds its measured points, so previewing all of them reaches 100%.
 * The slices split the score by category; each category loses the points of its open fixes.
 */
export function saltmeadowPageScore(page: string, fixes: SmFix[], previewed: Set<string>): ScoreResult | null {
  const data = SM_PAGE_SCORES[page];
  if (!data) return null;
  const lost: Record<string, number> = { fonts: 0, color: 0, spacing: 0, sizing: 0 };
  for (const f of fixes) {
    if (!previewed.has(f.id)) lost[CATEGORY[f.property] ?? "color"] += data.gains[f.id] ?? 0;
  }
  // Each category's share of 100: its usual weight, grown when it has more to lose than that.
  const want = PARTS.map((p) => Math.max(p.weight, lost[p.id] * 1.15));
  const room = 100 - want.reduce((n, w, i) => n + (w > PARTS[i].weight ? w : 0), 0);
  const fixedWeight = PARTS.reduce((n, p, i) => n + (want[i] > p.weight ? 0 : p.weight), 0) || 1;
  const share = want.map((w, i) => (w > PARTS[i].weight ? w : (PARTS[i].weight * room) / fixedWeight));

  const parts: PartResult[] = PARTS.map((p, i) => {
    const open = fixes.filter((f) => CATEGORY[f.property] === p.id && !previewed.has(f.id)).length;
    return {
      id: p.id,
      name: p.name,
      color: p.color,
      weight: share[i],
      fraction: Math.max(0, (share[i] - lost[p.id]) / share[i]),
      note: open ? `${open} difference${open === 1 ? "" : "s"} from Figma` : "Matches Figma",
      fix: "",
      site: "",
      goal: "",
    };
  });
  return buildResult(parts);
}
