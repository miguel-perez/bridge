# Build script for Bridge Desktop Extension (DXT)
# This script packages the Bridge MCP server into a .dxt file for Claude Desktop

Write-Host "Building Bridge Desktop Extension (DXT)..." -ForegroundColor Green

# Variables
$extensionName = "bridge-experiential-data"
$outputDir = "bridge-dxt"
$serverDir = "$outputDir/server"
$buildFileName = "$extensionName.dxt"
$tempZipName = "$extensionName.zip"

# Validate manifest first
Write-Host "Validating manifest..." -ForegroundColor Yellow
node src/scripts/test-dxt-manifest.cjs
if ($LASTEXITCODE -ne 0) {
    Write-Host "Manifest validation failed!" -ForegroundColor Red
    exit 1
}

# Clean up any existing build directory
if (Test-Path $outputDir) {
    Write-Host "Cleaning up existing build directory..." -ForegroundColor Yellow
    Remove-Item -Path $outputDir -Recurse -Force
}

# Create build directory structure
Write-Host "Creating build directory structure..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
New-Item -ItemType Directory -Path $serverDir -Force | Out-Null

# Build the TypeScript project
Write-Host "Building TypeScript project..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "TypeScript build failed!" -ForegroundColor Red
    exit 1
}

# Copy manifest.json
Write-Host "Copying manifest.json..." -ForegroundColor Yellow
Copy-Item -Path "manifest.json" -Destination $outputDir

# Copy icon if it exists
if (Test-Path "icon.png") {
    Write-Host "Copying icon.png..." -ForegroundColor Yellow
    Copy-Item -Path "icon.png" -Destination $outputDir
}

# Copy package files
Write-Host "Copying package files..." -ForegroundColor Yellow
Copy-Item -Path "package.json" -Destination $serverDir
Copy-Item -Path "package-lock.json" -Destination $serverDir -ErrorAction SilentlyContinue

# Copy built files
Write-Host "Copying built files..." -ForegroundColor Yellow
Copy-Item -Path "dist" -Destination $serverDir -Recurse

# Install production dependencies
Write-Host "Installing production dependencies..." -ForegroundColor Yellow
Push-Location $serverDir

# Create a modified package.json without problematic dependencies
$packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
$packageJson.dependencies.PSObject.Properties.Remove("@xenova/transformers")

# Save the modified package.json
$packageJson | ConvertTo-Json -Depth 10 | Set-Content "package.json"

# Install remaining dependencies
npm ci --production --no-optional --omit=dev
if ($LASTEXITCODE -ne 0) {
    Write-Host "npm install failed!" -ForegroundColor Red
    Pop-Location
    exit 1
}

# Remove any sharp/onnx binaries that might have been installed
$problematicPackages = @("sharp", "onnxruntime-node", "@onnxruntime", "cpu-features")
foreach ($pkg in $problematicPackages) {
    $pkgPath = Join-Path "node_modules" $pkg
    if (Test-Path $pkgPath) {
        Write-Host "Removing problematic package: $pkg" -ForegroundColor Yellow
        Remove-Item -Path $pkgPath -Recurse -Force
    }
}

Pop-Location

# Copy README for documentation
Write-Host "Copying README..." -ForegroundColor Yellow
Copy-Item -Path "README.md" -Destination $outputDir

# Create the .dxt file (ZIP archive)
Write-Host "Creating .dxt file..." -ForegroundColor Yellow

# Remove any existing files
if (Test-Path $buildFileName) {
    Write-Host "Removing existing .dxt file..." -ForegroundColor Yellow
    Remove-Item -Path $buildFileName -Force
}
if (Test-Path $tempZipName) {
    Remove-Item -Path $tempZipName -Force
}

# Create ZIP archive
try {
    Compress-Archive -Path "$outputDir\*" -DestinationPath $tempZipName -CompressionLevel Optimal -Force
    Write-Host "ZIP archive created successfully!" -ForegroundColor Green
    
    # Rename .zip to .dxt
    Rename-Item -Path $tempZipName -NewName $buildFileName
    Write-Host "Renamed to .dxt extension!" -ForegroundColor Green
} catch {
    Write-Host "Failed to create ZIP archive: $_" -ForegroundColor Red
    exit 1
}

# Verify the file was created
if (Test-Path $buildFileName) {
    $fileInfo = Get-Item $buildFileName
    Write-Host "DXT file created: $($fileInfo.Name) ($([Math]::Round($fileInfo.Length / 1MB, 2)) MB)" -ForegroundColor Green
} else {
    Write-Host "ERROR: DXT file was not created!" -ForegroundColor Red
    exit 1
}

# Clean up build directory
Write-Host "Cleaning up build directory..." -ForegroundColor Yellow
Remove-Item -Path $outputDir -Recurse -Force

# Success message
Write-Host "`nBridge Desktop Extension built successfully!" -ForegroundColor Green
Write-Host "Output: $buildFileName" -ForegroundColor Cyan
Write-Host "`nTo install in Claude Desktop:" -ForegroundColor Yellow
Write-Host "1. Open Claude Desktop"
Write-Host "2. Go to Settings > Extensions"
Write-Host "3. Drag and drop '$buildFileName' into the window"
Write-Host "4. Configure the extension with your preferred data file path" 