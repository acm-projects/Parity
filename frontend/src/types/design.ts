export type Priority = "High priority" | "Medium priority" | "Low priority";

export interface Part {
  id: string; // "fonts", "contrast" ... also the id of its detail screen
  name: string;
  share: number; // points it adds to the overall score
  weight: number; // most points it can add
  color: string; // colour of its slice, its key dot and its list icons
  fixLabel: string; // sub-label on its change rows, e.g. "Font change"
}

export interface Change {
  id: string;
  title: string;
  priority: Priority;
  partId: string; // which Part this change belongs to
}

export interface Report {
  key: "design" | "accessibility";
  title: string; // "Design Comparison"
  goodLabel: string; // "Similar" / "Accessible"
  remainderLabel: string; // "Still different" / "Still to fix"
  detailRemainderLabel: string; // "Different" / "Needs fixing"
  parts: Part[];
  changes: Change[];
}