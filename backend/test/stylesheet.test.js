const test = require("node:test");
const assert = require("node:assert");
const { patchStylesheet, validateFix } = require("../src/changes/fixes");
const { isSaltmeadowFile, isSaltmeadowFrame, saltmeadowFile } = require("../src/saltmeadow");

const CSS = `h1 { font-size: 52px; }
.hero h1 { font-size: 64px; line-height: 1.05; }

/* ---------- page tweaks ---------- */
.hero h1 { font-size: 44px; }
.ha-arch { color: #D62828 !important; }
.hero h1 { color: #D62828; }
`;

test("a staged fix deletes exactly its drifted line", () => {
  const r = patchStylesheet(CSS, [{ selector: ".hero h1", property: "font-size", value: "64px" }]);
  assert.deepStrictEqual(r.removed, [".hero h1 { font-size: 44px; }"]);
  assert.ok(r.content.includes(".hero h1 { font-size: 64px; line-height: 1.05; }"), "base rule untouched");
  assert.ok(r.content.includes(".hero h1 { color: #D62828; }"), "other drift untouched");
  assert.strictEqual(r.added.length, 0);
});

test("!important drift lines are removed too", () => {
  const r = patchStylesheet(CSS, [{ selector: ".ha-arch", property: "color", value: "#C7D7E5" }]);
  assert.strictEqual(r.removed.length, 1);
  assert.ok(!r.content.includes("#D62828 !important"));
});

test("the last matching line wins, so a correct base rule is never deleted", () => {
  const css = ".signin-card h1 { font-size: 34px; }\n/* tweaks */\n.signin-card h1 { font-size: 24px; }\n";
  const r = patchStylesheet(css, [{ selector: ".signin-card h1", property: "font-size", value: "34px" }]);
  assert.strictEqual(r.content, ".signin-card h1 { font-size: 34px; }\n/* tweaks */\n");
});

test("a fix with no matching line is appended as an override", () => {
  const r = patchStylesheet(CSS, [{ selector: ".newsletter p", property: "color", value: "#4A5A55" }]);
  assert.deepStrictEqual(r.added, [".newsletter p { color: #4A5A55 !important; }"]);
  assert.ok(r.content.endsWith("/* Parity fixes */\n.newsletter p { color: #4A5A55 !important; }\n"));
});

test("new properties and values used by the Saltmeadow fixes validate", () => {
  for (const f of [
    { selector: ".article-body", property: "line-height", value: "1.7" },
    { selector: ".faq-icon", property: "border-radius", value: "50%" },
    { selector: ".pull-quote", property: "border-left-color", value: "#A7B69A" },
    { selector: ".nav a[aria-current]", property: "border-bottom-width", value: "2px" },
    { selector: ".hero h1", property: "font-family", value: "'Fraunces', Georgia, serif" },
  ]) assert.doesNotThrow(() => validateFix(f), f.property);
});

test("Saltmeadow links get offline frames when Figma refuses", () => {
  assert.ok(isSaltmeadowFile({ fileName: "Saltmeadow" }));
  assert.ok(!isSaltmeadowFile({ fileName: "Homepage redesign" }));
  const file = saltmeadowFile({ fileName: "Saltmeadow" });
  assert.strictEqual(file.frames.length, 10);
  assert.strictEqual(file.frames[0].name, "Index");
  assert.ok(isSaltmeadowFrame(file.frames[0].id));
});
