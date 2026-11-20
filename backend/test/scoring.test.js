const test = require("node:test");
const assert = require("node:assert/strict");

const {
  compareElement,
  findBestFigmaNode,
} = require("../src/compare");

const {
  scoreAccessibility,
  getAccessibilityIssues,
  contrastRatio,
} = require("../src/accessibility");

const element = {
  tag: "div",
  selector: "div.signup-btn",
  text: "Sign up",
  role: "",
  name: "Sign up",
  interactive: true,
  native: false,
  explicitRole: "",
  hasOwnText: true,
  isImage: false,
  hasAlt: false,
  tabindex: null,
  ariaHidden: false,
  langSet: true,
  fontFamily: "Inter",
  fontSize: 14,
  fontWeight: 600,
  color: "#A99BE0",
  background: "#FFFFFF",
  width: 96,
  height: 32,
  padding: 8,
  gap: 0,
};

const matchingNode = {
  id: "1:1",
  name: "Sign up",
  type: "TEXT",
  text: "Sign up",
  visible: true,
  font_family: "Inter",
  font_size: 14,
  font_weight: 600,
  color: "#A99BE0",
  background: "#FFFFFF",
  width: 96,
  height: 32,
  padding: 8,
  gap: 0,
};

test("perfect design match scores 100", () => {
  const result = compareElement({
    element,
    nodes: [matchingNode],
    figmaNodeId: "1:1",
  });

  assert.equal(result.design_score, 100);
  assert.equal(result.matched_node.id, "1:1");
  assert.deepEqual(result.mismatches, []);
});

test("automatic matching prefers the correct Figma node", () => {
  const wrongNode = {
    id: "2:2",
    name: "Navigation",
    type: "FRAME",
    text: "",
    visible: true,
    width: 500,
    height: 100,
    background: "#000000",
  };

  const result = findBestFigmaNode(
    element,
    [wrongNode, matchingNode]
  );

  assert.equal(result.id, "1:1");
  assert.ok(result.match_score > 0);
});

test("accessibility scoring identifies expected issues", () => {
  const score = scoreAccessibility(element);
  const issues = getAccessibilityIssues(score);

  const categories = issues.map(
    (issue) => issue.category
  );

  assert.ok(score.total < 100);
  assert.ok(categories.includes("contrast"));
  assert.ok(categories.includes("semantics"));
  assert.ok(categories.includes("interaction"));
  assert.ok(!categories.includes("labels"));
});

test("accessible native button scores 100", () => {
  const button = {
    ...element,
    tag: "button",
    role: "button",
    name: "Continue",
    text: "Continue",
    native: true,
    interactive: true,
    color: "#000000",
    background: "#FFFFFF",
    width: 120,
    height: 44,
  };

  const score = scoreAccessibility(button);

  assert.equal(score.total, 100);
  assert.deepEqual(
    getAccessibilityIssues(score),
    []
  );
});

test("black on white contrast is approximately 21 to 1", () => {
  const ratio = contrastRatio(
    "#000000",
    "#FFFFFF"
  );

  assert.ok(Math.abs(ratio - 21) < 0.01);
});

test("style fixes return CSS and Tailwind corrections", () => {
  const mismatchedElement = {
    ...element,
    selector: ".signup-btn",
    fontSize: 12,
    background: "#000000",
    width: 80,
    borderRadius: 2,
  };

  const targetNode = {
    ...matchingNode,
    font_size: 16,
    background: "#FFFFFF",
    width: 96,
    corner_radius: 8,
  };

  const result = compareElement({
    element: mismatchedElement,
    nodes: [targetNode],
    figmaNodeId: "1:1",
  });

  const properties = result.suggested_fixes.map(
    (fix) => fix.property
  );

  assert.ok(properties.includes("fontSize"));
  assert.ok(properties.includes("background"));
  assert.ok(properties.includes("width"));
  assert.ok(properties.includes("borderRadius"));

  assert.equal(
    result.css_fixes["font-size"],
    "16px"
  );

  assert.equal(
    result.css_fixes["background-color"],
    "#FFFFFF"
  );

  assert.equal(result.css_fixes.width, "96px");

  assert.equal(
    result.css_fixes["border-radius"],
    "8px"
  );

  assert.match(
    result.css_fix_rule,
    /\.signup-btn/
  );

  assert.ok(
    result.tailwind_classes.includes("text-[16px]")
  );

  assert.ok(
    result.tailwind_classes.includes(
      "rounded-[8px]"
    )
  );
});
test("font weight differences do not change the design score", () => {
  const differentWeight = {
    ...element,
    fontWeight: 400,
  };

  const result = compareElement({
    element: differentWeight,
    nodes: [matchingNode],
    figmaNodeId: "1:1",
  });

  assert.equal(result.design_score, 100);

  assert.ok(
    result.suggested_fixes.some(
      (fix) => fix.property === "fontWeight"
    )
  );
});