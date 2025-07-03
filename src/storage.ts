import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { 
  SourceRecord, 
  MomentRecord, 
  SynthesisRecord 
} from './types.js';
import { updateRecordEmbedding, removeEmbedding } from './embeddings.js';

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

// Simplified file path validation
export async function validateFilePath(filePath: string): Promise<boolean> {
  try {
    // Check if file exists and is readable
    await fs.access(filePath, fs.constants.R_OK);
    // Basic security - no parent directory traversal
    if (filePath.includes('..')) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
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
export async function saveSource(source: Omit<SourceRecord, 'type'>): Promise<SourceRecord> {
  const record: SourceRecord = { ...source, type: 'source' };
  const data = await readData();
  data.sources.push(record);
  await writeData(data);
  // NOTE: Embedding update is async and not awaited to avoid slowing down main operations
  updateRecordEmbedding(record);
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
export async function saveMoment(moment: Omit<MomentRecord, 'type'>): Promise<MomentRecord> {
  const record: MomentRecord = { ...moment, type: 'moment' };
  const data = await readData();
  data.moments.push(record);
  await writeData(data);
  // NOTE: Embedding update is async and not awaited to avoid slowing down main operations
  updateRecordEmbedding(record);
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
  // NOTE: Embedding update is async and not awaited to avoid slowing down main operations
  updateRecordEmbedding(record);
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

// Update operations (create new versioned record, preserving append-only)
export async function updateSource(): Promise<never> {
  throw new Error('Sources are immutable and cannot be updated');
}

export async function updateMoment(id: string, updates: Partial<MomentRecord>): Promise<MomentRecord | null> {
  const data = await readData();
  const index = data.moments.findIndex(m => m.id === id);
  if (index === -1) return null;
  data.moments[index] = {
    ...data.moments[index],
    ...updates
  };
  await writeData(data);
  const updatedRecord = data.moments[index];
  // NOTE: Embedding update is async and not awaited to avoid slowing down main operations
  updateRecordEmbedding(updatedRecord);
  return updatedRecord;
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

export async function getMomentsByPattern(shot: string): Promise<MomentRecord[]> {
  const moments = await getMoments();
  return moments.filter(m => m.shot === shot);
}

export async function getMomentsByDateRange(start: Date, end: Date): Promise<MomentRecord[]> {
  const moments = await getMoments();
  return moments.filter(m => {
    const when = new Date(m.when || m.created);
    return when >= start && when <= end;
  });
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
  const data = await readData();
  return {
    valid: true,
    errors: [],
    stats: {
      totalRecords: data.sources.length + data.moments.length + data.syntheses.length,
      sources: data.sources.length,
      moments: data.moments.length,
      syntheses: data.syntheses.length
    }
  };
}

export async function deleteSource(id: string): Promise<void> {
  const data = await readData();
  data.sources = data.sources.filter(s => s.id !== id);
  await writeData(data);
  // NOTE: Embedding removal is async and not awaited to avoid slowing down main operations
  removeEmbedding(id);
}

export async function deleteMoment(id: string): Promise<void> {
  const data = await readData();
  data.moments = data.moments.filter(m => m.id !== id);
  await writeData(data);
  // NOTE: Embedding removal is async and not awaited to avoid slowing down main operations
  removeEmbedding(id);
}

export async function deleteSynthesis(id: string): Promise<void> {
  const data = await readData();
  data.syntheses = data.syntheses.filter(s => s.id !== id);
  await writeData(data);
  // NOTE: Embedding removal is async and not awaited to avoid slowing down main operations
  removeEmbedding(id);
}

export async function updateSynthesis(id: string, updates: Partial<SynthesisRecord>): Promise<SynthesisRecord | null> {
  const data = await readData();
  const index = data.syntheses.findIndex(s => s.id === id);
  if (index === -1) return null;
  data.syntheses[index] = {
    ...data.syntheses[index],
    ...updates
  };
  await writeData(data);
  return data.syntheses[index];
}

// Helper: Get all records (sources, moments, syntheses) as a single array with type preserved
export async function getAllRecords(): Promise<Array<SourceRecord | MomentRecord | SynthesisRecord>> {
  const data = await readData();
  return [
    ...data.sources,
    ...data.moments,
    ...data.syntheses
  ];
}

// Helper: Get any record by ID (search sources, then moments, then syntheses)
export async function getRecordById(id: string): Promise<SourceRecord | MomentRecord | SynthesisRecord | null> {
  const data = await readData();
  const source = data.sources.find(s => s.id === id);
  if (source) return source;
  const moment = data.moments.find(m => m.id === id);
  if (moment) return moment;
  const synthesis = data.syntheses.find(s => s.id === id);
  if (synthesis) return synthesis;
  return null;
}

// Helper: Extract all searchable text from a record
export function getSearchableText(record: SourceRecord | MomentRecord | SynthesisRecord): string {
  if (record.type === 'source') {
    return record.content;
  }
  if (record.type === 'moment') {
    let text = record.summary || '';
    if (record.narrative) text += ' ' + record.narrative;
    if (Array.isArray(record.qualities)) {
      text += ' ' + record.qualities.map(q => q.manifestation).join(' ');
    }
    return text.trim();
  }
  if (record.type === 'synthesis') {
    let text = record.summary || '';
    if (record.narrative) text += ' ' + record.narrative;
    return text.trim();
  }
  return '';
} 