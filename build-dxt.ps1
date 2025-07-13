# Build script for creating Bridge DXT package on Windows

Write-Host "Building Bridge Desktop Extension (DXT)..." -ForegroundColor Cyan

# Clean previous builds
Write-Host "Cleaning previous builds..." -ForegroundColor Yellow
Remove-Item -Path "dxt-build" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "bridge.dxt" -Force -ErrorAction SilentlyContinue

# Create build directory
New-Item -ItemType Directory -Path "dxt-build" -Force | Out-Null

# Build and bundle the project
Write-Host "Building and bundling TypeScript..." -ForegroundColor Yellow
npm run build:all
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

# Create manifest with flat structure
Write-Host "Creating manifest..." -ForegroundColor Yellow
@'
{
  "dxt_version": "0.1",
  "name": "bridge-experiential-data",
  "display_name": "Bridge",
  "version": "0.1.0",
  "description": "MCP server for capturing and managing experiential data with analysis and reflection",
  "long_description": "Implements insights from embodied cognition, micro-phenomenology, and extended mind theory into practical infrastructure for the age of human-AI collaboration.\n\nBridge captures experiential moments with rich dimensions including embodied sensations, attentional patterns, affective states, purposive intentions, spatial presence, temporal flow, and intersubjective dynamics.",
  
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
      "description": "Preserve one or more experiences exactly as they were shared with you, maintaining their authentic voice through seven-dimensional phenomenological analysis (embodied, attentional, affective, purposive, spatial, temporal, intersubjective). Each experience requires a narrative field (max 200 chars) written in the experiencer's voice using present tense and active language, plus an emoji for visual summary."
    },
    {
      "name": "search",
      "description": "Find and explore captured experiences through text, phenomenological patterns, meaning, and context. Supports multiple queries with filtering by experiencer, perspective, processing level, and date ranges. Results can be sorted by relevance, system time, or occurrence time."
    },
    {
      "name": "update",
      "description": "Correct or update existing experiences when mistakes were made during capture, maintaining the integrity of the experiential record. Supports partial updates to any field including content, experience analysis, metadata, and can regenerate embeddings when needed."
    },
    {
      "name": "release",
      "description": "Let go of experiences that no longer need to be held, returning them to the flow of memory with gratitude. Supports releasing multiple experiences at once with reasons for each release."
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
'@ | Out-File -FilePath "dxt-build\manifest.json" -Encoding UTF8

# Copy bundled output as index.js (flat structure)
Copy-Item -Path "dist\bundle.js" -Destination "dxt-build\index.js"

# Copy other files
Copy-Item -Path "LICENSE" -Destination "dxt-build\"
Copy-Item -Path "README.md" -Destination "dxt-build\"

# Copy icon if exists
if (Test-Path "icon.png") {
    Copy-Item -Path "icon.png" -Destination "dxt-build\"
} else {
    Write-Host "Warning: icon.png not found" -ForegroundColor Yellow
}

# Create the DXT package
Write-Host "Creating DXT package..." -ForegroundColor Yellow
Compress-Archive -Path "dxt-build\*" -DestinationPath "bridge.dxt" -Force

# Clean up build directory
Remove-Item -Path "dxt-build" -Recurse -Force

# Report results
if (Test-Path "bridge.dxt") {
    $size = (Get-Item "bridge.dxt").Length
    $sizeInKB = [math]::Round($size / 1KB, 0)
    
    Write-Host ""
    Write-Host "✅ Bridge DXT package created successfully!" -ForegroundColor Green
    Write-Host "📦 Package: bridge.dxt ($sizeInKB KB)" -ForegroundColor Green
    Write-Host ""
    Write-Host "To install in Claude Desktop:" -ForegroundColor Cyan
    Write-Host "1. Open Claude Desktop" -ForegroundColor White
    Write-Host "2. Go to Settings > Extensions" -ForegroundColor White
    Write-Host "3. Click 'Load from file...' and select bridge.dxt" -ForegroundColor White
} else {
    Write-Host "❌ Failed to create DXT package" -ForegroundColor Red
    exit 1
}