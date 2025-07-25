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
  vectorsPath?: string; // Deprecated
}

/**
 * Semantic search configuration constants
 */
export const SEMANTIC_CONFIG = {
  // Default threshold for semantic similarity (0-1 scale)
  // Lower values (0.3-0.5) = more inclusive, finds conceptually related matches
  // Higher values (0.7-0.9) = more strict, only very similar matches
  DEFAULT_THRESHOLD: 0.5,

  // Threshold for finding similar experiences during capture
  SIMILARITY_DETECTION_THRESHOLD: 0.25,

  // Scoring weights for recall operations
  SCORING_WEIGHTS: {
    TEXT_MATCH: 0.5, // 50% - Exact/partial text matching
    SEMANTIC: 0.3, // 30% - Semantic similarity via embeddings
    FILTER: 0.2, // 20% - Metadata filters (experiencer, perspective, etc.)
  },
} as const;

/**
 * Expands common path variables like ~ and $HOME
 * @param path - Path that may contain variables
 * @returns Expanded path
 */
function expandPath(path: string): string {
  if (!path) return path;

  // Replace ~ at the start of the path
  if (path.startsWith('~')) {
    path = path.replace(/^~/, homedir());
  }

  // Replace ${HOME} anywhere in the path
  if (path.includes('${HOME}')) {
    path = path.replace(/\$\{HOME\}/g, homedir());
  }

  // Replace $HOME anywhere in the path
  if (path.includes('$HOME')) {
    path = path.replace(/\$HOME/g, homedir());
  }

  return path;
}

/**
 * Get the default data file path for Bridge experiential data
 * @remarks
 * Priority order:
 * 1. User config from DXT (BRIDGE_FILE_PATH env var)
 * 2. Environment variable BRIDGE_FILE_PATH
 * 3. Default: ~/bridge.json (cross-platform)
 * @returns Path to bridge.json
 */
function getDefaultDataFilePath(): string {
  const userConfigPath = process.env.BRIDGE_FILE_PATH;
  if (typeof userConfigPath === 'string' && userConfigPath.trim().length > 0) {
    return expandPath(userConfigPath);
  }
  // Default to home directory
  return join(homedir(), 'bridge.json');
}

/**
 * Get the default Bridge configuration, using environment variables and smart defaults.
 * @returns Bridge configuration object
 */
function getDefaultConfig(): BridgeConfig {
  return {
    dataFilePath: getDefaultDataFilePath(),
    debugMode: process.env.BRIDGE_DEBUG === 'true' || process.env.BRIDGE_DEBUG === '1',
    vectorsPath: undefined, // Deprecated - embeddings are now stored in bridge.json
  };
}

let currentConfig = getDefaultConfig();

/**
 * Get a copy of the current Bridge configuration.
 * @returns Bridge configuration object
 */
export function getConfig(): BridgeConfig {
  return { ...currentConfig };
}

/**
 * Update the current Bridge configuration with partial updates.
 * @param updates - Partial config fields to update
 */
export function updateConfig(updates: Partial<BridgeConfig>): void {
  currentConfig = { ...currentConfig, ...updates };
}

/**
 * Set the data file path in the current config.
 * @param path - Path to bridge.json
 */
export function setDataFilePath(path: string): void {
  if (typeof path !== 'string' || path.trim().length === 0) {
    throw new Error('Data file path must be a non-empty string.');
  }
  currentConfig.dataFilePath = expandPath(path);
}

/**
 * Get the data file path from the current config.
 * @returns Data file path string
 */
export function getDataFilePath(): string {
  return currentConfig.dataFilePath;
}

/**
 * Check if debug mode is enabled.
 * @returns True if debug mode is enabled
 */
export function isDebugMode(): boolean {
  return currentConfig.debugMode;
}

/**
 * Deprecated function - use isDebugMode instead
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
  if (
    !currentConfig.dataFilePath ||
    typeof currentConfig.dataFilePath !== 'string' ||
    currentConfig.dataFilePath.trim().length === 0
  ) {
    throw new Error('Data file path is required and must be a non-empty string.');
  }
  // Configuration is valid - debug logging handled by MCP server
}

/**
 * Deprecated export - use getDataFilePath instead
 * @deprecated Use getDataFilePath instead. This export is for backward compatibility only.
 */
export const config = {
  bridgeFilePath: getDataFilePath(),
};
