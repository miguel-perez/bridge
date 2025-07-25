import { BaseEmbeddingProvider } from './base-provider.js';

/**
 * No-op embedding provider for quality-only search
 * Returns zero vectors to indicate no embeddings available
 */
export class NoneProvider extends BaseEmbeddingProvider {
  async initialize(): Promise<void> {
    this.initialized = true;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    this.validateText(text);
    // Return zero vector to indicate no embeddings
    return new Array(this.getDimensions()).fill(0);
  }

  getDimensions(): number {
    // Use a small dimension size for efficiency
    return 1;
  }

  getName(): string {
    return 'NoneProvider';
  }

  async isAvailable(): Promise<boolean> {
    // Always available as fallback
    return true;
  }
}