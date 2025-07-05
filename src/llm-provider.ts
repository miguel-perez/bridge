import OpenAI from 'openai';
import { getConfig } from './config.js';

export interface LLMProvider {
  complete(prompt: string, options?: CompletionOptions): Promise<string>;
  isAvailable(): boolean;
}

export interface CompletionOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export class DirectOpenAIProvider implements LLMProvider {
  private client: OpenAI | null = null;

  constructor() {
    const config = getConfig();
    if (config.openai.apiKey) {
      this.client = new OpenAI({
        apiKey: config.openai.apiKey,
      });
    }
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  async complete(prompt: string, options: CompletionOptions = {}): Promise<string> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized. Please set OPENAI_API_KEY environment variable.');
    }

    const config = getConfig();
    const messages = [];
    
    if (options.systemPrompt) {
      messages.push({ role: 'system' as const, content: options.systemPrompt });
    }
    
    messages.push({ role: 'user' as const, content: prompt });

    try {
      const completion = await this.client.chat.completions.create({
        model: config.openai.model || 'gpt-4',
        messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 1000,
      });

      return completion.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Future: MCP Sampling Provider
export class MCPSamplingProvider implements LLMProvider {
  isAvailable(): boolean {
    // TODO: Check if MCP sampling is available in the SDK
    return false;
  }

  async complete(prompt: string): Promise<string> {
    // TODO: Implement MCP sampling when SDK supports it
    throw new Error(`MCP sampling not yet supported in TypeScript SDK. Prompt: ${prompt.substring(0, 50)}...`);
  }
}

// Factory function to get the appropriate provider
export function createLLMProvider(): LLMProvider {
  // Try OpenAI first
  const openaiProvider = new DirectOpenAIProvider();
  if (openaiProvider.isAvailable()) {
    return openaiProvider;
  }

  // Fallback to MCP sampling (when available)
  const mcpProvider = new MCPSamplingProvider();
  if (mcpProvider.isAvailable()) {
    return mcpProvider;
  }

  throw new Error('No LLM provider available. Please configure OpenAI API key or enable MCP sampling.');
} 