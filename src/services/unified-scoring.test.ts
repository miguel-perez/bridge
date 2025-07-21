import { describe, it, expect } from '@jest/globals';
import { applyFiltersAndScore } from './unified-scoring.js';
import type { SourceRecord } from '../core/types.js';

describe('Dimensional Filtering', () => {
  const mockExperiences: SourceRecord[] = [
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
    }
  ];

  it('should filter experiences by single dimension query', () => {
    const query = 'mood.closed';
    const results = applyFiltersAndScore(mockExperiences, query, {}, new Map());
    
    // Should only return experiences with mood.closed
    expect(results).toHaveLength(2);
    expect(results.map(r => r.experience.id).sort()).toEqual(['exp_1', 'exp_3']);
  });

  it('should filter experiences by array dimension query', () => {
    const query = ['embodied.sensing', 'mood.closed'];
    const results = applyFiltersAndScore(mockExperiences, query, {}, new Map());
    
    // Should only return experiences with BOTH dimensions
    expect(results).toHaveLength(1);
    expect(results[0].experience.id).toBe('exp_1');
  });

  it('should match base dimensions with subtypes', () => {
    const query = 'embodied';
    const results = applyFiltersAndScore(mockExperiences, query, {}, new Map());
    
    // Should return all experiences since they all have embodied.* dimensions
    expect(results).toHaveLength(3);
  });

  it('should not filter on mixed text/dimension queries', () => {
    const query = ['anxiety', 'mood.closed'];
    const results = applyFiltersAndScore(mockExperiences, query, {}, new Map());
    
    // Mixed queries should score all experiences (not filter)
    expect(results).toHaveLength(3);
    
    // Find exp_1 in results
    const exp1Result = results.find(r => r.experience.id === 'exp_1');
    expect(exp1Result).toBeDefined();
    
    // exp_1 should have high exact match score for "anxiety" -> "anxious"
    expect(exp1Result!.factors.exact).toBeGreaterThan(0);
    
    // exp_1 should score higher than exp_2 (which has no matches)
    const exp2Result = results.find(r => r.experience.id === 'exp_2');
    expect(exp1Result!.score).toBeGreaterThan(exp2Result!.score);
  });

  it('should return empty results when no dimensions match', () => {
    const query = 'space.here';
    const results = applyFiltersAndScore(mockExperiences, query, {}, new Map());
    
    // No experiences have spatial dimensions
    expect(results).toHaveLength(0);
  });

  it('should handle invalid dimension queries gracefully', () => {
    const query = 'not.a.dimension';
    const results = applyFiltersAndScore(mockExperiences, query, {}, new Map());
    
    // Invalid dimensions should return all experiences (treated as text search)
    expect(results).toHaveLength(3);
  });
});