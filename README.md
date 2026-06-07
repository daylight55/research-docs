# research-docs
調べ物まとめ

## MCP internal presentation

- [Marp slide deck](./mcp-internal-presentation.marp.md)
- [Marp custom theme](./themes/mcp-modern.css)
- [Detailed research notes](./mcp-slide-research.md)
- [Research task checklist](./research-tasks.md)

Generate the deck:

```bash
npx -y @marp-team/marp-cli@latest mcp-internal-presentation.marp.md \
  --theme themes/mcp-modern.css \
  --html \
  -o /tmp/mcp-internal-presentation.html
```
