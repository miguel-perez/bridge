import { SourceRecord } from '../core/types.js';
import { getAllRecords } from '../core/storage.js';
import type { QualityVector } from '../core/types.js';
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
  groupBy?: 'type' | 'experiencer' | 'day' | 'week' | 'month' | 'hierarchy';
  sort?: 'relevance' | 'system_time' | 'occurred';
  limit?: number;
  includeContext?: boolean;
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
  // Vector similarity search
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
  
  // Check for exact phrase match (highest score)
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
function calculateFilterRelevance(record: SourceRecord, input: SearchInput): number {
  let relevance = 1.0; // Start with full relevance
  
  // Check if record matches all applied filters
  const appliedFilters: string[] = [];
  
  if (input.type && input.type.length > 0) {
    appliedFilters.push('type');
    if (!input.type.includes(record.type)) {
      relevance *= 0.1; // Major penalty for type mismatch
    }
  }
  
  if (input.experiencer) {
    appliedFilters.push('experiencer');
    if (record.experiencer !== input.experiencer) {
      relevance *= 0.1;
    }
  }
  
  if (input.perspective) {
    appliedFilters.push('perspective');
    if (record.perspective !== input.perspective) {
      relevance *= 0.1;
    }
  }
  
  if (input.processing) {
    appliedFilters.push('processing');
    if (record.processing !== input.processing) {
      relevance *= 0.1;
    }
  }
  
  if (input.contentType) {
    appliedFilters.push('contentType');
    if (record.contentType !== input.contentType) {
      relevance *= 0.1;
    }
  }
  
  if (input.crafted !== undefined) {
    appliedFilters.push('crafted');
    if (record.crafted !== input.crafted) {
      relevance *= 0.1;
    }
  }
  
  // If no filters applied, return full relevance
  if (appliedFilters.length === 0) {
    return 1.0;
  }
  
  return relevance;
}

// Calculate comprehensive relevance score
function calculateRelevanceScore(
  record: SourceRecord, 
  input: SearchInput, 
  vectorSimilarity?: number, 
  semanticSimilarity?: number
): { score: number; breakdown: any } {
  const breakdown: any = {};
  
  // Text relevance
  const textRelevance = calculateTextRelevance(record, input.query || '');
  breakdown.text_match = textRelevance;
  
  // Vector similarity
  if (vectorSimilarity !== undefined) {
    breakdown.vector_similarity = vectorSimilarity;
  }
  
  // Semantic similarity
  if (semanticSimilarity !== undefined) {
    breakdown.semantic_similarity = semanticSimilarity;
  }
  
  // Filter relevance
  const filterRelevance = calculateFilterRelevance(record, input);
  breakdown.filter_relevance = filterRelevance;
  
  // Calculate weighted composite score
  let totalScore = 0;
  let totalWeight = 0;
  
  // Text matching weight
  if (input.query && input.query.trim()) {
    totalScore += textRelevance * 0.4;
    totalWeight += 0.4;
  }
  
  // Vector similarity weight
  if (vectorSimilarity !== undefined) {
    totalScore += vectorSimilarity * 0.3;
    totalWeight += 0.3;
  }
  
  // Semantic similarity weight
  if (semanticSimilarity !== undefined) {
    totalScore += semanticSimilarity * 0.2;
    totalWeight += 0.2;
  }
  
  // Filter relevance weight (always applied)
  totalScore += filterRelevance * 0.1;
  totalWeight += 0.1;
  
  // Normalize score
  const finalScore = totalWeight > 0 ? totalScore / totalWeight : 0;
  
  return {
    score: Math.min(1.0, Math.max(0.0, finalScore)),
    breakdown
  };
}

export async function search(input: SearchInput): Promise<SearchServiceResponse> {
  const searchStartTime = new Date().toISOString();
  const debugInfo: SearchServiceResponse['debug'] = {
    search_started: searchStartTime,
    total_records: 0,
    filtered_records: 0,
    vector_search_performed: false,
    semantic_search_performed: false,
    filter_breakdown: {},
    errors: [],
    debug_logs: []
  };

  // Collect debug logs instead of printing them
  const addDebugLog = (message: string, data?: any) => {
    const logEntry = debugLog(message, data);
    if (logEntry) {
      debugInfo.debug_logs!.push(logEntry);
    }
  };

  addDebugLog('Starting semantic search', { 
    query: input.query, 
    semantic_query: input.semantic_query,
    vector: input.vector,
    filters: Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined))
  });

  try {
    // Get all records from storage
    const allRecords = await getAllRecords();
    debugInfo.total_records = allRecords.length;
    addDebugLog(`Loaded ${allRecords.length} total records`);
    
    // Apply filters
    let filteredRecords = allRecords;
  
        // Filter by type
    if (input.type && input.type.length > 0) {
      const beforeCount = filteredRecords.length;
      filteredRecords = filteredRecords.filter(record => input.type!.includes(record.type));
      const afterCount = filteredRecords.length;
      debugInfo.filter_breakdown!.type_filter = beforeCount - afterCount;
      addDebugLog(`Type filter applied: ${beforeCount} -> ${afterCount} records`);
    }
    
    // Filter by experiencer
    if (input.experiencer) {
      const beforeCount = filteredRecords.length;
      filteredRecords = filteredRecords.filter(record => record.experiencer === input.experiencer);
      const afterCount = filteredRecords.length;
      debugInfo.filter_breakdown!.experiencer_filter = beforeCount - afterCount;
      addDebugLog(`Experiencer filter applied: ${beforeCount} -> ${afterCount} records`);
    }
    
    // Filter by perspective
    if (input.perspective) {
      const beforeCount = filteredRecords.length;
      filteredRecords = filteredRecords.filter(record => record.perspective === input.perspective);
      const afterCount = filteredRecords.length;
      debugInfo.filter_breakdown!.perspective_filter = beforeCount - afterCount;
      addDebugLog(`Perspective filter applied: ${beforeCount} -> ${afterCount} records`);
    }
    
    // Filter by processing
    if (input.processing) {
      const beforeCount = filteredRecords.length;
      filteredRecords = filteredRecords.filter(record => record.processing === input.processing);
      const afterCount = filteredRecords.length;
      debugInfo.filter_breakdown!.processing_filter = beforeCount - afterCount;
      addDebugLog(`Processing filter applied: ${beforeCount} -> ${afterCount} records`);
    }
    
    // Filter by contentType
    if (input.contentType) {
      const beforeCount = filteredRecords.length;
      filteredRecords = filteredRecords.filter(record => record.contentType === input.contentType);
      const afterCount = filteredRecords.length;
      debugInfo.filter_breakdown!.contentType_filter = beforeCount - afterCount;
      addDebugLog(`ContentType filter applied: ${beforeCount} -> ${afterCount} records`);
    }
    
    // Filter by crafted
    if (input.crafted !== undefined) {
      const beforeCount = filteredRecords.length;
      filteredRecords = filteredRecords.filter(record => record.crafted === input.crafted);
      const afterCount = filteredRecords.length;
      debugInfo.filter_breakdown!.crafted_filter = beforeCount - afterCount;
      addDebugLog(`Crafted filter applied: ${beforeCount} -> ${afterCount} records`);
    }
    
    // Apply temporal filters
    if (input.system_time || input.occurred) {
      const beforeCount = filteredRecords.length;
      if (input.system_time) {
        filteredRecords = applyTemporalFilter(filteredRecords, input.system_time, 'system_time');
      }
      if (input.occurred) {
        filteredRecords = applyTemporalFilter(filteredRecords, input.occurred, 'occurred');
      }
      const afterCount = filteredRecords.length;
      debugInfo.filter_breakdown!.temporal_filter = beforeCount - afterCount;
      addDebugLog(`Temporal filter applied: ${beforeCount} -> ${afterCount} records`);
    }

    // Experiential qualities min/max filtering
    const qualities: (keyof QualityVector)[] = [
      'embodied', 'attentional', 'affective', 'purposive', 'spatial', 'temporal', 'intersubjective'
    ];
    let qualitiesFilterCount = 0;
    for (const q of qualities) {
      const minKey = `min_${q}` as keyof SearchInput;
      const maxKey = `max_${q}` as keyof SearchInput;
      if (input[minKey] !== undefined) {
        const beforeCount = filteredRecords.length;
        filteredRecords = filteredRecords.filter(record => {
          const v = record.experiential_qualities?.vector?.[q];
          // Only include records that have the quality score and meet the minimum threshold
          return v !== undefined && v >= (input[minKey] as number);
        });
        qualitiesFilterCount += beforeCount - filteredRecords.length;
      }
      if (input[maxKey] !== undefined) {
        const beforeCount = filteredRecords.length;
        filteredRecords = filteredRecords.filter(record => {
          const v = record.experiential_qualities?.vector?.[q];
          // Only include records that have the quality score and meet the maximum threshold
          return v !== undefined && v <= (input[maxKey] as number);
        });
        qualitiesFilterCount += beforeCount - filteredRecords.length;
      }
    }
    if (qualitiesFilterCount > 0) {
      debugInfo.filter_breakdown!.qualities_filter = qualitiesFilterCount;
      addDebugLog(`Qualities filter applied: ${qualitiesFilterCount} records filtered`);
    }

    // Vector similarity search
    let vectorSimilarityMap: Record<string, number> = {};
    if (input.vector) {
      debugInfo.vector_search_performed = true;
      addDebugLog('Starting vector similarity search', { 
        vector: input.vector, 
        threshold: input.vector_similarity_threshold 
      });
      
      type WithSimilarity = typeof filteredRecords[number] & { _similarity?: number };
      const withSim: WithSimilarity[] = filteredRecords.map(record => {
        const v = record.experiential_qualities?.vector;
        if (!v) return { ...record, _similarity: undefined };
        // Convert QualityVector to Record<string, number> for cosineSimilarity, ensure all values are numbers
        const vObj: Record<string, number> = {
          embodied: v.embodied ?? 0,
          attentional: v.attentional ?? 0,
          affective: v.affective ?? 0,
          purposive: v.purposive ?? 0,
          spatial: v.spatial ?? 0,
          temporal: v.temporal ?? 0,
          intersubjective: v.intersubjective ?? 0
        };
        const sim = cosineSimilarity(input.vector!, vObj);
        return { ...record, _similarity: sim };
      });
      
      // Log top similarity scores
      const topScores = withSim
        .filter(r => r._similarity !== undefined)
        .sort((a, b) => (b._similarity ?? 0) - (a._similarity ?? 0))
        .slice(0, 10)
        .map(r => ({ id: r.id, score: r._similarity ?? 0 }));
      
      addDebugLog('Top 10 vector similarity scores', topScores);
      
      let filteredWithSim = withSim;
      if (input.vector_similarity_threshold !== undefined) {
        const beforeCount = filteredWithSim.length;
        filteredWithSim = filteredWithSim.filter(record => {
          return record._similarity !== undefined && record._similarity >= input.vector_similarity_threshold!;
        });
        const afterCount = filteredWithSim.length;
        debugInfo.filter_breakdown!.vector_threshold_filter = beforeCount - afterCount;
        addDebugLog(`Vector threshold filter applied: ${beforeCount} -> ${afterCount} records (threshold: ${input.vector_similarity_threshold})`);
      }
      
      // Save similarity for output
      vectorSimilarityMap = Object.fromEntries(filteredWithSim.map(r => [r.id, r._similarity ?? 0]));
      
      // Add to debug similarity scores
      if (!debugInfo.similarity_scores) debugInfo.similarity_scores = [];
      debugInfo.similarity_scores.push(...topScores.map(s => ({ ...s, type: 'vector' as const })));
      
      // Remove _similarity property for downstream code, but keep filteredRecords as SourceRecord[]
      filteredRecords = filteredWithSim.map(record => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _similarity, ...rest } = record;
        return rest as SourceRecord;
      });
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
        const errorInfo = logSearchError('semantic_search', error, { 
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

    // Apply sorting
    if (input.sort) {
      addDebugLog(`Applying sort: ${input.sort}`);
      finalRecords.sort((a, b) => {
        switch (input.sort) {
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
    }

    // Apply limit
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
      snippet: record.content.substring(0, 200) + (record.content.length > 200 ? '...' : ''),
      metadata: {
        contentType: record.contentType,
        perspective: record.perspective,
        experiencer: record.experiencer,
        processing: record.processing,
        crafted: record.crafted,
        system_time: record.system_time,
        occurred: record.occurred,
        experiential_qualities: record.experiential_qualities
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
    const errorInfo = logSearchError('search_execution', error, { input });
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

// Cosine similarity between two vectors
function cosineSimilarity(a: Record<string, number>, b: Record<string, number>): number {
  const keys: (keyof QualityVector)[] = ['embodied', 'attentional', 'affective', 'purposive', 'spatial', 'temporal', 'intersubjective'];
  let dot = 0, normA = 0, normB = 0;
  for (const k of keys) {
    const va = a[k] ?? 0;
    const vb = b[k] ?? 0;
    dot += va * vb;
    normA += va * va;
    normB += vb * vb;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Helper function to apply temporal filters
function applyTemporalFilter(records: SourceRecord[], filter: string | { start: string; end: string }, field: 'system_time' | 'occurred'): SourceRecord[] {
  // Basic temporal filtering implementation
  if (typeof filter === 'string') {
    // Single date filter
    const filterDate = new Date(filter);
    return records.filter(record => {
      const recordDate = new Date(record[field] || record.system_time);
      return recordDate.toDateString() === filterDate.toDateString();
    });
  } else {
    // Date range filter
    const startDate = filter.start ? new Date(filter.start) : null;
    const endDate = filter.end ? new Date(filter.end) : null;
    
    return records.filter(record => {
      const recordDate = new Date(record[field] || record.system_time);
      if (startDate && recordDate < startDate) return false;
      if (endDate && recordDate > endDate) return false;
      return true;
    });
  }
}

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