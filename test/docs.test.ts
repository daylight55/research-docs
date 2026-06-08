import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const contentRoot = join(process.cwd(), "contents");
const contentSections = ["research", "slides", "sources", "tasks", "themes"];

function markdownFiles(dir = contentRoot): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return markdownFiles(path);
    return path.endsWith(".md") || path.endsWith(".mdx") ? [path] : [];
  });
}

function distributedMarkdownFiles(): string[] {
  return contentSections.flatMap((section) => markdownFiles(join(contentRoot, section)));
}

describe("documentation content", () => {
  it("keeps reusable slide assets under contents", () => {
    const root = process.cwd();

    expect(existsSync(join(root, "contents/templates/slides/example.md"))).toBe(true);
    expect(existsSync(join(root, "contents/themes/research.css"))).toBe(true);
    expect(existsSync(join(root, "contents/themes/mcp-modern.css"))).toBe(true);
    expect(existsSync(join(root, "slides"))).toBe(false);
    expect(existsSync(join(root, "theme"))).toBe(false);
    expect(existsSync(join(root, "themes"))).toBe(false);
  });

  it("keeps all distributed markdown under top-level contents sections", () => {
    const root = process.cwd();
    const files = distributedMarkdownFiles().map((file) => relative(contentRoot, file));

    expect(files).toEqual([
      "research/mcp-slide-research.md",
      "slides/mcp-internal-presentation.md",
      "sources/mcp-source-links.md",
      "tasks/research-tasks.md",
      "themes/mcp-internal-presentation.md",
    ]);

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
