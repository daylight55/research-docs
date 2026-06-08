import type { APIRoute } from "astro";
import { deckHref, getDocSummaries, getThemeSummaries, kindLabel } from "../lib/docs";

function absoluteUrl(path: string, origin: URL): string {
  return new URL(path, origin).toString();
}

export const GET: APIRoute = async ({ site }) => {
  const origin = site ?? new URL("https://daylight55.github.io");
  const docs = await getDocSummaries();
  const themes = getThemeSummaries(docs);
  const lines: string[] = [
    "# research-docs",
    "",
    "> Source-backed research documents, slide decks, source links, and task checklists grouped by research theme.",
    "",
    `- Site index: ${absoluteUrl(import.meta.env.BASE_URL, origin)}`,
    `- Slide deck HTML: ${absoluteUrl(deckHref(), origin)}`,
    "",
    "## Research Themes",
    "",
  ];

  for (const theme of themes) {
    lines.push(`- [${theme.title}](${absoluteUrl(theme.href, origin)}): ${theme.entry.data.description ?? ""}`);
    lines.push(`  - Raw Markdown: ${absoluteUrl(theme.markdownHref, origin)}`);

    for (const child of theme.children) {
      lines.push(
        `  - [${kindLabel(child.entry.data.kind)}: ${child.title}](${absoluteUrl(child.href, origin)}): ${
          child.entry.data.description ?? ""
        }`,
      );
      lines.push(`    - Raw Markdown: ${absoluteUrl(child.markdownHref, origin)}`);
    }

    lines.push("");
  }

  lines.push("## Crawling Notes");
  lines.push("");
  lines.push("- Every rendered document page has a matching raw Markdown URL by appending `.md` to the page URL without its trailing slash.");
  lines.push("- The Markdown files preserve FrontMatter with `kind`, `themeId`, and `order` fields for machine-readable grouping.");
  lines.push("- Prefer the raw Markdown URLs for crawling source text and the HTML URLs for rendered navigation context.");

  return new Response(`${lines.join("\n")}\n`, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
    },
  });
};
