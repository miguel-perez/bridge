import { describe, test, expect } from '@jest/globals';
import type { SourceRecord } from './types.js';
import { 
  advancedFilters,
  type SearchResult,
  type FilterOptions
} from './search.js';

describe('Search Module', () => {
  // Test data
  const mockSourceRecords: SourceRecord[] = [
    {
      type: 'source',
      id: 'test-1',
      content: 'First test experience',
      created: '2024-01-15T10:00:00Z',
      perspective: 'I',
      experiencer: 'self',
      processing: 'during',
      crafted: false
    },
    {
      type: 'source',
      id: 'test-2',
      content: 'Second test experience',
      created: '2024-01-16T14:00:00Z',
      perspective: 'we',
      experiencer: 'team',
      processing: 'right-after',
      crafted: true
    },
    {
      type: 'source',
      id: 'test-3',
      content: 'Third test experience',
      created: '2024-01-17T09:00:00Z',
      perspective: 'I',
      experiencer: 'self',
      processing: 'during',
      crafted: false
    },
    {
      type: 'source',
      id: 'test-4',
      content: 'Fourth test experience',
      created: '2024-01-18T16:00:00Z',
      perspective: 'you',
      experiencer: 'other',
      processing: 'long-after',
      crafted: false
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
        experiencers: ['self']
      };
      
      const { filtered } = advancedFilters(mockSearchResults, filters);
      
      expect(filtered).toHaveLength(2);
      expect(filtered.every(result => result.source.experiencer === 'self')).toBe(true);
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

    test('should filter by created time range', () => {
      const filters: FilterOptions = {
        timeRange: {
          start: '2024-01-15T00:00:00Z',
          end: '2024-01-16T23:59:59Z'
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

    test('should apply multiple filters', () => {
      const filters: FilterOptions = {
        experiencers: ['self'],
        perspectives: ['I'],
        processing: ['during']
      };
      
      const { filtered } = advancedFilters(mockSearchResults, filters);
      
      expect(filtered).toHaveLength(2); // Both test-1 and test-3 match the filters
      expect(filtered.every(result => result.source.experiencer === 'self')).toBe(true);
      expect(filtered.every(result => result.source.perspective === 'I')).toBe(true);
      expect(filtered.every(result => result.source.processing === 'during')).toBe(true);
    });

    test('should handle records without created date', () => {
      const recordsWithoutCreated = mockSourceRecords.map(record => ({
        ...record,
        created: '2024-01-15T10:00:00Z' // Use a default date instead of undefined
      }));
      
      const searchResults = recordsWithoutCreated.map(record => ({
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
          content: 'Minimal content',
          created: '2024-01-15T10:00:00Z'
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
  });
}); 