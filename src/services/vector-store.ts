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

  addVector(id: string, vector: number[]): boolean {
    if (vector.length !== VectorStore.EXPECTED_DIMENSION) {
      // Silently reject invalid vectors in MCP context
      return false;
    }
    this.vectors.set(id, { id, vector });
    return true;
  }

  addVectors(records: Array<{ id: string; vector: number[] }>): { added: number; rejected: number } {
    let added = 0;
    let rejected = 0;

    for (const record of records) {
      if (record.vector.length !== VectorStore.EXPECTED_DIMENSION) {
        // Silently reject invalid vectors in MCP context
        rejected++;
        continue;
      }
      this.vectors.set(record.id, record);
      added++;
    }

    return { added, rejected };
  }

  async removeVector(id: string): Promise<void> {
    this.vectors.delete(id);
    await this.saveToDisk();
  }

  async findSimilar(queryVector: number[], limit: number = 10, threshold: number = 0.7): Promise<Array<{ id: string; similarity: number }>> {
    const results: Array<{ id: string; similarity: number }> = [];

    for (const [id, record] of this.vectors) {
      if (record.vector.length !== VectorStore.EXPECTED_DIMENSION) {
        // Silently skip invalid vectors in MCP context
        continue;
      }

      try {
        const similarity = this.cosineSimilarity(queryVector, record.vector);
        if (similarity >= threshold) {
          results.push({ id, similarity });
        }
      } catch (error) {
        // Silently handle errors in MCP context
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
      // Return 0 similarity for dimension mismatches
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

  async saveToDisk(): Promise<void> {
    try {
      const data = Array.from(this.vectors.values());
      await fs.writeFile(this.storageFile, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
      // Silently handle save errors in MCP context
      throw new Error('Failed to save vectors to disk');
    }
  }

  async loadFromDisk(): Promise<void> {
    try {
      const data = await fs.readFile(this.storageFile, 'utf8');
      const records = JSON.parse(data) as Array<{ id: string; vector: number[] }>;

      for (const record of records) {
        if (record.vector.length === VectorStore.EXPECTED_DIMENSION) {
          this.vectors.set(record.id, record);
        }
        // Silently skip invalid vectors in MCP context
      }
    } catch (error) {
      // File doesn't exist or is invalid, start fresh
      this.vectors.clear();
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

  async removeInvalidVectors(expectedDimension: number): Promise<number> {
    let removed = 0;
    const toRemove: string[] = [];

    for (const [id, record] of this.vectors) {
      if (record.vector.length !== expectedDimension) {
        toRemove.push(id);
      }
    }

    for (const id of toRemove) {
      this.vectors.delete(id);
      removed++;
    }

    return removed;
  }

  async cleanup(): Promise<number> {
    let removed = 0;
    const toRemove: string[] = [];

    for (const [id, record] of this.vectors) {
      if (record.vector.length !== VectorStore.EXPECTED_DIMENSION) {
        toRemove.push(id);
      }
    }

    for (const id of toRemove) {
      this.vectors.delete(id);
      removed++;
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