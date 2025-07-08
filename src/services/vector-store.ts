import { promises as fs } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface VectorRecord {
  id: string;
  vector: number[];
  metadata?: Record<string, any>;
}

export interface SimilarityResult {
  id: string;
  similarity: number;
  metadata?: Record<string, any>;
}

export class VectorStore {
  static readonly EXPECTED_DIMENSION = 384;
  private vectors: Map<string, VectorRecord> = new Map();
  private storageFile: string;

  constructor(storageFile?: string) {
    this.storageFile = storageFile || join(__dirname, '..', 'data', 'vectors.json');
  }

  async addVector(id: string, vector: number[], metadata?: Record<string, any>): Promise<void> {
    if (vector.length !== VectorStore.EXPECTED_DIMENSION) {
      console.warn(`Rejected vector ${id}: expected ${VectorStore.EXPECTED_DIMENSION} dimensions, got ${vector.length}`);
      return;
    }
    this.vectors.set(id, { id, vector, metadata });
    await this.saveToDisk();
  }

  async addVectors(records: VectorRecord[]): Promise<void> {
    let rejected = 0;
    for (const record of records) {
      if (record.vector.length !== VectorStore.EXPECTED_DIMENSION) {
        console.warn(`Rejected vector ${record.id}: expected ${VectorStore.EXPECTED_DIMENSION} dimensions, got ${record.vector.length}`);
        rejected++;
        continue;
      }
      this.vectors.set(record.id, record);
    }
    if (rejected > 0) {
      console.warn(`Rejected ${rejected} vectors due to dimension mismatch during addVectors.`);
    }
    await this.saveToDisk();
  }

  async removeVector(id: string): Promise<void> {
    this.vectors.delete(id);
    await this.saveToDisk();
  }

  async findSimilar(
    queryVector: number[], 
    limit: number = 10, 
    threshold: number = 0.0
  ): Promise<SimilarityResult[]> {
    const results: SimilarityResult[] = [];
    console.log(`Searching for similar vectors. Query vector has ${queryVector.length} dimensions`);
    console.log(`Total vectors in store: ${this.vectors.size}`);
    for (const [id, record] of this.vectors) {
      if (record.vector.length !== VectorStore.EXPECTED_DIMENSION) {
        // Skip invalid vectors
        console.warn(`Skipping vector ${id} due to dimension mismatch: expected ${VectorStore.EXPECTED_DIMENSION}, got ${record.vector.length}`);
        continue;
      }
      try {
        const similarity = this.cosineSimilarity(queryVector, record.vector);
        if (similarity >= threshold) {
          results.push({
            id,
            similarity,
            metadata: record.metadata
          });
        }
      } catch (error) {
        console.error(`Error comparing with vector ${id}:`, error);
        continue;
      }
    }
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  async findSimilarById(
    id: string, 
    limit: number = 10, 
    threshold: number = 0.0
  ): Promise<SimilarityResult[]> {
    const record = this.vectors.get(id);
    if (!record) {
      throw new Error(`Vector not found for id: ${id}`);
    }
    
    return this.findSimilar(record.vector, limit, threshold);
  }

  async getVector(id: string): Promise<number[] | null> {
    const record = this.vectors.get(id);
    return record ? record.vector : null;
  }

  async hasVector(id: string): Promise<boolean> {
    return this.vectors.has(id);
  }

  async getVectorCount(): Promise<number> {
    return this.vectors.size;
  }

  async clear(): Promise<void> {
    this.vectors.clear();
    await this.saveToDisk();
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      console.error(`Vector dimension mismatch: query vector has ${a.length} dimensions, stored vector has ${b.length} dimensions`);
      console.error('Query vector length:', a.length);
      console.error('Stored vector length:', b.length);
      console.error('Query vector preview:', a.slice(0, 5));
      console.error('Stored vector preview:', b.slice(0, 5));
      throw new Error(`Vectors must have the same length. Query: ${a.length}, Stored: ${b.length}`);
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

  private async saveToDisk(): Promise<void> {
    try {
      const data = Array.from(this.vectors.values());
      await fs.writeFile(this.storageFile, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
      console.error('Failed to save vectors to disk:', error);
    }
  }

  async loadFromDisk(): Promise<void> {
    try {
      const content = await fs.readFile(this.storageFile, 'utf8');
      const data: VectorRecord[] = JSON.parse(content);
      this.vectors.clear();
      let invalid = 0;
      for (const record of data) {
        if (record.vector.length === VectorStore.EXPECTED_DIMENSION) {
          this.vectors.set(record.id, record);
        } else {
          console.warn(`Skipped loading vector ${record.id}: expected ${VectorStore.EXPECTED_DIMENSION} dimensions, got ${record.vector.length}`);
          invalid++;
        }
      }
      if (invalid > 0) {
        console.warn(`Skipped ${invalid} invalid vectors during loadFromDisk.`);
      }
    } catch (error) {
      // File doesn't exist yet, that's okay
      console.log('No existing vector data found, starting fresh');
    }
  }

  async initialize(): Promise<void> {
    await this.loadFromDisk();
  }

  async validateVectors(expectedDimension?: number): Promise<{ valid: number; invalid: number; details: string[] }> {
    const details: string[] = [];
    let valid = 0;
    let invalid = 0;

    for (const [id, record] of this.vectors) {
      if (expectedDimension && record.vector.length !== expectedDimension) {
        invalid++;
        details.push(`Vector ${id}: expected ${expectedDimension} dimensions, got ${record.vector.length}`);
      } else {
        valid++;
      }
    }

    return { valid, invalid, details };
  }

  async removeInvalidVectors(expectedDimension: number = VectorStore.EXPECTED_DIMENSION): Promise<number> {
    let removed = 0;
    const toRemove: string[] = [];
    for (const [id, record] of this.vectors) {
      if (record.vector.length !== expectedDimension) {
        toRemove.push(id);
        removed++;
      }
    }
    for (const id of toRemove) {
      this.vectors.delete(id);
      console.warn(`Removed invalid vector ${id} during removeInvalidVectors.`);
    }
    if (removed > 0) {
      await this.saveToDisk();
      console.warn(`removeInvalidVectors removed ${removed} invalid vectors.`);
    }
    return removed;
  }

  /**
   * Remove all invalid vectors (wrong dimension) from the store and save.
   * @returns {Promise<number>} Number of vectors removed.
   */
  async cleanupInvalidVectors(): Promise<number> {
    let removed = 0;
    const toRemove: string[] = [];
    for (const [id, record] of this.vectors) {
      if (record.vector.length !== VectorStore.EXPECTED_DIMENSION) {
        toRemove.push(id);
        removed++;
      }
    }
    for (const id of toRemove) {
      this.vectors.delete(id);
      console.warn(`Removed invalid vector ${id} during cleanup.`);
    }
    if (removed > 0) {
      await this.saveToDisk();
      console.warn(`Cleanup removed ${removed} invalid vectors.`);
    }
    return removed;
  }

  /**
   * Get statistics about the vector store health.
   * @returns {{ total: number, valid: number, invalid: number }}
   */
  getHealthStats(): { total: number; valid: number; invalid: number } {
    let valid = 0, invalid = 0;
    for (const record of this.vectors.values()) {
      if (record.vector.length === VectorStore.EXPECTED_DIMENSION) valid++;
      else invalid++;
    }
    return {
      total: this.vectors.size,
      valid,
      invalid
    };
  }
}

// Export a singleton instance that can be configured with the data directory
let vectorStoreInstance: VectorStore | null = null;

export function initializeVectorStore(dataDir?: string): VectorStore {
  if (!vectorStoreInstance) {
    const storageFile = dataDir ? join(dataDir, 'vectors.json') : undefined;
    vectorStoreInstance = new VectorStore(storageFile);
  } else if (dataDir) {
    // If instance exists but we want to configure it with a specific directory,
    // we need to create a new instance with the correct path
    const storageFile = join(dataDir, 'vectors.json');
    vectorStoreInstance = new VectorStore(storageFile);
  }
  return vectorStoreInstance;
}

export function getVectorStore(): VectorStore {
  if (!vectorStoreInstance) {
    // Create a default instance if none exists
    vectorStoreInstance = new VectorStore();
  }
  return vectorStoreInstance;
}

// Default instance for backward compatibility
export const vectorStore = getVectorStore(); 