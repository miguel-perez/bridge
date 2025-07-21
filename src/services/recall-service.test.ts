import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { search } from './recall.js';
import * as storage from '../core/storage.js';
import * as embeddingSearch from './embedding-search.js';
import type { SourceRecord } from '../core/types.js';

// Mock dependencies
jest.mock('../core/storage');
jest.mock('./embedding-search');

describe('Recall Service', () => {
  const mockRecords: SourceRecord[] = [
    {
      id: 'exp_1',
      source: 'Feeling anxious about tomorrow',
      experiencer: 'Human',
      perspective: 'I',
      processing: 'during',
      experience: ['embodied.sensing', 'mood.closed', 'time.future'],
      created: '2025-01-21T10:00:00Z'
    },
    {
      id: 'exp_2',
      source: 'Had a breakthrough moment',
      experiencer: 'Human',
      perspective: 'I',
      processing: 'during',
      experience: ['embodied.thinking', 'mood.open', 'focus.broad'],
      created: '2025-01-21T10:01:00Z'
    },
    {
      id: 'exp_3',
      source: 'Feeling stuck on this problem',
      experiencer: 'Human',
      perspective: 'I',
      processing: 'during',
      experience: ['embodied.thinking', 'mood.closed', 'focus.narrow'],
      created: '2025-01-21T10:02:00Z'
    },
    {
      id: 'exp_4',
      source: 'Exploring new possibilities',
      experiencer: 'Human',
      perspective: 'I',
      processing: 'during',
      experience: ['mood.open', 'purpose.wander', 'time.future'],
      created: '2025-01-21T10:03:00Z'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock getAllRecords to return our test data
    (storage.getAllRecords as jest.Mock).mockResolvedValue(mockRecords);
    // Mock findSimilarByEmbedding to return empty results by default
    (embeddingSearch.findSimilarByEmbedding as jest.Mock).mockResolvedValue([]);
  });

  describe('Dimensional Filtering', () => {
    it('should filter by single dimension', async () => {
      const result = await search({ query: 'mood.closed' });
      
      expect(result.results).toHaveLength(2);
      expect(result.results.map(r => r.id).sort()).toEqual(['exp_1', 'exp_3']);
    });

    it('should filter by single dimension (mood.open)', async () => {
      const result = await search({ query: 'mood.open' });
      
      expect(result.results).toHaveLength(2);
      expect(result.results.map(r => r.id).sort()).toEqual(['exp_2', 'exp_4']);
    });

    it('should filter by array of dimensions (ALL must match)', async () => {
      const result = await search({ query: ['embodied.sensing', 'mood.closed'] });
      
      expect(result.results).toHaveLength(1);
      expect(result.results[0].id).toBe('exp_1');
    });

    it('should filter by array with partial dimension match', async () => {
      const result = await search({ query: ['mood.open', 'purpose.wander'] });
      
      expect(result.results).toHaveLength(1);
      expect(result.results[0].id).toBe('exp_4');
    });

    it('should match base dimensions with subtypes', async () => {
      const result = await search({ query: 'embodied' });
      
      expect(result.results).toHaveLength(3); // exp_1, exp_2, exp_3 all have embodied.*
      expect(result.results.map(r => r.id).sort()).toEqual(['exp_1', 'exp_2', 'exp_3']);
    });

    it('should return empty results when no dimensions match', async () => {
      const result = await search({ query: 'space.here' });
      
      expect(result.results).toHaveLength(0);
    });

    it('should not filter on mixed text/dimension queries', async () => {
      const result = await search({ query: ['anxiety', 'mood.closed'] });
      
      // Should return all experiences (no filtering)
      expect(result.results).toHaveLength(4);
      
      // But exp_1 should score highest due to text match
      const exp1 = result.results.find(r => r.id === 'exp_1');
      expect(exp1).toBeDefined();
      expect(exp1!.relevance_score).toBeGreaterThan(0.4); // Has both text and dimension match
    });

    it('should handle invalid dimensions as text search', async () => {
      const result = await search({ query: 'not.a.dimension' });
      
      // Should return all experiences (treated as text search)
      expect(result.results).toHaveLength(4);
    });
  });

  describe('Filtering', () => {
    it('should filter by experiencer', async () => {
      const result = await search({ 
        query: '',
        experiencer: 'Human' 
      });
      
      expect(result.results).toHaveLength(4);
      expect(result.results.every(r => r.metadata?.experiencer === 'Human')).toBe(true);
    });

    it('should filter by perspective', async () => {
      const result = await search({ 
        query: '',
        perspective: 'I' 
      });
      
      expect(result.results).toHaveLength(4);
      expect(result.results.every(r => r.metadata?.perspective === 'I')).toBe(true);
    });

    it('should filter by processing', async () => {
      const result = await search({ 
        query: '',
        processing: 'during' 
      });
      
      expect(result.results).toHaveLength(4);
      expect(result.results.every(r => r.metadata?.processing === 'during')).toBe(true);
    });

    it('should combine multiple filters', async () => {
      // Add a record with different experiencer
      const mixedRecords = [...mockRecords, {
        id: 'exp_5',
        source: 'Observing patterns',
        experiencer: 'Claude',
        perspective: 'I',
        processing: 'during',
        experience: ['embodied.thinking'],
        created: '2025-01-21T10:04:00Z'
      }];
      
      (storage.getAllRecords as jest.Mock).mockResolvedValue(mixedRecords);
      
      const result = await search({ 
        query: '',
        experiencer: 'Human',
        perspective: 'I'
      });
      
      expect(result.results).toHaveLength(4); // Only Human experiences
      expect(result.results.every(r => r.metadata?.experiencer === 'Human')).toBe(true);
    });
  });

  describe('Sorting', () => {
    it('should sort by created date (descending) by default', async () => {
      const result = await search({ query: '' });
      
      const dates = result.results.map(r => new Date(r.metadata!.created).getTime());
      expect(dates).toEqual([...dates].sort((a, b) => b - a));
    });

    it('should sort by relevance when specified', async () => {
      const result = await search({ 
        query: 'stuck',
        sort: 'relevance' 
      });
      
      // exp_3 should be first due to exact match
      expect(result.results[0].id).toBe('exp_3');
      expect(result.results[0].relevance_score).toBeGreaterThan(0);
    });
  });

  describe('Semantic Search', () => {
    it('should use semantic search for non-dimensional text queries', async () => {
      // Mock semantic search results
      (embeddingSearch.findSimilarByEmbedding as jest.Mock).mockResolvedValue([
        { sourceId: 'exp_1', similarity: 0.8 }
      ]);
      
      const result = await search({ 
        query: 'worried about presentation',
        semantic_query: 'worried about presentation'
      });
      
      // Should have called embedding search
      expect(embeddingSearch.findSimilarByEmbedding).toHaveBeenCalled();
      
      // exp_1 should have higher score due to semantic similarity
      const exp1 = result.results.find(r => r.id === 'exp_1');
      expect(exp1).toBeDefined();
      expect(exp1!.relevance_breakdown?.semantic).toBe(0.8);
    });

    it('should NOT use semantic search for pure dimensional queries', async () => {
      const result = await search({ 
        query: 'mood.closed'
        // Note: NOT passing semantic_query for dimensional queries
      });
      
      // Should NOT have called embedding search
      expect(embeddingSearch.findSimilarByEmbedding).not.toHaveBeenCalled();
      
      // Should only return mood.closed experiences
      expect(result.results).toHaveLength(2);
      expect(result.results.map(r => r.id).sort()).toEqual(['exp_1', 'exp_3']);
    });
  });

  describe('Special Queries', () => {
    it('should handle "recent" query', async () => {
      const result = await search({ query: 'recent' });
      
      // Should return all, sorted by created date
      expect(result.results.length).toBeLessThanOrEqual(5); // Limited to 5 for recent
      const dates = result.results.map(r => new Date(r.metadata!.created).getTime());
      expect(dates).toEqual([...dates].sort((a, b) => b - a));
    });

    it('should handle empty query', async () => {
      const result = await search({ query: '' });
      
      // Should return all records
      expect(result.results).toHaveLength(4);
    });

    it('should apply limit', async () => {
      const result = await search({ 
        query: '',
        limit: 2 
      });
      
      expect(result.results).toHaveLength(2);
    });

    it('should apply offset for pagination', async () => {
      const result = await search({ 
        query: '',
        offset: 2,
        limit: 2 
      });
      
      expect(result.results).toHaveLength(2);
      // Should skip first 2 records (when sorted by created desc)
      expect(result.results.map(r => r.id).sort()).toEqual(['exp_1', 'exp_2']);
    });
  });
});