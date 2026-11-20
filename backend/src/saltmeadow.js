// Offline page list for the Saltmeadow demo file.
// Figma's free plan allows only a handful of API calls a month. When Figma refuses,
// a Saltmeadow link still connects with these pages, so the demo never stalls.
// Parity's Saltmeadow fixes are built into the extension, so no Figma layer data is needed.

const PAGES = [
  ["index", "Index"],
  ["shop", "Shop"],
  ["product", "Product"],
  ["cart", "Cart"],
  ["about", "About"],
  ["journal", "Journal"],
  ["article", "Article"],
  ["faq", "FAQ"],
  ["contact", "Contact"],
  ["signin", "Sign in"],
];

const PREFIX = "saltmeadow:";

const isSaltmeadowFile = (parsed) => /saltmeadow/i.test(parsed?.fileName || "");
const isSaltmeadowFrame = (id) => typeof id === "string" && id.startsWith(PREFIX);

function saltmeadowFile(parsed) {
  return {
    name: parsed?.fileName || "Saltmeadow",
    version: "offline",
    lastModified: null,
    frames: PAGES.map(([id, name]) => ({
      id: PREFIX + id,
      name,
      type: "FRAME",
      page_id: "saltmeadow",
      page_name: "Saltmeadow",
      width: 1440,
      height: 1024,
    })),
  };
}

const saltmeadowFrame = (frame) => ({ id: frame.id, name: frame.name, offline: true, nodes: [] });

module.exports = { isSaltmeadowFile, isSaltmeadowFrame, saltmeadowFile, saltmeadowFrame };
