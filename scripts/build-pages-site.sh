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
  src/content/docs/slides/mcp-internal-presentation.md \
  --theme themes/mcp-modern.css \
  --html \
  --output "$out_dir/slides/mcp-internal-presentation/deck/index.html"

while IFS= read -r file; do
  rel="${file#src/content/docs/}"
  mkdir -p "$out_dir/$(dirname "$rel")"
  cp "$file" "$out_dir/$rel"
done < <(find src/content/docs -type f \( -name "*.md" -o -name "*.mdx" \) | sort)

touch "$out_dir/.nojekyll"
