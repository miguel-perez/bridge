/**
 * Core storage functionality for Bridge experiential data.
 * Handles file-based storage with JSON persistence, file management,
 * and data validation for the Bridge MCP system.
 */

import { promises as fs } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { nanoid } from 'nanoid';
import type { SourceRecord } from './types.js';
import path from 'path';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default storage configuration */
export const STORAGE_DEFAULTS = {
  ENV: 'development',
  ID_PREFIX: 'src',
  FILE_ENCODING: 'utf8' as const,
  JSON_INDENT: 2
} as const;

/** File patterns and extensions */
export const FILE_PATTERNS = {
  DANGEROUS_CHARS: /[^a-zA-Z0-9._-]/g,
  PARENT_DIR: /\.\./,
  ABSOLUTE_PATH: /^[a-zA-Z]:[\\/]/,
  WINDOWS_ABSOLUTE: /^[a-zA-Z]:[\\/]/
} as const;

/** Storage data structure */
interface StorageData {
  sources: SourceRecord[];
}

// ============================================================================
// MODULE SETUP
// ============================================================================

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Storage configuration
const ENV = process.env.NODE_ENV || process.env.MCP_ENV || STORAGE_DEFAULTS.ENV;
let customDataFile: string | null = null;
let customStorageDir: string | null = null;

// ============================================================================
// CONFIGURATION FUNCTIONS
// ============================================================================

/**
 * Sets custom storage configuration.
 * @param config - Configuration options
 * @param config.dataFile - Custom data file path
 * @param config.storageDir - Custom storage directory
 */
export function setStorageConfig({ dataFile, storageDir }: { dataFile?: string; storageDir?: string }): void {
  if (dataFile) customDataFile = dataFile;
  if (storageDir) customStorageDir = storageDir;
}

/**
 * Gets the storage directory path.
 * @returns The storage directory path
 */
function getStorageDir(): string {
  if (customStorageDir) return customStorageDir;
  return join(__dirname, '..', 'data', ENV);
}

/**
 * Gets the data file path with fallback logic.
 * @returns The data file path
 */
function getDataFile(): string {
  if (customDataFile) return customDataFile;
  
  // Use configurable data file path, fallback to bridge.json in the script directory
  const configPath = process.env.BRIDGE_FILE_PATH || 'bridge.json';
  
  if (configPath.startsWith('/') || configPath.match(FILE_PATTERNS.ABSOLUTE_PATH)) {
    return configPath; // Absolute path
  }
  
  // Relative path - resolve from project root
  return path.join(process.cwd(), configPath);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Ensures the storage directory exists.
 * @throws Error if directory creation fails
 */
async function ensureStorageDir(): Promise<void> {
  try {
    await fs.mkdir(getStorageDir(), { recursive: true });
  } catch (error) {
    throw new Error(`Failed to create storage directory: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Sanitizes filenames by removing dangerous characters.
 * @param filename - The filename to sanitize
 * @returns Sanitized filename
 */
function sanitize(filename: string): string {
  return filename.replace(FILE_PATTERNS.DANGEROUS_CHARS, '_');
}

/**
 * Validates file paths for security.
 * @param filePath - The file path to validate
 * @param allowedRoots - Optional list of allowed root directories
 * @returns True if the path is valid and safe
 */
export async function validateFilePath(filePath: string, allowedRoots?: string[]): Promise<boolean> {
  // Disallow parent directory traversal
  if (filePath.includes('..')) {
    return false;
  }
  
  // Disallow absolute paths
  if (filePath.startsWith('/') || filePath.match(FILE_PATTERNS.ABSOLUTE_PATH)) {
    return false;
  }
  
  // If allowedRoots is provided, ensure the resolved path is within one of them
  if (allowedRoots && allowedRoots.length > 0) {
    const resolved = resolve(filePath);
    const isAllowed = allowedRoots.some(root => resolved.startsWith(resolve(root)));
    if (!isAllowed) return false;
  }
  
  // For test purposes, allow safe paths even if file does not exist
  return true;
}

/**
 * Validates storage data structure.
 * @param data - The data to validate
 * @returns True if the data is valid
 */
function validateStorageData(data: unknown): data is StorageData {
  if (!data || typeof data !== 'object') return false;
  
  const d = data as StorageData;
  return Array.isArray(d.sources);
}

// ============================================================================
// FILE MANAGEMENT
// ============================================================================

/**
 * Stores a file in the managed storage directory with organized structure.
 * @param sourcePath - Path to the source file
 * @param sourceId - Unique identifier for the source
 * @returns Relative path to stored file or null if failed
 * @throws Error if file operations fail
 */
export async function storeFile(sourcePath: string, sourceId: string): Promise<string | null> {
  try {
    // Validate file path
    if (!await validateFilePath(sourcePath)) {
      return null;
    }
    
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    const filesDir = join(getStorageDir(), 'files', year.toString(), month, day);
    await fs.mkdir(filesDir, { recursive: true });
    
    const origName = sanitize(sourcePath.split(/[\\/]/).pop() || 'file');
    const destName = `${sourceId}_${origName}`;
    const destPath = join(filesDir, destName);
    
    await fs.copyFile(sourcePath, destPath);
    return join('files', year.toString(), month, day, destName);
  } catch (err: unknown) {
    if (typeof err === 'object' && err && 'code' in err && (err as { code?: string }).code === 'ENOENT') {
      return null;
    }
    throw new Error(`Failed to store file: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// ============================================================================
// ID GENERATION
// ============================================================================

/**
 * Generates unique IDs with optional prefix.
 * @param prefix - Optional prefix for the ID
 * @returns Unique ID string
 */
export function generateId(prefix: string = STORAGE_DEFAULTS.ID_PREFIX): string {
  const id = nanoid();
  return `${prefix}_${id}`;
}

// ============================================================================
// DATA PERSISTENCE
// ============================================================================

/**
 * Reads storage data from file with fallback to empty structure.
 * @returns Storage data object
 * @throws Error if file operations fail
 */
async function readData(): Promise<StorageData> {
  await ensureStorageDir();
  
  try {
    const content = await fs.readFile(getDataFile(), STORAGE_DEFAULTS.FILE_ENCODING);
    const data = JSON.parse(content);
    
    // Validate data structure
    if (!validateStorageData(data)) {
      console.warn('Invalid storage data structure, using empty data');
      return { sources: [] };
    }
    
    return data;
  } catch (error) {
    // If file doesn't exist or is invalid, return empty structure
    if (error instanceof Error && error.message.includes('ENOENT')) {
      return { sources: [] };
    }
    
    console.warn('Failed to read storage data, using empty data:', error);
    return { sources: [] };
  }
}

/**
 * Writes storage data to file with error handling.
 * @param data - The data to write
 * @throws Error if file operations fail
 */
async function writeData(data: StorageData): Promise<void> {
  await ensureStorageDir();
  
  try {
    const jsonString = JSON.stringify(data, null, STORAGE_DEFAULTS.JSON_INDENT);
    await fs.writeFile(getDataFile(), jsonString, STORAGE_DEFAULTS.FILE_ENCODING);
  } catch (error) {
    throw new Error(`Failed to write storage data: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// ============================================================================
// SOURCE OPERATIONS
// ============================================================================

/**
 * Saves a source record to storage.
 * @param source - The source data to save (without type field)
 * @returns The saved source record with type field
 * @throws Error if storage operations fail
 */
export async function saveSource(source: Omit<SourceRecord, 'type'>): Promise<SourceRecord> {
  const record: SourceRecord = { ...source, type: 'source' };
  const data = await readData();
  data.sources.push(record);
  await writeData(data);
  return record;
}

/**
 * Retrieves all source records from storage.
 * @returns Array of source records
 * @throws Error if storage operations fail
 */
export async function getSources(): Promise<SourceRecord[]> {
  const data = await readData();
  return data.sources;
}

/**
 * Retrieves a specific source record by ID.
 * @param id - The source ID to retrieve
 * @returns The source record or null if not found
 * @throws Error if storage operations fail
 */
export async function getSource(id: string): Promise<SourceRecord | null> {
  const sources = await getSources();
  return sources.find(s => s.id === id) || null;
}

/**
 * Deletes a source record by ID.
 * @param id - The source ID to delete
 * @throws Error if storage operations fail
 */
export async function deleteSource(id: string): Promise<void> {
  const data = await readData();
  data.sources = data.sources.filter(s => s.id !== id);
  await writeData(data);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Gets all records (sources only) as a single array with type preserved.
 * @returns Array of all source records
 * @throws Error if storage operations fail
 */
export async function getAllRecords(): Promise<SourceRecord[]> {
  const data = await readData();
  return data.sources;
}

/**
 * Extracts all searchable text from a record.
 * @param record - The source record
 * @returns Searchable text content
 */
export function getSearchableText(record: SourceRecord): string {
  return record.content;
}

// ============================================================================
// TEST UTILITIES
// ============================================================================

/**
 * Clears the current data file (for test use only).
 * @throws Error if file operations fail
 */
export async function clearTestStorage(): Promise<void> {
  await ensureStorageDir();
  await fs.writeFile(getDataFile(), JSON.stringify({ sources: [] }, null, STORAGE_DEFAULTS.JSON_INDENT), STORAGE_DEFAULTS.FILE_ENCODING);
} 