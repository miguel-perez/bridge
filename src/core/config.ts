import { homedir } from 'node:os';
import { join } from 'node:path';

// Configuration for Bridge DXT - supports user configuration through DXT
export interface BridgeConfig {
  dataFilePath: string;
  debugMode: boolean;
}

// Smart defaults for DXT environment
function getDefaultDataFilePath(): string {
  // Priority order for data file path:
  // 1. User config from DXT (BRIDGE_FILE_PATH env var)
  // 2. Environment variable BRIDGE_FILE_PATH
  // 3. Default: ~/bridge.json (cross-platform)
  
  const userConfigPath = process.env.BRIDGE_FILE_PATH;
  if (userConfigPath) {
    return userConfigPath;
  }
  
  // Default to home directory
  return join(homedir(), 'bridge.json');
}

function getDefaultConfig(): BridgeConfig {
  return {
    dataFilePath: getDefaultDataFilePath(),
    debugMode: process.env.BRIDGE_DEBUG === 'true' || process.env.BRIDGE_DEBUG === '1',
  };
}

let currentConfig = getDefaultConfig();

export function getConfig(): BridgeConfig {
  return { ...currentConfig };
}

export function updateConfig(updates: Partial<BridgeConfig>): void {
  currentConfig = { ...currentConfig, ...updates };
}

export function setDataFilePath(path: string): void {
  currentConfig.dataFilePath = path;
}

export function getDataFilePath(): string {
  return currentConfig.dataFilePath;
}

export function isDebugMode(): boolean {
  return currentConfig.debugMode;
}

export function isSearchDebugMode(): boolean {
  return currentConfig.debugMode;
}

// Validate configuration on startup
export function validateConfiguration(): void {
  if (!currentConfig.dataFilePath) {
    throw new Error('Data file path is required.');
  }
  
  // Log configuration in debug mode
  if (currentConfig.debugMode) {
    console.log('Bridge Configuration:', {
      dataFilePath: currentConfig.dataFilePath,
      debugMode: currentConfig.debugMode,
      nodeEnv: process.env.NODE_ENV,
    });
  }
}

// Export for backward compatibility
export const config = {
  bridgeFilePath: getDataFilePath(),
}; 