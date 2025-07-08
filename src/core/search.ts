/**
 * Core search functionality for Bridge experiential data.
 * Provides semantic, temporal, and relationship-based search capabilities
 * with advanced filtering, sorting, and grouping options.
 */

import type { SourceRecord } from './types.js';
import * as chrono from 'chrono-node';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default search configuration values */
export const SEARCH_DEFAULTS = {
  LIMIT: 50,
  GROUP_BY: 'none' as const,
  SORT: 'relevance' as const,
  MODE: 'similarity' as const
} as const;

/** Valid search modes */
export const SEARCH_MODES = ['similarity', 'temporal', 'relationship'] as const;

/** Valid sort options */
export const SORT_OPTIONS = ['relevance', 'system_time', 'occurred'] as const;

/** Valid grouping options */
export const GROUP_OPTIONS = ['none', 'day', 'week', 'month', 'experiencer'] as const;

/** Default values for experiential data fields */
export const FIELD_DEFAULTS = {
  EXPERIENCER: 'self',
  PERSPECTIVE: 'I',
  PROCESSING: 'during'
} as const;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * A search result containing source data and metadata.
 */
export interface SearchResult {
  type: 'source';
  id: string;
  relevance?: number;
  snippet?: string;
  source: SourceRecord;
}

/**
 * Filter options for narrowing search results.
 */
export interface FilterOptions {
  experiencer?: string;
  experiencers?: string[];
  perspectives?: string[];
  processing?: string[];
  timeRange?: { start?: string; end?: string };
  systemTimeRange?: { start: string; end: string };
  occurredRange?: { start: string; end: string };
}

/** Valid sort options for search results */
export type SortOption = typeof SORT_OPTIONS[number];

/** Valid grouping options for search results */
export type GroupOption = typeof GROUP_OPTIONS[number];

/** Valid search modes */
export type SearchMode = typeof SEARCH_MODES[number];

/**
 * Complete search configuration options.
 */
export interface SearchOptions {
  query: string;
  mode?: SearchMode;
  filters?: FilterOptions;
  sort?: SortOption;
  groupBy?: GroupOption;
  limit?: number;
  includeContext?: boolean;
}

/**
 * Date range for temporal filtering.
 */
export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Grouped search results with metadata.
 */
export interface GroupedResults {
  groups: Array<{
    label: string;
    count: number;
    items: SearchResult[];
  }>;
  totalResults: number;
}

/**
 * Statistics tracking the impact of each filter stage.
 */
export interface FilterStats {
  initial: number;
  afterTimeRange?: number;
  afterSystemTimeRange?: number;
  afterEventTimeRange?: number;
  afterExperiencers?: number;
  afterPerspectives?: number;
  afterProcessing?: number;
  final: number;
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates search options and provides defaults.
 * @param options - The search options to validate
 * @returns Validated options with defaults applied
 * @throws Error if options are invalid
 */
export function validateSearchOptions(options: Partial<SearchOptions>): SearchOptions {
  if (!options.query) {
    throw new Error('Search query is required');
  }

  if (options.mode && !SEARCH_MODES.includes(options.mode)) {
    throw new Error(`Invalid search mode: ${options.mode}. Valid modes: ${SEARCH_MODES.join(', ')}`);
  }

  if (options.sort && !SORT_OPTIONS.includes(options.sort)) {
    throw new Error(`Invalid sort option: ${options.sort}. Valid options: ${SORT_OPTIONS.join(', ')}`);
  }

  if (options.groupBy && !GROUP_OPTIONS.includes(options.groupBy)) {
    throw new Error(`Invalid group option: ${options.groupBy}. Valid options: ${GROUP_OPTIONS.join(', ')}`);
  }

  if (options.limit !== undefined && (options.limit < 1 || options.limit > 1000)) {
    throw new Error('Limit must be between 1 and 1000');
  }

  return {
    query: options.query,
    mode: options.mode || SEARCH_DEFAULTS.MODE,
    filters: options.filters,
    sort: options.sort || SEARCH_DEFAULTS.SORT,
    groupBy: options.groupBy || SEARCH_DEFAULTS.GROUP_BY,
    limit: options.limit || SEARCH_DEFAULTS.LIMIT,
    includeContext: options.includeContext || false
  };
}

/**
 * Validates filter options.
 * @param filters - The filter options to validate
 * @returns True if filters are valid
 * @throws Error if filters are invalid
 */
export function validateFilterOptions(filters?: FilterOptions): boolean {
  if (!filters) return true;

  // Validate date ranges
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

  if (filters.occurredRange) {
    if (isNaN(Date.parse(filters.occurredRange.start))) {
      throw new Error('Invalid occurredRange.start date');
    }
    if (isNaN(Date.parse(filters.occurredRange.end))) {
      throw new Error('Invalid occurredRange.end date');
    }
  }

  return true;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Checks if a date is within a specified range.
 * @param date - The date to check
 * @param start - Optional start date (inclusive)
 * @param end - Optional end date (inclusive)
 * @returns True if the date is within the range
 */
function isWithinRange(date: Date, start?: Date, end?: Date): boolean {
  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
}

/**
 * Gets the occurred date from a source record.
 * @param record - The source record
 * @returns The occurred date or null if not available
 */
function getOccurredDate(record: SourceRecord): Date | null {
  if (!record.occurred) return null;
  const date = new Date(record.occurred);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Gets the system time date from a source record.
 * @param record - The source record
 * @returns The system time date or null if not available
 */
function getSystemTimeDate(record: SourceRecord): Date | null {
  if (!record.system_time) return null;
  const date = new Date(record.system_time);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Gets the experiencer from a search result.
 * @param result - The search result
 * @returns The experiencer or default value
 */
function getExperiencer(result: SearchResult): string {
  return result.source.experiencer || FIELD_DEFAULTS.EXPERIENCER;
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
export function advancedFilters(results: SearchResult[], filters?: FilterOptions): { filtered: SearchResult[], stats: FilterStats } {
  if (!filters) {
    return { 
      filtered: results, 
      stats: { initial: results.length, final: results.length } 
    };
  }

  // Validate filters
  validateFilterOptions(filters);
  
  const stats: FilterStats = {
    initial: results.length,
    final: results.length
  };
  
  let filtered = results;
  
  // Time range filter (timeRange) - uses occurred date
  if (filters.timeRange) {
    filtered = filtered.filter(result => {
      const recDate = getOccurredDate(result.source) || getSystemTimeDate(result.source);
      const start = filters.timeRange!.start ? new Date(filters.timeRange!.start) : undefined;
      const end = filters.timeRange!.end ? new Date(filters.timeRange!.end) : undefined;
      return recDate && isWithinRange(recDate, start, end);
    });
    stats.afterTimeRange = filtered.length;
  }
  
  // System time range filter
  if (filters.systemTimeRange) {
    filtered = filtered.filter(result => {
      const recDate = getSystemTimeDate(result.source);
      const start = new Date(filters.systemTimeRange!.start);
      const end = new Date(filters.systemTimeRange!.end);
      return recDate && isWithinRange(recDate, start, end);
    });
    stats.afterSystemTimeRange = filtered.length;
  }
  
  // Occurred time range filter
  if (filters.occurredRange) {
    filtered = filtered.filter(result => {
      const recDate = getOccurredDate(result.source);
      const start = new Date(filters.occurredRange!.start);
      const end = new Date(filters.occurredRange!.end);
      return recDate && isWithinRange(recDate, start, end);
    });
    stats.afterEventTimeRange = filtered.length;
  }
  
  // Experiencers filter
  if (filters.experiencers && filters.experiencers.length > 0) {
    filtered = filtered.filter(result => {
      const experiencer = result.source.experiencer || FIELD_DEFAULTS.EXPERIENCER;
      return filters.experiencers!.includes(experiencer);
    });
    stats.afterExperiencers = filtered.length;
  }
  
  // Perspectives filter
  if (filters.perspectives && filters.perspectives.length > 0) {
    filtered = filtered.filter(result => {
      const perspective = result.source.perspective || FIELD_DEFAULTS.PERSPECTIVE;
      return filters.perspectives!.includes(perspective);
    });
    stats.afterPerspectives = filtered.length;
  }
  
  // Processing filter
  if (filters.processing && filters.processing.length > 0) {
    filtered = filtered.filter(result => {
      const processing = result.source.processing || FIELD_DEFAULTS.PROCESSING;
      return filters.processing!.includes(processing);
    });
    stats.afterProcessing = filtered.length;
  }
  
  stats.final = filtered.length;
  return { filtered, stats };
}

// ============================================================================
// GROUPING FUNCTIONS
// ============================================================================

/**
 * Groups search results by various criteria.
 * @param results - The search results to group
 * @param groupBy - The grouping criteria
 * @returns Grouped results with metadata
 */
export function groupResults(results: SearchResult[], groupBy: GroupOption = 'none'): GroupedResults {
  if (groupBy === 'none') {
    return {
      groups: [{ label: 'All Results', count: results.length, items: results }],
      totalResults: results.length
    };
  }
  
  const groups = new Map<string, SearchResult[]>();
  
  for (const result of results) {
    let key = '';
    
    switch (groupBy) {
      case 'day': {
        const date = getOccurredDate(result.source) || getSystemTimeDate(result.source);
        key = date ? date.toISOString().split('T')[0] : 'Unknown';
        break;
      }
      case 'week': {
        const weekDate = getOccurredDate(result.source) || getSystemTimeDate(result.source);
        if (weekDate) {
          const startOfWeek = new Date(weekDate);
          startOfWeek.setDate(weekDate.getDate() - weekDate.getDay());
          key = startOfWeek.toISOString().split('T')[0];
        } else {
          key = 'Unknown';
        }
        break;
      }
      case 'month': {
        const monthDate = getOccurredDate(result.source) || getSystemTimeDate(result.source);
        key = monthDate ? `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}` : 'Unknown';
        break;
      }
      case 'experiencer':
        key = getExperiencer(result);
        break;
    }
    
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(result);
  }
  
  const sortedGroups = Array.from(groups.entries())
    .map(([label, items]) => ({ label, count: items.length, items }))
    .sort((a, b) => b.count - a.count);
  
  return {
    groups: sortedGroups,
    totalResults: results.length
  };
}

// ============================================================================
// MAIN SEARCH FUNCTION
// ============================================================================

/**
 * Performs a comprehensive search across experiential data.
 * @param options - Search configuration options
 * @returns Search results and optional statistics
 */
export async function search(options: SearchOptions): Promise<{ results: SearchResult[] | GroupedResults, stats?: FilterStats }> {
  // Validate and normalize options
  const validatedOptions = validateSearchOptions(options);
  
  const { getSources } = await import('./storage.js');
  const sources = await getSources();
  
  // Convert sources to search results
  let results: SearchResult[] = sources.map(source => ({
    type: 'source',
    id: source.id,
    source
  }));
  
  // Apply filters
  const { filtered, stats } = advancedFilters(results, validatedOptions.filters);
  results = filtered;
  
  // Apply search query
  if (validatedOptions.query.trim()) {
    const query = validatedOptions.query.toLowerCase();
    results = results.filter(result => {
      return result.source.content.toLowerCase().includes(query);
    });
  }
  
  // Apply sorting
  if (validatedOptions.sort) {
    results.sort((a, b) => {
      switch (validatedOptions.sort) {
        case 'system_time': {
          const aSystemTime = getSystemTimeDate(a.source);
          const bSystemTime = getSystemTimeDate(b.source);
          if (!aSystemTime || !bSystemTime) return 0;
          return bSystemTime.getTime() - aSystemTime.getTime();
        }
        case 'occurred': {
          const aOccurred = getOccurredDate(a.source);
          const bOccurred = getOccurredDate(b.source);
          if (!aOccurred || !bOccurred) return 0;
          return bOccurred.getTime() - aOccurred.getTime();
        }
        case 'relevance':
        default:
          return (b.relevance || 0) - (a.relevance || 0);
      }
    });
  }
  
  // Apply limit
  if (validatedOptions.limit) {
    results = results.slice(0, validatedOptions.limit);
  }
  
  // Apply grouping
  if (validatedOptions.groupBy && validatedOptions.groupBy !== 'none') {
    const grouped = groupResults(results, validatedOptions.groupBy);
    return { results: grouped, stats };
  }
  
  return { results, stats };
}

// ============================================================================
// TEMPORAL SEARCH FUNCTIONS
// ============================================================================

/**
 * Parses temporal expressions from search queries.
 * @param query - The search query to parse
 * @returns Date range and cleaned query
 */
export function parseTemporalQuery(query: string): { dateRange?: DateRange, cleanQuery: string } {
  if (!query.trim()) {
    return { cleanQuery: query };
  }

  const parsed = chrono.parse(query);
  if (parsed.length === 0) {
    return { cleanQuery: query };
  }
  
  const dateRange: DateRange = {
    start: parsed[0].start.date(),
    end: parsed[0].end ? parsed[0].end.date() : parsed[0].start.date()
  };
  
  const cleanQuery = query.replace(parsed[0].text, '').trim();
  return { dateRange, cleanQuery };
}

// ============================================================================
// RELATIONSHIP SEARCH FUNCTIONS
// ============================================================================

/**
 * Finds all records related to a given record (placeholder for future graph features).
 * @param recordId - The ID of the record to find relationships for
 * @param allRecords - All available records
 * @returns Related records
 */
export function findAllRelatedRecords(recordId: string, allRecords: SourceRecord[]): SourceRecord[] {
  const related = new Set<string>();
  const toProcess = [recordId];
  
  while (toProcess.length > 0) {
    const currentId = toProcess.shift()!;
    const record = allRecords.find(r => r.id === currentId);
    if (!record) continue;
    
    // Add the record itself
    related.add(record.id);
    
    // TODO: Implement graph relationship logic when graph features are added
    // This is a placeholder for future relationship search capabilities
  }
  
  return allRecords.filter(r => related.has(r.id));
} 