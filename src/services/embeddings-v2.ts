import { bridgeLogger } from '../utils/bridge-logger.js';
import { RateLimiter } from '../utils/security.js';
import { withTimeout, DEFAULT_TIMEOUTS } from '../utils/timeout.js';
import { ProviderFactory, EmbeddingProvider } from './embedding-providers/index.js';
import { JSONVectorStore, QdrantVectorStore, VectorStore } from './vector-stores/index.js';

/**
 * Enhanced embedding service using progressive vector enhancement architecture
 * @remarks
 * Provides text-to-vector conversion with pluggable providers and stores.
 * Supports progressive enhancement from zero-config to advanced vector search.
 */
export class EmbeddingServiceV2 {
  private provider: EmbeddingProvider | null = null;
  private vectorStore: VectorStore | null = null;
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
    if (this.provider && this.vectorStore) return;

    try {
      // Create embedding provider from environment
      this.provider = await ProviderFactory.createFromEnvironment();
      bridgeLogger.log(`Initialized embedding provider: ${this.provider.getName()}`);

      // Initialize vector store based on configuration
      this.vectorStore = await this.createVectorStore();
      await this.vectorStore.initialize();
      bridgeLogger.log(`Initialized vector store: ${this.vectorStore.getName()}`);
    } catch (error) {
      bridgeLogger.error(
        'Failed to initialize embedding service:',
        error instanceof Error ? error.message : error
      );
      // Use fallback provider and store
      this.provider = await ProviderFactory.createProvider('none');
      this.vectorStore = new JSONVectorStore();
      await this.vectorStore.initialize();
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
      bridgeLogger.warn(
        'Failed to generate embedding:',
        error instanceof Error ? error.message : error
      );
      
      // Try fallback to none provider
      const fallbackProvider = await ProviderFactory.createProvider('none');
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
    
    const embeddings = await Promise.all(
      texts.map((text) => this.generateEmbedding(text))
    );
    return embeddings;
  }

  /**
   * Stores a vector with metadata
   * @param id - Unique identifier for the vector
   * @param text - Original text (used to generate embedding)
   * @param metadata - Additional metadata to store
   */
  async storeVector(id: string, text: string, metadata: Record<string, any>): Promise<void> {
    await this.initialize();
    
    if (!this.vectorStore) {
      throw new Error('Vector store not initialized');
    }

    const embedding = await this.generateEmbedding(text);
    await this.vectorStore.upsert(id, embedding, metadata);
  }

  /**
   * Searches for similar vectors
   * @param text - Query text
   * @param options - Search options (filter, limit)
   * @returns Array of similar results
   */
  async search(
    text: string,
    options?: { filter?: Record<string, any>; limit?: number }
  ) {
    await this.initialize();
    
    if (!this.vectorStore) {
      throw new Error('Vector store not initialized');
    }

    const queryVector = await this.generateEmbedding(text);
    return await this.vectorStore.search(queryVector, options);
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
   * Gets current vector store name
   */
  getStoreName(): string {
    if (!this.vectorStore) {
      return 'Not initialized';
    }
    return this.vectorStore.getName();
  }

  /**
   * Checks which providers are available
   */
  async checkProviderAvailability() {
    return await ProviderFactory.checkAvailability();
  }

  /**
   * Creates vector store based on environment configuration
   */
  private async createVectorStore(): Promise<VectorStore> {
    // Check if Qdrant is configured
    if (process.env.QDRANT_URL) {
      const qdrant = new QdrantVectorStore({
        url: process.env.QDRANT_URL,
        apiKey: process.env.QDRANT_API_KEY,
        collectionName: process.env.QDRANT_COLLECTION,
      });
      
      // Check if Qdrant is available
      const isAvailable = await qdrant.isAvailable();
      if (isAvailable) {
        return qdrant;
      } else {
        bridgeLogger.warn('Qdrant configured but not available, falling back to JSON store');
      }
    }
    
    // Default to JSON store
    return new JSONVectorStore();
  }
}

// Export a singleton instance for backward compatibility
export const embeddingServiceV2 = new EmbeddingServiceV2();