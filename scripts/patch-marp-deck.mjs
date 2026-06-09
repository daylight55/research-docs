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
    background: var(--deck-letterbox-bg, #ffffff) !important;
  }

  body[data-bespoke-view=""] svg.bespoke-marp-slide,
  body[data-bespoke-view="next"] svg.bespoke-marp-slide {
    background: var(--deck-letterbox-bg, #ffffff);
  }
}
</style>`;

const script = `<script id="${marker}-script">
(() => {
  const fallback = "#ffffff";
  const root = document.documentElement;

  const syncLetterboxBackground = () => {
    const section = document.querySelector("svg.bespoke-marp-slide.bespoke-marp-active foreignObject section");
    const style = section ? getComputedStyle(section) : null;
    root.style.setProperty("--deck-letterbox-bg", style?.background || style?.backgroundColor || fallback);
  };

  const scheduleSync = () => requestAnimationFrame(syncLetterboxBackground);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleSync, { once: true });
  } else {
    scheduleSync();
  }

  window.addEventListener("hashchange", scheduleSync);

  new MutationObserver(scheduleSync).observe(document.body, {
    attributes: true,
    attributeFilter: ["class", "data-bespoke-view"],
    subtree: true
  });
})();
</script>`;

if (!html.includes("</head>") || !html.includes("</body>")) {
  throw new Error(`Could not find </head> or </body> in ${resolvedPath}`);
}

html = html.replace("</head>", `${style}</head>`);
html = html.replace("</body>", `${script}</body>`);

await fs.writeFile(resolvedPath, html);
