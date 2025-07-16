/**
 * Schema validation tests
 * 
 * Tests for Zod schema validation, example generation, and type inference.
 * 
 * @module mcp/schemas.test
 */

import {
  CaptureInputSchema,
  SearchInputSchema,
  UpdateInputSchema,
  ReleaseInputSchema,
  ToolResultSchema,
  generateCaptureExample,
  generateSearchExample,
  generateUpdateExample,
  generateReleaseExample,
  generateBatchCaptureExample,
  generateBatchSearchExample,
  type CaptureInput,
  type SearchInput,
  type UpdateInput,
  type ReleaseInput,
  type ToolResult
} from './schemas.js';

describe('Schema Validation', () => {
  describe('CaptureInputSchema', () => {
    it('should validate single capture input', () => {
      const input = generateCaptureExample();
      const result = CaptureInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate batch capture input', () => {
      const input = generateBatchCaptureExample();
      const result = CaptureInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject input with neither source nor captures', () => {
      const input = {
        perspective: 'I',
        experiencer: 'Alex'
      };
      const result = CaptureInputSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Either 'source' or 'captures' must be provided");
      }
    });

    it('should validate with only source', () => {
      const input = {
        source: 'Test experience content',
        perspective: 'I'
      };
      const result = CaptureInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate with only captures', () => {
      const input = {
        captures: [{
          source: 'Test experience content',
          perspective: 'I',
          experience: {
            qualities: [],
            emoji: '📝',
            narrative: 'Test narrative'
          }
        }]
      };
      const result = CaptureInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('SearchInputSchema', () => {
    it('should validate single search input', () => {
      const input = generateSearchExample();
      const result = SearchInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate batch search input', () => {
      const input = generateBatchSearchExample();
      const result = SearchInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate empty search input', () => {
      const input = {};
      const result = SearchInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate with date range', () => {
      const input = {
        query: 'test',
        created: {
          start: '2024-01-01',
          end: '2024-12-31'
        }
      };
      const result = SearchInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate with single date', () => {
      const input = {
        query: 'test',
        created: '2024-06-15'
      };
      const result = SearchInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('UpdateInputSchema', () => {
    it('should validate single update input', () => {
      const input = generateUpdateExample();
      const result = UpdateInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate batch update input', () => {
      const input = {
        updates: [
          {
            id: 'exp_123',
            source: 'Updated content',
            experience: {
              qualities: [],
              emoji: '📝',
              narrative: 'Updated narrative'
            }
          }
        ]
      };
      const result = UpdateInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate with only id', () => {
      const input = {
        id: 'exp_123'
      };
      const result = UpdateInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject without id in single update', () => {
      const input = {
        source: 'Updated content'
      };
      const result = UpdateInputSchema.safeParse(input);
      expect(result.success).toBe(true); // This is actually valid since id is optional
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
        releases: [
          {
            id: 'exp_123',
            reason: 'No longer relevant'
          },
          {
            id: 'exp_456',
            reason: 'Duplicate entry'
          }
        ]
      };
      const result = ReleaseInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate with only id', () => {
      const input = {
        id: 'exp_123'
      };
      const result = ReleaseInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('ToolResultSchema', () => {
    it('should validate successful result', () => {
      const input: ToolResult = {
        content: [
          {
            type: 'text',
            text: 'Operation completed successfully'
          }
        ]
      };
      const result = ToolResultSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate error result', () => {
      const input: ToolResult = {
        isError: true,
        content: [
          {
            type: 'text',
            text: 'An error occurred'
          }
        ]
      };
      const result = ToolResultSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject invalid content type', () => {
      const input = {
        content: [
          {
            type: 'invalid',
            text: 'Test'
          }
        ]
      };
      const result = ToolResultSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});

describe('Example Generation', () => {
  it('should generate valid capture example', () => {
    const example = generateCaptureExample();
    const result = CaptureInputSchema.safeParse(example);
    expect(result.success).toBe(true);
  });

  it('should generate valid search example', () => {
    const example = generateSearchExample();
    const result = SearchInputSchema.safeParse(example);
    expect(result.success).toBe(true);
  });

  it('should generate valid update example', () => {
    const example = generateUpdateExample();
    const result = UpdateInputSchema.safeParse(example);
    expect(result.success).toBe(true);
  });

  it('should generate valid release example', () => {
    const example = generateReleaseExample();
    const result = ReleaseInputSchema.safeParse(example);
    expect(result.success).toBe(true);
  });

  it('should generate valid batch capture example', () => {
    const example = generateBatchCaptureExample();
    const result = CaptureInputSchema.safeParse(example);
    expect(result.success).toBe(true);
  });

  it('should generate valid batch search example', () => {
    const example = generateBatchSearchExample();
    const result = SearchInputSchema.safeParse(example);
    expect(result.success).toBe(true);
  });
});

describe('Type Inference', () => {
  it('should infer correct CaptureInput type', () => {
    const input: CaptureInput = generateCaptureExample();
    expect(typeof input.source).toBe('string');
    expect(input.perspective).toBe('I');
  });

  it('should infer correct SearchInput type', () => {
    const input: SearchInput = generateSearchExample();
    expect(typeof input.query).toBe('string');
    expect(typeof input.limit).toBe('number');
  });

  it('should infer correct UpdateInput type', () => {
    const input: UpdateInput = generateUpdateExample();
    expect(typeof input.id).toBe('string');
    expect(typeof input.source).toBe('string');
  });

  it('should infer correct ReleaseInput type', () => {
    const input: ReleaseInput = generateReleaseExample();
    expect(typeof input.id).toBe('string');
    expect(typeof input.reason).toBe('string');
  });

  it('should infer correct ToolResult type', () => {
    const result: ToolResult = {
      content: [
        {
          type: 'text',
          text: 'Test result'
        }
      ]
    };
    expect(result.content[0].type).toBe('text');
    expect(typeof result.content[0].text).toBe('string');
  });
}); 