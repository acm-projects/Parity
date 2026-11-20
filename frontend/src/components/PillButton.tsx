import type { ButtonHTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  // ghostOn = an outline button that is currently toggled on, soft = the "Committed" state
  variant?: "primary" | "ghost" | "ghostOn" | "soft";
}

const LOOK = {
  primary: "bg-[linear-gradient(180deg,#6F47DB,#5A32C6)] text-white",
  ghost: "border-[1.5px] border-[var(--p1)] bg-[var(--card)] text-[var(--p1)]",
  ghostOn: "border-[1.5px] border-[var(--p1)] bg-[var(--card-tint)] text-[var(--p1)]",
  soft: "bg-[var(--card-tint)] text-[var(--p1)]",
};

export default function PillButton({
  variant = "primary",
  className = "",
  type = "button",
  ...rest
}: Props) {
  return (
    <button
      type={type}
      className={twMerge(
        "cursor-pointer rounded-full px-2.5 py-0.5 text-xs font-semibold",
        LOOK[variant],
        className
      )}
      {...rest}
    />
  );
}