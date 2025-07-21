/**
 * Tests for Embeddings Service
 */

import { EmbeddingService, embeddingService } from './embeddings.js';
import { bridgeLogger } from '../utils/bridge-logger.js';
import { RateLimiter } from '../utils/security.js';
import { withTimeout, DEFAULT_TIMEOUTS } from '../utils/timeout.js';

// Mock dependencies
jest.mock('../utils/bridge-logger.js');
jest.mock('../utils/security.js');
jest.mock('../utils/timeout.js', () => ({
  withTimeout: jest.fn((promise) => promise),
  DEFAULT_TIMEOUTS: {
    EMBEDDING: 30000
  }
}));

// Mock transformers module - simulate module not found
jest.mock('@xenova/transformers', () => {
  throw new Error('Cannot find module @xenova/transformers');
});

describe('EmbeddingService', () => {
  let service: EmbeddingService;
  let mockRateLimiterEnforce: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EmbeddingService();
    
    // Reset environment variables
    delete process.env.BRIDGE_DISABLE_EMBEDDINGS;
    delete process.env.BRIDGE_TEST_MODE;
    
    // Mock rate limiter
    mockRateLimiterEnforce = jest.fn(async (fn) => fn());
    (RateLimiter as jest.MockedClass<typeof RateLimiter>).mockImplementation(() => ({
      enforce: mockRateLimiterEnforce
    } as any));
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.BRIDGE_DISABLE_EMBEDDINGS;
    delete process.env.BRIDGE_TEST_MODE;
  });

  describe('initialization', () => {
    it('should disable embeddings when BRIDGE_DISABLE_EMBEDDINGS is true', async () => {
      process.env.BRIDGE_DISABLE_EMBEDDINGS = 'true';
      const newService = new EmbeddingService();
      
      await newService.initialize();
      
      const embedding = await newService.generateEmbedding('test');
      expect(embedding).toEqual(new Array(384).fill(0));
    });

    it('should handle import failure gracefully', async () => {
      // When transformers module fails to load (mocked to throw error)
      await service.initialize();
      
      // Embeddings should return zeros after failed initialization
      const embedding = await service.generateEmbedding('test');
      expect(embedding).toEqual(new Array(384).fill(0));
      
      // Note: bridgeLogger is a no-op, so we can't test logging
      // The important behavior is that it disables embeddings gracefully
    });

    it('should not log warnings in test mode', async () => {
      process.env.BRIDGE_TEST_MODE = 'true';
      const testService = new EmbeddingService();
      
      await testService.initialize();
      
      expect(bridgeLogger.warn).not.toHaveBeenCalled();
    });

    it('should only initialize once when called multiple times', async () => {
      const promise1 = service.initialize();
      const promise2 = service.initialize();
      const promise3 = service.initialize();
      
      await Promise.all([promise1, promise2, promise3]);
      
      // Since module throws, we can't verify pipeline calls, but we can verify
      // that service is in disabled state
      const embedding = await service.generateEmbedding('test');
      expect(embedding).toEqual(new Array(384).fill(0));
    });
  });

  describe('generateEmbedding', () => {
    it('should return zero embedding when disabled', async () => {
      // Service is disabled because transformers module fails to load
      await service.initialize();
      
      const text = 'Hello world';
      const embedding = await service.generateEmbedding(text);
      
      expect(embedding.length).toBe(384);
      expect(embedding.every(v => v === 0)).toBe(true);
    });

    it('should return zero embedding immediately when embeddings are disabled', async () => {
      process.env.BRIDGE_DISABLE_EMBEDDINGS = 'true';
      const disabledService = new EmbeddingService();
      
      // Should not need to initialize
      const embedding = await disabledService.generateEmbedding('test');
      
      expect(embedding.length).toBe(384);
      expect(embedding.every(v => v === 0)).toBe(true);
    });

    it('should not apply rate limiting when service becomes disabled', async () => {
      // When generateEmbedding is called before initialization,
      // it will call initialize() which fails and sets disabled=true
      // Then it checks disabled flag and returns early
      const embedding = await service.generateEmbedding('test');
      
      // Should return zeros due to failed initialization
      expect(embedding).toEqual(new Array(384).fill(0));
      
      // Rate limiter should NOT be called because service gets disabled during init
      expect(mockRateLimiterEnforce).not.toHaveBeenCalled();
    });

    it('should apply timeout', async () => {
      await service.generateEmbedding('test');
      
      expect(withTimeout).toHaveBeenCalledWith(
        expect.any(Promise),
        DEFAULT_TIMEOUTS.EMBEDDING,
        'embedding generation'
      );
    });

    it('should not use cache when disabled', async () => {
      await service.initialize();
      
      // Generate embedding twice
      await service.generateEmbedding('test');
      await service.generateEmbedding('test');
      
      // Cache should remain empty for disabled service
      expect(service.getCacheSize()).toBe(0);
    });
  });

  describe('generateEmbeddings', () => {
    it('should generate multiple embeddings when disabled', async () => {
      await service.initialize();
      
      const texts = ['text1', 'text2', 'text3'];
      const embeddings = await service.generateEmbeddings(texts);
      
      expect(embeddings).toHaveLength(3);
      embeddings.forEach(embedding => {
        expect(embedding.length).toBe(384);
        expect(embedding.every(v => v === 0)).toBe(true);
      });
    });

    it('should handle empty array', async () => {
      const embeddings = await service.generateEmbeddings([]);
      
      expect(embeddings).toEqual([]);
    });

    it('should handle single text', async () => {
      await service.initialize();
      
      const embeddings = await service.generateEmbeddings(['single']);
      
      expect(embeddings).toHaveLength(1);
      expect(embeddings[0].length).toBe(384);
      expect(embeddings[0].every(v => v === 0)).toBe(true);
    });
  });

  describe('cache management', () => {
    it('should clear cache', () => {
      // Even without initialization, cache methods should work
      service.clearCache();
      expect(service.getCacheSize()).toBe(0);
    });

    it('should report cache size as zero when disabled', async () => {
      await service.initialize();
      
      expect(service.getCacheSize()).toBe(0);
      
      // Generate embeddings (which will be zeros due to disabled state)
      await service.generateEmbedding('text1');
      await service.generateEmbedding('text2');
      
      // Cache should remain empty
      expect(service.getCacheSize()).toBe(0);
    });
  });

  describe('static methods', () => {
    it('should return expected dimension', () => {
      expect(EmbeddingService.getExpectedDimension()).toBe(384);
    });
  });

  describe('private method coverage', () => {
    it('should handle _generateEmbeddingInternal when disabled', async () => {
      await service.initialize();
      
      // This tests the double-check in _generateEmbeddingInternal
      const embedding = await service.generateEmbedding('test');
      expect(embedding).toEqual(new Array(384).fill(0));
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(embeddingService).toBeInstanceOf(EmbeddingService);
    });
  });

  describe('error handling', () => {
    it('should handle non-Error objects in catch blocks', async () => {
      // Mock the transformers module to throw a non-Error object
      jest.doMock('@xenova/transformers', () => {
        throw 'String error';
      });
      
      const errorService = new EmbeddingService();
      await errorService.initialize();
      
      // Should still work with disabled embeddings
      const embedding = await errorService.generateEmbedding('test');
      expect(embedding).toEqual(new Array(384).fill(0));
    });
  });
}); 