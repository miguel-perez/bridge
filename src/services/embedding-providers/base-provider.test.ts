import { BaseEmbeddingProvider } from './base-provider.js';
import { ProviderConfig } from './types.js';

// Test implementation of BaseEmbeddingProvider
class TestProvider extends BaseEmbeddingProvider {
  private dimensions: number;

  constructor(config: ProviderConfig = {}) {
    super(config);
    this.dimensions = config.dimensions || 128;
  }

  async initialize(): Promise<void> {
    this.initialized = true;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    this.validateText(text);
    // Generate mock embedding
    const vector = Array(this.dimensions)
      .fill(0)
      .map(() => Math.random() - 0.5);
    return this.normalizeVector(vector);
  }

  getDimensions(): number {
    return this.dimensions;
  }

  getName(): string {
    return 'TestProvider';
  }
}

describe('BaseEmbeddingProvider', () => {
  let provider: TestProvider;

  beforeEach(() => {
    provider = new TestProvider();
  });

  describe('validateText', () => {
    it('should accept valid text', async () => {
      await expect(provider.generateEmbedding('valid text')).resolves.toBeDefined();
    });

    it('should reject empty text', async () => {
      await expect(provider.generateEmbedding('')).rejects.toThrow(
        'Text must be a non-empty string'
      );
    });

    it('should reject null text', async () => {
      await expect(provider.generateEmbedding(null as any)).rejects.toThrow(
        'Text must be a non-empty string'
      );
    });

    it('should reject undefined text', async () => {
      await expect(provider.generateEmbedding(undefined as any)).rejects.toThrow(
        'Text must be a non-empty string'
      );
    });

    it('should reject text exceeding 1M characters', async () => {
      const longText = 'a'.repeat(1000001);
      await expect(provider.generateEmbedding(longText)).rejects.toThrow(
        'Text exceeds maximum length of 1M characters'
      );
    });
  });

  describe('normalizeVector', () => {
    it('should normalize a vector correctly', async () => {
      const embedding = await provider.generateEmbedding('test');
      const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
      expect(magnitude).toBeCloseTo(1.0, 5);
    });

    it('should handle zero vector', async () => {
      // Create a provider that returns zero vector
      class ZeroProvider extends TestProvider {
        async generateEmbedding(): Promise<number[]> {
          return this.normalizeVector(new Array(this.getDimensions()).fill(0));
        }
      }
      const zeroProvider = new ZeroProvider();
      const embedding = await zeroProvider.generateEmbedding('test');
      expect(embedding.every((val) => val === 0)).toBe(true);
    });
  });

  describe('isAvailable', () => {
    it('should return true when provider can be initialized', async () => {
      expect(await provider.isAvailable()).toBe(true);
    });

    it('should return false when initialization fails', async () => {
      class FailingProvider extends TestProvider {
        async initialize(): Promise<void> {
          throw new Error('Initialization failed');
        }
      }
      const failingProvider = new FailingProvider();
      expect(await failingProvider.isAvailable()).toBe(false);
    });

    it('should initialize provider if not already initialized', async () => {
      const initSpy = jest.spyOn(provider, 'initialize');
      await provider.isAvailable();
      expect(initSpy).toHaveBeenCalled();
    });

    it('should not re-initialize if already initialized', async () => {
      await provider.initialize();
      const initSpy = jest.spyOn(provider, 'initialize');
      await provider.isAvailable();
      expect(initSpy).not.toHaveBeenCalled();
    });
  });

  describe('configuration', () => {
    it('should accept custom dimensions', () => {
      const customProvider = new TestProvider({ dimensions: 256 });
      expect(customProvider.getDimensions()).toBe(256);
    });

    it('should use default dimensions when not specified', () => {
      expect(provider.getDimensions()).toBe(128);
    });

    it('should store configuration', () => {
      const config = { dimensions: 512, apiKey: 'test-key' };
      const customProvider = new TestProvider(config);
      expect(customProvider.getDimensions()).toBe(512);
    });
  });

  describe('getName', () => {
    it('should return provider name', () => {
      expect(provider.getName()).toBe('TestProvider');
    });
  });
});