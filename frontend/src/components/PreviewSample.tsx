
import type { ReactNode } from "react";
const mono = "font-mono text-[11px] font-semibold text-[#3A1F78]";
const Aa = ({ color, className = "", font }: { color: string; className?: string; font?: string }) => (
  <b className={`text-lg leading-none ${className}`} style={{ color, fontFamily: font }}>
    Aa
  </b>
);
const Box = ({ w, h, c = "#5A32C6" }: { w: number; h: number; c?: string }) => (
  <span className="block rounded-[5px]" style={{ width: w, height: h, background: c }} />
);
const Chip = ({ children }: { children: ReactNode }) => (
  <span className="rounded-lg border border-[#E4DDFB] bg-white px-2 py-[3px] text-[11px] font-bold">{children}</span>
);

interface Side {
  visual: ReactNode;
  text: string;
}
// What Preview shows per part: how the Figma file has it, and how your site has it today.
// TODO(real data): build these from the compared values instead of hard-coding them.
export const SAMPLES: Record<string, { figma: Side; site: Side }> = {
  contrast: {
    figma: { visual: <Aa color="#3A1F78" />, text: "#3A1F78 · 12.6 : 1" },
    site: { visual: <Aa color="#A99BE0" />, text: "#A99BE0 · 2.4 : 1" },
  },
  labels: {
    figma: { visual: <Chip>Search</Chip>, text: 'aria-label="Search"' },
    site: { visual: <Chip>●</Chip>, text: "No accessible name" },
  },
  semantics: {
    figma: { visual: <span className={mono}>&lt;button&gt;</span>, text: "Announced as a button" },
    site: { visual: <span className={mono}>&lt;div&gt;</span>, text: "Announced as plain text" },
  },
  interaction: {
    figma: { visual: <Box w={26} h={26} />, text: "44 × 44 px target" },
    site: { visual: <Box w={16} h={16} />, text: "28 × 28 px target" },
  },
  other: {
    figma: { visual: <span className={mono}>lang="en"</span>, text: "Language is set" },
    site: { visual: <span className={`${mono} opacity-50`}>lang=?</span>, text: "Language is missing" },
  },
  fonts: {
    figma: { visual: <Aa color="#3A1F78" font="'Playfair Display', Georgia, serif" />, text: "Playfair Display 32" },
    site: { visual: <Aa color="#3A1F78" font="'Plus Jakarta Sans', system-ui, sans-serif" />, text: "Plus Jakarta Sans 28" },
  },
  color: {
    figma: { visual: <Box w={36} h={18} c="#5A32C6" />, text: "#5A32C6" },
    site: { visual: <Box w={36} h={18} c="#6D4BD9" />, text: "#6D4BD9" },
  },
  spacing: {
    figma: {
      visual: (
        <span className="flex items-center gap-6">
          <Box w={26} h={12} c="#B7A3F5" />
          <Box w={26} h={12} c="#B7A3F5" />
        </span>
      ),
      text: "24 px gap",
    },
    site: {
      visual: (
        <span className="flex items-center gap-3">
          <Box w={26} h={12} c="#B7A3F5" />
          <Box w={26} h={12} c="#B7A3F5" />
        </span>
      ),
      text: "12 px gap",
    },
  },
  sizing: {
    figma: { visual: <Box w={60} h={20} c="#B7A3F5" />, text: "120 × 40 px" },
    site: { visual: <Box w={50} h={17} c="#B7A3F5" />, text: "104 × 36 px" },
  },
};

function Tile({ label, side, site }: { label: string; side: Side; site?: boolean }) {
  return (
    <div className="force-light flex-1 rounded-xl px-3 py-2" style={{ background: site ? "#FFF8EE" : "#F6F3FF" }}>
      <div className="text-[11px] font-bold tracking-wide" style={{ color: site ? "#8A5200" : "#5A32C6" }}>
        {label}
      </div>
      <div className="mt-1 flex min-h-[26px] items-center">{side.visual}</div>
      <div className="mt-1 text-[11px] font-semibold text-[var(--ink2)]">{side.text}</div>
    </div>
  );
}

export default function PreviewSample({ partId }: { partId: string }) {
  const s = SAMPLES[partId];
  if (!s) {
    return (
      <p className="force-light w-full rounded-xl bg-[#F6F3FF] px-3 py-2 text-xs text-[var(--muted)]">
        No preview for this change yet.
      </p>
    );
  }
  return (
    <>
      <Tile label="FIGMA" side={s.figma} />
      <Tile label="YOUR SITE" side={s.site} site />
    </>
  );
}