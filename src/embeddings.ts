import { config } from './config.js';
import { OpenAI } from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import type { SourceRecord, MomentRecord, SceneRecord } from './types.js';

// Type for any record
export type StorageRecord = SourceRecord | MomentRecord | SceneRecord;

// Validate Pinecone config
if (!config.pinecone.apiKey || !config.pinecone.environment) {
  throw new Error('Pinecone API key and environment must be set in environment variables.');
}

// Initialize OpenAI client from config
const openai = new OpenAI({ apiKey: config.openai.apiKey });

// Helper to get initialized Pinecone index
export async function getPineconeIndex() {
  const pinecone = new Pinecone({ apiKey: config.pinecone.apiKey! });
  return pinecone.Index(config.pinecone.indexName!);
}

// Generate embedding for text using OpenAI
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: config.openai.embeddingModel,
    input: text,
  });
  return response.data[0].embedding;
}

// Upsert embedding to Pinecone
export async function upsertEmbedding(id: string, embedding: number[], metadata: any) {
  const pineconeIndex = await getPineconeIndex();
  await pineconeIndex.upsert([
    { id, values: embedding, metadata }
  ]);
}

// Delete embedding from Pinecone by record ID
export async function deleteEmbedding(id: string) {
  const pineconeIndex = await getPineconeIndex();
  await pineconeIndex.deleteOne(id);
}

// Query Pinecone for similar embeddings
export async function queryEmbedding(embedding: number[], topK = 10) {
  const pineconeIndex = await getPineconeIndex();
  return await pineconeIndex.query({
    vector: embedding,
    topK,
    includeMetadata: true,
  });
}

// 4. Cosine similarity (can be kept if needed for in-memory use)
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

// 5. Update embedding for a record (Pinecone only)
export async function updateRecordEmbedding(record: StorageRecord): Promise<void> {
  // Import getSearchableText lazily to avoid circular deps
  const { getSearchableText } = await import('./storage.js');
  const text = getSearchableText(record);
  const embedding = await generateEmbedding(text);
  // Only upsert to Pinecone
  const metadata: any = { type: record.type, created: (record as any).created };
  if (record.type === 'moment' || record.type === 'scene') {
    metadata.summary = (record as any).summary;
  }
  // Do NOT store full content for sources
  await upsertEmbedding(record.id, embedding, metadata);
} 