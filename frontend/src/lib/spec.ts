import type { ElementSnapshot } from "./inspect";
import type { DesignSpec } from "./score";

// TODO(real data): find the Figma node that matches this element (by name, text,
// or position) and return its real font, colors, spacing and size.
export const SAMPLE_SPEC: DesignSpec = {
  fontFamily: "Plus Jakarta Sans",
  fontSize: 16,
  color: "#1E1050",
  background: "#FFFFFF",
  padding: 12,
  gap: 8,
  width: 120,
  height: 40,
};

export function specFor(_el: ElementSnapshot): DesignSpec {
  return SAMPLE_SPEC;
}