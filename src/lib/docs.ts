import { getCollection, type CollectionEntry } from "astro:content";

export type DocEntry = CollectionEntry<"docs">;

export type DocSummary = {
  entry: DocEntry;
  href: string;
  markdownHref: string;
  section: string;
  sectionLabel: string;
  slug: string;
  topicId?: string;
  title: string;
};

export type TopicSummary = DocSummary & {
  children: DocSummary[];
};

const sectionLabels: Record<string, string> = {
  topics: "Research Topics",
  slides: "Slides",
  research: "Research",
  sources: "Sources",
  tasks: "Tasks",
};

const kindLabels: Record<string, string> = {
  topic: "Research topic",
  slides: "Slide",
  research: "Research note",
  sources: "Source links",
  task: "Research task",
  article: "Article",
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

export function kindLabel(kind: string): string {
  return kindLabels[kind] ?? kind;
}

export function hrefForSlug(slug: string, base = import.meta.env.BASE_URL): string {
  return `${base}${slug}/`.replace(/\/{2,}/g, "/");
}

export function markdownHrefForSlug(slug: string, base = import.meta.env.BASE_URL): string {
  return `${base}${slug}.md`.replace(/\/{2,}/g, "/");
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
        markdownHref: markdownHrefForSlug(slug),
        section,
        sectionLabel: sectionLabels[section] ?? section,
        slug,
        topicId: entry.data.topicId,
        title: titleFromEntry(entry),
      };
    })
    .sort((a, b) => {
      const orderDiff = (a.entry.data.order ?? 100) - (b.entry.data.order ?? 100);
      if (orderDiff !== 0) return orderDiff;
      return a.title.localeCompare(b.title, "ja");
    });
}

export function getTopicSummaries(docs: DocSummary[]): TopicSummary[] {
  const topics = docs.filter((doc) => doc.entry.data.kind === "topic");

  return topics.map((topic) => ({
    ...topic,
    children: docs.filter((doc) => doc.topicId === topic.entry.data.topicId && doc.slug !== topic.slug),
  }));
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
