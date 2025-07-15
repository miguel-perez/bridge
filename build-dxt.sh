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

# Create manifest with flat structure
echo "Creating manifest..."
cat > dxt-build/manifest.json << 'EOF'
{
  "dxt_version": "0.1",
  "name": "bridge-experiential-data",
  "display_name": "Bridge",
  "version": "0.1.0",
  "description": "MCP server for experience capture",
  "long_description": "Bridge is an experience capture system that creates experiential records with seven-dimensional analysis (embodied, attentional, affective, purposive, spatial, temporal, intersubjective) and preserves authentic first-person voice.\n\nBased on micro-phenomenology, experience sampling methods, and narrative therapy, Bridge helps users capture, search, and reflect on their lived experiences in ways that preserve experiential wholeness while enabling pattern recognition and personal insight.",
  
  "author": {
    "name": "Miguel Angel Perez",
    "email": "mail@miguel.design",
    "url": "https://github.com/miguel-perez/bridge"
  },
  
  "repository": {
    "type": "git",
    "url": "https://github.com/miguel-perez/bridge"
  },
  
  "homepage": "https://github.com/miguel-perez/bridge",
  "documentation": "https://github.com/miguel-perez/bridge/blob/main/README.md",
  "support": "https://github.com/miguel-perez/bridge/issues",
  
  "icon": "icon.png",
  
  "server": {
    "type": "node",
    "entry_point": "index.js",
    "mcp_config": {
      "command": "node",
      "args": ["${__dirname}/index.js"],
      "env": {
        "BRIDGE_FILE_PATH": "${user_config.data_file_path}",
        "BRIDGE_DEBUG": "${user_config.debug_mode}"
      }
    }
  },
  
  "tools": [
    {
      "name": "capture",
      "description": "Capture experiences. Creates experiential records with seven-dimensional analysis (embodied, attentional, affective, purposive, spatial, temporal, intersubjective). CRITICAL: All content must preserve the user's authentic voice—narrative and manifestations should feel like 'that's my brain right there.' Use the experiencer's actual words, phrases, and way of thinking. Each capture requires an emoji and narrative (max 200 chars) written in the experiencer's voice using present tense. Supports both single captures and batch operations."
    },
    {
      "name": "search",
      "description": "Search experiences using semantic matching and metadata filters. Returns experiences with their seven-dimensional qualities, emoji, narrative, and metadata. Empty queries show recent experiences. Supports filtering by experiencer, perspective, processing level, and date ranges. Supports both single searches and batch operations."
    },
    {
      "name": "update",
      "description": "Update existing experiences. Can modify content, perspective, experiencer, processing level, crafted status, and the seven-dimensional experiential qualities. Useful for correcting mistakes or refining experiential analysis. Supports both single updates and batch operations."
    },
    {
      "name": "release",
      "description": "Release experiences by ID. Removes experiences from the system with gratitude and reasoning. Useful for letting go of experiences that no longer need to be held. Supports both single releases and batch operations."
    }
  ],
  
  "tools_generated": false,
  
  "keywords": [
    "phenomenology",
    "consciousness",
    "experiential-data",
    "embodied-cognition",
    "distributed-cognition",
    "mcp",
    "ai-collaboration",
    "knowledge-capture"
  ],
  
  "license": "MIT",
  
  "compatibility": {
    "platforms": ["darwin", "win32", "linux"],
    "runtimes": {
      "node": ">=18.0.0"
    }
  },
  
  "user_config": {
    "data_file_path": {
      "type": "string",
      "title": "Bridge Data File Path",
      "description": "Path to your Bridge experiential data file. Can be an absolute path or relative to your home directory (e.g., ~/bridge.json)",
      "default": "${HOME}/bridge.json",
      "required": true
    },
    "debug_mode": {
      "type": "boolean",
      "title": "Debug Mode",
      "description": "Enable debug logging for troubleshooting connection issues and understanding data processing",
      "default": false,
      "required": false
    }
  }
}
EOF

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