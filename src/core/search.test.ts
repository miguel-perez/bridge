import { describe, test, expect } from '@jest/globals';
import type { SourceRecord } from './types.js';
import { 
  advancedFilters, 
  groupResults, 
  parseTemporalQuery,
  findAllRelatedRecords,
  type SearchResult,
  type FilterOptions
} from './search.js';

describe('Search Module', () => {
  // Test data
  const mockSourceRecords: SourceRecord[] = [
    {
      type: 'source',
      id: '1',
      content: 'I felt excited about the new project',
      system_time: '2024-01-15T10:00:00Z',
      occurred: '2024-01-15T10:00:00Z',
      experiencer: 'Alice',
      perspective: 'I',
      processing: 'during'
    },
    {
      type: 'source',
      id: '2',
      content: 'We discussed the project timeline',
      system_time: '2024-01-16T14:00:00Z',
      occurred: '2024-01-16T14:00:00Z',
      experiencer: 'Bob',
      perspective: 'we',
      processing: 'during'
    },
    {
      type: 'source',
      id: '3',
      content: 'The team felt confident about the approach',
      system_time: '2024-01-17T09:00:00Z',
      occurred: '2024-01-17T09:00:00Z',
      experiencer: 'Alice',
      perspective: 'they',
      processing: 'right-after'
    },
    {
      type: 'source',
      id: '4',
      content: 'Looking back, the decision was correct',
      system_time: '2024-01-18T16:00:00Z',
      occurred: '2024-01-18T16:00:00Z',
      experiencer: 'Bob',
      perspective: 'I',
      processing: 'long-after'
    }
  ];

  const mockSearchResults: SearchResult[] = mockSourceRecords.map(record => ({
    type: 'source',
    id: record.id,
    relevance: 0.8,
    snippet: record.content.substring(0, 50),
    source: record
  }));

  describe('advancedFilters', () => {
    test('should return all results when no filters applied', () => {
      const { filtered } = advancedFilters(mockSearchResults);
      
      expect(filtered).toHaveLength(4);
    });

    test('should filter by experiencers', () => {
      const filters: FilterOptions = {
        experiencers: ['Alice']
      };
      
      const { filtered } = advancedFilters(mockSearchResults, filters);
      
      expect(filtered).toHaveLength(2);
      expect(filtered.every(result => result.source.experiencer === 'Alice')).toBe(true);
    });

    test('should filter by perspectives', () => {
      const filters: FilterOptions = {
        perspectives: ['I', 'we']
      };
      
      const { filtered } = advancedFilters(mockSearchResults, filters);
      
      expect(filtered).toHaveLength(3);
      expect(filtered.every(result => 
        result.source.perspective === 'I' || result.source.perspective === 'we'
      )).toBe(true);
    });

    test('should filter by processing levels', () => {
      const filters: FilterOptions = {
        processing: ['during']
      };
      
      const { filtered } = advancedFilters(mockSearchResults, filters);
      
      expect(filtered).toHaveLength(2);
      expect(filtered.every(result => result.source.processing === 'during')).toBe(true);
    });

    test('should filter by time range', () => {
      const filters: FilterOptions = {
        timeRange: {
          start: '2024-01-16T00:00:00Z',
          end: '2024-01-17T23:59:59Z'
        }
      };
      
      const { filtered } = advancedFilters(mockSearchResults, filters);
      
      expect(filtered).toHaveLength(2);
    });

    test('should filter by system time range', () => {
      const filters: FilterOptions = {
        systemTimeRange: {
          start: '2024-01-15T00:00:00Z',
          end: '2024-01-16T23:59:59Z'
        }
      };
      
      const { filtered } = advancedFilters(mockSearchResults, filters);
      
      expect(filtered).toHaveLength(2);
    });

    test('should filter by occurred time range', () => {
      const filters: FilterOptions = {
        occurredRange: {
          start: '2024-01-17T00:00:00Z',
          end: '2024-01-18T23:59:59Z'
        }
      };
      
      const { filtered } = advancedFilters(mockSearchResults, filters);
      
      expect(filtered).toHaveLength(2);
    });

    test('should apply multiple filters', () => {
      const filters: FilterOptions = {
        experiencers: ['Alice'],
        perspectives: ['I'],
        processing: ['during']
      };
      
      const { filtered } = advancedFilters(mockSearchResults, filters);
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].source.experiencer).toBe('Alice');
      expect(filtered[0].source.perspective).toBe('I');
      expect(filtered[0].source.processing).toBe('during');
    });

    test('should handle records without occurred date', () => {
      const recordsWithoutOccurred = mockSourceRecords.map(record => ({
        ...record,
        occurred: undefined
      }));
      
      const searchResults = recordsWithoutOccurred.map(record => ({
        type: 'source' as const,
        id: record.id,
        relevance: 0.8,
        snippet: record.content.substring(0, 50),
        source: record
      }));

      const filters: FilterOptions = {
        timeRange: {
          start: '2024-01-15T00:00:00Z',
          end: '2024-01-16T23:59:59Z'
        }
      };
      
      const { filtered } = advancedFilters(searchResults, filters);
      
      // Should fall back to system_time when occurred is not available
      expect(filtered.length).toBeGreaterThan(0);
    });
  });

  describe('groupResults', () => {
    test('should group by none', () => {
      const result = groupResults(mockSearchResults, 'none');
      
      expect(result.groups).toHaveLength(1);
      expect(result.groups[0].label).toBe('All Results');
      expect(result.groups[0].count).toBe(4);
      expect(result.groups[0].items).toHaveLength(4);
      expect(result.totalResults).toBe(4);
    });

    test('should group by experiencer', () => {
      const result = groupResults(mockSearchResults, 'experiencer');
      
      expect(result.groups).toHaveLength(2);
      expect(result.totalResults).toBe(4);
      
      const aliceGroup = result.groups.find(g => g.label === 'Alice');
      const bobGroup = result.groups.find(g => g.label === 'Bob');
      
      expect(aliceGroup).toBeDefined();
      expect(aliceGroup!.count).toBe(2);
      expect(bobGroup).toBeDefined();
      expect(bobGroup!.count).toBe(2);
    });

    test('should group by day', () => {
      const result = groupResults(mockSearchResults, 'day');
      
      expect(result.groups).toHaveLength(4);
      expect(result.totalResults).toBe(4);
      
      // Each record should be in its own day group
      expect(result.groups.every(g => g.count === 1)).toBe(true);
    });

    test('should group by week', () => {
      const result = groupResults(mockSearchResults, 'week');
      
      expect(result.groups.length).toBeGreaterThan(0);
      expect(result.totalResults).toBe(4);
    });

    test('should group by month', () => {
      const result = groupResults(mockSearchResults, 'month');
      
      expect(result.groups).toHaveLength(1); // All in January 2024
      expect(result.totalResults).toBe(4);
      expect(result.groups[0].count).toBe(4);
    });
  });

  describe('parseTemporalQuery', () => {
    test('should parse "today"', () => {
      const result = parseTemporalQuery('excited today');
      
      expect(result.cleanQuery).toBe('excited');
      expect(result.dateRange).toBeDefined();
    });

    test('should parse "yesterday"', () => {
      const result = parseTemporalQuery('discussed yesterday');
      
      expect(result.cleanQuery).toBe('discussed');
      expect(result.dateRange).toBeDefined();
    });

    test('should parse "last week"', () => {
      const result = parseTemporalQuery('felt last week');
      
      expect(result.cleanQuery).toBe('felt');
      expect(result.dateRange).toBeDefined();
    });

    test('should parse "this month"', () => {
      const result = parseTemporalQuery('project this month');
      
      expect(result.cleanQuery).toBe('project');
      expect(result.dateRange).toBeDefined();
    });

    test('should handle query without temporal terms', () => {
      const result = parseTemporalQuery('excited about project');
      
      expect(result.cleanQuery).toBe('excited about project');
      expect(result.dateRange).toBeUndefined();
    });

    test('should handle empty query', () => {
      const result = parseTemporalQuery('');
      
      expect(result.cleanQuery).toBe('');
      expect(result.dateRange).toBeUndefined();
    });
  });

  describe('findAllRelatedRecords', () => {
    test('should return empty array for non-existent record', () => {
      const related = findAllRelatedRecords('non-existent', mockSourceRecords);
      expect(related).toHaveLength(0);
    });

    test('should return the record itself when found', () => {
      const related = findAllRelatedRecords('1', mockSourceRecords);
      expect(related).toHaveLength(1);
      expect(related[0].id).toBe('1');
    });

    test('should handle empty records array', () => {
      const related = findAllRelatedRecords('1', []);
      expect(related).toHaveLength(0);
    });
  });

  describe('Edge cases', () => {
    test('should handle records with missing optional fields', () => {
      const minimalRecords: SourceRecord[] = [
        {
          type: 'source',
          id: 'minimal',
          content: 'Minimal content',
          system_time: '2024-01-15T10:00:00Z'
        }
      ];

      const searchResults = minimalRecords.map(record => ({
        type: 'source' as const,
        id: record.id,
        relevance: 0.8,
        snippet: record.content.substring(0, 50),
        source: record
      }));

      const filters: FilterOptions = {
        experiencers: ['self'] // Default experiencer
      };
      
      const { filtered } = advancedFilters(searchResults, filters);
      expect(filtered).toHaveLength(1);
    });

    test('should handle empty search results', () => {
      const { filtered } = advancedFilters([]);
      expect(filtered).toHaveLength(0);
    });

    test('should handle grouping empty results', () => {
      const result = groupResults([], 'experiencer');
      expect(result.groups).toHaveLength(0);
      expect(result.totalResults).toBe(0);
    });
  });
}); 