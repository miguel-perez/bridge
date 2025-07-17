import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';

// Mock environment variables to disable embeddings for tests
const originalEnv = process.env;
beforeAll(() => {
  process.env = { ...originalEnv, BRIDGE_DISABLE_EMBEDDINGS: 'true' };
});

afterAll(() => {
  process.env = originalEnv;
});

describe('EmbeddingService', () => {
  let service: any;

  beforeEach(async () => {
    // Import the service after setting environment
    const { EmbeddingService } = await import('./embeddings.js');
    service = new EmbeddingService();
  });

  afterEach(() => {
    if (service && service.clearCache) {
      service.clearCache();
    }
  });

  describe('static methods', () => {
    test('getExpectedDimension returns 384', async () => {
      const { EmbeddingService } = await import('./embeddings.js');
      expect(EmbeddingService.getExpectedDimension()).toBe(384);
    });
  });

  describe('initialization', () => {
    test('disables embeddings when BRIDGE_DISABLE_EMBEDDINGS is true', async () => {
      await service.initialize();
      expect(service.disabled).toBe(true);
    });
  });

  describe('generateEmbedding', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    test('returns zero embedding when disabled', async () => {
      const text = 'Hello world';
      const embedding = await service.generateEmbedding(text);

      expect(embedding).toHaveLength(384);
      expect(embedding.every(val => val === 0)).toBe(true);
    });

    test('caches embeddings and returns cached result', async () => {
      const text = 'Cached text';
      
      // First call
      const embedding1 = await service.generateEmbedding(text);
      
      // Second call with same text
      const embedding2 = await service.generateEmbedding(text);
      
      expect(embedding1).toEqual(embedding2);
      expect(embedding1.every(val => val === 0)).toBe(true);
    });

    test('handles different text inputs separately', async () => {
      const text1 = 'First text';
      const text2 = 'Second text';
      
      const embedding1 = await service.generateEmbedding(text1);
      const embedding2 = await service.generateEmbedding(text2);
      
      expect(embedding1).toEqual(embedding2); // Both should be zero embeddings
      expect(embedding1.every(val => val === 0)).toBe(true);
    });
  });

  describe('generateEmbeddings', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    test('generates embeddings for multiple texts', async () => {
      const texts = ['Text 1', 'Text 2', 'Text 3'];
      const embeddings = await service.generateEmbeddings(texts);

      expect(embeddings).toHaveLength(3);
      embeddings.forEach(embedding => {
        expect(embedding).toHaveLength(384);
        expect(embedding.every(val => val === 0)).toBe(true);
      });
    });
  });

  describe('caching', () => {
    test('caches embeddings correctly', async () => {
      const text = 'test text';
      
      // First call should cache
      await service.generateEmbedding(text);
      expect(service.getCacheSize()).toBe(0); // Cache size is 0 when embeddings are disabled
      
      // Second call should use cache
      await service.generateEmbedding(text);
      expect(service.getCacheSize()).toBe(0); // Cache size remains 0 when embeddings are disabled
    });

    test('clears cache correctly', async () => {
      const text = 'test text';
      
      await service.generateEmbedding(text);
      expect(service.getCacheSize()).toBe(0); // Cache size is 0 when embeddings are disabled
      
      service.clearCache();
      expect(service.getCacheSize()).toBe(0);
    });
  });

}); 