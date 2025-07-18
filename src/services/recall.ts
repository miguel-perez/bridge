import { SourceRecord } from '../core/types.js';
import { getAllRecords } from '../core/storage.js';
import { embeddingService } from './embeddings.js';
import { findSimilarByEmbedding } from './embedding-search.js';

// Debug mode configuration
const DEBUG_MODE = process.env.BRIDGE_RECALL_DEBUG === 'true' || process.env.BRIDGE_DEBUG === 'true';

// Debug logging utility - silent in MCP context
function debugLog(message: string, data?: unknown): { timestamp: string; message: string; data?: unknown } | null {
  // In MCP context, we don't use console.log
  // Debug information is returned in the response instead
  if (DEBUG_MODE) {
    // Store debug info for inclusion in response
    return {
      timestamp: new Date().toISOString(),
      message,
      data
    };
  }
  return null;
}

// Error logging utility with MCP-compliant formatting
function logRecallError(context: string, error: unknown, details?: unknown): { error: boolean; message: string; context: string; details?: unknown } {
  const errorMessage = `Recall error in ${context}: ${error instanceof Error ? error.message : error}`;
  
  // Return MCP-compliant error structure
  return {
    error: true,
    message: errorMessage,
    context,
    details: DEBUG_MODE ? details : undefined
  };
}

export interface RecallInput {
  query?: string;
  limit?: number;
  offset?: number;
  type?: string[];
  experiencer?: string;
  perspective?: string;
  processing?: string;
  crafted?: boolean;
  created?: string | { start: string; end: string };
  sort?: 'relevance' | 'created';
  // NOTE: Quality filtering now uses prominent_qualities (simple array), not min/max per theoretical dimension.
  // For legacy support, you may implement mapping if needed.
  // Vector similarity recall (deprecated - use semantic recall instead)
  vector?: any;
  vector_similarity_threshold?: number;
  // Semantic recall
  semantic_query?: string;
  semantic_threshold?: number;
  // ID recall
  id?: string;
  // Display options
  show_ids?: boolean;
}

export interface RecallServiceResult {
  id: string;
  type: string;
  snippet: string;
  content?: string; // Full original content
  metadata?: Record<string, any>;
  relevance_score: number; // Always present, 0-1 scale
  relevance_breakdown?: {
    text_match?: number;
    vector_similarity?: number;
    semantic_similarity?: number;
    filter_relevance?: number;
  };
}

export interface RecallServiceResponse {
  results: RecallServiceResult[];
  total: number;
  query: string;
  filters: Record<string, any>;
  debug?: {
    recall_started: string;
    total_records: number;
    filtered_records: number;
    vector_recall_performed: boolean;
    semantic_recall_performed: boolean;
    query_embedding_dimension?: number;
    similarity_scores?: Array<{
      id: string;
      score: number;
      type: 'vector' | 'semantic';
    }>;
    filter_breakdown?: {
      type_filter?: number;
      experiencer_filter?: number;
      perspective_filter?: number;
      processing_filter?: number;
      crafted_filter?: number;
      temporal_filter?: number;
      qualities_filter?: number;
      vector_threshold_filter?: number;
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

// Calculate text relevance score based on query matching
function calculateTextRelevance(record: SourceRecord, query: string | undefined): number {
  // For empty/undefined queries, return 1 to allow all records to be found
  if (!query || !query.trim()) {
    // Empty query - return 1 to show all results
    return 1;
  }
  
  const queryLower = query.toLowerCase();
  const contentLower = record.source.toLowerCase();
  
  // Check for exact phrase match in content (highest score)
  if (contentLower.includes(queryLower)) {
    return 0.9;
  }
  
  // Check for word matches
  const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);
  if (queryWords.length === 0) return 0;
  
  let matchedWords = 0;
  for (const word of queryWords) {
    if (contentLower.includes(word)) {
      matchedWords++;
    }
  }
  
  // Calculate word match ratio
  const wordMatchRatio = matchedWords / queryWords.length;
  
  // Check for partial matches (substring matches)
  let partialMatches = 0;
  for (const word of queryWords) {
    if (word.length > 3) {
      // Check if any word in content contains this query word as a substring
      const contentWords = contentLower.split(/\s+/);
      for (const contentWord of contentWords) {
        if (contentWord.includes(word)) {
          partialMatches++;
          break;
        }
      }
    }
  }
  
  const partialMatchRatio = partialMatches / queryWords.length;
  
  // Combine scores: exact phrase > word matches > partial matches
  return Math.max(wordMatchRatio * 0.7, partialMatchRatio * 0.4);
}

// Calculate filter relevance score
function calculateFilterRelevance(record: SourceRecord, input: RecallInput): number {
  const relevance = 1.0; // Start with full relevance
  
  // Check if record matches all applied filters
  // Type filtering removed - type field no longer exists in data model
  
  if (input.experiencer && record.experiencer !== input.experiencer) {
    return 0;
  }
  
  if (input.perspective && record.perspective !== input.perspective) {
    return 0;
  }
  
  if (input.processing && record.processing !== input.processing) {
    return 0;
  }
  
  if (input.crafted !== undefined && record.crafted !== input.crafted) {
    return 0;
  }
  
  // Check experiential qualities filters
  if (record.experience) {
    // TODO: Implement filtering based on experience array if needed.
    // Legacy min/max filter logic for theoretical types removed.
  }
  
  return relevance;
}

// Calculate overall relevance score
function calculateRelevanceScore(
  record: SourceRecord, 
  input: RecallInput, 
  semanticSimilarity?: number
): { score: number; breakdown: any } {
  const textMatch = calculateTextRelevance(record, input.query || '');
  const filterRelevance = calculateFilterRelevance(record, input);
  
  // Combine scores with weights
  let finalScore = 0;
  const breakdown: any = {
    text_match: textMatch,
    filter_relevance: filterRelevance
  };
  
  // Balanced scoring: text (50%), semantic (30%), filters (20%)
  if (input.query && input.query.trim()) {
    finalScore += textMatch * 0.5;
  } else {
    // For empty queries, give a base score to all records
    finalScore += 0.5;
    // Empty query - add base score
  }
  
  // Filter relevance affects overall score
  finalScore += filterRelevance * 0.2;
  
  // Semantic similarity is now a major component
  if (semanticSimilarity !== undefined) {
    breakdown.semantic_similarity = semanticSimilarity;
    finalScore += semanticSimilarity * 0.3;
  }
  
  return {
    score: Math.min(finalScore, 1.0),
    breakdown
  };
}

/**
 * Applies temporal filtering to records based on date ranges.
 * @param records - Records to filter
 * @param filter - Date filter (string or range object)
 * @returns Filtered records
 */
async function applyTemporalFilter(records: SourceRecord[], filter: string | { start: string; end: string }): Promise<SourceRecord[]> {
  if (typeof filter === 'string') {
    // Single date filter - find records from that date onwards
    const filterDate = new Date(filter);
    
    return records.filter(record => {
      const recordDate = new Date(record.created);
      return recordDate >= filterDate;
    });
  } else {
    // Date range filter
    const startDate = new Date(filter.start);
    const endDate = new Date(filter.end);
    
    return records.filter(record => {
      const recordDate = new Date(record.created);
      return recordDate >= startDate && recordDate <= endDate;
    });
  }
}

// Main search function
export async function search(input: RecallInput): Promise<RecallServiceResponse> {
  const debugInfo: RecallServiceResponse['debug'] = {
    recall_started: new Date().toISOString(),
    total_records: 0,
    filtered_records: 0,
    vector_recall_performed: false,
    semantic_recall_performed: false,
    filter_breakdown: {},
    errors: [],
    debug_logs: []
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
      queryLength: input.query?.length,
      queryTrimmed: input.query?.trim(),
      filters: Object.entries(input).filter(([k, v]) => k !== 'query' && v !== undefined).map(([k, v]) => ({ [k]: v }))
    });
    
    // Start with all records
    let filteredRecords = allRecords;
  
    // Apply basic filters
    // Type filtering removed - type field no longer exists in data model
    
    if (input.experiencer) {
      const beforeCount = filteredRecords.length;
        filteredRecords = filteredRecords.filter(record => record.experiencer === input.experiencer);
      const afterCount = filteredRecords.length;
      debugInfo.filter_breakdown!.experiencer_filter = beforeCount - afterCount;
      addDebugLog(`Experiencer filter applied: ${beforeCount} -> ${afterCount} records`);
    }
    
    if (input.perspective) {
      const beforeCount = filteredRecords.length;
        filteredRecords = filteredRecords.filter(record => record.perspective === input.perspective);
      const afterCount = filteredRecords.length;
      debugInfo.filter_breakdown!.perspective_filter = beforeCount - afterCount;
      addDebugLog(`Perspective filter applied: ${beforeCount} -> ${afterCount} records`);
    }
    
    if (input.processing) {
      const beforeCount = filteredRecords.length;
        filteredRecords = filteredRecords.filter(record => record.processing === input.processing);
      const afterCount = filteredRecords.length;
      debugInfo.filter_breakdown!.processing_filter = beforeCount - afterCount;
      addDebugLog(`Processing filter applied: ${beforeCount} -> ${afterCount} records`);
    }
    
    if (input.crafted !== undefined) {
      const beforeCount = filteredRecords.length;
        filteredRecords = filteredRecords.filter(record => record.crafted === input.crafted);
      const afterCount = filteredRecords.length;
      debugInfo.filter_breakdown!.crafted_filter = beforeCount - afterCount;
      addDebugLog(`Crafted filter applied: ${beforeCount} -> ${afterCount} records`);
    }
    
    // Apply temporal filters
    if (input.created) {
      const beforeCount = filteredRecords.length;
      filteredRecords = await applyTemporalFilter(filteredRecords, input.created);
      const afterCount = filteredRecords.length;
      debugInfo.filter_breakdown!.temporal_filter = beforeCount - afterCount;
      addDebugLog(`Created filter applied: ${beforeCount} -> ${afterCount} records`);
    }
    
    if (input.vector) {
      debugInfo.vector_recall_performed = true;
      addDebugLog('Starting vector similarity recall (deprecated)', { 
        vector: input.vector, 
        threshold: input.vector_similarity_threshold 
      });
      
      // Note: Vector similarity recall is deprecated since we removed QualityVector
      // This is kept for backward compatibility but will not work properly
      addDebugLog('Vector similarity recall is deprecated - use semantic recall instead');
    }

    // Semantic recall
    const semanticSimilarityMap: Record<string, number> = {};
    if (input.semantic_query) {
      debugInfo.semantic_recall_performed = true;
      addDebugLog('Starting semantic recall', { 
        query: input.semantic_query, 
        threshold: input.semantic_threshold 
      });
      
      try {
        // Generate embedding for the semantic query
        const queryEmbedding = await embeddingService.generateEmbedding(input.semantic_query);
        debugInfo.query_embedding_dimension = queryEmbedding.length;
        addDebugLog(`Generated query embedding with dimension: ${queryEmbedding.length}`);
        
        // Find similar embeddings using cosine similarity
        const similarResults = await findSimilarByEmbedding(
          queryEmbedding,
          input.limit ? input.limit * 2 : 100,  // Get more results to filter later
          input.semantic_threshold || 0.7
        );
        
        addDebugLog(`Found ${similarResults.length} semantically similar results with threshold ${input.semantic_threshold || 0.7}`);
        
        // Log top similarity scores
        const topSemanticScores = similarResults
          .slice(0, 10)
          .map(r => ({ id: r.sourceId, score: r.similarity }));
        
        addDebugLog('Top 10 semantic similarity scores', topSemanticScores);
        
        // Don't filter out records - semantic similarity should contribute to scoring, not exclude results
        addDebugLog(`Found ${similarResults.length} semantically similar results to enhance scoring`);
        
        // Add semantic similarity scores to the similarity map
        for (const result of similarResults) {
          semanticSimilarityMap[result.sourceId] = result.similarity;
        }
        
        // Add to debug similarity scores
        if (!debugInfo.similarity_scores) debugInfo.similarity_scores = [];
        debugInfo.similarity_scores.push(...topSemanticScores.map(s => ({ ...s, type: 'semantic' as const })));
        
      } catch (error) {
        const errorInfo = logRecallError('semantic_recall', error as Error, { 
          query: input.semantic_query, 
          threshold: input.semantic_threshold 
        });
        debugInfo.errors!.push(errorInfo);
        addDebugLog('Semantic recall failed, continuing without semantic filtering');
        // Continue without semantic filtering if it fails
      }
    }

    // Calculate relevance scores for all filtered records
    const recordsWithRelevance = filteredRecords.map((record: any) => {
      const relevance = calculateRelevanceScore(
        record, 
        input, 
        semanticSimilarityMap[record.id]
      );
      return { ...record, _relevance: relevance };
    });

    // If a text query is provided, filter out records with zero text relevance
    let finalRecords = recordsWithRelevance;
    if (input.query && input.query.trim()) {
      const beforeCount = finalRecords.length;
      finalRecords = finalRecords.filter((r: any) => r._relevance.breakdown.text_match > 0);
      const afterCount = finalRecords.length;
      addDebugLog(`Text relevance filter applied: ${beforeCount} -> ${afterCount} records`);
    } else {
      addDebugLog('No text query provided, skipping text relevance filter', {
        queryValue: input.query,
        queryTrimmed: input.query?.trim(),
        recordCount: finalRecords.length
      });
    }

    // Apply sorting (default to created date for recency)
    const sortType = input.sort || 'created';
    addDebugLog(`Applying sort: ${sortType}`);
    finalRecords.sort((a: any, b: any) => {
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
    });

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
    const results: RecallServiceResult[] = finalRecords.map(record => ({
      id: record.id,
      type: 'source', // All records are sources
      content: record.source,
      snippet: record.source.length > 200 ? record.source.substring(0, 200) + '...' : record.source,
      metadata: {
        created: record.created,
        perspective: record.perspective,
        experiencer: record.experiencer,
        processing: record.processing,
        experience: record.experience
      },
      relevance_score: record._relevance.score,
      relevance_breakdown: record._relevance.breakdown
    }));

    return {
      results,
      total: results.length,
      query: input.query || '',
      filters: Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined && v !== '')),
      debug: DEBUG_MODE ? debugInfo : undefined
    };
    
  } catch (error) {
    const errorInfo = logRecallError('recall_execution', error as Error, { input });
    debugInfo.errors!.push(errorInfo);
    
    // Return error response with debug info
    return {
      results: [],
      total: 0,
      query: input.query || '',
      filters: Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined && v !== '')),
      debug: DEBUG_MODE ? debugInfo : undefined
    };
  }
}

// Determine why no results were found
function determineNoResultsReason(input: RecallInput, debugInfo: RecallServiceResponse['debug']): string {
  if (debugInfo?.total_records === 0) {
    return 'No records available';
  }
  
  if (input.semantic_query && !debugInfo?.semantic_recall_performed) {
    return 'Semantic recall not available';
  }
  
  if (input.semantic_threshold && input.semantic_threshold > 0.9) {
    return 'Semantic similarity threshold too high - try lowering threshold';
  }
  
  if (input.vector_similarity_threshold && input.vector_similarity_threshold > 0.9) {
    return 'Vector similarity threshold too high - try lowering threshold';
  }
  
  if (input.query && debugInfo?.filter_breakdown?.type_filter === debugInfo?.total_records) {
    return 'Text query too restrictive - no records match the query';
  }
  
  const totalFiltered = Object.values(debugInfo?.filter_breakdown || {}).reduce((sum, count) => sum + (count || 0), 0);
  if (totalFiltered === debugInfo?.total_records) {
    return 'All records filtered out by applied filters';
  }
  
  return 'Unknown reason - check debug information for details';
}

// Cosine similarity between two vectors (deprecated - no longer used)
// function cosineSimilarity(a: Record<string, number>, b: Record<string, number>): number {
//   const keys = ['embodied', 'attentional', 'affective', 'purposive', 'spatial', 'temporal', 'intersubjective'];
//   let dot = 0, normA = 0, normB = 0;
//   for (const k of keys) {
//     const va = a[k] ?? 0;
//     const vb = b[k] ?? 0;
//     dot += va * vb;
//     normA += va * va;
//     normB += vb * vb;
//   }
//   if (normA === 0 || normB === 0) return 0;
//   return dot / (Math.sqrt(normA) * Math.sqrt(normB));
// }

export class RecallService {
  async search(input: RecallInput): Promise<{ results: RecallServiceResult[], stats?: any }> {
    // Use the comprehensive search function that includes all filtering logic
    const searchResponse = await search(input);
    
          // Convert RecallServiceResponse to the expected format
    return { 
      results: searchResponse.results as RecallServiceResult[], 
      stats: { 
        total: searchResponse.total,
        query: searchResponse.query,
        filters: searchResponse.filters,
        debug: searchResponse.debug
      }
    };
  }
} 