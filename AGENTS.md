# AGENTS.md

## Co-Researcher System

<EXTREMELY_IMPORTANT>
You have Co-Researcher skills. RIGHT NOW run: `~/.codex/co-researcher/.codex/co-researcher-codex bootstrap` and follow the instructions it returns.
</EXTREMELY_IMPORTANT>

## Repository Overview

This repository is a research-documentation site. The README defines the site structure as a research topic with child artifacts: "overview", "slides", "research notes", "source links", "research tasks", and "derived artifacts".

The current content architecture is topic-centered:

- `contents/<topic-id>/overview/`: parent topic overview pages
- `contents/<topic-id>/slides/`: Marp slide decks and local slide assets
- `contents/<topic-id>/research/`: detailed research notes
- `contents/<topic-id>/sources/`: source link collections
- `contents/<topic-id>/tasks/`: research task checklists
- `src/styles/marp-themes/`: shared Marp custom theme CSS
- `.scaffdog/`: reusable templates that are not direct site pages
- `docs/`: workflow and style guidance for contributors and agents

The README states that rendered document pages also have raw Markdown counterparts by removing the trailing slash and appending `.md`. The site also emits `/llms.txt` for crawler discovery.

## MCP Internal Presentation

The active MCP deck lives at:

- Slide source: `contents/mcp-internal-presentation/slides/mcp-internal-presentation.md`
- Research notes: `contents/mcp-internal-presentation/research/mcp-slide-research.md`
- Source links: `contents/mcp-internal-presentation/sources/mcp-source-links.md`
- Task checklist: `contents/mcp-internal-presentation/tasks/research-tasks.md`
- Slide assets: `contents/mcp-internal-presentation/slides/diagrams/`, `contents/mcp-internal-presentation/slides/logos/`, `contents/mcp-internal-presentation/slides/screenshots/`, `contents/mcp-internal-presentation/slides/generated/`

The README says the Marp presentation HTML is generated at `/slides/mcp-internal-presentation/deck/` in the Pages site.

## Slide Style And Workflow

Before editing slides, read:

- `docs/slide-style-guide.md`
- `docs/slide-workflow.md`
- `docs/slide-examples/research-layouts.md`
- `src/styles/marp-themes/research.css`

The style guide's core rule is: "1スライド1メッセージに絞る". It also says to keep research density while prioritizing structure, and to finish only after rendered visual verification.

Use existing classes and patterns from the Marp theme CSS. Do not invent one-off inline colors, spacing systems, or decorative layouts. If a slide feels cramped, the style guide says to reduce gaps, convert long lists to grids, move source details to captions, or split the slide.

Research topic parent pages belong under `contents/<topic-id>/overview/`. Marp custom themes are implementation style assets and currently live under `src/styles/marp-themes/`.

## Slide Image Generation Workflow

Before generating or revising slide images, use `.agents/skills/slide-image-prompting/SKILL.md`.

Do not generate an image first and then fit the slide around it. The required order is:

1. Write the slide title, lead text, body text, caption, and source note first.
2. Decide whether the concept actually needs a visual.
3. Compare three layout/content-density patterns: diagram-heavy, balanced, and text-led.
4. Choose the slide layout and image frame.
5. Generate or draw the image to maximize that exact frame.
6. Keep slide headings, prose explanations, footers, and source notes outside the image.
7. Render the deck and inspect screenshots for centering, margins, duplicated text, and readability.

For concept diagrams and architecture visuals, the image should contain only the visual relationship: nodes, arrows, boundaries, short labels, and necessary icons. If a generated image contains a slide title, subtitle, paragraph explanation, source note, or visible white image-box margins, revise the asset or layout before treating the slide as done.

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
bash scripts/verify-slides.sh contents/mcp-internal-presentation/slides/mcp-internal-presentation.md
```

The slide workflow says screenshot verification is required because Markdown correctness does not guarantee visual correctness. Inspect `dist/screenshots/` after substantial slide edits.

## Agent Skills In This Repo

Use these local skills when applicable:

- `.agents/skills/slide-style-research-docs/SKILL.md`: style and structure guidance for Marp decks
- `.agents/skills/slide-layout-fix/SKILL.md`: render and screenshot verification workflow
- `.agents/skills/beginner-slide-reviewer/SKILL.md`: beginner-audience review for slide order, missing premises, abstract wording, and information overload
- `.agents/skills/slide-image-prompting/SKILL.md`: slide image workflow guidance: draft slide text first, compare three layout/content-density options, choose the image frame, then generate a frame-fit visual without duplicated headings or prose

For MCP presentation work, keep this framing explicit:

- Skill = how to proceed
- MCP = what to access or execute

## Editing Rules

- Keep public artifacts under `contents/`; do not reintroduce the old `src/content/docs/` layout.
- Update research notes when additional investigation or review rationale materially affects the deck.
- Keep slide source, research notes, and source links consistent.
- After substantial edits, run slide verification and at least one repository-level validation command.
