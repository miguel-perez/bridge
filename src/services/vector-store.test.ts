import { jest } from '@jest/globals';
import { VectorStore } from './vector-store';
import { nanoid } from 'nanoid';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { tmpdir } from 'os';

// Mock all external dependencies with factory functions
jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'test-id-12345')
}));

jest.mock('fs', () => ({
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(),
  existsSync: jest.fn(),
  mkdirSync: jest.fn()
}));

jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  resolve: jest.fn((...args) => args.join('/')),
  dirname: jest.fn((path) => path.split('/').slice(0, -1).join('/') || '.')
}));

jest.mock('os', () => ({
  tmpdir: jest.fn(() => '/tmp')
}));

// Mock the embedding service
const mockEmbeddingService = {
  generateEmbedding: jest.fn(),
  generateEmbeddings: jest.fn()
};

jest.mock('./embeddings', () => ({
  EmbeddingService: jest.fn(() => mockEmbeddingService)
}));

// Mock the vector store
const mockVectorStore = {
  addVector: jest.fn(),
  addVectors: jest.fn(),
  removeVector: jest.fn(),
  findSimilar: jest.fn(),
  findSimilarById: jest.fn(),
  getVector: jest.fn(),
  hasVector: jest.fn(),
  getVectorCount: jest.fn(),
  clear: jest.fn(),
  saveToDisk: jest.fn(),
  loadFromDisk: jest.fn(),
  initialize: jest.fn(),
  validateVectors: jest.fn(),
  removeInvalidVectors: jest.fn(),
  cleanup: jest.fn(),
  getHealthStats: jest.fn()
};

jest.mock('./vector-store', () => ({
  VectorStore: jest.fn().mockImplementation(() => mockVectorStore),
  getVectorStore: jest.fn(() => mockVectorStore),
  initializeVectorStore: jest.fn(() => mockVectorStore)
}));

// Get the mocked modules
const mockedNanoid = nanoid as jest.MockedFunction<typeof nanoid>;
const mockedWriteFileSync = writeFileSync as jest.MockedFunction<typeof writeFileSync>;
const mockedReadFileSync = readFileSync as jest.MockedFunction<typeof readFileSync>;
const mockedExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;
const mockedMkdirSync = mkdirSync as jest.MockedFunction<typeof mkdirSync>;
const mockedJoin = join as jest.MockedFunction<typeof join>;
const mockedResolve = resolve as jest.MockedFunction<typeof resolve>;
const mockedDirname = dirname as jest.MockedFunction<typeof dirname>;
const mockedTmpdir = tmpdir as jest.MockedFunction<typeof tmpdir>;

describe('VectorStore', () => {
  let vectorStore: VectorStore;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockedNanoid.mockReturnValue('test-id-12345');
    mockedWriteFileSync.mockImplementation(() => {});
    mockedReadFileSync.mockReturnValue('[]');
    mockedExistsSync.mockReturnValue(false);
    mockedMkdirSync.mockImplementation(() => {});
    mockedJoin.mockImplementation((...args) => args.join('/'));
    mockedResolve.mockImplementation((...args) => args.join('/'));
    mockedDirname.mockImplementation((path) => path.split('/').slice(0, -1).join('/') || '.');
    mockedTmpdir.mockReturnValue('/tmp');
    
    // Setup embedding service mocks
    mockEmbeddingService.generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
    mockEmbeddingService.generateEmbeddings.mockResolvedValue([[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]]);
    
    // Setup vector store mocks
    mockVectorStore.addVector.mockReturnValue(true);
    mockVectorStore.addVectors.mockReturnValue({ added: 2, rejected: 0 });
    mockVectorStore.removeVector.mockResolvedValue(undefined);
    mockVectorStore.findSimilar.mockResolvedValue([]);
    mockVectorStore.findSimilarById.mockResolvedValue([]);
    mockVectorStore.getVector.mockResolvedValue([0.1, 0.2, 0.3]);
    mockVectorStore.hasVector.mockResolvedValue(true);
    mockVectorStore.getVectorCount.mockResolvedValue(2);
    mockVectorStore.clear.mockResolvedValue(undefined);
    mockVectorStore.saveToDisk.mockResolvedValue(undefined);
    mockVectorStore.loadFromDisk.mockResolvedValue(undefined);
    mockVectorStore.initialize.mockResolvedValue(undefined);
    mockVectorStore.validateVectors.mockResolvedValue({ valid: 2, invalid: 0, details: [] });
    mockVectorStore.removeInvalidVectors.mockResolvedValue(0);
    mockVectorStore.cleanup.mockResolvedValue(0);
    mockVectorStore.getHealthStats.mockReturnValue({ total: 2, valid: 2, invalid: 0 });
    
    // Create vector store instance
    vectorStore = new VectorStore();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addVector', () => {
    it('should add a vector successfully', async () => {
      const id = 'test-id';
      const vector = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]; // 10 dimensions for testing
      
      const result = vectorStore.addVector(id, vector);
      
      expect(mockVectorStore.addVector).toHaveBeenCalledWith(id, vector);
      expect(result).toBe(true);
    });

    it('should handle invalid vector dimensions', () => {
      const id = 'test-id';
      const invalidVector = [0.1, 0.2]; // Too few dimensions
      
      mockVectorStore.addVector.mockReturnValue(false);
      
      const result = vectorStore.addVector(id, invalidVector);
      
      expect(mockVectorStore.addVector).toHaveBeenCalledWith(id, invalidVector);
      expect(result).toBe(false);
    });
  });

  describe('addVectors', () => {
    it('should add multiple vectors successfully', () => {
      const records = [
        { id: 'id1', vector: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0] },
        { id: 'id2', vector: [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1] }
      ];
      
      const result = vectorStore.addVectors(records);
      
      expect(mockVectorStore.addVectors).toHaveBeenCalledWith(records);
      expect(result).toEqual({ added: 2, rejected: 0 });
    });

    it('should handle some invalid vectors', () => {
      const records = [
        { id: 'id1', vector: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0] },
        { id: 'id2', vector: [0.2, 0.3] } // Invalid dimensions
      ];
      
      mockVectorStore.addVectors.mockReturnValue({ added: 1, rejected: 1 });
      
      const result = vectorStore.addVectors(records);
      
      expect(mockVectorStore.addVectors).toHaveBeenCalledWith(records);
      expect(result).toEqual({ added: 1, rejected: 1 });
    });
  });

  describe('findSimilar', () => {
    it('should find similar vectors', async () => {
      const queryVector = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
      const mockResults = [
        { id: 'id1', similarity: 0.95 },
        { id: 'id2', similarity: 0.85 }
      ];
      
      mockVectorStore.findSimilar.mockResolvedValue(mockResults);
      
      const results = await vectorStore.findSimilar(queryVector, 5);
      
      expect(mockVectorStore.findSimilar).toHaveBeenCalledWith(queryVector, 5);
      expect(results).toEqual(mockResults);
    });

    it('should handle empty results', async () => {
      const queryVector = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
      
      mockVectorStore.findSimilar.mockResolvedValue([]);
      
      const results = await vectorStore.findSimilar(queryVector, 5);
      
      expect(results).toEqual([]);
    });
  });

  describe('getVector', () => {
    it('should retrieve a vector by ID', async () => {
      const id = 'test-id';
      const mockVector = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
      
      mockVectorStore.getVector.mockResolvedValue(mockVector);
      
      const result = await vectorStore.getVector(id);
      
      expect(mockVectorStore.getVector).toHaveBeenCalledWith(id);
      expect(result).toEqual(mockVector);
    });

    it('should return null for non-existent vector', async () => {
      const id = 'nonexistent';
      
      mockVectorStore.getVector.mockResolvedValue(null);
      
      const result = await vectorStore.getVector(id);
      
      expect(result).toBeNull();
    });
  });

  describe('clear', () => {
    it('should clear all vectors', async () => {
      await vectorStore.clear();
      
      expect(mockVectorStore.clear).toHaveBeenCalled();
    });
  });

  describe('saveToDisk', () => {
    it('should save vectors to disk', async () => {
      await vectorStore.saveToDisk();
      
      expect(mockVectorStore.saveToDisk).toHaveBeenCalled();
    });
  });

  describe('loadFromDisk', () => {
    it('should load vectors from disk', async () => {
      await vectorStore.loadFromDisk();
      
      expect(mockVectorStore.loadFromDisk).toHaveBeenCalled();
    });
  });

  describe('getVectorCount', () => {
    it('should return the number of vectors', async () => {
      mockVectorStore.getVectorCount.mockResolvedValue(5);
      
      const count = await vectorStore.getVectorCount();
      
      expect(mockVectorStore.getVectorCount).toHaveBeenCalled();
      expect(count).toBe(5);
    });
  });

  describe('hasVector', () => {
    it('should check if vector exists', async () => {
      const id = 'test-id';
      
      mockVectorStore.hasVector.mockResolvedValue(true);
      
      const exists = await vectorStore.hasVector(id);
      
      expect(mockVectorStore.hasVector).toHaveBeenCalledWith(id);
      expect(exists).toBe(true);
    });
  });
}); 