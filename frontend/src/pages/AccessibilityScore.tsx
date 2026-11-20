import ScoreBreakdown, { overviewCard } from "../components/ScoreBreakdown";
import ChangesList from "../components/ChangesList";
import { accessibility } from "../data/changes";

interface Props {
  onSelect: (partId: string) => void;
}

export default function AccessibilityScore({ onSelect }: Props) {
  return (
    <div className="space-y-3">
      <ScoreBreakdown card={overviewCard(accessibility)} onSelect={onSelect} />
      <ChangesList changes={accessibility.changes} parts={accessibility.parts} />
    </div>
  );
}