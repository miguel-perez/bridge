#!/bin/bash

# Build script for Bridge Desktop Extension (DXT)
# This script packages the Bridge MCP server into a .dxt file for Claude Desktop

echo -e "\033[32mBuilding Bridge Desktop Extension (DXT)...\033[0m"

# Variables
EXTENSION_NAME="bridge-experiential-data"
OUTPUT_DIR="bridge-dxt"
SERVER_DIR="$OUTPUT_DIR/server"
BUILD_FILE_NAME="$EXTENSION_NAME.dxt"

# Validate manifest first
echo -e "\033[33mValidating manifest...\033[0m"
node src/scripts/test-dxt-manifest.cjs
if [ $? -ne 0 ]; then
    echo -e "\033[31mManifest validation failed!\033[0m"
    exit 1
fi

# Clean up any existing build directory
if [ -d "$OUTPUT_DIR" ]; then
    echo -e "\033[33mCleaning up existing build directory...\033[0m"
    rm -rf "$OUTPUT_DIR"
fi

# Create build directory structure
echo -e "\033[33mCreating build directory structure...\033[0m"
mkdir -p "$SERVER_DIR"

# Build the TypeScript project
echo -e "\033[33mBuilding TypeScript project...\033[0m"
npm run build
if [ $? -ne 0 ]; then
    echo -e "\033[31mTypeScript build failed!\033[0m"
    exit 1
fi

# Copy manifest.json
echo -e "\033[33mCopying manifest.json...\033[0m"
cp manifest.json "$OUTPUT_DIR/"

# Copy icon if it exists
if [ -f "icon.png" ]; then
    echo -e "\033[33mCopying icon.png...\033[0m"
    cp icon.png "$OUTPUT_DIR/"
fi

# Copy package files
echo -e "\033[33mCopying package files...\033[0m"
cp package.json "$SERVER_DIR/"
if [ -f "package-lock.json" ]; then
    cp package-lock.json "$SERVER_DIR/"
fi

# Copy built files
echo -e "\033[33mCopying built files...\033[0m"
cp -r dist "$SERVER_DIR/"

# Install production dependencies
echo -e "\033[33mInstalling production dependencies...\033[0m"
cd "$SERVER_DIR"
npm ci --production
if [ $? -ne 0 ]; then
    echo -e "\033[31mnpm install failed!\033[0m"
    cd ../..
    exit 1
fi
cd ../..

# Copy README for documentation
echo -e "\033[33mCopying README...\033[0m"
cp README.md "$OUTPUT_DIR/"

# Create the .dxt file (ZIP archive)
echo -e "\033[33mCreating .dxt file...\033[0m"

# Remove any existing .dxt file
if [ -f "$BUILD_FILE_NAME" ]; then
    rm "$BUILD_FILE_NAME"
fi

# Create ZIP archive
cd "$OUTPUT_DIR"
zip -r "../$BUILD_FILE_NAME" ./*
cd ..

# Clean up build directory
echo -e "\033[33mCleaning up build directory...\033[0m"
rm -rf "$OUTPUT_DIR"

# Success message
echo -e "\n\033[32mBridge Desktop Extension built successfully!\033[0m"
echo -e "\033[36mOutput: $BUILD_FILE_NAME\033[0m"
echo -e "\n\033[33mTo install in Claude Desktop:\033[0m"
echo "1. Open Claude Desktop"
echo "2. Go to Settings > Extensions"
echo "3. Drag and drop '$BUILD_FILE_NAME' into the window"
echo "4. Configure the extension with your preferred data file path" 