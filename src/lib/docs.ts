import { getCollection, type CollectionEntry } from "astro:content";

export type DocEntry = CollectionEntry<"docs">;

export type DocSummary = {
  entry: DocEntry;
  href: string;
  section: string;
  sectionLabel: string;
  slug: string;
  title: string;
};

const sectionLabels: Record<string, string> = {
  slides: "Slides",
  research: "Research",
  sources: "Sources",
  tasks: "Tasks",
};

export function routeSlug(id: string): string {
  return id.replace(/\.marp$/, "");
}

export function sectionFromId(id: string): string {
  return routeSlug(id).split("/")[0] ?? "docs";
}

export function titleFromEntry(entry: DocEntry): string {
  return entry.data.navTitle ?? entry.data.title;
}

export function hrefForSlug(slug: string, base = import.meta.env.BASE_URL): string {
  return `${base}${slug}/`.replace(/\/{2,}/g, "/");
}

export function deckHref(base = import.meta.env.BASE_URL): string {
  return `${base}slides/mcp-internal-presentation/deck/`.replace(/\/{2,}/g, "/");
}

export async function getDocSummaries(): Promise<DocSummary[]> {
  const entries = await getCollection("docs");

  return entries
    .map((entry) => {
      const slug = routeSlug(entry.id);
      const section = sectionFromId(entry.id);

      return {
        entry,
        href: hrefForSlug(slug),
        section,
        sectionLabel: sectionLabels[section] ?? section,
        slug,
        title: titleFromEntry(entry),
      };
    })
    .sort((a, b) => {
      const orderDiff = (a.entry.data.order ?? 100) - (b.entry.data.order ?? 100);
      if (orderDiff !== 0) return orderDiff;
      return a.title.localeCompare(b.title, "ja");
    });
}

export function groupDocsBySection(docs: DocSummary[]): Map<string, DocSummary[]> {
  const groups = new Map<string, DocSummary[]>();

  for (const doc of docs) {
    const key = doc.sectionLabel;
    const current = groups.get(key) ?? [];
    current.push(doc);
    groups.set(key, current);
  }

  return groups;
}
