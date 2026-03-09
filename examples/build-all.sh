#!/bin/bash
# Build all GridStorm example apps into a combined dist/ folder
# Used by Vercel deployment

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
OUT_DIR="$SCRIPT_DIR/dist"

echo "Building GridStorm demos..."
echo "Root: $ROOT_DIR"
echo "Output: $OUT_DIR"

# Clean output
rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

# Copy hub landing page
cp "$SCRIPT_DIR/hub/index.html" "$OUT_DIR/index.html"

# Build each example app
APPS="playground react-demo financial-trading spreadsheet analytics-explorer"

for app in $APPS; do
  echo ""
  echo "=== Building $app ==="
  cd "$SCRIPT_DIR/$app"
  npx vite build --outDir "$OUT_DIR/$app"
  echo "Done: $app"
done

echo ""
echo "All demos built successfully!"
ls -la "$OUT_DIR"
