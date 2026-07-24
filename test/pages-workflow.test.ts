import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const workflow = readFileSync(
  join(process.cwd(), ".github/workflows/pages.yml"),
  "utf8",
);

describe("GitHub Pages workflow", () => {
  it("uses Node.js 24-compatible first-party actions", () => {
    expect(workflow).toContain("uses: actions/checkout@v7");
    expect(workflow).toContain("uses: actions/setup-node@v7");
    expect(workflow).toContain("uses: actions/github-script@v9");
    expect(workflow).not.toMatch(/uses:\s+actions\/(?:checkout|setup-node)@v4/);
  });

  it("does not retain a redundant copy of the built site", () => {
    expect(workflow).not.toContain("actions/upload-artifact");
    expect(workflow).not.toContain("mcp-presentation-site");
  });

  it("keeps the deployment lock until GitHub Pages finishes publishing", () => {
    expect(workflow).toContain("group: pages-deploy");
    expect(workflow).toContain("Wait for main site deployment");
    expect(workflow).toContain(
      '"GET /repos/{owner}/{repo}/pages/builds"',
    );
    expect(workflow).toContain("wait-for-pages-deployment: true");
  });
});
