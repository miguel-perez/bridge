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
      console.log('Embedding service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize embedding service:', error);
      throw new Error('Failed to initialize embedding service');
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    await this.initialize();
    
    // Check cache first
    const hash = this.hashText(text);
    if (this.cache.has(hash)) {
      return this.cache.get(hash)!;
    }
    
    try {
      const result = await this.embedder(text);
      
      // Extract the embedding from the result
      let embedding: number[];
      
      if (result && result.data) {
        // Convert the tensor data to a regular array
        embedding = Array.from(result.data);
      } else if (result && Array.isArray(result)) {
        embedding = Array.from(result);
      } else {
        console.error('Unexpected result format:', typeof result, result);
        throw new Error('Unexpected embedding result format');
      }
      
      // Ensure we have a reasonable embedding size
      if (embedding.length === 0) {
        throw new Error('Generated embedding is empty');
      }
      
      // The model is returning sequence embeddings (variable length)
      // We need to pool them to get a fixed-size representation
      // For now, let's use mean pooling to get a fixed-size embedding
      const sequenceLength = embedding.length / 384; // Assuming 384 is the hidden size
      if (sequenceLength > 1) {
        // This is a sequence embedding, we need to pool it
        const pooledEmbedding = new Array(384).fill(0);
        
        for (let i = 0; i < 384; i++) {
          let sum = 0;
          for (let j = 0; j < sequenceLength; j++) {
            sum += embedding[j * 384 + i] || 0;
          }
          pooledEmbedding[i] = sum / sequenceLength;
        }
        
        embedding = pooledEmbedding;
      }
      

      
      // Cache the result
      this.cache.set(hash, embedding);
      
      return embedding;
    } catch (error) {
      console.error('Failed to generate embedding:', error);
      throw new Error('Failed to generate embedding for text');
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