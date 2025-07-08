import type { SearchResult, SearchOptions, GroupedResults } from '../core/search.js';
import type { SourceRecord, StorageRecord } from '../core/types.js';
import { validateAndParseDate } from '../utils/validation.js';
import { findAllRelatedRecords } from '../core/search.js';

export interface SearchToolInput {
  query?: string;
  created?: string | { start: string; end: string };
  when?: string | { start: string; end: string };
  reflectedOn?: string;
  type?: Array<'source'>;
  experiencer?: string;
  perspective?: string;
  processing?: string;
  groupBy?: 'type' | 'experiencer' | 'day' | 'week' | 'month' | 'hierarchy';
  sort?: 'relevance' | 'created' | 'when';
  limit?: number;
  includeContext?: boolean;
}

export interface SearchServiceResult {
  results: SearchResult[] | GroupedResults;
  stats?: any;
}

export class SearchService {
  async search(input: SearchToolInput): Promise<SearchServiceResult> {
    // Build filters for created and when (explicit, no fallback)
    const filters: Record<string, unknown> = {};
    if (Array.isArray(input.type) && input.type.length > 0) filters.type = input.type;
    if (typeof input.experiencer === 'string' && input.experiencer.length > 0) filters.experiencers = [input.experiencer];
    if (typeof input.perspective === 'string' && input.perspective.length > 0) filters.perspectives = [input.perspective];
    if (typeof input.processing === 'string' && input.processing.length > 0) filters.processing = [input.processing];

    // Explicitly filter by 'created' (system timestamp, UTC)
    if (input.created) {
      try {
        const parsedRange = await validateAndParseDate(input.created);
        filters.createdRange = parsedRange;
      } catch (error) {
        throw new Error(`Error processing created date: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    // Explicitly filter by 'when' (user-supplied, UTC)
    if (input.when) {
      try {
        const parsedRange = await validateAndParseDate(input.when);
        filters.whenRange = parsedRange;
      } catch (error) {
        throw new Error(`Error processing when date: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    // Relationship search (optional pre-filter)
    let preFilteredRecords: StorageRecord[] | undefined = undefined;
    if (input.reflectedOn) {
      const { getAllRecords } = await import('../core/storage.js');
      const allRecords = await getAllRecords();
      // Use the new comprehensive relationship search that finds all related records
      preFilteredRecords = findAllRelatedRecords(input.reflectedOn, allRecords);
      
      if (preFilteredRecords.length === 0) {
        return { results: [] };
      }
      
      // If there's no query, return the relationship network directly
      if (!input.query || input.query.trim() === '') {
        const { getSearchableText } = await import('../core/storage.js');
        const results = preFilteredRecords.map(record => {
          const snippet = getSearchableText(record);
          return {
            type: record.type,
            id: record.id,
            snippet,
            source: record.type === 'source' ? record as SourceRecord : record as SourceRecord,
          };
        });
        
        return { results };
      }
    }
    
    // When calling search, construct a SearchOptions object with all required properties and use object spread for optional fields
    const searchOptions: SearchOptions = {
      query: input.query ?? '',
      filters,
      limit: input.limit,
      includeContext: input.includeContext,
    };
    if (typeof input.sort === 'string') searchOptions.sort = input.sort;
    const validGroups = ['day', 'week', 'month', 'experiencer'];
    if (typeof input.groupBy === 'string' && validGroups.includes(input.groupBy)) {
      searchOptions.groupBy = input.groupBy as 'day' | 'week' | 'month' | 'experiencer';
    }
    
    const searchResult = await (await import('../core/search.js')).search(searchOptions);
    const { results } = searchResult;
    
    // If preFilteredRecords is set, filter results to only those in preFilteredRecords
    let finalResults = results;
    if (preFilteredRecords) {
      const allowedIds = new Set(preFilteredRecords.map((r) => r.id));
      finalResults = (Array.isArray(results) ? results : results.groups.flatMap((g) => g.items)).filter((r) => allowedIds.has(r.id));
    }
    
    return { results: finalResults, stats: searchResult.stats };
  }
} 