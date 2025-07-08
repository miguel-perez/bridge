import { pipeline } from '@xenova/transformers';

export class EmbeddingService {
  private embedder: any;
  private initialized = false;
  private cache = new Map<string, number[]>();

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      // Use a lightweight, fast embedding model optimized for semantic similarity
      // This model should produce 384-dimensional embeddings
      this.embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
        revision: 'main',
        quantized: false
      });
      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize embedding service: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Returns the expected embedding dimension for this service.
   */
  static getExpectedDimension(): number {
    return 384;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    await this.initialize();
    
    // Check cache first
    const hash = this.hashText(text);
    if (this.cache.has(hash)) {
      return this.cache.get(hash)!;
    }

    try {
      const result = await this.embedder(text, { pooling: 'mean', normalize: true });
      
      // Extract the embedding from the result
      let embedding: number[];
      
      if (result && result.data) {
        // Convert the tensor data to a regular array
        embedding = Array.from(result.data);
      } else if (result && Array.isArray(result)) {
        embedding = Array.from(result);
      } else {
        throw new Error('Unexpected embedding result format');
      }

      // Ensure we have a reasonable embedding size
      if (embedding.length === 0) {
        throw new Error('Generated embedding is empty');
      }
      
      // Pooling: always produce a 384-dim vector
      const expectedDim = EmbeddingService.getExpectedDimension();
      if (embedding.length === expectedDim) {
        // Already correct size
      } else if (embedding.length % expectedDim === 0) {
        // Sequence embedding, mean pool
        const sequenceLength = embedding.length / expectedDim;
        const pooledEmbedding = new Array(expectedDim).fill(0);
        for (let i = 0; i < expectedDim; i++) {
          let sum = 0;
          for (let j = 0; j < sequenceLength; j++) {
            sum += embedding[j * expectedDim + i] || 0;
          }
          pooledEmbedding[i] = sum / sequenceLength;
        }
        embedding = pooledEmbedding;
      } else {
        // Invalid dimension
        throw new Error(
          `Embedding dimension mismatch: expected ${expectedDim} or a multiple, got ${embedding.length}`
        );
      }
      
      // Final assertion
      if (embedding.length !== expectedDim) {
        throw new Error(
          `Final embedding dimension error: expected ${expectedDim}, got ${embedding.length}`
        );
      }
      
      // Cache the result
      this.cache.set(hash, embedding);

      return embedding;
    } catch (error) {
      throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
}

// Export a singleton instance
export const embeddingService = new EmbeddingService(); 