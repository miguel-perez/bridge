import type { SourceRecord, MomentRecord, SceneRecord } from './types.js';
import type { QualityType } from './types.js';
import { getAllRecords, getSearchableText } from './storage.js';
import { loadEmbeddings, generateEmbedding, cosineSimilarity } from './embeddings.js';

// For temporal parsing
import * as chrono from 'chrono-node';

export interface SearchResult {
  type: 'source' | 'moment' | 'scene';
  id: string;
  relevance?: number;
  snippet?: string;
  source?: SourceRecord;
  moment?: MomentRecord;
  scene?: SceneRecord;
}

export interface FilterOptions {
  type?: Array<'source' | 'moment' | 'scene'>;
  experiencer?: string;
  qualities?: string[];
  // Advanced filters
  types?: Array<'source' | 'moment' | 'scene'>;
  timeRange?: { start?: string; end?: string };
  hasQualities?: string[]; // QualityType[]
  experiencers?: string[];
  perspectives?: string[]; // Perspective[]
  processing?: string[]; // ProcessingLevel[]
  shotTypes?: string[]; // ShotType[]
  framed?: boolean;
}

export type SortOption = 'relevance' | 'created' | 'when';
export type GroupOption = 'none' | 'day' | 'week' | 'month' | 'experiencer' | 'type' | 'hierarchy';

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

export type StorageRecord = SourceRecord | MomentRecord | SceneRecord;

export interface GroupedResults {
  groups: Array<{
    label: string;
    count: number;
    items: SearchResult[];
  }>;
  totalResults: number;
}

// 1. Core semantic similarity search
export async function semanticSearch(query: string, records: Array<SourceRecord | MomentRecord | SceneRecord>, embeddings: Record<string, number[]>, limit = 20): Promise<SearchResult[]> {
  const queryEmbedding = await generateEmbedding(query);
  const results: SearchResult[] = [];
  for (const record of records) {
    const id = record.id;
    const emb = embeddings[id];
    if (!emb) continue;
    const relevance = cosineSimilarity(queryEmbedding, emb);
    let snippet = '';
    if (record.type === 'source') snippet = record.content.slice(0, 200);
    if (record.type === 'moment') snippet = (record.summary || '') + ' ' + (record.narrative || '');
    if (record.type === 'scene') snippet = (record.summary || '') + ' ' + (record.narrative || '');
    results.push({
      type: record.type,
      id,
      relevance,
      snippet: snippet.trim(),
      source: record.type === 'source' ? record as SourceRecord : undefined,
      moment: record.type === 'moment' ? record as MomentRecord : undefined,
      scene: record.type === 'scene' ? record as SceneRecord : undefined,
    });
  }
  // Sort by relevance descending
  results.sort((a, b) => (b.relevance ?? 0) - (a.relevance ?? 0));
  return results.slice(0, limit);
}

// 2. Filter results by type, experiencer, qualities, etc.
export function applyFilters(results: SearchResult[], filters?: FilterOptions): SearchResult[] {
  if (!filters) return results;
  return results.filter(result => {
    if (filters.type && !filters.type.includes(result.type)) return false;
    if (filters.experiencer) {
      if (result.type === 'source' && result.source?.experiencer !== filters.experiencer) return false;
      if (result.type === 'moment') {
        // TODO: To filter moments by experiencer, need to look up full source records by sourceId
        // Skipping for now to avoid linter error
      }
      if (result.type === 'scene') return false; // Not applicable
    }
    if (filters.qualities && result.type === 'moment') {
      const momentQualities: QualityType[] = result.moment?.qualities?.map(q => q.type as QualityType) || [];
      const filterQualities: QualityType[] = filters.qualities as QualityType[];
      if (!filterQualities.every(q => momentQualities.includes(q))) return false;
    }
    // Add more filters as needed
    return true;
  });
}

// Helper: check if a date is within a range
function isWithinRange(date: Date, start?: Date, end?: Date): boolean {
  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
}

// Helper: get date from record
function getRecordDate(record: StorageRecord): Date | null {
  if ('created' in record && record.created) return new Date(record.created);
  if ('when' in record && record.when) return new Date(record.when);
  return null;
}

// Helper: get parent/child relationships for hierarchy grouping
function getParentId(record: StorageRecord): string | null {
  if (record.type === 'moment' && Array.isArray(record.sources) && record.sources.length > 0) {
    return record.sources[0].sourceId;
  }
  if (record.type === 'scene' && Array.isArray(record.momentIds) && record.momentIds.length > 0) {
    return record.momentIds[0];
  }
  return null;
}

// Advanced filtering
export function advancedFilters(results: SearchResult[], filters?: FilterOptions, allRecords?: StorageRecord[]): SearchResult[] {
  if (!filters) return results;
  // Normalize: treat 'type' and 'types' as aliases
  if (filters.type && !filters.types) {
    filters.types = filters.type;
  }
  return results.filter(result => {
    const rec = result.source || result.moment || result.scene;
    if (!rec) return false;
    // Type filter
    if (filters.types && !filters.types.includes(result.type)) return false;
    // Time range filter
    if (filters.timeRange) {
      const recDate = getRecordDate(rec);
      const start = filters.timeRange.start ? new Date(filters.timeRange.start) : undefined;
      const end = filters.timeRange.end ? new Date(filters.timeRange.end) : undefined;
      if (!recDate || !isWithinRange(recDate, start, end)) return false;
    }
    // hasQualities (for moments)
    if (filters.hasQualities && result.type === 'moment') {
      const momentQualities: string[] = result.moment?.qualities?.map(q => q.type) || [];
      if (!filters.hasQualities.every((q: string) => momentQualities.includes(q))) return false;
    }
    // experiencers (for sources, moments)
    if (filters.experiencers) {
      if (result.type === 'source' && !filters.experiencers.includes(result.source?.experiencer || '')) return false;
      if (result.type === 'moment' && result.moment?.sources && allRecords) {
        // Check if any related source has the experiencer
        const sourceExperiencers = result.moment.sources.map(src => {
          const srcRec = allRecords.find(r => r.id === src.sourceId && r.type === 'source') as SourceRecord | undefined;
          return srcRec?.experiencer;
        }).filter(Boolean);
        if (!filters.experiencers.some(exp => sourceExperiencers.includes(exp))) return false;
      }
    }
    // perspectives (for sources)
    if (filters.perspectives && result.type === 'source') {
      if (!filters.perspectives.includes(result.source?.perspective || '')) return false;
    }
    // processing (for sources)
    if (filters.processing && result.type === 'source') {
      if (!filters.processing.includes(result.source?.processing || '')) return false;
    }
    // shotTypes (for moments/scenes)
    if (filters.shotTypes) {
      if (result.type === 'moment' && !filters.shotTypes.includes(result.moment?.shot || '')) return false;
      if (result.type === 'scene' && !filters.shotTypes.includes(result.scene?.shot || '')) return false;
    }
    // framed (for sources)
    if (typeof filters.framed === 'boolean' && result.type === 'source' && allRecords) {
      const isFramed = allRecords.some(r => r.type === 'moment' && Array.isArray((r as MomentRecord).sources) && (r as MomentRecord).sources.some(s => s.sourceId === result.id));
      if (filters.framed !== isFramed) return false;
    }
    // qualities (for sources and moments)
    if (filters.qualities) {
      if (result.type === 'moment') {
        const momentQualities: string[] = result.moment?.qualities?.map(q => q.type) || [];
        if (!filters.qualities.every(q => momentQualities.includes(q))) return false;
      } else if (result.type === 'source') {
        // If sources ever have qualities, implement here
        // (currently not in schema)
      }
    }
    // experiencer (legacy single)
    if (filters.experiencer) {
      if (result.type === 'source' && result.source?.experiencer !== filters.experiencer) return false;
      if (result.type === 'moment' && result.moment?.sources && allRecords) {
        const sourceExperiencers = result.moment.sources.map(src => {
          const srcRec = allRecords.find(r => r.id === src.sourceId && r.type === 'source') as SourceRecord | undefined;
          return srcRec?.experiencer;
        }).filter(Boolean);
        if (!sourceExperiencers.includes(filters.experiencer)) return false;
      }
    }
    return true;
  });
}

// Grouping
export function groupResults(results: SearchResult[], groupBy: GroupOption = 'none'): GroupedResults {
  const groups: Array<{ label: string; count: number; items: SearchResult[] }> = [];
  if (groupBy === 'none') {
    groups.push({ label: 'All Results', count: results.length, items: results });
  } else if (groupBy === 'type') {
    const byType: Record<string, SearchResult[]> = {};
    for (const r of results) {
      if (!byType[r.type]) byType[r.type] = [];
      byType[r.type].push(r);
    }
    for (const type in byType) {
      groups.push({ label: type, count: byType[type].length, items: byType[type] });
    }
  } else if (groupBy === 'experiencer') {
    const byExp: Record<string, SearchResult[]> = {};
    for (const r of results) {
      let exp = '';
      if (r.type === 'source') {
        exp = r.source?.experiencer || 'unknown';
      } else if (r.type === 'moment' && r.moment?.sources && r.moment.sources.length > 0) {
        // Lookup the actual source record for experiencer
        // const firstSourceId = r.moment.sources[0].sourceId;
        // This is a sync function, so we can't await getRecordById. Instead, require the caller to pass allRecords and look up there.
        // For now, fallback to 'unknown'.
        exp = 'unknown';
      }
      if (!byExp[exp]) byExp[exp] = [];
      byExp[exp].push(r);
    }
    for (const exp in byExp) {
      groups.push({ label: exp, count: byExp[exp].length, items: byExp[exp] });
    }
  } else if (groupBy === 'day' || groupBy === 'week' || groupBy === 'month') {
    const byTime: Record<string, SearchResult[]> = {};
    for (const r of results) {
      const rec = r.source || r.moment || r.scene;
      if (!rec) continue;
      const date = getRecordDate(rec);
      if (!date) continue;
      let label = '';
      if (groupBy === 'day') label = date.toISOString().slice(0, 10);
      if (groupBy === 'week') {
        const firstDay = new Date(date);
        firstDay.setDate(date.getDate() - date.getDay());
        label = firstDay.toISOString().slice(0, 10) + ' (week)';
      }
      if (groupBy === 'month') label = date.toISOString().slice(0, 7);
      if (!byTime[label]) byTime[label] = [];
      byTime[label].push(r);
    }
    for (const label in byTime) {
      groups.push({ label, count: byTime[label].length, items: byTime[label] });
    }
  } else if (groupBy === 'hierarchy') {
    // Group by parent-child relationships
    const byParent: Record<string, SearchResult[]> = {};
    for (const r of results) {
      const rec = r.source || r.moment || r.scene;
      if (!rec) continue;
      const parentId = getParentId(rec);
      const label = parentId || 'root';
      if (!byParent[label]) byParent[label] = [];
      byParent[label].push(r);
    }
    for (const label in byParent) {
      groups.push({ label, count: byParent[label].length, items: byParent[label] });
    }
  }
  return { groups, totalResults: results.length };
}

// 3. Main entry point
export async function search(options: SearchOptions): Promise<SearchResult[] | GroupedResults> {
  const records = await getAllRecords();
  const embeddings = await loadEmbeddings();
  let results: SearchResult[] = [];

  // --- Mode handling ---
  let searchRecords = records;
  if (options.mode === 'temporal') {
    // Use chrono-node to parse dates from the query
    const { dateRange, cleanQuery } = parseTemporalQuery(options.query);
    if (dateRange) {
      searchRecords = records.filter(r => {
        const date = getRecordDate(r);
        return date && isWithinRange(date, dateRange.start, dateRange.end);
      });
    }
    options.query = cleanQuery;
  } else if (options.mode === 'relationship' && options.query) {
    // Use the query as an ID to find related records
    searchRecords = findRelatedRecords(options.query, records);
  }
  // For similarity or default, use all records

  // --- Main search logic ---
  if (!options.query || options.query.trim() === '') {
    // No query: return all records as results (no relevance)
    results = searchRecords.map(record => ({
      type: record.type,
      id: record.id,
      snippet: getSearchableText(record).slice(0, 200),
      source: record.type === 'source' ? record as SourceRecord : undefined,
      moment: record.type === 'moment' ? record as MomentRecord : undefined,
      scene: record.type === 'scene' ? record as SceneRecord : undefined,
    }));
    // Enforce limit for empty queries
    if (options.limit !== undefined) {
      results = results.slice(0, options.limit);
    }
  } else {
    // Semantic search
    results = await semanticSearch(options.query, searchRecords, embeddings, options.limit || 20);
  }

  // --- Apply advanced filters ---
  results = advancedFilters(results, options.filters, records);
  // Enforce limit after filtering (in case filters reduce the set)
  if (options.limit !== undefined) {
    results = results.slice(0, options.limit);
  }

  // --- Group if requested ---
  if (options.groupBy && options.groupBy !== 'none') {
    return groupResults(results, options.groupBy as GroupOption);
  }
  return results;
}

// --- Temporal search helpers ---
export function parseTemporalQuery(query: string): { dateRange?: DateRange, cleanQuery: string } {
  // Use chrono-node to parse dates
  const results = chrono.parse(query);
  if (results.length === 0) {
    return { cleanQuery: query };
  }
  // Use the first date result
  const { start, end, text } = results[0];
  const dateRange: DateRange = {
    start: start.date(),
    end: end ? end.date() : start.date(),
  };
  // Remove the date text from the query
  const cleanQuery = query.replace(text, '').trim();
  return { dateRange, cleanQuery };
}

// --- Relationship search helpers ---
export function findRelatedRecords(recordId: string, allRecords: StorageRecord[]): StorageRecord[] {
  const visited = new Set<string>();
  const related: StorageRecord[] = [];
  const queue: string[] = [recordId];
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);
    const rec = allRecords.find(r => r.id === currentId);
    if (!rec) continue;
    related.push(rec);
    if (rec.type === 'source' && Array.isArray((rec as SourceRecord).related)) {
      for (const relId of (rec as SourceRecord).related!) {
        if (!visited.has(relId)) queue.push(relId);
      }
    }
    if (rec.type === 'moment' && Array.isArray((rec as MomentRecord).sources)) {
      for (const src of (rec as MomentRecord).sources) {
        if (src.sourceId && !visited.has(src.sourceId)) queue.push(src.sourceId);
      }
    }
    if (rec.type === 'scene' && Array.isArray((rec as SceneRecord).momentIds)) {
      for (const momId of (rec as SceneRecord).momentIds) {
        if (!visited.has(momId)) queue.push(momId);
      }
    }
  }
  return related;
}

export { getSearchableText }; 