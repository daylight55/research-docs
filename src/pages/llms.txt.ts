import type { APIRoute } from "astro";
import { deckHref, getDocSummaries, getTopicSummaries, kindLabel } from "../lib/docs";

function absoluteUrl(path: string, origin: URL): string {
  return new URL(path, origin).toString();
}

export const GET: APIRoute = async ({ site }) => {
  const origin = site ?? new URL("https://daylight55.github.io");
  const docs = await getDocSummaries();
  const topics = getTopicSummaries(docs);
  const lines: string[] = [
    "# research-docs",
    "",
    "> Source-backed research documents, slide decks, source links, and task checklists grouped by research topic.",
    "",
    `- Site index: ${absoluteUrl(import.meta.env.BASE_URL, origin)}`,
    `- Slide deck HTML: ${absoluteUrl(deckHref(), origin)}`,
    "",
    "## Research Topics",
    "",
  ];

  for (const topic of topics) {
    lines.push(`- [${topic.title}](${absoluteUrl(topic.href, origin)}): ${topic.entry.data.description ?? ""}`);
    lines.push(`  - Raw Markdown: ${absoluteUrl(topic.markdownHref, origin)}`);

    for (const child of topic.children) {
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
  lines.push("- The Markdown files preserve FrontMatter with `kind`, `topicId`, and `order` fields for machine-readable grouping.");
  lines.push("- Prefer the raw Markdown URLs for crawling source text and the HTML URLs for rendered navigation context.");

  return new Response(`${lines.join("\n")}\n`, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
    },
  });
};
