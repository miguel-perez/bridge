import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * Bridge DXT configuration module.
 * Handles user configuration, environment variable overrides, and smart defaults for Bridge MCP.
 * Provides runtime config mutation and validation utilities.
 */

/**
 * Configuration shape for Bridge MCP.
 */
export interface BridgeConfig {
  dataFilePath: string;
  debugMode: boolean;
}

/**
 * Get the default data file path for Bridge experiential data.
 * Priority order:
 *   1. User config from DXT (BRIDGE_FILE_PATH env var)
 *   2. Environment variable BRIDGE_FILE_PATH
 *   3. Default: ~/bridge.json (cross-platform)
 * @returns {string} Path to bridge.json
 */
function getDefaultDataFilePath(): string {
  const userConfigPath = process.env.BRIDGE_FILE_PATH;
  if (typeof userConfigPath === 'string' && userConfigPath.trim().length > 0) {
    return userConfigPath;
  }
  // Default to home directory
  return join(homedir(), 'bridge.json');
}

/**
 * Get the default Bridge configuration, using environment variables and smart defaults.
 * @returns {BridgeConfig}
 */
function getDefaultConfig(): BridgeConfig {
  return {
    dataFilePath: getDefaultDataFilePath(),
    debugMode: process.env.BRIDGE_DEBUG === 'true' || process.env.BRIDGE_DEBUG === '1',
  };
}

let currentConfig = getDefaultConfig();

/**
 * Get a copy of the current Bridge configuration.
 * @returns {BridgeConfig}
 */
export function getConfig(): BridgeConfig {
  return { ...currentConfig };
}

/**
 * Update the current Bridge configuration with partial updates.
 * @param updates Partial config fields to update
 */
export function updateConfig(updates: Partial<BridgeConfig>): void {
  currentConfig = { ...currentConfig, ...updates };
}

/**
 * Set the data file path in the current config.
 * @param path Path to bridge.json
 */
export function setDataFilePath(path: string): void {
  if (typeof path !== 'string' || path.trim().length === 0) {
    throw new Error('Data file path must be a non-empty string.');
  }
  currentConfig.dataFilePath = path;
}

/**
 * Get the data file path from the current config.
 * @returns {string}
 */
export function getDataFilePath(): string {
  return currentConfig.dataFilePath;
}

/**
 * Check if debug mode is enabled.
 * @returns {boolean}
 */
export function isDebugMode(): boolean {
  return currentConfig.debugMode;
}

/**
 * @deprecated Use isDebugMode instead. This alias is for backward compatibility only.
 */
export function isSearchDebugMode(): boolean {
  return currentConfig.debugMode;
}

/**
 * Validate the current configuration. Throws if invalid.
 * Note: Debug logging is handled by MCP server, not console.log
 */
export function validateConfiguration(): void {
  if (!currentConfig.dataFilePath || typeof currentConfig.dataFilePath !== 'string' || currentConfig.dataFilePath.trim().length === 0) {
    throw new Error('Data file path is required and must be a non-empty string.');
  }
  // Configuration is valid - debug logging handled by MCP server
}

/**
 * @deprecated Use getDataFilePath instead. This export is for backward compatibility only.
 */
export const config = {
  bridgeFilePath: getDataFilePath(),
}; 