// Simplified search functionality for sources only
import type { SourceRecord } from './types.js';
import { generateEmbedding, queryEmbedding } from './embeddings.js';

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
  createdRange?: { start: string; end: string };
  whenRange?: { start: string; end: string };
}

export type SortOption = 'relevance' | 'created' | 'when';
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
  afterCreatedRange?: number;
  afterWhenRange?: number;
  afterExperiencers?: number;
  afterPerspectives?: number;
  afterProcessing?: number;
  final: number;
}

// Core semantic similarity search
export async function semanticSearch(): Promise<SearchResult[]> {
  return [];
}

// Helper: check if a date is within a range
function isWithinRange(date: Date, start?: Date, end?: Date): boolean {
  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
}

// Helper: normalize date to start of day for consistent comparison
function normalizeToStartOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// Helper: normalize date to end of day for consistent comparison
function normalizeToEndOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

// Helper: get date from record
function getRecordDate(record: SourceRecord): Date | null {
  if (record.created) return new Date(record.created);
  if (record.when) return new Date(record.when);
  return null;
}

// Helper: get created date specifically
function getCreatedDate(record: SourceRecord): Date | null {
  if (record.created) return new Date(record.created);
  return null;
}

// Helper: get when date specifically
function getWhenDate(record: SourceRecord): Date | null {
  if (record.when) return new Date(record.when);
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
  
  // Time range filter (timeRange)
  if (filters.timeRange) {
    filtered = filtered.filter(result => {
      const recDate = getRecordDate(result.source);
      const start = filters.timeRange!.start ? new Date(filters.timeRange!.start) : undefined;
      const end = filters.timeRange!.end ? new Date(filters.timeRange!.end) : undefined;
      return recDate && isWithinRange(recDate, start, end);
    });
    stats.afterTimeRange = filtered.length;
  }
  
  // Created range filter
  if (filters.createdRange) {
    filtered = filtered.filter(result => {
      const recDate = getCreatedDate(result.source);
      const start = new Date(filters.createdRange!.start);
      const end = new Date(filters.createdRange!.end);
      return recDate && isWithinRange(recDate, start, end);
    });
    stats.afterCreatedRange = filtered.length;
  }
  
  // When range filter
  if (filters.whenRange) {
    filtered = filtered.filter(result => {
      const recDate = getWhenDate(result.source);
      const start = new Date(filters.whenRange!.start);
      const end = new Date(filters.whenRange!.end);
      return recDate && isWithinRange(recDate, start, end);
    });
    stats.afterWhenRange = filtered.length;
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
      case 'day':
        const date = getRecordDate(result.source);
        key = date ? date.toISOString().split('T')[0] : 'Unknown';
        break;
      case 'week':
        const weekDate = getRecordDate(result.source);
        if (weekDate) {
          const startOfWeek = new Date(weekDate);
          startOfWeek.setDate(weekDate.getDate() - weekDate.getDay());
          key = startOfWeek.toISOString().split('T')[0];
        } else {
          key = 'Unknown';
        }
        break;
      case 'month':
        const monthDate = getRecordDate(result.source);
        key = monthDate ? `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}` : 'Unknown';
        break;
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
        case 'created':
          const aCreated = getCreatedDate(a.source);
          const bCreated = getCreatedDate(b.source);
          if (!aCreated || !bCreated) return 0;
          return bCreated.getTime() - aCreated.getTime();
        case 'when':
          const aWhen = getWhenDate(a.source);
          const bWhen = getWhenDate(b.source);
          if (!aWhen || !bWhen) return 0;
          return bWhen.getTime() - aWhen.getTime();
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

// Find related records
export function findAllRelatedRecords(recordId: string, allRecords: SourceRecord[]): SourceRecord[] {
  const related: SourceRecord[] = [];
  const processed = new Set<string>();
  
  function addRelated(record: SourceRecord) {
    if (processed.has(record.id)) return;
    processed.add(record.id);
    related.push(record);
    
    // Add records this one reflects on
    if (record.reflects_on) {
      for (const refId of record.reflects_on) {
        const refRecord = allRecords.find(r => r.id === refId);
        if (refRecord) addRelated(refRecord);
      }
    }
    
    // Add records that reflect on this one
    const reflections = allRecords.filter(r => r.reflects_on?.includes(record.id));
    for (const reflection of reflections) {
      addRelated(reflection);
    }
  }
  
  const startRecord = allRecords.find(r => r.id === recordId);
  if (startRecord) {
    addRelated(startRecord);
  }
  
  return related;
}

// Find records that this record reflects on
export function findReflectsOnRecords(recordId: string, allRecords: SourceRecord[]): SourceRecord[] {
  const record = allRecords.find(r => r.id === recordId);
  if (!record || !record.reflects_on) return [];
  
  return allRecords.filter(r => record.reflects_on!.includes(r.id));
}

// Find records that reflect on this record
export function findReflectionsAbout(recordId: string, allRecords: SourceRecord[]): SourceRecord[] {
  return allRecords.filter(r => r.reflects_on?.includes(recordId));
}

// Helper functions for sorting
function getCreated(result: SearchResult): string {
  return result.source.created;
}

function getWhen(result: SearchResult): string {
  return result.source.when || result.source.created;
} 