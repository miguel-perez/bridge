// Lazy loading approach for optional dependencies
type Pipeline = any;

// Only check for BRIDGE_DISABLE_EMBEDDINGS to disable embeddings
const EMBEDDINGS_DISABLED = process.env.BRIDGE_DISABLE_EMBEDDINGS === 'true';

import { bridgeLogger } from '../utils/bridge-logger.js';

export class EmbeddingService {
  private pipeline: Pipeline | null = null;
  private modelName: string = 'Xenova/all-MiniLM-L6-v2';
  private initPromise: Promise<void> | null = null;
  private cache = new Map<string, number[]>();
  private disabled = false;
  
  async initialize(): Promise<void> {
    // Skip initialization if embeddings are disabled
    if (EMBEDDINGS_DISABLED) {
      // Embeddings disabled by environment variable
      this.disabled = true;
      return;
    }
    
    if (this.initPromise) {
      return this.initPromise;
    }
    
    this.initPromise = this._doInitialize();
    return this.initPromise;
  }

  private async _doInitialize(): Promise<void> {
    if (this.pipeline) return;
    
    try {
      // Try to dynamically import transformers
      const { pipeline } = await import('@xenova/transformers');
      
      // Use a lightweight, fast embedding model optimized for semantic similarity
      // This model should produce 384-dimensional embeddings
      this.pipeline = await pipeline('feature-extraction', this.modelName, {
        revision: 'main',
        quantized: false
      });
    } catch (error) {
      // Failed to initialize embeddings service
      if (!process.env.BRIDGE_TEST_MODE) {
        bridgeLogger.warn('Failed to initialize embedding service:', error instanceof Error ? error.message : error);
      }
      this.disabled = true;
      // Don't throw - just disable embeddings
    }
  }
  
  async generateEmbedding(text: string): Promise<number[]> {
    // Return empty embedding if disabled
    if (this.disabled) {
      // Return a dummy 384-dimensional zero vector to maintain compatibility
      return new Array(384).fill(0);
    }
    
    // Check cache first
    const cached = this.cache.get(text);
    if (cached) {
      return cached;
    }
    
    // Initialize if not already done
    await this.initialize();
    
    // Double-check after initialization
    if (this.disabled || !this.pipeline) {
      return new Array(384).fill(0);
    }
    
    try {
      const result = await this.pipeline(text, { pooling: 'mean', normalize: true });
      
      // Extract the embedding from the result with improved format handling
      let embedding: number[];
      
      // Handle different result formats from transformers library
      if (result && typeof result === 'object') {
        if (result.data) {
          // Handle tensor data - convert to regular array
          const data = result.data;
          if (data && typeof data === 'object' && 'length' in data) {
            // Convert tensor-like object to array
            embedding = Array.from(data);
          } else {
            throw new Error('Invalid tensor data format');
          }
        } else if (Array.isArray(result)) {
          // Direct array result
          embedding = result;
        } else if (result.tensor) {
          // Some models return { tensor: Tensor }
          const tensor = result.tensor;
          if (tensor && typeof tensor === 'object' && 'data' in tensor) {
            embedding = Array.from(tensor.data);
          } else {
            throw new Error('Invalid tensor format');
          }
        } else {
          // Try to extract from any array-like property
          const arrayProps = Object.values(result).filter(val => Array.isArray(val));
          if (arrayProps.length > 0) {
            embedding = arrayProps[0] as number[];
          } else {
            throw new Error('Unexpected embedding result format');
          }
        }
      } else if (Array.isArray(result)) {
        // Direct array result
        embedding = result;
      } else {
        throw new Error('Unexpected embedding result format');
      }
      
      // Validate embedding dimension and handle dimension mismatches
      if (!embedding || embedding.length === 0) {
        throw new Error('Generated embedding is empty');
      }
      
      // Handle different model output dimensions
      if (embedding.length === 768) {
        // Model returned 768 dimensions, take first 384 (common for BERT-based models)
        embedding = embedding.slice(0, 384);
      } else if (embedding.length !== 384) {
        // For other dimensions, either truncate or pad
        if (embedding.length > 384) {
          embedding = embedding.slice(0, 384);
        } else {
          // Pad with zeros if too short
          const padded = new Array(384).fill(0);
          for (let i = 0; i < Math.min(embedding.length, 384); i++) {
            padded[i] = embedding[i];
          }
          embedding = padded;
        }
      }
      
      // Validate final embedding
      if (embedding.length !== 384) {
        throw new Error(`Failed to normalize embedding to 384 dimensions, got ${embedding.length}`);
      }
      
      // Ensure all values are numbers
      embedding = embedding.map(val => {
        const num = Number(val);
        return isNaN(num) ? 0 : num;
      });
      
      // Cache the result
      this.cache.set(text, embedding);
      
      return embedding;
    } catch (error) {
      // Failed to generate embedding, returning dummy embedding
      if (!process.env.BRIDGE_TEST_MODE) {
        bridgeLogger.warn('Failed to generate embedding:', error instanceof Error ? error.message : error);
      }
      // Return dummy embedding on error
      return new Array(384).fill(0);
    }
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    await this.initialize();
    
    const embeddings = await Promise.all(
      texts.map(text => this.generateEmbedding(text))
    );
    return embeddings;
  }

  private hashText(text: string): string {
    // Simple hash function for caching
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheSize(): number {
    return this.cache.size;
  }
  
  /**
   * Returns the expected embedding dimension for this service.
   */
  static getExpectedDimension(): number {
    return 384;
  }
}

// Export a singleton instance
export const embeddingService = new EmbeddingService(); 