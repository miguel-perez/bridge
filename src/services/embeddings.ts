/**
 * Legacy embedding service wrapper
 * @deprecated This file now wraps the new embeddings-v2 service for backward compatibility
 * @remarks
 * Migrated to progressive vector enhancement architecture.
 * The new service supports multiple embedding providers and vector stores.
 */

import { embeddingServiceV2 } from './embeddings-v2.js';
import { bridgeLogger } from '../utils/bridge-logger.js';

// Internal flag for disabling embeddings in unit tests only
// DO NOT set this in production - embeddings gracefully degrade when unavailable
const EMBEDDINGS_DISABLED = process.env.TEST_DISABLE_EMBEDDINGS === 'true';

/**
 * Legacy EmbeddingService class
 * @deprecated Use embeddingServiceV2 directly
 * @remarks
 * This class now delegates all operations to the new embeddings-v2 service.
 * Maintains backward compatibility for existing code.
 */
export class EmbeddingService {
  private disabled = false;
  private cache = new Map<string, number[]>();

  /**
   * Initializes the embedding service
   * @remarks
   * Delegates to the new embeddings-v2 service.
   */
  async initialize(): Promise<void> {
    // Skip initialization if embeddings are disabled
    if (EMBEDDINGS_DISABLED) {
      this.disabled = true;
      return;
    }
    
    return embeddingServiceV2.initialize();
  }

  /**
   * Generates semantic embedding for given text
   * @remarks
   * Delegates to the new embeddings-v2 service.
   * @param text - Text to convert to embedding
   * @returns Vector representation of the text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    // Return empty embedding if disabled
    if (this.disabled || EMBEDDINGS_DISABLED) {
      // Return a dummy 384-dimensional zero vector to maintain compatibility
      return new Array(384).fill(0);
    }

    // Check cache first
    const cached = this.cache.get(text);
    if (cached) {
      return cached;
    }

    try {
      const embedding = await embeddingServiceV2.generateEmbedding(text);
      
      // Handle dimension compatibility - old service expected 384 dimensions
      const expectedDim = 384;
      const actualDim = embedding.length;
      
      let result: number[];
      if (actualDim === expectedDim) {
        result = embedding;
      } else if (actualDim < expectedDim) {
        // Pad with zeros
        const padded = new Array(expectedDim).fill(0);
        for (let i = 0; i < actualDim; i++) {
          padded[i] = embedding[i];
        }
        result = padded;
      } else {
        // Truncate
        result = embedding.slice(0, expectedDim);
      }
      
      // Cache the result
      this.cache.set(text, result);
      
      return result;
    } catch (error) {
      // Failed to generate embedding, returning dummy embedding
      if (!process.env.BRIDGE_TEST_MODE) {
        bridgeLogger.warn(
          'Failed to generate embedding:',
          error instanceof Error ? error.message : error
        );
      }
      // Return dummy embedding on error
      return new Array(384).fill(0);
    }
  }

  /**
   * Generates embeddings for multiple texts
   * @remarks
   * Delegates to the new embeddings-v2 service.
   * @param texts - Array of texts to convert to embeddings
   * @returns Array of vector representations
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    // Handle disabled state
    if (this.disabled || EMBEDDINGS_DISABLED) {
      return texts.map(() => new Array(384).fill(0));
    }
    
    return Promise.all(texts.map(text => this.generateEmbedding(text)));
  }

  /**
   * Clears the embedding cache
   * @remarks
   * Delegates to the new embeddings-v2 service.
   */
  clearCache(): void {
    this.cache.clear();
    embeddingServiceV2.clearCache();
  }

  /**
   * Gets the current cache size
   * @remarks
   * Delegates to the new embeddings-v2 service.
   * @returns Number of cached embeddings
   */
  getCacheSize(): number {
    // Return local cache size when disabled
    if (this.disabled || EMBEDDINGS_DISABLED) {
      return this.cache.size;
    }
    return embeddingServiceV2.getCacheSize();
  }

  /**
   * Returns the expected embedding dimension for this service.
   */
  static getExpectedDimension(): number {
    return 384;
  }
}

// Export a singleton instance that wraps the new service
export const embeddingService = new EmbeddingService();
