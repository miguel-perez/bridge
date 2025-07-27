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

describe('Reflects Field Filtering', () => {
  const mockExperiencesWithReflects: SourceRecord[] = [
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
      id: 'pattern_1',
      source: 'I notice I always feel anxious before things that end up going well',
      emoji: '🔍',
      who: 'Human',
      perspective: 'I',
      processing: 'long-after',
      experienceQualities: humanQualities('embodied.sensing', 'mood.closed', 'time.future'),
      reflects: ['exp_1', 'exp_2'],
      created: '2025-01-21T11:00:00Z',
    },
    {
      id: 'pattern_2',
      source:
        'I see a pattern where your mood.closed experiences often precede mood.open breakthroughs',
      emoji: '🤖',
      who: 'Claude',
      perspective: 'I',
      processing: 'long-after',
      experienceQualities: humanQualities('embodied.thinking', 'mood.open'),
      reflects: ['exp_1', 'exp_2'],
      created: '2025-01-21T11:01:00Z',
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

  it('should filter for pattern realizations only when reflects filter is "only"', () => {
    const query = '';
    const filters = { reflects: 'only' as const };
    const results = applyFiltersAndScore(mockExperiencesWithReflects, query, filters, new Map());

    // Should only return experiences with reflects field
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.experience.id).sort()).toEqual(['pattern_1', 'pattern_2']);
  });

  it('should return all experiences when no reflects filter is applied', () => {
    const query = '';
    const filters = {};
    const results = applyFiltersAndScore(mockExperiencesWithReflects, query, filters, new Map());

    // Should return all experiences
    expect(results).toHaveLength(5);
  });

  it('should combine reflects filter with other filters', () => {
    const query = 'mood.closed';
    const filters = { reflects: 'only' as const };
    const results = applyFiltersAndScore(mockExperiencesWithReflects, query, filters, new Map());

    // Should only return pattern realizations that also have mood.closed
    expect(results).toHaveLength(1);
    expect(results[0].experience.id).toBe('pattern_1');
  });

  it('should handle experiences with empty reflects array', () => {
    const experiencesWithEmptyReflects: SourceRecord[] = [
      {
        id: 'pattern_3',
        source: 'I notice a pattern',
        emoji: '🔍',
        who: 'Human',
        perspective: 'I',
        processing: 'long-after',
        experienceQualities: humanQualities('embodied.thinking', 'focus.narrow'),
        reflects: [],
        created: '2025-01-21T11:02:00Z',
      },
    ];

    const query = '';
    const filters = { reflects: 'only' as const };
    const results = applyFiltersAndScore(experiencesWithEmptyReflects, query, filters, new Map());

    // Should include experiences with empty reflects array
    expect(results).toHaveLength(1);
    expect(results[0].experience.id).toBe('pattern_3');
  });

  it('should handle mixed queries with reflects filter', () => {
    const query = ['anxiety', 'patterns'];
    const filters = { reflects: 'only' as const };
    const results = applyFiltersAndScore(mockExperiencesWithReflects, query, filters, new Map());

    // Should return pattern realizations and score them based on text similarity
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.experience.id).sort()).toEqual(['pattern_1', 'pattern_2']);

    // pattern_1 should score higher due to "anxiety" content
    const pattern1Result = results.find((r) => r.experience.id === 'pattern_1');
    const pattern2Result = results.find((r) => r.experience.id === 'pattern_2');
    expect(pattern1Result!.score).toBeGreaterThan(pattern2Result!.score);
  });

  it('should maintain backward compatibility with experiences without reflects field', () => {
    const query = '';
    const filters = { reflects: 'only' as const };
    const results = applyFiltersAndScore(mockExperiencesWithReflects, query, filters, new Map());

    // Should not include experiences without reflects field
    const regularExperiences = results.filter((r) => !r.experience.reflects);
    expect(regularExperiences).toHaveLength(0);
  });
});

describe('Reflected By Filtering', () => {
  const mockExperiencesForReflectedBy: SourceRecord[] = [
    {
      id: 'exp-1',
      source: 'Original experience',
      emoji: '💬',
      who: 'Human',
      perspective: 'I',
      processing: 'during',
      experienceQualities: humanQualities('mood.open', 'presence.collective'),
      created: '2025-01-21T10:00:00Z',
    },
    {
      id: 'pattern-1',
      source: 'Pattern realization 1',
      emoji: '🌊',
      who: 'Human',
      perspective: 'I',
      processing: 'long-after',
      experienceQualities: humanQualities('embodied.thinking', 'focus.narrow'),
      reflects: ['exp-1'],
      created: '2025-01-21T11:00:00Z',
    },
    {
      id: 'pattern-2',
      source: 'Pattern realization 2',
      emoji: '🌊',
      who: 'Human',
      perspective: 'I',
      processing: 'long-after',
      experienceQualities: humanQualities('embodied.thinking', 'focus.narrow'),
      reflects: ['exp-1'],
      created: '2025-01-21T11:01:00Z',
    },
    {
      id: 'exp-2',
      source: 'Another experience',
      emoji: '💭',
      who: 'Human',
      perspective: 'I',
      processing: 'during',
      experienceQualities: humanQualities('mood.closed', 'embodied.sensing'),
      created: '2025-01-21T10:01:00Z',
    },
  ];

  it('should filter by reflected_by with single ID', () => {
    const query = '';
    const filters = { reflected_by: 'pattern-1' };
    const results = applyFiltersAndScore(mockExperiencesForReflectedBy, query, filters, new Map());

    expect(results).toHaveLength(1);
    expect(results[0].experience.id).toBe('exp-1');
  });

  it('should filter by reflected_by with multiple IDs', () => {
    const query = '';
    const filters = { reflected_by: ['pattern-1', 'pattern-2'] };
    const results = applyFiltersAndScore(mockExperiencesForReflectedBy, query, filters, new Map());

    expect(results).toHaveLength(1);
    expect(results[0].experience.id).toBe('exp-1');
  });

  it('should return empty results when no experiences are reflected by specified IDs', () => {
    const query = '';
    const filters = { reflected_by: 'non-existent-id' };
    const results = applyFiltersAndScore(mockExperiencesForReflectedBy, query, filters, new Map());

    expect(results).toHaveLength(0);
  });

  it('should combine reflected_by filter with other filters', () => {
    const query = 'mood.open';
    const filters = { reflected_by: 'pattern-1' };
    const results = applyFiltersAndScore(mockExperiencesForReflectedBy, query, filters, new Map());

    expect(results).toHaveLength(1);
    expect(results[0].experience.id).toBe('exp-1');
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
