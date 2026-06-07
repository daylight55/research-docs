#!/usr/bin/env bash
set -euo pipefail

out_dir="${1:-site}"

rm -rf "$out_dir"
mkdir -p "$out_dir"

npx --yes @marp-team/marp-cli@latest \
  mcp-internal-presentation.marp.md \
  --theme themes/mcp-modern.css \
  --html \
  --output "$out_dir/index.html"

cp mcp-internal-presentation.marp.md "$out_dir/mcp-internal-presentation.marp.md"
cp mcp-slide-research.md "$out_dir/mcp-slide-research.md"
cp research-tasks.md "$out_dir/research-tasks.md"
touch "$out_dir/.nojekyll"
