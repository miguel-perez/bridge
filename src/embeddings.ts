import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { SourceRecord, MomentRecord, SynthesisRecord } from './types.js';

// Type for any record
export type StorageRecord = SourceRecord | MomentRecord | SynthesisRecord;

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Storage configuration (match storage.ts)
const ENV = process.env.NODE_ENV || process.env.MCP_ENV || 'development';
const STORAGE_DIR = join(__dirname, '..', 'data', ENV);
const EMBEDDINGS_FILE = join(STORAGE_DIR, 'embeddings.json');

// Try to use a minimal interface for the pipeline if types are missing
interface MinimalFeatureExtractionPipeline {
  (text: string): Promise<any>;
}
// The actual type from @xenova/transformers would be better, but is not available
let model: MinimalFeatureExtractionPipeline | null = null;
async function getModel(): Promise<MinimalFeatureExtractionPipeline> {
  if (!model) {
    const { pipeline } = await import('@xenova/transformers');
    // The pipeline returns a callable object
    model = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2') as MinimalFeatureExtractionPipeline;
  }
  return model;
}

// 1. Generate embedding for text
export async function generateEmbedding(text: string): Promise<number[]> {
  const m = await getModel();
  const output = await m(text);
  // output is a Tensor of shape [1, N]; use .data() or .tolist()
  if (output.data) {
    const arr = await output.data();
    return Array.from(arr);
  } else if (output.tolist) {
    return output.tolist()[0];
  } else if (Array.isArray(output) && Array.isArray(output[0])) {
    return output[0];
  }
  throw new Error('Unknown output format from embedding model');
}

// 2. Load all embeddings from file
export async function loadEmbeddings(): Promise<Record<string, number[]>> {
  try {
    const content = await fs.readFile(EMBEDDINGS_FILE, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    return {};
  }
}

// 3. Save all embeddings to file
export async function saveEmbeddings(embeddings: Record<string, number[]>): Promise<void> {
  await fs.mkdir(STORAGE_DIR, { recursive: true });
  await fs.writeFile(EMBEDDINGS_FILE, JSON.stringify(embeddings, null, 2), 'utf8');
}

// 4. Cosine similarity
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Helper: get record ID
function getRecordId(record: StorageRecord): string {
  return record.id;
}

// 5. Update embedding for a record
export async function updateRecordEmbedding(record: StorageRecord): Promise<void> {
  const embeddings = await loadEmbeddings();
  // Import getSearchableText lazily to avoid circular deps
  const { getSearchableText } = await import('./storage.js');
  const text = getSearchableText(record);
  embeddings[getRecordId(record)] = await generateEmbedding(text);
  await saveEmbeddings(embeddings);
}

// 6. Remove embedding for a record
export async function removeEmbedding(recordId: string): Promise<void> {
  const embeddings = await loadEmbeddings();
  if (embeddings[recordId]) {
    delete embeddings[recordId];
    await saveEmbeddings(embeddings);
  }
}

// 7. Ensure all records have embeddings (generate missing only)
export async function ensureAllEmbeddings(records: StorageRecord[]): Promise<void> {
  const embeddings = await loadEmbeddings();
  // Import getSearchableText lazily to avoid circular deps
  const { getSearchableText } = await import('./storage.js');
  let changed = false;
  for (const record of records) {
    const id = getRecordId(record);
    if (!embeddings[id]) {
      const text = getSearchableText(record);
      embeddings[id] = await generateEmbedding(text);
      changed = true;
    }
  }
  if (changed) {
    await saveEmbeddings(embeddings);
  }
} 