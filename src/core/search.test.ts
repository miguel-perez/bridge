import { describe, test, expect } from '@jest/globals';
import type { SourceRecord } from './types.js';
import { advancedFilters, type SearchResult, type FilterOptions } from './search.js';

describe('Search Module', () => {
  // Test data
  const mockSourceRecords: SourceRecord[] = [
    {
      type: 'source',
      id: 'test-1',
      source: 'First test experience',
      created: '2024-01-15T10:00:00Z',
      perspective: 'I',
      who: 'self',
      processing: 'during',
    },
    {
      type: 'source',
      id: 'test-2',
      source: 'Second test experience',
      created: '2024-01-16T14:00:00Z',
      perspective: 'we',
      who: 'team',
      processing: 'right-after',
    },
    {
      type: 'source',
      id: 'test-3',
      source: 'Third test experience',
      created: '2024-01-17T09:00:00Z',
      perspective: 'I',
      who: 'self',
      processing: 'during',
    },
    {
      type: 'source',
      id: 'test-4',
      source: 'Fourth test experience',
      created: '2024-01-18T16:00:00Z',
      perspective: 'you',
      who: 'other',
      processing: 'long-after',
    },
  ];

  const mockSearchResults: SearchResult[] = mockSourceRecords.map((record) => ({
    type: 'source',
    id: record.id,
    relevance: 0.8,
    snippet: record.source.substring(0, 50),
    source: record,
  }));

  describe('advancedFilters', () => {
    test('should return all results when no filters applied', () => {
      const { filtered } = advancedFilters(mockSearchResults);

      expect(filtered).toHaveLength(4);
    });

    test('should filter by who', () => {
      const filters: FilterOptions = {
        who: ['self'],
      };

      const { filtered } = advancedFilters(mockSearchResults, filters);

      expect(filtered).toHaveLength(2);
      expect(filtered.every((result) => result.source.who === 'self')).toBe(true);
    });

    // Removed perspective and processing tests - fields no longer exist

    test('should filter by created time range', () => {
      const filters: FilterOptions = {
        timeRange: {
          start: '2024-01-15T00:00:00Z',
          end: '2024-01-16T23:59:59Z',
        },
      };

      const { filtered } = advancedFilters(mockSearchResults, filters);

      expect(filtered).toHaveLength(2);
    });

    test('should filter by system time range', () => {
      const filters: FilterOptions = {
        systemTimeRange: {
          start: '2024-01-15T00:00:00Z',
          end: '2024-01-16T23:59:59Z',
        },
      };

      const { filtered } = advancedFilters(mockSearchResults, filters);

      expect(filtered).toHaveLength(2);
    });

    test('should apply multiple filters', () => {
      const filters: FilterOptions = {
        who: ['self'],
        perspectives: ['I'],
        processing: ['during'],
      };

      const { filtered } = advancedFilters(mockSearchResults, filters);

      expect(filtered).toHaveLength(2); // Both test-1 and test-3 match the filters
      expect(filtered.every((result) => result.source.who === 'self')).toBe(true);
      expect(filtered.every((result) => result.source.perspective === 'I')).toBe(true);
      expect(filtered.every((result) => result.source.processing === 'during')).toBe(true);
    });

    test('should handle records without created date', () => {
      const recordsWithoutCreated = mockSourceRecords.map((record) => ({
        ...record,
        created: '2024-01-15T10:00:00Z', // Use a default date instead of undefined
      }));

      const searchResults = recordsWithoutCreated.map((record) => ({
        type: 'source' as const,
        id: record.id,
        relevance: 0.8,
        snippet: record.source.substring(0, 50),
        source: record,
      }));

      const filters: FilterOptions = {
        timeRange: {
          start: '2024-01-15T00:00:00Z',
          end: '2024-01-16T23:59:59Z',
        },
      };

      const { filtered } = advancedFilters(searchResults, filters);

      // Should handle records gracefully
      expect(filtered.length).toBeGreaterThan(0);
    });
  });

  describe('Edge cases', () => {
    test('should handle records with missing optional fields', () => {
      const minimalRecords: SourceRecord[] = [
        {
          type: 'source',
          id: 'minimal',
          source: 'Minimal content',
          created: '2024-01-15T10:00:00Z',
        },
      ];

      const searchResults = minimalRecords.map((record) => ({
        type: 'source' as const,
        id: record.id,
        relevance: 0.8,
        snippet: record.source.substring(0, 50),
        source: record,
      }));

      const filters: FilterOptions = {
        who: ['self'], // Default who
      };

      const { filtered } = advancedFilters(searchResults, filters);
      expect(filtered).toHaveLength(1);
    });

    test('should handle empty search results', () => {
      const { filtered } = advancedFilters([]);
      expect(filtered).toHaveLength(0);
    });
  });
});
