#!/bin/bash

# Workday Copilot - Build Script
# Compiles TypeScript and copies static assets to dist/

set -e

echo "🔨 Building Workday Copilot..."

# Clean dist directory
rm -rf dist
mkdir -p dist

# Compile TypeScript
echo "📦 Compiling TypeScript..."
npx tsc

# Copy public assets
echo "📋 Copying static assets..."
cp public/manifest.json dist/
cp public/popup.html dist/
cp -r public/styles dist/
cp -r public/icons dist/
cp -r public/content dist/

echo "✅ Build complete! Extension ready in dist/"
echo ""
echo "To load in Chrome:"
echo "1. Open chrome://extensions"
echo "2. Enable Developer Mode"
echo "3. Click 'Load unpacked'"
echo "4. Select the dist/ folder"


