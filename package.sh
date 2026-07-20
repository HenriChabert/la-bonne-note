#!/usr/bin/env bash
# Package the extension into a .zip for Chrome Web Store upload.
set -euo pipefail

NAME="la-bonne-note"
VERSION=$(grep '"version"' manifest.json | head -1 | sed 's/.*"\([0-9.]*\)".*/\1/')
DISTDIR="dist"
OUTFILE="${DISTDIR}/${NAME}-v${VERSION}.zip"

echo "Packaging ${NAME} v${VERSION}..."

mkdir -p "$DISTDIR"
rm -f "$OUTFILE"

zip -r "$OUTFILE" \
  manifest.json \
  background.js \
  content.js \
  styles.css \
  popup.html \
  popup.js \
  icons/icon16.png \
  icons/icon48.png \
  icons/icon128.png \
  -x "*.DS_Store"

echo ""
echo "Created: ${OUTFILE}"
echo "Size: $(du -h "$OUTFILE" | cut -f1)"
echo ""
echo "Upload this file at: https://chrome.google.com/webstore/devconsole"
