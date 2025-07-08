import { promises as fs } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import type { 
  SourceRecord
} from './types.js';
import path from 'path';

// New StorageData interface
interface StorageData {
  sources: SourceRecord[];
}

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Storage configuration
const ENV = process.env.NODE_ENV || process.env.MCP_ENV || 'development';
let customDataFile: string | null = null;
let customStorageDir: string | null = null;

export function setStorageConfig({ dataFile, storageDir }: { dataFile?: string; storageDir?: string }): void {
  if (dataFile) customDataFile = dataFile;
  if (storageDir) customStorageDir = storageDir;
}

function getStorageDir(): string {
  if (customStorageDir) return customStorageDir;
  return join(__dirname, '..', 'data', ENV);
}

function getDataFile(): string {
  if (customDataFile) return customDataFile;
  // Fallback to bridge.json in the script directory
  return path.join(path.dirname(fileURLToPath(import.meta.url)), 'bridge.json');
}

// Ensure storage directory exists
async function ensureStorageDir(): Promise<void> {
  await fs.mkdir(getStorageDir(), { recursive: true });
}

// Helper to sanitize filenames (remove dangerous characters)
function sanitize(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

// Simplified file path validation
export async function validateFilePath(filePath: string, allowedRoots?: string[]): Promise<boolean> {
  // Disallow parent directory traversal
  if (filePath.includes('..')) {
    return false;
  }
  // Disallow absolute paths
  if (filePath.startsWith('/') || filePath.match(/^[a-zA-Z]:[\\/]/)) {
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

// Store a file in the managed storage directory
export async function storeFile(sourcePath: string, sourceId: string): Promise<string | null> {
  try {
    // Validate file
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

// Generate unique IDs
export function generateId(prefix: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `${prefix}_${timestamp}_${random}`;
}

// Read/write helpers for new JSON structure
async function readData(): Promise<StorageData> {
  await ensureStorageDir();
  try {
    const content = await fs.readFile(getDataFile(), 'utf8');
    return JSON.parse(content);
  } catch (error) {
    return { sources: [] };
  }
}

async function writeData(data: StorageData): Promise<void> {
  await ensureStorageDir();
  await fs.writeFile(getDataFile(), JSON.stringify(data, null, 2), 'utf8');
}

// Storage operations for sources
export async function saveSource(source: Omit<SourceRecord, 'type'>): Promise<SourceRecord> {
  const record: SourceRecord = { ...source, type: 'source' };
  const data = await readData();
  data.sources.push(record);
  await writeData(data);
  return record;
}

export async function getSources(): Promise<SourceRecord[]> {
  const data = await readData();
  return data.sources;
}

export async function getSource(id: string): Promise<SourceRecord | null> {
  const sources = await getSources();
  return sources.find(s => s.id === id) || null;
}

export async function deleteSource(id: string): Promise<void> {
  const data = await readData();
  data.sources = data.sources.filter(s => s.id !== id);
  await writeData(data);
}

// Helper: Get all records (sources only) as a single array with type preserved
export async function getAllRecords(): Promise<SourceRecord[]> {
  const data = await readData();
  return data.sources;
}

// Helper: Extract all searchable text from a record
export function getSearchableText(record: SourceRecord): string {
  return record.content;
} 