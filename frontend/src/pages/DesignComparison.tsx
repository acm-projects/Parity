import ScoreBreakdown, { overviewCard } from "../components/ScoreBreakdown";
import ChangesList from "../components/ChangesList";
import { design } from "../data/changes";

interface Props {
  onSelect: (partId: string) => void;
}

export default function DesignComparison({ onSelect }: Props) {
  return (
    <div className="space-y-3">
      <ScoreBreakdown card={overviewCard(design)} onSelect={onSelect} />
      <ChangesList changes={design.changes} parts={design.parts} />
    </div>
  );
}