import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
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
      "themes/mcp-internal-presentation.md",
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
