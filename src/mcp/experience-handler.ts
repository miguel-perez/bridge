import { ExperienceService } from '../services/experience.js';
import { RecallService } from '../services/recall.js';
import { ToolResult, ToolResultSchema } from './schemas.js';
import type { ExperienceInput } from './schemas.js';
import {
  formatBatchExperienceResponse,
  formatExperienceResponse,
  type ExperienceResult,
} from '../utils/formatters.js';
import { Messages, formatMessage } from '../utils/messages.js';
import { SEMANTIC_CONFIG } from '../core/config.js';
import { incrementCallCount, getCallCount } from './call-counter.js';
import { getFlowStateMessage } from './flow-messages.js';

/**
 * Response structure for experience capture operations
 * @remarks
 * Used internally for structured communication between handler and formatters.
 * Includes success status, captured source data, and any defaults that were applied.
 */
export interface ExperienceResponse {
  success: boolean;
  source?: {
    id: string;
    source: string;
    created: string;
    perspective?: string;
    experiencer?: string;
    processing?: string;
    experience?: string[];
  };
  defaultsUsed?: string[];
  error?: string;
}

/**
 * Handles experience capture requests from MCP clients
 * @remarks
 * Validates input using Zod schemas, delegates to ExperienceService for processing,
 * and returns user-friendly responses. Only accepts array format for experience capture.
 * Handles errors gracefully with appropriate error messages for MCP protocol compliance.
 *
 * @example
 * ```ts
 * // Single experience capture (still uses array format)
 * const result = await experienceHandler.handle({
 *   experiences: [{
 *     source: "I feel anxious about tomorrow's presentation",
 *     experience: ["embodied.sensing", "mood.closed"]
 *   }]
 * });
 * // Returns: "Experienced (embodied.sensing, mood.closed)"
 *
 * // Batch experience capture
 * const result = await experienceHandler.handle({
 *   experiences: [
 *     { source: "Feeling focused while coding", experience: ["embodied.thinking"] },
 *     { source: "Anxiety about meeting", experience: ["mood.closed"] }
 *   ]
 * });
 * // Returns: "Experienced 2 moments..."
 * ```
 * @throws ValidationError When input validation fails
 * @throws ServiceError When underlying service operations fail
 * @see ExperienceService for core business logic
 * @see RecallService for similarity detection
 */
export class ExperienceHandler {
  private experienceService: ExperienceService;
  private recallService: RecallService;

  /**
   * Initializes the ExperienceHandler with required services
   * @remarks
   * Creates instances of ExperienceService for core business logic
   * and RecallService for similarity detection capabilities.
   */
  constructor() {
    this.experienceService = new ExperienceService();
    this.recallService = new RecallService();
  }

  /**
   * Processes experience capture requests with validation and formatting
   * @remarks
   * Main entry point for MCP experience tool. Validates input, processes the request,
   * and ensures output conforms to MCP protocol requirements. Handles both single
   * and batch experience capture modes. Now supports stillThinking parameter for flow tracking.
   * @param args - Experience input data from MCP client
   * @param stillThinking - Optional boolean indicating if more tool calls are expected
   * @returns Formatted tool result compliant with MCP protocol
   * @throws ValidationError When required fields are missing
   * @throws ServiceError When experience processing fails
   */
  async handle(args: ExperienceInput, stillThinking = false): Promise<ToolResult> {
    try {
      incrementCallCount();
      const result = await this.handleRegularExperience(args);

      // Add flow state message if stillThinking was explicitly passed
      const callsSoFar = getCallCount();
      if (args.stillThinking !== undefined) {
        const flowMessage = getFlowStateMessage(stillThinking, callsSoFar);
        result.content.push({
          type: 'text',
          text: flowMessage,
        });
      }

      // Add stillThinking and callsSoFar to the result
      const enhancedResult = {
        ...result,
        stillThinking,
        callsSoFar,
      };

      ToolResultSchema.parse(enhancedResult);
      return enhancedResult;
    } catch (err) {
      return {
        isError: true,
        content: [{ type: 'text', text: 'Internal error: Output validation failed.' }],
        stillThinking: false,
        callsSoFar: getCallCount(),
      };
    }
  }

  /**
   * Processes experience capture with natural language formatting
   * @remarks
   * Handles the core logic for experience capture using array format only.
   * Validates required fields, processes through ExperienceService, and formats
   * responses for natural conversation flow. Includes similarity detection
   * for enhanced user experience.
   * @param experience - Experience input data to process
   * @returns Formatted tool result with natural language response
   * @throws Error When source content is missing
   * @throws ServiceError When experience processing fails
   */
  private async handleRegularExperience(experience: ExperienceInput): Promise<ToolResult> {
    try {
      // Validate required fields - only accept array format
      if (!experience.experiences || experience.experiences.length === 0) {
        throw new Error('Experiences array is required');
      }

      // Validate each item in the array
      for (const item of experience.experiences) {
        if (!item.source || typeof item.source !== 'string' || item.source.trim() === '') {
          throw new Error('Each experience item must have source content');
        }
      }

      // Process experience items
      const results: ExperienceResult[] = [];
      for (const item of experience.experiences) {
        const result = await this.experienceService.rememberExperience({
          source: item.source,
          perspective: item.perspective,
          experiencer: item.experiencer,
          processing: item.processing,
          crafted: item.crafted,
          experience: item.experience || undefined,
          reflects: item.reflects,
        });
        results.push(result);
      }

      // Format response based on number of experiences
      if (results.length === 1) {
        // Single experience - use individual formatting
        const result = results[0];
        let response = formatExperienceResponse(result);

        // Find similar experience if any
        const similarText = await this.findSimilarExperience(
          result.source.source,
          result.source.id
        );
        if (similarText) {
          response += '\n\n' + similarText;
        }

        // Build multi-content response
        const content: Array<{ type: 'text'; text: string }> = [
          {
            type: 'text',
            text: response,
          },
        ];

        // Add contextual guidance based on simple triggers
        const guidance = await this.selectGuidance(result, similarText !== null);
        if (guidance) {
          content.push({
            type: 'text',
            text: guidance,
          });
        }

        return { content };
      } else {
        // Multiple experiences - use batch formatting
        const response = formatBatchExperienceResponse(results);

        return {
          content: [
            {
              type: 'text',
              text: response,
            },
          ],
        };
      }
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: error instanceof Error ? error.message : 'Unknown error',
          },
        ],
      };
    }
  }

  /**
   * Select appropriate guidance based on context
   */
  private async selectGuidance(
    result: ExperienceResult,
    hasSimilar: boolean
  ): Promise<string | null> {
    try {
      // Check if this is the first experience
      const { getAllRecords } = await import('../core/storage.js');
      const allRecords = await getAllRecords();
      const count = allRecords.length;

      if (count === 1) {
        // First experience ever
        return "Capturing meaningful moments. Share what's on your mind.";
      }

      // Check if we found similar experiences
      if (hasSimilar) {
        // Get similar count for more detailed guidance
        const similarResults = await this.recallService.search({
          semantic_query: result.source.source,
          semantic_threshold: SEMANTIC_CONFIG.SIMILARITY_DETECTION_THRESHOLD,
          limit: 10,
        });

        const similarCount = similarResults.results.filter(
          (r) => r.id !== result.source.id && r.relevance_score > 0.35
        ).length;

        if (similarCount > 2) {
          return `Connects to ${similarCount} similar moments`;
        }
      }

      // Check if qualities suggest emotional content
      const hasEmotionalQualities =
        result.source.experience?.some(
          (q) => q.includes('mood') || q.includes('embodied.sensing') || q === 'embodied'
        ) || false;

      if (hasEmotionalQualities) {
        const quality =
          result.source.experience?.find((q) => q.includes('mood')) ||
          result.source.experience?.[0] ||
          'experience';
        return `Captured as ${quality}`;
      }

      // No guidance needed for routine captures
      return null;
    } catch (error) {
      // Guidance is optional - don't let errors break the main flow
      return null;
    }
  }

  /**
   * Find a similar experience to show connection
   */
  private async findSimilarExperience(content: string, excludeId: string): Promise<string | null> {
    try {
      // Use semantic search to find similar experiences
      const { results } = await this.recallService.search({
        semantic_query: content,
        semantic_threshold: 0.35, // Lower threshold to find more matches (synthetic data has lower similarity scores)
        limit: 2, // Get 2 in case the first is the same one we just experienceed
      });

      // Filter out the experience we just experienceed and get the most similar
      const similar = results.find((r) => r.id !== excludeId);

      if (similar && similar.relevance_score > 0.35) {
        // Format the similar experience reference
        const snippet = similar.snippet || similar.content || '';
        const truncated = snippet.length > 100 ? snippet.substring(0, 100) + '...' : snippet;

        return formatMessage(Messages.experience.similar, { content: truncated });
      }

      return null;
    } catch (error) {
      // Silently fail - similarity is nice to have but not critical
      return null;
    }
  }
}
