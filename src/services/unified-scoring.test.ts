import { describe, it, expect } from '@jest/globals';
import { applyFiltersAndScore } from './unified-scoring.js';
import type { SourceRecord } from '../core/types.js';
import { humanQualities } from '../test-utils/format-converter.js';

describe('Quality Filtering', () => {
  const mockExperiences: SourceRecord[] = [
    {
      id: 'exp_1',
      source: 'Feeling anxious about tomorrow',
      emoji: '😰',
      who: 'Human',
      perspective: 'I',
      processing: 'during',
      experienceQualities: humanQualities('embodied.sensing', 'mood.closed', 'time.future'),
      created: '2025-01-21T10:00:00Z',
    },
    {
      id: 'exp_2',
      source: 'Had a breakthrough moment',
      emoji: '💡',
      who: 'Human',
      perspective: 'I',
      processing: 'during',
      experienceQualities: humanQualities('embodied.thinking', 'mood.open', 'focus.broad'),
      created: '2025-01-21T10:01:00Z',
    },
    {
      id: 'exp_3',
      source: 'Feeling stuck on this problem',
      emoji: '🤔',
      who: 'Human',
      perspective: 'I',
      processing: 'during',
      experienceQualities: humanQualities('embodied.thinking', 'mood.closed', 'focus.narrow'),
      created: '2025-01-21T10:02:00Z',
    },
  ];

  it('should filter experiences by single quality query', () => {
    const query = 'mood.closed';
    const results = applyFiltersAndScore(mockExperiences, query, {}, new Map());

    // Should only return experiences with mood.closed
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.experience.id).sort()).toEqual(['exp_1', 'exp_3']);
  });

  it('should filter experiences by array quality query', () => {
    const query = ['embodied.sensing', 'mood.closed'];
    const results = applyFiltersAndScore(mockExperiences, query, {}, new Map());

    // Should only return experiences with BOTH qualities
    expect(results).toHaveLength(1);
    expect(results[0].experience.id).toBe('exp_1');
  });

  it('should match base qualities with subtypes', () => {
    const query = 'embodied';
    const results = applyFiltersAndScore(mockExperiences, query, {}, new Map());

    // Should return all experiences since they all have embodied.* qualities
    expect(results).toHaveLength(3);
  });

  it('should not filter on mixed text/quality queries', () => {
    const query = ['anxious', 'mood.closed'];
    const results = applyFiltersAndScore(mockExperiences, query, {}, new Map());

    // Mixed queries should score all experiences (not filter)
    expect(results).toHaveLength(3);

    // Find exp_1 in results
    const exp1Result = results.find((r) => r.experience.id === 'exp_1');
    expect(exp1Result).toBeDefined();

    // exp_1 should have exact match score for "anxious" (exact word match)
    expect(exp1Result!.factors.exact).toBeGreaterThan(0);

    // exp_1 should score higher than exp_2 (which has no matches)
    const exp2Result = results.find((r) => r.experience.id === 'exp_2');
    expect(exp1Result!.score).toBeGreaterThan(exp2Result!.score);
  });

  it('should return empty results when no qualities match', () => {
    const query = 'space.here';
    const results = applyFiltersAndScore(mockExperiences, query, {}, new Map());

    // No experiences have spatial qualities
    expect(results).toHaveLength(0);
  });

  it('should handle invalid quality queries gracefully', () => {
    const query = 'not.a.quality';
    const results = applyFiltersAndScore(mockExperiences, query, {}, new Map());

    // Invalid qualities should return all experiences (treated as text search)
    expect(results).toHaveLength(3);
  });
});


describe('Sophisticated Quality Filtering Integration', () => {
  const mockExperience1: SourceRecord = {
    id: 'exp_1',
    source: 'I feel anxious about the presentation',
    emoji: '😰',
    who: 'Human',
    perspective: 'I',
    processing: 'during',
    created: '2025-01-21T10:00:00Z',
    experienceQualities: humanQualities('embodied.sensing', 'mood.closed', 'time.future'),
  };

  const mockExperience2: SourceRecord = {
    id: 'exp_2',
    source: 'I feel excited about the project',
    emoji: '🎉',
    who: 'Human',
    perspective: 'I',
    processing: 'during',
    created: '2025-01-21T10:01:00Z',
    experienceQualities: humanQualities('embodied.thinking', 'mood.open', 'time.future'),
  };

  const mockExperience3: SourceRecord = {
    id: 'exp_3',
    source: 'I am focused on solving this problem',
    emoji: '🎯',
    who: 'Human',
    perspective: 'I',
    processing: 'during',
    created: '2025-01-21T10:02:00Z',
    experienceQualities: humanQualities('focus.narrow', 'purpose.goal'),
  };

  const mockExperience4: SourceRecord = {
    id: 'exp_4',
    source: 'I feel calm and centered',
    emoji: '🧘',
    who: 'Human',
    perspective: 'I',
    processing: 'during',
    created: '2025-01-21T10:03:00Z',
    experienceQualities: humanQualities('embodied.sensing', 'mood.open', 'space.here'),
  };

  const experiences = [mockExperience1, mockExperience2, mockExperience3, mockExperience4];

  describe('applyFiltersAndScore with sophisticated quality filters', () => {
    it('should filter by presence/absence of qualities', () => {
      const filters = {
        qualities: {
          embodied: { present: true },
          mood: { present: false },
        },
      };

      const result = applyFiltersAndScore(experiences, '', filters, new Map());

      // Should find experiences with embodied qualities but no mood qualities
      // exp_3 has focus.narrow, purpose.goal (no embodied, no mood) - doesn't match
      // exp_1 has embodied.sensing, mood.closed - doesn't match (has mood)
      // exp_2 has embodied.thinking, mood.open - doesn't match (has mood)
      // exp_4 has embodied.sensing, mood.open - doesn't match (has mood)
      expect(result).toHaveLength(0);
    });

    it('should filter by specific quality values', () => {
      const filters = {
        qualities: {
          mood: 'closed',
        },
      };

      const result = applyFiltersAndScore(experiences, '', filters, new Map());

      // Should find experiences with mood.closed
      expect(result).toHaveLength(1);
      expect(result[0].experience.id).toBe('exp_1');
    });

    it('should filter by OR logic within qualities', () => {
      const filters = {
        qualities: {
          embodied: ['thinking', 'sensing'],
        },
      };

      const result = applyFiltersAndScore(experiences, '', filters, new Map());

      // Should find experiences with either embodied.thinking OR embodied.sensing
      expect(result).toHaveLength(3);
      const ids = result.map((r) => r.experience.id).sort();
      expect(ids).toEqual(['exp_1', 'exp_2', 'exp_4']);
    });

    it('should filter by complex boolean expressions', () => {
      const filters = {
        qualities: {
          $and: [
            { mood: 'open' },
            {
              $or: [{ embodied: 'thinking' }, { focus: 'narrow' }],
            },
          ],
        },
      };

      const result = applyFiltersAndScore(experiences, '', filters, new Map());

      // Should find experiences with mood.open AND (embodied.thinking OR focus.narrow)
      // exp_2: mood.open AND embodied.thinking ✓
      // exp_3: focus.narrow but NOT mood.open ✗
      // exp_4: embodied.sensing but NOT embodied.thinking ✗
      expect(result).toHaveLength(1);
      expect(result[0].experience.id).toBe('exp_2');
    });

    it('should handle NOT logic', () => {
      const filters = {
        qualities: {
          $not: {
            mood: 'closed',
          },
        },
      };

      const result = applyFiltersAndScore(experiences, '', filters, new Map());

      // Should find experiences that do NOT have mood.closed
      expect(result).toHaveLength(3);
      const ids = result.map((r) => r.experience.id).sort();
      expect(ids).toEqual(['exp_2', 'exp_3', 'exp_4']);
    });

    it('should maintain backward compatibility with legacy quality filtering', () => {
      // Test without sophisticated filters - should use legacy logic
      const result = applyFiltersAndScore(experiences, 'mood.closed', {}, new Map());

      // Should find experiences with mood.closed using legacy filtering
      expect(result).toHaveLength(1);
      expect(result[0].experience.id).toBe('exp_1');
    });

    it('should handle invalid quality filters gracefully', () => {
      const filters = {
        qualities: {
          mood: 'invalid_value' as unknown as string,
        },
      };

      const result = applyFiltersAndScore(experiences, '', filters, new Map());

      // The QualityFilterService validates quality values, so invalid values are filtered out
      // This is actually correct behavior - we don't want invalid filters to pass through
      expect(result).toHaveLength(0);
    });

    it('should combine sophisticated filters with other filters', () => {
      const filters = {
        who: 'Human',
        qualities: {
          embodied: { present: true },
        },
      };

      const result = applyFiltersAndScore(experiences, '', filters, new Map());

      // Should find experiences with embodied qualities and experiencer Human
      expect(result).toHaveLength(3);
      const ids = result.map((r) => r.experience.id).sort();
      expect(ids).toEqual(['exp_1', 'exp_2', 'exp_4']);
    });
  });
});
