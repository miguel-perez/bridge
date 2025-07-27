import { EmbeddingService } from './embeddings.js';
import { ProviderFactory } from './embedding-providers/index.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

// Mock TensorFlow.js modules for default provider
const mockEmbed = jest.fn();
const mockDispose = jest.fn();
const mockLoad = jest.fn();

// Set up global mocks for test environment
(global as unknown as Record<string, unknown>).__mocked_universal_sentence_encoder = {
  load: mockLoad,
};

describe('EmbeddingService', () => {
  let service: EmbeddingService;
  let tempDir: string;

  beforeEach(async () => {
    jest.clearAllMocks();
    // Always create a fresh service instance
    service = new EmbeddingService();

    // Create temp directory for vector store
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bridge-test-'));
    process.env.HOME = tempDir;

    // Reset environment
    delete process.env.BRIDGE_EMBEDDING_PROVIDER;
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_MODEL;
    delete process.env.OPENAI_DIMENSIONS;

    // Reset mock implementations
    mockEmbed.mockReset();
    mockDispose.mockReset();
    mockLoad.mockReset();

    // Setup default successful load
    mockLoad.mockResolvedValue({
      embed: mockEmbed,
    });

    // Setup default embedding response
    mockEmbed.mockResolvedValue({
      array: jest.fn().mockResolvedValue([[...Array(512)].map(() => Math.random())]),
      dispose: mockDispose,
    });
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
    it('should initialize with default provider by default', async () => {
      await service.initialize();
      expect(service.getProviderName()).toBe('None');
    });

    it('should initialize with configured provider', async () => {
      process.env.BRIDGE_EMBEDDING_PROVIDER = 'openai';
      process.env.OPENAI_API_KEY = 'test-key';
      mockFetch.mockResolvedValue({ ok: true });

      await service.initialize();
      expect(service.getProviderName()).toBe('OpenAI-text-embedding-3-large');
    });

    it.skip('should fall back to default provider on error', async () => {
      process.env.BRIDGE_EMBEDDING_PROVIDER = 'openai';
      delete process.env.OPENAI_API_KEY; // Ensure no API key
      // No API key, should fail and fall back

      await service.initialize();
      expect(service.getProviderName()).toBe('None');
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
      (service as unknown as Record<string, unknown>).provider = null;

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
      expect(elapsed).toBeGreaterThanOrEqual(190); // At least 2 rate limit delays (with small tolerance)
    });

    it('should handle provider errors with fallback', async () => {
      // Create a failing provider
      const failingProvider = {
        generateEmbedding: jest.fn().mockRejectedValue(new Error('Provider failed')),
        getName: (): string => 'FailingProvider',
        getDimensions: (): number => 128,
        initialize: jest.fn(),
        isAvailable: jest.fn().mockResolvedValue(true),
      };

      (service as unknown as Record<string, unknown>).provider = failingProvider;

      const embedding = await service.generateEmbedding('test');
      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.length).toBe(1); // Fallback to NoneProvider
    });
  });

  describe('generateEmbeddings', () => {
    it('should generate multiple embeddings', async () => {
      const texts = ['text1', 'text2', 'text3'];
      const embeddings = await service.generateEmbeddings(texts);

      expect(embeddings).toHaveLength(3);
      embeddings.forEach((embedding) => {
        expect(Array.isArray(embedding)).toBe(true);
      });
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
      process.env.BRIDGE_EMBEDDING_PROVIDER = 'openai';
      process.env.OPENAI_API_KEY = 'test-key';
      process.env.OPENAI_DIMENSIONS = '1536';
      mockFetch.mockResolvedValue({ ok: true });

      await service.initialize();
      expect(service.getEmbeddingDimension()).toBe(1536);
    });

    it('should check provider availability', async () => {
      const availability = await service.checkProviderAvailability();

      expect(availability.none).toBeDefined();
      expect(availability.openai).toBeDefined();
      expect(typeof availability.none).toBe('boolean');
      expect(typeof availability.openai).toBe('boolean');
    });
  });

  describe('error handling', () => {
    it('should throw if provider not initialized', async () => {
      const newService = new EmbeddingService();
      (newService as unknown as Record<string, unknown>).initPromise = Promise.resolve(); // Pretend initialized
      (newService as unknown as Record<string, unknown>).provider = null;

      await expect(newService.generateEmbedding('test')).rejects.toThrow(
        'Embedding provider not initialized'
      );
    });
  });
});
