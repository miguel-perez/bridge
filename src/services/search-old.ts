import { SourceRecord } from '../core/types.js';
import { getAllRecords } from '../core/storage.js';
import { embeddingService } from './embeddings.js';
import { findSimilarByEmbedding } from './embedding-search.js';
import { SEMANTIC_CONFIG } from '../core/config.js';
import { applyFiltersAndScore } from './unified-scoring.js';
import { ExperienceCluster, clusterExperiences } from './clustering.js';
import { type QualityFilter } from './quality-filter.js';
import {
  groupByWho as groupingByWho,
  groupByDate as groupingByDate,
  groupByQualitySignature,
  type GroupedResult,
} from './grouping.js';

// ============================================================================
// GROUPING FUNCTIONS (Using shared grouping logic)
// ============================================================================

/**
 * Convert GroupedResult to ExperienceCluster for compatibility
 */
function convertToExperienceCluster(group: GroupedResult): ExperienceCluster {
  const experienceIds = group.experiences.map((exp) => exp.id);
  return {
    id: `group-${String(group.key).slice(0, 20)}`,
    summary: group.label,
    experienceIds,
    commonQualities: group.commonQualities || [],
    size: group.count,
  };
}

/**
 * Group experiences by specified criteria
 *
 * @param experiences - Array of source records to group
 * @param groupBy - Grouping criteria
 * @returns Array of experience clusters/groups
 */
async function groupExperiences(
  experiences: SourceRecord[],
  groupBy: 'who' | 'date' | 'qualities'
): Promise<ExperienceCluster[]> {
  switch (groupBy) {
    case 'who': {
      const groups = groupingByWho(experiences);
      return groups.map(convertToExperienceCluster);
    }
    case 'date': {
      const groups = groupingByDate(experiences);
      return groups.map(convertToExperienceCluster);
    }
    case 'qualities': {
      const groups = groupByQualitySignature(experiences);
      return groups.map(convertToExperienceCluster);
    }
    default:
      return [];
  }
}

// Debug mode configuration
const DEBUG_MODE = process.env.BRIDGE_DEBUG === 'true';

// Debug logging utility - silent in MCP context
function debugLog(
  message: string,
  data?: unknown
): { timestamp: string; message: string; data?: unknown } | null {
  // In MCP context, we don't use stdout logging
  // Debug information is returned in the response instead
  if (DEBUG_MODE) {
    // Store debug info for inclusion in response
    return {
      timestamp: new Date().toISOString(),
      message,
      data,
    };
  }
  return null;
}

// Error logging utility with MCP-compliant formatting
function logRecallError(
  context: string,
  error: unknown,
  details?: unknown
): { error: boolean; message: string; context: string; details?: unknown } {
  const errorMessage = `Recall error in ${context}: ${error instanceof Error ? error.message : error}`;

  // Return MCP-compliant error structure
  return {
    error: true,
    message: errorMessage,
    context,
    details: DEBUG_MODE ? details : undefined,
  };
}

export interface RecallInput {
  query?: string | string[];
  limit?: number;
  offset?: number;
  type?: string[];
  who?: string;
  created?: string | { start: string; end: string };
  sort?: 'relevance' | 'created';
  // Semantic recall
  semantic_query?: string;
  semantic_threshold?: number;
  // ID recall
  id?: string;
  // Display options
  show_ids?: boolean;
  // Grouping options
  group_by?: 'similarity' | 'who' | 'date' | 'qualities' | 'none';
  // Sophisticated quality filtering
  qualities?: QualityFilter;
  // Pattern realization filters
  reflects?: 'only';
  reflected_by?: string | string[];
}

export interface RecallServiceResult {
  id: string;
  type: string;
  snippet: string;
  content?: string; // Full original content
  metadata?: Record<string, unknown>;
  relevance_score: number; // Always present, 0-1 scale
  relevance_breakdown?: {
    text_match?: number;
    vector_similarity?: number;
    semantic_similarity?: number;
    filter_relevance?: number;
    // New unified scoring fields
    semantic?: number;
    quality?: number;
    exact?: number;
    recency?: number;
    density?: number;
    weights?: Record<string, number>;
  };
}

export interface RecallServiceResponse {
  results: RecallServiceResult[];
  total: number;
  query: string | string[];
  filters: Record<string, unknown>;
  clusters?: Array<{
    id: string;
    summary: string;
    experienceIds: string[];
    commonQualities: string[];
    size: number;
  }>;
  debug?: {
    recall_started: string;
    total_records: number;
    filtered_records: number;
    semantic_recall_performed: boolean;
    query_embedding_dimension?: number;
    similarity_scores?: Array<{
      id: string;
      score: number;
      type: 'semantic';
    }>;
    filter_breakdown?: {
      type_filter?: number;
      who_filter?: number;
      temporal_filter?: number;
      qualities_filter?: number;
      semantic_threshold_filter?: number;
      id_filter?: number;
    };
    no_results_reason?: string;
    errors?: Array<{
      context: string;
      message: string;
      details?: unknown;
    }>;
    debug_logs?: Array<{
      timestamp: string;
      message: string;
      data?: unknown;
    }>;
  };
}

// Legacy scoring functions - replaced by unified scoring
// Kept for reference only

/**
 * Applies temporal filtering to records based on date ranges.
 * @param records - Records to filter
 * @param filter - Date filter (string or range object)
 * @returns Filtered records
 */
async function applyTemporalFilter(
  records: SourceRecord[],
  filter: string | { start: string; end: string }
): Promise<SourceRecord[]> {
  if (typeof filter === 'string') {
    // Single date filter - find records from that date onwards
    const filterDate = new Date(filter);

    return records.filter((record) => {
      const recordDate = new Date(record.created);
      return recordDate >= filterDate;
    });
  } else {
    // Date range filter
    const startDate = new Date(filter.start);
    const endDate = new Date(filter.end);

    return records.filter((record) => {
      const recordDate = new Date(record.created);
      return recordDate >= startDate && recordDate <= endDate;
    });
  }
}

// Main search function
/**
 * Performs comprehensive recall search with filtering and scoring
 * @remarks
 * Main entry point for recall operations. Handles semantic search, filtering,
 * and unified scoring to return relevant experiences.
 * @param input - Recall input with query and filter parameters
 * @returns Recall service response with results and debug information
 */
export async function search(input: RecallInput): Promise<RecallServiceResponse> {
  const debugInfo: RecallServiceResponse['debug'] = {
    recall_started: new Date().toISOString(),
    total_records: 0,
    filtered_records: 0,
    semantic_recall_performed: false,
    filter_breakdown: {},
    errors: [],
    debug_logs: [],
  };

  const addDebugLog = (message: string, data?: unknown): void => {
    if (DEBUG_MODE) {
      const log = debugLog(message, data);
      if (log) debugInfo.debug_logs!.push(log);
    }
  };

  try {
    // Get all records
    const allRecords = await getAllRecords();
    debugInfo.total_records = allRecords.length;
    addDebugLog(`Retrieved ${allRecords.length} total records`);

    // Log the input for debugging
    addDebugLog('Recall input', {
      query: input.query,
      hasQuery: !!input.query,
      queryLength: typeof input.query === 'string' ? input.query.length : input.query?.length,
      queryTrimmed: typeof input.query === 'string' ? input.query.trim() : undefined,
      filters: Object.entries(input)
        .filter(([k, v]) => k !== 'query' && v !== undefined)
        .map(([k, v]) => ({ [k]: v })),
    });

    // Start with all records
    let filteredRecords = allRecords;

    // Apply basic filters
    // Type filtering removed - type field no longer exists in data model

    if (input.who) {
      const beforeCount = filteredRecords.length;
      filteredRecords = filteredRecords.filter((record) => record.who === input.who);
      const afterCount = filteredRecords.length;
      debugInfo.filter_breakdown!.who_filter = beforeCount - afterCount;
      addDebugLog(`Who filter applied: ${beforeCount} -> ${afterCount} records`);
    }



    // Apply temporal filters
    if (input.created) {
      const beforeCount = filteredRecords.length;
      filteredRecords = await applyTemporalFilter(filteredRecords, input.created);
      const afterCount = filteredRecords.length;
      debugInfo.filter_breakdown!.temporal_filter = beforeCount - afterCount;
      addDebugLog(`Created filter applied: ${beforeCount} -> ${afterCount} records`);
    }

    // Semantic recall
    const semanticSimilarityMap: Record<string, number> = {};
    if (input.semantic_query) {
      debugInfo.semantic_recall_performed = true;
      addDebugLog('Starting semantic recall', {
        query: input.semantic_query,
        threshold: input.semantic_threshold,
      });

      try {
        // Generate embedding for the semantic query
        const queryEmbedding = await embeddingService.generateEmbedding(input.semantic_query);
        debugInfo.query_embedding_dimension = queryEmbedding.length;
        addDebugLog(`Generated query embedding with dimension: ${queryEmbedding.length}`);

        // Find similar embeddings using cosine similarity
        const similarResults = await findSimilarByEmbedding(
          queryEmbedding,
          input.limit ? input.limit * 2 : 200, // Get more results to filter later - increased default
          input.semantic_threshold || SEMANTIC_CONFIG.DEFAULT_THRESHOLD
        );

        addDebugLog(
          `Found ${similarResults.length} semantically similar results with threshold ${input.semantic_threshold || 0.7}`
        );

        // Store similarity results in debug info for inspection
        addDebugLog('All similarity results', similarResults);

        // Log top similarity scores
        const topSemanticScores = similarResults
          .slice(0, 10)
          .map((r) => ({ id: r.sourceId, score: r.similarity }));

        addDebugLog('Top 10 semantic similarity scores', topSemanticScores);

        // Don't filter out records - semantic similarity should contribute to scoring, not exclude results
        addDebugLog(
          `Found ${similarResults.length} semantically similar results to enhance scoring`
        );

        // Add semantic similarity scores to the similarity map
        for (const result of similarResults) {
          semanticSimilarityMap[result.sourceId] = result.similarity;
        }

        // Add to debug similarity scores
        if (!debugInfo.similarity_scores) debugInfo.similarity_scores = [];
        debugInfo.similarity_scores.push(
          ...topSemanticScores.map((s) => ({ ...s, type: 'semantic' as const }))
        );

        // DEBUG: Log how many items we're adding to the map
        addDebugLog(`Adding ${similarResults.length} items to semantic similarity map`);
      } catch (error) {
        const errorInfo = logRecallError('semantic_recall', error as Error, {
          query: input.semantic_query,
          threshold: input.semantic_threshold,
        });
        debugInfo.errors!.push(errorInfo);
        addDebugLog('Semantic recall failed, continuing without semantic filtering');
        // Continue without semantic filtering if it fails
      }
    }

    // Build semantic scores map
    const semanticScoresMap = new Map<string, number>();
    for (const [id, score] of Object.entries(semanticSimilarityMap)) {
      semanticScoresMap.set(id, score);
    }

    // Apply unified scoring with enhanced quality filtering
    const scoredExperiences = applyFiltersAndScore(
      filteredRecords,
      input.query || input.semantic_query || '',
      {
        who: input.who,
        qualities: input.qualities, // Pass sophisticated quality filters
      },
      semanticScoresMap
    );

    // Convert to records with relevance for compatibility
    const recordsWithRelevance = scoredExperiences.map((scored) => ({
      ...scored.experience,
      _relevance: {
        score: scored.score,
        breakdown: {
          ...scored.factors,
          weights: scored.weights,
        },
      },
    }));

    // Keep only records with non-zero scores
    const finalRecords = recordsWithRelevance.filter(
      (r: SourceRecord & { _relevance: { score: number } }) => r._relevance.score > 0
    );
    addDebugLog(
      `Score filter applied: ${recordsWithRelevance.length} -> ${finalRecords.length} records`
    );

    // Apply sorting (default to created date for recency)
    const sortType = input.sort || 'created';
    addDebugLog(`Applying sort: ${sortType}`);
    finalRecords.sort(
      (
        a: SourceRecord & { _relevance: { score: number } },
        b: SourceRecord & { _relevance: { score: number } }
      ) => {
        switch (sortType) {
          case 'created': {
            const aTime = new Date(a.created).getTime();
            const bTime = new Date(b.created).getTime();
            return bTime - aTime; // Descending
          }
          case 'relevance': {
            const aScore = a._relevance.score;
            const bScore = b._relevance.score;
            return bScore - aScore; // Descending
          }
          default:
            return 0;
        }
      }
    );

    // Store total count before pagination
    const totalBeforePagination = finalRecords.length;
    addDebugLog(`Total results before pagination: ${totalBeforePagination}`);

    // Apply pagination (offset and limit)
    if (input.offset && input.offset > 0) {
      addDebugLog(`Applying offset: ${input.offset}`);
      finalRecords.splice(0, input.offset);
    }

    if (input.limit) {
      addDebugLog(`Applying limit: ${input.limit}`);
      finalRecords.splice(input.limit);
    }

    // Check for no results and provide debugging info
    if (finalRecords.length === 0) {
      debugInfo.no_results_reason = determineNoResultsReason(input, debugInfo);
      addDebugLog('No results found', { reason: debugInfo.no_results_reason });
    }

    debugInfo.filtered_records = finalRecords.length;
    addDebugLog(`Recall completed: ${finalRecords.length} final results`);

    // Format results for return
    const results: RecallServiceResult[] = finalRecords.map((record) => ({
      id: record.id,
      type: 'source', // All records are sources
      content: record.source,
      snippet: record.source.length > 600 ? record.source.substring(0, 600) + '...' : record.source,
      metadata: {
        created: record.created,
        who: record.who,
        experienceQualities: record.experienceQualities,
      },
      relevance_score: record._relevance.score,
      relevance_breakdown: record._relevance.breakdown,
    }));

    // Handle clustering if requested
    let clusters;

    if (input.group_by === 'similarity') {
      addDebugLog('Clustering requested, generating clusters from results');
      clusters = await clusterExperiences(finalRecords);
      addDebugLog(`Generated ${clusters.length} clusters from ${finalRecords.length} experiences`);
    } else if (input.group_by && input.group_by !== 'none') {
      addDebugLog(`Grouping by ${input.group_by} requested`);
      clusters = await groupExperiences(finalRecords, input.group_by);
      addDebugLog(
        `Generated ${clusters.length} ${input.group_by} groups from ${finalRecords.length} experiences`
      );
    }

    return {
      results,
      total: totalBeforePagination, // Return total count before pagination
      query: input.query || '',
      filters: Object.fromEntries(
        Object.entries(input).filter(([, v]) => v !== undefined && v !== '')
      ),
      clusters,
      debug: DEBUG_MODE ? debugInfo : undefined,
    };
  } catch (error) {
    const errorInfo = logRecallError('recall_execution', error as Error, { input });
    debugInfo.errors!.push(errorInfo);

    // Return error response with debug info
    return {
      results: [],
      total: 0,
      query: input.query || '',
      filters: Object.fromEntries(
        Object.entries(input).filter(([, v]) => v !== undefined && v !== '')
      ),
      debug: DEBUG_MODE ? debugInfo : undefined,
    };
  }
}

// Determine why no results were found
function determineNoResultsReason(
  input: RecallInput,
  debugInfo: RecallServiceResponse['debug']
): string {
  if (debugInfo?.total_records === 0) {
    return 'No records available';
  }

  if (input.semantic_query && !debugInfo?.semantic_recall_performed) {
    return 'Semantic recall not available';
  }

  if (input.semantic_threshold && input.semantic_threshold > 0.9) {
    return 'Semantic similarity threshold too high - try lowering threshold';
  }

  if (input.query && debugInfo?.filter_breakdown?.type_filter === debugInfo?.total_records) {
    return 'Text query too restrictive - no records match the query';
  }

  const totalFiltered = Object.values(debugInfo?.filter_breakdown || {}).reduce(
    (sum, count) => sum + (count || 0),
    0
  );
  if (totalFiltered === debugInfo?.total_records) {
    return 'All records filtered out by applied filters';
  }

  return 'Unknown reason - check debug information for details';
}

/**
 * Service wrapper for recall operations
 * @remarks
 * Provides a simplified interface to the comprehensive search function.
 * Maintains backward compatibility with existing code.
 */
export class RecallService {
  /**
   * Performs recall search with simplified interface
   * @remarks
   * Wraps the comprehensive search function for backward compatibility.
   * @param input - Recall input parameters
   * @returns Search results with statistics
   */
  async search(input: RecallInput): Promise<{
    results: RecallServiceResult[];
    clusters?: Array<{
      id: string;
      summary: string;
      experienceIds: string[];
      commonQualities: string[];
      size: number;
    }>;
    stats?: Record<string, unknown>;
  }> {
    // Use the comprehensive search function that includes all filtering logic
    const searchResponse = await search(input);

    // Convert RecallServiceResponse to the expected format
    return {
      results: searchResponse.results as RecallServiceResult[],
      clusters: searchResponse.clusters,
      stats: {
        total: searchResponse.total,
        query: searchResponse.query,
        filters: searchResponse.filters,
        debug: searchResponse.debug,
      },
    };
  }
}
