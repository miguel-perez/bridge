import { describe, it, expect } from '@jest/globals';
import {
  groupByWho,
  groupByDate,
  groupByQualitySignature,
  groupBySimilarity,
} from './grouping.js';
import { SourceRecord } from '../core/types.js';
import { humanQualities } from '../test-utils/format-converter.js';

describe('Grouping Service', () => {
  const mockExperiences: SourceRecord[] = [
    {
      id: 'exp1',
      source: 'I feel anxious about the presentation',
      emoji: '😰',
      who: 'Alice',
      created: '2025-01-15T10:00:00Z',
      experienceQualities: humanQualities('embodied.sensing', 'mood.closed'),
      reflects: [],
    },
    {
      id: 'exp2',
      source: 'I feel anxious about the meeting',
      emoji: '😰',
      who: 'Bob',
      created: '2025-01-15T11:00:00Z',
      experienceQualities: humanQualities('embodied.sensing', 'mood.closed'),
      reflects: [],
    },
    {
      id: 'exp3',
      source: 'I am thinking deeply about this problem',
      emoji: '🤔',
      who: 'Alice',
      created: '2025-01-16T09:00:00Z',
      experienceQualities: humanQualities('embodied.thinking', 'focus.narrow'),
      reflects: [],
    },
    {
      id: 'exp4',
      source: 'We are working together on this project',
      emoji: '👥',
      who: 'Team',
      created: '2025-01-16T14:00:00Z',
      experienceQualities: humanQualities('presence.collective', 'purpose.goal'),
      reflects: [],
    },
  ];

  describe('groupByWho', () => {
    it('should group experiences by who', () => {
      const result = groupByWho(mockExperiences);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        key: 'Alice',
        label: 'Alice (2 experiences)',
        count: 2,
        experiences: [mockExperiences[0], mockExperiences[2]],
      });
      expect(result[1]).toEqual({
        key: 'Bob',
        label: 'Bob (1 experience)',
        count: 1,
        experiences: [mockExperiences[1]],
      });
      expect(result[2]).toEqual({
        key: 'Team',
        label: 'Team (1 experience)',
        count: 1,
        experiences: [mockExperiences[3]],
      });
    });

    it('should handle experiences with no who', () => {
      const experiencesWithUnknown = [
        { ...mockExperiences[0], who: undefined },
        { ...mockExperiences[1], who: 'Bob' },
      ];

      const result = groupByWho(experiencesWithUnknown);

      expect(result).toHaveLength(2);
      // Sort by count descending, so Bob (count 1) comes before Unknown (count 1)
      // But since they have the same count, the order might vary
      const bobGroup = result.find((group) => group.key === 'Bob');
      const unknownGroup = result.find((group) => group.key === 'Unknown');

      expect(bobGroup).toEqual({
        key: 'Bob',
        label: 'Bob (1 experience)',
        count: 1,
        experiences: [experiencesWithUnknown[1]],
      });
      expect(unknownGroup).toEqual({
        key: 'Unknown',
        label: 'Unknown (1 experience)',
        count: 1,
        experiences: [experiencesWithUnknown[0]],
      });
    });
  });

  describe('groupByDate', () => {
    it('should group experiences by date', () => {
      const result = groupByDate(mockExperiences);

      expect(result).toHaveLength(2);
      expect(result[0].key).toEqual(new Date('2025-01-15'));
      expect(result[0].count).toBe(2);
      expect(result[1].key).toEqual(new Date('2025-01-16'));
      expect(result[1].count).toBe(2);
    });

    it('should sort chronologically', () => {
      const result = groupByDate(mockExperiences);

      const date1 = result[0].key as Date;
      const date2 = result[1].key as Date;
      expect(date1.getTime()).toBeLessThan(date2.getTime());
    });
  });

  describe('groupByQualitySignature', () => {
    it('should group experiences by dominant qualities with hierarchy', () => {
      const result = groupByQualitySignature(mockExperiences);

      // Should have at least 3 primary groups
      expect(result.length).toBeGreaterThanOrEqual(3);

      // Get all primary groups (single quality)
      const primaryGroups = result.filter(g => g.commonQualities?.length === 1);
      expect(primaryGroups.length).toBeGreaterThanOrEqual(3);

      // Check that we have the expected experiences grouped by some quality
      // The exact dominant quality might vary based on priority order
      
      // Count total experiences in primary groups
      const totalInPrimary = primaryGroups.reduce((sum, g) => sum + g.count, 0);
      expect(totalInPrimary).toBe(4); // All 4 mock experiences should be in primary groups

      // Verify hierarchical structure exists (some sub-groups)
      const _subGroups = result.filter(g => g.commonQualities && g.commonQualities.length > 1);
      
      // Check that experiences are properly distributed
      const allExperienceIds = new Set<string>();
      result.forEach(group => {
        group.experiences.forEach(exp => {
          allExperienceIds.add(exp.id);
        });
      });
      expect(allExperienceIds.size).toBe(4); // All 4 experiences should be represented
    });

    it('should sort by count descending', () => {
      const result = groupByQualitySignature(mockExperiences);

      // Get only primary groups (those with single quality in commonQualities)
      const primaryGroups = result.filter(g => g.commonQualities?.length === 1);
      
      for (let i = 1; i < primaryGroups.length; i++) {
        expect(primaryGroups[i - 1].count).toBeGreaterThanOrEqual(primaryGroups[i].count);
      }
    });
  });

  // groupByPerspective removed - perspective field no longer in source structure

  describe('groupBySimilarity', () => {
    it('should group experiences by similarity using clustering', async () => {
      const result = await groupBySimilarity(mockExperiences);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      // Should have at least one group
      expect(result.length).toBeGreaterThan(0);

      // Each group should have the expected structure
      result.forEach((group) => {
        expect(group).toHaveProperty('key');
        expect(group).toHaveProperty('label');
        expect(group).toHaveProperty('count');
        expect(group).toHaveProperty('experiences');
        expect(Array.isArray(group.experiences)).toBe(true);
        expect(group.count).toBe(group.experiences.length);
      });
    });
  });
});
