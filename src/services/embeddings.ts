import { RateLimiter } from '../utils/security.js';
import { withTimeout, DEFAULT_TIMEOUTS } from '../utils/unified-timeout.js';
import { ProviderFactory, EmbeddingProvider } from './embedding-providers/index.js';

/**
 * Enhanced embedding service using progressive vector enhancement architecture
 * @remarks
 * Provides text-to-vector conversion with pluggable providers and stores.
 * Supports progressive enhancement from zero-config to advanced vector search.
 */
export class EmbeddingService {
  private provider: EmbeddingProvider | null = null;
  private initPromise: Promise<void> | null = null;
  private cache = new Map<string, number[]>();
  private rateLimiter = new RateLimiter(100); // 100ms between requests

  /**
   * Initializes the embedding service with provider and store
   * @remarks
   * Creates provider from environment configuration with automatic fallback.
   * Initializes vector store for persistent storage.
   */
  async initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._doInitialize();
    return this.initPromise;
  }

  private async _doInitialize(): Promise<void> {
    if (this.provider) return;

    try {
      // Create embedding provider from environment
      this.provider = await ProviderFactory.createFromEnvironment();
      await this.provider.initialize();
      // Successfully initialized embedding provider
    } catch (error) {
      // Failed to initialize embedding service
      // Use fallback provider
      this.provider = await ProviderFactory.createProvider('none');
      await this.provider.initialize();
    }
  }

  /**
   * Generates semantic embedding for given text
   * @remarks
   * Uses configured provider with caching and rate limiting.
   * Falls back gracefully if provider fails.
   * @param text - Text to convert to embedding
   * @returns Vector representation of the text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    // Check cache first
    const cached = this.cache.get(text);
    if (cached) {
      return cached;
    }

    // Initialize if not already done
    await this.initialize();

    if (!this.provider) {
      throw new Error('Embedding provider not initialized');
    }

    // Apply rate limiting and timeout
    return await this.rateLimiter.enforce(async () => {
      return await withTimeout(
        this._generateEmbeddingInternal(text),
        DEFAULT_TIMEOUTS.EMBEDDING,
        'embedding generation'
      );
    });
  }

  private async _generateEmbeddingInternal(text: string): Promise<number[]> {
    if (!this.provider) {
      throw new Error('Provider not available');
    }

    try {
      const embedding = await this.provider.generateEmbedding(text);

      // Cache the result
      this.cache.set(text, embedding);

      return embedding;
    } catch (error) {
      // Failed to generate embedding - return empty array

      // Try fallback to default provider
      const fallbackProvider = await ProviderFactory.createProvider('none');
      await fallbackProvider.initialize();
      const embedding = await fallbackProvider.generateEmbedding(text);

      // Cache even the fallback result
      this.cache.set(text, embedding);

      return embedding;
    }
  }

  /**
   * Generates embeddings for multiple texts
   * @remarks
   * Processes multiple texts in parallel for efficiency.
   * @param texts - Array of texts to convert to embeddings
   * @returns Array of vector representations
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    await this.initialize();

    const embeddings = await Promise.all(texts.map((text) => this.generateEmbedding(text)));
    return embeddings;
  }

  /**
   * Clears the embedding cache
   * @remarks
   * Removes all cached embeddings to free memory.
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Gets the current cache size
   * @remarks
   * Returns the number of cached embeddings for monitoring.
   * @returns Number of cached embeddings
   */
  getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * Gets the embedding dimension from current provider
   */
  getEmbeddingDimension(): number {
    if (!this.provider) {
      return 1; // Default for none provider
    }
    return this.provider.getDimensions();
  }

  /**
   * Gets current provider name
   */
  getProviderName(): string {
    if (!this.provider) {
      return 'Not initialized';
    }
    return this.provider.getName();
  }

  /**
   * Checks which providers are available
   */
  async checkProviderAvailability(): Promise<Record<string, boolean>> {
    return await ProviderFactory.checkAvailability();
  }
}

// Export a singleton instance for backward compatibility
export const embeddingService = new EmbeddingService();
