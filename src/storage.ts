import { promises as fs } from 'fs';
import { join, dirname, resolve, relative } from 'path';
import { fileURLToPath } from 'url';
import type { 
  StorageRecord, 
  SourceRecord, 
  MomentRecord, 
  SynthesisRecord, 
  SessionRecord 
} from './types.js';
// Simple cache implementation without external dependency
class SimpleCache<K, V> {
  private cache = new Map<K, { value: V; expires: number }>();
  private maxSize: number;
  private ttl: number;

  constructor(options: { max: number; ttl: number }) {
    this.maxSize = options.max;
    this.ttl = options.ttl;
  }

  set(key: K, value: V): void {
    this.cleanup();
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, { value, expires: Date.now() + this.ttl });
  }

  get(key: K): V | undefined {
    const item = this.cache.get(key);
    if (!item || item.expires < Date.now()) {
      this.cache.delete(key);
      return undefined;
    }
    return item.value;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (item.expires < now) {
        this.cache.delete(key);
      }
    }
  }
}

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Storage configuration
const STORAGE_DIR = join(__dirname, '..', 'data');
const DATA_FILE = join(STORAGE_DIR, 'data.jsonl');
const SESSIONS_FILE = join(STORAGE_DIR, 'sessions.jsonl');

// Cache for frequently accessed records
const recordCache = new SimpleCache<string, StorageRecord[]>({
  max: 1000,
  ttl: 1000 * 60 * 5, // 5 minutes
});

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

// Improved error handling wrapper
async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.error(`Storage error in ${context}:`, error);
    throw new Error(`${context} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Optimized record reading with streaming for large files
async function readRecordsStream<T extends StorageRecord>(
  file: string,
  filter?: (record: T) => boolean
): Promise<T[]> {
  return withErrorHandling(async () => {
    await ensureStorageDir();
    
    try {
      const content = await fs.readFile(file, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());
      const results: T[] = [];
      
      for (const line of lines) {
        try {
          const record = JSON.parse(line) as T;
          if (!filter || filter(record)) {
            results.push(record);
          }
        } catch (parseError) {
          console.warn(`Skipping invalid JSON line in ${file}:`, line);
          continue;
        }
      }
      
      return results;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }, `reading records from ${file}`);
}



// Storage operations for sources
export async function saveSource(source: Omit<SourceRecord, 'type'>): Promise<SourceRecord> {
  const record: SourceRecord = { ...source, type: 'source' };
  await appendRecord(DATA_FILE, record);
  return record;
}

export async function getSources(): Promise<SourceRecord[]> {
  const cached = recordCache.get('all-sources');
  if (cached) {
    return cached as SourceRecord[];
  }
  
  const records = await readRecordsStream<StorageRecord>(
    DATA_FILE,
    (r): r is SourceRecord => r.type === 'source'
  );
  
  recordCache.set('all-sources', records);
  return records as SourceRecord[];
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
  const records = await readRecordsStream<StorageRecord>(DATA_FILE);
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
  const records = await readRecordsStream<StorageRecord>(DATA_FILE);
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
  return readRecordsStream<SessionRecord>(SESSIONS_FILE);
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
  try {
    const source = await getSource(id);
    if (!source) return null;
    
    // Validate file path if provided
    if (updates.file && !validateFilePath(updates.file)) {
      throw new Error('Invalid file path');
    }
    
    const updated: SourceRecord = { ...source, ...updates, type: 'source', id };
    await appendRecord(DATA_FILE, updated);
    return updated;
  } catch (error) {
    console.error(`Failed to update source ${id}:`, error);
    throw error;
  }
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
  const records = await readRecordsStream<StorageRecord>(DATA_FILE);
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

// Add file path validation
export function validateFilePath(filePath: string, allowedRoots: string[] = []): boolean {
  // Resolve the path to prevent directory traversal
  const resolvedPath = resolve(filePath);
  
  // Check if path is within allowed roots
  if (allowedRoots.length > 0) {
    return allowedRoots.some(root => {
      const relativePath = relative(resolve(root), resolvedPath);
      return !relativePath.startsWith('..') && !relativePath.startsWith('/');
    });
  }
  
  // Basic security check - no parent directory traversal
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
  const stats = { totalRecords: 0, sources: 0, moments: 0, syntheses: 0 };
  
  try {
    const records = await readRecordsStream<StorageRecord>(DATA_FILE);
    stats.totalRecords = records.length;
    
    const sourceIds = new Set<string>();
    const momentIds = new Set<string>();
    
    for (const record of records) {
      // Count by type
      if (record.type === 'source') stats.sources++;
      else if (record.type === 'moment') stats.moments++;
      else if (record.type === 'synthesis') stats.syntheses++;
      
      // Check for duplicate IDs
      if (record.type === 'source') {
        if (sourceIds.has(record.id)) {
          errors.push(`Duplicate source ID: ${record.id}`);
        }
        sourceIds.add(record.id);
      }
      
      // Validate moment references
      if (record.type === 'moment') {
        const moment = record as MomentRecord;
        for (const source of moment.sources) {
          if (!sourceIds.has(source.sourceId)) {
            errors.push(`Moment ${moment.id} references non-existent source ${source.sourceId}`);
          }
        }
        momentIds.add(moment.id);
      }
      
      // Validate synthesis references
      if (record.type === 'synthesis') {
        const synthesis = record as SynthesisRecord;
        for (const momentId of synthesis.synthesizedMomentIds) {
          if (!momentIds.has(momentId)) {
            errors.push(`Synthesis ${synthesis.id} references non-existent moment ${momentId}`);
          }
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      stats
    };
  } catch (error) {
    return {
      valid: false,
      errors: [`Failed to validate data: ${error}`],
      stats
    };
  }
} 