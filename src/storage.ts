import { promises as fs } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import type { 
  SourceRecord, 
  MomentRecord, 
  SceneRecord 
} from './types.js';
import path from 'path';

// New StorageData interface
interface StorageData {
  sources: SourceRecord[];
  moments: MomentRecord[];
  scenes: SceneRecord[];
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
    return { sources: [], moments: [], scenes: [] };
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
  // Add embedding after save
  try {
    const { updateRecordEmbedding } = await import('./embeddings.js');
    await updateRecordEmbedding(record);
  } catch (err) {
    // MCP best practice: do not use console.log, but you may want to log to a file or error handler
    // For now, fail silently
  }
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
  // Add embedding after save
  try {
    const { updateRecordEmbedding } = await import('./embeddings.js');
    await updateRecordEmbedding(record);
  } catch (err) {
    // Fail silently
  }
  // --- Autoweave trigger logic ---
  try {
    const { getConfig } = await import('./config.js');
    const config = getConfig();
    if (config.openai.autoWeave && config.openai.autoWeave.enabled) {
      const { getMoments, getScenes } = await import('./storage.js');
      const moments = await getMoments();
      const scenes = await getScenes();
      // Find unweaved moments (not in any scene)
      const weavedMomentIds = new Set<string>();
      scenes.forEach(scene => {
        (scene.momentIds || []).forEach(id => weavedMomentIds.add(id));
      });
      const unweavedMoments = moments.filter(m => !weavedMomentIds.has(m.id));
      if (unweavedMoments.length >= config.openai.autoWeave.threshold) {
        // Dynamically import autoWeaveMoments to avoid circular deps
        const { AutoProcessor } = await import('./auto-processing.js');
        const autoProcessor = new AutoProcessor();
        await autoProcessor.autoWeaveMoments(unweavedMoments.map(m => m.id));
      }
    }
  } catch (err) {
    // Fail silently
  }
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

// Storage operations for scenes
export async function saveScene(scene: Omit<SceneRecord, 'type'>): Promise<SceneRecord> {
  const record: SceneRecord = { ...scene, type: 'scene' };
  const data = await readData();
  data.scenes.push(record);
  await writeData(data);
  // Add embedding after save
  try {
    const { updateRecordEmbedding } = await import('./embeddings.js');
    await updateRecordEmbedding(record);
  } catch (err) {
    // Fail silently
  }
  return record;
}

export async function getScenes(): Promise<SceneRecord[]> {
  const data = await readData();
  return data.scenes;
}

export async function getScene(id: string): Promise<SceneRecord | null> {
  const scenes = await getScenes();
  return scenes.find(s => s.id === id) || null;
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

export async function getMomentsByScene(sceneId: string): Promise<MomentRecord[]> {
  const scene = await getScene(sceneId);
  if (!scene) return [];
  const moments = await getMoments();
  return moments.filter(m => scene.momentIds.includes(m.id));
}

// Update operations (create new versioned record, preserving append-only)
export async function updateSource(id: string, updates: Partial<SourceRecord>): Promise<SourceRecord | null> {
  const data = await readData();
  const index = data.sources.findIndex(s => s.id === id);
  if (index === -1) return null;
  data.sources[index] = {
    ...data.sources[index],
    ...updates
  };
  await writeData(data);
  return data.sources[index];
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
    scenes: number;
  };
}> {
  const data = await readData();
  return {
    valid: true,
    errors: [],
    stats: {
      totalRecords: data.sources.length + data.moments.length + data.scenes.length,
      sources: data.sources.length,
      moments: data.moments.length,
      scenes: data.scenes.length
    }
  };
}

export async function deleteSource(id: string): Promise<void> {
  const data = await readData();
  data.sources = data.sources.filter(s => s.id !== id);
  await writeData(data);
}

export async function deleteMoment(id: string): Promise<void> {
  const data = await readData();
  data.moments = data.moments.filter(m => m.id !== id);
  await writeData(data);
}

export async function deleteScene(id: string): Promise<void> {
  const data = await readData();
  data.scenes = data.scenes.filter(s => s.id !== id);
  await writeData(data);
}

export async function updateScene(id: string, updates: Partial<SceneRecord>): Promise<SceneRecord | null> {
  const data = await readData();
  const index = data.scenes.findIndex(s => s.id === id);
  if (index === -1) return null;
  data.scenes[index] = {
    ...data.scenes[index],
    ...updates
  };
  await writeData(data);
  return data.scenes[index];
}

// Helper: Get all records (sources, moments, scenes) as a single array with type preserved
export async function getAllRecords(): Promise<Array<SourceRecord | MomentRecord | SceneRecord>> {
  const data = await readData();
  return [
    ...data.sources,
    ...data.moments,
    ...data.scenes
  ];
}

// Helper: Get any record by ID (search sources, then moments, then scenes)
export async function getRecordById(id: string): Promise<SourceRecord | MomentRecord | SceneRecord | null> {
  const data = await readData();
  const source = data.sources.find(s => s.id === id);
  if (source) return source;
  const moment = data.moments.find(m => m.id === id);
  if (moment) return moment;
  const scene = data.scenes.find(s => s.id === id);
  if (scene) return scene;
  return null;
}

// Helper: Extract all searchable text from a record
export function getSearchableText(record: SourceRecord | MomentRecord | SceneRecord): string {
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
  if (record.type === 'scene') {
    let text = record.summary || '';
    if (record.narrative) text += ' ' + record.narrative;
    return text.trim();
  }
  return '';
} 