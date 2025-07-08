import { pipeline } from '@xenova/transformers';

export class EmbeddingService {
  private embedder: any;
  private initialized = false;
  private cache = new Map<string, number[]>();

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      // Use a lightweight, fast embedding model optimized for semantic similarity
      this.embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
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
      const embedding = Array.from(result.data) as number[];
      
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