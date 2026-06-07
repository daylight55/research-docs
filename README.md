# research-docs
調べ物まとめ

## MCP internal presentation

- Live site: https://daylight55.github.io/research-docs/ (`gh-pages` branch, root)
- Pull request previews: `https://daylight55.github.io/research-docs/pr-preview/pr-<PR_NUMBER>/`
- [Marp slide deck](./mcp-internal-presentation.marp.md)
- [Marp custom theme](./themes/mcp-modern.css)
- [Detailed research notes](./mcp-slide-research.md)
- [Research task checklist](./research-tasks.md)

Generate the deck:

```bash
scripts/build-pages-site.sh site
```

The GitHub Pages workflow deploys `main` to the root site and publishes pull request previews under `pr-preview/pr-<PR_NUMBER>/`. GitHub Pages must be enabled for the repository with `gh-pages` as the source branch and `/` as the source path. If Pages is unavailable for the repository visibility/plan, the workflow still uploads the built site as an Actions artifact.
