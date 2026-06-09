# research-docs Slide Style Guide

## Design Philosophy

- 調査資料として読める密度を保ちつつ、1スライド1メッセージに絞る。
- 背景は白と淡いグレーを基本にし、強調はブルー、ティール、アンバーの3系統に限定する。
- 装飾より構造を優先し、見出し、パネル、統計、比較表を同じ形で繰り返す。
- コード上の完成ではなく、レンダリング後の視覚確認までを完了条件にする。

## Color Tokens

| Token | Color | Usage |
| --- | --- | --- |
| `--rd-ink` | `#172033` | Main text |
| `--rd-muted` | `#5f6b7a` | Captions and secondary text |
| `--rd-panel` | `#f6f8fb` | Default panel background |
| `--rd-panel-strong` | `#eef3f8` | Stronger contrast panel |
| `--rd-blue` | `#1b4565` | Section title and primary accent |
| `--rd-teal` | `#2f9c95` | Positive or action-oriented accent |
| `--rd-amber` | `#c98220` | Caution, trade-off, limitation |

Rules:

- One slide should use at most two accent colors.
- Use red/green only when they encode a literal status that the audience already expects.
- Prefer borders and labels over large saturated fills for research-heavy slides.

## Typography

| Class | Usage |
| --- | --- |
| `.eyebrow` | Section or context label |
| `.lead` | One-sentence framing under the title |
| `.text-xl` | Panel title or important concept |
| `.stat-value` | Large numeric value |
| `.caption` | Source, limitation, or reading note |

Rules:

- Titles should be short noun phrases or claims. Avoid colons in slide titles.
- Use full-width Japanese punctuation sparingly. Avoid exclamation marks and decorative emoji.
- Keep bullets to 3-5 items. If there are more, switch to a grid, matrix, or timeline.

## Layout Patterns

Use `docs/slide-examples/research-layouts.md` before inventing a new layout. The baseline patterns are:

1. Title slide
2. Section divider
3. Two-column comparison
4. Three-card synthesis
5. 2x2 research matrix
6. Step timeline
7. Statistical highlight
8. Evidence and limitation pair
9. Quote with source note
10. Closing summary

When a slide feels cramped:

- Reduce vertical gaps before reducing font size.
- Convert 5 or more vertical items into 2 columns.
- Move source details to `.caption`.
- Split the slide when the main claim and the evidence need separate attention.

## Visual Verification

Every new or heavily edited deck should be rendered and checked:

```sh
npm run slide:verify
```

Review the screenshots in `dist/screenshots/` for:

- text clipped at the bottom or right edge
- overlapping cards or captions
- panels with inconsistent heights in the same row
- excessive color variation within one slide
- unreadable code or source notes

## Source Practice

Research decks should cite enough context for later audit:

- Put the short source name in the slide body when it helps the audience.
- Put URLs, paper titles, or retrieval notes in `.caption`.
- Prefer authoritative primary sources over summary pages.
