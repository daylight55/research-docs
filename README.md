# research-docs
調べ物まとめ

## MCP internal presentation

- Live site: https://daylight55.github.io/research-docs/ (`gh-pages` branch, root)
- Pull request previews: `https://daylight55.github.io/research-docs/pr-preview/pr-<PR_NUMBER>/`
- [Marp slide deck source](./src/content/docs/slides/mcp-internal-presentation.md)
- [Marp custom theme](./themes/mcp-modern.css)
- [Detailed research notes](./src/content/docs/research/mcp-slide-research.md)
- [Source links](./src/content/docs/sources/mcp-source-links.md)
- [Research task checklist](./src/content/docs/tasks/research-tasks.md)

Generate the site:

```bash
scripts/build-pages-site.sh site
```

The Astro site renders every Markdown file under `src/content/docs/**` into a page using its file path. FrontMatter controls the displayed title, description, type, and navigation order. The Marp presentation HTML is also generated at `/slides/mcp-internal-presentation/deck/`.

The GitHub Pages workflow deploys `main` to the root site and publishes pull request previews under `pr-preview/pr-<PR_NUMBER>/`. GitHub Pages must be enabled for the repository with `gh-pages` as the source branch and `/` as the source path. If Pages is unavailable for the repository visibility/plan, the workflow still uploads the built site as an Actions artifact.
