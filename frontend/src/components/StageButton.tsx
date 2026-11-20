import PillButton from "./PillButton";

interface Props {
  staged: boolean;
  onToggle: () => void;
  className?: string;
}

/** Stages a fix for the next commit. Click again to unstage. Nothing is pushed until "Review & commit". */
export default function StageButton({ staged, onToggle, className = "" }: Props) {
  return (
    <PillButton
      variant={staged ? "soft" : "primary"}
      aria-pressed={staged}
      title={staged ? "Staged. Click to unstage." : "Add this fix to the next commit"}
      onClick={onToggle}
      // py-[3.5px]: same height as the outlined Preview button, whose border adds 3px
      className={`py-[3.5px] ${className}`}
    >
      {staged ? "Staged ✓" : "Stage"}
    </PillButton>
  );
}
