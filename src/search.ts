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
    if (filters.qualities && filters.qualities.length > 0) {
      // Only consider moments
      if (result.type !== 'moment') return false;
      // AND logic: all qualities must be present
      const momentQualities: string[] = result.moment?.qualities?.map(q => q.type) || [];
      if (!filters.qualities.every(q => momentQualities.includes(q))) return false;
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

// Helper to get experiencer for grouping
function getExperiencer(result: SearchResult): string {
  if ('experiencer' in result && typeof result.experiencer === 'string' && result.experiencer) return result.experiencer;
  if (result.source && 'experiencer' in result.source && typeof result.source.experiencer === 'string' && result.source.experiencer) return result.source.experiencer;
  if (result.moment && 'experiencer' in result.moment && typeof result.moment.experiencer === 'string' && result.moment.experiencer) return result.moment.experiencer;
  if (result.scene && 'experiencer' in result.scene && typeof result.scene.experiencer === 'string' && result.scene.experiencer) return result.scene.experiencer;
  return 'unknown';
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
    const groups: { [label: string]: SearchResult[] } = {};
    for (const result of results) {
      const label = getExperiencer(result);
      if (!groups[label]) groups[label] = [];
      groups[label].push(result);
    }
    const groupArr = Object.entries(groups).map(([label, items]) => ({ label, count: items.length, items }));
    return {
      groups: groupArr,
      totalResults: results.length
    };
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
  if (options.mode === 'temporal' && options.query) {
    const query = options.query.trim();
    const parsed = chrono.parse(query);
    let start: Date | undefined;
    let end: Date | undefined;
    let isYearless = false;
    let isTimeOfDay = false;
    let timeWindow: [number, number] | undefined; // [startHour, endHour]
    let monthIndex: number | undefined;
    let day: number | undefined;
    let specificTime: { hour: number, minute: number } | undefined;

    // --- True relative date support ---
    // Detect and handle queries like 'today', 'yesterday', 'last week', 'this morning', 'last night'
    const now = new Date();
    const utcYear = now.getUTCFullYear();
    const utcMonth = now.getUTCMonth();
    const utcDate = now.getUTCDate();
    const utcDay = now.getUTCDay(); // 0=Sun, 1=Mon, ...
    let handledRelative = false;
    if (/^(today)$/i.test(query)) {
      start = new Date(Date.UTC(utcYear, utcMonth, utcDate, 0, 0, 0, 0));
      end = new Date(Date.UTC(utcYear, utcMonth, utcDate + 1, 0, 0, 0, 0));
      handledRelative = true;
    } else if (/^(yesterday)$/i.test(query)) {
      start = new Date(Date.UTC(utcYear, utcMonth, utcDate - 1, 0, 0, 0, 0));
      end = new Date(Date.UTC(utcYear, utcMonth, utcDate, 0, 0, 0, 0));
      handledRelative = true;
    } else if (/^(tomorrow)$/i.test(query)) {
      start = new Date(Date.UTC(utcYear, utcMonth, utcDate + 1, 0, 0, 0, 0));
      end = new Date(Date.UTC(utcYear, utcMonth, utcDate + 2, 0, 0, 0, 0));
      handledRelative = true;
    } else if (/^(last week)$/i.test(query)) {
      // Previous Monday 00:00:00 to this Monday 00:00:00 UTC
      const daysSinceMonday = (utcDay + 6) % 7;
      const thisMonday = new Date(Date.UTC(utcYear, utcMonth, utcDate - daysSinceMonday, 0, 0, 0, 0));
      const lastMonday = new Date(Date.UTC(utcYear, utcMonth, utcDate - daysSinceMonday - 7, 0, 0, 0, 0));
      start = lastMonday;
      end = thisMonday;
      handledRelative = true;
    } else if (/^(this week)$/i.test(query)) {
      // This Monday 00:00:00 to next Monday 00:00:00 UTC
      const daysSinceMonday = (utcDay + 6) % 7;
      start = new Date(Date.UTC(utcYear, utcMonth, utcDate - daysSinceMonday, 0, 0, 0, 0));
      end = new Date(Date.UTC(utcYear, utcMonth, utcDate - daysSinceMonday + 7, 0, 0, 0, 0));
      handledRelative = true;
    } else if (/^(this morning)$/i.test(query)) {
      start = new Date(Date.UTC(utcYear, utcMonth, utcDate, 5, 0, 0, 0));
      end = new Date(Date.UTC(utcYear, utcMonth, utcDate, 12, 0, 0, 0));
      handledRelative = true;
    } else if (/^(last night)$/i.test(query)) {
      // Previous day 22:00 to today 05:00
      start = new Date(Date.UTC(utcYear, utcMonth, utcDate - 1, 22, 0, 0, 0));
      end = new Date(Date.UTC(utcYear, utcMonth, utcDate, 5, 0, 0, 0));
      handledRelative = true;
    }
    if (handledRelative && start !== undefined && end !== undefined) {
      searchRecords = records.filter(r => {
        const when = ('when' in r && r.when) ? r.when : ('created' in r && r.created ? r.created : undefined);
        if (!when) return false;
        const whenDate = new Date(when);
        return whenDate >= start! && whenDate < end!;
      });
    }
    // 1. Partial ISO dates (YYYY-MM): treat as month query
    const partialIsoMatch = query.match(/^(\d{4})-(\d{2})$/);
    if (partialIsoMatch) {
      const year = parseInt(partialIsoMatch[1], 10);
      const month = parseInt(partialIsoMatch[2], 10);
      if (month >= 1 && month <= 12) {
        start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
        end = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
      }
    }
    // 2. Year-less date queries (e.g., 'January 1', 'Dec 25')
    else if (/^(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}$/i.test(query)) {
      // Parse month and day
      const parts = query.split(/\s+/);
      const monthName = parts[0].toLowerCase();
      day = parseInt(parts[1], 10);
      monthIndex = [
        'january','february','march','april','may','june','july','august','september','october','november','december'
      ].indexOf(monthName);
      if (monthIndex !== -1 && day >= 1 && day <= 31) {
        isYearless = true;
        // We'll filter all records with matching month and day, any year
      }
    }
    // 3. Time-of-day queries (fuzzy: morning, afternoon, evening, night)
    else if (/\b(morning|afternoon|evening|night)\b/i.test(query)) {
      isTimeOfDay = true;
      const lower = query.toLowerCase();
      if (lower.includes('morning')) timeWindow = [5, 12]; // 05:00-11:59
      else if (lower.includes('afternoon')) timeWindow = [12, 18]; // 12:00-17:59
      else if (lower.includes('evening')) timeWindow = [18, 22]; // 18:00-21:59
      else if (lower.includes('night')) timeWindow = [22, 24]; // 22:00-23:59
    }
    // 3b. Time-of-day queries (explicit: 8:00 AM, 15:30)
    else if (/\b(\d{1,2}):(\d{2})\s*(am|pm)?\b/i.test(query)) {
      isTimeOfDay = true;
      // Parse hour and minute
      const timeMatch = query.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
      if (timeMatch) {
        let hour = parseInt(timeMatch[1], 10);
        const minute = parseInt(timeMatch[2], 10);
        const ampm = timeMatch[3]?.toLowerCase();
        if (ampm === 'pm' && hour < 12) hour += 12;
        if (ampm === 'am' && hour === 12) hour = 0;
        timeWindow = [hour, hour + 1];
        specificTime = { hour, minute };
      }
    }
    // 4. Relative dates (today, yesterday, last week, etc.)
    else if (parsed.length > 0) {
      const range = parsed[0];
      if (range.start) {
        // Month-only query
        if (range.start.isCertain('year') && range.start.isCertain('month') && !range.start.isCertain('day')) {
          const year = range.start.get('year');
          const month = range.start.get('month');
          if (typeof year !== 'number' || typeof month !== 'number') return [];
          start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
          end = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
        }
        // Date-only query (no time)
        else if (range.start.isCertain('year') && range.start.isCertain('month') && range.start.isCertain('day') && !range.start.isCertain('hour')) {
          const year = range.start.get('year');
          const month = range.start.get('month');
          const day = range.start.get('day');
          if (typeof year !== 'number' || typeof month !== 'number' || typeof day !== 'number') return [];
          start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
          end = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0));
        }
        // Full timestamp or range
        else if (range.end && typeof range.start.date === 'function' && typeof range.end.date === 'function') {
          start = range.start.date();
          end = range.end.date();
        } else if (range.start && typeof range.start.date === 'function') {
          // Relative date (e.g., today, yesterday, last week)
          start = range.start.date();
          if (range.end && typeof range.end.date === 'function') {
            end = range.end.date();
          } else {
            end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
          }
        }
      }
    }
    // Manual fallback for year-only queries
    if (!start && !isYearless && /^\d{4}$/.test(query)) {
      const year = parseInt(query, 10);
      start = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
      end = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0, 0));
    }
    // TODO: Future enhancements: support fuzzy/partial matching (e.g., 'early January', 'late 2025')
    if (isYearless && typeof monthIndex === 'number' && typeof day === 'number') {
      // Filter all records with matching month and day, any year
      searchRecords = records.filter(r => {
        const when = ('when' in r && r.when) ? r.when : undefined;
        if (!when) return false;
        const whenDate = new Date(when);
        return (
          whenDate.getUTCMonth() === monthIndex &&
          whenDate.getUTCDate() === day
        );
      });
    } else if (specificTime) {
      // Specific time match (hour/minute)
      searchRecords = records.filter(r => {
        const when = ('when' in r && r.when) ? r.when : undefined;
        if (!when) return false;
        const whenDate = new Date(when);
        return whenDate.getUTCHours() === specificTime!.hour && whenDate.getUTCMinutes() === specificTime!.minute;
      });
    } else if (isTimeOfDay && timeWindow) {
      // Fuzzy time-of-day (morning, afternoon, etc.)
      searchRecords = records.filter(r => {
        const when = ('when' in r && r.when) ? r.when : undefined;
        if (!when) return false;
        const whenDate = new Date(when);
        const hour = whenDate.getUTCHours();
        return hour >= timeWindow[0] && hour < timeWindow[1];
      });
    } else if (start && end) {
      searchRecords = records.filter(r => {
        const when = ('when' in r && r.when) ? r.when : undefined;
        if (!when) return false;
        const whenDate = new Date(when);
        return whenDate >= start && whenDate < end;
      });
    } else {
      // No date parsed, return empty result set
      return [];
    }
  } else if (options.mode === 'relationship' && options.query) {
    // Use the query as an ID to find related records
    searchRecords = findRelatedRecords(options.query, records);
  }
  // For similarity or default, use all records

  // --- Main search logic ---
  if (!options.query || options.query.trim() === '' || options.mode === 'temporal') {
    // For temporal mode, we've already filtered searchRecords above
    results = searchRecords.map(record => ({
      type: record.type,
      id: record.id,
      snippet: getSearchableText(record).slice(0, 200),
      source: record.type === 'source' ? record as SourceRecord : undefined,
      moment: record.type === 'moment' ? record as MomentRecord : undefined,
      scene: record.type === 'scene' ? record as SceneRecord : undefined,
    }));
    // Enforce limit for empty queries or temporal mode
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

  // After filtering, implement sort options
  if (options.sort === 'created') {
    results.sort((a, b) => new Date(getCreated(b)).getTime() - new Date(getCreated(a)).getTime());
  } else if (options.sort === 'when') {
    results.sort((a, b) => new Date(getWhen(b)).getTime() - new Date(getWhen(a)).getTime());
  } else {
    // Default: sort by relevance (if available)
    results.sort((a, b) => (b.relevance || 0) - (a.relevance || 0));
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

// Helper to safely get created/when fields for sorting
function getCreated(result: SearchResult): string {
  if ('created' in result && typeof result.created === 'string') return result.created;
  if (result.source && 'created' in result.source && typeof result.source.created === 'string') return result.source.created;
  if (result.moment && 'created' in result.moment && typeof result.moment.created === 'string') return result.moment.created;
  if (result.scene && 'created' in result.scene && typeof result.scene.created === 'string') return result.scene.created;
  return '';
}
function getWhen(result: SearchResult): string {
  if ('when' in result && typeof result.when === 'string') return result.when;
  if (result.source && 'when' in result.source && typeof result.source.when === 'string') return result.source.when;
  if (result.moment && 'when' in result.moment && typeof result.moment.when === 'string') return result.moment.when;
  if (result.scene && 'when' in result.scene && typeof result.scene.when === 'string') return result.scene.when;
  return getCreated(result);
} 