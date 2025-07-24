/**
 * MCP Recall Tool Handler
 *
 * Implements basic Bridge Recall API for source retrieval.
 */

import { RecallService } from '../services/recall.js';
import { withTimeout, DEFAULT_TIMEOUTS } from '../utils/timeout.js';
import { SearchInput, ToolResultSchema, type ToolResult } from './schemas.js';
import { formatRecallResponse, type RecallResult } from '../utils/formatters.js';
import { SEMANTIC_CONFIG } from '../core/config.js';
import { incrementCallCount, getCallCount } from './call-counter.js';
import { getFlowStateMessages } from './flow-messages.js';

export interface RecallResponse {
  success: boolean;
  results?: Array<{
    id: string;
    type: string;
    content: string;
    snippet: string;
    metadata?: {
      created: string;
      perspective?: string;
      experiencer?: string;
      processing?: string;
      experience?: string[];
    };
    relevance_score: number;
    relevance_breakdown: Record<string, unknown>;
  }>;
  total?: number;
  error?: string;
}

/**
 * Handles recall requests from MCP clients
 * @remarks
 * Provides semantic search capabilities for retrieving stored experiences.
 * Supports text queries, quality filtering, and recent experience retrieval.
 * Only accepts array format for search queries.
 */
export class RecallHandler {
  private recallService: RecallService;

  /**
   * Initializes the RecallHandler with required services
   * @remarks
   * Creates instance of RecallService for semantic search capabilities.
   */
  constructor() {
    this.recallService = new RecallService();
  }

  /**
   * Handles recall requests
   *
   * @param args - The recall arguments containing queries and filters
   * @param stillThinking - Optional boolean indicating if more tool calls are expected
   * @returns Formatted recall results
   */
  async handle(args: SearchInput, stillThinking = false): Promise<ToolResult> {
    try {
      incrementCallCount();
      const result = await this.handleRegularRecall(args);

      // Add flow state messages if stillThinking was explicitly passed
      const callsSoFar = getCallCount();
      if (args.stillThinking !== undefined) {
        const flowMessages = getFlowStateMessages(stillThinking, callsSoFar);
        // Add each message as a separate content item to ensure a third response
        flowMessages.forEach((message) => {
          result.content.push({
            type: 'text',
            text: message,
          });
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
   * Processes recall requests with semantic search capabilities
   * @remarks
   * Handles text queries, quality filtering, and recent experience retrieval.
   * Supports both semantic and quality search modes using array format only.
   * @param recall - Search input containing query and filter parameters
   * @returns Formatted recall results with relevance scores
   */
  private async handleRegularRecall(recall: SearchInput): Promise<ToolResult> {
    try {
      // Validate required fields - only accept array format
      if (!recall.searches || recall.searches.length === 0) {
        throw new Error('Searches array is required');
      }

      // Process each search in the batch
      const allResults: Array<{
        search: (typeof recall.searches)[0];
        results: RecallResult[];
        clusters?: any[];
        stats?: any;
      }> = [];

      for (const search of recall.searches) {
        const query = search.query || '';
        const limit = search.limit || 10;

        // Special handling for "recent" queries (only for string queries)
        const isRecentQuery =
          typeof query === 'string' &&
          (query.toLowerCase() === 'recent' ||
            query.toLowerCase() === 'last' ||
            query.toLowerCase() === 'latest');

        // Import needed function for checking quality queries
        const { isQueryPurelyQuality } = await import('../services/unified-scoring.js');

        // Check if this is a pure quality query
        const isPureQuality = query && isQueryPurelyQuality(query);

        // Perform recall
        const { results, clusters, stats } = await withTimeout(
          this.recallService.search({
            query: isRecentQuery ? '' : query || undefined, // Empty query for recent to get all
            limit: isRecentQuery ? Math.min(limit, 5) : limit, // Show fewer for recent
            // Set semantic query based on query type
            semantic_query: isRecentQuery
              ? ''
              : !query
                ? undefined
                : isPureQuality && typeof query === 'string'
                  ? ''
                  : typeof query === 'string'
                    ? query
                    : Array.isArray(query)
                      ? query.join(' ')
                      : '',
            semantic_threshold: SEMANTIC_CONFIG.DEFAULT_THRESHOLD,
            // Pass through all filters from the search
            experiencer: search.experiencer,
            perspective: search.perspective,
            processing: search.processing,
            crafted: search.crafted,
            created: search.created,
            sort: isRecentQuery ? 'created' : search.sort, // Force sort by created for recent
            // Handle clustering if requested
            as: search.as,
            // Pass sophisticated quality filters
            qualities: search.qualities,
            // Pattern realization filters
            reflects: search.reflects,
            reflected_by: search.reflected_by,
          }),
          DEFAULT_TIMEOUTS.EXPERIENCE,
          'Recall operation'
        );

        // Convert results to RecallResult format for formatter
        const recallResults: RecallResult[] = results.map((result) => ({
          id: result.id,
          type: result.type,
          content: result.content,
          snippet: result.snippet,
          metadata: result.metadata
            ? {
                created:
                  typeof result.metadata.created === 'string'
                    ? result.metadata.created
                    : new Date().toISOString(),
                perspective:
                  typeof result.metadata.perspective === 'string'
                    ? result.metadata.perspective
                    : undefined,
                experiencer:
                  typeof result.metadata.experiencer === 'string'
                    ? result.metadata.experiencer
                    : undefined,
                processing:
                  typeof result.metadata.processing === 'string'
                    ? result.metadata.processing
                    : undefined,
                experience: Array.isArray(result.metadata.experience)
                  ? result.metadata.experience
                  : undefined,
              }
            : undefined,
          relevance_score: result.relevance_score,
        }));

        allResults.push({
          search,
          results: recallResults,
          clusters,
          stats,
        });
      }

      // Build multi-content response
      const content: Array<{ type: 'text'; text: string }> = [];

      // Format response based on number of searches
      if (allResults.length === 1) {
        // Single search - format as before
        const { search, results: recallResults, clusters, stats } = allResults[0];
        const query = search.query || '';

        // Handle clustering response if clusters are available
        if (clusters && clusters.length > 0) {
          const clusterResponse = this.formatClusterResponse(clusters);
          content.push({
            type: 'text',
            text: clusterResponse,
          });
        } else {
          // Calculate metadata for pagination using service response
          const total = (stats?.total as number) || recallResults.length;
          const hasMore = search.limit ? total > search.limit : false;

          // Format results using conversational formatter for regular recall with metadata
          const response = formatRecallResponse(
            recallResults,
            true,
            total,
            hasMore,
            search.limit,
            search.offset
          );
          content.push({
            type: 'text',
            text: response,
          });
        }

        // Add contextual guidance
        const guidance = this.selectRecallGuidance(
          typeof query === 'string' ? query : query.join(' '),
          recallResults
        );
        if (guidance) {
          content.push({
            type: 'text',
            text: guidance,
          });
        }
      } else {
        // Multiple searches - format as batch
        let response = `✅ Completed ${allResults.length} searches:\n\n`;

        for (let i = 0; i < allResults.length; i++) {
          const { search, results: recallResults } = allResults[i];
          const query = search.query || 'all experiences';

          response += `Search ${i + 1}: Found ${recallResults.length} results for "${query}"\n`;
        }

        content.push({
          type: 'text',
          text: response,
        });
      }

      // Include raw results in test/debug mode
      const result: ToolResult = { content };

      // Add detailed results in test/debug mode as a separate content item
      if (process.env.BRIDGE_DEBUG === 'true') {
        const detailedResults = allResults.map(({ search, results, stats }) => ({
          search,
          results: results.map((r) => ({
            id: r.id,
            content: r.content,
            relevance_score: r.relevance_score,
            metadata: r.metadata,
            // Include any additional fields that might be present
            ...(r as any),
          })),
          total: stats?.total,
        }));

        // Add as a JSON content item
        content.push({
          type: 'text',
          text: `[DEBUG] Raw results:\n${JSON.stringify(detailedResults, null, 2)}`,
        });
      }

      return result;
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: 'I encountered an error while searching for experiences. Please try again.',
          },
        ],
      };
    }
  }

  /**
   * Select appropriate guidance for recall results
   */
  private selectRecallGuidance(query: string, results: RecallResult[]): string | null {
    // No results - provide helpful guidance based on query type
    if (results.length === 0) {
      // Long queries often fail - suggest keywords
      if (query.length > 30) {
        return 'Long phrases rarely match exactly.';
      }
      // Very short queries might be too broad
      if (query.length < 3) {
        return "Try more specific terms or 'recall recent' for latest experiences";
      }
      // Default guidance with examples
      return "No matches found. Try:\n• Different qualities\n• Broader terms\n• 'recall recent' for latest";
    }

    // Single result - suggest actions
    if (results.length === 1) {
      // Check for emotional content first
      const hasEmotionalContent = results.some((r) =>
        r.metadata?.experience?.some((q) => q.includes('mood') || q.includes('embodied'))
      );

      if (hasEmotionalContent) {
        return 'Emotional experiences captured. Use IDs to modify or release.';
      }

      return "To modify: use 'reconsider' with the ID\nTo remove: use 'release' with the ID";
    }

    // Check if this is a "recall last" query
    if (query.toLowerCase().includes('last') || query.toLowerCase().includes('recent')) {
      return 'Recent experiences shown with IDs for easy modification';
    }

    // Many results suggest patterns
    if (results.length > 2) {
      return 'Multiple matches found. Use IDs to modify specific experiences.';
    }

    // Check for emotional content in multiple results
    const hasEmotionalContent = results.some((r) =>
      r.metadata?.experience?.some((q) => q.includes('mood') || q.includes('embodied'))
    );

    if (hasEmotionalContent) {
      return 'Emotional experiences captured. Use IDs to modify or release.';
    }

    // Default for small result sets
    return 'Use IDs to modify or release specific experiences.';
  }

  /**
   * Formats clustering results for user-friendly display
   */
  private formatClusterResponse(
    clusters: Array<{
      id: string;
      summary: string;
      experienceIds: string[];
      commonQualities: string[];
      size: number;
    }>
  ): string {
    if (clusters.length === 0) {
      return 'No clusters found.';
    }

    let response = `Found ${clusters.length} cluster${clusters.length === 1 ? '' : 's'} of similar experiences:\n\n`;

    clusters.forEach((cluster, index) => {
      response += `${index + 1}. **${cluster.summary}**\n`;
      response += `   Size: ${cluster.size} experience${cluster.size === 1 ? '' : 's'}\n`;

      if (cluster.commonQualities.length > 0) {
        response += `   Common qualities: ${cluster.commonQualities.join(', ')}\n`;
      }

      // Show experience IDs in the cluster
      response += `   Experiences: ${cluster.experienceIds.join(', ')}\n\n`;
    });

    return response;
  }
}
