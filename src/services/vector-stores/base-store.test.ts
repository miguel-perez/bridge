import { BaseVectorStore } from './base-store.js';
import { SearchResult, VectorStoreConfig } from '../embedding-providers/types.js';

// Test implementation of BaseVectorStore
class TestVectorStore extends BaseVectorStore {
  private data = new Map<string, { vector: number[]; metadata: Record<string, any> }>();

  async initialize(): Promise<void> {
    this.initialized = true;
  }

  async upsert(id: string, vector: number[], metadata: Record<string, any>): Promise<void> {
    this.validateId(id);
    this.validateVector(vector);
    this.validateMetadata(metadata);
    
    this.data.set(id, { vector, metadata });
  }

  async search(
    queryVector: number[],
    options?: { filter?: Record<string, any>; limit?: number }
  ): Promise<SearchResult[]> {
    this.validateVector(queryVector);
    
    const results: SearchResult[] = [];
    const limit = options?.limit || 10;

    for (const [id, item] of this.data.entries()) {
      // Apply filter if provided
      if (options?.filter) {
        const matchesFilter = Object.entries(options.filter).every(
          ([key, value]) => item.metadata[key] === value
        );
        if (!matchesFilter) continue;
      }

      const score = this.calculateCosineSimilarity(queryVector, item.vector);
      results.push({ id, score, metadata: item.metadata });
    }

    // Sort by score descending and limit
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  async delete(id: string): Promise<void> {
    this.validateId(id);
    this.data.delete(id);
  }

  getName(): string {
    return 'TestVectorStore';
  }
}

describe('BaseVectorStore', () => {
  let store: TestVectorStore;

  beforeEach(() => {
    store = new TestVectorStore();
  });

  describe('validation methods', () => {
    describe('validateVector', () => {
      it('should accept valid vector', async () => {
        await expect(store.upsert('id1', [0.1, 0.2, 0.3], {})).resolves.not.toThrow();
      });

      it('should reject non-array', async () => {
        await expect(store.upsert('id1', 'not-array' as any, {})).rejects.toThrow(
          'Vector must be an array'
        );
      });

      it('should reject empty vector', async () => {
        await expect(store.upsert('id1', [], {})).rejects.toThrow(
          'Vector cannot be empty'
        );
      });

      it('should reject vector with non-numbers', async () => {
        await expect(store.upsert('id1', [0.1, 'not-number', 0.3] as any, {})).rejects.toThrow(
          'Vector must contain only valid numbers'
        );
      });

      it('should reject vector with NaN', async () => {
        await expect(store.upsert('id1', [0.1, NaN, 0.3], {})).rejects.toThrow(
          'Vector must contain only valid numbers'
        );
      });
    });

    describe('validateId', () => {
      it('should accept valid ID', async () => {
        await expect(store.upsert('valid-id', [0.1], {})).resolves.not.toThrow();
      });

      it('should reject empty ID', async () => {
        await expect(store.upsert('', [0.1], {})).rejects.toThrow(
          'ID must be a non-empty string'
        );
      });

      it('should reject non-string ID', async () => {
        await expect(store.upsert(123 as any, [0.1], {})).rejects.toThrow(
          'ID must be a non-empty string'
        );
      });
    });

    describe('validateMetadata', () => {
      it('should accept valid metadata', async () => {
        await expect(store.upsert('id1', [0.1], { key: 'value' })).resolves.not.toThrow();
      });

      it('should accept empty metadata object', async () => {
        await expect(store.upsert('id1', [0.1], {})).resolves.not.toThrow();
      });

      it('should reject non-object metadata', async () => {
        await expect(store.upsert('id1', [0.1], 'not-object' as any)).rejects.toThrow(
          'Metadata must be an object'
        );
      });

      it('should reject null metadata', async () => {
        await expect(store.upsert('id1', [0.1], null as any)).rejects.toThrow(
          'Metadata must be an object'
        );
      });
    });
  });

  describe('calculateCosineSimilarity', () => {
    it('should calculate similarity correctly', async () => {
      await store.initialize();
      await store.upsert('id1', [1, 0, 0], {});
      
      const results = await store.search([1, 0, 0]);
      expect(results[0].score).toBeCloseTo(1.0, 5);
    });

    it('should handle orthogonal vectors', async () => {
      await store.initialize();
      await store.upsert('id1', [1, 0], {});
      
      const results = await store.search([0, 1]);
      expect(results[0].score).toBeCloseTo(0.0, 5);
    });

    it('should handle opposite vectors', async () => {
      await store.initialize();
      await store.upsert('id1', [1, 0], {});
      
      const results = await store.search([-1, 0]);
      expect(results[0].score).toBeCloseTo(-1.0, 5);
    });

    it('should handle zero vectors', async () => {
      await store.initialize();
      await store.upsert('id1', [0, 0], {});
      
      const results = await store.search([1, 1]);
      expect(results[0].score).toBe(0);
    });
  });

  describe('core operations', () => {
    beforeEach(async () => {
      await store.initialize();
    });

    it('should upsert and retrieve vectors', async () => {
      await store.upsert('id1', [0.1, 0.2], { name: 'test1' });
      await store.upsert('id2', [0.3, 0.4], { name: 'test2' });

      const results = await store.search([0.1, 0.2]);
      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('id1');
      expect(results[0].metadata.name).toBe('test1');
    });

    it('should update existing vectors', async () => {
      await store.upsert('id1', [0.1, 0.2], { version: 1 });
      await store.upsert('id1', [0.3, 0.4], { version: 2 });

      const results = await store.search([0.3, 0.4]);
      expect(results[0].metadata.version).toBe(2);
    });

    it('should delete vectors', async () => {
      await store.upsert('id1', [0.1, 0.2], {});
      await store.delete('id1');

      const results = await store.search([0.1, 0.2]);
      expect(results).toHaveLength(0);
    });

    it('should apply filters', async () => {
      await store.upsert('id1', [0.1, 0.2], { category: 'A' });
      await store.upsert('id2', [0.3, 0.4], { category: 'B' });
      await store.upsert('id3', [0.5, 0.6], { category: 'A' });

      const results = await store.search([0.1, 0.2], { filter: { category: 'A' } });
      expect(results).toHaveLength(2);
      expect(results.every(r => r.metadata.category === 'A')).toBe(true);
    });

    it('should respect limit', async () => {
      for (let i = 0; i < 10; i++) {
        await store.upsert(`id${i}`, [i * 0.1, i * 0.2], {});
      }

      const results = await store.search([0.1, 0.2], { limit: 3 });
      expect(results).toHaveLength(3);
    });

    it('should sort by similarity score', async () => {
      await store.upsert('id1', [1, 0], {});
      await store.upsert('id2', [0.9, 0.1], {});
      await store.upsert('id3', [0.5, 0.5], {});

      const results = await store.search([1, 0]);
      expect(results[0].id).toBe('id1');
      expect(results[0].score).toBeGreaterThan(results[1].score);
      expect(results[1].score).toBeGreaterThan(results[2].score);
    });
  });

  describe('isAvailable', () => {
    it('should return true when store can be initialized', async () => {
      expect(await store.isAvailable()).toBe(true);
    });

    it('should initialize store if not already initialized', async () => {
      const initSpy = jest.spyOn(store, 'initialize');
      await store.isAvailable();
      expect(initSpy).toHaveBeenCalled();
    });

    it('should not re-initialize if already initialized', async () => {
      await store.initialize();
      const initSpy = jest.spyOn(store, 'initialize');
      await store.isAvailable();
      expect(initSpy).not.toHaveBeenCalled();
    });
  });

  describe('getName', () => {
    it('should return store name', () => {
      expect(store.getName()).toBe('TestVectorStore');
    });
  });
});