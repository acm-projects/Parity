function clamp01(value) {
  return Math.max(0, Math.min(1, value));
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

function linearize(value) {
  const channel = value / 255;

  return channel <= 0.03928
    ? channel / 12.92
    : Math.pow((channel + 0.055) / 1.055, 2.4);
}

function luminance(hex) {
  const rgb = hexToRgb(hex);

  if (!rgb) {
    return null;
  }

  return (
    0.2126 * linearize(rgb[0]) +
    0.7152 * linearize(rgb[1]) +
    0.0722 * linearize(rgb[2])
  );
}

function contrastRatio(first, second) {
  const a = luminance(first);
  const b = luminance(second);

  if (a === null || b === null) {
    return null;
  }

  return (
    (Math.max(a, b) + 0.05) /
    (Math.min(a, b) + 0.05)
  );
}

function makePart(
  id,
  name,
  weight,
  fraction,
  note,
  fix = ""
) {
  return {
    id,
    name,
    weight,
    fraction,
    note,
    fix,
  };
}

function finish(parts) {
  const live = parts.filter(
    (part) => part.fraction !== null
  );

  const totalWeight =
    live.reduce(
      (sum, part) => sum + part.weight,
      0
    ) || 1;

  const slices = live.map((part) => ({
    id: part.id,
    name: part.name,
    value: Math.round(
      ((part.fraction * part.weight) /
        totalWeight) *
        100
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

function scoreAccessibility(element) {
  let contrast;

  if (element.hasOwnText) {
    const ratio = contrastRatio(
      element.color,
      element.background
    );

    if (ratio === null) {
      contrast = makePart(
        "contrast",
        "Contrast",
        30,
        null,
        "Color data is unavailable."
      );
    } else {
      const large =
        element.fontSize >= 24 ||
        (element.fontSize >= 18.66 &&
          element.fontWeight >= 700);

      const required = large ? 3 : 4.5;
      const shown =
        Math.floor(ratio * 10) / 10;

      contrast = makePart(
        "contrast",
        "Contrast",
        30,
        clamp01(ratio / required),
        `${element.color} on ${element.background} is ${shown}:1 (needs ${required}:1)`,
        ratio >= required
          ? ""
          : "Use a darker text color or a lighter background."
      );
    }
  } else {
    contrast = makePart(
      "contrast",
      "Contrast",
      30,
      null,
      "No text directly in this element."
    );
  }

  let labels;

  if (element.isImage || element.interactive) {
    if (element.isImage && element.tag === "img") {
      const ok =
        element.hasAlt || Boolean(element.name);

      labels = makePart(
        "labels",
        "Labels",
        25,
        ok ? 1 : 0,
        ok
          ? element.name
            ? `alt text: "${String(
                element.name
              ).slice(0, 40)}"`
            : "Empty alt marks it as decorative."
          : "Image has no alt attribute.",
        ok
          ? ""
          : 'Add alt="..." describing the image, or alt="" if decorative.'
      );
    } else {
      const ok = Boolean(element.name);

      labels = makePart(
        "labels",
        "Labels",
        25,
        ok ? 1 : 0,
        ok
          ? `Accessible name: "${String(
              element.name
            ).slice(0, 40)}"`
          : "No accessible name.",
        ok
          ? ""
          : "Add visible text or an aria-label."
      );
    }
  } else {
    labels = makePart(
      "labels",
      "Labels",
      25,
      null,
      "Not a control or image."
    );
  }

  let semantics;

  if (element.interactive) {
    if (element.native) {
      semantics = makePart(
        "semantics",
        "Semantics",
        20,
        1,
        `Native <${element.tag}> is announced as ${
          element.role || "a control"
        }.`
      );
    } else if (element.explicitRole) {
      const keyboardAccessible =
        element.tabindex !== null &&
        element.tabindex >= 0;

      semantics = makePart(
        "semantics",
        "Semantics",
        20,
        keyboardAccessible ? 0.7 : 0.4,
        `role="${element.explicitRole}" on a <${element.tag}>${
          keyboardAccessible
            ? ""
            : " with no tabindex"
        }.`,
        "Use a native <button> or <a href> so keyboard and screen readers work automatically."
      );
    } else {
      semantics = makePart(
        "semantics",
        "Semantics",
        20,
        0,
        `Clickable <${element.tag}> is announced as plain text.`,
        `Use a <button> or <a href> instead of a <${element.tag}>.`
      );
    }
  } else {
    semantics = makePart(
      "semantics",
      "Semantics",
      20,
      null,
      "Not an interactive element."
    );
  }

  let interaction;

  if (element.interactive) {
    const width =
      typeof element.width === "number"
        ? element.width
        : 0;

    const height =
      typeof element.height === "number"
        ? element.height
        : 0;

    const smallest = Math.min(width, height);

    const fraction =
      smallest >= 44
        ? 1
        : smallest >= 24
          ? 0.6
          : 0.2;

    interaction = makePart(
      "interaction",
      "Interaction",
      15,
      fraction,
      `${width} × ${height} px target (44 × 44 recommended).`,
      fraction >= 1
        ? ""
        : "Make the clickable area at least 44 × 44 px."
    );
  } else {
    interaction = makePart(
      "interaction",
      "Interaction",
      15,
      null,
      "Not an interactive element."
    );
  }

  const problems = [];
  let other = 1;

  if (!element.langSet) {
    other -= 0.6;
    problems.push(
      "The page has no lang attribute."
    );
  }

  if (
    element.tabindex !== null &&
    element.tabindex > 0
  ) {
    other -= 0.2;
    problems.push(
      "Positive tabindex breaks the tab order."
    );
  }

  if (
    element.ariaHidden &&
    element.interactive
  ) {
    other -= 0.2;
    problems.push(
      "aria-hidden is set on an interactive element."
    );
  }

  const otherPart = makePart(
    "other",
    "Other",
    10,
    Math.max(0, other),
    problems.length
      ? problems.join(" ")
      : "Page language is set and no tab-order or hidden-focus problems were found.",
    problems.length
      ? "Fix the accessibility issues listed above."
      : ""
  );

  return finish([
    contrast,
    labels,
    semantics,
    interaction,
    otherPart,
  ]);
}

function getAccessibilityIssues(score) {
  return score.parts
    .filter(
      (part) =>
        part.fraction !== null &&
        part.fraction < 0.999
    )
    .map((part) => ({
      category: part.id,
      name: part.name,
      score: Math.round(
        part.fraction * 100
      ),
      note: part.note,
      fix: part.fix,
    }));
}

module.exports = {
  contrastRatio,
  scoreAccessibility,
  getAccessibilityIssues,
};