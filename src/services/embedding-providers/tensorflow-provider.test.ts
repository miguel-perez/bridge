import { TensorFlowJSProvider } from './tensorflow-provider.js';
import { BaseEmbeddingProvider } from './base-provider.js';

// Mock TensorFlow.js modules
const mockEmbed = jest.fn();
const mockDispose = jest.fn();
const mockLoad = jest.fn();

// Set up global mocks for test environment
(global as any).__mocked_universal_sentence_encoder = {
  load: mockLoad,
};

// Mock logger
jest.mock('../../utils/bridge-logger.js', () => ({
  bridgeLogger: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('TensorFlowJSProvider', () => {
  let provider: TensorFlowJSProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new TensorFlowJSProvider();
    
    // Reset mock implementations
    mockEmbed.mockReset();
    mockDispose.mockReset();
    mockLoad.mockReset();
    
    // Setup default successful load
    mockLoad.mockResolvedValue({
      embed: mockEmbed,
    });
  });

  describe('basic properties', () => {
    it('should return correct name', () => {
      expect(provider.getName()).toBe('TensorFlowJS-USE');
    });

    it('should return 512 dimensions', () => {
      expect(provider.getDimensions()).toBe(512);
    });
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await provider.initialize();
      
      expect(mockLoad).toHaveBeenCalled();
    });

    it('should handle initialization failure', async () => {
      mockLoad.mockRejectedValueOnce(new Error('Model load failed'));

      await expect(provider.initialize()).rejects.toThrow(
        'Failed to initialize TensorFlow.js: Model load failed'
      );
    });
  });

  describe('generateEmbedding', () => {
    beforeEach(async () => {
      // Setup successful model load
      mockEmbed.mockResolvedValue({
        array: jest.fn().mockResolvedValue([[1, 0, 0, ...Array(509).fill(0)]]),
        dispose: mockDispose,
      });
      
      await provider.initialize();
    });

    it('should generate embedding successfully', async () => {
      const embedding = await provider.generateEmbedding('test text');
      
      expect(mockEmbed).toHaveBeenCalledWith(['test text']);
      expect(mockDispose).toHaveBeenCalled();
      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding).toHaveLength(512);
    });

    it('should normalize the embedding', async () => {
      // Return non-normalized vector
      mockEmbed.mockResolvedValueOnce({
        array: jest.fn().mockResolvedValue([[3, 4, 0, ...Array(509).fill(0)]]),
        dispose: mockDispose,
      });

      const embedding = await provider.generateEmbedding('test');
      
      // Check normalization (3,4,0 -> 0.6,0.8,0)
      expect(embedding[0]).toBeCloseTo(0.6, 5);
      expect(embedding[1]).toBeCloseTo(0.8, 5);
    });

    it('should throw if model not initialized', async () => {
      const newProvider = new TensorFlowJSProvider();
      
      await expect(newProvider.generateEmbedding('test')).rejects.toThrow(
        'TensorFlow.js model not initialized'
      );
    });

    it('should handle empty text', async () => {
      await expect(provider.generateEmbedding('')).rejects.toThrow(
        'Text must be a non-empty string'
      );
    });

    it('should handle embedding generation failure', async () => {
      mockEmbed.mockRejectedValueOnce(new Error('Embedding failed'));

      await expect(provider.generateEmbedding('test')).rejects.toThrow(
        'Failed to generate embedding: Embedding failed'
      );
    });
  });

  describe('isAvailable', () => {
    it('should return false when modules are not available', async () => {
      // In test environment, isAvailable will return false since modules aren't installed
      const available = await provider.isAvailable();
      expect(available).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('should cleanup model reference', async () => {
      await provider.initialize();
      await provider.cleanup();
      
      // Model should be nulled out (internal state)
      await expect(provider.generateEmbedding('test')).rejects.toThrow(
        'TensorFlow.js model not initialized'
      );
    });

    it('should handle cleanup when not initialized', async () => {
      await expect(provider.cleanup()).resolves.not.toThrow();
    });
  });
});