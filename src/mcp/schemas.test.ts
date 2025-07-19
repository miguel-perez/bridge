/**
 * Schema validation tests
 * 
 * Tests for Zod schema validation, example generation, and type inference.
 * 
 * @module mcp/schemas.test
 */

import { describe, it, expect } from '@jest/globals';
import {
  RememberInputSchema,
  SearchInputSchema,
  ReconsiderInputSchema,
  ReleaseInputSchema,
  generateRememberExample,
  generateSearchExample,
  generateReconsiderExample,
  generateReleaseExample,
  generateBatchRememberExample,
  generateBatchSearchExample,
  type RememberInput,
  type SearchInput,
  type ReconsiderInput,
  type ReleaseInput
} from './schemas.js';

describe('Schema Validation', () => {
  describe('RememberInputSchema', () => {
    it('should validate single remember input', () => {
      const input = generateRememberExample();
      const result = RememberInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate batch remember input', () => {
      const input = generateBatchRememberExample();
      const result = RememberInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject input with neither source nor remembers', () => {
      const input = {
        perspective: 'I',
        experiencer: 'Alex'
      };
      const result = RememberInputSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Either 'source' or 'remembers' must be provided");
      }
    });

    it('should validate with only source', () => {
      const input = {
        source: 'Test experience',
        perspective: 'I'
      };
      const result = RememberInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate with only remembers', () => {
      const input = {
        remembers: [{
          source: 'Test experience',
          perspective: 'I',
          experience: ['mood.open']
        }]
      };
      const result = RememberInputSchema.safeParse(input);
      expect(result.success).toBe(true);
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
  });

  describe('ReconsiderInputSchema', () => {
    it('should validate single reconsider input', () => {
      const input = generateReconsiderExample();
      const result = ReconsiderInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate batch reconsider input', () => {
      const input = {
        reconsiderations: [{
          id: 'exp_1234567890',
          source: 'Updated source'
        }]
      };
      const result = ReconsiderInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate with only id', () => {
      const input = {
        id: 'exp_1234567890'
      };
      const result = ReconsiderInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate with only reconsiderations', () => {
      const input = {
        reconsiderations: [{
          id: 'exp_1234567890'
        }]
      };
      const result = ReconsiderInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('ReleaseInputSchema', () => {
    it('should validate single release input', () => {
      const input = generateReleaseExample();
      const result = ReleaseInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate batch release input', () => {
      const input = {
        releases: [{
          id: 'exp_1234567890',
          reason: 'No longer needed'
        }]
      };
      const result = ReleaseInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate with only id', () => {
      const input = {
        id: 'exp_1234567890'
      };
      const result = ReleaseInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate with only releases', () => {
      const input = {
        releases: [{
          id: 'exp_1234567890'
        }]
      };
      const result = ReleaseInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });
});

describe('Example Generation', () => {
  it('should generate valid remember example', () => {
    const example = generateRememberExample();
    const result = RememberInputSchema.safeParse(example);
    expect(result.success).toBe(true);
  });

  it('should generate valid batch remember example', () => {
    const example = generateBatchRememberExample();
    const result = RememberInputSchema.safeParse(example);
    expect(result.success).toBe(true);
  });

  it('should generate valid search example', () => {
    const example = generateSearchExample();
    const result = SearchInputSchema.safeParse(example);
    expect(result.success).toBe(true);
  });

  it('should generate valid reconsider example', () => {
    const example = generateReconsiderExample();
    const result = ReconsiderInputSchema.safeParse(example);
    expect(result.success).toBe(true);
  });

  it('should generate valid release example', () => {
    const example = generateReleaseExample();
    const result = ReleaseInputSchema.safeParse(example);
    expect(result.success).toBe(true);
  });
});

describe('Type Inference', () => {
  it('should infer correct RememberInput type', () => {
    const input: RememberInput = generateRememberExample();
    expect(typeof input.source).toBe('string');
    expect(input.perspective).toBe('I');
  });

  it('should infer correct SearchInput type', () => {
    const input: SearchInput = generateSearchExample();
    expect(typeof input.query).toBe('string');
    expect(input.limit).toBe(5);
  });

  it('should infer correct ReconsiderInput type', () => {
    const input: ReconsiderInput = generateReconsiderExample();
    expect(typeof input.id).toBe('string');
    expect(typeof input.source).toBe('string');
  });

  it('should infer correct ReleaseInput type', () => {
    const input: ReleaseInput = generateReleaseExample();
    expect(typeof input.id).toBe('string');
    expect(typeof input.reason).toBe('string');
  });
}); 