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
  generateExperienceExample,
  generateSearchExample,
  generateReconsiderExample,
  generateBatchExperienceExample,
  generateBatchSearchExample,
  isExperienceInput,
  isSearchInput,
  isReconsiderInput,
  isToolResult,
  isToolTextContent,
  isExperienceObject,
  hasExperienceArray,
  hasSearchArray,
  hasReconsiderArray,
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

    it('should reject input without experiences array', () => {
      const input = {
        who: 'Alex',
      };
      const result = ExperienceInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject empty experiences array', () => {
      const input = {
        experiences: [],
      };
      const result = ExperienceInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should validate with only experiences', () => {
      const input = {
        experiences: [
          {
            source: 'Test experience',
            emoji: '🧪',
            experienceQualities: {
              embodied: false,
              focus: false,
              mood: 'open',
              purpose: false,
              space: false,
              time: false,
              presence: false,
            },
          },
        ],
      };
      const result = ExperienceInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate with reflects field', () => {
      const input = {
        experiences: [
          {
            source: 'Pattern realization',
            emoji: '💡',
            experienceQualities: {
              embodied: false,
              focus: false,
              mood: 'open',
              purpose: false,
              space: false,
              time: false,
              presence: false,
            },
            reflects: ['exp-123', 'exp-456'],
          },
        ],
      };
      const result = ExperienceInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate with empty reflects array', () => {
      const input = {
        experiences: [
          {
            source: 'Experience with empty reflects',
            emoji: '🧪',
            experienceQualities: {
              embodied: false,
              focus: false,
              mood: 'open',
              purpose: false,
              space: false,
              time: false,
              presence: false,
            },
            reflects: [],
          },
        ],
      };
      const result = ExperienceInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate with all optional fields', () => {
      const input = {
        experiences: [
          {
            source: 'Complete experience',
            emoji: '✨',
            who: 'test',
            experienceQualities: {
              embodied: 'sensing',
              focus: false,
              mood: 'open',
              purpose: false,
              space: false,
              time: false,
              presence: false,
            },
            reflects: ['exp-123'],
          },
        ],
      };
      const result = ExperienceInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    // Perspective validation removed - field no longer exists
    it('should validate with complete experienceQualities', () => {
      const input = {
        experiences: [
          {
            source: 'Test experience',
            emoji: '🧪',
            experienceQualities: {
              embodied: false,
              focus: false,
              mood: 'open',
              purpose: false,
              space: false,
              time: false,
              presence: false,
            },
          },
        ],
      };
      const result = ExperienceInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    // Processing validation removed - field no longer exists
    it('should reject invalid experience qualities', () => {
      const input = {
        experiences: [
          {
            source: 'Test experience',
            experienceQualities: ['mood.open'],
          },
        ],
      };
      const result = ExperienceInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject invalid experience array', () => {
      const input = {
        experiences: [
          {
            source: 'Test experience',
            experienceQualities: 'not-an-array',
          },
        ],
      };
      const result = ExperienceInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should validate with sentence-based qualities', () => {
      const input = {
        experiences: [
          {
            source: 'Working through this complex problem',
            emoji: '🤔',
            experienceQualities: {
              embodied: 'my mind is racing through possibilities',
              focus: 'narrowing down to the core issue',
              mood: 'feeling tense but determined',
              purpose: 'need to solve this before the deadline',
              space: 'stuck at my desk with this problem',
              time: 'aware of time slipping away',
              presence: 'wrestling with this alone',
            },
          },
        ],
      };
      const result = ExperienceInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject invalid reflects field', () => {
      const input = {
        experiences: [
          {
            source: 'Test experience',
            experienceQualities: ['mood.open'],
            reflects: 'not-an-array' as unknown as string[],
          },
        ],
      };
      const result = ExperienceInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject empty source string', () => {
      const input = {
        experiences: [
          {
            source: '',
            emoji: '🧪',
            experienceQualities: ['mood.open'],
          },
        ],
      };
      const result = ExperienceInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject empty experiences array', () => {
      const input = {
        experiences: [],
      };
      const result = ExperienceInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject invalid experience in batch', () => {
      const input = {
        experiences: [
          {
            source: 'Test experience',
            experienceQualities: 'invalid',
          },
        ],
      };
      const result = ExperienceInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should accept compound emojis', () => {
      const input = {
        experiences: [
          {
            source: 'Test with compound emoji',
            emoji: '🧑‍💻', // Person with laptop (compound)
            experienceQualities: {
              embodied: false,
              focus: false,
              mood: 'open',
              purpose: false,
              space: false,
              time: false,
              presence: false,
            },
          },
        ],
      };
      const result = ExperienceInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept sentence-based qualities', () => {
      const input = {
        experiences: [
          {
            source: 'Experience with mixed qualities',
            emoji: '🌊',
            experienceQualities: {
              embodied: 'feeling both the physical tension and mental clarity', // Mixed embodied experience
              focus: false,
              mood: 'oscillating between excitement and apprehension', // Mixed mood
              purpose: false,
              space: false,
              time: 'caught between memories and possibilities', // Mixed time orientation
              presence: false,
            },
          },
        ],
      };
      const result = ExperienceInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept various emoji types', () => {
      const testCases = [
        { emoji: '😀', description: 'basic emoji' },
        { emoji: '🧑‍💻', description: 'compound emoji with ZWJ' },
        { emoji: '👨‍👩‍👧‍👦', description: 'family emoji (multiple ZWJ)' },
        { emoji: '🏳️‍🌈', description: 'rainbow flag (compound)' },
        { emoji: '🤷‍♂️', description: 'man shrugging (gendered)' },
        { emoji: '👋🏻', description: 'waving hand with skin tone' },
        { emoji: '🛠️', description: 'hammer and wrench' },
      ];

      testCases.forEach(({ emoji, description }) => {
        const input = {
          experiences: [
            {
              source: `Test with ${description}`,
              emoji,
              experienceQualities: {
                embodied: false,
                focus: false,
                mood: 'open',
                purpose: false,
                space: false,
                time: false,
                presence: false,
              },
            },
          ],
        };
        const result = ExperienceInputSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });

    it('should reject multiple separate emojis', () => {
      const input = {
        experiences: [
          {
            source: 'Test with multiple emojis',
            emoji: '😀😀', // Two separate emojis
            experienceQualities: ['mood.open'],
          },
        ],
      };
      const result = ExperienceInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject non-emoji characters', () => {
      const input = {
        experiences: [
          {
            source: 'Test with non-emoji',
            emoji: 'A', // Regular letter
            experienceQualities: ['mood.open'],
          },
        ],
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

    it('should validate with only search', () => {
      const input = {
        searches: [
          {
            search: 'test query',
          },
        ],
      };
      const result = SearchInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate with only filters', () => {
      const input = {
        searches: [
          {
            who: 'Alex',
          },
        ],
      };
      const result = SearchInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate with all search options', () => {
      const input = {
        searches: [
          {
            search: 'test query',
            who: 'Alex',
            limit: 10,
            offset: 5,
            sort: 'relevance',
          },
        ],
      };
      const result = SearchInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate with reflects filter', () => {
      const input = {
        searches: [
          {
            search: 'test query',
            reflects: 'only',
          },
        ],
      };
      const result = SearchInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate with reflected_by filter', () => {
      const input = {
        searches: [
          {
            search: 'test query',
            reflected_by: 'exp-123',
          },
        ],
      };
      const result = SearchInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate with reflected_by array filter', () => {
      const input = {
        searches: [
          {
            search: 'test query',
            reflected_by: ['exp-123', 'exp-456'],
          },
        ],
      };
      const result = SearchInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject invalid sort option', () => {
      const input = {
        searches: [
          {
            search: 'test query',
            sort: 'invalid' as unknown as string,
          },
        ],
      };
      const result = SearchInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should accept negative limit (no validation)', () => {
      const input = {
        searches: [
          {
            search: 'test query',
            limit: -1,
          },
        ],
      };
      const result = SearchInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept negative offset (no validation)', () => {
      const input = {
        searches: [
          {
            search: 'test query',
            offset: -1,
          },
        ],
      };
      const result = SearchInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject searches with invalid fields', () => {
      const input = {
        searches: [
          {
            search: 'test query',
            invalidField: 'not-allowed',
          },
        ] as unknown as { searches: { search: string; invalidField: string }[] },
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
        reconsiderations: [
          {
            id: 'exp-123',
            source: 'Updated experience',
          },
        ],
      };
      const result = ReconsiderInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate batch reconsider input', () => {
      const input = {
        reconsiderations: [
          { id: 'exp-123', source: 'Updated 1' },
          { id: 'exp-456', source: 'Updated 2' },
        ],
      };
      const result = ReconsiderInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject empty reconsiderations array', () => {
      const input = {
        reconsiderations: [],
      };
      const result = ReconsiderInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should validate reconsideration with all fields', () => {
      const input = {
        reconsiderations: [
          {
            id: 'exp-123',
            source: 'Updated',
            experienceQualities: {
              embodied: false,
              focus: false,
              mood: 'open',
              purpose: false,
              space: false,
              time: false,
              presence: false,
            },
          },
        ],
      };
      const result = ReconsiderInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject invalid reconsideration in batch', () => {
      const input = {
        reconsiderations: [{ source: 'Missing ID' }],
      };
      const result = ReconsiderInputSchema.safeParse(input);
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

  describe('isToolResult', () => {
    it('should return true for valid tool result', () => {
      const result = {
        content: [
          {
            type: 'text',
            text: 'Test result',
          },
        ],
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
        text: 'Test content',
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
    it('should return true for valid experience switchboard', () => {
      const experience = {
        embodied: 'sensing',
        focus: false,
        mood: 'open',
        purpose: false,
        space: false,
        time: false,
        presence: false,
      };
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

  describe('Array Type Guards', () => {
    describe('hasExperienceArray', () => {
      it('should return true for valid experience array', () => {
        const input = {
          experiences: [
            {
              source: 'test',
              emoji: '🧪',
              experienceQualities: {
                embodied: false,
                focus: false,
                mood: 'open',
                purpose: false,
                space: false,
                time: false,
                presence: false,
              },
            },
          ],
        };
        expect(hasExperienceArray(input)).toBe(true);
      });

      it('should return false for empty experience array', () => {
        const input = { experiences: [] };
        expect(hasExperienceArray(input)).toBe(false);
      });

      it('should return false for missing experiences', () => {
        const input = { source: 'test' };
        expect(hasExperienceArray(input as unknown as { experiences?: unknown[] })).toBe(false);
      });
    });

    describe('hasSearchArray', () => {
      it('should return true for valid search array', () => {
        const input = { searches: [{ search: 'test' }] };
        expect(hasSearchArray(input)).toBe(true);
      });

      it('should return false for empty search array', () => {
        const input = { searches: [] };
        expect(hasSearchArray(input)).toBe(false);
      });

      it('should return false for missing searches', () => {
        const input = { search: 'test' };
        expect(hasSearchArray(input as unknown as { search: string })).toBe(false);
      });
    });

    describe('hasReconsiderArray', () => {
      it('should return true for valid reconsider array', () => {
        const input = { reconsiderations: [{ id: 'exp-123' }] };
        expect(hasReconsiderArray(input)).toBe(true);
      });

      it('should return false for empty reconsider array', () => {
        const input = { reconsiderations: [] };
        expect(hasReconsiderArray(input)).toBe(false);
      });

      it('should return false for missing reconsiderations', () => {
        const input = { id: 'exp-123' };
        expect(hasReconsiderArray(input as unknown as { id: string })).toBe(false);
      });
    });
  });
});

describe('Example Generation', () => {
  it('should generate valid experience examples', () => {
    const example = generateExperienceExample();
    expect(example).toHaveProperty('experiences');
    expect(Array.isArray(example.experiences)).toBe(true);
    expect(example.experiences![0]).toHaveProperty('source');
    // Perspective removed from source structure
    expect(example.experiences![0]).toHaveProperty('experienceQualities');
  });

  it('should generate valid search examples', () => {
    const example = generateSearchExample();
    expect(example).toHaveProperty('searches');
    expect(Array.isArray(example.searches)).toBe(true);
    expect(example.searches![0]).toHaveProperty('search');
  });

  it('should generate valid reconsider examples', () => {
    const example = generateReconsiderExample();
    expect(example).toHaveProperty('reconsiderations');
    expect(Array.isArray(example.reconsiderations)).toBe(true);
    expect(example.reconsiderations![0]).toHaveProperty('id');
    expect(example.reconsiderations![0]).toHaveProperty('source');
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
