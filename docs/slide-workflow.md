# Slide Workflow

This workflow adapts the Marp practices from the Qiita reference article for this repository.

## What We Adopt

- A style guide that turns visual taste into explicit rules.
- A reusable pattern deck so agents do not invent a new layout for every slide.
- A repo-local Marp theme with stable design tokens.
- A render-and-screenshot verification step because Markdown correctness does not guarantee visual correctness.
- Agent-facing skill files that point to the guide, examples, and verification commands.

## What We Do Not Adopt Yet

- Tailwind runtime loading inside Marp exports. The theme provides the small subset of utility-like classes this repo needs, avoiding a JavaScript dependency during PDF export.
- A full 40-pattern library. Start with 10 high-signal patterns and add more only when repeated decks prove the need.
- AI image generation wiring. Add it later when decks need a repeatable asset pipeline.
- Semantic search over historical slides. Add it after the repository has enough decks to search.

## New Deck Checklist

1. Run `npm run template:topic` when the deck belongs to a new research theme.
2. Copy a nearby pattern from `contents/templates/slides/example.md`.
3. Keep the slide title to one claim.
4. Use panels, grids, and captions from `contents/themes/research.css`.
5. Add source notes as `.caption`.
6. Run `npm run slide:verify`.
7. Inspect `dist/screenshots/` before considering the deck done.

## Layout Fix Checklist

- Bottom clipping: reduce `.stack` gap, panel padding, or split the slide.
- Long URL/code overflow: use `.caption`, shorter link text, or a separate appendix slide.
- Too many bullets: convert to `.grid.two`, `.grid.three`, or `.matrix`.
- Weak hierarchy: add `.eyebrow`, `.lead`, or one `.stat-value`; do not add more accent colors.
