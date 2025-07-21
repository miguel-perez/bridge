/**
 * Core storage functionality for Bridge experiential data.
 * Handles file-based storage with JSON persistence, file management,
 * and data validation for the Bridge MCP system.
 */

import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import path from 'path';
import type { Source, EmbeddingRecord, StorageData } from './types.js';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default storage configuration */
export const STORAGE_DEFAULTS = {
  ENV: 'development',
  ID_PREFIX: 'exp',
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



// ============================================================================
// MODULE SETUP
// ============================================================================

// Get the directory of the current module

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
  return join(process.cwd(), 'data', ENV);
}

/**
 * Gets the data file path with fallback logic.
 * @returns The data file path
 */
function getDataFile(): string {
  if (customDataFile) {
    return customDataFile;
  }
  
  // Use configurable data file path, fallback to bridge.json in the script directory
  const configPath = process.env.BRIDGE_FILE_PATH || 'bridge.json';
  
  let finalPath: string;
  if (configPath.startsWith('/') || configPath.match(FILE_PATTERNS.ABSOLUTE_PATH)) {
    finalPath = configPath; // Absolute path
  } else {
    // Relative path - resolve from project root
    finalPath = path.join(process.cwd(), configPath);
  }
  
  return finalPath;
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
 * Uses shorter IDs (8 chars) for better UX while maintaining uniqueness.
 * @param prefix - Optional prefix for the ID
 * @returns Unique ID string like 'exp_Ab3x9kLm'
 */
export async function generateId(prefix: string = STORAGE_DEFAULTS.ID_PREFIX): Promise<string> {
  const { nanoid } = await import('nanoid');
  // Generate shorter 8-character IDs for better UX
  const id = nanoid(8);
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
  // Don't ensure storage dir just for reading the data file
  // Only ensure it when we actually need to write to it
  
  const dataFile = getDataFile();
  // Debug:('[DEBUG] readData: Attempting to read from:', dataFile);
  
  try {
    const content = await fs.readFile(dataFile, STORAGE_DEFAULTS.FILE_ENCODING);
    // Debug:('[DEBUG] readData: File read successfully, content length:', content.length);
    
    const data = JSON.parse(content);
    // Debug:('[DEBUG] readData: JSON parsed successfully, sources count:', data.sources?.length || 0);
    
    // Validate data structure
    if (!validateStorageData(data)) {
      // Debug:('[DEBUG] readData: Invalid data structure, returning empty');
      return { sources: [], embeddings: [] };
    }
    
    // Clean up any legacy type fields from records
    const sources: Source[] = data.sources.map((s: any) => {
      const newObj = { ...s };
      delete newObj.type;
      delete newObj.embedding; // Remove embedding field from sources
      return newObj;
    });
    
    // Ensure embeddings array exists
    const embeddings: EmbeddingRecord[] = data.embeddings || [];
    
    return { sources, embeddings };
  } catch (error) {
    // If file doesn't exist or is invalid, return empty structure
    // Debug:('[DEBUG] readData: Error reading file:', error);
    if (error instanceof Error && error.message.includes('ENOENT')) {
      // Debug:('[DEBUG] readData: File does not exist, returning empty');
      return { sources: [], embeddings: [] };
    }
    
    // Debug:('[DEBUG] readData: Other error, returning empty');
    return { sources: [], embeddings: [] };
  }
}

/**
 * Writes storage data to file with error handling.
 * @param data - The data to write
 * @throws Error if file operations fail
 */
async function writeData(data: StorageData): Promise<void> {
  // Ensure the data file's directory exists (not the storage dir)
  const dataFilePath = getDataFile();
  const dataFileDir = path.dirname(dataFilePath);
  
  try {
    await fs.mkdir(dataFileDir, { recursive: true });
  } catch (error) {
    throw new Error(`Failed to create data file directory: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  try {
    const jsonString = JSON.stringify(data, null, STORAGE_DEFAULTS.JSON_INDENT);
    await fs.writeFile(dataFilePath, jsonString, STORAGE_DEFAULTS.FILE_ENCODING);
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
export async function saveSource(source: Source): Promise<Source> {
  const data = await readData();
  data.sources.push(source);
  await writeData(data);
  return source;
}

/**
 * Updates an existing source record in storage.
 * @param source - The source data to update (must include id)
 * @returns The updated source record
 * @throws Error if source not found or storage operations fail
 */
export async function updateSource(source: Source): Promise<Source> {
  const data = await readData();
  const index = data.sources.findIndex(s => s.id === source.id);
  
  if (index === -1) {
    throw new Error(`Source not found: ${source.id}`);
  }
  
  // Update the source record
  data.sources[index] = source;
  await writeData(data);
  
  return data.sources[index];
}

/**
 * Retrieves all source records from storage.
 * @returns Array of source records
 * @throws Error if storage operations fail
 */
export async function getSources(): Promise<Source[]> {
  const data = await readData();
  return data.sources;
}

/**
 * Retrieves a specific source record by ID.
 * @param id - The source ID to retrieve
 * @returns The source record or null if not found
 * @throws Error if storage operations fail
 */
export async function getSource(id: string): Promise<Source | null> {
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
  // Also remove any associated embeddings
  data.embeddings = data.embeddings?.filter(e => e.sourceId !== id) || [];
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
export async function getAllRecords(): Promise<Source[]> {
  // Debug:('[DEBUG] getAllRecords: Called');
  const data = await readData();
  // Debug:('[DEBUG] getAllRecords: Returning', data.sources.length, 'records');
  return data.sources;
}

// ============================================================================
// EMBEDDING OPERATIONS
// ============================================================================

/**
 * Saves an embedding record to storage.
 * @param embedding - The embedding record to save
 * @returns The saved embedding record
 * @throws Error if storage operations fail
 */
export async function saveEmbedding(embedding: EmbeddingRecord): Promise<EmbeddingRecord> {
  const data = await readData();
  // Remove any existing embedding for this source
  data.embeddings = data.embeddings?.filter(e => e.sourceId !== embedding.sourceId) || [];
  data.embeddings.push(embedding);
  await writeData(data);
  return embedding;
}

/**
 * Retrieves an embedding record by source ID.
 * @param sourceId - The source ID to retrieve embedding for
 * @returns The embedding record or null if not found
 * @throws Error if storage operations fail
 */
export async function getEmbedding(sourceId: string): Promise<EmbeddingRecord | null> {
  const data = await readData();
  return data.embeddings?.find(e => e.sourceId === sourceId) || null;
}

/**
 * Retrieves all embedding records.
 * @returns Array of all embedding records
 * @throws Error if storage operations fail
 */
export async function getAllEmbeddings(): Promise<EmbeddingRecord[]> {
  const data = await readData();
  return data.embeddings || [];
}

/**
 * Deletes an embedding record by source ID.
 * @param sourceId - The source ID to delete embedding for
 * @throws Error if storage operations fail
 */
export async function deleteEmbedding(sourceId: string): Promise<void> {
  const data = await readData();
  data.embeddings = data.embeddings?.filter(e => e.sourceId !== sourceId) || [];
  await writeData(data);
}

/**
 * Extracts all searchable text from a record.
 * @param record - The source record
 * @returns Searchable text content
 */
export function getSearchableText(record: Source): string {
  return record.source;
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
  await fs.writeFile(getDataFile(), JSON.stringify({ sources: [], embeddings: [] }, null, STORAGE_DEFAULTS.JSON_INDENT), STORAGE_DEFAULTS.FILE_ENCODING);
}

/**
 * Sets up test-specific storage configuration (for test use only).
 * Uses a unique file path to prevent test interference.
 * @param testName - Name of the test for unique file naming
 */
export function setupTestStorage(testName: string): void {
  const testId = testName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
  const testDataFile = join(getStorageDir(), `test_${testId}_bridge.json`);
  setStorageConfig({ dataFile: testDataFile });
} 