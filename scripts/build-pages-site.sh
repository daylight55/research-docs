#!/usr/bin/env bash
set -euo pipefail

out_dir="${1:-site}"
topic_dir="contents/mcp-internal-presentation"
slide_dir="$topic_dir/slides"
slide_src="$slide_dir/mcp-internal-presentation.md"
theme_css="contents/themes/research.css"

rm -rf "$out_dir"

npm run build

if [ "${OUT_DIR:-dist}" != "$out_dir" ]; then
  rm -rf "$out_dir"
  mv "${OUT_DIR:-dist}" "$out_dir"
fi

mkdir -p "$out_dir/slides/mcp-internal-presentation/deck"

npx marp \
  "$slide_src" \
  --theme "$theme_css" \
  --html \
  --output "$out_dir/slides/mcp-internal-presentation/deck/index.html"

node scripts/patch-marp-deck.mjs "$out_dir/slides/mcp-internal-presentation/deck/index.html"

copy_slide_diagrams() {
  local dest="$1"
  mkdir -p "$dest"
  while IFS= read -r file; do
    cp "$file" "$dest/$(basename "$file")"
  done < <(find "$slide_dir/diagrams" -maxdepth 1 -type f \( -name "*.svg" -o -name "*.mmd" \) | sort)
}

copy_slide_logos() {
  local dest="$1"
  mkdir -p "$dest"
  while IFS= read -r file; do
    cp "$file" "$dest/$(basename "$file")"
  done < <(find "$slide_dir/logos" -maxdepth 1 -type f -name "*.svg" | sort)
}

copy_slide_screenshots() {
  local dest="$1"
  mkdir -p "$dest"
  while IFS= read -r file; do
    cp "$file" "$dest/$(basename "$file")"
  done < <(find "$slide_dir/screenshots" -maxdepth 1 -type f \( -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" -o -name "*.webp" -o -name "*.gif" -o -name "*.svg" \) | sort)
}

copy_slide_generated() {
  local dest="$1"
  mkdir -p "$dest"
  while IFS= read -r file; do
    cp "$file" "$dest/$(basename "$file")"
  done < <(find "$slide_dir/generated" -maxdepth 1 -type f \( -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" -o -name "*.webp" -o -name "*.gif" -o -name "*.svg" \) | sort)
}

if [ -d "$slide_dir/diagrams" ]; then
  copy_slide_diagrams "$out_dir/slides/mcp-internal-presentation/diagrams"
  copy_slide_diagrams "$out_dir/slides/mcp-internal-presentation/deck/diagrams"
fi

if [ -d "$slide_dir/logos" ]; then
  copy_slide_logos "$out_dir/slides/mcp-internal-presentation/logos"
  copy_slide_logos "$out_dir/slides/mcp-internal-presentation/deck/logos"
fi

if [ -d "$slide_dir/screenshots" ]; then
  copy_slide_screenshots "$out_dir/slides/mcp-internal-presentation/screenshots"
  copy_slide_screenshots "$out_dir/slides/mcp-internal-presentation/deck/screenshots"
fi

if [ -d "$slide_dir/generated" ]; then
  copy_slide_generated "$out_dir/slides/mcp-internal-presentation/generated"
  copy_slide_generated "$out_dir/slides/mcp-internal-presentation/deck/generated"
fi

content_rel() {
  local rel="${1#contents/}"
  if [[ "$rel" == */themes/* || "$rel" == */slides/* || "$rel" == */research/* || "$rel" == */sources/* || "$rel" == */tasks/* ]]; then
    printf '%s\n' "${rel#*/}"
  else
    printf '%s\n' "$rel"
  fi
}

while IFS= read -r file; do
  rel="$(content_rel "$file")"
  mkdir -p "$out_dir/$(dirname "$rel")"
  cp "$file" "$out_dir/$rel"
done < <(find contents -path "contents/templates" -prune -o -type f \( -name "*.md" -o -name "*.mdx" \) -print | sort)

touch "$out_dir/.nojekyll"
