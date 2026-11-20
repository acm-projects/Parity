import type { ReactNode } from "react";

export default function Screen({ children }: { children: ReactNode }) {
  return (
    <div className="parity-bg h-full w-full">
      <div className="parity-screen mx-auto flex max-w-[560px] flex-col gap-3">{children}</div>
    </div>
  );
}