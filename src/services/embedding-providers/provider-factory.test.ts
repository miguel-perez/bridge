import { ProviderFactory } from './provider-factory.js';
import { NoneProvider } from './none-provider.js';
import { VoyageAIProvider } from './voyage-provider.js';
import { OpenAIProvider } from './openai-provider.js';
import { TensorFlowJSProvider } from './tensorflow-provider.js';
import { BaseEmbeddingProvider } from './base-provider.js';
import { ProviderConfig } from './types.js';

// Mock fetch for API providers
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

// Custom test provider
class TestProvider extends BaseEmbeddingProvider {
  async initialize(): Promise<void> {
    this.initialized = true;
  }
  async generateEmbedding(): Promise<number[]> {
    return [0.1, 0.2];
  }
  getDimensions(): number {
    return 2;
  }
  getName(): string {
    return 'TestProvider';
  }
}

describe('ProviderFactory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    delete process.env.BRIDGE_EMBEDDING_PROVIDER;
    delete process.env.VOYAGE_API_KEY;
    delete process.env.OPENAI_API_KEY;
  });

  describe('createProvider', () => {
    it('should create none provider', () => {
      const provider = ProviderFactory.createProvider('none');
      expect(provider).toBeInstanceOf(NoneProvider);
    });

    it('should create voyage provider', () => {
      const provider = ProviderFactory.createProvider('voyage', { apiKey: 'test-key' });
      expect(provider).toBeInstanceOf(VoyageAIProvider);
    });

    it('should create openai provider', () => {
      const provider = ProviderFactory.createProvider('openai', { apiKey: 'test-key' });
      expect(provider).toBeInstanceOf(OpenAIProvider);
    });

    it('should throw error for unknown provider type', () => {
      expect(() => ProviderFactory.createProvider('unknown' as any)).toThrow(
        'Unknown provider type: unknown'
      );
    });

    it('should pass config to provider', () => {
      const config = { apiKey: 'test-key', model: 'custom-model' };
      const provider = ProviderFactory.createProvider('voyage', config);
      expect(provider.getName()).toBe('VoyageAI-custom-model');
    });
  });

  describe('createFromEnvironment', () => {
    it('should create none provider by default', async () => {
      const provider = await ProviderFactory.createFromEnvironment();
      expect(provider).toBeInstanceOf(NoneProvider);
    });

    it('should create voyage provider from environment', async () => {
      process.env.BRIDGE_EMBEDDING_PROVIDER = 'voyage';
      process.env.VOYAGE_API_KEY = 'test-key';
      
      mockFetch.mockResolvedValue({ ok: true });
      
      const provider = await ProviderFactory.createFromEnvironment();
      expect(provider).toBeInstanceOf(VoyageAIProvider);
    });

    it('should create openai provider from environment', async () => {
      process.env.BRIDGE_EMBEDDING_PROVIDER = 'openai';
      process.env.OPENAI_API_KEY = 'test-key';
      
      mockFetch.mockResolvedValue({ ok: true });
      
      const provider = await ProviderFactory.createFromEnvironment();
      expect(provider).toBeInstanceOf(OpenAIProvider);
    });

    it('should use environment variables for configuration', async () => {
      process.env.BRIDGE_EMBEDDING_PROVIDER = 'voyage';
      process.env.VOYAGE_API_KEY = 'test-key';
      process.env.VOYAGE_MODEL = 'voyage-3.5-lite';
      process.env.VOYAGE_DIMENSIONS = '512';
      
      mockFetch.mockResolvedValue({ ok: true });
      
      const provider = await ProviderFactory.createFromEnvironment();
      expect(provider.getName()).toBe('VoyageAI-voyage-3.5-lite');
      expect(provider.getDimensions()).toBe(512);
    });

    it('should fall back to none provider if unavailable', async () => {
      process.env.BRIDGE_EMBEDDING_PROVIDER = 'voyage';
      // No API key set
      
      const provider = await ProviderFactory.createFromEnvironment();
      expect(provider).toBeInstanceOf(NoneProvider);
    });

    it('should throw error for unknown provider in environment', async () => {
      process.env.BRIDGE_EMBEDDING_PROVIDER = 'unknown';
      
      await expect(ProviderFactory.createFromEnvironment()).rejects.toThrow(
        'Unknown provider type: unknown'
      );
    });

    it('should handle tensorflow provider', async () => {
      process.env.BRIDGE_EMBEDDING_PROVIDER = 'tensorflow';
      
      // TensorFlow is not available in test environment by default
      // So it should fall back to none provider
      const provider = await ProviderFactory.createFromEnvironment();
      expect(provider).toBeInstanceOf(NoneProvider);
    });

    it('should create tensorflow provider when available', async () => {
      // Mock TensorFlow provider's isAvailable to return true
      const originalIsAvailable = TensorFlowJSProvider.prototype.isAvailable;
      TensorFlowJSProvider.prototype.isAvailable = jest.fn().mockResolvedValue(true);
      
      process.env.BRIDGE_EMBEDDING_PROVIDER = 'tensorflow';
      
      const provider = await ProviderFactory.createFromEnvironment();
      expect(provider).toBeInstanceOf(TensorFlowJSProvider);
      
      // Restore original method
      TensorFlowJSProvider.prototype.isAvailable = originalIsAvailable;
    });
  });

  describe('registerProvider', () => {
    it('should register custom provider', () => {
      ProviderFactory.registerProvider('test', TestProvider);
      
      const provider = ProviderFactory.createProvider('test' as any);
      expect(provider).toBeInstanceOf(TestProvider);
    });

    it('should override existing provider', () => {
      ProviderFactory.registerProvider('none', TestProvider);
      
      const provider = ProviderFactory.createProvider('none');
      expect(provider).toBeInstanceOf(TestProvider);
      
      // Restore original
      ProviderFactory.registerProvider('none', NoneProvider);
    });
  });

  describe('getAvailableTypes', () => {
    it('should return all registered provider types', () => {
      const types = ProviderFactory.getAvailableTypes();
      expect(types).toContain('none');
      expect(types).toContain('voyage');
      expect(types).toContain('openai');
    });

    it('should include custom registered types', () => {
      ProviderFactory.registerProvider('custom' as any, TestProvider);
      
      const types = ProviderFactory.getAvailableTypes();
      expect(types).toContain('custom');
    });
  });

  describe('checkAvailability', () => {
    it('should check availability of all providers', async () => {
      mockFetch.mockResolvedValue({ ok: false });
      
      const availability = await ProviderFactory.checkAvailability();
      
      expect(availability.none).toBe(true); // None is always available
      expect(availability.voyage).toBe(false); // No API key
      expect(availability.openai).toBe(false); // No API key
    });

    it('should detect available providers with credentials', async () => {
      process.env.VOYAGE_API_KEY = 'test-key';
      process.env.OPENAI_API_KEY = 'test-key';
      
      mockFetch.mockResolvedValue({ ok: true });
      
      const availability = await ProviderFactory.checkAvailability();
      
      expect(availability.none).toBe(true);
      expect(availability.voyage).toBe(true);
      expect(availability.openai).toBe(true);
    });

    it('should handle provider initialization errors', async () => {
      // Register a provider that throws on creation
      class ErrorProvider extends BaseEmbeddingProvider {
        constructor() {
          super();
          throw new Error('Constructor error');
        }
        async initialize(): Promise<void> {}
        async generateEmbedding(): Promise<number[]> { return []; }
        getDimensions(): number { return 0; }
        getName(): string { return 'error'; }
      }
      
      ProviderFactory.registerProvider('error' as any, ErrorProvider);
      
      const availability = await ProviderFactory.checkAvailability();
      expect(availability.error).toBe(false);
    });
  });
});