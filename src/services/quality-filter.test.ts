/**
 * Unit tests for QualityFilterService
 */

import { QualityFilterService, QualityFilter, QualityFilterError } from './quality-filter.js';
import { SourceRecord } from '../core/types.js';

describe('QualityFilterService', () => {
  let service: QualityFilterService;

  beforeEach(() => {
    service = new QualityFilterService();
  });

  // Test data
  const mockExperience: SourceRecord = {
    id: 'test-1',
    source: 'I feel anxious about the presentation',
    created: '2025-07-21T10:00:00Z',
    experienceQualities: {
      embodied: 'feeling the tension in my body',
      focus: false,
      mood: 'feeling closed off and anxious',
      purpose: false,
      space: false,
      time: 'worrying about what\'s coming',
      presence: false,
    },
    emoji: '🤔'};

  const mockExperienceWithMultipleQualities: SourceRecord = {
    id: 'test-2',
    source: 'I feel focused and energized',
    created: '2025-07-21T11:00:00Z',
    experienceQualities: {
      embodied: 'thinking through the problem clearly',
      focus: 'narrowing in on the key issue',
      mood: 'feeling open and energized',
      purpose: 'working toward my goal',
      space: false,
      time: false,
      presence: false,
    },
    emoji: '💪'};

  const mockExperienceWithoutQualities: SourceRecord = {
    id: 'test-3',
    source: 'Just a simple experience',
    created: '2025-07-21T12:00:00Z',
    experienceQualities: undefined,
    emoji: '👍'};

  describe('parseQualityFilter', () => {
    it('should parse simple value filters', () => {
      const filter: QualityFilter = { mood: 'anxious' };
      const result = service.parseQualityFilter(filter);

      expect(result).toEqual({
        type: 'value',
        quality: 'mood',
        values: ['anxious'],
        operator: 'exact'});
    });

    it('should parse multiple value filters (OR logic)', () => {
      const filter: QualityFilter = { embodied: ['thinking', 'sensing'] };
      const result = service.parseQualityFilter(filter);

      expect(result).toEqual({
        type: 'value',
        quality: 'embodied',
        values: ['thinking', 'sensing'],
        operator: 'exact'});
    });

    it('should parse presence filters', () => {
      const filter: QualityFilter = { mood: { present: true } };
      const result = service.parseQualityFilter(filter);

      expect(result).toEqual({
        type: 'presence',
        quality: 'mood',
        present: true});
    });

    it('should parse absence filters', () => {
      const filter: QualityFilter = { mood: { present: false } };
      const result = service.parseQualityFilter(filter);

      expect(result).toEqual({
        type: 'presence',
        quality: 'mood',
        present: false});
    });

    it('should parse AND expressions for multiple qualities', () => {
      const filter: QualityFilter = {
        mood: 'closed',
        embodied: 'sensing'};
      const result = service.parseQualityFilter(filter);

      expect(result).toEqual({
        type: 'and',
        filters: [
          {
            type: 'value',
            quality: 'mood',
            values: ['closed'],
            operator: 'exact'},
          {
            type: 'value',
            quality: 'embodied',
            values: ['sensing'],
            operator: 'exact'}]});
    });

    it('should parse explicit AND expressions', () => {
      const filter: QualityFilter = {
        $and: [{ mood: 'closed' }, { embodied: 'sensing' }]};
      const result = service.parseQualityFilter(filter);

      expect(result).toEqual({
        type: 'and',
        filters: [
          {
            type: 'value',
            quality: 'mood',
            values: ['closed'],
            operator: 'exact'},
          {
            type: 'value',
            quality: 'embodied',
            values: ['sensing'],
            operator: 'exact'}]});
    });

    it('should parse OR expressions', () => {
      const filter: QualityFilter = {
        $or: [{ mood: 'closed' }, { embodied: 'sensing' }]};
      const result = service.parseQualityFilter(filter);

      expect(result).toEqual({
        type: 'or',
        filters: [
          {
            type: 'value',
            quality: 'mood',
            values: ['closed'],
            operator: 'exact'},
          {
            type: 'value',
            quality: 'embodied',
            values: ['sensing'],
            operator: 'exact'}]});
    });

    it('should parse NOT expressions', () => {
      const filter: QualityFilter = {
        $not: { mood: 'closed' }};
      const result = service.parseQualityFilter(filter);

      expect(result).toEqual({
        type: 'not',
        filter: {
          type: 'value',
          quality: 'mood',
          values: ['closed'],
          operator: 'exact'}});
    });

    it('should parse complex nested expressions', () => {
      const filter: QualityFilter = {
        $and: [
          { mood: 'closed' },
          {
            $or: [{ embodied: 'thinking' }, { focus: 'narrow' }]}]};
      const result = service.parseQualityFilter(filter);

      expect(result).toEqual({
        type: 'and',
        filters: [
          {
            type: 'value',
            quality: 'mood',
            values: ['closed'],
            operator: 'exact'},
          {
            type: 'or',
            filters: [
              {
                type: 'value',
                quality: 'embodied',
                values: ['thinking'],
                operator: 'exact'},
              {
                type: 'value',
                quality: 'focus',
                values: ['narrow'],
                operator: 'exact'}]}]});
    });

    it('should throw error for empty filter', () => {
      expect(() => service.parseQualityFilter({})).toThrow(QualityFilterError);
      expect(() => service.parseQualityFilter({})).toThrow('Empty filter provided');
    });

    it('should throw error for invalid filter value', () => {
      const filter = { mood: 123 as unknown as QualityFilter };
      expect(() => service.parseQualityFilter(filter)).toThrow(QualityFilterError);
      expect(() => service.parseQualityFilter(filter)).toThrow('Invalid filter value for quality');
    });
  });

  describe('evaluateFilter', () => {
    it('should evaluate simple value filters correctly', () => {
      const filter = service.parseQualityFilter({ mood: 'anxious' }); // matches 'feeling closed off and anxious'

      expect(service.evaluateFilter(mockExperience, filter)).toBe(true);
      expect(service.evaluateFilter(mockExperienceWithMultipleQualities, filter)).toBe(false);
    });

    it('should evaluate multiple value filters (OR logic)', () => {
      const filter = service.parseQualityFilter({ embodied: ['thinking', 'tension'] }); // matches 'thinking through' or 'tension in my body'

      expect(service.evaluateFilter(mockExperience, filter)).toBe(true); // has 'tension in my body'
      expect(service.evaluateFilter(mockExperienceWithMultipleQualities, filter)).toBe(true); // has 'thinking through'
    });

    it('should evaluate presence filters correctly', () => {
      const presentFilter = service.parseQualityFilter({ mood: { present: true } });
      const absentFilter = service.parseQualityFilter({ mood: { present: false } });

      expect(service.evaluateFilter(mockExperience, presentFilter)).toBe(true);
      expect(service.evaluateFilter(mockExperience, absentFilter)).toBe(false);
      expect(service.evaluateFilter(mockExperienceWithoutQualities, presentFilter)).toBe(false);
      expect(service.evaluateFilter(mockExperienceWithoutQualities, absentFilter)).toBe(true);
    });

    it('should evaluate AND expressions correctly', () => {
      const filter = service.parseQualityFilter({
        mood: 'anxious',
        embodied: 'tension'});

      expect(service.evaluateFilter(mockExperience, filter)).toBe(true); // has both
      expect(service.evaluateFilter(mockExperienceWithMultipleQualities, filter)).toBe(false); // missing mood.closed
    });

    it('should evaluate OR expressions correctly', () => {
      const filter = service.parseQualityFilter({
        $or: [{ mood: 'closed' }, { embodied: 'thinking' }]});

      expect(service.evaluateFilter(mockExperience, filter)).toBe(true); // has mood.closed
      expect(service.evaluateFilter(mockExperienceWithMultipleQualities, filter)).toBe(true); // has embodied.thinking
      expect(service.evaluateFilter(mockExperienceWithoutQualities, filter)).toBe(false); // has neither
    });

    it('should evaluate NOT expressions correctly', () => {
      const filter = service.parseQualityFilter({
        $not: { mood: 'closed' }});

      expect(service.evaluateFilter(mockExperience, filter)).toBe(false); // has mood.closed
      expect(service.evaluateFilter(mockExperienceWithMultipleQualities, filter)).toBe(true); // doesn't have mood.closed
    });

    it('should evaluate complex nested expressions correctly', () => {
      const filter = service.parseQualityFilter({
        $and: [
          { mood: 'closed' },
          {
            $or: [{ embodied: 'thinking' }, { embodied: 'sensing' }]}]});

      expect(service.evaluateFilter(mockExperience, filter)).toBe(true); // mood.closed AND embodied.sensing (matches OR)
      expect(service.evaluateFilter(mockExperienceWithMultipleQualities, filter)).toBe(false); // missing mood.closed
    });

    it('should handle experiences without qualities', () => {
      const filter = service.parseQualityFilter({ mood: 'closed' });

      expect(service.evaluateFilter(mockExperienceWithoutQualities, filter)).toBe(false);
    });

    it('should handle experiences with undefined qualities', () => {
      const experienceWithoutExperience = { ...mockExperience, experienceQualities: undefined };
      const filter = service.parseQualityFilter({ mood: 'closed' });

      expect(service.evaluateFilter(experienceWithoutExperience, filter)).toBe(false);
    });
  });

  describe('validateFilter', () => {
    it('should validate simple valid filters', () => {
      const filter: QualityFilter = { mood: 'anxious' };
      const result = service.validateFilter(filter);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate complex valid filters', () => {
      const filter: QualityFilter = {
        $and: [{ mood: 'closed' }, { embodied: { present: true } }]};
      const result = service.validateFilter(filter);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject unknown qualities', () => {
      const filter = { unknownQuality: 'value' } as QualityFilter;
      const result = service.validateFilter(filter);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Unknown quality: unknownQuality at unknownQuality');
    });

    it('should reject invalid boolean operators', () => {
      const filter = { $invalid: [] } as unknown as QualityFilter;
      const result = service.validateFilter(filter);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Unknown boolean operator: $invalid at $invalid');
    });

    it('should reject empty arrays in boolean operators', () => {
      const filter: QualityFilter = { $and: [] };
      const result = service.validateFilter(filter);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('$and must contain at least one filter at $and');
    });

    it('should reject invalid filter values', () => {
      const filter = { mood: 123 as unknown as QualityFilter };
      const result = service.validateFilter(filter);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid filter value type at mood');
    });

    it('should reject empty arrays in quality values', () => {
      const filter: QualityFilter = { mood: [] };
      const result = service.validateFilter(filter);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Empty array not allowed at mood');
    });

    it('should reject invalid presence filter values', () => {
      const filter = { mood: { present: 'not-a-boolean' as unknown as boolean } };
      const result = service.validateFilter(filter);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('present must be a boolean at mood');
    });
  });

  describe('describeFilter', () => {
    it('should describe simple value filters', () => {
      const filter: QualityFilter = { mood: 'anxious' };
      expect(service.describeFilter(filter)).toBe('mood.anxious');
    });

    it('should describe multiple value filters', () => {
      const filter: QualityFilter = { embodied: ['thinking', 'sensing'] };
      expect(service.describeFilter(filter)).toBe('embodied (thinking OR sensing)');
    });

    it('should describe presence filters', () => {
      const filter: QualityFilter = { mood: { present: true } };
      expect(service.describeFilter(filter)).toBe('mood present');
    });

    it('should describe absence filters', () => {
      const filter: QualityFilter = { mood: { present: false } };
      expect(service.describeFilter(filter)).toBe('mood absent');
    });

    it('should describe AND expressions', () => {
      const filter: QualityFilter = { mood: 'closed', embodied: 'sensing' };
      expect(service.describeFilter(filter)).toBe('(mood.closed AND embodied.sensing)');
    });

    it('should describe OR expressions', () => {
      const filter: QualityFilter = {
        $or: [{ mood: 'closed' }, { embodied: 'sensing' }]};
      expect(service.describeFilter(filter)).toBe('(mood.closed OR embodied.sensing)');
    });

    it('should describe NOT expressions', () => {
      const filter: QualityFilter = {
        $not: { mood: 'closed' }};
      expect(service.describeFilter(filter)).toBe('NOT (mood.closed)');
    });

    it('should describe complex nested expressions', () => {
      const filter: QualityFilter = {
        $and: [
          { mood: 'closed' },
          {
            $or: [{ embodied: 'thinking' }, { focus: 'narrow' }]}]};
      expect(service.describeFilter(filter)).toBe(
        '(mood.closed AND (embodied.thinking OR focus.narrow))'
      );
    });

    it('should handle invalid filters gracefully', () => {
      const filter = { invalid: 123 } as unknown as QualityFilter;
      expect(service.describeFilter(filter)).toBe('Invalid filter');
    });
  });

  describe('error handling', () => {
    it('should throw QualityFilterError for evaluation errors', () => {
      const invalidExpression = { type: 'invalid' as unknown as string };

      expect(() => service.evaluateFilter(mockExperience, invalidExpression as unknown as QualityFilter)).toThrow(
        QualityFilterError
      );
      expect(() => service.evaluateFilter(mockExperience, invalidExpression as unknown as QualityFilter)).toThrow(
        'Unknown expression type: invalid'
      );
    });

    it('should provide meaningful error messages', () => {
      const filter = { mood: 123 as unknown as QualityFilter };

      expect(() => service.parseQualityFilter(filter)).toThrow(
        "Invalid filter value for quality 'mood': 123"
      );
    });
  });
});
