#!/usr/bin/env bash
set -euo pipefail

deck="${1:-contents/templates/slides/example.md}"
name="$(basename "$deck" .md)"
out_dir="dist"
html="$out_dir/$name.html"
screenshots="$out_dir/screenshots/$name"

mkdir -p "$out_dir" "$screenshots"

npx marp "$deck" --html --theme contents/themes/research.css --output "$html"

deck_dir="$(dirname "$deck")"
if [ -d "$deck_dir/diagrams" ]; then
  rm -rf "$out_dir/diagrams"
  cp -R "$deck_dir/diagrams" "$out_dir/diagrams"
fi

if [ -d "$deck_dir/logos" ]; then
  rm -rf "$out_dir/logos"
  cp -R "$deck_dir/logos" "$out_dir/logos"
fi

node scripts/screenshot-slides.mjs "$html" "$screenshots"

echo "Rendered $html"
echo "Screenshots written to $screenshots"
