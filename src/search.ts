// When returning search results with includeContext, the UI expects type: 'text' and a JSON string, not type: 'object'. This is handled in index.ts.
import type { SourceRecord, MomentRecord, SceneRecord } from './types.js';
import type { QualityType } from './types.js';
import { generateEmbedding, queryEmbedding } from './embeddings.js';

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
  qualitiesMode?: 'all' | 'any'; // 'all' = AND logic, 'any' = OR logic
  // Advanced filters
  types?: Array<'source' | 'moment' | 'scene'>;
  timeRange?: { start?: string; end?: string };
  hasQualities?: string[]; // QualityType[]
  experiencers?: string[];
  perspectives?: string[]; // Perspective[]
  processing?: string[]; // ProcessingLevel[]
  shotTypes?: string[]; // ShotType[]
  framed?: boolean;
  createdRange?: { start: string; end: string };
  whenRange?: { start: string; end: string };
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
// (Deprecated: replaced by Pinecone logic in search())
export async function semanticSearch(): Promise<SearchResult[]> {
  return [];
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

// Helper: normalize date to start of day for consistent comparison
function normalizeToStartOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// Helper: normalize date to end of day for consistent comparison
function normalizeToEndOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

// Helper: get date from record
function getRecordDate(record: StorageRecord): Date | null {
  if ('created' in record && record.created) return new Date(record.created);
  if ('when' in record && record.when) return new Date(record.when);
  return null;
}

// Helper: get created date specifically
function getCreatedDate(record: StorageRecord): Date | null {
  if ('created' in record && record.created) return new Date(record.created);
  return null;
}

// Helper: get when date specifically
function getWhenDate(record: StorageRecord): Date | null {
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
    // ShotTypes filter: only moments and scenes should be included
    if (filters.shotTypes) {
      if (result.type === 'source') return false;
      if (result.type === 'moment' && !filters.shotTypes.includes(result.moment?.shot || '')) return false;
      if (result.type === 'scene' && !filters.shotTypes.includes(result.scene?.shot || '')) return false;
    }
    // Time range filter (timeRange)
    if (filters.timeRange) {
      const recDate = getRecordDate(rec);
      const start = filters.timeRange.start ? new Date(filters.timeRange.start) : undefined;
      const end = filters.timeRange.end ? new Date(filters.timeRange.end) : undefined;
      if (!recDate || !isWithinRange(recDate, start, end)) return false;
    }
    // Created range filter (createdRange)
    if (filters.createdRange) {
      const recDate = getCreatedDate(rec);
      if (!recDate) return false;
      
      const start = new Date(filters.createdRange.start);
      const end = new Date(filters.createdRange.end);
      
      // If start and end are the same day, treat as full day range
      if (start.toDateString() === end.toDateString()) {
        const normalizedRecDate = normalizeToStartOfDay(recDate);
        const normalizedStart = normalizeToStartOfDay(start);
        const normalizedEnd = normalizeToEndOfDay(end);
        if (!isWithinRange(normalizedRecDate, normalizedStart, normalizedEnd)) return false;
      } else {
        if (!isWithinRange(recDate, start, end)) return false;
      }
    }
    // When range filter (whenRange)
    if (filters.whenRange) {
      const recDate = getWhenDate(rec);
      if (!recDate) return false;
      
      const start = new Date(filters.whenRange.start);
      const end = new Date(filters.whenRange.end);
      
      // If start and end are the same day, treat as full day range
      if (start.toDateString() === end.toDateString()) {
        const normalizedRecDate = normalizeToStartOfDay(recDate);
        const normalizedStart = normalizeToStartOfDay(start);
        const normalizedEnd = normalizeToEndOfDay(end);
        if (!isWithinRange(normalizedRecDate, normalizedStart, normalizedEnd)) return false;
      } else {
        if (!isWithinRange(recDate, start, end)) return false;
      }
    }
    // hasQualities (for moments)
    if (filters.hasQualities && result.type === 'moment') {
      const momentQualities: string[] = result.moment?.qualities?.map(q => q.type) || [];
      if (!filters.hasQualities.every((q: string) => momentQualities.includes(q))) return false;
    }
    // experiencers (for sources, moments, scenes)
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
      if (result.type === 'scene' && result.scene?.experiencers && filters.experiencers && !filters.experiencers.some(exp => result.scene!.experiencers!.includes(exp))) return false;
    }
    // perspectives (for sources, and moments/scenes inherit from their sources)
    if (filters.perspectives) {
      if (result.type === 'source') {
        if (!filters.perspectives.includes(result.source?.perspective || '')) return false;
      } else if (result.type === 'moment' && result.moment?.sources && allRecords) {
        // Check if any related source has the perspective
        const sourcePerspectives = result.moment.sources.map(src => {
          const srcRec = allRecords.find(r => r.id === src.sourceId && r.type === 'source') as SourceRecord | undefined;
          return srcRec?.perspective;
        }).filter(Boolean);
        if (!filters.perspectives.some(p => sourcePerspectives.includes(p))) return false;
      } else if (result.type === 'scene' && result.scene?.momentIds && allRecords) {
        // Check if any related moment's sources have the perspective
        const scenePerspectives: string[] = [];
        for (const momentId of result.scene.momentIds) {
          const moment = allRecords.find(r => r.id === momentId && r.type === 'moment') as MomentRecord | undefined;
          if (moment?.sources) {
            for (const src of moment.sources) {
              const srcRec = allRecords.find(r => r.id === src.sourceId && r.type === 'source') as SourceRecord | undefined;
              if (srcRec?.perspective) {
                scenePerspectives.push(srcRec.perspective);
              }
            }
          }
        }
        if (!filters.perspectives.some(p => scenePerspectives.includes(p))) return false;
      }
    }
    // processing (for sources)
    if (filters.processing && result.type === 'source') {
      if (!filters.processing.includes(result.source?.processing || '')) return false;
    }
    // framed (for sources)
    if (typeof filters.framed === 'boolean' && result.type === 'source' && allRecords) {
      // More robust check for framed sources
      const isFramed = allRecords.some(r => {
        if (r.type !== 'moment') return false;
        const moment = r as MomentRecord;
        if (!Array.isArray(moment.sources)) return false;
        return moment.sources.some(s => s.sourceId === result.id);
      });
      if (filters.framed !== isFramed) return false;
    }
    // qualities (for moments only)
    if (filters.qualities && filters.qualities.length > 0) {
      // Only consider moments
      if (result.type !== 'moment') return false;
      const momentQualities: string[] = result.moment?.qualities?.map(q => q.type) || [];
      const mode = filters.qualitiesMode || 'all'; // Default to AND logic for backward compatibility
      
      if (mode === 'all') {
        // AND logic: all qualities must be present
        if (!filters.qualities.every(q => momentQualities.includes(q))) return false;
      } else if (mode === 'any') {
        // OR logic: any quality must be present
        if (!filters.qualities.some(q => momentQualities.includes(q))) return false;
      }
    }
    // experiencer (legacy single - convert to array format for consistency)
    if (filters.experiencer && !filters.experiencers) {
      const experiencerValue = filters.experiencer;
      if (result.type === 'source' && result.source?.experiencer !== experiencerValue) return false;
      if (result.type === 'moment' && result.moment?.sources && allRecords) {
        const sourceExperiencers = result.moment.sources.map(src => {
          const srcRec = allRecords.find(r => r.id === src.sourceId && r.type === 'source') as SourceRecord | undefined;
          return srcRec?.experiencer;
        }).filter(Boolean);
        if (!sourceExperiencers.includes(experiencerValue)) return false;
      }
      if (result.type === 'scene' && result.scene?.experiencers && !result.scene.experiencers.includes(experiencerValue)) return false;
    }
    return true;
  });
}

// Helper to get experiencer for grouping
function getExperiencer(result: SearchResult): string {
  if ('experiencer' in result && typeof result.experiencer === 'string' && result.experiencer) return result.experiencer;
  if (result.source && 'experiencer' in result.source && typeof result.source.experiencer === 'string' && result.source.experiencer) return result.source.experiencer;
  if (result.moment && 'experiencer' in result.moment && typeof result.moment.experiencer === 'string' && result.moment.experiencer) return result.moment.experiencer;
  if (result.scene && result.scene.experiencers && result.scene.experiencers.length > 0) return result.scene.experiencers[0];
  if (result.scene && result.scene.primaryExperiencer) return result.scene.primaryExperiencer;
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
    // Build actual hierarchical tree structure
    const tree = buildHierarchyTree(results);
    // Convert tree to flat groups for compatibility with GroupedResults interface
    const flatGroups: Array<{ label: string; count: number; items: SearchResult[] }> = [];
    
    const flattenTree = (nodes: Array<{ label: string; count: number; items: SearchResult[]; children?: Array<{ label: string; count: number; items: SearchResult[] }> }>, level: number = 0) => {
      for (const node of nodes) {
        const indent = '  '.repeat(level);
        flatGroups.push({
          label: `${indent}${node.label}`,
          count: node.count,
          items: node.items
        });
        if (node.children && node.children.length > 0) {
          flattenTree(node.children, level + 1);
        }
      }
    };
    
    flattenTree(tree);
    return {
      groups: flatGroups,
      totalResults: results.length
    };
  }
  return { groups, totalResults: results.length };
}

// Helper: build hierarchical tree structure
function buildHierarchyTree(results: SearchResult[]): Array<{ label: string; count: number; items: SearchResult[]; children?: Array<{ label: string; count: number; items: SearchResult[] }> }> {
  const tree: Array<{ label: string; count: number; items: SearchResult[]; children?: Array<{ label: string; count: number; items: SearchResult[] }> }> = [];
  const idToNode = new Map<string, { label: string; count: number; items: SearchResult[]; children?: Array<{ label: string; count: number; items: SearchResult[] }> }>();
  
  // First pass: create nodes for all results
  for (const result of results) {
    const rec = result.source || result.moment || result.scene;
    if (!rec) continue;
    
    // Create meaningful labels instead of just IDs
    let label = '';
    if (result.type === 'source') {
      const content = result.source?.content || '';
      label = `📝 ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`;
    } else if (result.type === 'moment') {
      const emoji = result.moment?.emoji || '❓';
      const summary = result.moment?.summary || '[no summary]';
      label = `${emoji} ${summary}`;
    } else if (result.type === 'scene') {
      const emoji = result.scene?.emoji || '❓';
      const summary = result.scene?.summary || '[no summary]';
      label = `${emoji} ${summary}`;
    }
    
    const node = {
      label,
      count: 1,
      items: [result],
      children: []
    };
    
    idToNode.set(result.id, node);
  }
  
  // Second pass: build parent-child relationships
  for (const result of results) {
    const rec = result.source || result.moment || result.scene;
    if (!rec) continue;
    
    const parentId = getParentId(rec);
    if (parentId && idToNode.has(parentId)) {
      const parent = idToNode.get(parentId)!;
      const child = idToNode.get(result.id)!;
      
      if (!parent.children) parent.children = [];
      parent.children.push(child);
      
      // Remove child from root level
      const rootIndex = tree.findIndex(n => n.label === child.label);
      if (rootIndex !== -1) {
        tree.splice(rootIndex, 1);
      }
    } else {
      // This is a root node
      const node = idToNode.get(result.id)!;
      if (!tree.find(n => n.label === node.label)) {
        tree.push(node);
      }
    }
  }
  
  return tree;
}

// 3. Main entry point
export async function search(options: SearchOptions): Promise<SearchResult[] | GroupedResults> {
  // Dynamic imports to fix module load order
  const { getAllRecords, getSearchableText } = await import('./storage.js');
  
  const records = await getAllRecords();
  let results: SearchResult[] = [];
  let searchRecords = records;

  // Filter out reframed moments/scenes unless includeContext is true or a special filter is set
  if (!options.includeContext && (!options.filters || !(options.filters as any).includeReframed)) {
    searchRecords = searchRecords.filter(r => {
      if (r.type === 'moment' && (r as any).reframedBy) return false;
      if (r.type === 'scene' && (r as any).reframedBy) return false;
      return true;
    });
  }

  // --- Mode handling ---
  if (options.mode === 'temporal' && options.query) {
    const query = options.query.trim();
    const now = new Date();
    const utcYear = now.getUTCFullYear();
    const utcMonth = now.getUTCMonth();
    const utcDate = now.getUTCDate();
    const utcDay = now.getUTCDay(); // 0=Sun, 1=Mon, ...
    // --- Enhanced relative date support and AND logic for combined queries ---
    // 1. Parse query into tokens (split on spaces, e.g., 'today afternoon' => ['today', 'afternoon'])
    const tokens = query.split(/\s+/).filter(Boolean);
    const filters: ((r: StorageRecord) => boolean)[] = [];
    for (const token of tokens) {
      let tokenStart: Date | undefined;
      let tokenEnd: Date | undefined;
      let handled = false;
      // --- Relative day/week/month/year ---
      if (/^today$/i.test(token)) {
        tokenStart = new Date(Date.UTC(utcYear, utcMonth, utcDate, 0, 0, 0, 0));
        tokenEnd = new Date(Date.UTC(utcYear, utcMonth, utcDate + 1, 0, 0, 0, 0));
        handled = true;
      } else if (/^yesterday$/i.test(token)) {
        tokenStart = new Date(Date.UTC(utcYear, utcMonth, utcDate - 1, 0, 0, 0, 0));
        tokenEnd = new Date(Date.UTC(utcYear, utcMonth, utcDate, 0, 0, 0, 0));
        handled = true;
      } else if (/^tomorrow$/i.test(token)) {
        tokenStart = new Date(Date.UTC(utcYear, utcMonth, utcDate + 1, 0, 0, 0, 0));
        tokenEnd = new Date(Date.UTC(utcYear, utcMonth, utcDate + 2, 0, 0, 0, 0));
        handled = true;
      } else if (/^this week$/i.test(token)) {
        const daysSinceMonday = (utcDay + 6) % 7;
        tokenStart = new Date(Date.UTC(utcYear, utcMonth, utcDate - daysSinceMonday, 0, 0, 0, 0));
        tokenEnd = new Date(Date.UTC(utcYear, utcMonth, utcDate - daysSinceMonday + 7, 0, 0, 0, 0));
        handled = true;
      } else if (/^last week$/i.test(token)) {
        const daysSinceMonday = (utcDay + 6) % 7;
        const thisMonday = new Date(Date.UTC(utcYear, utcMonth, utcDate - daysSinceMonday, 0, 0, 0, 0));
        const lastMonday = new Date(Date.UTC(utcYear, utcMonth, utcDate - daysSinceMonday - 7, 0, 0, 0, 0));
        tokenStart = lastMonday;
        tokenEnd = thisMonday;
        handled = true;
      } else if (/^this month$/i.test(token)) {
        tokenStart = new Date(Date.UTC(utcYear, utcMonth, 1, 0, 0, 0, 0));
        tokenEnd = new Date(Date.UTC(utcYear, utcMonth + 1, 1, 0, 0, 0, 0));
        handled = true;
      } else if (/^last month$/i.test(token)) {
        tokenStart = new Date(Date.UTC(utcYear, utcMonth - 1, 1, 0, 0, 0, 0));
        tokenEnd = new Date(Date.UTC(utcYear, utcMonth, 1, 0, 0, 0, 0));
        handled = true;
      } else if (/^this year$/i.test(token)) {
        tokenStart = new Date(Date.UTC(utcYear, 0, 1, 0, 0, 0, 0));
        tokenEnd = new Date(Date.UTC(utcYear + 1, 0, 1, 0, 0, 0, 0));
        handled = true;
      } else if (/^last year$/i.test(token)) {
        tokenStart = new Date(Date.UTC(utcYear - 1, 0, 1, 0, 0, 0, 0));
        tokenEnd = new Date(Date.UTC(utcYear, 0, 1, 0, 0, 0, 0));
        handled = true;
      } else if (/^(\d+)\s*days?\s*ago$/i.test(token)) {
        const n = parseInt(token.match(/^(\d+)/)![1], 10);
        tokenStart = new Date(Date.UTC(utcYear, utcMonth, utcDate - n, 0, 0, 0, 0));
        tokenEnd = new Date(Date.UTC(utcYear, utcMonth, utcDate - n + 1, 0, 0, 0, 0));
        handled = true;
      } else if (/^(\d+)\s*weeks?\s*ago$/i.test(token)) {
        const n = parseInt(token.match(/^(\d+)/)![1], 10);
        const daysSinceMonday = (utcDay + 6) % 7;
        const weekStart = new Date(Date.UTC(utcYear, utcMonth, utcDate - daysSinceMonday - 7 * (n - 1), 0, 0, 0, 0));
        const weekEnd = new Date(Date.UTC(utcYear, utcMonth, utcDate - daysSinceMonday - 7 * (n - 2), 0, 0, 0, 0));
        tokenStart = weekStart;
        tokenEnd = weekEnd;
        handled = true;
      } else if (/^(\d+)\s*months?\s*ago$/i.test(token)) {
        const n = parseInt(token.match(/^(\d+)/)![1], 10);
        tokenStart = new Date(Date.UTC(utcYear, utcMonth - n, 1, 0, 0, 0, 0));
        tokenEnd = new Date(Date.UTC(utcYear, utcMonth - n + 1, 1, 0, 0, 0, 0));
        handled = true;
      } else if (/^(\d+)\s*years?\s*ago$/i.test(token)) {
        const n = parseInt(token.match(/^(\d+)/)![1], 10);
        tokenStart = new Date(Date.UTC(utcYear - n, 0, 1, 0, 0, 0, 0));
        tokenEnd = new Date(Date.UTC(utcYear - n + 1, 0, 1, 0, 0, 0, 0));
        handled = true;
      }
      // --- chrono-node fallback for unhandled tokens ---
      if (!handled) {
        const chronoResults = chrono.parse(token);
        if (chronoResults.length > 0) {
          const { start, end } = chronoResults[0];
          const chronoStart = start.date();
          const chronoEnd = end ? end.date() : chronoStart;
          filters.push((r: StorageRecord) => {
            const when = ('when' in r && r.when) ? r.when : ('created' in r && r.created ? r.created : undefined);
            if (!when) return false;
            const whenDate = new Date(when);
            return whenDate >= chronoStart && whenDate <= chronoEnd;
          });
          handled = true;
        }
      }
      if (handled && tokenStart && tokenEnd) {
        filters.push((r: StorageRecord) => {
          const when = ('when' in r && r.when) ? r.when : ('created' in r && r.created ? r.created : undefined);
          if (!when) return false;
          const whenDate = new Date(when);
          return whenDate >= tokenStart! && whenDate < tokenEnd!;
        });
      }
      // If not handled, skip this token (do not add a filter, do not return early)
    }
    // If any filters were added, apply them as AND (intersection)
    if (filters.length > 0) {
      searchRecords = records.filter(r => filters.every(f => f(r)));
    } else if (query !== '') {
      // If no filters were generated and the query is not empty, return empty result set
      return [];
    }
  } else if (options.mode === 'relationship' && options.query) {
    // Use the query as an ID to find reflects_on records
    searchRecords = findAllRelatedRecords(options.query, records);
  }
  // For similarity or default, use all records

  // --- Main search logic ---
  const effectiveLimit = options.limit !== undefined ? options.limit : 20;
  if (!options.query || options.query.trim() === '' || options.mode === 'temporal') {
    // Apply type filter even with no query for consistency
    let filteredRecords = searchRecords;
    // Normalize type filter: handle both 'type' and 'types' parameters
    const typeFilter = options.filters?.types || options.filters?.type;
    if (typeFilter && typeFilter.length > 0) {
      filteredRecords = searchRecords.filter(record => typeFilter.includes(record.type));
    }
    
    results = filteredRecords.map(record => {
      const snippet = getSearchableText(record);
      return {
        type: record.type,
        id: record.id,
        snippet,
        source: record.type === 'source' ? record as SourceRecord : undefined,
        moment: record.type === 'moment' ? record as MomentRecord : undefined,
        scene: record.type === 'scene' ? record as SceneRecord : undefined,
      };
    });
    results = results.slice(0, effectiveLimit);
  } else {
    // --- Pinecone semantic search ---
    const queryEmbeddingVec = await generateEmbedding(options.query);
    const pineconeResults = await queryEmbedding(queryEmbeddingVec, effectiveLimit);
    const idToRecord = new Map(records.map(r => [r.id, r]));
    
    // Filter results by relevance threshold to ensure only meaningful matches are returned
    const RELEVANCE_THRESHOLD = 0.3; // Minimum similarity score (0-1 scale)
    
    results = (pineconeResults.matches || [])
      .filter((match: any) => match.score >= RELEVANCE_THRESHOLD) // Only include relevant matches
      .map((match: any) => {
        const rec = idToRecord.get(match.id);
        if (!rec) return null;
        let snippet = '';
        if (rec.type === 'source' && rec.content) snippet = rec.content.slice(0, 80);
        else if (rec.type === 'moment' && rec.summary) snippet = rec.summary.slice(0, 80);
        else if (rec.type === 'scene' && rec.summary) snippet = rec.summary.slice(0, 80);
        else if (rec.type === 'moment' && rec.narrative) snippet = rec.narrative.slice(0, 80);
        else if (rec.type === 'scene' && rec.narrative) snippet = rec.narrative.slice(0, 80);
        return {
          type: rec.type,
          id: rec.id,
          relevance: match.score,
          snippet,
          source: rec.type === 'source' ? rec as SourceRecord : undefined,
          moment: rec.type === 'moment' ? rec as MomentRecord : undefined,
          scene: rec.type === 'scene' ? rec as SceneRecord : undefined,
        };
      }).filter(Boolean) as SearchResult[];
  }

  // --- Apply advanced filters ---
  results = advancedFilters(results, options.filters, records);
  // Enforce limit after filtering (in case filters reduce the set)
  results = results.slice(0, effectiveLimit);

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
export function findAllRelatedRecords(recordId: string, allRecords: StorageRecord[]): StorageRecord[] {
  const relatedRecords: StorageRecord[] = [];
  const visited = new Set<string>();
  const queue: string[] = [recordId];
  
  // First, add the target record itself
  const targetRecord = allRecords.find(r => r.id === recordId);
  if (targetRecord) {
    relatedRecords.push(targetRecord);
    visited.add(recordId);
  }
  
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);
    
    const rec = allRecords.find(r => r.id === currentId);
    if (!rec) continue;
    
    // Add the current record to results
    if (!relatedRecords.find(r => r.id === currentId)) {
      relatedRecords.push(rec);
    }
    
    // 1. Forward relationships: what this record references
    if (rec.type === 'source' && Array.isArray((rec as SourceRecord).reflects_on)) {
      for (const relId of (rec as SourceRecord).reflects_on!) {
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
    
    // 2. Backward relationships: what references this record
    // Find sources that reflect on this record
    for (const record of allRecords) {
      if (record.type === 'source' && Array.isArray((record as SourceRecord).reflects_on)) {
        if ((record as SourceRecord).reflects_on!.includes(currentId) && !visited.has(record.id)) {
          queue.push(record.id);
        }
      }
    }
    
    // Find moments that include this source
    for (const record of allRecords) {
      if (record.type === 'moment' && Array.isArray((record as MomentRecord).sources)) {
        const hasSource = (record as MomentRecord).sources.some(s => s.sourceId === currentId);
        if (hasSource && !visited.has(record.id)) {
          queue.push(record.id);
        }
      }
    }
    
    // Find scenes that include this moment
    for (const record of allRecords) {
      if (record.type === 'scene' && Array.isArray((record as SceneRecord).momentIds)) {
        if ((record as SceneRecord).momentIds.includes(currentId) && !visited.has(record.id)) {
          queue.push(record.id);
        }
      }
    }
  }
  
  return relatedRecords;
}

// Legacy function for backward compatibility
export function findReflectsOnRecords(recordId: string, allRecords: StorageRecord[]): StorageRecord[] {
  return findAllRelatedRecords(recordId, allRecords);
}

// Find all sources that reflect on a given recordId
export function findReflectionsAbout(recordId: string, allRecords: StorageRecord[]): SourceRecord[] {
  return allRecords.filter(r => r.type === 'source' && Array.isArray((r as SourceRecord).reflects_on) && (r as SourceRecord).reflects_on!.includes(recordId)) as SourceRecord[];
}

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