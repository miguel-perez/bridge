import {
  groupByWho,
  groupByDate,
  groupByQualitySignature,
  groupByPerspective,
  groupBySimilarity,
  type GroupedResult,
} from './grouping.js';
import { SourceRecord } from '../core/types.js';

describe('Grouping Service', () => {
  const mockExperiences: SourceRecord[] = [
    {
      id: 'exp1',
      source: 'I feel anxious about the presentation',
      emoji: '😰',
      who: 'Alice',
      perspective: 'I',
      processing: 'during',
      created: '2025-01-15T10:00:00Z',
      experience: ['embodied.sensing', 'mood.closed'],
      crafted: false,
      reflects: [],
    },
    {
      id: 'exp2',
      source: 'I feel anxious about the meeting',
      emoji: '😰',
      who: 'Bob',
      perspective: 'I',
      processing: 'during',
      created: '2025-01-15T11:00:00Z',
      experience: ['embodied.sensing', 'mood.closed'],
      crafted: false,
      reflects: [],
    },
    {
      id: 'exp3',
      source: 'I am thinking deeply about this problem',
      emoji: '🤔',
      who: 'Alice',
      perspective: 'I',
      processing: 'during',
      created: '2025-01-16T09:00:00Z',
      experience: ['embodied.thinking', 'focus.narrow'],
      crafted: false,
      reflects: [],
    },
    {
      id: 'exp4',
      source: 'We are working together on this project',
      emoji: '👥',
      who: 'Team',
      perspective: 'we',
      processing: 'during',
      created: '2025-01-16T14:00:00Z',
      experience: ['presence.collective', 'purpose.goal'],
      crafted: false,
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
    it('should group experiences by complete quality signature', () => {
      const result = groupByQualitySignature(mockExperiences);

      expect(result).toHaveLength(3);

      // Find the group with embodied.sensing, mood.closed
      const anxietyGroup = result.find(
        (group) =>
          group.commonQualities?.includes('embodied.sensing') &&
          group.commonQualities?.includes('mood.closed')
      );
      expect(anxietyGroup).toBeDefined();
      expect(anxietyGroup?.count).toBe(2);

      // Find the group with embodied.thinking, focus.narrow
      const thinkingGroup = result.find(
        (group) =>
          group.commonQualities?.includes('embodied.thinking') &&
          group.commonQualities?.includes('focus.narrow')
      );
      expect(thinkingGroup).toBeDefined();
      expect(thinkingGroup?.count).toBe(1);
    });

    it('should sort by count descending', () => {
      const result = groupByQualitySignature(mockExperiences);

      expect(result[0].count).toBeGreaterThanOrEqual(result[1].count);
      expect(result[1].count).toBeGreaterThanOrEqual(result[2].count);
    });
  });

  describe('groupByPerspective', () => {
    it('should group experiences by perspective', () => {
      const result = groupByPerspective(mockExperiences);

      expect(result).toHaveLength(2);

      const firstPersonGroup = result.find((group) => group.key === 'I');
      expect(firstPersonGroup).toBeDefined();
      expect(firstPersonGroup?.count).toBe(3);

      const collectiveGroup = result.find((group) => group.key === 'we');
      expect(collectiveGroup).toBeDefined();
      expect(collectiveGroup?.count).toBe(1);
    });

    it('should handle experiences with no perspective', () => {
      const experiencesWithUnknown = [
        { ...mockExperiences[0], perspective: undefined },
        { ...mockExperiences[1], perspective: 'I' },
      ];

      const result = groupByPerspective(experiencesWithUnknown);

      expect(result).toHaveLength(2);
      // Sort by count descending, so I (count 1) comes before Unknown (count 1)
      // But since they have the same count, the order might vary
      const iGroup = result.find((group) => group.key === 'I');
      const unknownGroup = result.find((group) => group.key === 'Unknown');

      expect(iGroup).toEqual({
        key: 'I',
        label: 'First person (I) (1 experience)',
        count: 1,
        experiences: [experiencesWithUnknown[1]],
      });
      expect(unknownGroup).toEqual({
        key: 'Unknown',
        label: 'Unknown perspective (1 experience)',
        count: 1,
        experiences: [experiencesWithUnknown[0]],
      });
    });
  });

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
