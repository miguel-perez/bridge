import { EmbeddingProvider, ProviderConfig } from './types.js';
import { NoneProvider } from './none-provider.js';
import { VoyageAIProvider } from './voyage-provider.js';
import { OpenAIProvider } from './openai-provider.js';
import { TensorFlowJSProvider } from './tensorflow-provider.js';

export type ProviderType = 'none' | 'voyage' | 'openai' | 'tensorflow';

export class ProviderFactory {
  private static providers = new Map<ProviderType, new (config: ProviderConfig) => EmbeddingProvider>([
    ['none', NoneProvider],
    ['voyage', VoyageAIProvider],
    ['openai', OpenAIProvider],
    ['tensorflow', TensorFlowJSProvider],
  ]);

  /**
   * Create an embedding provider based on type and configuration
   */
  static createProvider(type: ProviderType, config?: ProviderConfig): EmbeddingProvider {
    const ProviderClass = this.providers.get(type);
    
    if (!ProviderClass) {
      throw new Error(`Unknown provider type: ${type}`);
    }

    return new ProviderClass(config || {});
  }

  /**
   * Create provider from environment configuration
   */
  static async createFromEnvironment(): Promise<EmbeddingProvider> {
    const providerType = process.env.BRIDGE_EMBEDDING_PROVIDER as ProviderType;
    
    // Default to none provider for zero-config
    if (!providerType) {
      return this.createProvider('none');
    }

    // Create provider with environment-specific config
    const config: ProviderConfig = {};

    switch (providerType) {
      case 'voyage':
        config.apiKey = process.env.VOYAGE_API_KEY;
        config.model = process.env.VOYAGE_MODEL || 'voyage-3-large';
        config.dimensions = process.env.VOYAGE_DIMENSIONS ? 
          parseInt(process.env.VOYAGE_DIMENSIONS) : undefined;
        break;

      case 'openai':
        config.apiKey = process.env.OPENAI_API_KEY;
        config.model = process.env.OPENAI_MODEL || 'text-embedding-3-large';
        config.dimensions = process.env.OPENAI_DIMENSIONS ? 
          parseInt(process.env.OPENAI_DIMENSIONS) : undefined;
        break;

      case 'tensorflow':
        // TensorFlow.js doesn't need API keys
        break;

      case 'none':
        // No configuration needed
        break;

      default:
        throw new Error(`Unknown provider type: ${providerType}`);
    }

    const provider = this.createProvider(providerType, config);
    
    // Check if provider is available
    const isAvailable = await provider.isAvailable();
    if (!isAvailable) {
      if (!process.env.BRIDGE_TEST_MODE && process.env.NODE_ENV !== 'test') {
        console.warn(`Provider ${providerType} is not available, falling back to none provider`);
      }
      return this.createProvider('none');
    }

    return provider;
  }

  /**
   * Register a custom provider
   */
  static registerProvider(
    type: string, 
    providerClass: new (config: ProviderConfig) => EmbeddingProvider
  ): void {
    this.providers.set(type as ProviderType, providerClass);
  }

  /**
   * Get available provider types
   */
  static getAvailableTypes(): ProviderType[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check which providers are currently available
   */
  static async checkAvailability(): Promise<Record<ProviderType, boolean>> {
    const results: Record<string, boolean> = {};
    
    for (const [type] of this.providers) {
      try {
        const provider = this.createProvider(type);
        results[type] = await provider.isAvailable();
      } catch {
        results[type] = false;
      }
    }

    return results as Record<ProviderType, boolean>;
  }
}