#!/usr/bin/env pwsh
# Bridge DXT Build Script for Windows

Write-Host "Building Bridge Desktop Extension..." -ForegroundColor Green

# Clean previous builds
if (Test-Path "bridge-dxt") {
    Remove-Item -Recurse -Force "bridge-dxt"
    Write-Host "Cleaned previous build directory" -ForegroundColor Yellow
}

if (Test-Path "bridge-experiential-data.dxt") {
    Remove-Item "bridge-experiential-data.dxt"
    Write-Host "Removed previous .dxt file" -ForegroundColor Yellow
}

# Create extension directory
New-Item -ItemType Directory -Path "bridge-dxt" -Force | Out-Null
New-Item -ItemType Directory -Path "bridge-dxt/assets/screenshots" -Force | Out-Null

# Build TypeScript
Write-Host "Compiling TypeScript..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "TypeScript compilation failed!" -ForegroundColor Red
    exit 1
}

# Copy compiled files
Write-Host "Copying compiled files..." -ForegroundColor Cyan
Copy-Item -Recurse "dist" "bridge-dxt/"

# Install and copy production dependencies only
Write-Host "Installing production dependencies..." -ForegroundColor Cyan
npm ci --production
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to install production dependencies!" -ForegroundColor Red
    exit 1
}

Copy-Item -Recurse "node_modules" "bridge-dxt/"
npm install  # Restore all dependencies for development

# Copy required files
Write-Host "Copying extension files..." -ForegroundColor Cyan
Copy-Item "manifest.json" "bridge-dxt/"
Copy-Item "README.md" "bridge-dxt/"
Copy-Item "LICENSE" "bridge-dxt/"
Copy-Item "package.json" "bridge-dxt/"

# Create placeholder icon if it doesn't exist
if (!(Test-Path "icon.png")) {
    Write-Host "Warning: icon.png not found - please create a 256x256 icon manually" -ForegroundColor Yellow
    # Create a simple text file as placeholder
    "Placeholder for icon.png - please create a 256x256 icon" | Out-File "icon.png" -Encoding UTF8
}
Copy-Item "icon.png" "bridge-dxt/" -ErrorAction SilentlyContinue

# Create placeholder screenshots if they don't exist
$screenshots = @("capture", "search", "weave")
foreach ($screenshot in $screenshots) {
    $screenshotPath = "assets/screenshots/${screenshot}.png"
    if (!(Test-Path $screenshotPath)) {
        Write-Host "Warning: ${screenshotPath} not found - creating placeholder" -ForegroundColor Yellow
        # Create placeholder text file
        "Placeholder for ${screenshot}.png" | Out-File $screenshotPath -Encoding UTF8
    }
}
Copy-Item "assets/screenshots/*.png" "bridge-dxt/assets/screenshots/" -ErrorAction SilentlyContinue

# Copy .dxtignore
Copy-Item ".dxtignore" "bridge-dxt/"

# Package the extension
Write-Host "Packaging extension..." -ForegroundColor Cyan
Push-Location "bridge-dxt"
try {
    npx @anthropic-ai/dxt pack . ../bridge-experiential-data.dxt
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to package extension!" -ForegroundColor Red
        exit 1
    }
} finally {
    Pop-Location
}

# Get file size
$fileSize = (Get-Item "bridge-experiential-data.dxt").Length
$fileSizeMB = [math]::Round($fileSize / 1MB, 2)

Write-Host "`n✅ Build complete!" -ForegroundColor Green
Write-Host "Extension saved as: bridge-experiential-data.dxt" -ForegroundColor White
Write-Host "File size: ${fileSizeMB} MB" -ForegroundColor White
Write-Host ""
Write-Host "To install:" -ForegroundColor Cyan
Write-Host "1. Open Claude Desktop" -ForegroundColor White
Write-Host "2. Go to Settings > Extensions" -ForegroundColor White
Write-Host "3. Drag and drop bridge-experiential-data.dxt" -ForegroundColor White 