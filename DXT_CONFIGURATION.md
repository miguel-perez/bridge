# Bridge DXT Configuration Guide

## Overview

Bridge Desktop Extension (DXT) now supports user-configurable settings through the DXT manifest specification. This allows users to customize the extension behavior without modifying code.

## User Configuration Options

### 1. Bridge Data File Path

**Setting:** `data_file_path`  
**Type:** File path  
**Required:** No  
**Default:** `~/bridge.json` (your home directory)

**Description:**  
Specify the path to your Bridge experiential data file. This file stores all your captured moments and experiences.

**Usage:**
- Leave empty to use the default location in your home directory
- Specify a custom path to your existing `bridge.json` file
- The file must be a valid JSON file

**Examples:**
- `/Users/username/Documents/bridge.json` (macOS/Linux)
- `C:\Users\username\Documents\bridge.json` (Windows)
- `~/bridge-data/my-experiences.json` (relative to home directory)

### 2. Debug Mode

**Setting:** `debug_mode`  
**Type:** Boolean  
**Required:** No  
**Default:** `false`

**Description:**  
Enable debug logging for troubleshooting. When enabled, the extension will log detailed information about its operations, including search operations.

**Use cases:**
- Troubleshooting connection issues
- Understanding how the extension processes data
- Debugging search performance and relevance
- Development and testing

## Configuration Priority

The extension uses the following priority order for configuration:

1. **DXT User Configuration** (highest priority)
   - Settings configured through Claude Desktop extension settings
   - Environment variables set in the DXT manifest

2. **Environment Variables**
   - `BRIDGE_FILE_PATH` - Data file path
   - `BRIDGE_DEBUG` - Debug mode (true/false)

3. **Smart Defaults** (lowest priority)
   - Default data file: `~/bridge.json`
   - Debug mode: `false`

## Installation and Setup

### 1. Install the Extension

1. Open Claude Desktop
2. Go to Settings > Extensions
3. Drag and drop `bridge-experiential-data.dxt`
4. The extension will be installed and available

### 2. Configure Settings

1. In Claude Desktop, go to Settings > Extensions
2. Find "Bridge: Phenomenological Data Capture"
3. Click "Configure" or "Settings"
4. Set your preferred configuration options:
   - **Bridge Data File:** Path to your `bridge.json` file
   - **Debug Mode:** Enable for troubleshooting and search insights

### 3. Verify Configuration

The extension will log its configuration when debug mode is enabled. You can verify the settings are working by:

1. Enabling debug mode
2. Using any Bridge tool (capture, search, enrich, release)
3. Checking the logs for configuration information

## Migration from Previous Versions

If you have an existing `bridge.json` file:

1. **Default Location:** If your file is in the project root, move it to your home directory (`~/bridge.json`)
2. **Custom Location:** Use the DXT configuration to specify the path to your existing file
3. **Multiple Files:** You can switch between different data files by changing the configuration

## Troubleshooting

### Common Issues

**Extension not finding data file:**
- Verify the file path is correct and accessible
- Check that the file is a valid JSON file
- Ensure the path uses forward slashes (/) even on Windows

**Debug information not appearing:**
- Make sure debug mode is enabled in the extension settings
- Check Claude Desktop logs for extension output
- Verify the extension is properly installed

**Search not working as expected:**
- Enable debug mode to see detailed search logs
- Check that your data file contains valid experiential records
- Verify the file path is correctly configured

### Getting Help

- Check the Claude Desktop logs for error messages
- Enable debug mode to get detailed information
- Review the Bridge documentation for tool usage
- Report issues through the GitHub repository

## Technical Details

### Environment Variable Mapping

The DXT manifest maps user configuration to environment variables:

```json
{
  "server": {
    "mcp_config": {
      "env": {
        "BRIDGE_FILE_PATH": "${user_config.data_file_path}",
        "BRIDGE_DEBUG": "${user_config.debug_mode}",
        "BRIDGE_SEARCH_DEBUG": "${user_config.debug_mode}"
      }
    }
  }
}
```

### Configuration Validation

The extension validates configuration on startup:
- Ensures data file path is specified
- Validates file accessibility
- Logs configuration in debug mode
- Provides fallback to defaults if needed

### Cross-Platform Compatibility

- **File Paths:** Uses Node.js `path.join()` for cross-platform path handling
- **Home Directory:** Uses `os.homedir()` for platform-specific home directory detection
- **Environment Variables:** Supports both string and boolean values
- **File Access:** Validates file permissions and accessibility 