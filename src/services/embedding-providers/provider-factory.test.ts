import { ProviderFactory } from './provider-factory.js';
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
    delete process.env.OPENAI_API_KEY;
  });

  describe('createProvider', () => {
    it('should create default provider', () => {
      const provider = ProviderFactory.createProvider('default');
      expect(provider).toBeInstanceOf(TensorFlowJSProvider);
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
      const provider = ProviderFactory.createProvider('openai', config);
      expect(provider.getName()).toBe('OpenAI-custom-model');
    });
  });

  describe('createFromEnvironment', () => {
    it('should create default provider by default', async () => {
      const provider = await ProviderFactory.createFromEnvironment();
      expect(provider).toBeInstanceOf(TensorFlowJSProvider);
    });

    it('should create default provider when explicitly set', async () => {
      process.env.BRIDGE_EMBEDDING_PROVIDER = 'default';

      const provider = await ProviderFactory.createFromEnvironment();
      expect(provider).toBeInstanceOf(TensorFlowJSProvider);
    });

    it('should auto-detect OpenAI when API key is present', async () => {
      // Set API key but NOT provider type
      process.env.OPENAI_API_KEY = 'test-key';
      // Ensure BRIDGE_EMBEDDING_PROVIDER is not set
      delete process.env.BRIDGE_EMBEDDING_PROVIDER;

      mockFetch.mockResolvedValue({ ok: true });

      const provider = await ProviderFactory.createFromEnvironment();
      expect(provider).toBeInstanceOf(OpenAIProvider);
    });

    it('should respect explicit provider choice over auto-detection', async () => {
      // API key present but explicitly choosing default
      process.env.OPENAI_API_KEY = 'test-key';
      process.env.BRIDGE_EMBEDDING_PROVIDER = 'default';

      const provider = await ProviderFactory.createFromEnvironment();
      expect(provider).toBeInstanceOf(TensorFlowJSProvider);
    });

    it('should create openai provider from environment', async () => {
      process.env.BRIDGE_EMBEDDING_PROVIDER = 'openai';
      process.env.OPENAI_API_KEY = 'test-key';

      mockFetch.mockResolvedValue({ ok: true });

      const provider = await ProviderFactory.createFromEnvironment();
      expect(provider).toBeInstanceOf(OpenAIProvider);
    });

    it('should use environment variables for configuration', async () => {
      process.env.BRIDGE_EMBEDDING_PROVIDER = 'openai';
      process.env.OPENAI_API_KEY = 'test-key';
      process.env.OPENAI_MODEL = 'text-embedding-3-small';
      process.env.OPENAI_DIMENSIONS = '512';

      mockFetch.mockResolvedValue({ ok: true });

      const provider = await ProviderFactory.createFromEnvironment();
      expect(provider).toBeInstanceOf(OpenAIProvider);
      expect(provider.getName()).toBe('OpenAI-text-embedding-3-small');
    });

    it('should use auto-detected OpenAI configuration', async () => {
      // Auto-detection scenario with custom model
      process.env.OPENAI_API_KEY = 'test-key';
      process.env.OPENAI_MODEL = 'text-embedding-3-large';
      delete process.env.BRIDGE_EMBEDDING_PROVIDER;

      mockFetch.mockResolvedValue({ ok: true });

      const provider = await ProviderFactory.createFromEnvironment();
      expect(provider).toBeInstanceOf(OpenAIProvider);
      expect(provider.getName()).toBe('OpenAI-text-embedding-3-large');
    });

    it('should fallback to default provider when openai is not available', async () => {
      process.env.BRIDGE_EMBEDDING_PROVIDER = 'openai';
      process.env.OPENAI_API_KEY = 'test-key';

      mockFetch.mockResolvedValue({ ok: false });

      const provider = await ProviderFactory.createFromEnvironment();
      expect(provider).toBeInstanceOf(TensorFlowJSProvider);
    });

    it('should fallback to default when auto-detected OpenAI is not available', async () => {
      // Auto-detection scenario but OpenAI not available
      process.env.OPENAI_API_KEY = 'test-key';
      delete process.env.BRIDGE_EMBEDDING_PROVIDER;

      mockFetch.mockResolvedValue({ ok: false });

      const provider = await ProviderFactory.createFromEnvironment();
      expect(provider).toBeInstanceOf(TensorFlowJSProvider);
    });

    it('should throw error for unknown provider type in environment', async () => {
      process.env.BRIDGE_EMBEDDING_PROVIDER = 'unknown';

      await expect(ProviderFactory.createFromEnvironment()).rejects.toThrow(
        'Unknown provider type: unknown'
      );
    });
  });

  describe('registerProvider', () => {
    it('should register custom provider', () => {
      ProviderFactory.registerProvider('custom' as any, TestProvider);

      const provider = ProviderFactory.createProvider('custom' as any);
      expect(provider).toBeInstanceOf(TestProvider);
    });

    it('should allow custom provider in environment', async () => {
      ProviderFactory.registerProvider('custom' as any, TestProvider);
      process.env.BRIDGE_EMBEDDING_PROVIDER = 'custom';

      const provider = await ProviderFactory.createFromEnvironment();
      expect(provider).toBeInstanceOf(TestProvider);
    });
  });

  describe('getAvailableTypes', () => {
    it('should return available provider types', () => {
      const types = ProviderFactory.getAvailableTypes();
      expect(types).toContain('default');
      expect(types).toContain('openai');
      // Note: custom providers may be registered during tests, so we check for at least 2
      expect(types.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('checkAvailability', () => {
    it('should check availability of all providers', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const availability = await ProviderFactory.checkAvailability();

      expect(availability).toHaveProperty('default');
      expect(availability).toHaveProperty('openai');
      expect(typeof availability.default).toBe('boolean');
      expect(typeof availability.openai).toBe('boolean');
    });

    it('should handle provider errors gracefully', async () => {
      // Mock a provider that throws during availability check
      class ErrorProvider extends BaseEmbeddingProvider {
        constructor() {
          super();
        }
        async initialize(): Promise<void> {}
        async generateEmbedding(): Promise<number[]> {
          return [];
        }
        getDimensions(): number {
          return 0;
        }
        getName(): string {
          return 'error';
        }
        async isAvailable(): Promise<boolean> {
          throw new Error('Test error');
        }
      }

      ProviderFactory.registerProvider('error' as any, ErrorProvider);

      const availability = await ProviderFactory.checkAvailability();
      expect(availability).toHaveProperty('default');
      expect(availability).toHaveProperty('openai');
    });
  });
});
