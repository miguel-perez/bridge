import { BaseVectorStore } from './base-store.js';
import { SearchResult } from '../embedding-providers/types.js';
import * as fs from 'fs/promises';
import * as path from 'path';

interface StoredVector {
  id: string;
  vector: number[];
  metadata: Record<string, any>;
  created: string;
  updated: string;
}

export class JSONVectorStore extends BaseVectorStore {
  private filePath: string;
  private data = new Map<string, StoredVector>();

  constructor(config: { filePath?: string } = {}) {
    super(config);
    const defaultPath = path.join(
      process.env.HOME || process.env.USERPROFILE || '',
      '.bridge',
      'vectors.json'
    );
    this.filePath = config.filePath || defaultPath;
  }

  async initialize(): Promise<void> {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.filePath);
      await fs.mkdir(dir, { recursive: true });

      // Load existing data
      try {
        const content = await fs.readFile(this.filePath, 'utf-8');
        const vectors: StoredVector[] = JSON.parse(content);
        
        for (const vector of vectors) {
          this.data.set(vector.id, vector);
        }
      } catch (error: any) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
        // File doesn't exist yet, that's OK
      }

      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize JSON vector store: ${error}`);
    }
  }

  async upsert(id: string, vector: number[], metadata: Record<string, any>): Promise<void> {
    this.validateId(id);
    this.validateVector(vector);
    this.validateMetadata(metadata);

    if (!this.initialized) {
      await this.initialize();
    }

    const now = new Date().toISOString();
    const existing = this.data.get(id);

    const storedVector: StoredVector = {
      id,
      vector,
      metadata,
      created: existing?.created || now,
      updated: now,
    };

    this.data.set(id, storedVector);
    await this.save();
  }

  async search(
    queryVector: number[],
    options?: { filter?: Record<string, any>; limit?: number }
  ): Promise<SearchResult[]> {
    this.validateVector(queryVector);

    if (!this.initialized) {
      await this.initialize();
    }

    const results: SearchResult[] = [];
    const limit = options?.limit || 10;

    for (const item of this.data.values()) {
      // Apply filter if provided
      if (options?.filter) {
        const matchesFilter = Object.entries(options.filter).every(
          ([key, value]) => item.metadata[key] === value
        );
        if (!matchesFilter) continue;
      }

      // Skip zero vectors (from NoneProvider)
      const isZeroVector = item.vector.every(v => v === 0);
      if (isZeroVector && queryVector.some(v => v !== 0)) {
        continue;
      }

      const score = this.calculateCosineSimilarity(queryVector, item.vector);
      results.push({ 
        id: item.id, 
        score, 
        metadata: { ...item.metadata, created: item.created, updated: item.updated }
      });
    }

    // Sort by score descending and limit
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  async delete(id: string): Promise<void> {
    this.validateId(id);

    if (!this.initialized) {
      await this.initialize();
    }

    this.data.delete(id);
    await this.save();
  }

  getName(): string {
    return 'JSONVectorStore';
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Check if we can write to the directory
      const dir = path.dirname(this.filePath);
      await fs.access(dir, fs.constants.W_OK).catch(async () => {
        await fs.mkdir(dir, { recursive: true });
      });
      return true;
    } catch {
      return false;
    }
  }

  private async save(): Promise<void> {
    const vectors = Array.from(this.data.values());
    const content = JSON.stringify(vectors, null, 2);
    
    // Write to temp file first
    const tempPath = `${this.filePath}.tmp`;
    await fs.writeFile(tempPath, content, 'utf-8');
    
    // Atomic rename
    await fs.rename(tempPath, this.filePath);
  }

  // Additional utility methods
  async getCount(): Promise<number> {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.data.size;
  }

  async clear(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
    this.data.clear();
    await this.save();
  }
}