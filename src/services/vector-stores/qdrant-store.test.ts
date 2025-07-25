import { QdrantVectorStore } from './qdrant-store.js';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

// Mock logger
jest.mock('../../utils/bridge-logger.js', () => ({
  bridgeLogger: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('QdrantVectorStore', () => {
  let store: QdrantVectorStore;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    
    // Default successful responses
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ result: {} }),
    });
    
    store = new QdrantVectorStore();
  });

  describe('basic properties', () => {
    it('should return correct name', () => {
      expect(store.getName()).toBe('QdrantVectorStore-bridge_experiences');
    });

    it('should use custom collection name', () => {
      const customStore = new QdrantVectorStore({ collectionName: 'custom' });
      expect(customStore.getName()).toBe('QdrantVectorStore-custom');
    });
  });

  describe('initialization', () => {
    it('should check for existing collection', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: { collections: [] } }),
      });

      await store.initialize();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:6333/collections',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should create collection if not exists', async () => {
      // First call returns empty collections
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: { collections: [] } }),
      });
      
      // Second call for collection creation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: {} }),
      });

      await store.initialize();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:6333/collections/bridge_experiences',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({
            vectors: { size: 384, distance: 'Cosine' },
          }),
        })
      );
    });

    it('should get dimensions from existing collection', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            result: {
              collections: [{ name: 'bridge_experiences' }],
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            result: {
              config: { params: { vectors: { size: 512 } } },
            },
          }),
        });

      await store.initialize();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:6333/collections/bridge_experiences',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should only initialize once', async () => {
      // Mock successful initialization
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            collections: [{ name: 'bridge_experiences' }],
          },
        }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            config: { params: { vectors: { size: 384 } } },
          },
        }),
      });

      await store.initialize();
      const callCount = mockFetch.mock.calls.length;
      
      await store.initialize();
      await store.initialize();

      expect(mockFetch).toHaveBeenCalledTimes(callCount);
    });

    it('should handle initialization failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(store.initialize()).rejects.toThrow(
        'Failed to initialize Qdrant: Network error'
      );
    });
  });

  describe('upsert', () => {
    beforeEach(async () => {
      // Mock successful initialization
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            collections: [{ name: 'bridge_experiences' }],
          },
        }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            config: { params: { vectors: { size: 3 } } },
          },
        }),
      });
      await store.initialize();
    });

    it('should upsert vector with metadata', async () => {
      await store.upsert('test-id', [1, 2, 3], { name: 'test' });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:6333/collections/bridge_experiences/points',
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('test-id'),
        })
      );

      const call = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
      const body = JSON.parse(call[1].body);
      expect(body.points[0]).toMatchObject({
        id: 'test-id',
        vector: [1, 2, 3],
        payload: expect.objectContaining({ name: 'test' }),
      });
    });

    it('should validate ID', async () => {
      await expect(store.upsert('', [1, 2, 3], {})).rejects.toThrow(
        'ID must be a non-empty string'
      );
    });

    it('should validate vector', async () => {
      await expect(store.upsert('id', [], {})).rejects.toThrow(
        'Vector cannot be empty'
      );
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      // Mock successful initialization
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            collections: [{ name: 'bridge_experiences' }],
          },
        }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            config: { params: { vectors: { size: 3 } } },
          },
        }),
      });
      await store.initialize();
    });

    it('should search for similar vectors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: [
            { id: '1', score: 0.9, payload: { name: 'test1' } },
            { id: '2', score: 0.8, payload: { name: 'test2' } },
          ],
        }),
      });

      const results = await store.search([1, 2, 3]);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:6333/collections/bridge_experiences/points/search',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            vector: [1, 2, 3],
            limit: 10,
            with_payload: true,
          }),
        })
      );

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        id: '1',
        score: 0.9,
        metadata: { name: 'test1' },
      });
    });

    it('should apply filters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: [] }),
      });

      await store.search([1, 2, 3], {
        filter: { category: 'test', tags: ['a', 'b'] },
        limit: 5,
      });

      const call = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
      const body = JSON.parse(call[1].body);
      
      expect(body.filter).toEqual({
        must: [
          { key: 'category', match: { value: 'test' } },
          { key: 'tags', match: { any: ['a', 'b'] } },
        ],
      });
      expect(body.limit).toBe(5);
    });
  });

  describe('delete', () => {
    it('should delete point by ID', async () => {
      await store.delete('test-id');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:6333/collections/bridge_experiences/points/delete',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ points: ['test-id'] }),
        })
      );
    });
  });

  describe('deleteCollection', () => {
    it('should delete the collection', async () => {
      await store.deleteCollection();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:6333/collections/bridge_experiences',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('isAvailable', () => {
    it('should return true when Qdrant is available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ title: 'qdrant - vector search engine' }),
      });

      const available = await store.isAvailable();
      expect(available).toBe(true);
    });

    it('should return false when Qdrant is not available', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      const available = await store.isAvailable();
      expect(available).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle Qdrant error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({
          status: { error: 'Invalid vector dimension' },
        }),
      });

      await expect(store.search([1, 2])).rejects.toThrow(
        'Qdrant request failed: 400 Bad Request - Invalid vector dimension'
      );
    });

    it('should use API key when provided', async () => {
      const storeWithKey = new QdrantVectorStore({ apiKey: 'test-key' });
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ title: 'qdrant - vector search engine' }),
      });

      await storeWithKey.isAvailable();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:6333/',
        expect.objectContaining({
          headers: expect.objectContaining({
            'api-key': 'test-key',
          }),
        })
      );
    });
  });
});