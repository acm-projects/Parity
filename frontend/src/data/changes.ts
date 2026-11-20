import type { Report } from "../types/design";

const P1 = "#5A32C6", P2 = "#8F72F0", P3 = "#B7A3F5", P4 = "#EFB87A", P5 = "#F7D9B4";

export const design: Report = {
  key: "design",
  title: "Design Similarity Score",
  goodLabel: "Similar",
  remainderLabel: "Remaining differences",
  detailRemainderLabel: "Different",
  parts: [
    { id: "fonts",   name: "Fonts",   share: 22, weight: 30, color: P1, fixLabel: "Font change" },
    { id: "color",   name: "Color",   share: 19, weight: 25, color: P2, fixLabel: "Color change" },
    { id: "spacing", name: "Spacing", share: 14, weight: 20, color: P3, fixLabel: "Spacing change" },
    { id: "sizing",  name: "Sizing",  share: 17, weight: 25, color: P4, fixLabel: "Sizing change" },
  ],
  changes: [
    { id: "d1",  title: "Fonts are different",        priority: "High priority",   partId: "fonts" },
    { id: "d2",  title: "Spacing in headings",        priority: "Medium priority", partId: "spacing" },
    { id: "d3",  title: "Difference in color palette", priority: "Medium priority", partId: "color" },
    { id: "d4",  title: "Button sizes differ",        priority: "Medium priority", partId: "sizing" },
    { id: "d5",  title: "Heading weight differs",     priority: "Medium priority", partId: "fonts" },
    { id: "d6",  title: "Card padding is off",        priority: "Low priority",    partId: "spacing" },
    { id: "d7",  title: "Link color mismatch",        priority: "Medium priority", partId: "color" },
    { id: "d8",  title: "Icon sizes differ",          priority: "Low priority",    partId: "sizing" },
    { id: "d9",  title: "Line height too tight",      priority: "Low priority",    partId: "fonts" },
    { id: "d10", title: "Section gaps differ",        priority: "Low priority",    partId: "spacing" },
  ],
};

export const accessibility: Report = {
  key: "accessibility",
  title: "Accessibility Score",
  goodLabel: "Accessible",
  remainderLabel: "Remaining issues",
  detailRemainderLabel: "Needs fixing",
  parts: [
    { id: "contrast",    name: "Contrast",    share: 28, weight: 34, color: P1, fixLabel: "Contrast fix" },
    { id: "labels",      name: "Labels",      share: 20, weight: 23, color: P2, fixLabel: "Label fix" },
    { id: "semantics",   name: "Semantics",   share: 15, weight: 17, color: P3, fixLabel: "Semantics fix" },
    { id: "interaction", name: "Interaction", share: 12, weight: 13, color: P4, fixLabel: "Interaction fix" },
    { id: "other",       name: "Other",       share: 12, weight: 13, color: P5, fixLabel: "Other fix" },
  ],
  changes: [
    { id: "a1",  title: "Low color contrast",         priority: "High priority",   partId: "contrast" },
    { id: "a2",  title: "Missing image alt text",     priority: "Medium priority", partId: "labels" },
    { id: "a3",  title: "Non-descriptive links",      priority: "Medium priority", partId: "semantics" },
    { id: "a4",  title: "Missing form labels",        priority: "Medium priority", partId: "labels" },
    { id: "a5",  title: "Touch targets too small",    priority: "Medium priority", partId: "interaction" },
    { id: "a6",  title: "Heading levels skipped",     priority: "Low priority",    partId: "semantics" },
    { id: "a7",  title: "Placeholder text too faint", priority: "Low priority",    partId: "contrast" },
    { id: "a8",  title: "Missing page language",      priority: "Low priority",    partId: "other" },
    { id: "a9",  title: "Focus ring hidden",          priority: "Medium priority", partId: "interaction" },
    { id: "a10", title: "Icon buttons unnamed",       priority: "Medium priority", partId: "labels" },
  ],
};

export const reports = { design, accessibility } as const;

/** Overall score = sum of the shares. */
export const score = (r: Report) => r.parts.reduce((n, p) => n + p.share, 0);