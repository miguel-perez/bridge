import { EmbeddingProvider, ProviderConfig } from './types.js';
import { TensorFlowJSProvider } from './tensorflow-provider.js';
import { OpenAIProvider } from './openai-provider.js';

export type ProviderType = 'default' | 'openai';

/**
 *
 */
export class ProviderFactory {
  private static providers = new Map<
    ProviderType,
    new (config: ProviderConfig) => EmbeddingProvider
  >([
    ['default', TensorFlowJSProvider],
    ['openai', OpenAIProvider],
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
   * Automatically infers provider based on available credentials
   */
  static async createFromEnvironment(): Promise<EmbeddingProvider> {
    // Check if OpenAI API key is provided
    const openAIKey = process.env.OPENAI_API_KEY;

    // Allow explicit override via BRIDGE_EMBEDDING_PROVIDER
    const explicitProvider = process.env.BRIDGE_EMBEDDING_PROVIDER as ProviderType;

    // Determine provider type
    let providerType: ProviderType = 'default';

    if (explicitProvider) {
      // Use explicit provider if specified
      providerType = explicitProvider;
    } else if (openAIKey) {
      // Auto-detect OpenAI if API key is present
      providerType = 'openai';
    }

    // Default to local provider if no API key or explicit choice
    if (providerType === 'default') {
      return this.createProvider('default');
    }

    // Create provider with environment-specific config
    const config: ProviderConfig = {};

    switch (providerType) {
      case 'openai':
        config.apiKey = openAIKey;
        config.model = process.env.OPENAI_MODEL || 'text-embedding-3-large';
        config.dimensions = process.env.OPENAI_DIMENSIONS
          ? parseInt(process.env.OPENAI_DIMENSIONS)
          : undefined;
        break;

      default:
        // TensorFlow.js doesn't need API keys
        break;
    }

    const provider = this.createProvider(providerType, config);

    // Check if provider is available
    const isAvailable = await provider.isAvailable();
    if (!isAvailable) {
      if (!process.env.BRIDGE_TEST_MODE && process.env.NODE_ENV !== 'test') {
        console.warn(`Provider ${providerType} is not available, falling back to default provider`);
      }
      return this.createProvider('default');
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
   * Check availability of all providers
   */
  static async checkAvailability(): Promise<Record<ProviderType, boolean>> {
    const results: Record<ProviderType, boolean> = {
      default: false,
      openai: false,
    };

    for (const type of this.getAvailableTypes()) {
      try {
        const provider = this.createProvider(type);
        results[type] = await provider.isAvailable();
      } catch (error) {
        results[type] = false;
      }
    }

    return results;
  }
}
