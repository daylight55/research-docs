---
name: slide-style-research-docs
description: research-docs の Marp スライドをスタイルガイドとレイアウトパターンに沿って整える。
---

# slide-style-research-docs

Use this skill whenever creating or restyling Marp slides in this repository.

## Required References

Read these files before editing slides:

1. `docs/slide-style-guide.md`
2. `slides/example.md`
3. `theme/research.css`

## Workflow

1. Identify the slide's single main claim.
2. Choose the closest pattern from `slides/example.md`.
3. Reuse the existing classes in `theme/research.css`; do not invent inline colors or one-off spacing.
4. Keep accent colors to one or two per slide.
5. Move long source details into `.caption`.
6. Run `npm run slide:verify` after substantial edits.

## Style Rules

- Avoid colons in slide titles.
- Avoid exclamation marks, decorative emoji, and excessive saturated colors.
- Use panels for repeated items, not for entire page sections.
- If a vertical list has 5 or more items, use a two-column grid or split the slide.
- Prefer evidence/limitation pairs for research claims that may be contested.
