# AGENTS.md

## Co-Researcher System

<EXTREMELY_IMPORTANT>
You have Co-Researcher skills. RIGHT NOW run: `~/.codex/co-researcher/.codex/co-researcher-codex bootstrap` and follow the instructions it returns.
</EXTREMELY_IMPORTANT>

## Repository Overview

This repository is a research-documentation site. The README defines the site structure as a research theme with child artifacts: "overview", "slides", "research notes", "source links", "research tasks", and "derived artifacts".

The current content architecture is theme-centered:

- `contents/themes/`: parent theme pages and theme-level CSS
- `contents/slides/`: Marp slide decks and local slide assets
- `contents/research/`: detailed research notes
- `contents/sources/`: source link collections
- `contents/tasks/`: research task checklists
- `contents/templates/`: reusable templates that are not direct site pages
- `docs/`: workflow and style guidance for contributors and agents

The README states that rendered document pages also have raw Markdown counterparts by removing the trailing slash and appending `.md`. The site also emits `/llms.txt` for crawler discovery.

## MCP Internal Presentation

The active MCP deck lives at:

- Slide source: `contents/slides/mcp-internal-presentation.md`
- Research notes: `contents/research/mcp-slide-research.md`
- Source links: `contents/sources/mcp-source-links.md`
- Task checklist: `contents/tasks/research-tasks.md`
- Slide assets: `contents/slides/diagrams/`, `contents/slides/logos/`, `contents/slides/screenshots/`

The README says the Marp presentation HTML is generated at `/slides/mcp-internal-presentation/deck/` in the Pages site.

## Slide Style And Workflow

Before editing slides, read:

- `docs/slide-style-guide.md`
- `docs/slide-workflow.md`
- `contents/templates/slides/example.md`
- `contents/themes/research.css`

The style guide's core rule is: "1スライド1メッセージに絞る". It also says to keep research density while prioritizing structure, and to finish only after rendered visual verification.

Use existing classes and patterns from the theme. Do not invent one-off inline colors, spacing systems, or decorative layouts. If a slide feels cramped, the style guide says to reduce gaps, convert long lists to grids, move source details to captions, or split the slide.

## Commands

Use these commands from the repository root:

```sh
npm test
npm run build
npm run build:site
npm run slide:mcp:html
npm run slide:mcp:verify
```

For a specific deck:

```sh
bash scripts/verify-slides.sh contents/slides/mcp-internal-presentation.md
```

The slide workflow says screenshot verification is required because Markdown correctness does not guarantee visual correctness. Inspect `dist/screenshots/` after substantial slide edits.

## Agent Skills In This Repo

Use these local skills when applicable:

- `.agents/skills/slide-style-research-docs/SKILL.md`: style and structure guidance for Marp decks
- `.agents/skills/slide-layout-fix/SKILL.md`: render and screenshot verification workflow
- `.agents/skills/beginner-slide-reviewer/SKILL.md`: beginner-audience review for slide order, missing premises, abstract wording, and information overload
- `.agents/skills/slide-image-prompting/SKILL.md`: slide-native image prompt guidance, including how to avoid generic AI-looking visuals and how to place exact text inside final image assets

For MCP presentation work, keep this framing explicit:

- Skill = how to proceed
- MCP = what to access or execute

## Editing Rules

- Keep public artifacts under `contents/`; do not reintroduce the old `src/content/docs/` layout.
- Update research notes when additional investigation or review rationale materially affects the deck.
- Keep slide source, research notes, and source links consistent.
- After substantial edits, run slide verification and at least one repository-level validation command.
