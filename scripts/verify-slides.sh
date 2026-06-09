#!/usr/bin/env bash
set -euo pipefail

deck="${1:-contents/templates/slides/example.md}"
name="$(basename "$deck" .md)"
out_dir="dist"
html="$out_dir/$name.html"
screenshots="$out_dir/screenshots/$name"

mkdir -p "$out_dir" "$screenshots"

npx marp "$deck" --html --theme contents/marp-themes/research.css --output "$html"
node scripts/patch-marp-deck.mjs "$html"

deck_dir="$(dirname "$deck")"
if [ -d "$deck_dir/diagrams" ]; then
  rm -rf "$out_dir/diagrams"
  cp -R "$deck_dir/diagrams" "$out_dir/diagrams"
fi

if [ -d "$deck_dir/logos" ]; then
  rm -rf "$out_dir/logos"
  cp -R "$deck_dir/logos" "$out_dir/logos"
fi

if [ -d "$deck_dir/generated" ]; then
  rm -rf "$out_dir/generated"
  cp -R "$deck_dir/generated" "$out_dir/generated"
fi

if [ -d "$deck_dir/screenshots" ]; then
  rm -rf "$out_dir/screenshots-assets"
  cp -R "$deck_dir/screenshots" "$out_dir/screenshots-assets"
  rm -rf "$out_dir/screenshots"
  mkdir -p "$out_dir/screenshots"
  cp -R "$out_dir/screenshots-assets/." "$out_dir/screenshots/"
  rm -rf "$out_dir/screenshots-assets"
fi

node scripts/screenshot-slides.mjs "$html" "$screenshots"

echo "Rendered $html"
echo "Screenshots written to $screenshots"
