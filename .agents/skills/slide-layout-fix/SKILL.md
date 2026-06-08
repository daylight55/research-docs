---
name: slide-layout-fix
description: Marp スライドをレンダリングし、スクリーンショットでレイアウト崩れを確認して修正する。
---

# slide-layout-fix

Use this skill after creating or substantially editing a Marp deck.

## Commands

```sh
npm run slide:verify
```

For a specific deck:

```sh
bash scripts/verify-slides.sh contents/templates/slides/example.md
```

## Inspection Points

- Text is not clipped at the bottom or right edge.
- Panels in the same row have visually compatible heights.
- Captions remain readable and do not overlap pagination.
- Long code, URLs, or Japanese phrases wrap within their container.
- Each slide uses at most two accent colors.

## Common Fixes

- Reduce `.stack` gap, panel padding, or heading length before shrinking all text.
- Convert 5 or more vertical items into `.grid.two`.
- Split a dense slide into a claim slide and an evidence slide.
- Move source URLs and caveats into `.caption`.
- Replace one-off inline styles with classes from `contents/themes/research.css`.
