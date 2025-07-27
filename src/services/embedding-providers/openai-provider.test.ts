import { OpenAIProvider } from './openai-provider.js';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;
  const mockApiKey = 'test-api-key';
  const mockEmbedding = new Array(3072).fill(0).map(() => Math.random());

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new OpenAIProvider({ apiKey: mockApiKey });
  });

  describe('initialization', () => {
    it('should initialize with API key', async () => {
      await expect(provider.initialize()).resolves.not.toThrow();
    });

    it('should throw error without API key', async () => {
      provider = new OpenAIProvider({});
      await expect(provider.initialize()).rejects.toThrow('OpenAI API key is required');
    });

    it('should use environment variable for API key', async () => {
      process.env.OPENAI_API_KEY = 'env-api-key';
      provider = new OpenAIProvider({});
      await expect(provider.initialize()).resolves.not.toThrow();
      delete process.env.OPENAI_API_KEY;
    });
  });

  describe('configuration', () => {
    it('should use default model', () => {
      expect(provider.getName()).toBe('OpenAI-text-embedding-3-large');
    });

    it('should accept custom model', () => {
      provider = new OpenAIProvider({ apiKey: mockApiKey, model: 'text-embedding-3-small' });
      expect(provider.getName()).toBe('OpenAI-text-embedding-3-small');
    });

    it('should return correct default dimensions for models', () => {
      // text-embedding-3-large
      expect(provider.getDimensions()).toBe(3072);

      // text-embedding-3-small
      provider = new OpenAIProvider({ apiKey: mockApiKey, model: 'text-embedding-3-small' });
      expect(provider.getDimensions()).toBe(1536);

      // text-embedding-ada-002
      provider = new OpenAIProvider({ apiKey: mockApiKey, model: 'text-embedding-ada-002' });
      expect(provider.getDimensions()).toBe(1536);
    });

    it('should accept custom dimensions', () => {
      provider = new OpenAIProvider({ apiKey: mockApiKey, dimensions: 1024 });
      expect(provider.getDimensions()).toBe(1024);
    });
  });

  describe('generateEmbedding', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          object: 'list',
          data: [{
            object: 'embedding',
            embedding: mockEmbedding,
            index: 0
          }],
          model: 'text-embedding-3-large',
          usage: { prompt_tokens: 4, total_tokens: 4 }
        })
      });
    });

    it('should generate embedding successfully', async () => {
      const embedding = await provider.generateEmbedding('test text');
      expect(embedding).toEqual(mockEmbedding);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/embeddings',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: 'test text',
            model: 'text-embedding-3-large',
          })
        })
      );
    });

    it('should include dimensions for text-embedding-3 models', async () => {
      provider = new OpenAIProvider({ 
        apiKey: mockApiKey, 
        model: 'text-embedding-3-large',
        dimensions: 1024 
      });
      await provider.generateEmbedding('test text');
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"dimensions":1024')
        })
      );
    });

    it('should not include dimensions for ada-002 model', async () => {
      provider = new OpenAIProvider({ 
        apiKey: mockApiKey, 
        model: 'text-embedding-ada-002',
        dimensions: 1024 
      });
      await provider.generateEmbedding('test text');
      
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.dimensions).toBeUndefined();
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Invalid API key'
      });

      await expect(provider.generateEmbedding('test')).rejects.toThrow(
        'Failed to generate embedding: OpenAI API error: 401 - Invalid API key'
      );
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      
      await expect(provider.generateEmbedding('test')).rejects.toThrow(
        'Failed to generate embedding: Network error'
      );
    });

    it('should handle invalid response format', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ invalid: 'response' })
      });

      await expect(provider.generateEmbedding('test')).rejects.toThrow(
        'Failed to generate embedding: Invalid response from OpenAI API'
      );
    });

    it('should validate text input', async () => {
      await expect(provider.generateEmbedding('')).rejects.toThrow(
        'Text cannot be empty'
      );
    });

    it('should initialize if not already initialized', async () => {
      const initSpy = jest.spyOn(provider, 'initialize');
      await provider.generateEmbedding('test');
      expect(initSpy).toHaveBeenCalled();
    });
  });

  describe('isAvailable', () => {
    it('should return false without API key', async () => {
      provider = new OpenAIProvider({});
      expect(await provider.isAvailable()).toBe(false);
    });

    it('should check API availability', async () => {
      mockFetch.mockResolvedValue({ ok: true });
      expect(await provider.isAvailable()).toBe(true);
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/embeddings',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: 'test',
            model: 'text-embedding-3-large',
          })
        })
      );
    });

    it('should return false on API error', async () => {
      mockFetch.mockResolvedValue({ ok: false });
      expect(await provider.isAvailable()).toBe(false);
    });

    it('should return false on network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      expect(await provider.isAvailable()).toBe(false);
    });
  });
});