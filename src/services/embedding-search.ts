/**
 * Embedding-based similarity search for Bridge
 * Implements cosine similarity calculation between query and stored embeddings
 */

import { getAllRecords, getAllEmbeddings } from '../core/storage.js';
import type { Source } from '../core/types.js';

export interface SimilarityResult {
  sourceId: string;
  similarity: number;
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Find similar sources based on embedding similarity
 */
export async function findSimilarByEmbedding(
  queryEmbedding: number[],
  limit: number = 50,
  threshold: number = 0.0
): Promise<SimilarityResult[]> {
  // Get all embeddings from storage
  const embeddings = await getAllEmbeddings();
  
  if (!embeddings || embeddings.length === 0) {
    return [];
  }

  // Calculate similarities
  const results: SimilarityResult[] = [];
  
  for (const embedding of embeddings) {
    if (!embedding.vector || embedding.vector.length !== queryEmbedding.length) {
      continue;
    }
    
    try {
      const similarity = cosineSimilarity(queryEmbedding, embedding.vector);
      
      if (similarity >= threshold) {
        results.push({
          sourceId: embedding.sourceId,
          similarity
        });
      }
    } catch (error) {
      // Skip invalid embeddings
      continue;
    }
  }

  // Sort by similarity (highest first)
  results.sort((a, b) => b.similarity - a.similarity);
  
  // Apply limit
  return results.slice(0, limit);
}

/**
 * Get sources that match the given IDs
 */
export async function getSourcesByIds(ids: string[]): Promise<Source[]> {
  const allSources = await getAllRecords();
  const idSet = new Set(ids);
  
  return allSources.filter(source => idSet.has(source.id));
}