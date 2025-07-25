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
import {
  groupByExperiencer,
  groupByDate,
  groupByQualitySignature,
  groupByPerspective,
  groupBySimilarity,
  type GroupedResult,
} from '../services/grouping.js';

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
   * Generates a human-readable description of the search parameters
   */
  private getSearchDescription(search: any): string {
    const parts: string[] = [];

    // ID search
    if (search.ids) {
      const ids = Array.isArray(search.ids) ? search.ids : [search.ids];
      if (ids.length === 1) {
        parts.push(`experience ID ${ids[0]}`);
      } else {
        parts.push(`${ids.length} specific experience IDs`);
      }
    }

    // Semantic search
    else if (search.search) {
      const searchStr = typeof search.search === 'string' ? search.search : search.search.join(' ');
      parts.push(`'${searchStr}'`);
    }

    // Filters
    if (search.experiencer) {
      parts.push(`by ${search.experiencer}`);
    }

    if (search.perspective) {
      if (!search.ids && !search.search) {
        // Special formatting when perspective is the only/primary filter
        parts.push(`'${search.perspective}' perspective experiences`);
      } else {
        parts.push(`'${search.perspective}' perspective`);
      }
    }

    if (search.reflects === 'only') {
      parts.push('pattern realizations');
    }

    if (search.qualities) {
      const qualityParts: string[] = [];
      for (const [quality, filter] of Object.entries(search.qualities)) {
        if (typeof filter === 'string') {
          qualityParts.push(`${quality}.${filter}`);
        } else if (Array.isArray(filter)) {
          qualityParts.push(`${quality}.[${filter.join(' OR ')}]`);
        } else if (typeof filter === 'object' && filter !== null && 'present' in filter) {
          qualityParts.push(`${filter.present ? 'with' : 'without'} ${quality}`);
        }
      }
      if (qualityParts.length > 0) {
        parts.push(`with ${qualityParts.join(', ')}`);
      }
    }

    if (search.created) {
      if (typeof search.created === 'string') {
        parts.push(`from ${search.created}`);
      } else if (search.created.start && search.created.end) {
        parts.push(`from ${search.created.start} to ${search.created.end}`);
      }
    }

    if (search.processing) {
      parts.push(`processed ${search.processing}`);
    }

    if (search.crafted !== undefined) {
      parts.push(search.crafted ? 'crafted content' : 'raw experiences');
    }

    // Add "all experiences" prefix if no ID or search query specified
    // and we don't already have a phrase ending with "experiences"
    if (!search.ids && !search.search && parts.length > 0) {
      const hasExperiencesPhrase = parts.some((p) => p.includes('experiences'));
      if (!hasExperiencesPhrase) {
        parts.unshift('all experiences');
      }
    }

    // Default if no parameters at all
    if (parts.length === 0) {
      parts.push('all experiences');
    }

    return parts.join(' ');
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
        stats?: any;
      }> = [];

      for (const searchItem of recall.searches) {
        // Validate deprecated 'as' parameter
        if ('as' in searchItem) {
          throw new Error('Unknown parameter: as. Use group_by: similarity instead.');
        }

        // Use group_by parameter for result grouping
        const groupBy = searchItem.group_by;

        const limit = searchItem.limit || 10;

        // Handle ID-based lookup
        if (searchItem.ids) {
          const idsArray = Array.isArray(searchItem.ids) ? searchItem.ids : [searchItem.ids];

          // For ID lookup, we need to get all records and filter by ID
          const { results } = await withTimeout(
            this.recallService.search({
              // No semantic query for ID lookup
              limit: 1000, // Get many records to ensure we find the IDs
              // Pass through filters that might still apply
              experiencer: searchItem.experiencer,
              perspective: searchItem.perspective,
              processing: searchItem.processing,
              crafted: searchItem.crafted,
              created: searchItem.created,
              qualities: searchItem.qualities,
              reflects: searchItem.reflects,
              reflected_by: searchItem.reflected_by,
            }),
            DEFAULT_TIMEOUTS.EXPERIENCE,
            'ID lookup operation'
          );

          // Filter to only exact ID matches
          const idResults = results.filter((r) => idsArray.includes(r.id));

          // Sort results to match the order of requested IDs
          const sortedResults = idsArray
            .map((id) => idResults.find((r) => r.id === id))
            .filter((r): r is (typeof idResults)[0] => r !== undefined);

          allResults.push({
            search: searchItem,
            results: sortedResults.map((result) => ({
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
              relevance_score: 1.0, // Exact ID match always has perfect score
            })),
            stats: { total: sortedResults.length },
          });
          continue;
        }

        // Handle semantic search
        const searchQuery = searchItem.search || '';

        // Special handling for "recent" queries (only for string queries)
        const isRecentQuery =
          typeof searchQuery === 'string' &&
          (searchQuery.toLowerCase() === 'recent' ||
            searchQuery.toLowerCase() === 'last' ||
            searchQuery.toLowerCase() === 'latest');

        // Import needed function for checking quality queries
        const { isQueryPurelyQuality } = await import('../services/unified-scoring.js');

        // Check if this is a pure quality query
        const isPureQuality = searchQuery && isQueryPurelyQuality(searchQuery);

        // Perform recall
        const { results, stats } = await withTimeout(
          this.recallService.search({
            query: isRecentQuery ? '' : searchQuery || undefined, // Empty query for recent to get all
            limit: isRecentQuery ? Math.min(limit, 5) : limit, // Show fewer for recent
            // Set semantic query based on query type
            semantic_query: isRecentQuery
              ? ''
              : !searchQuery
                ? undefined
                : isPureQuality && typeof searchQuery === 'string'
                  ? ''
                  : typeof searchQuery === 'string'
                    ? searchQuery
                    : Array.isArray(searchQuery)
                      ? searchQuery.join(' ')
                      : '',
            semantic_threshold: SEMANTIC_CONFIG.DEFAULT_THRESHOLD,
            // Pass through all filters from the search
            experiencer: searchItem.experiencer,
            perspective: searchItem.perspective,
            processing: searchItem.processing,
            crafted: searchItem.crafted,
            created: searchItem.created,
            sort: isRecentQuery ? 'created' : searchItem.sort, // Force sort by created for recent
            // Handle clustering if requested
            group_by: groupBy,
            // Pass sophisticated quality filters
            qualities: searchItem.qualities,
            // Pattern realization filters
            reflects: searchItem.reflects,
            reflected_by: searchItem.reflected_by,
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
          search: searchItem,
          results: recallResults,
          stats,
        });
      }

      // Build multi-content response
      const content: Array<{ type: 'text'; text: string }> = [];

      // Format response based on number of searches
      if (allResults.length === 1) {
        // Single search - format as before
        const { search, results: recallResults, stats } = allResults[0];
        const searchDescription = this.getSearchDescription(search);

        // Handle grouping if requested
        if (search.group_by && search.group_by !== 'none') {
          // Convert RecallResult back to SourceRecord for grouping
          const sourceRecords = recallResults.map((result) => ({
            id: result.id,
            source: result.content || '',
            emoji: result.metadata?.emoji || '',
            experiencer: result.metadata?.experiencer,
            perspective: result.metadata?.perspective,
            processing: result.metadata?.processing as
              | 'during'
              | 'right-after'
              | 'long-after'
              | undefined,
            created: result.metadata?.created || new Date().toISOString(),
            experience: result.metadata?.experience,
            crafted: false, // Default value
            reflects: [], // Default value
          }));

          let groupedResults: GroupedResult[];

          switch (search.group_by) {
            case 'similarity':
              groupedResults = await groupBySimilarity(sourceRecords);
              break;
            case 'experiencer':
              groupedResults = groupByExperiencer(sourceRecords);
              break;
            case 'date':
              groupedResults = groupByDate(sourceRecords);
              break;
            case 'qualities':
              groupedResults = groupByQualitySignature(sourceRecords);
              break;
            case 'perspective':
              groupedResults = groupByPerspective(sourceRecords);
              break;
            default:
              throw new Error(`Unknown group_by type: ${search.group_by}`);
          }

          // Format grouped response
          const groupTypeNames = {
            similarity: 'similarity groups',
            experiencer: 'experiencer groups',
            date: 'date groups',
            qualities: 'quality pattern groups',
            perspective: 'perspective groups',
          };

          const totalExperiences = groupedResults.reduce((sum, group) => sum + group.count, 0);
          const response = `Found ${groupedResults.length} ${groupTypeNames[search.group_by]} containing ${totalExperiences} experiences`;

          // Add group details
          let groupDetails = '\n\n';
          groupedResults.forEach((group, index) => {
            groupDetails += `${index + 1}. **${group.label}** (${group.count} experiences)\n`;
            if (group.commonQualities && group.commonQualities.length > 0) {
              groupDetails += `   Common qualities: ${group.commonQualities.join(', ')}\n`;
            }
            if (group.themeSummary) {
              groupDetails += `   Theme: ${group.themeSummary}\n`;
            }
            groupDetails += '\n';
          });

          content.push({
            type: 'text',
            text: response + groupDetails,
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
            search.offset,
            searchDescription
          );
          content.push({
            type: 'text',
            text: response,
          });
        }

        // Add contextual guidance for semantic searches
        if (search.search && typeof search.search === 'string') {
          const guidance = this.selectRecallGuidance(search.search, recallResults);
          if (guidance) {
            content.push({
              type: 'text',
              text: guidance,
            });
          }
        }
      } else {
        // Multiple searches - format as batch
        let response = `✅ Completed ${allResults.length} searches:\n\n`;

        for (let i = 0; i < allResults.length; i++) {
          const { search, results: recallResults } = allResults[i];
          const searchDescription = this.getSearchDescription(search);

          response += `Search ${i + 1}: Found ${recallResults.length} results for ${searchDescription}\n`;
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
    }>,
    searchDescription?: string
  ): string {
    if (clusters.length === 0) {
      const description = searchDescription || 'your search';
      return `No clusters found for ${description}.`;
    }

    let response = `Found ${clusters.length} cluster${clusters.length === 1 ? '' : 's'} for ${searchDescription || 'your search'}:\n\n`;

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
