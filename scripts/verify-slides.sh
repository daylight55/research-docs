#!/usr/bin/env bash
set -euo pipefail

deck="${1:-slides/example.md}"
name="$(basename "$deck" .md)"
out_dir="dist"
html="$out_dir/$name.html"
screenshots="$out_dir/screenshots/$name"

mkdir -p "$out_dir" "$screenshots"

npx marp "$deck" --html --theme theme/research.css --output "$html"

deck_dir="$(dirname "$deck")"
if [ -d "$deck_dir/diagrams" ]; then
  rm -rf "$out_dir/diagrams"
  cp -R "$deck_dir/diagrams" "$out_dir/diagrams"
fi

node scripts/screenshot-slides.mjs "$html" "$screenshots"

echo "Rendered $html"
echo "Screenshots written to $screenshots"
