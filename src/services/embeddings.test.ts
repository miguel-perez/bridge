// Mock the transformers pipeline before any imports
jest.mock('@xenova/transformers', () => ({
  pipeline: jest.fn()
}));

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

describe('EmbeddingService', () => {
  let service: any;
  let mockPipeline: jest.MockedFunction<any>;
  let mockEmbedder: jest.MockedFunction<any>;

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Get the mocked pipeline
    const { pipeline } = await import('@xenova/transformers');
    mockPipeline = pipeline as jest.MockedFunction<any>;
    
    // Create mock embedder function
    mockEmbedder = jest.fn() as jest.MockedFunction<any>;
    mockPipeline.mockResolvedValue(mockEmbedder);
    
    // Import the service after mocking
    const { EmbeddingService } = await import('./embeddings.js');
    service = new EmbeddingService();
  });

  afterEach(() => {
    jest.clearAllMocks();
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

    test('disables embeddings on initialization failure', async () => {
      const error = new Error('Model loading failed');
      mockPipeline.mockRejectedValue(error);

      await service.initialize();
      
      // Should not throw, but disable embeddings
      expect(service.disabled).toBe(true);
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
      // Should take first 384 dimensions from 768
      expect(embedding[0]).toBeCloseTo(0.1, 5);
      expect(embedding[1]).toBeCloseTo(0.3, 5);
    });

    test('handles empty embedding result gracefully', async () => {
      mockEmbedder.mockResolvedValue({ data: new Float32Array(0) });
      
      const embedding = await service.generateEmbedding('Test');
      expect(embedding).toHaveLength(384);
      expect(embedding.every(val => val === 0)).toBe(true);
    });

    test('handles invalid embedding dimension gracefully', async () => {
      mockEmbedder.mockResolvedValue({
        data: new Float32Array(500) // Invalid dimension
      });
      
      const embedding = await service.generateEmbedding('Test');
      expect(embedding).toHaveLength(384);
      // Should truncate to 384 dimensions
      expect(embedding.every(val => val === 0)).toBe(true);
    });

    test('handles unexpected result format gracefully', async () => {
      mockEmbedder.mockResolvedValue(null);
      
      const embedding = await service.generateEmbedding('Test');
      expect(embedding).toHaveLength(384);
      expect(embedding.every(val => val === 0)).toBe(true);
    });

    test('handles embedder failure gracefully', async () => {
      const error = new Error('Embedding generation failed');
      mockEmbedder.mockRejectedValue(error);

      const embedding = await service.generateEmbedding('Test');
      expect(embedding).toHaveLength(384);
      expect(embedding.every(val => val === 0)).toBe(true);
    });

    test('handles tensor format with data property', async () => {
      // Mock tensor-like object
      const tensorData = new Float32Array(384).fill(0.5);
      mockEmbedder.mockResolvedValue({
        data: {
          length: 384,
          [Symbol.iterator]: function* () {
            for (let i = 0; i < 384; i++) {
              yield tensorData[i];
            }
          }
        }
      });
      
      const embedding = await service.generateEmbedding('Test');
      expect(embedding).toHaveLength(384);
      expect(embedding.every(val => val === 0.5)).toBe(true);
    });

    test('handles direct array result', async () => {
      const arrayData = new Array(384).fill(0.7);
      mockEmbedder.mockResolvedValue(arrayData);
      
      const embedding = await service.generateEmbedding('Test');
      expect(embedding).toHaveLength(384);
      expect(embedding.every(val => val === 0.7)).toBe(true);
    });

    test('handles short embeddings by padding', async () => {
      const shortData = new Float32Array(200).fill(0.8);
      mockEmbedder.mockResolvedValue({ data: shortData });
      
      const embedding = await service.generateEmbedding('Test');
      expect(embedding).toHaveLength(384);
      // First 200 should be close to 0.8, rest should be 0
      expect(embedding.slice(0, 200).every(val => Math.abs(val - 0.8) < 0.0001)).toBe(true);
      expect(embedding.slice(200).every(val => val === 0)).toBe(true);
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
        expect(embedding.every(val => typeof val === 'number')).toBe(true);
      });
    });
  });

  describe('caching', () => {
    beforeEach(async () => {
      mockEmbedder.mockResolvedValue({
        data: new Float32Array(384).fill(0.1)
      });
      await service.initialize();
    });

    test('caches embeddings correctly', async () => {
      const text = 'Cache test';
      
      // First call should cache
      await service.generateEmbedding(text);
      expect(service.getCacheSize()).toBe(1);
      
      // Second call should use cache
      await service.generateEmbedding(text);
      expect(service.getCacheSize()).toBe(1); // Same cache entry
    });

    test('clears cache correctly', async () => {
      const text = 'Cache clear test';
      
      await service.generateEmbedding(text);
      expect(service.getCacheSize()).toBe(1);
      
      service.clearCache();
      expect(service.getCacheSize()).toBe(0);
    });
  });

  describe('MCP environment', () => {
    test('disables embeddings in MCP environment', async () => {
      // Mock MCP environment
      const originalEnv = process.env.MCP;
      process.env.MCP = 'true';
      
      try {
        const { EmbeddingService } = await import('./embeddings.js');
        const mcpService = new EmbeddingService();
        
        await mcpService.initialize();
        const embedding = await mcpService.generateEmbedding('test');
        
        expect(embedding).toHaveLength(384);
        expect(embedding.every(val => val === 0)).toBe(true);
      } finally {
        process.env.MCP = originalEnv;
      }
    });
  });
}); 