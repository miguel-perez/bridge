// Lazy loading approach for optional dependencies
type Pipeline = any;

// Check if we're in an MCP environment or if embeddings are disabled
const IS_MCP_ENVIRONMENT = process.env.MCP === 'true' || process.env.BRIDGE_DISABLE_EMBEDDINGS === 'true';

export class EmbeddingService {
  private pipeline: Pipeline | null = null;
  private modelName: string = 'Xenova/all-MiniLM-L6-v2';
  private initPromise: Promise<void> | null = null;
  private cache = new Map<string, number[]>();
  private disabled = false;
  
  async initialize(): Promise<void> {
    // Skip initialization in MCP environment
    if (IS_MCP_ENVIRONMENT) {
      console.error('[EmbeddingService] Running in MCP environment - embeddings disabled');
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
      console.error('[EmbeddingService] Failed to initialize:', error instanceof Error ? error.message : 'Unknown error');
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
      
      // Extract the embedding from the result
      let embedding: number[];
      if (result && result.data) {
        embedding = Array.from(result.data);
      } else if (Array.isArray(result)) {
        embedding = result;
      } else {
        throw new Error('Unexpected embedding result format');
      }
      
      // Validate embedding dimension
      if (embedding.length !== 384) {
        throw new Error(`Expected 384-dimensional embedding, got ${embedding.length}`);
      }
      
      // Cache the result
      this.cache.set(text, embedding);
      
      return embedding;
    } catch (error) {
      console.error('[EmbeddingService] Failed to generate embedding:', error instanceof Error ? error.message : 'Unknown error');
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