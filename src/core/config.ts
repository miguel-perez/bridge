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
 * Recall and display configuration constants
 */
export const RECALL_CONFIG = {
  // Default limits for search operations
  DEFAULT_SEARCH_LIMIT: 50, // Default number of results for searches
  DEFAULT_GROUP_LIMIT: 100, // Default number of results when grouping
  DEFAULT_AUTO_RECALL_LIMIT: 20, // Default for automatic recall
  
  // Display configuration
  TEXT_TRUNCATION_LENGTH: 500, // Characters to show before truncating
  SHOW_ALL_GROUP_MEMBERS: true, // Whether to show all experiences in groups
  
  // Dual view configuration
  RECENT_FLOW_LIMIT: 10, // Number of recent experiences to show
  EMERGING_PATTERNS_LIMIT: 100, // Number of experiences to analyze for patterns
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

  // Replace ${DOCUMENTS} with platform-specific Documents directory
  if (path.includes('${DOCUMENTS}')) {
    const documentsDir = join(homedir(), 'Documents');
    path = path.replace(/\$\{DOCUMENTS\}/g, documentsDir);
  }

  return path;
}

/**
 * Get the default data file path for Bridge experiential data
 * @remarks
 * Priority order:
 * 1. User config from DXT (BRIDGE_FILE_PATH env var)
 * 2. Environment variable BRIDGE_FILE_PATH
 * 3. Default: ~/Documents/Bridge/experiences.json (cross-platform)
 * @returns Path to bridge.json
 */
function getDefaultDataFilePath(): string {
  const userConfigPath = process.env.BRIDGE_FILE_PATH;
  if (typeof userConfigPath === 'string' && userConfigPath.trim().length > 0) {
    return expandPath(userConfigPath);
  }
  // Default to ~/Documents/Bridge/experiences.json
  const documentsDir = join(homedir(), 'Documents');
  const bridgeDir = join(documentsDir, 'Bridge');
  return join(bridgeDir, 'experiences.json');
}

/**
 * Get the default Bridge configuration, using environment variables and smart defaults.
 * @returns Bridge configuration object
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
 * Validate the current configuration. Throws if invalid.
 * Note: Debug logging is handled by MCP server, not stdout logging
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
