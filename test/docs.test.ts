import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const contentRoot = join(process.cwd(), "contents");
const contentSections = ["overview", "research", "slides", "sources", "tasks", "themes"];
const topicIds = ["mcp-internal-presentation"];

function markdownFiles(dir = contentRoot): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return markdownFiles(path);
    return path.endsWith(".md") || path.endsWith(".mdx") ? [path] : [];
  });
}

function distributedMarkdownFiles(): string[] {
  return topicIds.flatMap((topicId) => markdownFiles(join(contentRoot, topicId)));
}

describe("documentation content", () => {
  it("keeps reusable slide assets under contents", () => {
    const root = process.cwd();

    expect(existsSync(join(root, "contents/templates/slides/example.md"))).toBe(true);
    expect(existsSync(join(root, "contents/marp-themes/research.css"))).toBe(true);
    expect(existsSync(join(root, "contents/marp-themes/mcp-modern.css"))).toBe(true);
    expect(existsSync(join(root, "contents/themes"))).toBe(false);
    expect(existsSync(join(root, "contents/mcp-internal-presentation/themes"))).toBe(false);
    expect(existsSync(join(root, "slides"))).toBe(false);
    expect(existsSync(join(root, "theme"))).toBe(false);
    expect(existsSync(join(root, "themes"))).toBe(false);
  });

  it("keeps distributed markdown grouped under topic directories", () => {
    const root = process.cwd();
    const files = distributedMarkdownFiles().map((file) => relative(contentRoot, file));

    expect(files).toEqual([
      "mcp-internal-presentation/overview/mcp-internal-presentation.md",
      "mcp-internal-presentation/research/mcp-late-slide-diagrams.md",
      "mcp-internal-presentation/research/mcp-slide-research.md",
      "mcp-internal-presentation/slides/mcp-internal-presentation.md",
      "mcp-internal-presentation/sources/mcp-source-links.md",
      "mcp-internal-presentation/tasks/research-tasks.md",
    ]);

    for (const section of contentSections) {
      const sectionPath = join(contentRoot, section);
      if (existsSync(sectionPath)) {
        expect(markdownFiles(sectionPath), `${section} should only contain shared non-markdown assets`).toEqual([]);
      }
    }

    expect(existsSync(join(root, "src/content"))).toBe(false);
    expect(existsSync(join(contentRoot, "docs"))).toBe(false);
  });

  it("requires frontmatter titles for automatic navigation", () => {
    for (const file of distributedMarkdownFiles()) {
      const text = readFileSync(file, "utf8");
      expect(text.startsWith("---\n"), `${file} should start with frontmatter`).toBe(true);
      expect(text).toMatch(/\ntitle: .+\n/);
      expect(text).toMatch(/\nkind: .+\n/);
      expect(text).toMatch(/\norder: \d+\n/);
    }
  });

  it("keeps crawl discovery and raw markdown routes wired", () => {
    const llmsEndpoint = join(process.cwd(), "src/pages/llms.txt.ts");
    const buildScript = readFileSync(join(process.cwd(), "scripts/build-pages-site.sh"), "utf8");
    const endpoint = readFileSync(llmsEndpoint, "utf8");

    expect(existsSync(llmsEndpoint)).toBe(true);
    expect(endpoint).toContain("Raw Markdown");
    expect(endpoint).toContain("Every rendered document page has a matching raw Markdown URL");
    expect(buildScript).toContain('cp "$file" "$out_dir/$rel"');
  });
});
