/**
 * Schema validation tests
 * 
 * Tests for Zod schema validation, example generation, and type inference.
 */

import { describe, it, expect } from '@jest/globals';
import {
  ExperienceInputSchema,
  SearchInputSchema,
  ReconsiderInputSchema,
  ReleaseInputSchema,
  generateExperienceExample,
  generateSearchExample,
  generateReconsiderExample,
  generateReleaseExample,
  generateBatchExperienceExample,
  generateBatchSearchExample,
  isExperienceInput,
  isSearchInput,
  isReconsiderInput,
  isReleaseInput,
  isToolResult,
  isToolTextContent,
  isExperienceObject,
  isSingleExperienceInput,
  isBatchExperienceInput,
  isSingleSearchInput,
  isBatchSearchInput,
  isSingleReconsiderInput,
  isBatchReconsiderInput,
  isSingleReleaseInput,
  isBatchReleaseInput,
  type ExperienceInput,
  type SearchInput,
  type ReconsiderInput,
  type ReleaseInput
} from './schemas.js';

describe('Schema Validation', () => {
  describe('ExperienceInputSchema', () => {
    it('should validate single experience input', () => {
      const input = generateExperienceExample();
      const result = ExperienceInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate batch experience input', () => {
      const input = generateBatchExperienceExample();
      const result = ExperienceInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject input with neither source nor experiences', () => {
      const input = {
        perspective: 'I',
        experiencer: 'Alex'
      };
      const result = ExperienceInputSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Either 'source' or 'experiences' must be provided");
      }
    });

    it('should validate with only source', () => {
      const input = {
        source: 'Test experience',
        perspective: 'I'
      };
      const result = ExperienceInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate with only experiences', () => {
      const input = {
        experiences: [{
          source: 'Test experience',
          perspective: 'I',
          experience: ['mood.open']
        }]
      };
      const result = ExperienceInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate with reflects field', () => {
      const input = {
        source: 'Pattern realization',
        perspective: 'I',
        experience: ['mood.open'],
        reflects: ['exp-123', 'exp-456']
      };
      const result = ExperienceInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate with empty reflects array', () => {
      const input = {
        source: 'Experience with empty reflects',
        perspective: 'I',
        experience: ['mood.open'],
        reflects: []
      };
      const result = ExperienceInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate with all optional fields', () => {
      const input = {
        source: 'Complete experience',
        perspective: 'I',
        experiencer: 'test',
        processing: 'during',
        crafted: false,
        experience: ['mood.open', 'embodied.sensing'],
        reflects: ['exp-123']
      };
      const result = ExperienceInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept any non-empty perspective string', () => {
      const input = {
        source: 'Test experience',
        perspective: 'custom-perspective'
      };
      const result = ExperienceInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject invalid processing', () => {
      const input = {
        source: 'Test experience',
        processing: 'invalid'
      };
      const result = ExperienceInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject invalid experience array', () => {
      const input = {
        source: 'Test experience',
        experience: 'not-an-array'
      };
      const result = ExperienceInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject invalid reflects field', () => {
      const input = {
        source: 'Test experience',
        reflects: 'not-an-array'
      };
      const result = ExperienceInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject empty source string', () => {
      const input = {
        source: ''
      };
      const result = ExperienceInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject empty experiences array', () => {
      const input = {
        experiences: []
      };
      const result = ExperienceInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject invalid experience in batch', () => {
      const input = {
        experiences: [{
          source: 'Test experience',
          experience: 'invalid'
        }]
      };
      const result = ExperienceInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('SearchInputSchema', () => {
    it('should validate search input', () => {
      const input = generateSearchExample();
      const result = SearchInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate batch search input', () => {
      const input = generateBatchSearchExample();
      const result = SearchInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate with only query', () => {
      const input = {
        query: 'test query'
      };
      const result = SearchInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate with only filters', () => {
      const input = {
        experiencer: 'Alex',
        perspective: 'I'
      };
      const result = SearchInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate with all search options', () => {
      const input = {
        query: 'test query',
        experiencer: 'Alex',
        perspective: 'I',
        limit: 10,
        offset: 5,
        sort: 'relevance'
      };
      const result = SearchInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate with reflects filter', () => {
      const input = {
        query: 'test query',
        reflects: 'only'
      };
      const result = SearchInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate with reflected_by filter', () => {
      const input = {
        query: 'test query',
        reflected_by: 'exp-123'
      };
      const result = SearchInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate with reflected_by array filter', () => {
      const input = {
        query: 'test query',
        reflected_by: ['exp-123', 'exp-456']
      };
      const result = SearchInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject invalid sort option', () => {
      const input = {
        query: 'test query',
        sort: 'invalid'
      };
      const result = SearchInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should accept negative limit (no validation)', () => {
      const input = {
        query: 'test query',
        limit: -1
      };
      const result = SearchInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept negative offset (no validation)', () => {
      const input = {
        query: 'test query',
        offset: -1
      };
      const result = SearchInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject invalid filter structure', () => {
      const input = {
        query: 'test query',
        filter: 'not-an-object'
      };
      const result = SearchInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('ReconsiderInputSchema', () => {
    it('should validate reconsider input', () => {
      const input = generateReconsiderExample();
      const result = ReconsiderInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate single reconsider input', () => {
      const input = {
        id: 'exp-123',
        source: 'Updated experience'
      };
      const result = ReconsiderInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate batch reconsider input', () => {
      const input = {
        reconsiderations: [
          { id: 'exp-123', source: 'Updated 1' },
          { id: 'exp-456', source: 'Updated 2' }
        ]
      };
      const result = ReconsiderInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept input with only source (no validation)', () => {
      const input = {
        source: 'Test experience'
      };
      const result = ReconsiderInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept empty reconsiderations array (no validation)', () => {
      const input = {
        reconsiderations: []
      };
      const result = ReconsiderInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject invalid reconsideration in batch', () => {
      const input = {
        reconsiderations: [
          { source: 'Missing ID' }
        ]
      };
      const result = ReconsiderInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('ReleaseInputSchema', () => {
    it('should validate release input', () => {
      const input = generateReleaseExample();
      const result = ReleaseInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate single release input', () => {
      const input = {
        id: 'exp-123'
      };
      const result = ReleaseInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate batch release input', () => {
      const input = {
        releases: [{ id: 'exp-123' }, { id: 'exp-456' }]
      };
      const result = ReleaseInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept empty input (no validation)', () => {
      const input = {};
      const result = ReleaseInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept empty releases array (no validation)', () => {
      const input = {
        releases: []
      };
      const result = ReleaseInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject invalid release ID in batch', () => {
      const input = {
        releases: [123] // Should be string
      };
      const result = ReleaseInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});

describe('Type Guards', () => {
  describe('isExperienceInput', () => {
    it('should return true for valid experience input', () => {
      const input = generateExperienceExample();
      expect(isExperienceInput(input)).toBe(true);
    });

    it('should return false for invalid input', () => {
      expect(isExperienceInput({ invalid: 'data' })).toBe(false);
      expect(isExperienceInput(null)).toBe(false);
      expect(isExperienceInput(undefined)).toBe(false);
      expect(isExperienceInput('string')).toBe(false);
      expect(isExperienceInput(123)).toBe(false);
    });
  });

  describe('isSearchInput', () => {
    it('should return true for valid search input', () => {
      const input = generateSearchExample();
      expect(isSearchInput(input)).toBe(true);
    });

    it('should return false for invalid input', () => {
      expect(isSearchInput({ invalid: 'data' })).toBe(false);
      expect(isSearchInput(null)).toBe(false);
      expect(isSearchInput(undefined)).toBe(false);
    });
  });

  describe('isReconsiderInput', () => {
    it('should return true for valid reconsider input', () => {
      const input = generateReconsiderExample();
      expect(isReconsiderInput(input)).toBe(true);
    });

    it('should return false for invalid input', () => {
      expect(isReconsiderInput({ invalid: 'data' })).toBe(false);
      expect(isReconsiderInput(null)).toBe(false);
      expect(isReconsiderInput(undefined)).toBe(false);
    });
  });

  describe('isReleaseInput', () => {
    it('should return true for valid release input', () => {
      const input = generateReleaseExample();
      expect(isReleaseInput(input)).toBe(true);
    });

    it('should return false for invalid input', () => {
      expect(isReleaseInput({ invalid: 'data' })).toBe(false);
      expect(isReleaseInput(null)).toBe(false);
      expect(isReleaseInput(undefined)).toBe(false);
    });
  });

  describe('isToolResult', () => {
    it('should return true for valid tool result', () => {
      const result = {
        content: [{
          type: 'text',
          text: 'Test result'
        }]
      };
      expect(isToolResult(result)).toBe(true);
    });

    it('should return false for invalid tool result', () => {
      expect(isToolResult({ type: 'invalid' })).toBe(false);
      expect(isToolResult({ text: 'missing type' })).toBe(false);
      expect(isToolResult(null)).toBe(false);
      expect(isToolResult(undefined)).toBe(false);
    });
  });

  describe('isToolTextContent', () => {
    it('should return true for valid text content', () => {
      const content = {
        type: 'text',
        text: 'Test content'
      };
      expect(isToolTextContent(content)).toBe(true);
    });

    it('should return false for invalid text content', () => {
      expect(isToolTextContent({ type: 'invalid' })).toBe(false);
      expect(isToolTextContent({ text: 'missing type' })).toBe(false);
      expect(isToolTextContent(null)).toBe(false);
      expect(isToolTextContent(undefined)).toBe(false);
    });
  });

  describe('isExperienceObject', () => {
    it('should return true for valid experience array', () => {
      const experience = ['mood.open', 'embodied.sensing'];
      expect(isExperienceObject(experience)).toBe(true);
    });

    it('should return false for invalid experience', () => {
      expect(isExperienceObject('not-an-array')).toBe(false);
      expect(isExperienceObject(123)).toBe(false);
      expect(isExperienceObject(null)).toBe(false);
      expect(isExperienceObject(undefined)).toBe(false);
      expect(isExperienceObject({})).toBe(false);
    });
  });

  describe('Input Type Guards', () => {
    describe('isSingleExperienceInput', () => {
      it('should return true for single experience input', () => {
        const input = { source: 'test' };
        expect(isSingleExperienceInput(input)).toBe(true);
      });

      it('should return false for batch experience input', () => {
        const input = { experiences: [{ source: 'test', experience: ['mood.open'] }] };
        expect(isSingleExperienceInput(input)).toBe(false);
      });
    });

    describe('isBatchExperienceInput', () => {
      it('should return true for batch experience input', () => {
        const input = { experiences: [{ source: 'test', experience: ['mood.open'] }] };
        expect(isBatchExperienceInput(input)).toBe(true);
      });

      it('should return false for single experience input', () => {
        const input = { source: 'test' };
        expect(isBatchExperienceInput(input)).toBe(false);
      });
    });

    describe('isSingleSearchInput', () => {
      it('should return true for single search input', () => {
        const input = { query: 'test' };
        expect(isSingleSearchInput(input)).toBe(true);
      });

      it('should return false for batch search input', () => {
        const input = { searches: [{ query: 'test' }] };
        expect(isSingleSearchInput(input)).toBe(false);
      });
    });

    describe('isBatchSearchInput', () => {
      it('should return true for batch search input', () => {
        const input = { searches: [{ query: 'test' }] };
        expect(isBatchSearchInput(input)).toBe(true);
      });

      it('should return false for single search input', () => {
        const input = { query: 'test' };
        expect(isBatchSearchInput(input)).toBe(false);
      });
    });

    describe('isSingleReconsiderInput', () => {
      it('should return true for single reconsider input', () => {
        const input = { id: 'exp-123' };
        expect(isSingleReconsiderInput(input)).toBe(true);
      });

      it('should return false for batch reconsider input', () => {
        const input = { reconsiderations: [{ id: 'exp-123' }] };
        expect(isSingleReconsiderInput(input)).toBe(false);
      });
    });

    describe('isBatchReconsiderInput', () => {
      it('should return true for batch reconsider input', () => {
        const input = { reconsiderations: [{ id: 'exp-123' }] };
        expect(isBatchReconsiderInput(input)).toBe(true);
      });

      it('should return false for single reconsider input', () => {
        const input = { id: 'exp-123' };
        expect(isBatchReconsiderInput(input)).toBe(false);
      });
    });

    describe('isSingleReleaseInput', () => {
      it('should return true for single release input', () => {
        const input = { id: 'exp-123' };
        expect(isSingleReleaseInput(input)).toBe(true);
      });

      it('should return false for batch release input', () => {
        const input = { releases: [{ id: 'exp-123' }] };
        expect(isSingleReleaseInput(input)).toBe(false);
      });
    });

    describe('isBatchReleaseInput', () => {
      it('should return true for batch release input', () => {
        const input = { releases: [{ id: 'exp-123' }] };
        expect(isBatchReleaseInput(input)).toBe(true);
      });

      it('should return false for single release input', () => {
        const input = { id: 'exp-123' };
        expect(isBatchReleaseInput(input)).toBe(false);
      });
    });
  });
});

describe('Example Generation', () => {
  it('should generate valid experience examples', () => {
    const example = generateExperienceExample();
    expect(example).toHaveProperty('source');
    expect(example).toHaveProperty('perspective');
    expect(example).toHaveProperty('experience');
    expect(Array.isArray(example.experience)).toBe(true);
  });

  it('should generate valid search examples', () => {
    const example = generateSearchExample();
    expect(example).toHaveProperty('query');
  });

  it('should generate valid reconsider examples', () => {
    const example = generateReconsiderExample();
    expect(example).toHaveProperty('id');
    expect(example).toHaveProperty('source');
  });

  it('should generate valid release examples', () => {
    const example = generateReleaseExample();
    expect(example).toHaveProperty('id');
  });

  it('should generate valid batch experience examples', () => {
    const example = generateBatchExperienceExample();
    expect(example).toHaveProperty('experiences');
    expect(Array.isArray(example.experiences)).toBe(true);
    expect(example.experiences?.length).toBeGreaterThan(0);
  });

  it('should generate valid batch search examples', () => {
    const example = generateBatchSearchExample();
    expect(example).toHaveProperty('searches');
    expect(Array.isArray(example.searches)).toBe(true);
    expect(example.searches?.length).toBeGreaterThan(0);
  });
}); 