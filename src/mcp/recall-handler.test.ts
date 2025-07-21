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
  let mockIsQueryPurelyDimensional: jest.MockedFunction<typeof unifiedScoring.isQueryPurelyDimensional>;

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
    mockIsQueryPurelyDimensional = unifiedScoring.isQueryPurelyDimensional as jest.MockedFunction<typeof unifiedScoring.isQueryPurelyDimensional>;
    mockIsQueryPurelyDimensional.mockReturnValue(false);
  });

  describe('handle', () => {
    it('should handle basic recall query successfully', async () => {
      const mockResults = [{
        id: 'exp_123',
        content: 'Test experience',
        snippet: 'Test experience',
        metadata: {
          created: '2025-01-21T12:00:00Z',
          experiencer: 'Human',
          experience: ['mood.open']
        },
        relevance_score: 0.8
      }];

      mockRecallService.search.mockResolvedValue({
        results: mockResults,
        totalResults: 1,
        hasMore: false
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
        totalResults: 0,
        hasMore: false
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
        totalResults: 0,
        hasMore: false
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

    it('should handle pure dimensional queries', async () => {
      mockIsQueryPurelyDimensional.mockReturnValue(true);
      mockRecallService.search.mockResolvedValue({
        results: [],
        totalResults: 0,
        hasMore: false
      });

      await handler.handle({
        query: 'mood.open'
      });

      expect(mockRecallService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'mood.open',
          semantic_query: '', // No semantic search for pure dimensional
        })
      );
    });

    it('should handle array queries', async () => {
      mockRecallService.search.mockResolvedValue({
        results: [],
        totalResults: 0,
        hasMore: false
      });

      await handler.handle({
        query: ['mood.open', 'embodied.sensing']
      });

      expect(mockRecallService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: ['mood.open', 'embodied.sensing'],
          semantic_query: '', // No semantic search for array queries
        })
      );
    });

    it('should pass through all filter parameters', async () => {
      mockRecallService.search.mockResolvedValue({
        results: [],
        totalResults: 0,
        hasMore: false
      });

      await handler.handle({
        query: 'test',
        experiencer: 'Alice',
        perspective: 'I',
        processing: 'during',
        created: { start: '2025-01-01', end: '2025-01-31' },
        sort: 'relevance',
        limit: 20
      });

      expect(mockRecallService.search).toHaveBeenCalledWith({
        query: 'test',
        limit: 20,
        semantic_query: 'test',
        semantic_threshold: 0.3,
        experiencer: 'Alice',
        perspective: 'I',
        processing: 'during',
        created: { start: '2025-01-01', end: '2025-01-31' },
        sort: 'relevance'
      });
    });

    it('should handle empty query', async () => {
      mockRecallService.search.mockResolvedValue({
        results: [],
        totalResults: 0,
        hasMore: false
      });

      await handler.handle({});

      expect(mockRecallService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: '',
          semantic_query: ''
        })
      );
    });

    it('should handle service errors gracefully', async () => {
      mockRecallService.search.mockRejectedValue(new Error('Search failed'));

      const result = await handler.handle({
        query: 'test'
      });

      expect(result).toEqual({
        isError: true,
        content: [{
          type: 'text',
          text: 'Search failed'
        }]
      });
    });

    it('should handle validation errors', async () => {
      const { ToolResultSchema } = jest.requireMock('./schemas.js');
      const mockParse = ToolResultSchema.parse;
      mockParse.mockImplementationOnce(() => {
        throw new Error('Validation failed');
      });

      mockRecallService.search.mockResolvedValue({
        results: [],
        totalResults: 0,
        hasMore: false
      });

      const result = await handler.handle({
        query: 'test'
      });

      expect(result).toEqual({
        isError: true,
        content: [{
          type: 'text',
          text: 'Internal error: Output validation failed.'
        }]
      });
    });

    it('should handle non-Error thrown values', async () => {
      mockRecallService.search.mockRejectedValue('String error');

      const result = await handler.handle({
        query: 'test'
      });

      expect(result).toEqual({
        isError: true,
        content: [{
          type: 'text',
          text: 'Unknown error'
        }]
      });
    });
  });

  describe('guidance selection', () => {
    it('should provide guidance for no results with long query', async () => {
      mockRecallService.search.mockResolvedValue({
        results: [],
        totalResults: 0,
        hasMore: false
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
        totalResults: 0,
        hasMore: false
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
        totalResults: 0,
        hasMore: false
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
          content: 'Test',
          snippet: 'Test',
          relevance_score: 0.8
        }],
        totalResults: 1,
        hasMore: false
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
          { id: 'exp_1', content: 'Recent 1', snippet: 'Recent 1', relevance_score: 1 },
          { id: 'exp_2', content: 'Recent 2', snippet: 'Recent 2', relevance_score: 1 }
        ],
        totalResults: 2,
        hasMore: false
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
      const manyResults = Array.from({ length: 6 }, (_, i) => ({
        id: `exp_${i}`,
        content: `Result ${i}`,
        snippet: `Result ${i}`,
        relevance_score: 0.7
      }));

      mockRecallService.search.mockResolvedValue({
        results: manyResults,
        totalResults: 6,
        hasMore: false
      });

      const result = await handler.handle({
        query: 'test'
      });

      expect(result.content).toContainEqual({
        type: 'text',
        text: 'Many results may suggest patterns'
      });
    });

    it('should provide guidance for emotional content', async () => {
      mockRecallService.search.mockResolvedValue({
        results: [{
          id: 'exp_123',
          content: 'Feeling anxious',
          snippet: 'Feeling anxious',
          metadata: {
            created: '2025-01-21T12:00:00Z',
            experience: ['mood.closed', 'embodied.sensing']
          },
          relevance_score: 0.8
        }, {
          id: 'exp_456',
          content: 'Feeling better',
          snippet: 'Feeling better',
          metadata: {
            created: '2025-01-21T13:00:00Z',
            experience: ['mood.open']
          },
          relevance_score: 0.7
        }],
        totalResults: 2,
        hasMore: false
      });

      const result = await handler.handle({
        query: 'feeling'
      });

      expect(result.content).toContainEqual({
        type: 'text',
        text: 'Use IDs to update or connect insights'
      });
    });

    it('should provide default guidance for small result sets', async () => {
      mockRecallService.search.mockResolvedValue({
        results: [{
          id: 'exp_123',
          content: 'Normal content',
          snippet: 'Normal content',
          metadata: {
            created: '2025-01-21T12:00:00Z',
            experience: ['purpose.goal']
          },
          relevance_score: 0.8
        }, {
          id: 'exp_456',
          content: 'Another normal',
          snippet: 'Another normal',
          relevance_score: 0.7
        }],
        totalResults: 2,
        hasMore: false
      });

      const result = await handler.handle({
        query: 'normal'
      });

      expect(result.content).toContainEqual({
        type: 'text',
        text: 'Use the IDs above to reconsider or release specific experiences'
      });
    });
  });

  describe('result formatting', () => {
    it('should format results with metadata', async () => {
      const mockResult = {
        id: 'exp_123',
        content: 'Test content',
        snippet: 'Test snippet',
        metadata: {
          created: '2025-01-21T12:00:00Z',
          experiencer: 'Alice',
          perspective: 'I',
          processing: 'during',
          experience: ['mood.open']
        },
        relevance_score: 0.9
      };

      mockRecallService.search.mockResolvedValue({
        results: [mockResult],
        totalResults: 1,
        hasMore: false
      });

      await handler.handle({
        query: 'test'
      });

      expect(mockFormatRecallResponse).toHaveBeenCalledWith(
        [{
          id: 'exp_123',
          content: 'Test content',
          snippet: 'Test snippet',
          metadata: {
            created: '2025-01-21T12:00:00Z',
            experiencer: 'Alice',
            perspective: 'I',
            processing: 'during',
            experience: ['mood.open']
          },
          relevance_score: 0.9
        }],
        true // Always show IDs
      );
    });

    it('should handle missing metadata', async () => {
      const mockResult = {
        id: 'exp_123',
        content: 'Test content',
        snippet: 'Test snippet',
        relevance_score: 0.9
      };

      mockRecallService.search.mockResolvedValue({
        results: [mockResult],
        totalResults: 1,
        hasMore: false
      });

      await handler.handle({
        query: 'test'
      });

      expect(mockFormatRecallResponse).toHaveBeenCalledWith(
        [{
          id: 'exp_123',
          content: 'Test content',
          snippet: 'Test snippet',
          metadata: undefined,
          relevance_score: 0.9
        }],
        true
      );
    });

    it('should handle missing content', async () => {
      const mockResult = {
        id: 'exp_123',
        snippet: 'Test snippet',
        metadata: {
          created: '2025-01-21T12:00:00Z'
        },
        relevance_score: 0.9
      };

      mockRecallService.search.mockResolvedValue({
        results: [mockResult],
        totalResults: 1,
        hasMore: false
      });

      await handler.handle({
        query: 'test'
      });

      expect(mockFormatRecallResponse).toHaveBeenCalledWith(
        [{
          id: 'exp_123',
          content: '', // Default empty string
          snippet: 'Test snippet',
          metadata: {
            created: '2025-01-21T12:00:00Z',
            perspective: undefined,
            experiencer: undefined,
            processing: undefined,
            experience: undefined
          },
          relevance_score: 0.9
        }],
        true
      );
    });

    it('should use current date for missing created timestamp', async () => {
      const mockDate = new Date('2025-01-21T15:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

      const mockResult = {
        id: 'exp_123',
        content: 'Test',
        snippet: 'Test',
        metadata: {
          // Missing created field
          experiencer: 'Alice'
        },
        relevance_score: 0.9
      };

      mockRecallService.search.mockResolvedValue({
        results: [mockResult],
        totalResults: 1,
        hasMore: false
      });

      await handler.handle({
        query: 'test'
      });

      expect(mockFormatRecallResponse).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            metadata: expect.objectContaining({
              created: '2025-01-21T15:00:00.000Z'
            })
          })
        ]),
        true
      );
    });
  });

  describe('timeout handling', () => {
    it('should apply timeout to search operation', async () => {
      const mockPromise = Promise.resolve({
        results: [],
        totalResults: 0,
        hasMore: false
      });

      mockRecallService.search.mockReturnValue(mockPromise);

      await handler.handle({
        query: 'test'
      });

      expect(mockWithTimeout).toHaveBeenCalledWith(
        mockPromise,
        timeout.DEFAULT_TIMEOUTS.SEARCH,
        'Recall operation'
      );
    });
  });
});