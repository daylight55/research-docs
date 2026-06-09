import fs from "node:fs/promises";
import path from "node:path";

const [, , htmlPath] = process.argv;

if (!htmlPath) {
  console.error("Usage: node scripts/patch-marp-deck.mjs <html>");
  process.exit(1);
}

const resolvedPath = path.resolve(htmlPath);
let html = await fs.readFile(resolvedPath, "utf8");

const marker = "research-docs-marp-letterbox";

if (html.includes(marker)) {
  process.exit(0);
}

const style = `<style id="${marker}-style">
@media screen {
  html,
  body,
  body[data-bespoke-view=""] .bespoke-marp-parent,
  body[data-bespoke-view="next"] .bespoke-marp-parent {
    background: #000000 !important;
  }

  body[data-bespoke-view=""] svg.bespoke-marp-slide,
  body[data-bespoke-view="next"] svg.bespoke-marp-slide {
    background: #000000;
  }
}
</style>`;

if (!html.includes("</head>")) {
  throw new Error(`Could not find </head> in ${resolvedPath}`);
}

html = html.replace("</head>", `${style}</head>`);

await fs.writeFile(resolvedPath, html);
