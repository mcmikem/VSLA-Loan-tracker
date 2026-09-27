#!/bin/bash
# Screenshot the landing page locally. See scripts/landing-preview.py for why.
#   bash scripts/landing-preview.sh [width]
set -e
cd "$(dirname "$0")/.."
WIDTH="${1:-1280}"
OUT=/tmp/vsla-landing-preview
rm -f "$OUT/index.html.png"
python3 scripts/landing-preview.py "$WIDTH"
qlmanage -t -s "$WIDTH" -o "$OUT" "$OUT/index.html" >/dev/null 2>&1 || true
ls -la "$OUT"/*.png
