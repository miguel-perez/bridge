import { promises as fs } from 'fs';
import { join, dirname, resolve, relative } from 'path';
import { fileURLToPath } from 'url';
import type { 
  SourceRecord, 
  MomentRecord, 
  SynthesisRecord 
} from './types.js';

// New StorageData interface
interface StorageData {
  sources: SourceRecord[];
  moments: MomentRecord[];
  syntheses: SynthesisRecord[];
}

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Storage configuration
const ENV = process.env.NODE_ENV || process.env.MCP_ENV || 'development';
const STORAGE_DIR = join(__dirname, '..', 'data', ENV);
const DATA_FILE = join(STORAGE_DIR, 'data.json');

// Ensure storage directory exists
async function ensureStorageDir(): Promise<void> {
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create storage directory:', error);
    throw error;
  }
}

// Helper to sanitize filenames (remove dangerous characters)
function sanitize(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

// Store a file in the managed storage directory
export async function storeFile(sourcePath: string, sourceId: string): Promise<string | null> {
  try {
    await fs.access(sourcePath);
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const filesDir = join(STORAGE_DIR, 'files', year.toString(), month, day);
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
    const content = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    return { sources: [], moments: [], syntheses: [] };
  }
}

async function writeData(data: StorageData): Promise<void> {
  await ensureStorageDir();
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// Storage operations for sources
export async function saveSource(source: Omit<SourceRecord, 'type' | 'version' | 'previousVersion'>): Promise<SourceRecord> {
  const record: SourceRecord = { ...source, type: 'source', version: 1, previousVersion: null };
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

// Storage operations for moments
export async function saveMoment(moment: Omit<MomentRecord, 'type' | 'version' | 'previousVersion'>): Promise<MomentRecord> {
  const record: MomentRecord = { ...moment, type: 'moment', version: 1, previousVersion: null };
  const data = await readData();
  data.moments.push(record);
  await writeData(data);
  return record;
}

export async function getMoments(): Promise<MomentRecord[]> {
  const data = await readData();
  return data.moments;
}

export async function getRecentMoments(limit: number = 20): Promise<MomentRecord[]> {
  const moments = await getMoments();
  const sorted = moments.sort((a, b) => {
    const dateA = new Date(a.created);
    const dateB = new Date(b.created);
    return dateB.getTime() - dateA.getTime();
  });
  return sorted.slice(0, limit);
}

export async function getMoment(id: string): Promise<MomentRecord | null> {
  const moments = await getMoments();
  return moments.find(m => m.id === id) || null;
}

// Storage operations for syntheses
export async function saveSynthesis(synthesis: Omit<SynthesisRecord, 'type'>): Promise<SynthesisRecord> {
  const record: SynthesisRecord = { ...synthesis, type: 'synthesis' };
  const data = await readData();
  data.syntheses.push(record);
  await writeData(data);
  return record;
}

export async function getSyntheses(): Promise<SynthesisRecord[]> {
  const data = await readData();
  return data.syntheses;
}

export async function getSynthesis(id: string): Promise<SynthesisRecord | null> {
  const syntheses = await getSyntheses();
  return syntheses.find(s => s.id === id) || null;
}

// Query operations
export async function getUnframedSources(): Promise<SourceRecord[]> {
  const sources = await getSources();
  const moments = await getMoments();
  const framedSourceIds = new Set<string>();
  moments.forEach(moment => {
    moment.sources.forEach(src => framedSourceIds.add(src.sourceId));
  });
  return sources.filter(source => !framedSourceIds.has(source.id));
}

export async function getMomentsBySynthesis(synthesisId: string): Promise<MomentRecord[]> {
  const synthesis = await getSynthesis(synthesisId);
  if (!synthesis) return [];
  const moments = await getMoments();
  return moments.filter(m => synthesis.synthesizedMomentIds.includes(m.id));
}

// Helper: Find the latest version of a record given any ID
export async function getLatestRecord<T extends SourceRecord | MomentRecord>(id: string): Promise<T | null> {
  // For this simple JSON approach, just return the last record with the given id or previousVersion chain
  const data = await readData();
  const records: (SourceRecord | MomentRecord)[] = [...data.sources, ...data.moments];
  let current = records.find(r => r.id === id) as T | undefined;
  if (!current) return null;
  let next = records.find(r => r.previousVersion === current!.id) as T | undefined;
  while (next) {
    current = next;
    next = records.find(r => r.previousVersion === current!.id) as T | undefined;
  }
  return current ?? null;
}

// Update operations (create new versioned record, preserving append-only)
export async function updateSource(id: string, updates: Partial<SourceRecord>): Promise<SourceRecord | null> {
  const prev = await getLatestRecord<SourceRecord>(id);
  if (!prev) return null;
  const newId = generateId('src');
  const updated: SourceRecord = {
    ...prev,
    ...updates,
    id: newId,
    version: (prev.version || 1) + 1,
    previousVersion: prev.id,
    type: 'source',
    created: new Date().toISOString(),
  };
  const data = await readData();
  data.sources.push(updated);
  await writeData(data);
  return updated;
}

export async function updateMoment(id: string, updates: Partial<MomentRecord>): Promise<MomentRecord | null> {
  const prev = await getLatestRecord<MomentRecord>(id);
  if (!prev) return null;
  const newId = generateId('mom');
  const updated: MomentRecord = {
    ...prev,
    ...updates,
    id: newId,
    version: (prev.version || 1) + 1,
    previousVersion: prev.id,
    type: 'moment',
    created: new Date().toISOString(),
  };
  const data = await readData();
  data.moments.push(updated);
  await writeData(data);
  return updated;
}

// Search operations
export async function searchMoments(query: string): Promise<MomentRecord[]> {
  const moments = await getMoments();
  const lowerQuery = query.toLowerCase();
  return moments.filter(moment => 
    moment.summary.toLowerCase().includes(lowerQuery) ||
    (moment.narrative && moment.narrative.toLowerCase().includes(lowerQuery)) ||
    moment.emoji.includes(query)
  );
}

export async function getMomentsByPattern(pattern: string): Promise<MomentRecord[]> {
  const moments = await getMoments();
  return moments.filter(m => m.pattern === pattern);
}

export async function getMomentsByDateRange(start: Date, end: Date): Promise<MomentRecord[]> {
  const moments = await getMoments();
  return moments.filter(m => {
    const when = new Date(m.when || m.created);
    return when >= start && when <= end;
  });
}

// Add file path validation
export function validateFilePath(filePath: string, allowedRoots: string[] = []): boolean {
  const resolvedPath = resolve(filePath);
  if (allowedRoots.length > 0) {
    return allowedRoots.some(root => {
      const relativePath = relative(resolve(root), resolvedPath);
      return !relativePath.startsWith('..') && !relativePath.startsWith('/');
    });
  }
  return !filePath.includes('..');
}

// Add data consistency check
export async function validateDataIntegrity(): Promise<{
  valid: boolean;
  errors: string[];
  stats: {
    totalRecords: number;
    sources: number;
    moments: number;
    syntheses: number;
  };
}> {
  const errors: string[] = [];
  const data = await readData();
  const stats = {
    totalRecords: data.sources.length + data.moments.length + data.syntheses.length,
    sources: data.sources.length,
    moments: data.moments.length,
    syntheses: data.syntheses.length,
  };
  // Simple integrity checks
  data.moments.forEach(m => {
    m.sources.forEach(s => {
      if (!data.sources.find(src => src.id === s.sourceId)) {
        errors.push(`Moment ${m.id} references missing source ${s.sourceId}`);
      }
    });
  });
  data.syntheses.forEach(syn => {
    syn.synthesizedMomentIds.forEach(mid => {
      if (!data.moments.find(m => m.id === mid)) {
        errors.push(`Synthesis ${syn.id} references missing moment ${mid}`);
      }
    });
  });
  return { valid: errors.length === 0, errors, stats };
} 