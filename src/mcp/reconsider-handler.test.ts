/**
 * Tests for Streamlined Reconsider Handler
 */

import { ReconsiderHandler } from './reconsider-handler.js';
import * as storage from '../core/storage.js';
import * as embeddingModule from '../services/embeddings.js';
import type { ReconsiderInput } from './schemas.js';

// Mock dependencies
jest.mock('../core/storage.js');
jest.mock('../services/embeddings.js');

// Mock call-counter module
let mockCallCount = 0;
jest.mock('./call-counter.js', () => ({
  incrementCallCount: jest.fn(() => ++mockCallCount),
  getCallCount: jest.fn(() => mockCallCount),
  resetCallCount: jest.fn(() => {
    mockCallCount = 0;
  })
}));

// Mock the ToolResultSchema to avoid validation issues in tests
jest.mock('./schemas.js', () => ({
  ...jest.requireActual('./schemas.js'),
  ToolResultSchema: {
    parse: jest.fn((value) => value)
  }
}));

describe('ReconsiderHandler', () => {
  let handler: ReconsiderHandler;
  let mockGetAllRecords: jest.MockedFunction<typeof storage.getAllRecords>;
  let mockSaveSource: jest.MockedFunction<typeof storage.saveSource>;
  let mockSaveEmbedding: jest.MockedFunction<typeof storage.saveEmbedding>;
  let mockDeleteSource: jest.MockedFunction<typeof storage.deleteSource>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create handler instance
    handler = new ReconsiderHandler();
    
    // Setup storage mocks
    mockGetAllRecords = storage.getAllRecords as jest.MockedFunction<typeof storage.getAllRecords>;
    mockSaveSource = storage.saveSource as jest.MockedFunction<typeof storage.saveSource>;
    mockSaveEmbedding = storage.saveEmbedding as jest.MockedFunction<typeof storage.saveEmbedding>;
    mockDeleteSource = storage.deleteSource as jest.MockedFunction<typeof storage.deleteSource>;
    
    // Mock embedding service
    (embeddingModule.embeddingService.initialize as jest.Mock).mockResolvedValue(undefined);
    (embeddingModule.embeddingService.generateEmbedding as jest.Mock).mockResolvedValue([0.1, 0.2, 0.3]);
  });

  describe('handle', () => {
    it('should handle single update successfully', async () => {
      const existingRecord = {
        id: 'exp_123',
        source: 'Original text',
        emoji: '😊',
        created: '2025-01-21T12:00:00Z',
        who: ['Human', 'Claude'],
        experienceQualities: {
          embodied: 'feeling original',
          focus: 'on the past',
          mood: 'nostalgic',
          purpose: 'remembering',
          space: 'in memory',
          time: 'yesterday',
          presence: 'alone with thoughts'
        }
      };
      
      mockGetAllRecords.mockResolvedValue([existingRecord]);
      mockSaveSource.mockResolvedValue(undefined);
      mockSaveEmbedding.mockResolvedValue(undefined);
      
      const input: ReconsiderInput = {
        reconsiderations: [
          {
            id: 'exp_123',
            source: 'Updated text',
            experienceQualities: {
              mood: 'hopeful',
              purpose: 'looking forward'
            }
          }
        ]
      };
      
      const result = await handler.handle(input);
      
      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('✅ Updated exp_123');
      expect(result.content[0].text).toContain('Changed: citation, quality.mood, quality.purpose, embedding');
      
      // Verify the record was saved with merged qualities
      expect(mockSaveSource).toHaveBeenCalledWith({
        ...existingRecord,
        source: 'Updated text',
        experienceQualities: {
          ...existingRecord.experienceQualities,
          mood: 'hopeful',
          purpose: 'looking forward'
        }
      });
    });

    it('should handle release mode', async () => {
      mockDeleteSource.mockResolvedValue(undefined);
      
      const input: ReconsiderInput = {
        reconsiderations: [
          {
            id: 'exp_123',
            release: true,
            releaseReason: 'No longer relevant'
          }
        ]
      };
      
      const result = await handler.handle(input);
      
      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('🙏 Experience released with gratitude');
      expect(result.content[0].text).toContain('exp_123');
      expect(result.content[0].text).toContain('No longer relevant');
      expect(mockDeleteSource).toHaveBeenCalledWith('exp_123');
    });

    it('should handle batch updates', async () => {
      const record1 = {
        id: 'exp_1',
        source: 'Text 1',
        emoji: '😊',
        created: '2025-01-21T12:00:00Z',
        who: ['Human', 'Claude'],
        experienceQualities: {
          embodied: 'feeling one',
          focus: 'here',
          mood: 'calm',
          purpose: 'exploring',
          space: 'room 1',
          time: 'morning',
          presence: 'with others'
        }
      };
      
      const record2 = {
        id: 'exp_2',
        source: 'Text 2',
        emoji: '🤔',
        created: '2025-01-21T12:00:00Z',
        who: ['Alex', 'Claude'],
        experienceQualities: {
          embodied: 'feeling two',
          focus: 'there',
          mood: 'curious',
          purpose: 'learning',
          space: 'room 2',
          time: 'afternoon',
          presence: 'in collaboration'
        }
      };
      
      mockGetAllRecords.mockResolvedValue([record1, record2]);
      mockSaveSource.mockResolvedValue(undefined);
      
      const input: ReconsiderInput = {
        reconsiderations: [
          {
            id: 'exp_1',
            who: ['Human', 'GPT-4']
          },
          {
            id: 'exp_2',
            experienceQualities: {
              mood: 'excited'
            }
          }
        ]
      };
      
      const result = await handler.handle(input);
      
      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('Processed 2 reconsiderations');
      expect(mockSaveSource).toHaveBeenCalledTimes(2);
    });

    it('should handle non-existent experience', async () => {
      mockGetAllRecords.mockResolvedValue([]);
      
      const input: ReconsiderInput = {
        reconsiderations: [
          {
            id: 'exp_nonexistent',
            source: 'Some update'
          }
        ]
      };
      
      const result = await handler.handle(input);
      
      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('❌ Experience not found: exp_nonexistent');
    });

    it('should handle errors gracefully', async () => {
      mockGetAllRecords.mockRejectedValue(new Error('Database error'));
      
      const input: ReconsiderInput = {
        reconsiderations: [
          {
            id: 'exp_123',
            source: 'Some update'
          }
        ]
      };
      
      const result = await handler.handle(input);
      
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error: Database error');
    });

    it('should validate input', async () => {
      const result = await handler.handle({
        reconsiderations: []
      });
      
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Reconsiderations array is required');
    });

    it('should validate each reconsideration has an ID', async () => {
      const result = await handler.handle({
        reconsiderations: [
          {
            source: 'Missing ID'
          } as any
        ]
      });
      
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Each reconsideration must have an ID');
    });
  });
});