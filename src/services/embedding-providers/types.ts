/**
 * Base types for embedding providers and vector stores
 */

export interface EmbeddingProvider {
  /**
   * Initialize the provider (load models, authenticate, etc.)
   */
  initialize(): Promise<void>;

  /**
   * Generate embeddings for the given text
   */
  generateEmbedding(text: string): Promise<number[]>;

  /**
   * Get the dimension size of embeddings this provider generates
   */
  getDimensions(): number;

  /**
   * Get provider name for logging/debugging
   */
  getName(): string;

  /**
   * Check if provider is available in current environment
   */
  isAvailable(): Promise<boolean>;

  /**
   * Cleanup resources if needed
   */
  cleanup?(): Promise<void>;
}

export interface VectorStore {
  /**
   * Initialize the vector store connection
   */
  initialize(): Promise<void>;

  /**
   * Insert or update a vector with metadata
   */
  upsert(id: string, vector: number[], metadata: Record<string, any>): Promise<void>;

  /**
   * Search for similar vectors
   */
  search(
    vector: number[],
    options?: {
      filter?: Record<string, any>;
      limit?: number;
    }
  ): Promise<SearchResult[]>;

  /**
   * Delete a vector by ID
   */
  delete(id: string): Promise<void>;

  /**
   * Get store name for logging/debugging
   */
  getName(): string;

  /**
   * Check if store is available
   */
  isAvailable(): Promise<boolean>;

  /**
   * Cleanup resources if needed
   */
  cleanup?(): Promise<void>;
}

export interface SearchResult {
  id: string;
  score: number;
  metadata: Record<string, any>;
}

export interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  dimensions?: number;
  [key: string]: any;
}

export interface VectorStoreConfig {
  url?: string;
  apiKey?: string;
  collectionName?: string;
  [key: string]: any;
}