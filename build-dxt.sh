#!/bin/bash
# Build script for creating Bridge DXT package

set -e

echo "Building Bridge Desktop Extension (DXT)..."

# Clean previous builds
echo "Cleaning previous builds..."
rm -rf dxt-build bridge.dxt

# Create build directory
mkdir -p dxt-build

# Build and bundle the project
echo "Building and bundling TypeScript..."
npm run build:all

# Generate manifest from sources
echo "Generating manifest..."
npm run generate:manifest

# Create manifest with flat structure
echo "Validating manifest..."

# Validate the generated manifest.json
echo "Validating generated manifest..."
node -e "
const manifest = require('./manifest.json');
if (!manifest.dxt_version || !manifest.name || !manifest.version) {
  console.error('❌ Invalid manifest: missing required fields');
  process.exit(1);
}
console.log('✅ Generated manifest validation passed');
"

# Update entry_point for DXT package (flat structure)
node -e "
const fs = require('fs');
const manifest = require('./manifest.json');
manifest.server.entry_point = 'index.js';
fs.writeFileSync('./dxt-build/manifest.json', JSON.stringify(manifest, null, 2) + '\\n');
console.log('✅ Updated entry_point for DXT package');
"

# Validate the copied manifest
node -e "
const manifest = require('./dxt-build/manifest.json');
console.log('📋 DXT manifest info:');
console.log('  - Name:', manifest.name);
console.log('  - Version:', manifest.version);
console.log('  - Entry point:', manifest.server.entry_point);
console.log('  - Tools:', manifest.tools.length);
"

# Copy bundled output as index.js (flat structure)
cp dist/bundle.js dxt-build/index.js

# Copy other files
cp LICENSE.md dxt-build/
cp DXT-README.md dxt-build/README.md

# Create icon if it doesn't exist
if [ ! -f icon.png ]; then
  echo "Note: icon.png not found. Creating placeholder..."
  # Create a simple 128x128 transparent PNG as placeholder
  printf '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x80\x00\x00\x00\x80\x08\x06\x00\x00\x00\xC3>a\xCB\x00\x00\x00\x06bKGD\x00\xFF\x00\xFF\x00\xFF\xA0\xBD\xA7\x93\x00\x00\x00\tpHYs\x00\x00\x0B\x13\x00\x00\x0B\x13\x01\x00\x9A\x9C\x18\x00\x00\x00\x07tIME\x07\xE8\x01\x0E\x15\x1B\x08\xAA\xC9\xB4\xEB\x00\x00\x00\x1DIDATx\xDA\xED\xC1\x01\r\x00\x00\x00\xC2\xA0\xF7Om\x0E7\xA0\x00\x00\x00\x00\x00\x00\x00\x00\xBE\rp\x00\x00\x01\x8E\x0B\x1E?\x00\x00\x00\x00IEND\xAEB`\x82' > icon.png
fi
cp icon.png dxt-build/ 2>/dev/null || echo "Warning: icon.png not copied"

# Create the DXT package
cd dxt-build
echo "Creating DXT package..."
zip ../bridge.dxt *

# Clean up build directory
cd ..
rm -rf dxt-build

# Validate DXT package
echo "Validating DXT package..."
unzip -t bridge.dxt > /dev/null && echo "✅ Package integrity verified" || (echo "❌ Package integrity check failed" && exit 1)

# Check critical files exist
echo "Checking package contents..."
unzip -Z1 bridge.dxt | grep -q "index.js" || (echo "❌ Missing index.js" && exit 1)
unzip -Z1 bridge.dxt | grep -q "manifest.json" || (echo "❌ Missing manifest.json" && exit 1)
echo "✅ All critical files present"

# Report size
if [ -f bridge.dxt ]; then
  SIZE=$(ls -lh bridge.dxt | awk '{print $5}')
  echo ""
  echo "✅ Bridge DXT package created successfully!"
  echo "📦 Package: bridge.dxt (${SIZE})"
  echo ""
  echo "To install in Claude Desktop:"
  echo "1. Open Claude Desktop"
  echo "2. Go to Settings > Extensions"
  echo "3. Click 'Load from file...' and select bridge.dxt"
else
  echo "❌ Failed to create DXT package"
  exit 1
fi