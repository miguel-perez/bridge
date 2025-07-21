/**
 * Tests for Recall Handler
 */

import { RecallHandler } from './recall-handler.js';
import { RecallService } from '../services/recall.js';
import * as formatters from '../utils/formatters.js';
import * as timeout from '../utils/timeout.js';
import * as unifiedScoring from '../services/unified-scoring.js';
// Importing for mock, but not used directly in tests

// Mock dependencies
jest.mock('../services/recall.js');
jest.mock('../utils/formatters.js');
jest.mock('../utils/timeout.js');
jest.mock('../services/unified-scoring.js');
jest.mock('../core/config.js', () => ({
  SEMANTIC_CONFIG: {
    DEFAULT_THRESHOLD: 0.3,
    SIMILARITY_DETECTION_THRESHOLD: 0.35
  }
}));

// Mock the ToolResultSchema
jest.mock('./schemas.js', () => ({
  ...jest.requireActual('./schemas.js'),
  ToolResultSchema: {
    parse: jest.fn((value) => value)
  }
}));

describe('RecallHandler', () => {
  let handler: RecallHandler;
  let mockRecallService: jest.Mocked<RecallService>;
  let mockFormatRecallResponse: jest.MockedFunction<typeof formatters.formatRecallResponse>;
  let mockWithTimeout: jest.MockedFunction<typeof timeout.withTimeout>;
  let mockIsQueryPurelyQuality: jest.MockedFunction<typeof unifiedScoring.isQueryPurelyQuality>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create handler instance
    handler = new RecallHandler();

    // Get mocked instances
    mockRecallService = (RecallService as jest.MockedClass<typeof RecallService>).mock.instances[0] as jest.Mocked<RecallService>;

    // Setup formatter mock
    mockFormatRecallResponse = formatters.formatRecallResponse as jest.MockedFunction<typeof formatters.formatRecallResponse>;
    mockFormatRecallResponse.mockReturnValue('Formatted recall results');

    // Setup timeout mock to pass through
    mockWithTimeout = timeout.withTimeout as jest.MockedFunction<typeof timeout.withTimeout>;
    mockWithTimeout.mockImplementation(async (promise) => promise);

    // Setup unified scoring mock
    mockIsQueryPurelyQuality = unifiedScoring.isQueryPurelyQuality as jest.MockedFunction<typeof unifiedScoring.isQueryPurelyQuality>;
    mockIsQueryPurelyQuality.mockReturnValue(false);
  });

  describe('handle', () => {
    it('should handle basic recall query successfully', async () => {
      const mockResults = [{
        id: 'exp_123',
        type: 'experience',
        snippet: 'Test experience',
        content: 'Test experience',
        metadata: {
          created: '2025-01-21T12:00:00Z',
          experiencer: 'Human',
          experience: ['mood.open']
        },
        relevance_score: 0.8
      }];

      mockRecallService.search.mockResolvedValue({
        results: mockResults,
        stats: { total: 1 }
      });

      const result = await handler.handle({
        query: 'test'
      });

      expect(result.content[0]).toEqual({
        type: 'text',
        text: 'Formatted recall results'
      });

      expect(mockRecallService.search).toHaveBeenCalledWith({
        query: 'test',
        limit: 10,
        semantic_query: 'test',
        semantic_threshold: 0.3,
        experiencer: undefined,
        perspective: undefined,
        processing: undefined,
        created: undefined,
        sort: undefined
      });
    });

    it('should handle recent query specially', async () => {
      mockRecallService.search.mockResolvedValue({
        results: [],
        stats: { total: 0 }
      });

      await handler.handle({
        query: 'recent'
      });

      expect(mockRecallService.search).toHaveBeenCalledWith({
        query: '', // Empty query for recent
        limit: 5, // Limited to 5 for recent
        semantic_query: '',
        semantic_threshold: 0.3,
        experiencer: undefined,
        perspective: undefined,
        processing: undefined,
        created: undefined,
        sort: 'created' // Force sort by created
      });
    });

    it('should handle "last" query as recent', async () => {
      mockRecallService.search.mockResolvedValue({
        results: [],
        stats: { total: 0 }
      });

      await handler.handle({
        query: 'last'
      });

      expect(mockRecallService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: '',
          limit: 5,
          sort: 'created'
        })
      );
    });

    it('should handle pure quality queries', async () => {
      mockIsQueryPurelyQuality.mockReturnValue(true);
      mockRecallService.search.mockResolvedValue({
        results: [],
        stats: { total: 0 }
      });

      await handler.handle({
        query: 'mood.open'
      });

      expect(mockRecallService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'mood.open',
          semantic_query: '', // No semantic search for pure quality
        })
      );
    });

    it('should handle array queries', async () => {
      mockRecallService.search.mockResolvedValue({
        results: [],
        stats: { total: 0 }
      });

      await handler.handle({
        query: ['mood.open', 'embodied.thinking']
      });

      expect(mockRecallService.search).toHaveBeenCalledWith({
        query: ['mood.open', 'embodied.thinking'],
        limit: 10,
        semantic_query: 'mood.open embodied.thinking',
        semantic_threshold: 0.3,
        experiencer: undefined,
        perspective: undefined,
        processing: undefined,
        created: undefined,
        sort: undefined
      });
    });

    it('should pass through all filter parameters', async () => {
      mockRecallService.search.mockResolvedValue({
        results: [],
        stats: { total: 0 }
      });

      await handler.handle({
        query: 'test',
        experiencer: 'Human',
        perspective: 'First',
        processing: 'during',
        created: '2025-01-21',
        sort: 'created'
      });

      expect(mockRecallService.search).toHaveBeenCalledWith({
        query: 'test',
        limit: 10,
        semantic_query: 'test',
        semantic_threshold: 0.3,
        experiencer: 'Human',
        perspective: 'First',
        processing: 'during',
        created: '2025-01-21',
        sort: 'created'
      });
    });

    it('should handle empty query', async () => {
      mockRecallService.search.mockResolvedValue({
        results: [],
        stats: { total: 0 }
      });

      await handler.handle({});

      expect(mockRecallService.search).toHaveBeenCalledWith({
        query: undefined,
        limit: 10,
        semantic_query: undefined,
        semantic_threshold: 0.3,
        experiencer: undefined,
        perspective: undefined,
        processing: undefined,
        created: undefined,
        sort: undefined
      });
    });

    it('should handle service errors gracefully', async () => {
      mockRecallService.search.mockRejectedValue(new Error('Service error'));

      const result = await handler.handle({
        query: 'test'
      });

      expect(result.content[0]).toEqual({
        type: 'text',
        text: 'I encountered an error while searching for experiences. Please try again.'
      });
    });

    it('should handle validation errors', async () => {
      const result = await handler.handle({
        query: 'test',
        limit: -1 // Invalid limit
      });

      expect(result.content[0]).toEqual({
        type: 'text',
        text: 'I encountered an error while searching for experiences. Please try again.'
      });
    });

    it('should handle non-Error thrown values', async () => {
      mockRecallService.search.mockRejectedValue('String error');

      const result = await handler.handle({
        query: 'test'
      });

      expect(result.content[0]).toEqual({
        type: 'text',
        text: 'I encountered an error while searching for experiences. Please try again.'
      });
    });
  });

  describe('guidance selection', () => {
    it('should provide guidance for no results with long query', async () => {
      mockRecallService.search.mockResolvedValue({
        results: [],
        stats: { total: 0 }
      });

      const result = await handler.handle({
        query: 'this is a very long query that is unlikely to match anything exactly'
      });

      expect(result.content).toContainEqual({
        type: 'text',
        text: 'Long phrases rarely match exactly.'
      });
    });

    it('should provide guidance for no results with short query', async () => {
      mockRecallService.search.mockResolvedValue({
        results: [],
        stats: { total: 0 }
      });

      const result = await handler.handle({
        query: 'ab'
      });

      expect(result.content).toContainEqual({
        type: 'text',
        text: "Try more specific terms or 'recall recent' for latest experiences"
      });
    });

    it('should provide default guidance for no results', async () => {
      mockRecallService.search.mockResolvedValue({
        results: [],
        stats: { total: 0 }
      });

      const result = await handler.handle({
        query: 'normal query'
      });

      expect(result.content).toContainEqual({
        type: 'text',
        text: "No matches found. Try:\n• Different dimensions\n• Broader terms\n• 'recall recent' for latest"
      });
    });

    it('should provide guidance for single result', async () => {
      mockRecallService.search.mockResolvedValue({
        results: [{
          id: 'exp_123',
          type: 'experience',
          content: 'Test',
          snippet: 'Test',
          relevance_score: 0.8
        }],
        stats: { total: 1 }
      });

      const result = await handler.handle({
        query: 'test'
      });

      expect(result.content).toContainEqual({
        type: 'text',
        text: "To modify: use 'reconsider' with the ID\nTo remove: use 'release' with the ID"
      });
    });

    it('should provide guidance for recent query', async () => {
      mockRecallService.search.mockResolvedValue({
        results: [
          { id: 'exp_1', type: 'experience', content: 'Recent 1', snippet: 'Recent 1', relevance_score: 1 },
          { id: 'exp_2', type: 'experience', content: 'Recent 2', snippet: 'Recent 2', relevance_score: 1 }
        ],
        stats: { total: 2 }
      });

      const result = await handler.handle({
        query: 'recent'
      });

      expect(result.content).toContainEqual({
        type: 'text',
        text: 'Recent experiences shown with IDs for easy modification'
      });
    });

    it('should provide guidance for many results', async () => {
      mockRecallService.search.mockResolvedValue({
        results: [
          { id: 'exp_1', type: 'experience', content: 'Result 1', snippet: 'Result 1', relevance_score: 0.9 },
          { id: 'exp_2', type: 'experience', content: 'Result 2', snippet: 'Result 2', relevance_score: 0.8 },
          { id: 'exp_3', type: 'experience', content: 'Result 3', snippet: 'Result 3', relevance_score: 0.7 }
        ],
        stats: { total: 3 }
      });

      const result = await handler.handle({
        query: 'test'
      });

      expect(result.content).toContainEqual({
        type: 'text',
        text: 'Multiple matches found. Use IDs to modify specific experiences.'
      });
    });

    it('should provide guidance for emotional content', async () => {
      mockRecallService.search.mockResolvedValue({
        results: [{
          id: 'exp_123',
          type: 'experience',
          content: 'I feel anxious about the presentation',
          snippet: 'I feel anxious about the presentation',
          metadata: {
            experience: ['mood.closed']
          },
          relevance_score: 0.9
        }],
        stats: { total: 1 }
      });

      const result = await handler.handle({
        query: 'anxiety'
      });

      expect(result.content).toContainEqual({
        type: 'text',
        text: 'Emotional experiences captured. Use IDs to modify or release.'
      });
    });

    it('should provide default guidance for small result sets', async () => {
      mockRecallService.search.mockResolvedValue({
        results: [
          { id: 'exp_1', type: 'experience', content: 'Result 1', snippet: 'Result 1', relevance_score: 0.8 },
          { id: 'exp_2', type: 'experience', content: 'Result 2', snippet: 'Result 2', relevance_score: 0.7 }
        ],
        stats: { total: 2 }
      });

      const result = await handler.handle({
        query: 'test'
      });

      expect(result.content).toContainEqual({
        type: 'text',
        text: 'Use IDs to modify or release specific experiences.'
      });
    });
  });

  describe('result formatting', () => {
    it('should format results with metadata', async () => {
      const mockResults = [{
        id: 'exp_123',
        type: 'experience',
        content: 'Test experience',
        snippet: 'Test experience',
        metadata: {
          created: '2025-01-21T12:00:00Z',
          experience: ['mood.open']
        },
        relevance_score: 0.8
      }];

      mockRecallService.search.mockResolvedValue({
        results: mockResults,
        stats: { total: 1 }
      });

      const result = await handler.handle({
        query: 'test'
      });

      expect(mockFormatRecallResponse).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'exp_123',
            type: 'experience',
            content: 'Test experience',
            snippet: 'Test experience',
            metadata: expect.objectContaining({
              experience: ['mood.open']
            }),
            relevance_score: 0.8
          })
        ]),
        true
      );
    });

    it('should handle missing metadata', async () => {
      const mockResults = [{
        id: 'exp_123',
        type: 'experience',
        content: 'Test experience',
        snippet: 'Test experience',
        relevance_score: 0.8
      }];

      mockRecallService.search.mockResolvedValue({
        results: mockResults,
        stats: { total: 1 }
      });

      await handler.handle({
        query: 'test'
      });

      expect(mockFormatRecallResponse).toHaveBeenCalledWith(
        mockResults,
        true
      );
    });

    it('should handle missing content', async () => {
      const mockResults = [{
        id: 'exp_123',
        type: 'experience',
        snippet: 'Test snippet',
        relevance_score: 0.8
      }];

      mockRecallService.search.mockResolvedValue({
        results: mockResults,
        stats: { total: 1 }
      });

      await handler.handle({
        query: 'test'
      });

      expect(mockFormatRecallResponse).toHaveBeenCalledWith(
        mockResults,
        true
      );
    });

    it('should use current date for missing created timestamp', async () => {
      const mockResults = [{
        id: 'exp_123',
        type: 'experience',
        content: 'Test experience',
        snippet: 'Test experience',
        metadata: {
          experience: ['mood.open']
        },
        relevance_score: 0.8
      }];

      mockRecallService.search.mockResolvedValue({
        results: mockResults,
        stats: { total: 1 }
      });

      await handler.handle({
        query: 'test'
      });

      expect(mockFormatRecallResponse).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'exp_123',
            type: 'experience',
            content: 'Test experience',
            snippet: 'Test experience',
            metadata: expect.objectContaining({
              experience: ['mood.open']
            }),
            relevance_score: 0.8
          })
        ]),
        true
      );
    });
  });

  describe('timeout handling', () => {
    it('should apply timeout to search operation', async () => {
      mockRecallService.search.mockResolvedValue({
        results: [],
        stats: { total: 0 }
      });

      await handler.handle({
        query: 'test'
      });

      expect(mockWithTimeout).toHaveBeenCalledWith(
        expect.any(Promise),
        30000,
        'Recall operation'
      );
    });
  });
});