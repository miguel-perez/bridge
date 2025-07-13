import { jest } from '@jest/globals';
import { CaptureService } from './capture';
import { VectorStore } from './vector-store';
import { EmbeddingService } from './embeddings';
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
jest.mock('./embeddings', () => ({
  EmbeddingService: jest.fn(() => ({
    generateEmbedding: jest.fn(),
    generateEmbeddings: jest.fn()
  })),
  embeddingService: {
    generateEmbedding: jest.fn(),
    generateEmbeddings: jest.fn()
  }
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
  VectorStore: jest.fn(() => mockVectorStore),
  getVectorStore: jest.fn(() => mockVectorStore)
}));

// Mock storage functions
jest.mock('../core/storage', () => ({
  generateId: jest.fn(() => Promise.resolve('src_test-id-12345')),
  saveSource: jest.fn((source) => Promise.resolve(source))
}));

// Mock validation functions
jest.mock('../utils/validation', () => ({
  parseOccurredDate: jest.fn((date) => Promise.resolve(date))
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

// Get the mocked embedding service
const { embeddingService: mockEmbeddingService } = require('./embeddings');

describe('CaptureService', () => {
  let captureService: CaptureService;

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
    
    // Create capture service instance
    captureService = new CaptureService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('captureSource', () => {
    it('should capture a source with all required fields', async () => {
      const input = {
        content: 'Test content',
        contentType: 'text',
        perspective: 'I' as const,
        processing: 'during' as const,
        occurred: '2024-01-15',
        experiencer: 'self',
        crafted: false,
        experience: {
          qualities: [
            {
              type: 'embodied' as const,
              prominence: 0.8,
              manifestation: 'Physical sensation'
            }
          ],
          emoji: '😊',
          narrative: 'I felt a warm sense of accomplishment'
        }
      };

      const result = await captureService.captureSource(input);

      expect(result).toBeDefined();
      expect(result.source.id).toBe('src_test-id-12345');
      expect(result.source.content).toBe(input.content);
      expect(result.source.contentType).toBe(input.contentType);
      expect(result.source.perspective).toBe(input.perspective);
      expect(result.source.experiencer).toBe(input.experiencer);
      expect(result.source.processing).toBe(input.processing);
      expect(result.source.crafted).toBe(input.crafted);
      expect(result.source.experience.emoji).toBe(input.experience.emoji);
      expect(result.source.experience.narrative).toBe(input.experience.narrative);
      expect(result.defaultsUsed).toEqual([]);
    });

    it('should capture a source with minimal fields and use defaults', async () => {
      const input = {
        experience: {
          qualities: [
            {
              type: 'affective' as const,
              prominence: 0.6,
              manifestation: 'Emotional response'
            }
          ],
          emoji: '🎉',
          narrative: 'I was excited about the new project'
        }
      };

      const result = await captureService.captureSource(input);

      expect(result).toBeDefined();
      expect(result.source.id).toBe('src_test-id-12345');
      expect(result.source.content).toBe(input.experience.narrative); // Uses narrative as content when no content provided
      expect(result.source.contentType).toBe('text'); // Default
      expect(result.source.perspective).toBe('I'); // Default
      expect(result.source.experiencer).toBe('self'); // Default
      expect(result.source.processing).toBe('during'); // Default
      expect(result.defaultsUsed).toEqual([
        'perspective="I"',
        'experiencer="self"',
        'processing="during"',
        'contentType="text"'
      ]);
    });

    it('should handle embedding generation errors gracefully', async () => {
      const input = {
        experience: {
          qualities: [
            {
              type: 'attentional' as const,
              prominence: 0.7,
              manifestation: 'Focused attention'
            }
          ],
          emoji: '🧠',
          narrative: 'I was deeply focused on solving the problem'
        }
      };

      // Mock embedding service to throw an error
      mockEmbeddingService.generateEmbedding.mockRejectedValue(new Error('Embedding failed'));

      const result = await captureService.captureSource(input);

      expect(result).toBeDefined();
      expect(result.source.embedding).toBeUndefined();
      // Should still capture the source even if embedding fails
    });

    it('should handle vector store errors gracefully', async () => {
      const input = {
        experience: {
          qualities: [
            {
              type: 'spatial' as const,
              prominence: 0.5,
              manifestation: 'Location awareness'
            }
          ],
          emoji: '📍',
          narrative: 'I was aware of my surroundings'
        }
      };

      // Mock vector store to throw an error
      mockVectorStore.addVector.mockImplementation(() => {
        throw new Error('Vector store error');
      });

      const result = await captureService.captureSource(input);

      expect(result).toBeDefined();
      // Should still capture the source even if vector storage fails
    });

    it('should validate occurred date format', async () => {
      const input = {
        occurred: 'invalid-date',
        experience: {
          qualities: [
            {
              type: 'temporal' as const,
              prominence: 0.9,
              manifestation: 'Time awareness'
            }
          ],
          emoji: '⏰',
          narrative: 'I was aware of the time passing'
        }
      };

      // Mock parseOccurredDate to throw an error
      const { parseOccurredDate } = require('../utils/validation');
      parseOccurredDate.mockRejectedValue(new Error('Invalid date'));

      await expect(captureService.captureSource(input)).rejects.toThrow(
        'Invalid occurred date format. Example valid formats: "2024-01-15", "yesterday", "last week", "2024-01-01T10:00:00Z".'
      );
    });

    it('should validate required experience fields', async () => {
      const input = {
        experience: {
          qualities: [
            {
              type: 'intersubjective' as const,
              prominence: 0.8,
              manifestation: 'Social connection'
            }
          ],
          emoji: '', // Empty emoji should fail validation
          narrative: 'I felt connected to others'
        }
      };

      await expect(captureService.captureSource(input)).rejects.toThrow('Emoji is required');
    });

    it('should validate narrative length', async () => {
      const input = {
        experience: {
          qualities: [
            {
              type: 'purposive' as const,
              prominence: 0.7,
              manifestation: 'Goal orientation'
            }
          ],
          emoji: '🎯',
          narrative: 'A'.repeat(201) // Too long narrative
        }
      };

      await expect(captureService.captureSource(input)).rejects.toThrow(
        'Narrative should be a concise experiential summary'
      );
    });
  });
}); 