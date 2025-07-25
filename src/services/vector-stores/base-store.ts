import { VectorStore, SearchResult, VectorStoreConfig } from '../embedding-providers/types.js';

export abstract class BaseVectorStore implements VectorStore {
  protected initialized = false;
  protected config: VectorStoreConfig;

  constructor(config: VectorStoreConfig = {}) {
    this.config = config;
  }

  abstract initialize(): Promise<void>;
  abstract upsert(id: string, vector: number[], metadata: Record<string, any>): Promise<void>;
  abstract search(
    vector: number[],
    options?: { filter?: Record<string, any>; limit?: number }
  ): Promise<SearchResult[]>;
  abstract delete(id: string): Promise<void>;
  abstract getName(): string;

  async isAvailable(): Promise<boolean> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      return true;
    } catch {
      return false;
    }
  }

  protected validateVector(vector: number[]): void {
    if (!Array.isArray(vector)) {
      throw new Error('Vector must be an array');
    }
    if (vector.length === 0) {
      throw new Error('Vector cannot be empty');
    }
    if (!vector.every((val) => typeof val === 'number' && !isNaN(val))) {
      throw new Error('Vector must contain only valid numbers');
    }
  }

  protected validateId(id: string): void {
    if (!id || typeof id !== 'string') {
      throw new Error('ID must be a non-empty string');
    }
  }

  protected validateMetadata(metadata: Record<string, any>): void {
    if (!metadata || typeof metadata !== 'object') {
      throw new Error('Metadata must be an object');
    }
  }

  protected calculateCosineSimilarity(vector1: number[], vector2: number[]): number {
    if (vector1.length !== vector2.length) {
      throw new Error('Vectors must have the same dimension');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vector1.length; i++) {
      dotProduct += vector1[i] * vector2[i];
      norm1 += vector1[i] * vector1[i];
      norm2 += vector2[i] * vector2[i];
    }

    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (norm1 * norm2);
  }
}