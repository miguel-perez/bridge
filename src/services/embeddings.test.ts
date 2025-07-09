import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock the transformers pipeline
jest.unstable_mockModule('@xenova/transformers', () => ({
  pipeline: jest.fn()
}));

describe('EmbeddingService', () => {
  let service: any;
  let mockPipeline: jest.MockedFunction<any>;
  let mockEmbedder: jest.MockedFunction<any>;

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Import the mocked module
    const { pipeline } = await import('@xenova/transformers');
    mockPipeline = pipeline as jest.MockedFunction<any>;
    
    // Create mock embedder function
    mockEmbedder = jest.fn();
    mockPipeline.mockResolvedValue(mockEmbedder);
    
    // Import the service after mocking
    const { EmbeddingService } = await import('./embeddings.js');
    service = new EmbeddingService();
  });

  afterEach(() => {
    jest.clearAllMocks();
    if (service.clearCache) {
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
    test('initializes successfully on first call', async () => {
      mockEmbedder.mockResolvedValue({
        data: new Float32Array(384).fill(0.1)
      });

      await service.initialize();

      expect(mockPipeline).toHaveBeenCalledWith(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2',
        {
          revision: 'main',
          quantized: false
        }
      );
    });

    test('does not reinitialize if already initialized', async () => {
      mockEmbedder.mockResolvedValue({
        data: new Float32Array(384).fill(0.1)
      });

      await service.initialize();
      await service.initialize(); // Second call

      expect(mockPipeline).toHaveBeenCalledTimes(1);
    });

    test('throws error on initialization failure', async () => {
      const error = new Error('Model loading failed');
      mockPipeline.mockRejectedValue(error);

      await expect(service.initialize()).rejects.toThrow(
        'Failed to initialize embedding service: Model loading failed'
      );
    });
  });

  describe('generateEmbedding', () => {
    beforeEach(async () => {
      mockEmbedder.mockResolvedValue({
        data: new Float32Array(384).fill(0.1)
      });
      await service.initialize();
    });

    test('generates embedding for single text', async () => {
      const text = 'Hello world';
      const embedding = await service.generateEmbedding(text);

      expect(embedding).toHaveLength(384);
      expect(embedding.every(val => typeof val === 'number')).toBe(true);
      expect(mockEmbedder).toHaveBeenCalledWith(text, {
        pooling: 'mean',
        normalize: true
      });
    });

    test('caches embeddings and returns cached result', async () => {
      const text = 'Cached text';
      
      // First call
      const embedding1 = await service.generateEmbedding(text);
      expect(mockEmbedder).toHaveBeenCalledTimes(1);
      
      // Second call with same text
      const embedding2 = await service.generateEmbedding(text);
      expect(mockEmbedder).toHaveBeenCalledTimes(1); // Should not call again
      
      expect(embedding1).toEqual(embedding2);
    });

    test('handles different text inputs separately', async () => {
      const text1 = 'First text';
      const text2 = 'Second text';
      
      await service.generateEmbedding(text1);
      await service.generateEmbedding(text2);
      
      expect(mockEmbedder).toHaveBeenCalledTimes(2);
    });

    test('handles array result format', async () => {
      // The implementation expects an object with a data property
      mockEmbedder.mockResolvedValue({ data: new Float32Array(384).fill(0.2) });
      
      const embedding = await service.generateEmbedding('Test text');
      
      expect(embedding).toHaveLength(384);
      embedding.forEach(val => expect(val).toBeCloseTo(0.2, 5));
    });

    test('handles sequence embeddings with pooling', async () => {
      // Mock a sequence embedding (768 dimensions = 2 * 384)
      const sequenceData = new Float32Array(768);
      for (let i = 0; i < 768; i++) {
        sequenceData[i] = i % 2 === 0 ? 0.1 : 0.3; // Alternating values
      }
      mockEmbedder.mockResolvedValue({ data: sequenceData });
      
      const embedding = await service.generateEmbedding('Sequence text');
      
      expect(embedding).toHaveLength(384);
      // Compute expected pooled value for index 0
      // pooled[0] = (sequenceData[0] + sequenceData[384]) / 2 = (0.1 + 0.1) / 2 = 0.1
      expect(embedding[0]).toBeCloseTo(0.1, 5);
      // pooled[1] = (sequenceData[1] + sequenceData[385]) / 2 = (0.3 + 0.3) / 2 = 0.3
      expect(embedding[1]).toBeCloseTo(0.3, 5);
    });

    test('throws error for empty embedding result', async () => {
      mockEmbedder.mockResolvedValue({ data: new Float32Array(0) });
      
      await expect(service.generateEmbedding('Test')).rejects.toThrow(
        'Generated embedding is empty'
      );
    });

    test('throws error for invalid embedding dimension', async () => {
      mockEmbedder.mockResolvedValue({
        data: new Float32Array(500) // Invalid dimension
      });
      
      await expect(service.generateEmbedding('Test')).rejects.toThrow(
        'Embedding dimension mismatch: expected 384 or a multiple, got 500'
      );
    });

    test('throws error for unexpected result format', async () => {
      mockEmbedder.mockResolvedValue(null);
      
      await expect(service.generateEmbedding('Test')).rejects.toThrow(
        'Unexpected embedding result format'
      );
    });

    test('throws error on embedder failure', async () => {
      const error = new Error('Embedding generation failed');
      mockEmbedder.mockRejectedValue(error);
      
      await expect(service.generateEmbedding('Test')).rejects.toThrow(
        'Failed to generate embedding: Embedding generation failed'
      );
    });
  });

  describe('generateEmbeddings', () => {
    beforeEach(async () => {
      mockEmbedder.mockResolvedValue({
        data: new Float32Array(384).fill(0.1)
      });
      await service.initialize();
    });

    test('generates embeddings for multiple texts', async () => {
      const texts = ['Text 1', 'Text 2', 'Text 3'];
      const embeddings = await service.generateEmbeddings(texts);
      
      expect(embeddings).toHaveLength(3);
      embeddings.forEach(embedding => {
        expect(embedding).toHaveLength(384);
      });
      
      expect(mockEmbedder).toHaveBeenCalledTimes(3);
    });

    test('handles empty array', async () => {
      const embeddings = await service.generateEmbeddings([]);
      
      expect(embeddings).toEqual([]);
      expect(mockEmbedder).not.toHaveBeenCalled();
    });

    test('handles single text array', async () => {
      const texts = ['Single text'];
      const embeddings = await service.generateEmbeddings(texts);
      
      expect(embeddings).toHaveLength(1);
      expect(embeddings[0]).toHaveLength(384);
    });
  });

  describe('caching', () => {
    beforeEach(async () => {
      mockEmbedder.mockResolvedValue({
        data: new Float32Array(384).fill(0.1)
      });
      await service.initialize();
    });

    test('clearCache removes all cached embeddings', async () => {
      const text = 'Cache test';
      
      await service.generateEmbedding(text);
      expect(service.getCacheSize()).toBe(1);
      
      service.clearCache();
      expect(service.getCacheSize()).toBe(0);
      
      // Should call embedder again after cache clear
      await service.generateEmbedding(text);
      expect(mockEmbedder).toHaveBeenCalledTimes(2);
    });

    test('getCacheSize returns correct count', async () => {
      expect(service.getCacheSize()).toBe(0);
      
      await service.generateEmbedding('Text 1');
      expect(service.getCacheSize()).toBe(1);
      
      await service.generateEmbedding('Text 2');
      expect(service.getCacheSize()).toBe(2);
      
      await service.generateEmbedding('Text 1'); // Should use cache
      expect(service.getCacheSize()).toBe(2); // No new cache entry
    });
  });

  describe('text hashing', () => {
    test('same text produces same hash', async () => {
      const text = 'Identical text';
      
      // Generate embedding twice
      mockEmbedder.mockResolvedValue({
        data: new Float32Array(384).fill(0.1)
      });
      await service.initialize();
      
      await service.generateEmbedding(text);
      await service.generateEmbedding(text);
      
      // Should only call embedder once due to caching
      expect(mockEmbedder).toHaveBeenCalledTimes(1);
    });

    test('different text produces different hash', async () => {
      const text1 = 'Text one';
      const text2 = 'Text two';
      
      mockEmbedder.mockResolvedValue({
        data: new Float32Array(384).fill(0.1)
      });
      await service.initialize();
      
      await service.generateEmbedding(text1);
      await service.generateEmbedding(text2);
      
      // Should call embedder twice
      expect(mockEmbedder).toHaveBeenCalledTimes(2);
    });
  });

  describe('edge cases', () => {
    beforeEach(async () => {
      mockEmbedder.mockResolvedValue({
        data: new Float32Array(384).fill(0.1)
      });
      await service.initialize();
    });

    test('handles empty string', async () => {
      const embedding = await service.generateEmbedding('');
      
      expect(embedding).toHaveLength(384);
      expect(mockEmbedder).toHaveBeenCalledWith('', {
        pooling: 'mean',
        normalize: true
      });
    });

    test('handles very long text', async () => {
      const longText = 'A'.repeat(10000);
      const embedding = await service.generateEmbedding(longText);
      
      expect(embedding).toHaveLength(384);
    });

    test('handles special characters', async () => {
      const specialText = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const embedding = await service.generateEmbedding(specialText);
      
      expect(embedding).toHaveLength(384);
    });

    test('handles unicode characters', async () => {
      const unicodeText = 'Hello 世界 🌍';
      const embedding = await service.generateEmbedding(unicodeText);
      
      expect(embedding).toHaveLength(384);
    });
  });

  describe('singleton instance', () => {
    test('embeddingService is a singleton instance', async () => {
      const { embeddingService } = await import('./embeddings.js');
      expect(embeddingService).toBeDefined();
      expect(typeof embeddingService.generateEmbedding).toBe('function');
    });

    test('singleton instance works correctly', async () => {
      const { embeddingService } = await import('./embeddings.js');
      mockEmbedder.mockResolvedValue({
        data: new Float32Array(384).fill(0.1)
      });
      
      const embedding = await embeddingService.generateEmbedding('Test');
      expect(embedding).toHaveLength(384);
    });
  });
}); 