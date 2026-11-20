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

function sameText(first, second) {
  return (
    String(first || "").trim().toLowerCase() ===
    String(second || "").trim().toLowerCase()
  );
}

function sameNumber(first, second) {
  return (
    typeof first === "number" &&
    typeof second === "number" &&
    Math.abs(first - second) < 0.01
  );
}

function sameColor(first, second) {
  const distance = colorDistance(first, second);

  if (distance === null) {
    return sameText(first, second);
  }

  return distance <= 6;
}

function arbitraryValue(value) {
  return String(value).trim().replace(/\s+/g, "_");
}

function cssRule(selector, declarations) {
  const entries = Object.entries(declarations);

  if (entries.length === 0) {
    return "";
  }

  const body = entries
    .map(([property, value]) => `  ${property}: ${value};`)
    .join("\n");

  return `${selector} {\n${body}\n}`;
}

function buildStyleFixes(element, spec) {
  const fixes = [];
  const cssFixes = {};
  const targetCss = {};
  const tailwindClasses = [];

  function add({
    property,
    cssProperty,
    current,
    expected,
    formatter = String,
    equal,
    tailwind,
  }) {
    if (expected === undefined || expected === null) {
      return;
    }

    const expectedValue = formatter(expected);

    targetCss[cssProperty] = expectedValue;

    if (tailwind) {
      tailwindClasses.push(tailwind(expected));
    }

    if (
      current === undefined ||
      current === null ||
      current === ""
    ) {
      return;
    }

    if (equal(current, expected)) {
      return;
    }

    const currentValue = formatter(current);

    fixes.push({
      property,
      current: currentValue,
      expected: expectedValue,
    });

    cssFixes[cssProperty] = expectedValue;
  }

  add({
    property: "fontFamily",
    cssProperty: "font-family",
    current: element.fontFamily,
    expected: spec.fontFamily,
    formatter: String,
    equal: sameText,
    tailwind: (value) =>
      `font-[${arbitraryValue(value)}]`,
  });

  add({
    property: "fontSize",
    cssProperty: "font-size",
    current: element.fontSize,
    expected: spec.fontSize,
    formatter: px,
    equal: sameNumber,
    tailwind: (value) => `text-[${px(value)}]`,
  });

  add({
    property: "fontWeight",
    cssProperty: "font-weight",
    current: element.fontWeight,
    expected: spec.fontWeight,
    formatter: String,
    equal: sameNumber,
    tailwind: (value) => `font-[${value}]`,
  });

  add({
    property: "color",
    cssProperty: "color",
    current: element.color,
    expected: spec.color,
    formatter: String,
    equal: sameColor,
    tailwind: (value) => `text-[${value}]`,
  });

  add({
    property: "background",
    cssProperty: "background-color",
    current: element.background,
    expected: spec.background,
    formatter: String,
    equal: sameColor,
    tailwind: (value) => `bg-[${value}]`,
  });

  add({
    property: "padding",
    cssProperty: "padding",
    current: element.padding,
    expected: spec.padding,
    formatter: px,
    equal: sameNumber,
    tailwind: (value) => `p-[${px(value)}]`,
  });

  add({
    property: "gap",
    cssProperty: "gap",
    current: element.gap,
    expected: spec.gap,
    formatter: px,
    equal: sameNumber,
    tailwind: (value) => `gap-[${px(value)}]`,
  });

  add({
    property: "width",
    cssProperty: "width",
    current: element.width,
    expected: spec.width,
    formatter: px,
    equal: sameNumber,
    tailwind: (value) => `w-[${px(value)}]`,
  });

  add({
    property: "height",
    cssProperty: "height",
    current: element.height,
    expected: spec.height,
    formatter: px,
    equal: sameNumber,
    tailwind: (value) => `h-[${px(value)}]`,
  });

  add({
    property: "borderRadius",
    cssProperty: "border-radius",
    current:
      element.borderRadius ??
      element.cornerRadius,
    expected: spec.cornerRadius,
    formatter: px,
    equal: sameNumber,
    tailwind: (value) =>
      `rounded-[${px(value)}]`,
  });

  const selector =
    element.selector || ".selected-element";

  return {
    suggested_fixes: fixes,
    css_fixes: cssFixes,
    css_fix_rule: cssRule(selector, cssFixes),
    target_css: targetCss,
    target_css_rule: cssRule(selector, targetCss),
    tailwind_classes: tailwindClasses,
  };
}

module.exports = {
  buildStyleFixes,
};