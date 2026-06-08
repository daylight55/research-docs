#!/usr/bin/env bash
set -euo pipefail

out_dir="${1:-site}"

rm -rf "$out_dir"

npm run build

if [ "${OUT_DIR:-dist}" != "$out_dir" ]; then
  rm -rf "$out_dir"
  mv "${OUT_DIR:-dist}" "$out_dir"
fi

mkdir -p "$out_dir/slides/mcp-internal-presentation/deck"

npx marp \
  contents/slides/mcp-internal-presentation.md \
  --theme contents/themes/research.css \
  --html \
  --output "$out_dir/slides/mcp-internal-presentation/deck/index.html"

copy_slide_diagrams() {
  local dest="$1"
  mkdir -p "$dest"
  while IFS= read -r file; do
    cp "$file" "$dest/$(basename "$file")"
  done < <(find contents/slides/diagrams -maxdepth 1 -type f \( -name "*.svg" -o -name "*.mmd" \) | sort)
}

copy_slide_logos() {
  local dest="$1"
  mkdir -p "$dest"
  while IFS= read -r file; do
    cp "$file" "$dest/$(basename "$file")"
  done < <(find contents/slides/logos -maxdepth 1 -type f -name "*.svg" | sort)
}

if [ -d contents/slides/diagrams ]; then
  copy_slide_diagrams "$out_dir/slides/mcp-internal-presentation/diagrams"
  copy_slide_diagrams "$out_dir/slides/mcp-internal-presentation/deck/diagrams"
fi

if [ -d contents/slides/logos ]; then
  copy_slide_logos "$out_dir/slides/mcp-internal-presentation/logos"
  copy_slide_logos "$out_dir/slides/mcp-internal-presentation/deck/logos"
fi

while IFS= read -r file; do
  rel="${file#contents/}"
  mkdir -p "$out_dir/$(dirname "$rel")"
  cp "$file" "$out_dir/$rel"
done < <(find contents/themes contents/slides contents/research contents/sources contents/tasks -type f \( -name "*.md" -o -name "*.mdx" \) | sort)

touch "$out_dir/.nojekyll"
