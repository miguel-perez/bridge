/**
 * Core search functionality for Bridge experiential data.
 * Provides semantic search, filtering, and sorting capabilities.
 */

import type { SourceRecord } from './types.js';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default values for search fields */
export const FIELD_DEFAULTS = {
  PERSPECTIVE: 'I',
  WHO: 'self',
  PROCESSING: 'during',
} as const;

/** Valid sort options */
export const SORT_OPTIONS = ['relevance', 'created'] as const;

/** Valid filter types */
export const FILTER_TYPES = [
  'who',
  'perspective',
  'processing',
  'timeRange',
  'systemTimeRange',
] as const;

// ============================================================================
// TYPES
// ============================================================================

/** Sort option type */
export type SortOption = (typeof SORT_OPTIONS)[number];

/** Filter type */
export type FilterType = (typeof FILTER_TYPES)[number];

/** Time range filter */
export interface TimeRange {
  start?: string;
  end?: string;
}

/** System time range filter */
export interface SystemTimeRange {
  start: string;
  end: string;
}

/** Advanced filter options */
export interface FilterOptions {
  who?: string[];
  perspectives?: string[];
  processing?: string[];
  timeRange?: TimeRange;
  systemTimeRange?: SystemTimeRange;
}

/** Search result with relevance score */
export interface SearchResult {
  type: 'source';
  id: string;
  relevance: number;
  snippet: string;
  source: SourceRecord;
}

/** Filter statistics */
export interface FilterStats {
  initial: number;
  final: number;
  afterWho?: number;
  afterPerspectives?: number;
  afterProcessing?: number;
  afterTimeRange?: number;
  afterSystemTimeRange?: number;
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates filter options.
 * @param filters - The filter options to validate
 * @throws Error if filters are invalid
 */
function validateFilterOptions(filters: FilterOptions): void {
  if (filters.timeRange) {
    if (filters.timeRange.start && isNaN(Date.parse(filters.timeRange.start))) {
      throw new Error('Invalid timeRange.start date');
    }
    if (filters.timeRange.end && isNaN(Date.parse(filters.timeRange.end))) {
      throw new Error('Invalid timeRange.end date');
    }
  }

  if (filters.systemTimeRange) {
    if (isNaN(Date.parse(filters.systemTimeRange.start))) {
      throw new Error('Invalid systemTimeRange.start date');
    }
    if (isNaN(Date.parse(filters.systemTimeRange.end))) {
      throw new Error('Invalid systemTimeRange.end date');
    }
  }
}

/**
 * Gets the created date from a source record.
 * @param record - The source record
 * @returns The created date or null if not available
 */
function getCreatedDate(record: SourceRecord): Date | null {
  if (!record.created) return null;
  const date = new Date(record.created);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Gets the system time date from a source record.
 * @param record - The source record
 * @returns The system time date or null if not available
 */
function getSystemTimeDate(record: SourceRecord): Date | null {
  if (!record.created) return null;
  const date = new Date(record.created);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Checks if a date is within a range.
 * @param date - The date to check
 * @param start - Start of range (optional)
 * @param end - End of range (optional)
 * @returns True if the date is within the range
 */
function isWithinRange(date: Date, start?: Date, end?: Date): boolean {
  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
}

// ============================================================================
// FILTERING FUNCTIONS
// ============================================================================

/**
 * Applies advanced filters to search results with impact tracking.
 * @param results - The search results to filter
 * @param filters - The filter options to apply
 * @returns Filtered results and statistics
 */
export function advancedFilters(
  results: SearchResult[],
  filters?: FilterOptions
): { filtered: SearchResult[]; stats: FilterStats } {
  if (!filters) {
    return {
      filtered: results,
      stats: { initial: results.length, final: results.length },
    };
  }

  // Validate filters
  validateFilterOptions(filters);

  const stats: FilterStats = {
    initial: results.length,
    final: results.length,
  };

  let filtered = results;

  // Time range filter (timeRange) - uses created date
  if (filters.timeRange) {
    filtered = filtered.filter((result) => {
      const recDate = getCreatedDate(result.source) || getSystemTimeDate(result.source);
      const start = filters.timeRange!.start ? new Date(filters.timeRange!.start) : undefined;
      const end = filters.timeRange!.end ? new Date(filters.timeRange!.end) : undefined;
      return recDate && isWithinRange(recDate, start, end);
    });
    stats.afterTimeRange = filtered.length;
  }

  // System time range filter
  if (filters.systemTimeRange) {
    filtered = filtered.filter((result) => {
      const recDate = getSystemTimeDate(result.source);
      const start = new Date(filters.systemTimeRange!.start);
      const end = new Date(filters.systemTimeRange!.end);
      return recDate && isWithinRange(recDate, start, end);
    });
    stats.afterSystemTimeRange = filtered.length;
  }

  // Who filter
  if (filters.who && filters.who.length > 0) {
    filtered = filtered.filter((result) => {
      const who = result.source.who || FIELD_DEFAULTS.WHO;
      // Handle both string and string array
      if (Array.isArray(who)) {
        return who.some((w) => filters.who!.includes(w));
      }
      return filters.who!.includes(who);
    });
    stats.afterWho = filtered.length;
  }

  // Removed perspective and processing filters

  stats.final = filtered.length;
  return { filtered, stats };
}

// ============================================================================
// SORTING FUNCTIONS
// ============================================================================

/**
 * Sorts search results by the specified option.
 * @param results - The search results to sort
 * @param sortBy - The sort option to use
 * @returns Sorted search results
 */
export function sortResults(results: SearchResult[], sortBy: SortOption): SearchResult[] {
  const sorted = [...results];

  switch (sortBy) {
    case 'relevance': {
      return sorted.sort((a, b) => b.relevance - a.relevance);
    }

    case 'created': {
      return sorted.sort((a, b) => {
        const aCreated = getCreatedDate(a.source);
        const bCreated = getCreatedDate(b.source);
        if (!aCreated || !bCreated) return 0;
        return bCreated.getTime() - aCreated.getTime();
      });
    }

    default: {
      return sorted;
    }
  }
}

// ============================================================================
// MAIN SEARCH FUNCTION
// ============================================================================

/**
 * Performs a semantic search on experiential data
 * @remarks
 * Note: Semantic search functionality has been moved to the search service.
 * This function is maintained for backward compatibility but returns empty results.
 * Use the search service for full semantic search capabilities.
 * @param query - The search query
 * @param options - Search options
 * @returns Search results with relevance scores
 */
export async function semanticSearch(
  query: string,
  options: {
    limit?: number;
    threshold?: number;
    filters?: FilterOptions;
    sortBy?: SortOption;
  } = {}
): Promise<SearchResult[]> {
  // Parameters unused - semantic search moved to search service
  void options;
  void query;

  // Semantic search functionality has been moved to the search service
  // This function is maintained for backward compatibility only
  return [];
}
