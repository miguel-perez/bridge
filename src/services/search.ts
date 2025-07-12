import { SourceRecord } from '../core/types.js';
import { getAllRecords } from '../core/storage.js';
import { embeddingService } from './embeddings.js';
import { getVectorStore } from './vector-store.js';

// Debug mode configuration
const DEBUG_MODE = process.env.BRIDGE_SEARCH_DEBUG === 'true' || process.env.BRIDGE_DEBUG === 'true';

// Debug logging utility - silent in MCP context
function debugLog(message: string, data?: any) {
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
function logSearchError(context: string, error: any, details?: any) {
  const errorMessage = `Search error in ${context}: ${error.message || error}`;
  
  // Return MCP-compliant error structure
  return {
    error: true,
    message: errorMessage,
    context,
    details: DEBUG_MODE ? details : undefined
  };
}

export interface SearchInput {
  query?: string;
  system_time?: string | { start: string; end: string };
  occurred?: string | { start: string; end: string };
  type?: string[];
  experiencer?: string;
  perspective?: string;
  processing?: string;
  contentType?: string;
  crafted?: boolean;
  sort?: 'relevance' | 'system_time' | 'occurred';
  limit?: number;
  offset?: number;
  includeContext?: boolean;
  includeFullContent?: boolean;
  // Experiential qualities min/max
  min_embodied?: number;
  max_embodied?: number;
  min_attentional?: number;
  max_attentional?: number;
  min_affective?: number;
  max_affective?: number;
  min_purposive?: number;
  max_purposive?: number;
  min_spatial?: number;
  max_spatial?: number;
  min_temporal?: number;
  max_temporal?: number;
  min_intersubjective?: number;
  max_intersubjective?: number;
  // Vector similarity search (deprecated - use semantic search instead)
  vector?: {
    embodied: number;
    attentional: number;
    affective: number;
    purposive: number;
    spatial: number;
    temporal: number;
    intersubjective: number;
  };
  vector_similarity_threshold?: number;
  // Semantic search
  semantic_query?: string;
  semantic_threshold?: number;
  // ID search
  id?: string;
}

export interface SearchServiceResult {
  id: string;
  type: string;
  snippet: string;
  metadata?: Record<string, any>;
  relevance_score: number; // Always present, 0-1 scale
  relevance_breakdown?: {
    text_match?: number;
    vector_similarity?: number;
    semantic_similarity?: number;
    filter_relevance?: number;
  };
}

export interface SearchServiceResponse {
  results: SearchServiceResult[];
  total: number;
  query: string;
  filters: Record<string, any>;
  debug?: {
    search_started: string;
    total_records: number;
    filtered_records: number;
    vector_search_performed: boolean;
    semantic_search_performed: boolean;
    vector_store_stats?: {
      total_vectors: number;
      valid_vectors: number;
      invalid_vectors: number;
    };
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
      contentType_filter?: number;
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
      details?: any;
    }>;
    debug_logs?: Array<{
      timestamp: string;
      message: string;
      data?: any;
    }>;
  };
}

// Calculate text relevance score based on query matching
function calculateTextRelevance(record: SourceRecord, query: string): number {
  if (!query || !query.trim()) return 0;
  
  const queryLower = query.toLowerCase();
  const contentLower = record.content.toLowerCase();
  const narrativeLower = record.narrative?.toLowerCase() || '';
  
  // Check for exact phrase match in content or narrative (highest score)
  if (contentLower.includes(queryLower) || narrativeLower.includes(queryLower)) {
    return 0.9;
  }
  
  // Check for word matches
  const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);
  if (queryWords.length === 0) return 0;
  
  let matchedWords = 0;
  for (const word of queryWords) {
    if (contentLower.includes(word) || narrativeLower.includes(word)) {
      matchedWords++;
    }
  }
  
  // Calculate word match ratio
  const wordMatchRatio = matchedWords / queryWords.length;
  
  // Check for partial matches (substring matches)
  let partialMatches = 0;
  for (const word of queryWords) {
    if (word.length > 3) {
      // Check if any word in content or narrative contains this query word as a substring
      const contentWords = contentLower.split(/\s+/);
      const narrativeWords = narrativeLower.split(/\s+/);
      const allWords = [...contentWords, ...narrativeWords];
      for (const contentWord of allWords) {
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
function calculateFilterRelevance(record: SourceRecord, input: SearchInput): number {
  const relevance = 1.0; // Start with full relevance
  
  // Check if record matches all applied filters
  if (input.type && !input.type.includes(record.type)) {
    return 0;
  }
  
  if (input.experiencer && record.experiencer !== input.experiencer) {
    return 0;
  }
  
  if (input.perspective && record.perspective !== input.perspective) {
    return 0;
  }
  
  if (input.processing && record.processing !== input.processing) {
    return 0;
  }
  
  if (input.contentType && record.contentType !== input.contentType) {
    return 0;
  }
  
  if (input.crafted !== undefined && record.crafted !== input.crafted) {
    return 0;
  }
  
  // Check experiential qualities filters
  if (record.experiential_qualities?.qualities) {
    const qualities = record.experiential_qualities.qualities;
    
    // Check min/max filters for each quality type
    const qualityChecks = [
      { type: 'embodied', min: input.min_embodied, max: input.max_embodied },
      { type: 'attentional', min: input.min_attentional, max: input.max_attentional },
      { type: 'affective', min: input.min_affective, max: input.max_affective },
      { type: 'purposive', min: input.min_purposive, max: input.max_purposive },
      { type: 'spatial', min: input.min_spatial, max: input.max_spatial },
      { type: 'temporal', min: input.min_temporal, max: input.max_temporal },
      { type: 'intersubjective', min: input.min_intersubjective, max: input.max_intersubjective }
    ];
    
    for (const check of qualityChecks) {
      const quality = qualities.find(q => q.type === check.type);
      if (quality) {
        if (check.min !== undefined && quality.prominence < check.min) {
          return 0;
        }
        if (check.max !== undefined && quality.prominence > check.max) {
          return 0;
        }
      }
    }
  }
  
  return relevance;
}

// Calculate overall relevance score
function calculateRelevanceScore(
  record: SourceRecord, 
  input: SearchInput, 
  vectorSimilarity?: number, 
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
  
  // Text matching is primary
  if (input.query && input.query.trim()) {
    finalScore += textMatch * 0.6;
  }
  
  // Filter relevance affects overall score
  finalScore += filterRelevance * 0.2;
  
  // Vector similarity (deprecated - use semantic search instead)
  if (vectorSimilarity !== undefined) {
    breakdown.vector_similarity = vectorSimilarity;
    finalScore += vectorSimilarity * 0.1;
  }
  
  // Semantic similarity
  if (semanticSimilarity !== undefined) {
    breakdown.semantic_similarity = semanticSimilarity;
    finalScore += semanticSimilarity * 0.1;
  }
  
  return {
    score: Math.min(finalScore, 1.0),
    breakdown
  };
}

// Apply temporal filters
async function applyTemporalFilter(records: SourceRecord[], filter: string | { start: string; end: string }, field: 'system_time' | 'occurred'): Promise<SourceRecord[]> {
  function toUTCDateString(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date');
      }
      return date.toISOString();
    } catch {
      throw new Error(`Invalid date format: ${dateStr}`);
    }
  }
  
  if (typeof filter === 'string') {
    // Single date filter - find records on or after this date
    const filterDate = toUTCDateString(filter);
    return records.filter(record => {
      const recordDate = field === 'occurred' ? (record.occurred || record.system_time) : record.system_time;
      return recordDate >= filterDate;
    });
  } else {
    // Date range filter
    const startDate = filter.start ? toUTCDateString(filter.start) : null;
    const endDate = filter.end ? toUTCDateString(filter.end) : null;
    
    return records.filter(record => {
      const recordDate = field === 'occurred' ? (record.occurred || record.system_time) : record.system_time;
      
      if (startDate && recordDate < startDate) return false;
      if (endDate && recordDate > endDate) return false;
      
      return true;
    });
  }
}

// Main search function
export async function search(input: SearchInput): Promise<SearchServiceResponse> {
  const debugInfo: SearchServiceResponse['debug'] = {
    search_started: new Date().toISOString(),
    total_records: 0,
    filtered_records: 0,
    vector_search_performed: false,
    semantic_search_performed: false,
    filter_breakdown: {},
    errors: [],
    debug_logs: []
  };
  
  const addDebugLog = (message: string, data?: any) => {
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
    
    // Start with all records
    let filteredRecords = allRecords;
    
    // Apply basic filters
    if (input.type && input.type.length > 0) {
      const beforeCount = filteredRecords.length;
      filteredRecords = filteredRecords.filter(record => input.type!.includes(record.type));
      const afterCount = filteredRecords.length;
      debugInfo.filter_breakdown!.type_filter = beforeCount - afterCount;
      addDebugLog(`Type filter applied: ${beforeCount} -> ${afterCount} records`);
    }
    
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
    
    if (input.contentType) {
      const beforeCount = filteredRecords.length;
      filteredRecords = filteredRecords.filter(record => record.contentType === input.contentType);
      const afterCount = filteredRecords.length;
      debugInfo.filter_breakdown!.contentType_filter = beforeCount - afterCount;
      addDebugLog(`Content type filter applied: ${beforeCount} -> ${afterCount} records`);
    }
    
    if (input.crafted !== undefined) {
      const beforeCount = filteredRecords.length;
      filteredRecords = filteredRecords.filter(record => record.crafted === input.crafted);
      const afterCount = filteredRecords.length;
      debugInfo.filter_breakdown!.crafted_filter = beforeCount - afterCount;
      addDebugLog(`Crafted filter applied: ${beforeCount} -> ${afterCount} records`);
    }
    
    // Apply temporal filters
    if (input.system_time) {
      const beforeCount = filteredRecords.length;
      filteredRecords = await applyTemporalFilter(filteredRecords, input.system_time, 'system_time');
      const afterCount = filteredRecords.length;
      debugInfo.filter_breakdown!.temporal_filter = beforeCount - afterCount;
      addDebugLog(`System time filter applied: ${beforeCount} -> ${afterCount} records`);
    }
    
    if (input.occurred) {
      const beforeCount = filteredRecords.length;
      filteredRecords = await applyTemporalFilter(filteredRecords, input.occurred, 'occurred');
      const afterCount = filteredRecords.length;
      debugInfo.filter_breakdown!.temporal_filter = (debugInfo.filter_breakdown!.temporal_filter || 0) + (beforeCount - afterCount);
      addDebugLog(`Occurred filter applied: ${beforeCount} -> ${afterCount} records`);
    }
    
    // Apply ID filter
    if (input.id) {
      const beforeCount = filteredRecords.length;
      filteredRecords = filteredRecords.filter(record => record.id === input.id);
      const afterCount = filteredRecords.length;
      debugInfo.filter_breakdown!.id_filter = beforeCount - afterCount;
      addDebugLog(`ID filter applied: ${beforeCount} -> ${afterCount} records`);
    }
    
    // Vector similarity search (deprecated - use semantic search instead)
    const vectorSimilarityMap: Record<string, number> = {};
    if (input.vector) {
      debugInfo.vector_search_performed = true;
      addDebugLog('Starting vector similarity search (deprecated)', { 
        vector: input.vector, 
        threshold: input.vector_similarity_threshold 
      });
      
      // Note: Vector similarity search is deprecated since we removed QualityVector
      // This is kept for backward compatibility but will not work properly
      addDebugLog('Vector similarity search is deprecated - use semantic search instead');
    }

    // Semantic search
    const semanticSimilarityMap: Record<string, number> = {};
    if (input.semantic_query) {
      debugInfo.semantic_search_performed = true;
      addDebugLog('Starting semantic search', { 
        query: input.semantic_query, 
        threshold: input.semantic_threshold 
      });
      
      try {
        // Generate embedding for the semantic query
        const queryEmbedding = await embeddingService.generateEmbedding(input.semantic_query);
        debugInfo.query_embedding_dimension = queryEmbedding.length;
        addDebugLog(`Generated query embedding with dimension: ${queryEmbedding.length}`);
        
        // Get vector store stats
        const vectorStore = getVectorStore();
        const health = await vectorStore.getHealthStats();
        debugInfo.vector_store_stats = {
          total_vectors: health.total,
          valid_vectors: health.valid,
          invalid_vectors: health.invalid
        };
        addDebugLog('Vector store stats', debugInfo.vector_store_stats);
        
        // Validate and potentially clean up vectors before searching
        const validation = await vectorStore.validateVectors(queryEmbedding.length);
        if (validation.invalid > 0) {
          addDebugLog(`Found ${validation.invalid} vectors with mismatched dimensions. Cleaning up...`);
          addDebugLog('Invalid vectors:', validation.details.slice(0, 5)); // Show first 5
          const removed = await vectorStore.removeInvalidVectors(queryEmbedding.length);
          addDebugLog(`Removed ${removed} invalid vectors`);
        }
        
        // Find similar vectors in the vector store
        let similarResults = await vectorStore.findSimilar(
          queryEmbedding, 
          input.limit || 50, 
          input.semantic_threshold || 0.7
        );
        
        addDebugLog(`Initial semantic search found ${similarResults.length} results with threshold ${input.semantic_threshold || 0.7}`);
        
        // Fallback: if no results and threshold > 0.4, try again with lower threshold
        if (similarResults.length === 0 && (input.semantic_threshold === undefined || input.semantic_threshold > 0.4)) {
          addDebugLog('No semantic results found, retrying with lower threshold 0.4');
          similarResults = await vectorStore.findSimilar(
            queryEmbedding,
            input.limit || 50,
            0.4
          );
          addDebugLog(`Fallback semantic search found ${similarResults.length} results with threshold 0.4`);
        }
        
        // Log top similarity scores
        const topSemanticScores = similarResults
          .slice(0, 10)
          .map(r => ({ id: r.id, score: r.similarity }));
        
        addDebugLog('Top 10 semantic similarity scores', topSemanticScores);
        
        // Filter records to only include semantically similar ones
        const beforeCount = filteredRecords.length;
        const semanticIds = new Set(similarResults.map(r => r.id));
        filteredRecords = filteredRecords.filter(record => semanticIds.has(record.id));
        const afterCount = filteredRecords.length;
        debugInfo.filter_breakdown!.semantic_threshold_filter = beforeCount - afterCount;
        addDebugLog(`Semantic threshold filter applied: ${beforeCount} -> ${afterCount} records`);
        
        // Add semantic similarity scores to the similarity map
        for (const result of similarResults) {
          semanticSimilarityMap[result.id] = result.similarity;
        }
        
        // Add to debug similarity scores
        if (!debugInfo.similarity_scores) debugInfo.similarity_scores = [];
        debugInfo.similarity_scores.push(...topSemanticScores.map(s => ({ ...s, type: 'semantic' as const })));
        
      } catch (error) {
        const errorInfo = logSearchError('semantic_search', error as Error, { 
          query: input.semantic_query, 
          threshold: input.semantic_threshold 
        });
        debugInfo.errors!.push(errorInfo);
        addDebugLog('Semantic search failed, continuing without semantic filtering');
        // Continue without semantic filtering if it fails
      }
    }

    // Calculate relevance scores for all filtered records
    const recordsWithRelevance = filteredRecords.map(record => {
      const relevance = calculateRelevanceScore(
        record, 
        input, 
        vectorSimilarityMap[record.id], 
        semanticSimilarityMap[record.id]
      );
      return { ...record, _relevance: relevance };
    });

    // If a text query is provided, filter out records with zero text relevance
    let finalRecords = recordsWithRelevance;
    if (input.query && input.query.trim()) {
      const beforeCount = finalRecords.length;
      finalRecords = finalRecords.filter(r => r._relevance.breakdown.text_match > 0);
      const afterCount = finalRecords.length;
      addDebugLog(`Text relevance filter applied: ${beforeCount} -> ${afterCount} records`);
    }

    // Apply sorting (default to occurred date for recency)
    const sortType = input.sort || 'occurred';
    addDebugLog(`Applying sort: ${sortType}`);
    finalRecords.sort((a, b) => {
      switch (sortType) {
        case 'system_time': {
          const aTime = new Date(a.system_time).getTime();
          const bTime = new Date(b.system_time).getTime();
          return bTime - aTime; // Descending
        }
        case 'occurred': {
          const aTime = new Date(a.occurred || a.system_time).getTime();
          const bTime = new Date(b.occurred || b.system_time).getTime();
          return bTime - aTime; // Descending
        }
        case 'relevance':
        default: {
          // Sort by relevance score
          return b._relevance.score - a._relevance.score;
        }
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
    addDebugLog(`Search completed: ${finalRecords.length} final results`);

    // Convert to SearchServiceResult format
    const results: SearchServiceResult[] = finalRecords.map(record => ({
      id: record.id,
      type: record.type,
      snippet: input.includeFullContent ? (record.narrative || record.content) : (record.narrative || record.content).substring(0, 200) + ((record.narrative || record.content).length > 200 ? '...' : ''),
      metadata: input.includeContext ? {
        contentType: record.contentType,
        perspective: record.perspective,
        experiencer: record.experiencer,
        processing: record.processing,
        crafted: record.crafted,
        system_time: record.system_time,
        occurred: record.occurred,
        experiential_qualities: record.experiential_qualities,
        narrative: record.narrative
      } : undefined,
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
    const errorInfo = logSearchError('search_execution', error as Error, { input });
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
function determineNoResultsReason(input: SearchInput, debugInfo: SearchServiceResponse['debug']): string {
  if (debugInfo?.total_records === 0) {
    return 'Vector store is empty - no records available';
  }
  
  if (input.semantic_query && debugInfo?.vector_store_stats?.total_vectors === 0) {
    return 'Vector store has no vectors for semantic search';
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

export class SearchService {
  async search(input: SearchInput): Promise<{ results: SearchServiceResult[], stats?: any }> {
    // Use the comprehensive search function that includes all filtering logic
    const searchResponse = await search(input);
    
    // Convert SearchServiceResponse to the expected format
    return { 
      results: searchResponse.results as SearchServiceResult[], 
      stats: { 
        total: searchResponse.total,
        query: searchResponse.query,
        filters: searchResponse.filters
      }
    };
  }
} 