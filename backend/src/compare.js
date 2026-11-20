const { buildStyleFixes } = require("./fixes");

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function average(values) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function px(value) {
  return `${Math.round(value * 10) / 10}px`;
}

function hexToRgb(hex) {
  if (typeof hex !== "string") {
    return null;
  }

  const value = hex.trim().replace("#", "");

  if (!/^[0-9a-f]{6}$/i.test(value)) {
    return null;
  }

  const number = parseInt(value, 16);

  return [
    (number >> 16) & 255,
    (number >> 8) & 255,
    number & 255,
  ];
}

function colorDistance(first, second) {
  const a = hexToRgb(first);
  const b = hexToRgb(second);

  if (!a || !b) {
    return null;
  }

  return Math.hypot(
    a[0] - b[0],
    a[1] - b[1],
    a[2] - b[2]
  );
}

function relativeScore(actual, expected, floor) {
  return clamp01(
    1 - Math.abs(actual - expected) / Math.max(expected, floor)
  );
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function finish(parts) {
  const live = parts.filter((part) => part.fraction !== null);
  const totalWeight =
    live.reduce((sum, part) => sum + part.weight, 0) || 1;

  const slices = live.map((part) => ({
    id: part.id,
    name: part.name,
    value: Math.round(
      ((part.fraction * part.weight) / totalWeight) * 100
    ),
  }));

  let total = slices.reduce(
    (sum, slice) => sum + slice.value,
    0
  );

  while (total > 100) {
    const largest = slices.reduce((a, b) =>
      b.value > a.value ? b : a
    );

    largest.value -= 1;
    total -= 1;
  }

  return {
    total,
    parts,
    slices,
  };
}

function makePart(
  id,
  name,
  weight,
  fraction,
  current,
  expected,
  fix
) {
  return {
    id,
    name,
    weight,
    fraction,
    current,
    expected,
    fix: fix || "",
  };
}

function designSpecFromNode(node) {
  if (!node) {
    return {};
  }

  return {
    fontFamily: node.font_family ?? undefined,
    fontSize: node.font_size ?? undefined,
    fontWeight: node.font_weight ?? undefined,
    color: node.color ?? undefined,
    background: node.background ?? undefined,
    padding: node.padding ?? undefined,
    gap: node.gap ?? undefined,
    width: node.width ?? undefined,
    height: node.height ?? undefined,
    cornerRadius: node.corner_radius ?? undefined,
  };
}

function scoreDesign(element, spec) {
  const fontBits = [];
  const currentFonts = [];
  const expectedFonts = [];

  if (spec.fontFamily !== undefined) {
    const current = String(element.fontFamily || "");
    const expected = String(spec.fontFamily || "");

    fontBits.push(
      current.toLowerCase() === expected.toLowerCase() ? 1 : 0
    );

    currentFonts.push(current);
    expectedFonts.push(expected);
  }

  if (
    spec.fontSize !== undefined &&
    typeof element.fontSize === "number"
  ) {
    const difference = Math.abs(
      element.fontSize - spec.fontSize
    );

    fontBits.push(
      clamp01(
        1 -
          difference /
            Math.max(spec.fontSize * 0.5, 1)
      )
    );

    currentFonts.push(px(element.fontSize));
    expectedFonts.push(px(spec.fontSize));
  }

  const fonts = fontBits.length
    ? makePart(
        "fonts",
        "Fonts",
        30,
        average(fontBits),
        currentFonts.join(", "),
        expectedFonts.join(", "),
        average(fontBits) >= 1
          ? ""
          : `Change the font properties to ${expectedFonts.join(
              ", "
            )}.`
      )
    : makePart(
        "fonts",
        "Fonts",
        30,
        null,
        null,
        null,
        ""
      );

  const colorBits = [];
  const currentColors = [];
  const expectedColors = [];

  if (
    spec.color !== undefined &&
    typeof element.color === "string"
  ) {
    const distance = colorDistance(
      element.color,
      spec.color
    );

    if (distance !== null) {
      colorBits.push(
        clamp01(
          1 - Math.max(0, distance - 6) / 120
        )
      );

      currentColors.push(`text ${element.color}`);
      expectedColors.push(`text ${spec.color}`);
    }
  }

  if (
    spec.background !== undefined &&
    typeof element.background === "string"
  ) {
    const distance = colorDistance(
      element.background,
      spec.background
    );

    if (distance !== null) {
      colorBits.push(
        clamp01(
          1 - Math.max(0, distance - 6) / 120
        )
      );

      currentColors.push(
        `background ${element.background}`
      );

      expectedColors.push(
        `background ${spec.background}`
      );
    }
  }

  const colors = colorBits.length
    ? makePart(
        "color",
        "Color",
        25,
        average(colorBits),
        currentColors.join(", "),
        expectedColors.join(", "),
        average(colorBits) >= 1
          ? ""
          : `Use ${expectedColors.join(", ")}.`
      )
    : makePart(
        "color",
        "Color",
        25,
        null,
        null,
        null,
        ""
      );

  const spacingBits = [];
  const currentSpacing = [];
  const expectedSpacing = [];

  if (
    spec.padding !== undefined &&
    typeof element.padding === "number"
  ) {
    spacingBits.push(
      relativeScore(
        element.padding,
        spec.padding,
        4
      )
    );

    currentSpacing.push(
      `padding ${px(element.padding)}`
    );

    expectedSpacing.push(
      `padding ${px(spec.padding)}`
    );
  }

  if (
    spec.gap !== undefined &&
    typeof element.gap === "number"
  ) {
    spacingBits.push(
      relativeScore(element.gap, spec.gap, 4)
    );

    currentSpacing.push(`gap ${px(element.gap)}`);
    expectedSpacing.push(`gap ${px(spec.gap)}`);
  }

  const spacing = spacingBits.length
    ? makePart(
        "spacing",
        "Spacing",
        20,
        average(spacingBits),
        currentSpacing.join(", "),
        expectedSpacing.join(", "),
        average(spacingBits) >= 1
          ? ""
          : `Set ${expectedSpacing.join(", ")}.`
      )
    : makePart(
        "spacing",
        "Spacing",
        20,
        null,
        null,
        null,
        ""
      );

  const sizingBits = [];
  const currentSizing = [];
  const expectedSizing = [];

  if (
    spec.width !== undefined &&
    typeof element.width === "number"
  ) {
    sizingBits.push(
      relativeScore(element.width, spec.width, 1)
    );

    currentSizing.push(`width ${px(element.width)}`);
    expectedSizing.push(`width ${px(spec.width)}`);
  }

  if (
    spec.height !== undefined &&
    typeof element.height === "number"
  ) {
    sizingBits.push(
      relativeScore(
        element.height,
        spec.height,
        1
      )
    );

    currentSizing.push(
      `height ${px(element.height)}`
    );

    expectedSizing.push(
      `height ${px(spec.height)}`
    );
  }

  const sizing = sizingBits.length
    ? makePart(
        "sizing",
        "Sizing",
        25,
        average(sizingBits),
        currentSizing.join(", "),
        expectedSizing.join(", "),
        average(sizingBits) >= 1
          ? ""
          : `Resize to ${expectedSizing.join(", ")}.`
      )
    : makePart(
        "sizing",
        "Sizing",
        25,
        null,
        null,
        null,
        ""
      );

  return finish([
    fonts,
    colors,
    spacing,
    sizing,
  ]);
}

function matchScore(element, node) {
  if (!node || node.visible === false) {
    return -1;
  }

  let score = 0;

  const elementText = normalizeText(
    element.text || element.name
  );

  const nodeText = normalizeText(node.text);
  const nodeName = normalizeText(node.name);

  if (elementText && nodeText) {
    if (elementText === nodeText) {
      score += 100;
    } else if (
      elementText.includes(nodeText) ||
      nodeText.includes(elementText)
    ) {
      score += 60;
    }
  }

  if (
    elementText &&
    nodeName &&
    elementText === nodeName
  ) {
    score += 40;
  }

  if (
    typeof element.width === "number" &&
    typeof node.width === "number"
  ) {
    score +=
      relativeScore(element.width, node.width, 1) *
      20;
  }

  if (
    typeof element.height === "number" &&
    typeof node.height === "number"
  ) {
    score +=
      relativeScore(element.height, node.height, 1) *
      20;
  }

  if (
    typeof element.fontSize === "number" &&
    typeof node.font_size === "number"
  ) {
    score +=
      relativeScore(
        element.fontSize,
        node.font_size,
        1
      ) * 15;
  }

  if (
    element.fontFamily &&
    node.font_family &&
    element.fontFamily.toLowerCase() ===
      node.font_family.toLowerCase()
  ) {
    score += 10;
  }

  if (
    element.color &&
    node.color &&
    colorDistance(element.color, node.color) !== null
  ) {
    const distance = colorDistance(
      element.color,
      node.color
    );

    score +=
      clamp01(1 - distance / 180) * 10;
  }

  if (
    element.background &&
    node.background &&
    colorDistance(
      element.background,
      node.background
    ) !== null
  ) {
    const distance = colorDistance(
      element.background,
      node.background
    );

    score +=
      clamp01(1 - distance / 180) * 10;
  }

  return score;
}

function findBestFigmaNode(
  element,
  nodes,
  figmaNodeId = null
) {
  if (!Array.isArray(nodes) || nodes.length === 0) {
    return null;
  }

  if (figmaNodeId) {
    return (
      nodes.find(
        (node) => node.id === figmaNodeId
      ) || null
    );
  }

  let bestNode = null;
  let bestScore = -1;

  for (const node of nodes) {
    const score = matchScore(element, node);

    if (score > bestScore) {
      bestScore = score;
      bestNode = node;
    }
  }

  if (!bestNode) {
    return null;
  }

  return {
    ...bestNode,
    match_score: Math.round(bestScore * 100) / 100,
  };
}

function getMismatches(score) {
  return score.parts
    .filter(
      (part) =>
        part.fraction !== null &&
        part.fraction < 0.999
    )
    .map((part) => ({
      category: part.id,
      name: part.name,
      score: Math.round(part.fraction * 100),
      current: part.current,
      expected: part.expected,
      fix: part.fix,
    }));
}

function compareElement({
  element,
  nodes,
  figmaNodeId = null,
}) {
  if (!element || typeof element !== "object") {
    throw new Error("element is required");
  }

  if (!Array.isArray(nodes) || nodes.length === 0) {
    throw new Error(
      "The selected Figma frame has no cached nodes"
    );
  }

  const matchedNode = findBestFigmaNode(
    element,
    nodes,
    figmaNodeId
  );

  if (!matchedNode) {
    throw new Error(
      "No matching Figma node could be found"
    );
  }

  const designSpec = designSpecFromNode(
    matchedNode
  );

  const designScore = scoreDesign(
    element,
    designSpec
  );
  const fixes = buildStyleFixes(
    element,
    designSpec
    );

  return {
    matched_node: {
      id: matchedNode.id,
      name: matchedNode.name,
      type: matchedNode.type,
      text: matchedNode.text,
      match_score:
        matchedNode.match_score ?? null,
    },
    design_spec: designSpec,
    design_score: designScore.total,
    categories: designScore.parts,
    mismatches: getMismatches(designScore),
    ...fixes,
    };
}

module.exports = {
  designSpecFromNode,
  scoreDesign,
  findBestFigmaNode,
  compareElement,
};