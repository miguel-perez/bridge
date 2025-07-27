import { EmbeddingProvider, ProviderConfig } from './types.js';

export abstract class BaseEmbeddingProvider implements EmbeddingProvider {
  protected initialized = false;
  protected config: ProviderConfig;

  constructor(config: ProviderConfig = {}) {
    this.config = config;
  }

  abstract initialize(): Promise<void>;
  abstract generateEmbedding(text: string): Promise<number[]>;
  abstract getDimensions(): number;
  abstract getName(): string;

  async isAvailable(): Promise<boolean> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      return true;
    } catch {
      return false;
    }
  }

  protected validateText(text: string): void {
    if (!text || typeof text !== 'string') {
      throw new Error('Text cannot be empty');
    }
    if (text.length > 1000000) {
      throw new Error('Text exceeds maximum length of 1M characters');
    }
  }

  protected normalizeVector(vector: number[]): number[] {
    // Ensure vector is normalized for cosine similarity
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (magnitude === 0) {
      return vector;
    }
    return vector.map((val) => val / magnitude);
  }
}