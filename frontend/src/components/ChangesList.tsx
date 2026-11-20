import { useState } from "react";
import type { Change, Part } from "../types/design";
import ChangeItem from "./ChangeItem";
import PillButton from "./PillButton";

interface Props {
  changes: Change[];
  parts: Part[];
  sub?: "priority" | "fix"; // what to print under each title
}

export default function ChangesList({ changes, parts, sub = "priority" }: Props) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [done, setDone] = useState<Set<string>>(new Set());

  const toggle = (set: Set<string>, id: string) => {
    const n = new Set(set);
    if (!n.delete(id)) n.add(id);
    return n;
  };

  const rows = changes.flatMap((c) => {
    const part = parts.find((p) => p.id === c.partId);
    return part ? [{ c, part }] : [];
  });

  const ids = rows.map((r) => r.c.id);
  const allOpen = ids.length > 0 && ids.every((id) => open.has(id));
  const allDone = ids.length > 0 && ids.every((id) => done.has(id));

  return (
    <section className="rounded-2xl bg-[var(--card)] p-4 shadow-[0_6px_18px_rgba(91,51,200,.10)]">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <h3 className="text-sm font-semibold text-[var(--ink)]">Changes to Prioritize</h3>
        {rows.length > 0 && (
          <div className="flex flex-none gap-2">
            <PillButton variant={allOpen ? "ghostOn" : "ghost"} onClick={() => setOpen(allOpen ? new Set() : new Set(ids))}>
              {allOpen ? "Undo all" : "Preview all"}
            </PillButton>
            <PillButton
              variant={allDone ? "soft" : "primary"}
              onClick={() => setDone(allDone ? new Set() : new Set(ids))}
              className="py-[3.5px]"
            >
              {allDone ? "Unstage all" : "Stage all"}
            </PillButton>
          </div>
        )}
      </div>
      {rows.length > 0 ? (
        <ul className="scroll max-h-40 overflow-y-auto pr-2">
          {rows.map(({ c, part }) => (
            <ChangeItem
              key={c.id}
              change={c}
              part={part}
              subtitle={sub === "fix" ? part.fixLabel : c.priority}
              open={open.has(c.id)}
              done={done.has(c.id)}
              onPreview={() => setOpen((s) => toggle(s, c.id))}
              onCommit={() => setDone((s) => toggle(s, c.id))}
            />
          ))}
        </ul>
      ) : (
        <div className="px-2 pb-1 pt-3 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(180deg,#6F47DB,#5A32C6)] shadow-[0_6px_14px_rgba(90,50,198,.3)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12.5l4.5 4.5L19 7" />
            </svg>
          </div>
          <p className="mt-2 text-sm font-semibold text-[var(--ink)]">You’re all in sync</p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">No changes to prioritize.</p>
        </div>
      )}
    </section>
  );
}