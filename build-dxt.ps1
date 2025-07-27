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

# Generate manifest from sources
Write-Host "Generating manifest..." -ForegroundColor Yellow
npm run build:manifest
if ($LASTEXITCODE -ne 0) {
    Write-Host "Manifest generation failed!" -ForegroundColor Red
    exit 1
}

# Validate the generated manifest.json
Write-Host "Validating generated manifest..." -ForegroundColor Yellow
try {
    $manifest = Get-Content -Path "manifest.json" -Raw | ConvertFrom-Json
    if (-not $manifest.dxt_version -or -not $manifest.name -or -not $manifest.version) {
        Write-Host "❌ Invalid manifest: missing required fields" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Generated manifest validation passed" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to read or parse manifest.json: $_" -ForegroundColor Red
    exit 1
}

# Copy the manifest and update entry_point for DXT package
Write-Host "Preparing manifest for DXT..." -ForegroundColor Yellow
$manifest = Get-Content -Path "manifest.json" -Raw | ConvertFrom-Json
$manifest.server.entry_point = "index.js"
$manifest | ConvertTo-Json -Depth 10 | Set-Content -Path "dxt-build\manifest.json"
Write-Host "✅ Updated entry_point for DXT package" -ForegroundColor Green

# Display manifest info
$manifestInfo = Get-Content -Path "dxt-build\manifest.json" -Raw | ConvertFrom-Json
Write-Host "📋 DXT manifest info:" -ForegroundColor Cyan
Write-Host "  - Name: $($manifestInfo.name)" -ForegroundColor White
Write-Host "  - Version: $($manifestInfo.version)" -ForegroundColor White
Write-Host "  - Entry point: $($manifestInfo.server.entry_point)" -ForegroundColor White
Write-Host "  - Tools: $($manifestInfo.tools.Count)" -ForegroundColor White

# Copy bundled output as index.js (flat structure)
Copy-Item -Path "dist\bundle.js" -Destination "dxt-build\index.js"

# Copy other files
Copy-Item -Path "LICENSE.md" -Destination "dxt-build\"
Copy-Item -Path "DXT-README.md" -Destination "dxt-build\README.md"

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