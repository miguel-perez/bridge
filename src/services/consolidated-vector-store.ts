import { getAllEmbeddings } from '../core/storage.js';
import type { EmbeddingRecord } from '../core/types.js';

export interface SimilarityResult {
  id: string;
  similarity: number;
  metadata?: Record<string, unknown>;
}

export class ConsolidatedVectorStore {
  static readonly EXPECTED_DIMENSION = 384;
  private embeddings: Map<string, EmbeddingRecord> = new Map();

  constructor() {
    // No separate storage file needed - uses main data file
  }

  async addVector(id: string, vector: number[]): Promise<boolean> {
    if (vector.length !== ConsolidatedVectorStore.EXPECTED_DIMENSION) {
      return false;
    }
    
    // Note: This method is kept for backward compatibility
    // The actual storage is handled by the capture service
    this.embeddings.set(id, {
      sourceId: id,
      vector,
      generated: new Date().toISOString()
    });
    return true;
  }

  async removeVector(id: string): Promise<void> {
    this.embeddings.delete(id);
    // Note: Actual deletion is handled by storage service
  }

  async findSimilar(queryVector: number[], limit: number = 10, threshold: number = 0.7): Promise<Array<{ id: string; similarity: number }>> {
    const results: Array<{ id: string; similarity: number }> = [];
    
    // Load embeddings from storage
    const allEmbeddings = await getAllEmbeddings();

    for (const embedding of allEmbeddings) {
      if (embedding.vector.length !== ConsolidatedVectorStore.EXPECTED_DIMENSION) {
        continue;
      }

      try {
        const similarity = this.cosineSimilarity(queryVector, embedding.vector);
        if (similarity >= threshold) {
          results.push({ id: embedding.sourceId, similarity });
        }
      } catch (error) {
        continue;
      }
    }

    // Sort by similarity (descending) and limit results
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  async findSimilarById(
    id: string, 
    limit: number = 10, 
    threshold: number = 0.0
  ): Promise<SimilarityResult[]> {
    const allEmbeddings = await getAllEmbeddings();
    const record = allEmbeddings.find(e => e.sourceId === id);
    
    if (!record) {
      throw new Error(`Vector not found for id: ${id}`);
    }
    
    return this.findSimilar(record.vector, limit, threshold);
  }

  async getVector(id: string): Promise<number[] | null> {
    const allEmbeddings = await getAllEmbeddings();
    const record = allEmbeddings.find(e => e.sourceId === id);
    return record ? record.vector : null;
  }

  async hasVector(id: string): Promise<boolean> {
    const allEmbeddings = await getAllEmbeddings();
    return allEmbeddings.some(e => e.sourceId === id);
  }

  async getVectorCount(): Promise<number> {
    const allEmbeddings = await getAllEmbeddings();
    return allEmbeddings.length;
  }

  async clear(): Promise<void> {
    // Note: This would require clearing all embeddings from storage
    // For now, just clear the in-memory cache
    this.embeddings.clear();
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      return 0;
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

  // Backward compatibility methods
  async saveToDisk(): Promise<void> {
    // No-op: embeddings are saved in main data file
  }

  async loadFromDisk(): Promise<void> {
    // No-op: embeddings are loaded from main data file
  }

  async initialize(): Promise<void> {
    // No-op: embeddings are loaded on demand
  }

  async validateVectors(expectedDimension?: number): Promise<{ valid: number; invalid: number; details: string[] }> {
    const allEmbeddings = await getAllEmbeddings();
    const details: string[] = [];
    let valid = 0;
    let invalid = 0;

    for (const embedding of allEmbeddings) {
      if (expectedDimension && embedding.vector.length !== expectedDimension) {
        invalid++;
        details.push(`Vector ${embedding.sourceId}: expected ${expectedDimension} dimensions, got ${embedding.vector.length}`);
      } else {
        valid++;
      }
    }

    return { valid, invalid, details };
  }

  async removeInvalidVectors(): Promise<number> {
    // Note: This would require removing embeddings from storage
    // For now, just return 0
    return 0;
  }

  async cleanup(): Promise<number> {
    // Note: This would require cleanup in storage
    // For now, just return 0
    return 0;
  }

  getHealthStats(): { total: number; valid: number; invalid: number } {
    // Note: This would require loading all embeddings
    // For now, return placeholder stats
    return { total: 0, valid: 0, invalid: 0 };
  }
}

// Singleton instance for backward compatibility
let vectorStoreInstance: ConsolidatedVectorStore | null = null;

export function initializeVectorStore(): ConsolidatedVectorStore {
  if (!vectorStoreInstance) {
    vectorStoreInstance = new ConsolidatedVectorStore();
  }
  return vectorStoreInstance;
}

export function getVectorStore(): ConsolidatedVectorStore {
  if (!vectorStoreInstance) {
    vectorStoreInstance = new ConsolidatedVectorStore();
  }
  return vectorStoreInstance;
}

// Export singleton for backward compatibility
export const vectorStore = getVectorStore(); 