import { SourceRecord } from '../core/types.js';
import { getAllRecords } from '../core/storage.js';
import type { QualityVector } from '../core/types.js';
import { embeddingService } from './embeddings.js';
import { vectorStore } from './vector-store.js';

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
  // Get all records from storage
  const allRecords = await getAllRecords();
  
  // Apply filters
  let filteredRecords = allRecords;
  
  // Filter by type
  if (input.type && input.type.length > 0) {
    filteredRecords = filteredRecords.filter(record => input.type!.includes(record.type));
  }
  
  // Filter by experiencer
  if (input.experiencer) {
    filteredRecords = filteredRecords.filter(record => record.experiencer === input.experiencer);
  }
  
  // Filter by perspective
  if (input.perspective) {
    filteredRecords = filteredRecords.filter(record => record.perspective === input.perspective);
  }
  
  // Filter by processing
  if (input.processing) {
    filteredRecords = filteredRecords.filter(record => record.processing === input.processing);
  }
  
  // Filter by contentType
  if (input.contentType) {
    filteredRecords = filteredRecords.filter(record => record.contentType === input.contentType);
  }
  
  // Filter by crafted
  if (input.crafted !== undefined) {
    filteredRecords = filteredRecords.filter(record => record.crafted === input.crafted);
  }
  
  // Apply temporal filters
  if (input.system_time) {
    filteredRecords = applyTemporalFilter(filteredRecords, input.system_time, 'system_time');
  }
  
  if (input.occurred) {
    filteredRecords = applyTemporalFilter(filteredRecords, input.occurred, 'occurred');
  }

  // Experiential qualities min/max filtering
  const qualities: (keyof QualityVector)[] = [
    'embodied', 'attentional', 'affective', 'purposive', 'spatial', 'temporal', 'intersubjective'
  ];
  for (const q of qualities) {
    const minKey = `min_${q}` as keyof SearchInput;
    const maxKey = `max_${q}` as keyof SearchInput;
    if (input[minKey] !== undefined) {
      filteredRecords = filteredRecords.filter(record => {
        const v = record.experiential_qualities?.vector?.[q];
        // Only include records that have the quality score and meet the minimum threshold
        return v !== undefined && v >= (input[minKey] as number);
      });
    }
    if (input[maxKey] !== undefined) {
      filteredRecords = filteredRecords.filter(record => {
        const v = record.experiential_qualities?.vector?.[q];
        // Only include records that have the quality score and meet the maximum threshold
        return v !== undefined && v <= (input[maxKey] as number);
      });
    }
  }

  // Vector similarity search
  let vectorSimilarityMap: Record<string, number> = {};
  if (input.vector) {
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
    let filteredWithSim = withSim;
    if (input.vector_similarity_threshold !== undefined) {
      filteredWithSim = filteredWithSim.filter(record => {
        return record._similarity !== undefined && record._similarity >= input.vector_similarity_threshold!;
      });
    }
    // Save similarity for output
    vectorSimilarityMap = Object.fromEntries(filteredWithSim.map(r => [r.id, r._similarity ?? 0]));
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
    try {
      // Generate embedding for the semantic query
      const queryEmbedding = await embeddingService.generateEmbedding(input.semantic_query);
      // Validate and potentially clean up vectors before searching
      const validation = await vectorStore.validateVectors(queryEmbedding.length);
      if (validation.invalid > 0) {
        console.warn(`Found ${validation.invalid} vectors with mismatched dimensions. Cleaning up...`);
        console.warn('Invalid vectors:', validation.details.slice(0, 5)); // Show first 5
        const removed = await vectorStore.removeInvalidVectors(queryEmbedding.length);
        console.log(`Removed ${removed} invalid vectors`);
      }
      // Find similar vectors in the vector store
      let similarResults = await vectorStore.findSimilar(
        queryEmbedding, 
        input.limit || 50, 
        input.semantic_threshold || 0.7
      );
      // Fallback: if no results and threshold > 0.4, try again with lower threshold
      if (similarResults.length === 0 && (input.semantic_threshold === undefined || input.semantic_threshold > 0.4)) {
        console.warn('No semantic results found, retrying with lower threshold 0.4');
        similarResults = await vectorStore.findSimilar(
          queryEmbedding,
          input.limit || 50,
          0.4
        );
      }
      // Filter records to only include semantically similar ones
      const semanticIds = new Set(similarResults.map(r => r.id));
      filteredRecords = filteredRecords.filter(record => semanticIds.has(record.id));
      // Add semantic similarity scores to the similarity map
      for (const result of similarResults) {
        semanticSimilarityMap[result.id] = result.similarity;
      }
    } catch (error) {
      console.warn('Semantic search failed:', error);
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
    finalRecords = finalRecords.filter(r => r._relevance.breakdown.text_match > 0);
  }

  // Apply sorting
  if (input.sort) {
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
    finalRecords.splice(input.limit);
  }

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
    filters: Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined && v !== ''))
  };
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