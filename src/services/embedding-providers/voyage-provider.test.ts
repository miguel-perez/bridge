import { VoyageAIProvider } from './voyage-provider.js';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe('VoyageAIProvider', () => {
  let provider: VoyageAIProvider;
  const mockApiKey = 'test-api-key';
  const mockEmbedding = new Array(1024).fill(0).map(() => Math.random());

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new VoyageAIProvider({ apiKey: mockApiKey });
  });

  describe('initialization', () => {
    it('should initialize with API key', async () => {
      await expect(provider.initialize()).resolves.not.toThrow();
    });

    it('should throw error without API key', async () => {
      provider = new VoyageAIProvider({});
      await expect(provider.initialize()).rejects.toThrow('Voyage AI API key is required');
    });

    it('should use environment variable for API key', async () => {
      process.env.VOYAGE_API_KEY = 'env-api-key';
      provider = new VoyageAIProvider({});
      await expect(provider.initialize()).resolves.not.toThrow();
      delete process.env.VOYAGE_API_KEY;
    });
  });

  describe('configuration', () => {
    it('should use default model', () => {
      expect(provider.getName()).toBe('VoyageAI-voyage-3-large');
    });

    it('should accept custom model', () => {
      provider = new VoyageAIProvider({ apiKey: mockApiKey, model: 'voyage-3.5-lite' });
      expect(provider.getName()).toBe('VoyageAI-voyage-3.5-lite');
    });

    it('should use default dimensions', () => {
      expect(provider.getDimensions()).toBe(1024);
    });

    it('should accept custom dimensions', () => {
      provider = new VoyageAIProvider({ apiKey: mockApiKey, dimensions: 512 });
      expect(provider.getDimensions()).toBe(512);
    });

    it('should accept input type', () => {
      provider = new VoyageAIProvider({ apiKey: mockApiKey, inputType: 'query' });
      expect(provider.getDimensions()).toBe(1024); // Just checking it doesn't break
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
          model: 'voyage-3-large',
          usage: { prompt_tokens: 4 }
        })
      });
    });

    it('should generate embedding successfully', async () => {
      const embedding = await provider.generateEmbedding('test text');
      expect(embedding).toEqual(mockEmbedding);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.voyageai.com/v1/embeddings',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: 'test text',
            model: 'voyage-3-large',
            output_dimension: 1024,
          })
        })
      );
    });

    it('should include input type when specified', async () => {
      provider = new VoyageAIProvider({ apiKey: mockApiKey, inputType: 'document' });
      await provider.generateEmbedding('test document');
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"input_type":"document"')
        })
      );
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized'
      });

      await expect(provider.generateEmbedding('test')).rejects.toThrow(
        'Failed to generate embedding: Voyage AI API error: 401 - Unauthorized'
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
        'Failed to generate embedding: Invalid response from Voyage AI API'
      );
    });

    it('should validate text input', async () => {
      await expect(provider.generateEmbedding('')).rejects.toThrow(
        'Text must be a non-empty string'
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
      provider = new VoyageAIProvider({});
      expect(await provider.isAvailable()).toBe(false);
    });

    it('should check API availability', async () => {
      mockFetch.mockResolvedValue({ ok: true });
      expect(await provider.isAvailable()).toBe(true);
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.voyageai.com/v1/embeddings',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json',
          }
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