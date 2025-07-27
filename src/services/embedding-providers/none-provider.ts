import { BaseEmbeddingProvider } from './base-provider.js';

/**
 * No-op embedding provider for when embeddings are not available
 * @remarks
 * Returns zero vectors and allows the system to work without semantic search.
 * This is useful when no embedding API is available or configured.
 */
export class NoneProvider extends BaseEmbeddingProvider {
  /**
   * Provider name
   */
  getName(): string {
    return 'None';
  }

  /**
   * Returns 1 for simplicity
   */
  getDimensions(): number {
    return 1;
  }

  /**
   * No initialization needed
   */
  async initialize(): Promise<void> {
    // No-op
  }

  /**
   * Returns a zero vector
   */
  async generateEmbedding(text: string): Promise<number[]> {
    this.validateText(text);
    // Return a single-dimensional zero vector
    return [0];
  }

  /**
   * Always available
   */
  async isAvailable(): Promise<boolean> {
    return true;
  }

  /**
   * No cleanup needed
   */
  async cleanup(): Promise<void> {
    // No-op
  }
}