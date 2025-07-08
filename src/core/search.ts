// Simplified search functionality for sources only
import type { SourceRecord } from './types.js';

// For temporal parsing
import * as chrono from 'chrono-node';

export interface SearchResult {
  type: 'source';
  id: string;
  relevance?: number;
  snippet?: string;
  source: SourceRecord;
}

export interface FilterOptions {
  experiencer?: string;
  experiencers?: string[];
  perspectives?: string[];
  processing?: string[];
  timeRange?: { start?: string; end?: string };
  systemTimeRange?: { start: string; end: string };
  occurredRange?: { start: string; end: string };
}

export type SortOption = 'relevance' | 'system_time' | 'occurred';
export type GroupOption = 'none' | 'day' | 'week' | 'month' | 'experiencer';

export interface SearchOptions {
  query: string;
  mode?: 'similarity' | 'temporal' | 'relationship';
  filters?: FilterOptions;
  sort?: SortOption;
  groupBy?: GroupOption;
  limit?: number;
  includeContext?: boolean;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface GroupedResults {
  groups: Array<{
    label: string;
    count: number;
    items: SearchResult[];
  }>;
  totalResults: number;
}

// Filter impact tracking interface
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



// Helper: check if a date is within a range
function isWithinRange(date: Date, start?: Date, end?: Date): boolean {
  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
}



// Helper: get occurred date specifically
function getOccurredDate(record: SourceRecord): Date | null {
  if (record.occurred) return new Date(record.occurred);
  return null;
}

// Helper: get system_time date specifically
function getSystemTimeDate(record: SourceRecord): Date | null {
  if (record.system_time) return new Date(record.system_time);
  return null;
}

// Advanced filtering with impact tracking
export function advancedFilters(results: SearchResult[], filters?: FilterOptions): { filtered: SearchResult[], stats: FilterStats } {
  if (!filters) return { filtered: results, stats: { initial: results.length, final: results.length } };
  
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
      const experiencer = result.source.experiencer || 'self';
      return filters.experiencers!.includes(experiencer);
    });
    stats.afterExperiencers = filtered.length;
  }
  
  // Perspectives filter
  if (filters.perspectives && filters.perspectives.length > 0) {
    filtered = filtered.filter(result => {
      const perspective = result.source.perspective || 'I';
      return filters.perspectives!.includes(perspective);
    });
    stats.afterPerspectives = filtered.length;
  }
  
  // Processing filter
  if (filters.processing && filters.processing.length > 0) {
    filtered = filtered.filter(result => {
      const processing = result.source.processing || 'during';
      return filters.processing!.includes(processing);
    });
    stats.afterProcessing = filtered.length;
  }
  
  stats.final = filtered.length;
  return { filtered, stats };
}

// Helper: get experiencer for grouping
function getExperiencer(result: SearchResult): string {
  return result.source.experiencer || 'self';
}

// Group results by various criteria
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

// Main search function
export async function search(options: SearchOptions): Promise<{ results: SearchResult[] | GroupedResults, stats?: FilterStats }> {
  const { getSources } = await import('./storage.js');
  const sources = await getSources();
  
  // Convert sources to search results
  let results: SearchResult[] = sources.map(source => ({
    type: 'source',
    id: source.id,
    source
  }));
  
  // Apply filters
  const { filtered, stats } = advancedFilters(results, options.filters);
  results = filtered;
  
  // Apply search query
  if (options.query.trim()) {
    const query = options.query.toLowerCase();
    results = results.filter(result => {
      return result.source.content.toLowerCase().includes(query);
    });
  }
  
  // Apply sorting
  if (options.sort) {
    results.sort((a, b) => {
      switch (options.sort) {
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
  if (options.limit) {
    results = results.slice(0, options.limit);
  }
  
  // Apply grouping
  if (options.groupBy && options.groupBy !== 'none') {
    const grouped = groupResults(results, options.groupBy);
    return { results: grouped, stats };
  }
  
  return { results, stats };
}

// Parse temporal queries
export function parseTemporalQuery(query: string): { dateRange?: DateRange, cleanQuery: string } {
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

// Find all records related to a given record (for relationship search)
export function findAllRelatedRecords(recordId: string, allRecords: SourceRecord[]): SourceRecord[] {
  const related = new Set<string>();
  const toProcess = [recordId];
  
  while (toProcess.length > 0) {
    const currentId = toProcess.shift()!;
    const record = allRecords.find(r => r.id === currentId);
    if (!record) continue;
    
    // Add the record itself
    related.add(record.id);
    
    // Find records that reference this one (for future graph features)
    // This is a placeholder for when we add graph relationships
  }
  
  return allRecords.filter(r => related.has(r.id));
} 