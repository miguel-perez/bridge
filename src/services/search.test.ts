/**
 * Tests for Streamlined Search Service
 */

import { searchExperiences, recall } from './search.js';
import { getAllRecords, getAllEmbeddings } from '../core/storage.js';
import { embeddingService } from './embeddings.js';
import { findSimilarByEmbedding } from './embedding-search.js';

// Mock dependencies
jest.mock('../core/storage.js');
jest.mock('./embeddings.js');
jest.mock('./embedding-search.js');

// Type the mocks
const mockGetAllRecords = getAllRecords as jest.MockedFunction<typeof getAllRecords>;
const mockGetAllEmbeddings = getAllEmbeddings as jest.MockedFunction<typeof getAllEmbeddings>;
const mockEmbeddingService = embeddingService as jest.Mocked<typeof embeddingService>;
const mockFindSimilarByEmbedding = findSimilarByEmbedding as jest.MockedFunction<typeof findSimilarByEmbedding>;

describe('Search Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock behavior
    mockEmbeddingService.initialize.mockResolvedValue(undefined);
    mockEmbeddingService.generateEmbedding.mockResolvedValue(new Array(384).fill(0));
  });

  describe('searchExperiences', () => {
    it('should perform semantic search with embeddings', async () => {
      // Mock storage data with new Experience format
      const records = [
        {
          id: 'exp_1',
          created: '2025-01-21T12:00:00Z',
          anchor: '😊',
          embodied: 'feeling energized',
          focus: 'on the task',
          mood: 'optimistic',
          purpose: 'learning new things',
          space: 'at home',
          time: 'morning',
          presence: 'with Claude',
          who: ['Human', 'Claude'],
          citation: 'Experience 1'
        },
        {
          id: 'exp_2',
          created: '2025-01-21T13:00:00Z',
          anchor: '🤔',
          embodied: 'thinking deeply',
          focus: 'scattered',
          mood: 'curious',
          purpose: 'exploring ideas',
          space: 'in the office',
          time: 'afternoon',
          presence: 'collaborating',
          who: ['Alex', 'GPT-4'],
          citation: 'Experience 2'
        }
      ];
      
      const embeddings = [
        { sourceId: 'exp_1', vector: [0.1, 0.2], generated: '2025-01-21T12:00:00Z' },
        { sourceId: 'exp_2', vector: [0.3, 0.4], generated: '2025-01-21T13:00:00Z' }
      ];
      
      mockGetAllRecords.mockResolvedValue(records);
      mockGetAllEmbeddings.mockResolvedValue(embeddings);
      mockFindSimilarByEmbedding.mockResolvedValue([
        { sourceId: 'exp_1', similarity: 0.9 }
      ]);
      
      const result = await searchExperiences({
        query: 'feeling energized',
        limit: 10
      });
      
      expect(result.experiences).toHaveLength(1);
      expect(result.experiences[0]).toEqual({
        id: 'exp_1',
        created: '2025-01-21T12:00:00Z',
        anchor: '😊',
        embodied: 'feeling energized',
        focus: 'on the task',
        mood: 'optimistic',
        purpose: 'learning new things',
        space: 'at home',
        time: 'morning',
        presence: 'with Claude',
        who: ['Human', 'Claude'],
        citation: 'Experience 1'
      });
      expect(result.totalFound).toBe(1);
      
      // Verify embedding was generated for query
      expect(mockEmbeddingService.generateEmbedding).toHaveBeenCalledWith('feeling energized');
    });

    it('should fall back to text search when embeddings unavailable', async () => {
      mockEmbeddingService.generateEmbedding.mockRejectedValue(new Error('No API key'));
      
      const records = [
        {
          id: 'exp_1',
          created: '2025-01-21T12:00:00Z',
          anchor: '⚡',
          embodied: 'feeling energized and alive',
          focus: 'sharp and clear',
          mood: 'excited',
          purpose: 'ready to tackle anything',
          space: 'in my workspace',
          time: 'this morning',
          presence: 'solo but connected',
          who: ['Human', 'Claude'],
          citation: 'Feeling really energized today'
        },
        {
          id: 'exp_2',
          created: '2025-01-21T13:00:00Z',
          anchor: '😴',
          embodied: 'heavy and slow',
          focus: 'scattered',
          mood: 'tired',
          purpose: 'just getting through',
          space: 'on the couch',
          time: 'late afternoon',
          presence: 'wanting solitude',
          who: ['Human', 'Claude'],
          citation: 'Feeling tired and sluggish'
        }
      ];
      
      mockGetAllRecords.mockResolvedValue(records);
      mockGetAllEmbeddings.mockResolvedValue([]);
      
      const result = await searchExperiences({
        query: 'energized',
        limit: 10
      });
      
      // Should return only experiences matching the search text
      expect(result.experiences).toHaveLength(1);
      expect(result.experiences[0].id).toBe('exp_1');
      expect(result.experiences[0].embodied).toContain('energized');
    });

    it('should filter out records without all required qualities', async () => {
      const records = [
        {
          id: 'exp_valid',
          created: '2025-01-21T12:00:00Z',
          anchor: '✅',
          embodied: 'feeling complete',
          focus: 'on validation',
          mood: 'satisfied',
          purpose: 'ensuring quality',
          space: 'in testing',
          time: 'right now',
          presence: 'with Claude',
          who: ['Human', 'Claude'],
          citation: 'Valid experience'
        },
        {
          id: 'exp_invalid',
          created: '2025-01-21T12:00:00Z',
          anchor: '❌',
          embodied: '', // Empty string - invalid
          focus: 'trying',
          mood: 'frustrated',
          purpose: 'debugging',
          space: 'somewhere',
          time: 'whenever',
          presence: 'alone',
          who: ['Human'], // Missing AI - invalid
          citation: 'Invalid experience'
        }
      ];
      
      mockGetAllRecords.mockResolvedValue(records);
      mockGetAllEmbeddings.mockResolvedValue([]);
      // Mock embedding search fails, so it falls back
      mockEmbeddingService.generateEmbedding.mockRejectedValue(new Error('No embeddings'));
      
      const result = await searchExperiences({
        query: 'experience',
        limit: 10
      });
      
      // Should only return the valid record
      expect(result.experiences).toHaveLength(1);
      expect(result.experiences[0].id).toBe('exp_valid');
    });

    it('should respect limit parameter', async () => {
      const records = Array.from({ length: 20 }, (_, i) => ({
        id: `exp_${i}`,
        created: new Date(Date.now() - i * 1000).toISOString(),
        anchor: '📝',
        embodied: `feeling ${i}`,
        focus: `focus ${i}`,
        mood: `mood ${i}`,
        purpose: `purpose ${i}`,
        space: `space ${i}`,
        time: `time ${i}`,
        presence: `presence ${i}`,
        who: ['Human', 'Claude'],
        citation: `Experience ${i}`
      }));
      
      mockGetAllRecords.mockResolvedValue(records);
      mockGetAllEmbeddings.mockResolvedValue([]);
      // Mock embedding search fails, so it falls back
      mockEmbeddingService.generateEmbedding.mockRejectedValue(new Error('No embeddings'));
      
      const result = await searchExperiences({
        query: 'Experience',
        limit: 5
      });
      
      expect(result.experiences).toHaveLength(5);
      expect(result.totalFound).toBe(5);
    });

    it('should add Claude to who array if missing AI', async () => {
      const records = [
        {
          id: 'exp_1',
          created: '2025-01-21T12:00:00Z',
          anchor: '🤖',
          embodied: 'testing migration',
          focus: 'on compatibility',
          mood: 'careful',
          purpose: 'ensuring smooth transition',
          space: 'in migration code',
          time: 'during update',
          presence: 'with the system',
          who: ['Human'], // Array but no AI
          citation: 'Experience needing AI'
        }
      ];
      
      mockGetAllRecords.mockResolvedValue(records);
      mockGetAllEmbeddings.mockResolvedValue([]);
      // Mock embedding search fails, so it falls back
      mockEmbeddingService.generateEmbedding.mockRejectedValue(new Error('No embeddings'));
      
      const result = await searchExperiences({
        query: 'testing',
        limit: 10
      });
      
      expect(result.experiences).toHaveLength(1);
      expect(result.experiences[0].who).toEqual(['Human', 'Claude']);
    });
  });

  describe('recall', () => {
    it('should be a simple wrapper around searchExperiences', async () => {
      const records = [
        {
          id: 'exp_1',
          created: '2025-01-21T12:00:00Z',
          anchor: '💭',
          embodied: 'remembering clearly',
          focus: 'on the past',
          mood: 'nostalgic',
          purpose: 'learning from history',
          space: 'in reflection',
          time: 'looking back',
          presence: 'with memories',
          who: ['Human', 'Claude'],
          citation: 'Memory to recall'
        }
      ];
      
      mockGetAllRecords.mockResolvedValue(records);
      mockGetAllEmbeddings.mockResolvedValue([]);
      // Mock embedding search fails, so it falls back
      mockEmbeddingService.generateEmbedding.mockRejectedValue(new Error('No embeddings'));
      
      const result = await recall('remembering', 5);
      
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('exp_1');
      expect(result[0].embodied).toBe('remembering clearly');
    });

    it('should use default limit of 25', async () => {
      const records = Array.from({ length: 30 }, (_, i) => ({
        id: `exp_${i}`,
        created: new Date(Date.now() - i * 1000).toISOString(),
        anchor: '📚',
        embodied: `memory ${i}`,
        focus: `focus ${i}`,
        mood: `mood ${i}`,
        purpose: `purpose ${i}`,
        space: `space ${i}`,
        time: `time ${i}`,
        presence: `presence ${i}`,
        who: ['Human', 'Claude'],
        citation: `Memory ${i}`
      }));
      
      mockGetAllRecords.mockResolvedValue(records);
      mockGetAllEmbeddings.mockResolvedValue([]);
      // Mock embedding search fails, so it falls back
      mockEmbeddingService.generateEmbedding.mockRejectedValue(new Error('No embeddings'));
      
      const result = await recall('memory');
      
      // Should find all 30 records that contain "memory" but limit to 25
      expect(result).toHaveLength(25);
      expect(result[0].embodied).toContain('memory');
    });
  });
});