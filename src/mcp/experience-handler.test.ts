/**
 * Tests for Experience Handler
 */

import { ExperienceHandler } from './experience-handler.js';
import { ExperienceService } from '../services/experience.js';
import { RecallService } from '../services/search.js';
import * as formatters from '../utils/formatters.js';
import * as messages from '../utils/messages.js';
import * as storage from '../core/storage.js';
// Importing for mock, but not used directly in tests

// Mock dependencies
jest.mock('../services/experience.js');
jest.mock('../services/search.js');
jest.mock('../utils/formatters.js');
jest.mock('../utils/messages.js');
jest.mock('../core/storage.js');
jest.mock('../core/config.js', () => ({
  SEMANTIC_CONFIG: {
    SIMILARITY_DETECTION_THRESHOLD: 0.35,
  },
}));

// Mock call-counter module
let mockCallCount = 0;
jest.mock('./call-counter.js', () => ({
  incrementCallCount: jest.fn(() => ++mockCallCount),
  getCallCount: jest.fn(() => mockCallCount),
  resetCallCount: jest.fn(() => {
    mockCallCount = 0;
  }),
}));

// Mock the ToolResultSchema to avoid validation issues in tests
jest.mock('./schemas.js', () => ({
  ...jest.requireActual('./schemas.js'),
  ToolResultSchema: {
    parse: jest.fn((value) => value),
  },
}));

describe('ExperienceHandler', () => {
  let handler: ExperienceHandler;
  let mockExperienceService: jest.Mocked<ExperienceService>;
  let mockRecallService: jest.Mocked<RecallService>;
  let mockFormatExperienceResponse: jest.MockedFunction<typeof formatters.formatExperienceResponse>;
  let mockFormatBatchExperienceResponse: jest.MockedFunction<
    typeof formatters.formatBatchExperienceResponse
  >;
  let mockFormatMessage: jest.MockedFunction<typeof messages.formatMessage>;
  let mockGetAllRecords: jest.MockedFunction<typeof storage.getAllRecords>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create handler instance
    handler = new ExperienceHandler();

    // Get mocked instances
    mockExperienceService = (ExperienceService as jest.MockedClass<typeof ExperienceService>).mock
      .instances[0] as jest.Mocked<ExperienceService>;
    mockRecallService = (RecallService as jest.MockedClass<typeof RecallService>).mock
      .instances[0] as jest.Mocked<RecallService>;

    // Setup formatter mocks
    mockFormatExperienceResponse = formatters.formatExperienceResponse as jest.MockedFunction<
      typeof formatters.formatExperienceResponse
    >;
    mockFormatBatchExperienceResponse =
      formatters.formatBatchExperienceResponse as jest.MockedFunction<
        typeof formatters.formatBatchExperienceResponse
      >;
    mockFormatExperienceResponse.mockReturnValue('Experienced: test');
    mockFormatBatchExperienceResponse.mockReturnValue('Batch experienced');

    // Setup message mocks
    mockFormatMessage = messages.formatMessage as jest.MockedFunction<
      typeof messages.formatMessage
    >;
    mockFormatMessage.mockReturnValue('Similar experience found');
    (messages.Messages as Record<string, unknown>) = {
      experience: {
        similar: 'Similar: {content}',
      },
    };

    // Setup storage mocks
    mockGetAllRecords = storage.getAllRecords as jest.MockedFunction<typeof storage.getAllRecords>;
    mockGetAllRecords.mockResolvedValue([]);
  });

  describe('handle', () => {
    it('should handle single experience successfully', async () => {
      // Make sure we have multiple records so we don't get first experience guidance
      mockGetAllRecords.mockResolvedValue([
        { id: 'exp_1', source: 'Test 1', created: '2025-01-21T12:00:00Z' },
        { id: 'exp_2', source: 'Test 2', created: '2025-01-21T12:00:00Z' },
        { id: 'exp_3', source: 'Test 3', created: '2025-01-21T12:00:00Z' },
      ]);

      const mockResult = {
        source: {
          id: 'exp_123',
          source: 'I feel happy',
          emoji: '😊',
          created: '2025-01-21T12:00:00Z',
          who: 'Human',
          perspective: 'I',
          processing: 'during' as const,
          experience: ['mood.open'],
        },
        defaultsUsed: [],
      };

      mockExperienceService.rememberExperience.mockResolvedValue(mockResult);
      mockRecallService.search.mockResolvedValue({
        results: [],
        clusters: undefined,
        stats: undefined,
      });

      const result = await handler.handle({
        experiences: [
          {
            source: 'I feel happy',
            emoji: '😊',
            who: 'Human',
            perspective: 'I',
            processing: 'during',
            experience: ['mood.open'],
          },
        ],
      });

      expect(result.content).toHaveLength(2);
      expect(result.content[0]).toEqual({
        type: 'text',
        text: 'Experienced: test',
      });
      expect(result.content[1]).toEqual({
        type: 'text',
        text: 'Captured as mood.open',
      });

      expect(mockExperienceService.rememberExperience).toHaveBeenCalledWith({
        source: 'I feel happy',
        emoji: '😊',
        who: 'Human',
        perspective: 'I',
        processing: 'during',
        crafted: undefined,
        experience: ['mood.open'],
        reflects: undefined,
        context: undefined,
      });
    });

    it('should handle batch experiences', async () => {
      const mockResults = [
        {
          source: {
            id: 'exp_1',
            source: 'Experience 1',
            emoji: '✨',
            created: '2025-01-21T12:00:00Z',
            experience: ['mood.open'],
          },
          defaultsUsed: [],
        },
        {
          source: {
            id: 'exp_2',
            source: 'Experience 2',
            emoji: '😔',
            created: '2025-01-21T12:01:00Z',
            experience: ['mood.closed'],
          },
          defaultsUsed: [],
        },
      ];

      mockExperienceService.rememberExperience
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1]);

      const result = await handler.handle({
        experiences: [
          { source: 'Experience 1', emoji: '✨', experience: ['mood.open'] },
          { source: 'Experience 2', emoji: '😔', experience: ['mood.closed'] },
        ],
      });

      // Check content
      expect(result.content).toEqual([
        {
          type: 'text',
          text: 'Batch experienced',
        },
      ]);
      // No flow state anymore

      expect(mockExperienceService.rememberExperience).toHaveBeenCalledTimes(2);
      expect(mockFormatBatchExperienceResponse).toHaveBeenCalledWith(mockResults);
    });

    it('should return error when source is missing', async () => {
      const result = await handler.handle({});

      expect(result).toEqual({
        isError: true,
        content: [
          {
            type: 'text',
            text: 'Experiences array is required',
          },
        ],
      });

      expect(mockExperienceService.rememberExperience).not.toHaveBeenCalled();
    });

    it('should return error when batch experience item is missing source', async () => {
      const result = await handler.handle({
        experiences: [
          { source: 'Valid experience', emoji: '✨', experience: [] },
          { source: '', emoji: '😔', experience: ['mood.open'] }, // Empty source
        ],
      });

      expect(result).toEqual({
        isError: true,
        content: [
          {
            type: 'text',
            text: 'Each experience item must have source content',
          },
        ],
      });
    });

    it('should handle service errors gracefully', async () => {
      mockExperienceService.rememberExperience.mockRejectedValue(new Error('Service error'));

      const result = await handler.handle({
        experiences: [{ source: 'Test experience', emoji: '🤔' }],
      });

      expect(result).toEqual({
        isError: true,
        content: [
          {
            type: 'text',
            text: 'Service error',
          },
        ],
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
          emoji: '🤔',
          created: '2025-01-21T12:00:00Z',
          experience: [],
        },
        defaultsUsed: [],
      };
      mockExperienceService.rememberExperience.mockResolvedValue(mockResult);

      const result = await handler.handle({
        experiences: [{ source: 'Test experience', emoji: '🤔' }],
      });

      expect(result).toEqual({
        isError: true,
        content: [
          {
            type: 'text',
            text: 'Internal error: Output validation failed.',
          },
        ],
      });
    });
  });

  describe('similar experience detection', () => {
    it('should find and include similar experiences', async () => {
      const mockResult = {
        source: {
          id: 'exp_123',
          source: 'I feel anxious',
          emoji: '😟',
          created: '2025-01-21T12:00:00Z',
          experience: ['mood.closed'],
        },
        defaultsUsed: [],
      };

      const similarResult = {
        id: 'exp_456',
        type: 'experience',
        content: 'I was feeling anxious about the presentation',
        snippet: 'I was feeling anxious about the presentation',
        relevance_score: 0.8,
      };

      mockExperienceService.rememberExperience.mockResolvedValue(mockResult);
      mockRecallService.search.mockResolvedValue({
        results: [similarResult],
        clusters: undefined,
        stats: undefined,
      });

      const result = await handler.handle({
        experiences: [{ source: 'I feel anxious', emoji: '😟' }],
      });

      expect(result.content[0].text).toContain('Experienced: test');
      expect(result.content[0].text).toContain('Similar experiences found:');
    });

    it('should handle long similar experience content', async () => {
      const longContent =
        'This is a very long experience content that should be truncated when displayed in the response. It contains many words and details that would make the response too long if not properly handled. The system should truncate this content appropriately while still providing useful information about the similar experience.';

      const mockResult = {
        source: {
          id: 'exp_123',
          source: 'I feel happy',
          emoji: '😊',
          created: '2025-01-21T12:00:00Z',
          experience: ['mood.open'],
        },
        defaultsUsed: [],
      };

      const similarResults = [
        {
          id: 'exp_456',
          type: 'experience',
          content: longContent,
          snippet: longContent,
          relevance_score: 0.9,
        },
        {
          id: 'exp_789',
          type: 'experience',
          content: 'Another similar experience',
          snippet: 'Another similar experience',
          relevance_score: 0.8,
        },
      ];

      mockExperienceService.rememberExperience.mockResolvedValue(mockResult);
      mockRecallService.search.mockResolvedValue({
        results: similarResults,
        clusters: undefined,
        stats: undefined,
      });

      const result = await handler.handle({
        experiences: [{ source: 'I feel happy', emoji: '😊' }],
      });

      expect(result.content[0].text).toContain('Experienced: test');
      expect(result.content[0].text).toContain('Similar experiences found:');
    });

    it('should not include similar experiences when none found', async () => {
      const mockResult = {
        source: {
          id: 'exp_123',
          source: 'Unique experience',
          emoji: '✨',
          created: '2025-01-21T12:00:00Z',
          experience: ['mood.open'],
        },
        defaultsUsed: [],
      };

      mockExperienceService.rememberExperience.mockResolvedValue(mockResult);
      mockRecallService.search.mockResolvedValue({
        results: [],
        clusters: undefined,
        stats: undefined,
      });

      const result = await handler.handle({
        experiences: [{ source: 'Unique experience', emoji: '✨' }],
      });

      expect(result.content[0].text).toContain('Experienced: test');
      expect(result.content[0].text).not.toContain('Similar experience found');
    });
  });

  describe('guidance selection', () => {
    it('should provide guidance for first experience', async () => {
      mockGetAllRecords.mockResolvedValue([
        { id: 'exp_1', source: 'Test', created: '2025-01-21T12:00:00Z' },
      ]); // Only one record (the one we just created)

      const mockResult = {
        source: {
          id: 'exp_123',
          source: 'My first experience',
          emoji: '🌟',
          created: '2025-01-21T12:00:00Z',
        },
        defaultsUsed: [],
      };

      mockExperienceService.rememberExperience.mockResolvedValue(mockResult);
      mockRecallService.search.mockResolvedValue({
        results: [],
      });

      const result = await handler.handle({
        experiences: [{ source: 'My first experience', emoji: '🌟' }],
      });

      expect(result.content).toHaveLength(2);
      expect(result.content[1]).toEqual({
        type: 'text',
        text: "Capturing meaningful moments. Share what's on your mind.",
      });
    });

    it('should provide guidance for multiple similar experiences', async () => {
      mockGetAllRecords.mockResolvedValue([
        { id: 'exp_1', source: 'Test 1', created: '2025-01-21T12:00:00Z' },
        { id: 'exp_2', source: 'Test 2', created: '2025-01-21T12:00:00Z' },
        { id: 'exp_3', source: 'Test 3', created: '2025-01-21T12:00:00Z' },
        { id: 'exp_4', source: 'Test 4', created: '2025-01-21T12:00:00Z' },
      ]); // Multiple records

      const mockResult = {
        source: {
          id: 'exp_123',
          source: 'Another anxious moment',
          emoji: '😟',
          created: '2025-01-21T12:00:00Z',
        },
        defaultsUsed: [],
      };

      mockExperienceService.rememberExperience.mockResolvedValue(mockResult);

      // First search for similar experience detection
      mockRecallService.search.mockResolvedValueOnce({
        results: [
          {
            id: 'exp_456',
            type: 'experience',
            content: 'Anxious',
            snippet: 'Anxious',
            relevance_score: 0.7,
          },
        ],
      });

      // Second search for guidance selection - filter out the current ID
      mockRecallService.search.mockResolvedValueOnce({
        results: [
          { id: 'exp_456', type: 'experience', snippet: 'Anxious', relevance_score: 0.7 },
          { id: 'exp_789', type: 'experience', snippet: 'Anxious', relevance_score: 0.6 },
          { id: 'exp_012', type: 'experience', snippet: 'Anxious', relevance_score: 0.5 },
          { id: 'exp_345', type: 'experience', snippet: 'Anxious', relevance_score: 0.3 }, // Below threshold
        ],
      });

      const result = await handler.handle({
        experiences: [{ source: 'Another anxious moment', emoji: '😟' }],
      });

      // Should contain the experience result
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Experienced:');
      // May also contain similar experiences if recall is integrated
      const contentText = result.content.map((c) => c.text).join(' ');
      expect(contentText).toMatch(/similar|Connects|match/i);
    });

    it('should provide guidance for emotional qualities', async () => {
      mockGetAllRecords.mockResolvedValue([
        { id: 'exp_1', source: 'Test 1', created: '2025-01-21T12:00:00Z' },
        { id: 'exp_2', source: 'Test 2', created: '2025-01-21T12:00:00Z' },
      ]);

      const mockResult = {
        source: {
          id: 'exp_123',
          source: 'Feeling contemplative',
          emoji: '🤔',
          created: '2025-01-21T12:00:00Z',
          experience: ['mood.open', 'embodied.thinking'],
        },
        defaultsUsed: [],
      };

      mockExperienceService.rememberExperience.mockResolvedValue(mockResult);
      mockRecallService.search.mockResolvedValue({
        results: [],
      });

      const result = await handler.handle({
        experiences: [
          {
            source: 'Feeling contemplative',
            emoji: '🤔',
            experience: ['mood.open', 'embodied.thinking'],
          },
        ],
      });

      expect(result.content).toContainEqual({
        type: 'text',
        text: 'Captured as mood.open',
      });
    });

    it('should provide no guidance for routine captures', async () => {
      mockGetAllRecords.mockResolvedValue([
        { id: 'exp_1', source: 'Test 1', created: '2025-01-21T12:00:00Z' },
        { id: 'exp_2', source: 'Test 2', created: '2025-01-21T12:00:00Z' },
        { id: 'exp_3', source: 'Test 3', created: '2025-01-21T12:00:00Z' },
      ]);

      const mockResult = {
        source: {
          id: 'exp_123',
          source: 'Regular update',
          emoji: '📋',
          created: '2025-01-21T12:00:00Z',
          experience: ['purpose.goal'],
        },
        defaultsUsed: [],
      };

      mockExperienceService.rememberExperience.mockResolvedValue(mockResult);
      mockRecallService.search.mockResolvedValue({
        results: [],
      });

      const result = await handler.handle({
        experiences: [
          {
            source: 'Regular update',
            emoji: '📋',
            experience: ['purpose.goal'],
          },
        ],
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
          created: '2025-01-21T12:00:00Z',
        },
        defaultsUsed: [],
      };

      mockExperienceService.rememberExperience.mockResolvedValue(mockResult);
      mockRecallService.search.mockResolvedValue({
        results: [],
      });

      const result = await handler.handle({
        experiences: [{ source: 'Test', emoji: '🧑‍💻' }],
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
          created: '2025-01-21T12:00:00Z',
        },
        defaultsUsed: [],
      };

      mockExperienceService.rememberExperience.mockResolvedValue(mockResult);
      mockRecallService.search.mockResolvedValue({
        results: [],
      });

      await handler.handle({
        experiences: [
          {
            source: 'Test',
            emoji: '📝',
            experience: [],
          },
        ],
      });

      expect(mockExperienceService.rememberExperience).toHaveBeenCalledWith({
        source: 'Test',
        emoji: '📝',
        perspective: undefined,
        who: undefined,
        processing: undefined,
        crafted: undefined,
        experience: [],
        reflects: undefined,
        context: undefined,
      });
    });

    it('should handle non-Error thrown values', async () => {
      mockExperienceService.rememberExperience.mockRejectedValue('String error');

      const result = await handler.handle({
        experiences: [{ source: 'Test', emoji: '🧑‍💻' }],
      });

      expect(result).toEqual({
        isError: true,
        content: [
          {
            type: 'text',
            text: 'Unknown error',
          },
        ],
      });
    });

    it('should handle crafted flag', async () => {
      const mockResult = {
        source: {
          id: 'exp_123',
          source: 'Crafted content',
          created: '2025-01-21T12:00:00Z',
          crafted: true,
        },
        defaultsUsed: [],
      };

      mockExperienceService.rememberExperience.mockResolvedValue(mockResult);
      mockRecallService.search.mockResolvedValue({
        results: [],
      });

      await handler.handle({
        experiences: [
          {
            source: 'Crafted content',
            emoji: '📢',
            crafted: true,
          },
        ],
      });

      expect(mockExperienceService.rememberExperience).toHaveBeenCalledWith(
        expect.objectContaining({
          emoji: '📢',
          crafted: true,
        })
      );
    });

    it('should handle all optional fields', async () => {
      const fullInput = {
        source: 'Full experience',
        emoji: '🎉',
        who: 'Test User',
        perspective: 'we',
        processing: 'long-after' as const,
        crafted: false,
        experience: ['mood.open', 'presence.collective'],
      };

      const mockResult = {
        source: {
          id: 'exp_123',
          ...fullInput,
          created: '2025-01-21T12:00:00Z',
        },
        defaultsUsed: [],
      };

      mockExperienceService.rememberExperience.mockResolvedValue(mockResult);
      mockRecallService.search.mockResolvedValue({
        results: [],
      });

      await handler.handle({
        experiences: [fullInput],
      });

      expect(mockExperienceService.rememberExperience).toHaveBeenCalledWith({
        source: 'Full experience',
        emoji: '🎉',
        who: 'Test User',
        perspective: 'we',
        processing: 'long-after',
        crafted: false,
        experience: ['mood.open', 'presence.collective'],
        reflects: undefined,
        context: undefined,
      });
    });
  });

  describe('Quality Detection Validation', () => {
    /**
     * PHILOSOPHICAL FOUNDATION: Quality Detection Tests
     *
     * These tests validate Bridge's core philosophical approach to experiential capture:
     *
     * 1. **Experiential Wholeness**: Each moment naturally presents certain dimensions
     *    more prominently while others recede. We capture whichever aspects are most
     *    alive in that particular moment (Philosophy.md - Essential Properties #2).
     *
     * 2. **Sparseness as Information**: We only note dimensions that genuinely stand out.
     *    A focused coding session might only feature `embodied.thinking` and `focus.narrow`.
     *    This sparseness itself is information (Vision.md - Quality Dimensions).
     *
     * 3. **Type vs Subtype Logic**:
     *    - **Types** (e.g., 'embodied') are used when quality is present but doesn't fit
     *      into a specific subtype - capturing the general presence without forcing specificity
     *    - **Subtypes** (e.g., 'embodied.thinking') are used when the quality is obvious
     *      and specific - honoring the phenomenological precision of the moment
     *
     * 4. **Edge Case Philosophy**: Following the "Accepting Diverse Sources" principle
     *    (Philosophy.md), the system must handle moments from multiple contexts without
     *    enforcing methodological purity, trusting patterns to emerge across diverse sources.
     */

    // Test data for comprehensive quality detection
    const qualityTestCases = [
      // Single quality types (when mixed or quality present but doesn't fit subtype)
      {
        name: 'single embodied type',
        source: 'I feel my body',
        experience: ['embodied'],
        expected: 'embodied type detected',
        /**
         * PHILOSOPHICAL RATIONALE: Type Usage
         *
         * When someone says "I feel my body," they're experiencing embodied presence
         * but not necessarily thinking or sensing specifically. This captures the
         * general embodied quality without forcing it into a subtype that doesn't fit.
         *
         * This honors the phenomenological principle that experience emerges as an
         * indivisible whole - the body is present, but we don't artificially
         * categorize it further.
         */
      },
      {
        name: 'single focus type',
        source: 'My attention is scattered',
        experience: ['focus'],
        expected: 'focus type detected',
        /**
         * PHILOSOPHICAL RATIONALE: General Attention Quality
         *
         * "Scattered attention" doesn't fit neatly into narrow or broad - it's
         * a general quality of attention that's present but not specifically
         * concentrated or multi-aware. This preserves the authentic voice of
         * the experience without forcing categorization.
         */
      },
      {
        name: 'single mood type',
        source: 'I have feelings about this',
        experience: ['mood'],
        expected: 'mood type detected',
        /**
         * PHILOSOPHICAL RATIONALE: Emotional Atmosphere
         *
         * "I have feelings" captures the emotional coloring of experience
         * (Heidegger's Stimmung/attunement) without specifying whether they're
         * open or closed. This honors the mood's presence while respecting
         * its complexity.
         */
      },
      {
        name: 'single purpose type',
        source: 'I have intentions',
        experience: ['purpose'],
        expected: 'purpose type detected',
        /**
         * PHILOSOPHICAL RATIONALE: Directional Quality
         *
         * Having intentions doesn't necessarily mean working toward a goal
         * or wandering aimlessly - it's a general purposive momentum that
         * may not fit the binary of goal/wander.
         */
      },
      {
        name: 'single space type',
        source: 'I am somewhere',
        experience: ['space'],
        expected: 'space type detected',
        /**
         * PHILOSOPHICAL RATIONALE: Spatial Situation
         *
         * "I am somewhere" captures the lived sense of place without
         * specifying here/there. This preserves the spatial dimension
         * while respecting its ambiguity.
         */
      },
      {
        name: 'single time type',
        source: 'Time is passing',
        experience: ['time'],
        expected: 'time type detected',
        /**
         * PHILOSOPHICAL RATIONALE: Temporal Flow
         *
         * "Time is passing" captures temporal awareness without being
         * specifically past or future oriented. This honors the
         * present-moment awareness of time's flow.
         */
      },
      {
        name: 'single presence type',
        source: 'I am present',
        experience: ['presence'],
        expected: 'presence type detected',
        /**
         * PHILOSOPHICAL RATIONALE: Intersubjective Field
         *
         * "I am present" captures the social dimension without specifying
         * individual or collective. This preserves the awareness of
         * presence while respecting its complexity.
         */
      },

      // Specific subtypes (when obvious)
      {
        name: 'embodied thinking subtype',
        source: 'I am thinking deeply about this problem',
        experience: ['embodied.thinking'],
        expected: 'embodied.thinking subtype detected',
        /**
         * PHILOSOPHICAL RATIONALE: Specific Embodied Cognition
         *
         * "Thinking deeply" clearly indicates mental processing, analysis,
         * and strategy - the specific subtype of embodied.thinking. This
         * honors the phenomenological precision of the moment.
         *
         * Following Merleau-Ponty's embodied consciousness: the body
         * experiencing and what's experienced arise together in this
         * specific mode of thinking.
         */
      },
      {
        name: 'embodied sensing subtype',
        source: 'I feel the tension in my shoulders',
        experience: ['embodied.sensing'],
        expected: 'embodied.sensing subtype detected',
        /**
         * PHILOSOPHICAL RATIONALE: Body Awareness
         *
         * "Feeling tension in shoulders" is clearly body awareness,
         * emotions, gut feelings - the specific subtype of embodied.sensing.
         * This captures the somatic dimension of experience.
         */
      },
      {
        name: 'focus narrow subtype',
        source: 'I am laser focused on this task',
        experience: ['focus.narrow'],
        expected: 'focus.narrow subtype detected',
        /**
         * PHILOSOPHICAL RATIONALE: Concentrated Attention
         *
         * "Laser focused" clearly indicates concentrated, single-task,
         * tunnel vision attention. This captures the specific quality
         * of narrow focus that genuinely stands out in this moment.
         */
      },
      {
        name: 'focus broad subtype',
        source: 'My attention is spread across many things',
        experience: ['focus.broad'],
        expected: 'focus.broad subtype detected',
        /**
         * PHILOSOPHICAL RATIONALE: Multi-Aware Attention
         *
         * "Spread across many things" clearly indicates multi-aware,
         * juggling attention. This captures the specific quality of
         * broad focus that genuinely stands out.
         */
      },
      {
        name: 'mood open subtype',
        source: 'I feel open and receptive',
        experience: ['mood.open'],
        expected: 'mood.open subtype detected',
        /**
         * PHILOSOPHICAL RATIONALE: Expansive Emotional Atmosphere
         *
         * "Open and receptive" clearly indicates expansive, curious,
         * flowing emotional atmosphere. This captures the specific
         * mood quality that colors everything perceived.
         */
      },
      {
        name: 'mood closed subtype',
        source: 'I feel closed off and defensive',
        experience: ['mood.closed'],
        expected: 'mood.closed subtype detected',
        /**
         * PHILOSOPHICAL RATIONALE: Contracted Emotional Atmosphere
         *
         * "Closed off and defensive" clearly indicates contracted,
         * defensive, blocked emotional atmosphere. This captures the
         * specific mood quality that shapes perception.
         */
      },
      {
        name: 'purpose goal subtype',
        source: 'I am working toward a specific goal',
        experience: ['purpose.goal'],
        expected: 'purpose.goal subtype detected',
        /**
         * PHILOSOPHICAL RATIONALE: Clear Direction
         *
         * "Working toward a specific goal" clearly indicates clear
         * direction, working toward something. This captures the
         * specific purposive momentum of the moment.
         */
      },
      {
        name: 'purpose wander subtype',
        source: 'I am exploring without a specific aim',
        experience: ['purpose.wander'],
        expected: 'purpose.wander subtype detected',
        /**
         * PHILOSOPHICAL RATIONALE: Exploratory Direction
         *
         * "Exploring without a specific aim" clearly indicates
         * exploration, seeing what emerges. This captures the
         * specific purposive quality of wandering.
         */
      },
      {
        name: 'space here subtype',
        source: 'I am fully present in this moment',
        experience: ['space.here'],
        expected: 'space.here subtype detected',
        /**
         * PHILOSOPHICAL RATIONALE: Physically Grounded
         *
         * "Fully present in this moment" clearly indicates physically
         * grounded, present environment. This captures the specific
         * spatial situation of being here.
         */
      },
      {
        name: 'space there subtype',
        source: 'My mind is elsewhere',
        experience: ['space.there'],
        expected: 'space.there subtype detected',
        /**
         * PHILOSOPHICAL RATIONALE: Mentally Displaced
         *
         * "My mind is elsewhere" clearly indicates mentally elsewhere,
         * displaced. This captures the specific spatial situation
         * of being there rather than here.
         */
      },
      {
        name: 'time past subtype',
        source: 'I am thinking about what happened yesterday',
        experience: ['time.past'],
        expected: 'time.past subtype detected',
        /**
         * PHILOSOPHICAL RATIONALE: Remembering History
         *
         * "Thinking about what happened yesterday" clearly indicates
         * remembering, processing history. This captures the specific
         * temporal flow of past orientation.
         */
      },
      {
        name: 'time future subtype',
        source: 'I am planning for tomorrow',
        experience: ['time.future'],
        expected: 'time.future subtype detected',
        /**
         * PHILOSOPHICAL RATIONALE: Anticipating Future
         *
         * "Planning for tomorrow" clearly indicates planning,
         * anticipating. This captures the specific temporal flow
         * of future orientation.
         */
      },
      {
        name: 'presence individual subtype',
        source: 'I am alone with my thoughts',
        experience: ['presence.individual'],
        expected: 'presence.individual subtype detected',
        /**
         * PHILOSOPHICAL RATIONALE: Solitary Experience
         *
         * "Alone with my thoughts" clearly indicates solitary experience.
         * This captures the specific intersubjective field of
         * individual presence.
         */
      },
      {
        name: 'presence collective subtype',
        source: 'We are working together as a team',
        experience: ['presence.collective'],
        expected: 'presence.collective subtype detected',
        /**
         * PHILOSOPHICAL RATIONALE: Shared Experience
         *
         * "Working together as a team" clearly indicates shared,
         * together experience. This captures the specific
         * intersubjective field of collective presence.
         */
      },

      // Mixed types and subtypes
      {
        name: 'mixed types and subtypes',
        source: 'I am thinking deeply while feeling open and focused',
        experience: ['embodied.thinking', 'mood.open', 'focus.narrow'],
        expected: 'mixed types and subtypes detected',
        /**
         * PHILOSOPHICAL RATIONALE: Complex Experiential Wholeness
         *
         * This captures the complexity of real experience where multiple
         * dimensions are simultaneously prominent. The moment contains
         * specific subtypes (thinking, open, narrow) that genuinely
         * stand out together.
         *
         * This honors the phenomenological insight that experience
         * emerges as an indivisible whole with multiple dimensions
         * mutually constituting each other.
         */
      },
      {
        name: 'type with subtype',
        source: 'I am embodied and thinking specifically',
        experience: ['embodied', 'embodied.thinking'],
        expected: 'type with subtype detected',
        /**
         * PHILOSOPHICAL RATIONALE: General + Specific Awareness
         *
         * This captures both the general embodied presence AND the
         * specific thinking mode. This honors the layered nature of
         * experience where we can be aware of both the general
         * dimension and its specific manifestation.
         */
      },

      // Edge cases
      {
        name: 'no qualities provided',
        source: 'Just a plain experience',
        experience: [],
        expected: 'no qualities handled gracefully',
        /**
         * PHILOSOPHICAL RATIONALE: Accepting Diverse Sources
         *
         * Following the "Accepting Diverse Sources" principle (Philosophy.md),
         * the system must handle moments that don't fit our quality framework.
         * Not every experience needs to be categorized - some moments are
         * simply what they are without prominent qualities.
         *
         * This honors the pragmatic paradox: while we acknowledge that
         * experience has structure, we don't force categorization when
         * it doesn't serve the moment.
         */
      },
      {
        name: 'undefined qualities',
        source: 'Experience without qualities',
        experience: undefined,
        expected: 'undefined qualities handled gracefully',
        /**
         * PHILOSOPHICAL RATIONALE: Framework Flexibility
         *
         * The framework must handle moments from multiple sources and contexts
         * without enforcing methodological purity. Some experiences may not
         * have qualities specified, and the system should accept this gracefully.
         *
         * This follows the principle of trusting patterns to emerge across
         * diverse sources rather than requiring uniform categorization.
         */
      },
      {
        name: 'all qualities present',
        source: 'Complete experiential moment with all dimensions',
        experience: [
          'embodied.thinking',
          'embodied.sensing',
          'focus.narrow',
          'focus.broad',
          'mood.open',
          'mood.closed',
          'purpose.goal',
          'purpose.wander',
          'space.here',
          'space.there',
          'time.past',
          'time.future',
          'presence.individual',
          'presence.collective',
        ],
        expected: 'all qualities captured',
        /**
         * PHILOSOPHICAL RATIONALE: Complete Experiential Field
         *
         * While rare, some moments may genuinely present all dimensions
         * prominently. This could represent moments of intense complexity,
         * contradiction, or heightened awareness where multiple aspects
         * of experience are simultaneously alive.
         *
         * This honors the theoretical foundation that the various dimensions
         * of consciousness form one unified experiential field that mutually
         * constitute each other, and that sometimes this wholeness becomes
         * explicitly apparent.
         */
      },
      {
        name: 'duplicate qualities',
        source: 'Experience with duplicate qualities',
        experience: ['mood.open', 'mood.open', 'embodied.thinking'],
        expected: 'duplicate qualities handled',
        /**
         * PHILOSOPHICAL RATIONALE: Input Diversity Tolerance
         *
         * Following the "Input Diversity" principle (Philosophy.md), the
         * system must handle moments from various sources including
         * stream-of-consciousness journals, voice recordings, and other
         * contexts where duplicates might occur.
         *
         * The system should gracefully handle such input without rejecting
         * the experience, trusting that the processing layer can handle
         * duplicates appropriately.
         */
      },
      {
        name: 'empty string qualities',
        source: 'Experience with empty quality strings',
        experience: ['', 'mood.open', ''],
        expected: 'empty string qualities filtered',
        /**
         * PHILOSOPHICAL RATIONALE: Robust Input Handling
         *
         * The framework must handle moments from diverse sources including
         * text messages, creative writing, and other contexts where
         * malformed input might occur. The system should filter out
         * empty strings while preserving valid qualities.
         *
         * This honors the principle of accepting diverse sources while
         * maintaining the integrity of the quality framework.
         */
      },
      {
        name: 'whitespace only qualities',
        source: 'Experience with whitespace only qualities',
        experience: ['   ', 'mood.open', '\t\n'],
        expected: 'whitespace only qualities filtered',
        /**
         * PHILOSOPHICAL RATIONALE: Input Sanitization
         *
         * Similar to empty strings, whitespace-only qualities represent
         * malformed input that should be filtered while preserving
         * valid qualities. This ensures the system can handle
         * various input formats gracefully.
         */
      },
    ];

    beforeEach(() => {
      // Setup storage to have multiple records to avoid first experience guidance
      mockGetAllRecords.mockResolvedValue([
        { id: 'exp_1', source: 'Test 1', created: '2025-01-21T12:00:00Z' },
        { id: 'exp_2', source: 'Test 2', created: '2025-01-21T12:00:00Z' },
        { id: 'exp_3', source: 'Test 3', created: '2025-01-21T12:00:00Z' },
      ]);
      mockRecallService.search.mockResolvedValue({
        results: [],
        clusters: undefined,
        stats: undefined,
      });
    });

    qualityTestCases.forEach(({ name, source, experience, expected }) => {
      it(`should handle ${name}`, async () => {
        const mockResult = {
          source: {
            id: 'exp_123',
            source,
            emoji: '🤔',
            created: '2025-01-21T12:00:00Z',
            who: 'Human',
            perspective: 'I',
            processing: 'during' as const,
            experience: experience || [],
          },
          defaultsUsed: [],
        };

        mockExperienceService.rememberExperience.mockResolvedValue(mockResult);

        const result = await handler.handle({
          experiences: [
            {
              source,
              emoji: '🤔',
              who: 'Human',
              perspective: 'I',
              processing: 'during',
              experience,
            },
          ],
        });

        // Verify the service was called with correct experience data
        expect(mockExperienceService.rememberExperience).toHaveBeenCalledWith(
          expect.objectContaining({
            source,
            emoji: '🤔',
            experience: experience,
          })
        );

        // Verify the result contains the expected experience data
        expect(result).toBeDefined();
        expect(result.isError).toBeFalsy();

        // Verify formatter was called with correct data
        expect(mockFormatExperienceResponse).toHaveBeenCalledWith(
          expect.objectContaining({
            source: expect.objectContaining({
              experience: experience || [],
            }),
          })
        );
      });
    });

    describe('Quality Validation Edge Cases', () => {
      it('should handle experiences with no qualities gracefully', async () => {
        /**
         * PHILOSOPHICAL RATIONALE: Experiential Diversity
         *
         * Not every experience needs prominent qualities to be meaningful.
         * Some moments are simply what they are - plain, unadorned
         * experiences that don't fit our quality framework.
         *
         * This honors the principle that the framework should enhance
         * rather than drive conversation, and that meaningful activation
         * occurs for significant moments, not mechanically for every moment.
         */
        const mockResult = {
          source: {
            id: 'exp_123',
            source: 'Plain experience',
            emoji: '📝',
            created: '2025-01-21T12:00:00Z',
            who: 'Human',
            perspective: 'I',
            processing: 'during' as const,
            experience: [],
          },
          defaultsUsed: [],
        };

        mockExperienceService.rememberExperience.mockResolvedValue(mockResult);

        const result = await handler.handle({
          experiences: [
            {
              source: 'Plain experience',
              emoji: '📝',
              who: 'Human',
              perspective: 'I',
              processing: 'during',
              // No experience field
            },
          ],
        });

        expect(mockExperienceService.rememberExperience).toHaveBeenCalledWith(
          expect.objectContaining({
            source: 'Plain experience',
            experience: undefined,
          })
        );

        expect(result).toBeDefined();
        expect(result.isError).toBeFalsy();
      });

      it('should handle experiences with all qualities present', async () => {
        /**
         * PHILOSOPHICAL RATIONALE: Complete Experiential Field
         *
         * While rare, some moments may genuinely present all dimensions
         * prominently. This could represent moments of intense complexity,
         * contradiction, or heightened awareness where multiple aspects
         * of experience are simultaneously alive.
         *
         * This honors the theoretical foundation that the various dimensions
         * of consciousness form one unified experiential field that mutually
         * constitute each other, and that sometimes this wholeness becomes
         * explicitly apparent.
         */
        const allQualities = [
          'embodied.thinking',
          'embodied.sensing',
          'focus.narrow',
          'focus.broad',
          'mood.open',
          'mood.closed',
          'purpose.goal',
          'purpose.wander',
          'space.here',
          'space.there',
          'time.past',
          'time.future',
          'presence.individual',
          'presence.collective',
        ];

        const mockResult = {
          source: {
            id: 'exp_123',
            source: 'Complete experiential moment',
            emoji: '🌍',
            created: '2025-01-21T12:00:00Z',
            who: 'Human',
            perspective: 'I',
            processing: 'during' as const,
            experience: allQualities,
          },
          defaultsUsed: [],
        };

        mockExperienceService.rememberExperience.mockResolvedValue(mockResult);

        const result = await handler.handle({
          experiences: [
            {
              source: 'Complete experiential moment',
              emoji: '🌍',
              who: 'Human',
              perspective: 'I',
              processing: 'during',
              experience: allQualities,
            },
          ],
        });

        expect(mockExperienceService.rememberExperience).toHaveBeenCalledWith(
          expect.objectContaining({
            source: 'Complete experiential moment',
            experience: allQualities,
          })
        );

        expect(result).toBeDefined();
        expect(result.isError).toBeFalsy();
      });

      it('should handle mixed type and subtype combinations', async () => {
        /**
         * PHILOSOPHICAL RATIONALE: Layered Experiential Awareness
         *
         * Experience can have multiple layers of awareness - we can be
         * aware of both the general dimension (e.g., embodied) and its
         * specific manifestation (e.g., embodied.thinking) simultaneously.
         *
         * This honors the phenomenological insight that consciousness
         * can operate at multiple levels of specificity, and that
         * both general and specific awareness can be genuinely present
         * in the same moment.
         */
        const mixedQualities = ['embodied', 'embodied.thinking', 'mood.open'];

        const mockResult = {
          source: {
            id: 'exp_123',
            source: 'Mixed type and subtype experience',
            emoji: '🔀',
            created: '2025-01-21T12:00:00Z',
            who: 'Human',
            perspective: 'I',
            processing: 'during' as const,
            experience: mixedQualities,
          },
          defaultsUsed: [],
        };

        mockExperienceService.rememberExperience.mockResolvedValue(mockResult);

        const result = await handler.handle({
          experiences: [
            {
              source: 'Mixed type and subtype experience',
              emoji: '🔀',
              who: 'Human',
              perspective: 'I',
              processing: 'during',
              experience: mixedQualities,
            },
          ],
        });

        expect(mockExperienceService.rememberExperience).toHaveBeenCalledWith(
          expect.objectContaining({
            source: 'Mixed type and subtype experience',
            experience: mixedQualities,
          })
        );

        expect(result).toBeDefined();
        expect(result.isError).toBeFalsy();
      });
    });

    describe('Quality Type and Subtype Logic', () => {
      it('should detect when type is used instead of subtype', async () => {
        /**
         * PHILOSOPHICAL RATIONALE: General Quality Presence
         *
         * When a quality is present but doesn't fit into a specific subtype,
         * using the type honors the phenomenological principle that we
         * should capture what's genuinely present without forcing
         * categorization that doesn't fit.
         *
         * This follows the principle of "sparseness as information" -
         * we only note dimensions that genuinely stand out, and sometimes
         * that's at the general level rather than the specific level.
         */
        const typeOnlyQualities = ['embodied', 'mood', 'focus'];

        const mockResult = {
          source: {
            id: 'exp_123',
            source: 'Type-only experience',
            emoji: '🎯',
            created: '2025-01-21T12:00:00Z',
            who: 'Human',
            perspective: 'I',
            processing: 'during' as const,
            experience: typeOnlyQualities,
          },
          defaultsUsed: [],
        };

        mockExperienceService.rememberExperience.mockResolvedValue(mockResult);

        const result = await handler.handle({
          experiences: [
            {
              source: 'Type-only experience',
              emoji: '🎯',
              who: 'Human',
              perspective: 'I',
              processing: 'during',
              experience: typeOnlyQualities,
            },
          ],
        });

        expect(mockExperienceService.rememberExperience).toHaveBeenCalledWith(
          expect.objectContaining({
            experience: typeOnlyQualities,
          })
        );

        expect(result).toBeDefined();
        expect(result.isError).toBeFalsy();
      });

      it('should detect when subtypes are used appropriately', async () => {
        /**
         * PHILOSOPHICAL RATIONALE: Phenomenological Precision
         *
         * When a quality is obvious and specific, using the subtype honors
         * the phenomenological principle of capturing the precise texture
         * of experience as it's actually lived.
         *
         * This follows the principle that the art lies in creating
         * representations that honor the flow they necessarily interrupt,
         * and that specificity serves the moment when it genuinely fits.
         */
        const subtypeQualities = ['embodied.thinking', 'mood.open', 'focus.narrow'];

        const mockResult = {
          source: {
            id: 'exp_123',
            source: 'Subtype-specific experience',
            emoji: '🎙️',
            created: '2025-01-21T12:00:00Z',
            who: 'Human',
            perspective: 'I',
            processing: 'during' as const,
            experience: subtypeQualities,
          },
          defaultsUsed: [],
        };

        mockExperienceService.rememberExperience.mockResolvedValue(mockResult);

        const result = await handler.handle({
          experiences: [
            {
              source: 'Subtype-specific experience',
              emoji: '🎙️',
              who: 'Human',
              perspective: 'I',
              processing: 'during',
              experience: subtypeQualities,
            },
          ],
        });

        expect(mockExperienceService.rememberExperience).toHaveBeenCalledWith(
          expect.objectContaining({
            experience: subtypeQualities,
          })
        );

        expect(result).toBeDefined();
        expect(result.isError).toBeFalsy();
      });
    });
  });

  describe('integrated recall', () => {
    it('should perform recall search when requested', async () => {
      const mockResult = {
        source: {
          id: 'exp_123',
          source: 'New experience with recall',
          emoji: '🔍',
          created: '2025-01-21T12:00:00Z',
        },
        defaultsUsed: [],
      };

      const mockRecallResult = {
        results: [
          {
            id: 'exp_past',
            content: 'Similar past experience',
            snippet: 'Similar past experience',
            metadata: {
              created: '2025-01-20T12:00:00Z',
              who: 'Human',
              experience: ['mood.open'],
            },
            relevance_score: 0.8,
          },
        ],
        total: 1,
      };

      mockExperienceService.rememberExperience.mockResolvedValue(mockResult);
      mockRecallService.search.mockResolvedValue(mockRecallResult);

      const result = await handler.handle({
        experiences: [{ source: 'New experience with recall', emoji: '🔍' }],
        recall: {
          search: 'similar experiences',
          limit: 5,
        },
      });

      expect(mockRecallService.search).toHaveBeenCalledWith({
        semantic_query: 'similar experiences',
        limit: 5,
      });

      expect(result.content).toHaveLength(2);
      // Check that recall results are formatted properly
      expect(result.content[1].type).toBe('text');
      expect(result.content[1].text).toContain('🔍 Related experiences:');
      expect(result.content[1].text).toContain('Similar past experience');
      expect(result.content[1].text).toContain('mood.open');
    });

    it('should handle recall with multiple filters', async () => {
      const mockResult = {
        source: {
          id: 'exp_124',
          source: 'Experience with complex recall',
          emoji: '🎯',
          created: '2025-01-21T13:00:00Z',
        },
        defaultsUsed: [],
      };

      mockExperienceService.rememberExperience.mockResolvedValue(mockResult);
      mockRecallService.search.mockResolvedValue({ results: [], total: 0 });

      await handler.handle({
        experiences: [{ source: 'Experience with complex recall', emoji: '🎯' }],
        recall: {
          search: 'test',
          who: 'Alice',
          qualities: {
            mood: 'open',
            embodied: { present: true },
          },
          perspective: 'I',
          limit: 10,
          sort: 'relevance',
        },
      });

      expect(mockRecallService.search).toHaveBeenCalledWith({
        semantic_query: 'test',
        who: 'Alice',
        qualities: {
          mood: 'open',
          embodied: { present: true },
        },
        perspective: 'I',
        limit: 10,
        sort: 'relevance',
      });
    });

    it('should handle recall with ID lookup', async () => {
      const mockResult = {
        source: {
          id: 'exp_125',
          source: 'Experience with ID recall',
          emoji: '🆔',
          created: '2025-01-21T14:00:00Z',
        },
        defaultsUsed: [],
      };

      mockExperienceService.rememberExperience.mockResolvedValue(mockResult);
      mockRecallService.search.mockResolvedValue({ results: [], total: 0 });

      await handler.handle({
        experiences: [{ source: 'Experience with ID recall', emoji: '🆔' }],
        recall: {
          ids: ['exp_001', 'exp_002'],
        },
      });

      expect(mockRecallService.search).toHaveBeenCalledWith({
        id: 'exp_001', // RecallInput only accepts single ID
        limit: 5, // default limit
      });
    });
  });
});
