import { BaseEmbeddingProvider } from './base-provider.js';

/**
 * TensorFlow.js-based embedding provider for local inference
 * @remarks
 * Uses Universal Sentence Encoder for high-quality semantic embeddings.
 * Runs locally without API calls, requires ~25MB model download.
 */
export class TensorFlowJSProvider extends BaseEmbeddingProvider {
  private model: any = null;
  private modelUrl =
    'https://tfhub.dev/tensorflow/tfjs-model/universal-sentence-encoder/1/default/1';
  private dimensions = 512; // USE outputs 512-dimensional embeddings

  /**
   *
   */
  getName(): string {
    return 'TensorFlowJS-USE';
  }

  /**
   *
   */
  getDimensions(): number {
    return this.dimensions;
  }

  /**
   *
   */
  async initialize(): Promise<void> {
    try {
      // In test environment, check if we have mocked modules
      if (process.env.NODE_ENV === 'test') {
        // Try to use pre-loaded mocks if available
        const use = (global as any).__mocked_universal_sentence_encoder;
        if (use && use.load) {
          this.model = await use.load();
          return;
        }
      }

      // Dynamically import TensorFlow.js
      await import('@tensorflow/tfjs' as any);
      const use = await import('@tensorflow-models/universal-sentence-encoder' as any);

      // Load the model
      this.model = await use.load();
    } catch (error) {
      // Failed to initialize TensorFlow.js provider
      throw new Error(
        `Failed to initialize TensorFlow.js: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   *
   */
  async generateEmbedding(text: string): Promise<number[]> {
    this.validateText(text);

    if (!this.model) {
      throw new Error('TensorFlow.js model not initialized');
    }

    try {
      // Generate embeddings using Universal Sentence Encoder
      const embeddings = await this.model.embed([text]);

      // Convert tensor to array
      const embeddingArray = await embeddings.array();

      // Dispose of the tensor to free memory
      embeddings.dispose();

      // Extract the first (and only) embedding
      const embedding = embeddingArray[0];

      // Normalize the vector
      return this.normalizeVector(embedding);
    } catch (error) {
      throw new Error(
        `Failed to generate embedding: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   *
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Check if TensorFlow.js can be imported
      await import('@tensorflow/tfjs' as any);
      await import('@tensorflow-models/universal-sentence-encoder' as any);
      return true;
    } catch {
      return false;
    }
  }

  /**
   *
   */
  async cleanup(): Promise<void> {
    if (this.model) {
      // TensorFlow.js models don't have a standard cleanup method
      // but we can null the reference
      this.model = null;
    }
  }
}
