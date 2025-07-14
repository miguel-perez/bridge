import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { VectorStore } from './vector-store';

describe('VectorStore', () => {
  let vectorStore: VectorStore;

  beforeEach(() => {
    // Create vector store with in-memory storage for tests
    vectorStore = new VectorStore(':memory:');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addVector', () => {
    it('should add a vector successfully', async () => {
      const id = 'test-id';
      const vector = new Array(384).fill(0.1);
      
      const result = vectorStore.addVector(id, vector);
      
      expect(result).toBe(true);
      expect(await vectorStore.hasVector(id)).toBe(true);
      expect(await vectorStore.getVectorCount()).toBe(1);
    });

    it('should handle invalid vector dimensions', async () => {
      const id = 'test-id';
      const invalidVector = [0.1, 0.2]; // Too few dimensions
      
      const result = vectorStore.addVector(id, invalidVector);
      
      expect(result).toBe(false);
      expect(await vectorStore.hasVector(id)).toBe(false);
    });

    it('should update existing vector', async () => {
      const id = 'test-id';
      const vector1 = new Array(384).fill(0.1);
      const vector2 = new Array(384).fill(0.2);
      
      vectorStore.addVector(id, vector1);
      const result = vectorStore.addVector(id, vector2);
      
      expect(result).toBe(true);
      expect(await vectorStore.getVectorCount()).toBe(1);
      
      const retrieved = await vectorStore.getVector(id);
      expect(retrieved?.[0]).toBe(0.2);
    });
  });

  describe('addVectors', () => {
    it('should add multiple vectors successfully', async () => {
      const vectors = [
        { id: 'test-1', vector: new Array(384).fill(0.1) },
        { id: 'test-2', vector: new Array(384).fill(0.2) }
      ];
      
      const result = vectorStore.addVectors(vectors);
      
      expect(result.added).toBe(2);
      expect(result.rejected).toBe(0);
      expect(await vectorStore.getVectorCount()).toBe(2);
    });

    it('should handle some invalid vectors', async () => {
      const vectors = [
        { id: 'test-1', vector: new Array(384).fill(0.1) },
        { id: 'test-2', vector: [0.1, 0.2] }, // Invalid
        { id: 'test-3', vector: new Array(384).fill(0.3) }
      ];
      
      const result = vectorStore.addVectors(vectors);
      
      expect(result.added).toBe(2);
      expect(result.rejected).toBe(1);
      expect(await vectorStore.getVectorCount()).toBe(2);
    });
  });

  describe('findSimilar', () => {
    it('should find similar vectors', async () => {
      // Create more realistic test vectors with varying patterns
      const vector1 = new Array(384).fill(0);
      const vector2 = new Array(384).fill(0);
      const vector3 = new Array(384).fill(0);
      
      // Set different values for first few dimensions to create distinct patterns
      vector1[0] = 1; vector1[1] = 0; vector1[2] = 0; // Pattern A
      vector2[0] = 1; vector2[1] = 0.1; vector2[2] = 0; // Similar to A
      vector3[0] = 0; vector3[1] = 0; vector3[2] = 1; // Pattern B (different)
      
      vectorStore.addVector('test-1', vector1);
      vectorStore.addVector('test-2', vector2);
      vectorStore.addVector('test-3', vector3);
      
      // Query vector similar to vector1 and vector2
      const queryVector = new Array(384).fill(0);
      queryVector[0] = 1; queryVector[1] = 0.05; queryVector[2] = 0;
      
      const results = await vectorStore.findSimilar(queryVector, 2, 0.0);
      
      expect(results).toHaveLength(2);
      expect(results[0].similarity).toBeGreaterThan(0.5);
      
      // Should return the two most similar vectors
      const ids = results.map(r => r.id);
      expect(ids).toContain('test-1');
      expect(ids).toContain('test-2');
    });

    it('should handle empty vector store', async () => {
      const queryVector = new Array(384).fill(0.5);
      const results = await vectorStore.findSimilar(queryVector, 5);
      
      expect(results).toEqual([]);
    });

    it('should respect limit parameter', async () => {
      // Add 5 vectors
      for (let i = 0; i < 5; i++) {
        vectorStore.addVector(`test-${i}`, new Array(384).fill(0.1 + i * 0.1));
      }
      
      const queryVector = new Array(384).fill(0.3);
      const results = await vectorStore.findSimilar(queryVector, 3);
      
      expect(results).toHaveLength(3);
    });
  });

  describe('removeVector', () => {
    it('should remove vector successfully', async () => {
      const id = 'test-id';
      vectorStore.addVector(id, new Array(384).fill(0.1));
      
      expect(await vectorStore.hasVector(id)).toBe(true);
      
      await vectorStore.removeVector(id);
      
      expect(await vectorStore.hasVector(id)).toBe(false);
      expect(await vectorStore.getVectorCount()).toBe(0);
    });

    it('should handle removing non-existent vector', async () => {
      await expect(vectorStore.removeVector('non-existent')).resolves.not.toThrow();
    });
  });

  describe('validation', () => {
    it('should validate vectors', async () => {
      vectorStore.addVector('test-1', new Array(384).fill(0.1));
      vectorStore.addVector('test-2', new Array(384).fill(0.2));
      
      const result = await vectorStore.validateVectors();
      
      expect(result.valid).toBe(2);
      expect(result.invalid).toBe(0);
      expect(result.details).toHaveLength(0);
    });

    it('should get health stats', () => {
      vectorStore.addVector('test-1', new Array(384).fill(0.1));
      vectorStore.addVector('test-2', new Array(384).fill(0.2));
      
      const stats = vectorStore.getHealthStats();
      
      expect(stats.total).toBe(2);
      expect(stats.valid).toBe(2);
      expect(stats.invalid).toBe(0);
    });
  });

  describe('clear', () => {
    it('should clear all vectors', async () => {
      vectorStore.addVector('test-1', new Array(384).fill(0.1));
      vectorStore.addVector('test-2', new Array(384).fill(0.2));
      
      expect(await vectorStore.getVectorCount()).toBe(2);
      
      await vectorStore.clear();
      
      expect(await vectorStore.getVectorCount()).toBe(0);
    });
  });

  describe('persistence', () => {
    it('should handle in-memory storage', async () => {
      // For in-memory storage, save/load should work but not persist
      vectorStore.addVector('test-1', new Array(384).fill(0.1));
      
      await expect(vectorStore.saveToDisk()).resolves.not.toThrow();
      
      // Clear and reload
      await vectorStore.clear();
      expect(await vectorStore.getVectorCount()).toBe(0);
      
      // In-memory storage doesn't persist
      await vectorStore.loadFromDisk();
      expect(await vectorStore.getVectorCount()).toBe(0);
    });
  });
});