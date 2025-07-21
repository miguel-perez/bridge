/**
 * Tests for Experience Handler
 */

import { ExperienceHandler } from './experience-handler.js';
import { ExperienceService } from '../services/experience.js';
import { RecallService } from '../services/recall.js';
import * as formatters from '../utils/formatters.js';
import * as messages from '../utils/messages.js';
import * as storage from '../core/storage.js';
// Importing for mock, but not used directly in tests

// Mock dependencies
jest.mock('../services/experience.js');
jest.mock('../services/recall.js');
jest.mock('../utils/formatters.js');
jest.mock('../utils/messages.js');
jest.mock('../core/storage.js');
jest.mock('../core/config.js', () => ({
  SEMANTIC_CONFIG: {
    SIMILARITY_DETECTION_THRESHOLD: 0.35
  }
}));

// Mock the ToolResultSchema to avoid validation issues in tests
jest.mock('./schemas.js', () => ({
  ...jest.requireActual('./schemas.js'),
  ToolResultSchema: {
    parse: jest.fn((value) => value)
  }
}));

describe('ExperienceHandler', () => {
  let handler: ExperienceHandler;
  let mockExperienceService: jest.Mocked<ExperienceService>;
  let mockRecallService: jest.Mocked<RecallService>;
  let mockFormatExperienceResponse: jest.MockedFunction<typeof formatters.formatExperienceResponse>;
  let mockFormatBatchExperienceResponse: jest.MockedFunction<typeof formatters.formatBatchExperienceResponse>;
  let mockFormatMessage: jest.MockedFunction<typeof messages.formatMessage>;
  let mockGetAllRecords: jest.MockedFunction<typeof storage.getAllRecords>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create handler instance
    handler = new ExperienceHandler();

    // Get mocked instances
    mockExperienceService = (ExperienceService as jest.MockedClass<typeof ExperienceService>).mock.instances[0] as jest.Mocked<ExperienceService>;
    mockRecallService = (RecallService as jest.MockedClass<typeof RecallService>).mock.instances[0] as jest.Mocked<RecallService>;

    // Setup formatter mocks
    mockFormatExperienceResponse = formatters.formatExperienceResponse as jest.MockedFunction<typeof formatters.formatExperienceResponse>;
    mockFormatBatchExperienceResponse = formatters.formatBatchExperienceResponse as jest.MockedFunction<typeof formatters.formatBatchExperienceResponse>;
    mockFormatExperienceResponse.mockReturnValue('Experienced: test');
    mockFormatBatchExperienceResponse.mockReturnValue('Batch experienced');

    // Setup message mocks
    mockFormatMessage = messages.formatMessage as jest.MockedFunction<typeof messages.formatMessage>;
    mockFormatMessage.mockReturnValue('Similar experience found');
    (messages.Messages as any) = {
      experience: {
        similar: 'Similar: {content}'
      }
    };

    // Setup storage mocks
    mockGetAllRecords = storage.getAllRecords as jest.MockedFunction<typeof storage.getAllRecords>;
    mockGetAllRecords.mockResolvedValue([]);
  });

  describe('handle', () => {
    it('should handle single experience successfully', async () => {
      // Make sure we have multiple records so we don't get first experience guidance
      mockGetAllRecords.mockResolvedValue([{}, {}, {}]);
      
      const mockResult = {
        source: {
          id: 'exp_123',
          source: 'I feel happy',
          created: '2025-01-21T12:00:00Z',
          experiencer: 'Human',
          perspective: 'I',
          processing: 'during',
          experience: ['mood.open']
        }
      };

      mockExperienceService.rememberExperience.mockResolvedValue(mockResult);
      mockRecallService.search.mockResolvedValue({
        results: [],
        totalResults: 0,
        hasMore: false
      });

      const result = await handler.handle({
        source: 'I feel happy',
        experiencer: 'Human',
        perspective: 'I',
        processing: 'during',
        experience: ['mood.open']
      });

      expect(result.content).toHaveLength(2);
      expect(result.content[0]).toEqual({
        type: 'text',
        text: 'Experienced: test'
      });
      expect(result.content[1]).toEqual({
        type: 'text',
        text: 'Captured as mood.open'
      });

      expect(mockExperienceService.rememberExperience).toHaveBeenCalledWith({
        source: 'I feel happy',
        experiencer: 'Human',
        perspective: 'I',
        processing: 'during',
        crafted: undefined,
        experience: ['mood.open']
      });
    });

    it('should handle batch experiences', async () => {
      const mockResults = [
        {
          source: {
            id: 'exp_1',
            source: 'Experience 1',
            created: '2025-01-21T12:00:00Z',
            experience: ['mood.open']
          }
        },
        {
          source: {
            id: 'exp_2',
            source: 'Experience 2',
            created: '2025-01-21T12:01:00Z',
            experience: ['mood.closed']
          }
        }
      ];

      mockExperienceService.rememberExperience
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1]);

      const result = await handler.handle({
        experiences: [
          { source: 'Experience 1', experience: ['mood.open'] },
          { source: 'Experience 2', experience: ['mood.closed'] }
        ]
      });

      expect(result).toEqual({
        content: [{
          type: 'text',
          text: 'Batch experienced'
        }]
      });

      expect(mockExperienceService.rememberExperience).toHaveBeenCalledTimes(2);
      expect(mockFormatBatchExperienceResponse).toHaveBeenCalledWith(mockResults);
    });

    it('should return error when source is missing', async () => {
      const result = await handler.handle({});

      expect(result).toEqual({
        isError: true,
        content: [{
          type: 'text',
          text: 'Source content is required'
        }]
      });

      expect(mockExperienceService.rememberExperience).not.toHaveBeenCalled();
    });

    it('should return error when batch experience item is missing source', async () => {
      const result = await handler.handle({
        experiences: [
          { source: 'Valid experience' },
          { experience: ['mood.open'] } // Missing source
        ]
      });

      expect(result).toEqual({
        isError: true,
        content: [{
          type: 'text',
          text: 'Each experience item must have source content'
        }]
      });
    });

    it('should handle service errors gracefully', async () => {
      mockExperienceService.rememberExperience.mockRejectedValue(new Error('Service error'));

      const result = await handler.handle({
        source: 'Test experience'
      });

      expect(result).toEqual({
        isError: true,
        content: [{
          type: 'text',
          text: 'Service error'
        }]
      });
    });

    it('should handle validation errors', async () => {
      // Mock the ToolResultSchema to throw
      const { ToolResultSchema } = jest.requireMock('./schemas.js');
      const mockParse = ToolResultSchema.parse;
      mockParse.mockImplementationOnce(() => {
        throw new Error('Validation failed');
      });

      const mockResult = {
        source: {
          id: 'exp_123',
          source: 'Test',
          created: '2025-01-21T12:00:00Z'
        }
      };
      mockExperienceService.rememberExperience.mockResolvedValue(mockResult);

      const result = await handler.handle({
        source: 'Test experience'
      });

      expect(result).toEqual({
        isError: true,
        content: [{
          type: 'text',
          text: 'Internal error: Output validation failed.'
        }]
      });
    });
  });

  describe('similar experience detection', () => {
    it('should find and include similar experiences', async () => {
      const mockResult = {
        source: {
          id: 'exp_123',
          source: 'I feel anxious',
          created: '2025-01-21T12:00:00Z',
          experience: ['mood.closed']
        }
      };

      const similarResult = {
        id: 'exp_456',
        content: 'I was feeling anxious about the presentation',
        snippet: 'I was feeling anxious about the presentation',
        relevance_score: 0.8
      };

      mockExperienceService.rememberExperience.mockResolvedValue(mockResult);
      mockRecallService.search.mockResolvedValue({
        results: [similarResult],
        totalResults: 1,
        hasMore: false
      });

      const result = await handler.handle({
        source: 'I feel anxious'
      });

      expect(result.content[0].text).toContain('Experienced: test');
      expect(result.content[0].text).toContain('Similar experience found');

      expect(mockRecallService.search).toHaveBeenCalledWith({
        semantic_query: 'I feel anxious',
        semantic_threshold: 0.35,
        limit: 2
      });
    });

    it('should exclude the current experience from similar results', async () => {
      const mockResult = {
        source: {
          id: 'exp_123',
          source: 'Test content',
          created: '2025-01-21T12:00:00Z'
        }
      };

      mockExperienceService.rememberExperience.mockResolvedValue(mockResult);
      mockRecallService.search.mockResolvedValue({
        results: [
          { id: 'exp_123', content: 'Test content', relevance_score: 1.0 }, // Same experience
          { id: 'exp_456', content: 'Similar content', relevance_score: 0.5 }
        ],
        totalResults: 2,
        hasMore: false
      });

      await handler.handle({
        source: 'Test content'
      });

      expect(mockFormatMessage).toHaveBeenCalledWith(
        'Similar: {content}',
        { content: 'Similar content' }
      );
    });

    it('should truncate long similar experiences', async () => {
      const mockResult = {
        source: {
          id: 'exp_123',
          source: 'Short text',
          created: '2025-01-21T12:00:00Z'
        }
      };

      const longContent = 'A'.repeat(150);
      mockExperienceService.rememberExperience.mockResolvedValue(mockResult);
      mockRecallService.search.mockResolvedValue({
        results: [{
          id: 'exp_456',
          content: longContent,
          snippet: longContent,
          relevance_score: 0.6
        }],
        totalResults: 1,
        hasMore: false
      });

      await handler.handle({
        source: 'Short text'
      });

      expect(mockFormatMessage).toHaveBeenCalledWith(
        'Similar: {content}',
        { content: 'A'.repeat(100) + '...' }
      );
    });

    it('should handle similarity search errors gracefully', async () => {
      const mockResult = {
        source: {
          id: 'exp_123',
          source: 'Test',
          created: '2025-01-21T12:00:00Z'
        }
      };

      mockExperienceService.rememberExperience.mockResolvedValue(mockResult);
      mockRecallService.search.mockRejectedValue(new Error('Search failed'));

      const result = await handler.handle({
        source: 'Test'
      });

      // Should still succeed without similar experience
      expect(result.isError).not.toBe(true);
      expect(result.content[0].text).toBe('Experienced: test');
    });
  });

  describe('guidance selection', () => {
    it('should provide guidance for first experience', async () => {
      mockGetAllRecords.mockResolvedValue([{}]); // Only one record (the one we just created)
      
      const mockResult = {
        source: {
          id: 'exp_123',
          source: 'My first experience',
          created: '2025-01-21T12:00:00Z'
        }
      };

      mockExperienceService.rememberExperience.mockResolvedValue(mockResult);
      mockRecallService.search.mockResolvedValue({
        results: [],
        totalResults: 0,
        hasMore: false
      });

      const result = await handler.handle({
        source: 'My first experience'
      });

      expect(result.content).toHaveLength(2);
      expect(result.content[1]).toEqual({
        type: 'text',
        text: "Capturing meaningful moments. Share what's on your mind."
      });
    });

    it('should provide guidance for multiple similar experiences', async () => {
      mockGetAllRecords.mockResolvedValue([{}, {}, {}, {}]); // Multiple records
      
      const mockResult = {
        source: {
          id: 'exp_123',
          source: 'Another anxious moment',
          created: '2025-01-21T12:00:00Z'
        }
      };

      mockExperienceService.rememberExperience.mockResolvedValue(mockResult);
      
      // First search for similar experience detection
      mockRecallService.search.mockResolvedValueOnce({
        results: [{ id: 'exp_456', content: 'Anxious', relevance_score: 0.7 }],
        totalResults: 1,
        hasMore: false
      });
      
      // Second search for guidance selection - filter out the current ID
      mockRecallService.search.mockResolvedValueOnce({
        results: [
          { id: 'exp_456', relevance_score: 0.7 },
          { id: 'exp_789', relevance_score: 0.6 },
          { id: 'exp_012', relevance_score: 0.5 },
          { id: 'exp_345', relevance_score: 0.3 } // Below threshold
        ],
        totalResults: 4,
        hasMore: false
      });

      const result = await handler.handle({
        source: 'Another anxious moment'
      });

      expect(result.content).toContainEqual({
        type: 'text',
        text: 'Connects to 3 similar moments'
      });
    });

    it('should provide guidance for emotional qualities', async () => {
      mockGetAllRecords.mockResolvedValue([{}, {}]);
      
      const mockResult = {
        source: {
          id: 'exp_123',
          source: 'Feeling contemplative',
          created: '2025-01-21T12:00:00Z',
          experience: ['mood.open', 'embodied.thinking']
        }
      };

      mockExperienceService.rememberExperience.mockResolvedValue(mockResult);
      mockRecallService.search.mockResolvedValue({
        results: [],
        totalResults: 0,
        hasMore: false
      });

      const result = await handler.handle({
        source: 'Feeling contemplative',
        experience: ['mood.open', 'embodied.thinking']
      });

      expect(result.content).toContainEqual({
        type: 'text',
        text: 'Captured as mood.open'
      });
    });

    it('should provide no guidance for routine captures', async () => {
      mockGetAllRecords.mockResolvedValue([{}, {}, {}]);
      
      const mockResult = {
        source: {
          id: 'exp_123',
          source: 'Regular update',
          created: '2025-01-21T12:00:00Z',
          experience: ['purpose.goal']
        }
      };

      mockExperienceService.rememberExperience.mockResolvedValue(mockResult);
      mockRecallService.search.mockResolvedValue({
        results: [],
        totalResults: 0,
        hasMore: false
      });

      const result = await handler.handle({
        source: 'Regular update',
        experience: ['purpose.goal']
      });

      // Should only have the main response, no guidance
      expect(result.content).toHaveLength(1);
    });

    it('should handle guidance selection errors gracefully', async () => {
      mockGetAllRecords.mockRejectedValue(new Error('Storage error'));
      
      const mockResult = {
        source: {
          id: 'exp_123',
          source: 'Test',
          created: '2025-01-21T12:00:00Z'
        }
      };

      mockExperienceService.rememberExperience.mockResolvedValue(mockResult);
      mockRecallService.search.mockResolvedValue({
        results: [],
        totalResults: 0,
        hasMore: false
      });

      const result = await handler.handle({
        source: 'Test'
      });

      // Should still succeed without guidance
      expect(result.isError).not.toBe(true);
      expect(result.content).toHaveLength(1);
    });
  });

  describe('edge cases', () => {
    it('should handle empty experience array', async () => {
      const mockResult = {
        source: {
          id: 'exp_123',
          source: 'Test',
          created: '2025-01-21T12:00:00Z'
        }
      };

      mockExperienceService.rememberExperience.mockResolvedValue(mockResult);
      mockRecallService.search.mockResolvedValue({
        results: [],
        totalResults: 0,
        hasMore: false
      });

      await handler.handle({
        source: 'Test',
        experience: []
      });

      expect(mockExperienceService.rememberExperience).toHaveBeenCalledWith({
        source: 'Test',
        perspective: undefined,
        experiencer: undefined,
        processing: undefined,
        crafted: undefined,
        experience: []
      });
    });

    it('should handle non-Error thrown values', async () => {
      mockExperienceService.rememberExperience.mockRejectedValue('String error');

      const result = await handler.handle({
        source: 'Test'
      });

      expect(result).toEqual({
        isError: true,
        content: [{
          type: 'text',
          text: 'Unknown error'
        }]
      });
    });

    it('should handle crafted flag', async () => {
      const mockResult = {
        source: {
          id: 'exp_123',
          source: 'Crafted content',
          created: '2025-01-21T12:00:00Z',
          crafted: true
        }
      };

      mockExperienceService.rememberExperience.mockResolvedValue(mockResult);
      mockRecallService.search.mockResolvedValue({
        results: [],
        totalResults: 0,
        hasMore: false
      });

      await handler.handle({
        source: 'Crafted content',
        crafted: true
      });

      expect(mockExperienceService.rememberExperience).toHaveBeenCalledWith(
        expect.objectContaining({
          crafted: true
        })
      );
    });

    it('should handle all optional fields', async () => {
      const fullInput = {
        source: 'Full experience',
        experiencer: 'Test User',
        perspective: 'we',
        processing: 'long-after',
        crafted: false,
        experience: ['mood.open', 'presence.collective']
      };

      const mockResult = {
        source: {
          id: 'exp_123',
          ...fullInput,
          created: '2025-01-21T12:00:00Z'
        }
      };

      mockExperienceService.rememberExperience.mockResolvedValue(mockResult);
      mockRecallService.search.mockResolvedValue({
        results: [],
        totalResults: 0,
        hasMore: false
      });

      await handler.handle(fullInput);

      expect(mockExperienceService.rememberExperience).toHaveBeenCalledWith({
        source: 'Full experience',
        experiencer: 'Test User',
        perspective: 'we',
        processing: 'long-after',
        crafted: false,
        experience: ['mood.open', 'presence.collective']
      });
    });
  });
});