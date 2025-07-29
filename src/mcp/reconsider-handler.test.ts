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
        created: '2025-01-21T12:00:00Z',
        anchor: '😊',
        embodied: 'feeling original',
        focus: 'on the past',
        mood: 'nostalgic',
        purpose: 'remembering',
        space: 'in memory',
        time: 'yesterday',
        presence: 'alone with thoughts',
        who: ['Human', 'Claude'],
        citation: 'Original text'
      };
      
      mockGetAllRecords.mockResolvedValue([existingRecord]);
      mockSaveSource.mockResolvedValue(existingRecord);
      mockSaveEmbedding.mockResolvedValue(undefined);
      
      const input: ReconsiderInput = {
        reconsiderations: [
          {
            id: 'exp_123',
            citation: 'Updated text',
            mood: 'hopeful',
            purpose: 'looking forward'
          }
        ]
      };
      
      const result = await handler.handle(input);
      
      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('✅ Updated exp_123');
      expect(result.content[0].text).toContain('Changed:');
      expect(result.content[0].text).toContain('mood');
      expect(result.content[0].text).toContain('purpose');
      expect(result.content[0].text).toContain('citation');
      expect(result.content[0].text).toContain('embedding');
      
      // Verify the record was saved with the correct structure
      // The handler converts from flat API to nested storage format
      expect(mockSaveSource).toHaveBeenCalledWith({
        ...existingRecord,
        citation: 'Updated text',
        mood: 'hopeful', // Updated
        purpose: 'looking forward', // Updated
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
        created: '2025-01-21T12:00:00Z',
        anchor: '😊',
        embodied: 'feeling one',
        focus: 'here',
        mood: 'calm',
        purpose: 'exploring',
        space: 'room 1',
        time: 'morning',
        presence: 'with others',
        who: ['Human', 'Claude'],
        citation: 'Text 1'
      };
      
      const record2 = {
        id: 'exp_2',
        created: '2025-01-21T12:00:00Z',
        anchor: '🤔',
        embodied: 'feeling two',
        focus: 'there',
        mood: 'curious',
        purpose: 'learning',
        space: 'room 2',
        time: 'afternoon',
        presence: 'in collaboration',
        who: ['Alex', 'Claude'],
        citation: 'Text 2'
      };
      
      mockGetAllRecords.mockResolvedValue([record1, record2]);
      mockSaveSource.mockResolvedValue(record1);
      
      const input: ReconsiderInput = {
        reconsiderations: [
          {
            id: 'exp_1',
            who: ['Human', 'GPT-4']
          },
          {
            id: 'exp_2',
            mood: 'excited'
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
            citation: 'Some update'
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
            citation: 'Some update'
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
            citation: 'Missing ID'
          } as unknown as { id: string; citation: string }
        ]
      });
      
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Each reconsideration must have an ID');
    });
  });
});