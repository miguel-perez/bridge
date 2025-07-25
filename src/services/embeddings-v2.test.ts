import { EmbeddingServiceV2 } from './embeddings-v2.js';
import { ProviderFactory } from './embedding-providers/index.js';
import { NoneProvider } from './embedding-providers/none-provider.js';
import { VoyageAIProvider } from './embedding-providers/voyage-provider.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

// Mock logger
jest.mock('../utils/bridge-logger.js', () => ({
  bridgeLogger: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('EmbeddingServiceV2', () => {
  let service: EmbeddingServiceV2;
  let tempDir: string;

  beforeEach(async () => {
    jest.clearAllMocks();
    service = new EmbeddingServiceV2();
    
    // Create temp directory for vector store
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bridge-test-'));
    process.env.HOME = tempDir;
    
    // Reset environment
    delete process.env.BRIDGE_EMBEDDING_PROVIDER;
    delete process.env.VOYAGE_API_KEY;
  });

  afterEach(async () => {
    // Cleanup
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  describe('initialization', () => {
    it('should initialize with none provider by default', async () => {
      await service.initialize();
      expect(service.getProviderName()).toBe('NoneProvider');
      expect(service.getStoreName()).toBe('JSONVectorStore');
    });

    it('should initialize with configured provider', async () => {
      process.env.BRIDGE_EMBEDDING_PROVIDER = 'voyage';
      process.env.VOYAGE_API_KEY = 'test-key';
      mockFetch.mockResolvedValue({ ok: true });

      await service.initialize();
      expect(service.getProviderName()).toBe('VoyageAI-voyage-3-large');
    });

    it('should fall back to none provider on error', async () => {
      process.env.BRIDGE_EMBEDDING_PROVIDER = 'voyage';
      // No API key, should fail and fall back

      await service.initialize();
      expect(service.getProviderName()).toBe('NoneProvider');
    });

    it('should initialize only once', async () => {
      const spy = jest.spyOn(ProviderFactory, 'createFromEnvironment');
      
      await service.initialize();
      await service.initialize();
      await service.initialize();
      
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('generateEmbedding', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should generate embedding', async () => {
      const embedding = await service.generateEmbedding('test text');
      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.length).toBe(1); // NoneProvider returns 1D
    });

    it('should cache embeddings', async () => {
      const text = 'cached text';
      const embedding1 = await service.generateEmbedding(text);
      
      // Clear provider to ensure cache is used
      (service as any).provider = null;
      
      const embedding2 = await service.generateEmbedding(text);
      expect(embedding2).toEqual(embedding1);
    });

    it('should apply rate limiting', async () => {
      const startTime = Date.now();
      
      // Generate embeddings sequentially to trigger rate limiting
      await service.generateEmbedding('text1');
      await service.generateEmbedding('text2');
      await service.generateEmbedding('text3');
      
      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeGreaterThanOrEqual(200); // At least 2 rate limit delays
    });

    it('should handle provider errors with fallback', async () => {
      // Create a failing provider
      const failingProvider = {
        generateEmbedding: jest.fn().mockRejectedValue(new Error('Provider failed')),
        getName: () => 'FailingProvider',
        getDimensions: () => 128,
        initialize: jest.fn(),
        isAvailable: jest.fn().mockResolvedValue(true),
      };
      
      (service as any).provider = failingProvider;
      
      const embedding = await service.generateEmbedding('test');
      expect(embedding).toEqual([0]); // Fallback to none provider
    });
  });

  describe('generateEmbeddings', () => {
    it('should generate multiple embeddings', async () => {
      const texts = ['text1', 'text2', 'text3'];
      const embeddings = await service.generateEmbeddings(texts);
      
      expect(embeddings).toHaveLength(3);
      embeddings.forEach(embedding => {
        expect(Array.isArray(embedding)).toBe(true);
      });
    });
  });

  describe('vector storage', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should store vector with metadata', async () => {
      await service.storeVector('id1', 'test text', { category: 'test' });
      
      const results = await service.search('test text');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('id1');
      expect(results[0].metadata.category).toBe('test');
    });

    it('should search for similar vectors', async () => {
      await service.storeVector('id1', 'hello world', { type: 'greeting' });
      await service.storeVector('id2', 'goodbye world', { type: 'farewell' });
      await service.storeVector('id3', 'hello there', { type: 'greeting' });
      
      const results = await service.search('hello', { limit: 2 });
      expect(results).toHaveLength(2);
    });

    it('should apply filters in search', async () => {
      await service.storeVector('id1', 'test1', { category: 'A' });
      await service.storeVector('id2', 'test2', { category: 'B' });
      await service.storeVector('id3', 'test3', { category: 'A' });
      
      const results = await service.search('test', { 
        filter: { category: 'A' },
        limit: 10 
      });
      
      expect(results).toHaveLength(2);
      expect(results.every(r => r.metadata.category === 'A')).toBe(true);
    });
  });

  describe('cache management', () => {
    it('should track cache size', async () => {
      expect(service.getCacheSize()).toBe(0);
      
      await service.generateEmbedding('text1');
      expect(service.getCacheSize()).toBe(1);
      
      await service.generateEmbedding('text2');
      expect(service.getCacheSize()).toBe(2);
    });

    it('should clear cache', async () => {
      await service.generateEmbedding('text1');
      await service.generateEmbedding('text2');
      
      expect(service.getCacheSize()).toBe(2);
      
      service.clearCache();
      expect(service.getCacheSize()).toBe(0);
    });
  });

  describe('provider information', () => {
    it('should get embedding dimension', async () => {
      await service.initialize();
      expect(service.getEmbeddingDimension()).toBe(1); // NoneProvider
    });

    it('should get embedding dimension for API provider', async () => {
      process.env.BRIDGE_EMBEDDING_PROVIDER = 'voyage';
      process.env.VOYAGE_API_KEY = 'test-key';
      process.env.VOYAGE_DIMENSIONS = '512';
      mockFetch.mockResolvedValue({ ok: true });

      await service.initialize();
      expect(service.getEmbeddingDimension()).toBe(512);
    });

    it('should check provider availability', async () => {
      const availability = await service.checkProviderAvailability();
      
      expect(availability.none).toBe(true);
      expect(availability.voyage).toBe(false); // No API key
      expect(availability.openai).toBe(false); // No API key
    });
  });

  describe('error handling', () => {
    it('should throw if provider not initialized', async () => {
      const newService = new EmbeddingServiceV2();
      (newService as any).initPromise = Promise.resolve(); // Pretend initialized
      (newService as any).provider = null;
      
      await expect(newService.generateEmbedding('test')).rejects.toThrow(
        'Embedding provider not initialized'
      );
    });

    it('should throw if vector store not initialized', async () => {
      await service.initialize();
      (service as any).vectorStore = null;
      
      await expect(service.storeVector('id', 'text', {})).rejects.toThrow(
        'Vector store not initialized'
      );
    });
  });
});