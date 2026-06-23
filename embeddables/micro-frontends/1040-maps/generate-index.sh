#!/usr/bin/env bash
# generate-index.sh — inject auto-detected public/js bundles into an index.html.
#
# Card dcff7525. After `pnpm build` emits one <bundle>.js per app-profile into public/js/,
# run this to refresh the <script> tags in a production embed index.html. Idempotent: it
# only rewrites the block between the two HTML marker comments, so re-running after each
# build keeps the list in sync with what's actually on disk.
#
# The target index.html must contain these two markers (the script replaces what's between):
#     <!-- bundles-start -->
#     <!-- bundles-end -->
#
# Usage:
#   generate-index.sh [public_js_dir] [index_html]
#   generate-index.sh                       # defaults below
#   generate-index.sh ../../../public/js ./index.html
#
# Defaults: public/js is at ../../../public/js relative to this 1040-maps dir (matches
# vite.config.js outDir); index.html is alongside this script.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PUBLIC_JS="${1:-$HERE/../../../public/js}"
INDEX="${2:-$HERE/index.html}"

[[ -d "$PUBLIC_JS" ]] || { echo "generate-index: public/js dir not found: $PUBLIC_JS" >&2; exit 1; }
[[ -f "$INDEX" ]]     || { echo "generate-index: index.html not found: $INDEX" >&2; exit 1; }

if ! grep -q '<!-- bundles-start -->' "$INDEX" || ! grep -q '<!-- bundles-end -->' "$INDEX"; then
  echo "generate-index: $INDEX is missing the <!-- bundles-start --> / <!-- bundles-end --> markers." >&2
  echo "                Add both markers where the <script> tags should go, then re-run." >&2
  exit 2
fi

# Build the <script> block from every *.js in public/js (sorted, basename only). Served at
# /js/<name> by the host, so the src is /js/<name>.js.
SCRIPTS=""
shopt -s nullglob
mapfile -t JS < <(cd "$PUBLIC_JS" && ls -1 *.js 2>/dev/null | sort)
if [[ ${#JS[@]} -eq 0 ]]; then
  echo "generate-index: no .js files in $PUBLIC_JS (run pnpm build first?)" >&2
fi
for f in "${JS[@]}"; do
  SCRIPTS+="    <script src=\"/js/$f\"></script>"$'\n'
done

# Replace the marker block atomically with awk (handles multi-line cleanly; sed is fragile
# across newlines). Write to a temp file, then move into place.
TMP="$(mktemp)"
awk -v block="$SCRIPTS" '
  /<!-- bundles-start -->/ { print; printf "%s", block; skip=1; next }
  /<!-- bundles-end -->/   { skip=0 }
  !skip { print }
' "$INDEX" > "$TMP" && mv "$TMP" "$INDEX"

echo "generate-index: injected ${#JS[@]} bundle(s) into $INDEX"
printf '  - %s\n' "${JS[@]}"
