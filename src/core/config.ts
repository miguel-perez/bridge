// Configuration for Bridge DXT - simplified for local-only operation

export interface BridgeConfig {
  dataFilePath: string;
}

// Default configuration - use bridge.json in root directory
const defaultConfig: BridgeConfig = {
  dataFilePath: process.env.BRIDGE_FILE_PATH || 'bridge.json',
};

let currentConfig = { ...defaultConfig };

export function getConfig(): BridgeConfig {
  return currentConfig;
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

// Validate configuration on startup
export function validateConfiguration(): void {
  if (!currentConfig.dataFilePath) {
    throw new Error('Data file path is required.');
  }
}

export const config = {
  bridgeFilePath: getDataFilePath(),
}; 