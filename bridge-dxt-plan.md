# Bridge Desktop Extension (DXT) Development Plan

## Overview
This plan outlines the conversion of the Bridge MCP server (experiential data management system) into a Desktop Extension (.dxt) format for one-click installation in Claude Desktop and other compatible applications.

## Project Structure

```
bridge-dxt/
├── manifest.json              # DXT manifest (required)
├── icon.png                   # Extension icon (256x256)
├── README.md                  # User documentation
├── LICENSE                    # MIT License
├── .dxtignore                # Files to exclude from packaging
├── package.json              # NPM package definition
├── tsconfig.json             # TypeScript configuration
├── dist/                     # Compiled JavaScript
│   ├── index.js             # Main entry point
│   └── *.js                 # Other compiled files
├── node_modules/            # Bundled dependencies (production only)
├── assets/                  # Extension assets
│   └── screenshots/         # Screenshot images
│       ├── capture.png
│       ├── search.png
│       └── weave.png
└── docs/                    # Additional documentation
    └── SETUP.md            # Detailed setup instructions
```

## 1. Manifest.json Structure

The manifest must follow the DXT specification exactly:

```json
{
  "dxt_version": "0.1",
  "name": "bridge-experiential-data",
  "version": "0.1.0",
  "description": "Capture, frame, and weave personal experiences into meaningful narratives",
  "long_description": "Bridge is an experiential data management system that helps you capture raw experiences, transform them into structured moments with emotional and experiential qualities, and weave them into larger narratives. Features AI-powered framing, semantic search, multi-experiencer support, and comprehensive reflection tools.",
  "author": {
    "name": "Bridge Development Team",
    "email": "support@bridge-mcp.dev",
    "url": "https://github.com/yourusername/bridge"
  },
  "license": "MIT",
  "homepage": "https://github.com/yourusername/bridge",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/bridge.git"
  },
  "keywords": ["experience", "moments", "journaling", "narrative", "phenomenology", "mcp", "ai"],
  
  "server": {
    "type": "node",
    "entry_point": "dist/index.js",
    "mcp_config": {
      "command": "node",
      "args": ["${__dirname}/dist/index.js"],
      "env": {
        "NODE_ENV": "production",
        "OPENAI_API_KEY": "${user_config.openai_api_key}",
        "PINECONE_API_KEY": "${user_config.pinecone_api_key}",
        "PINECONE_ENVIRONMENT": "${user_config.pinecone_environment}",
        "PINECONE_INDEX_NAME": "${user_config.pinecone_index_name}",
        "BRIDGE_FILE_PATH": "${user_config.data_file_path}"
      }
    }
  },
  
  "tools": [
    {
      "name": "capture",
      "description": "Capture raw experiential text as a source record"
    },
    {
      "name": "frame",
      "description": "Transform sources into structured moments"
    },
    {
      "name": "weave",
      "description": "Connect moments into larger scenes"
    },
    {
      "name": "search",
      "description": "Search across all experiential records"
    },
    {
      "name": "enrich",
      "description": "Update existing records"
    },
    {
      "name": "release",
      "description": "Delete records or cleanup reframed records"
    },
    {
      "name": "status",
      "description": "Get system status and statistics"
    }
  ],
  
  "user_config": {
    "openai_api_key": {
      "type": "string",
      "title": "OpenAI API Key",
      "description": "Your OpenAI API key for AI-powered framing and weaving (required for auto-framing features)",
      "required": true,
      "sensitive": true
    },
    "pinecone_api_key": {
      "type": "string",
      "title": "Pinecone API Key", 
      "description": "Your Pinecone API key for semantic search capabilities",
      "required": true,
      "sensitive": true
    },
    "pinecone_environment": {
      "type": "string",
      "title": "Pinecone Environment",
      "description": "Your Pinecone environment (e.g., 'us-east-1-aws')",
      "required": true
    },
    "pinecone_index_name": {
      "type": "string",
      "title": "Pinecone Index Name",
      "description": "Name of your Pinecone index for storing experience embeddings",
      "required": true,
      "default": "bridge-experiences"
    },
    "data_file_path": {
      "type": "string",
      "title": "Data Storage Path",
      "description": "Path to store your experiential data JSON file",
      "required": false,
      "default": "${HOME}/.bridge/bridge.json"
    }
  },
  
  "compatibility": {
    "claude_desktop": ">=0.11.0",
    "platforms": ["darwin", "win32", "linux"],
    "runtimes": {
      "node": ">=18.0.0"
    }
  },
  
  "icon": "icon.png",
  "screenshots": [
    "assets/screenshots/capture.png",
    "assets/screenshots/search.png",
    "assets/screenshots/weave.png"
  ]
}
```

## 2. Build Process

### Prerequisites
- Node.js 18+
- npm or yarn
- TypeScript compiler

### Build Steps

1. **Clean Build Directory**
   ```bash
   cd bridge
   rm -rf bridge-dxt
   mkdir bridge-dxt
   ```

2. **Install Production Dependencies**
   ```bash
   # Install only production dependencies
   npm ci --production
   # Save the production node_modules
   cp -r node_modules bridge-dxt/
   
   # Install dev dependencies for building
   npm install
   ```

3. **Compile TypeScript**
   ```bash
   npm run build
   cp -r dist bridge-dxt/
   ```

4. **Copy Required Files**
   ```bash
   cp manifest.json bridge-dxt/
   cp icon.png bridge-dxt/
   cp README.md bridge-dxt/
   cp LICENSE bridge-dxt/
   cp package.json bridge-dxt/
   
   # Create assets directory
   mkdir -p bridge-dxt/assets/screenshots
   cp docs/screenshots/*.png bridge-dxt/assets/screenshots/
   ```

5. **Create .dxtignore**
   ```bash
   cat > bridge-dxt/.dxtignore << 'EOF'
   # Source files
   src/
   *.ts
   tsconfig.json
   
   # Development files
   .git/
   .gitignore
   .eslintrc
   .prettierrc
   
   # Test files
   *.test.js
   *.spec.js
   coverage/
   jest.config.*
   __tests__/
   
   # Build artifacts
   *.map
   
   # Logs and temp files
   *.log
   npm-debug.log*
   tmp/
   temp/
   
   # Environment files
   .env*
   
   # Documentation source
   docs/
   *.md
   !README.md
   
   # Other unnecessary files
   .npmignore
   .editorconfig
   yarn.lock
   package-lock.json
   EOF
   ```

6. **Package Extension**
   ```bash
   # Install DXT CLI if not already installed
   npm install -g @anthropic-ai/dxt
   
   # Pack the extension
   cd bridge-dxt
   dxt pack . ../bridge-experiential-data.dxt
   ```

## 3. Critical Implementation Details

### Environment Variable Mapping
The DXT environment will provide configuration values through the user_config system:

```javascript
// In dist/index.js, environment variables are automatically set by DXT
// No manual mapping needed - DXT handles this through mcp_config.env
// The following will be available:
// process.env.OPENAI_API_KEY
// process.env.PINECONE_API_KEY
// process.env.PINECONE_ENVIRONMENT
// process.env.PINECONE_INDEX_NAME
// process.env.BRIDGE_FILE_PATH
```

### Error Handling Enhancements
Add startup validation to ensure required configurations are present:

```javascript
function validateConfiguration() {
  const required = {
    'OPENAI_API_KEY': 'OpenAI API key',
    'PINECONE_API_KEY': 'Pinecone API key',
    'PINECONE_ENVIRONMENT': 'Pinecone environment',
    'PINECONE_INDEX_NAME': 'Pinecone index name'
  };
  
  const missing = [];
  for (const [key, name] of Object.entries(required)) {
    if (!process.env[key]) {
      missing.push(name);
    }
  }
  
  if (missing.length > 0) {
    throw new Error(`Missing required configuration: ${missing.join(', ')}. Please configure these in the Claude Desktop extension settings.`);
  }
}
```

### Data File Path Resolution
The data file path will use standard home directory notation:

```javascript
import { homedir } from 'os';
import { join, dirname } from 'path';
import { mkdirSync } from 'fs';

function resolveDataPath(configPath) {
  if (!configPath) {
    // Default to user's home directory
    configPath = join(homedir(), '.bridge', 'bridge.json');
  }
  
  // Ensure directory exists
  const dir = dirname(configPath);
  mkdirSync(dir, { recursive: true });
  
  return configPath;
}
```

## 4. User Documentation

### README.md Updates
Include clear installation and setup instructions:

```markdown
# Bridge - Experiential Data Desktop Extension

## Installation

1. Download `bridge-experiential-data.dxt`
2. Open Claude Desktop
3. Navigate to Settings > Extensions
4. Drag and drop the .dxt file or click "Install from file"

## Configuration

After installation, you MUST configure the extension:

1. Click the gear icon next to Bridge in the Extensions panel
2. Enter your required API keys:
   - **OpenAI API Key**: Required for AI-powered features (get one at https://platform.openai.com)
   - **Pinecone API Key**: Required for semantic search (get one at https://www.pinecone.io)
   - **Pinecone Environment**: Your Pinecone environment (e.g., 'us-east-1-aws')
   - **Pinecone Index Name**: Your index name (default: 'bridge-experiences')
3. Optionally customize the data file location (defaults to ~/.bridge/bridge.json)

## Getting Started

Once configured, use these commands in Claude:

- `bridge:capture` - Record a new experience
  Example: "Capture: Just had a breakthrough moment while debugging"
  
- `bridge:frame` - Transform captured experiences into structured moments
  Example: "Frame the last capture with emotional and purposive qualities"
  
- `bridge:weave` - Connect related moments into larger narratives
  Example: "Weave my recent breakthrough moments into a learning journey"
  
- `bridge:search` - Find past experiences
  Example: "Search for moments of clarity from this week"
  
- `bridge:enrich` - Update existing records
  Example: "Add more detail to moment mom_xyz123"
  
- `bridge:release` - Delete records
  Example: "Release source src_abc456"
  
- `bridge:status` - Check system status
  Example: "Show me the Bridge status"

## Features

- **AI-Powered Framing**: Automatically identify emotional, spatial, and temporal qualities
- **Semantic Search**: Find experiences by meaning, not just keywords
- **Multi-Experiencer Support**: Capture experiences from different perspectives
- **Reflection Chains**: Link experiences that build on each other
- **Privacy-First**: All data stored locally on your machine

## Troubleshooting

- **"Missing required configuration"**: Configure API keys in extension settings
- **"Invalid API key"**: Verify your OpenAI/Pinecone keys are correct
- **"File not found"**: Check the data file path in settings
- **Search not working**: Ensure Pinecone is configured with a valid index

## Data Storage

Your experiential data is stored in a JSON file on your local machine. 
Default location: `~/.bridge/bridge.json`

Back up this file regularly to preserve your experiences.
```

## 5. Testing Strategy

### Pre-release Testing
1. **Unit Tests**: Ensure all tools work correctly
2. **Integration Tests**: Test with real API keys
3. **DXT Installation**: Test installation process
4. **Cross-platform**: Test on Windows and macOS
5. **Error Scenarios**: Test with missing configs, network failures

### Test Checklist
- [ ] All tools respond correctly
- [ ] API key configuration works
- [ ] Data file is created/read correctly
- [ ] Search functionality works
- [ ] AI framing works with valid OpenAI key
- [ ] Error messages are helpful
- [ ] Extension updates work
- [ ] Uninstall cleans up properly

## 6. Security Considerations

1. **API Keys**: Marked as sensitive in manifest
2. **Data Storage**: Local file only, no cloud sync
3. **Network**: Only connects to OpenAI and Pinecone
4. **Permissions**: No special OS permissions required
5. **Updates**: Use signed packages for distribution

## 7. Distribution Plan

### Initial Release
1. Create GitHub release with .dxt file
2. Submit to Claude Desktop extension directory
3. Create landing page with documentation

### Future Updates
1. Semantic versioning for compatibility
2. Changelog for user communication
3. Migration guides for breaking changes

## 8. Build Automation Script

Create a `build-dxt.sh` script to automate the entire process:

```bash
#!/bin/bash
set -e

echo "Building Bridge Desktop Extension..."

# Clean previous builds
rm -rf bridge-dxt
rm -f bridge-experiential-data.dxt

# Create extension directory
mkdir -p bridge-dxt/assets/screenshots

# Build TypeScript
echo "Compiling TypeScript..."
npm run build

# Copy compiled files
cp -r dist bridge-dxt/

# Install and copy production dependencies only
echo "Installing production dependencies..."
npm ci --production
cp -r node_modules bridge-dxt/
npm install  # Restore all dependencies for development

# Copy required files
echo "Copying extension files..."
cp manifest.json bridge-dxt/
cp README.md bridge-dxt/
cp LICENSE bridge-dxt/
cp package.json bridge-dxt/

# Create icon if it doesn't exist
if [ ! -f icon.png ]; then
  echo "Creating placeholder icon..."
  # Create a simple 256x256 colored square as placeholder
  convert -size 256x256 xc:'#4A90E2' icon.png 2>/dev/null || \
  echo "Warning: ImageMagick not found. Please create icon.png manually."
fi
cp icon.png bridge-dxt/ 2>/dev/null || echo "Warning: icon.png not found"

# Create placeholder screenshots if they don't exist
for screenshot in capture search weave; do
  if [ ! -f "assets/screenshots/${screenshot}.png" ]; then
    mkdir -p assets/screenshots
    convert -size 800x600 xc:'#F0F0F0' -gravity center -pointsize 48 \
      -annotate +0+0 "Bridge ${screenshot^}" "assets/screenshots/${screenshot}.png" 2>/dev/null || \
    echo "Warning: Could not create ${screenshot}.png"
  fi
done
cp assets/screenshots/*.png bridge-dxt/assets/screenshots/ 2>/dev/null || \
  echo "Warning: Screenshots not found"

# Create .dxtignore
cat > bridge-dxt/.dxtignore << 'EOF'
# Source files
src/
*.ts
tsconfig.json

# Development files
.git/
.gitignore
.eslintrc
.prettierrc
.vscode/
.idea/

# Test files
*.test.js
*.spec.js
*.test.ts
*.spec.ts
coverage/
jest.config.*
__tests__/
test/

# Build artifacts
*.map
*.tsbuildinfo

# Logs and temp files
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
tmp/
temp/
.npm/

# Environment files
.env
.env.*

# Documentation source (keep README.md)
docs/
*.md
!README.md

# OS files
.DS_Store
Thumbs.db

# Editor files
*.swp
*.swo
*~

# Other unnecessary files
.npmignore
.editorconfig
yarn.lock
pnpm-lock.yaml
.npmrc
.yarnrc
EOF

# Package the extension
echo "Packaging extension..."
cd bridge-dxt
npx @anthropic-ai/dxt pack . ../bridge-experiential-data.dxt
cd ..

echo "✅ Build complete! Extension saved as: bridge-experiential-data.dxt"
echo "📦 File size: $(du -h bridge-experiential-data.dxt | cut -f1)"
echo ""
echo "To install:"
echo "1. Open Claude Desktop"
echo "2. Go to Settings > Extensions"
echo "3. Drag and drop bridge-experiential-data.dxt"
```

Make the script executable:
```bash
chmod +x build-dxt.sh
./build-dxt.sh
```

## 9. Known Limitations & Solutions

### Current Limitations
1. Requires external API keys (not self-contained)
2. Data file must be manually backed up
3. No built-in sync between devices
4. Requires active internet connection for AI features

### Future Enhancements
1. Optional local embeddings (remove Pinecone dependency)
2. Export/import functionality for data portability
3. Backup automation with versioning
4. Multi-device sync options
5. Offline mode with queued operations

## 10. Pre-Release Checklist

Before packaging the extension, verify:

### Required Files
- [ ] `manifest.json` with all required fields
- [ ] `dist/` directory with compiled JavaScript
- [ ] `node_modules/` with production dependencies only
- [ ] `README.md` with clear instructions
- [ ] `LICENSE` file
- [ ] `package.json` for reference
- [ ] `icon.png` (256x256 pixels)
- [ ] Screenshot images in `assets/screenshots/`

### Code Verification
- [ ] TypeScript compiles without errors
- [ ] All imports resolve correctly (especially dynamic imports)
- [ ] Error handling includes user-friendly messages
- [ ] File paths use cross-platform separators
- [ ] Environment variables are accessed correctly

### Manifest Validation
- [ ] Run `dxt validate manifest.json` before packaging
- [ ] All tool names match the implementation
- [ ] user_config fields have proper types and descriptions
- [ ] Sensitive fields marked appropriately
- [ ] Version follows semver format

### Testing
- [ ] Install extension in Claude Desktop
- [ ] Configure all required API keys
- [ ] Test each tool with various inputs
- [ ] Verify error messages are helpful
- [ ] Check data file is created in correct location
- [ ] Test on both Windows and macOS if possible

## 11. Success Metrics

- Zero-configuration installation (after API keys)
- All tools work identically to original MCP server
- Clear error messages guide users to solutions
- Positive user feedback on ease of use
- Low support burden
- Successful semantic search with Pinecone
- AI framing produces quality results

## Conclusion

This plan provides a comprehensive approach to converting Bridge into a Desktop Extension. The focus is on maintaining full functionality while improving the user experience through simplified installation and configuration. The resulting extension will make Bridge's powerful experiential data management accessible to non-technical users through Claude Desktop's extension system.

Key achievements:
- **One-click installation** with guided configuration
- **Secure API key handling** through DXT's user_config system  
- **Cross-platform compatibility** with proper path handling
- **Production-ready build process** with automation script
- **Comprehensive error handling** with helpful user guidance

The Bridge Desktop Extension will enable users to capture, frame, and weave their experiences into meaningful narratives without technical setup complexity.