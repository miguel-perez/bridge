import { BaseEmbeddingProvider } from './base-provider.js';
import { ProviderConfig } from './types.js';

interface OpenAIAPIResponse {
  object: string;
  data: Array<{
    object: string;
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export class OpenAIProvider extends BaseEmbeddingProvider {
  private apiKey: string;
  private model: string;
  private baseUrl: string;
  private dimensions: number | undefined;

  constructor(config: ProviderConfig = {}) {
    super(config);
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY || '';
    this.model = config.model || 'text-embedding-3-large';
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
    this.dimensions = config.dimensions;
  }

  async initialize(): Promise<void> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key is required');
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
    };

    // OpenAI allows dimension reduction for text-embedding-3 models
    if (this.dimensions && this.model.includes('text-embedding-3')) {
      requestBody.dimensions = this.dimensions;
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
        throw new Error(`OpenAI API error: ${response.status} - ${error}`);
      }

      const data: OpenAIAPIResponse = await response.json();
      
      if (!data.data || !data.data[0] || !data.data[0].embedding) {
        throw new Error('Invalid response from OpenAI API');
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
    // Default dimensions based on model
    if (this.dimensions) {
      return this.dimensions;
    }
    
    switch (this.model) {
      case 'text-embedding-3-small':
        return 1536;
      case 'text-embedding-3-large':
        return 3072;
      case 'text-embedding-ada-002':
        return 1536;
      default:
        return 1536;
    }
  }

  getName(): string {
    return `OpenAI-${this.model}`;
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
        }),
      });

      return response.ok;
    } catch {
      return false;
    }
  }
}