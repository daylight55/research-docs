# research-docs
調べ物まとめ

## Site structure

サイト構成は「調査テーマ」を親にして、その配下に slide / research / source links / research task などを置く。
既存の `contents/{themes,slides,research,sources,tasks}/**` Markdown ページは、FrontMatter の `kind` と `themeId` によってテーマ単位に束ねられる。

```text
research theme
├── overview
├── slides
├── research notes
├── source links
├── research tasks
└── derived artifacts
```

### Theme fields

- `title`: 調査テーマ名
- `description`: 何を明らかにするテーマか
- `kind`: 親テーマは `theme`
- `themeId`: 子成果物が親テーマへ紐づくためのID
- `status`: `draft` / `active` / `review` / `published`
- `owner`: 主担当
- `updatedAt`: 最終更新日
- `order`: テーマ内の表示順

成果物タイプが増えた場合も、トップレベルの一覧を増やすのではなくテーマ配下へ追加する。

### Crawl-friendly sources

- Every rendered document page has a raw Markdown counterpart: remove the trailing slash from the page URL and append `.md`.
  - Example: `/themes/mcp-internal-presentation/` -> `/themes/mcp-internal-presentation.md`
  - Example: `/slides/mcp-internal-presentation/` -> `/slides/mcp-internal-presentation.md`
- `llms.txt` is generated at the site root and lists each research theme, child artifact, rendered URL, and raw Markdown URL.
- Crawlers should prefer raw Markdown URLs for source text and use rendered HTML URLs for navigation context.

## Contents

配布・再利用する成果物は `contents/` に集約する。Astro のルーティング対象は `contents/` 直下に `themes` / `slides` / `research` / `sources` / `tasks` として置き、Marp の例など配信対象ではない再利用素材は `contents/templates/` に置く。

```text
contents
├── templates
│   └── slides
│       └── example.md
├── research
├── slides
├── sources
├── tasks
└── themes
    ├── mcp-internal-presentation.md
    ├── mcp-modern.css
    └── research.css
```

## Slide templates

Qiita 記事「AIエージェントと協働してmarpでスライドを作る2026」を参考に、調査結果を Marp スライドとして共有するための標準テンプレートを追加しています。

- `.scaffdog/research-topic.md`: 新しい調査テーマ一式を生成する scaffdog テンプレート
- `docs/slide-style-guide.md`: research-docs 向けの色、余白、文体、レイアウト原則
- `docs/slide-workflow.md`: スライド作成、検証、運用の流れ
- `contents/templates/slides/example.md`: すぐ再利用できる Marp レイアウトパターン集
- `contents/themes/research.css`: パネル、グリッド、統計表示などの共通テーマ
- `.agents/skills/slide-style-research-docs/SKILL.md`: スライド整形時に参照するエージェント用手順
- `.agents/skills/slide-layout-fix/SKILL.md`: レンダリング後の見た目検証手順
- `scripts/verify-slides.sh`: HTML 書き出しとスクリーンショット生成

```bash
npm run slide:html
npm run slide:pdf
npm run slide:verify
```

出力先は `dist/`、スクリーンショットは `dist/screenshots/` です。

新しい調査テーマ一式を作る場合は scaffdog で生成する。

```bash
npm run template:topic
```

このコマンドは `contents/themes/`、`contents/slides/`、`contents/research/`、`contents/sources/`、`contents/tasks/` に同じ `themeId` の Markdown を作る。

## MCP internal presentation

- Live site: https://daylight55.github.io/research-docs/ (`gh-pages` branch, root)
- Pull request previews: `https://daylight55.github.io/research-docs/pr-preview/pr-<PR_NUMBER>/`
- [Marp slide deck source](./contents/slides/mcp-internal-presentation.md)
- [Marp custom theme](./contents/themes/research.css)
- [Detailed research notes](./contents/research/mcp-slide-research.md)
- [Source links](./contents/sources/mcp-source-links.md)
- [Research task checklist](./contents/tasks/research-tasks.md)

Generate the site:

```bash
scripts/build-pages-site.sh site
```

The Astro site renders every Markdown file under `contents/{themes,slides,research,sources,tasks}/**` into a page using its file path. FrontMatter controls the displayed title, description, type, and navigation order. The Marp presentation HTML is also generated at `/slides/mcp-internal-presentation/deck/`.

The Pages build also copies each source Markdown file to the same public path with its `.md` extension and emits `/llms.txt` for crawl discovery.

The GitHub Pages workflow deploys `main` to the root site and publishes pull request previews under `pr-preview/pr-<PR_NUMBER>/`. GitHub Pages must be enabled for the repository with `gh-pages` as the source branch and `/` as the source path. If Pages is unavailable for the repository visibility/plan, the workflow still uploads the built site as an Actions artifact.
