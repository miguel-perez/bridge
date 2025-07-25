import { BaseEmbeddingProvider } from './base-provider.js';
import { ProviderConfig } from './types.js';

interface VoyageAPIResponse {
  object: string;
  data: Array<{
    object: string;
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
  };
}

export class VoyageAIProvider extends BaseEmbeddingProvider {
  private apiKey: string;
  private model: string;
  private baseUrl: string;
  private dimensions: number;
  private inputType: 'query' | 'document' | undefined;

  constructor(config: ProviderConfig = {}) {
    super(config);
    this.apiKey = config.apiKey || process.env.VOYAGE_API_KEY || '';
    this.model = config.model || 'voyage-3-large';
    this.baseUrl = config.baseUrl || 'https://api.voyageai.com/v1';
    this.dimensions = config.dimensions || 1024;
    this.inputType = config.inputType as 'query' | 'document' | undefined;
  }

  async initialize(): Promise<void> {
    if (!this.apiKey) {
      throw new Error('Voyage AI API key is required');
    }
    this.initialized = true;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    this.validateText(text);
    
    if (!this.initialized) {
      await this.initialize();
    }

    const requestBody: any = {
      input: text,
      model: this.model,
      output_dimension: this.dimensions,
    };

    if (this.inputType) {
      requestBody.input_type = this.inputType;
    }

    try {
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Voyage AI API error: ${response.status} - ${error}`);
      }

      const data: VoyageAPIResponse = await response.json();
      
      if (!data.data || !data.data[0] || !data.data[0].embedding) {
        throw new Error('Invalid response from Voyage AI API');
      }

      return data.data[0].embedding;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to generate embedding: ${error.message}`);
      }
      throw error;
    }
  }

  getDimensions(): number {
    return this.dimensions;
  }

  getName(): string {
    return `VoyageAI-${this.model}`;
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }
    
    try {
      // Make a minimal API call to check availability
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: 'test',
          model: this.model,
          output_dimension: this.dimensions,
        }),
      });

      return response.ok;
    } catch {
      return false;
    }
  }
}