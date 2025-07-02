import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { 
  StorageRecord, 
  SourceRecord, 
  MomentRecord, 
  SynthesisRecord, 
  SessionRecord 
} from './types.js';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Storage configuration
const STORAGE_DIR = join(__dirname, '..', 'data');
const DATA_FILE = join(STORAGE_DIR, 'data.jsonl');
const SESSIONS_FILE = join(STORAGE_DIR, 'sessions.jsonl');

// Ensure storage directory exists
async function ensureStorageDir(): Promise<void> {
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create storage directory:', error);
    throw error;
  }
}

// Generate unique IDs
export function generateId(prefix: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `${prefix}_${timestamp}_${random}`;
}

// Append a record to JSONL file
async function appendRecord(file: string, record: StorageRecord): Promise<void> {
  await ensureStorageDir();
  const line = JSON.stringify(record) + '\n';
  await fs.appendFile(file, line, 'utf8');
}

// Read all records from JSONL file
async function readRecords<T extends StorageRecord>(file: string): Promise<T[]> {
  await ensureStorageDir();
  
  try {
    const content = await fs.readFile(file, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    return lines.map(line => JSON.parse(line) as T);
  } catch (error: any) {
    // File doesn't exist yet, return empty array
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

// Storage operations for sources
export async function saveSource(source: Omit<SourceRecord, 'type'>): Promise<SourceRecord> {
  const record: SourceRecord = { ...source, type: 'source' };
  await appendRecord(DATA_FILE, record);
  return record;
}

export async function getSources(): Promise<SourceRecord[]> {
  const records = await readRecords<StorageRecord>(DATA_FILE);
  return records.filter((r): r is SourceRecord => r.type === 'source');
}

export async function getSource(id: string): Promise<SourceRecord | null> {
  const sources = await getSources();
  return sources.find(s => s.id === id) || null;
}

// Storage operations for moments
export async function saveMoment(moment: Omit<MomentRecord, 'type'>): Promise<MomentRecord> {
  const record: MomentRecord = { ...moment, type: 'moment' };
  await appendRecord(DATA_FILE, record);
  return record;
}

export async function getMoments(): Promise<MomentRecord[]> {
  const records = await readRecords<StorageRecord>(DATA_FILE);
  return records.filter((r): r is MomentRecord => r.type === 'moment');
}

export async function getMoment(id: string): Promise<MomentRecord | null> {
  const moments = await getMoments();
  return moments.find(m => m.id === id) || null;
}

// Storage operations for syntheses
export async function saveSynthesis(synthesis: Omit<SynthesisRecord, 'type'>): Promise<SynthesisRecord> {
  const record: SynthesisRecord = { ...synthesis, type: 'synthesis' };
  await appendRecord(DATA_FILE, record);
  return record;
}

export async function getSyntheses(): Promise<SynthesisRecord[]> {
  const records = await readRecords<StorageRecord>(DATA_FILE);
  return records.filter((r): r is SynthesisRecord => r.type === 'synthesis');
}

export async function getSynthesis(id: string): Promise<SynthesisRecord | null> {
  const syntheses = await getSyntheses();
  return syntheses.find(s => s.id === id) || null;
}

// Storage operations for sessions
export async function saveSession(session: Omit<SessionRecord, 'type'>): Promise<SessionRecord> {
  const record: SessionRecord = { ...session, type: 'session' };
  await appendRecord(SESSIONS_FILE, record);
  return record;
}

export async function getSessions(): Promise<SessionRecord[]> {
  return readRecords<SessionRecord>(SESSIONS_FILE);
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

// Update operations (create new record with updates, preserving append-only)
export async function updateSource(id: string, updates: Partial<SourceRecord>): Promise<SourceRecord | null> {
  const source = await getSource(id);
  if (!source) return null;
  
  const updated: SourceRecord = { ...source, ...updates, type: 'source', id };
  await appendRecord(DATA_FILE, updated);
  return updated;
}

export async function updateMoment(id: string, updates: Partial<MomentRecord>): Promise<MomentRecord | null> {
  const moment = await getMoment(id);
  if (!moment) return null;
  
  const updated: MomentRecord = { ...moment, ...updates, type: 'moment', id };
  await appendRecord(DATA_FILE, updated);
  return updated;
}

// Get the latest version of a record (for append-only updates)
export async function getLatestRecord<T extends StorageRecord>(id: string): Promise<T | null> {
  const records = await readRecords<StorageRecord>(DATA_FILE);
  const matching = records.filter(r => r.id === id);
  return matching.length > 0 ? matching[matching.length - 1] as T : null;
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