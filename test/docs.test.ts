import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const contentRoot = join(process.cwd(), "src/content/docs");

function markdownFiles(dir = contentRoot): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return markdownFiles(path);
    return path.endsWith(".md") || path.endsWith(".mdx") ? [path] : [];
  });
}

describe("documentation content", () => {
  it("keeps all distributed markdown under src/content/docs", () => {
    const files = markdownFiles().map((file) => relative(contentRoot, file));

    expect(files).toEqual([
      "research/mcp-slide-research.md",
      "slides/mcp-internal-presentation.md",
      "sources/mcp-source-links.md",
      "tasks/research-tasks.md",
    ]);
  });

  it("requires frontmatter titles for automatic navigation", () => {
    for (const file of markdownFiles()) {
      const text = readFileSync(file, "utf8");
      expect(text.startsWith("---\n"), `${file} should start with frontmatter`).toBe(true);
      expect(text).toMatch(/\ntitle: .+\n/);
      expect(text).toMatch(/\nkind: .+\n/);
      expect(text).toMatch(/\norder: \d+\n/);
    }
  });
});
