/**
 * Tests for core types and validation functions
 */

import {
  QUALITY_TYPES,
  DEFAULTS,
  type Source,
  type StorageData,
  isValidQualityType,
  isValidSource,
  createSource,
  createSourceRecord,
  // Zod schemas and validation functions
  SourceSchema,
  StorageDataSchema,
  validateSource,
  validateStorageData,
  // Conversion functions
  experienceArrayToQualities,
} from './types.js';

describe('Constants', () => {
  // PERSPECTIVES constant removed - field no longer in source structure

  // PROCESSING_LEVELS constant removed - field no longer in source structure

  it('should have valid quality types', () => {
    expect(QUALITY_TYPES).toEqual([
      'embodied',
      'focus',
      'mood',
      'purpose',
      'space',
      'time',
      'presence',
    ]);
  });

  it('should have sensible defaults', () => {
    expect(DEFAULTS.EXPERIENCER).toBe('self');
  });
});

describe('Type Validation Functions', () => {
  describe('isValidQualityType', () => {
    it('should return true for valid quality types', () => {
      expect(isValidQualityType('embodied')).toBe(true);
      expect(isValidQualityType('focus')).toBe(true);
      expect(isValidQualityType('mood')).toBe(true);
      expect(isValidQualityType('purpose')).toBe(true);
      expect(isValidQualityType('space')).toBe(true);
      expect(isValidQualityType('time')).toBe(true);
      expect(isValidQualityType('presence')).toBe(true);
    });
    it('should return true for dot notation quality types', () => {
      expect(isValidQualityType('embodied.thinking')).toBe(true);
      expect(isValidQualityType('mood.open')).toBe(true);
      expect(isValidQualityType('purpose.goal')).toBe(true);
    });

    it('should return false for invalid quality types', () => {
      expect(isValidQualityType('EMBODIED')).toBe(false);
      expect(isValidQualityType('foo')).toBe(false);
      expect(isValidQualityType('attentional')).toBe(false);
      expect(isValidQualityType('emotion')).toBe(false); // old name
      expect(isValidQualityType('body')).toBe(false); // old name
    });
  });

  // isValidPerspective and isValidProcessingLevel removed - fields no longer in source structure

  describe('isValidSource', () => {
    it('should accept valid source objects', () => {
      const validSource: Source = {
        id: 'test-123',
        source: 'Test source',
        emoji: '🧪',
        created: '2024-01-01T00:00:00.000Z',
        who: 'test',
                experienceQualities: {
          embodied: 'thinking' as const,
          focus: false as const,
          mood: 'open' as const,
          purpose: false as const,
          space: false as const,
          time: false as const,
          presence: false as const
        },
      };
      expect(isValidSource(validSource)).toBe(true);
    });

    it('should accept valid source objects with reflects field', () => {
      const validSourceWithReflects: Source = {
        id: 'test-123',
        source: 'I notice I always feel anxious before things that end up going well',
        emoji: '💡',
        created: '2024-01-01T00:00:00.000Z',
        who: 'test',
        experienceQualities: {
          embodied: 'sensing' as const,
          focus: false as const,
          mood: 'closed' as const,
          purpose: false as const,
          space: false as const,
          time: 'future' as const,
          presence: false as const
        },
        reflects: ['exp-001', 'exp-002', 'exp-003'],
      };
      expect(isValidSource(validSourceWithReflects)).toBe(true);
    });

    it('should accept source objects with empty reflects array', () => {
      const validSourceWithEmptyReflects: Source = {
        id: 'test-123',
        source: 'Test source',
        emoji: '🧪',
        created: '2024-01-01T00:00:00.000Z',
        who: 'test',
                experienceQualities: {
          embodied: 'thinking' as const,
          focus: false as const,
          mood: 'open' as const,
          purpose: false as const,
          space: false as const,
          time: false as const,
          presence: false as const
        },
        reflects: [],
      };
      expect(isValidSource(validSourceWithEmptyReflects)).toBe(true);
    });

    it('should accept source objects with contextual experienceQualities', () => {
      const validSourceWithContextualQualities: Source = {
        id: 'test-123',
        source: 'Test source',
        emoji: '🧪',
        created: '2024-01-01T00:00:00.000Z',
        who: 'test',
        experienceQualities: {
          embodied: 'reviewing code with the team',
          focus: false,
          mood: 'open to feedback during the review',
          purpose: false,
          space: 'in the code review session',
          time: false,
          presence: false
        },
      };
      expect(isValidSource(validSourceWithContextualQualities)).toBe(true);
    });

    it('should reject invalid source objects', () => {
      expect(isValidSource(null)).toBe(false);
      expect(isValidSource(undefined)).toBe(false);
      expect(isValidSource({})).toBe(false);
      expect(isValidSource({ id: 'test' })).toBe(false);
      expect(isValidSource({ id: '', source: 'test', emoji: '🧪', created: '2024-01-01' })).toBe(
        false
      );
    });

    it('should reject source objects with invalid reflects field', () => {
      const invalidSourceWithReflects = {
        id: 'test-123',
        source: 'Test source',
        emoji: '🧪',
        created: '2024-01-01T00:00:00.000Z',
        who: 'test',
                experienceQualities: {
          embodied: 'thinking' as const,
          focus: false as const,
          mood: 'open' as const,
          purpose: false as const,
          space: false as const,
          time: false as const,
          presence: false as const
        },
        reflects: 'not-an-array' // Should be array
      };
      expect(isValidSource(invalidSourceWithReflects)).toBe(false);
    });
  });
});

describe('Factory Functions', () => {
  describe('createSource', () => {
    it('should create a source with default values', () => {
      const source = createSource('Test source', '🧪');

      expect(source.source).toBe('Test source');
      expect(source.emoji).toBe('🧪');
      expect(source.id).toMatch(/^src_\d+$/);
      expect(source.created).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(source.who).toBe('self');
    });

    it('should use provided ID', () => {
      const source = createSource('Test source', '🧪', 'custom-id');
      expect(source.id).toBe('custom-id');
    });
  });

  describe('createSourceRecord', () => {
    it('should create a source record', () => {
      const record = createSourceRecord('Test source', '🧪');

      expect(record.source).toBe('Test source');
      expect(record.id).toMatch(/^src_\d+$/);
      expect(record.emoji).toBe('🧪');
    });
  });
});

describe('Zod Schema Validation', () => {
  describe('SourceSchema', () => {
    it('should validate valid source', () => {
      const validSource: Source = {
        id: 'test-123',
        source: 'Test source content',
        emoji: '🧪',
        created: '2024-01-01T00:00:00.000Z',
        who: 'test',
                experienceQualities: {
          embodied: 'thinking' as const,
          focus: false as const,
          mood: 'open' as const,
          purpose: false as const,
          space: false as const,
          time: false as const,
          presence: false as const
        },
      };

      const result = SourceSchema.safeParse(validSource);
      expect(result.success).toBe(true);
    });

    it('should validate source with reflects field', () => {
      const validSourceWithReflects: Source = {
        id: 'test-123',
        source: 'I notice I always feel anxious before things that end up going well',
        emoji: '💡',
        created: '2024-01-01T00:00:00.000Z',
        who: 'test',
        experienceQualities: {
          embodied: 'sensing' as const,
          focus: false as const,
          mood: 'closed' as const,
          purpose: false as const,
          space: false as const,
          time: 'future' as const,
          presence: false as const
        },
        reflects: ['exp-001', 'exp-002', 'exp-003'],
      };

      const result = SourceSchema.safeParse(validSourceWithReflects);
      expect(result.success).toBe(true);
    });

    it('should validate source with context field', () => {
      const validSourceWithContext: Source = {
        id: 'test-123',
        source: 'I feel overwhelmed',
        emoji: '😵',
        created: '2024-01-01T00:00:00.000Z',
        who: 'test',
        experienceQualities: {
          embodied: false as const,
          focus: 'broad' as const,
          mood: 'closed' as const,
          purpose: false as const,
          space: false as const,
          time: false as const,
          presence: false as const
        },
      };

      const result = SourceSchema.safeParse(validSourceWithContext);
      expect(result.success).toBe(true);
    });

    it('should validate source with empty reflects array', () => {
      const validSourceWithEmptyReflects: Source = {
        id: 'test-123',
        source: 'Test source content',
        emoji: '🧪',
        created: '2024-01-01T00:00:00.000Z',
        who: 'test',
                experienceQualities: {
          embodied: 'thinking' as const,
          focus: false as const,
          mood: 'open' as const,
          purpose: false as const,
          space: false as const,
          time: false as const,
          presence: false as const
        },
        reflects: [],
      };

      const result = SourceSchema.safeParse(validSourceWithEmptyReflects);
      expect(result.success).toBe(true);
    });

    it('should reject source with invalid reflects field', () => {
      const invalidSourceWithReflects = {
        id: 'test-123',
        source: 'Test source content',
        created: '2024-01-01T00:00:00.000Z',
        who: 'test',
                experienceQualities: {
          embodied: 'thinking' as const,
          focus: false as const,
          mood: 'open' as const,
          purpose: false as const,
          space: false as const,
          time: false as const,
          presence: false as const
        },
        reflects: 'not-an-array' // Should be array
      };

      const result = SourceSchema.safeParse(invalidSourceWithReflects);
      expect(result.success).toBe(false);
    });

    it('should reject source with invalid reflects array elements', () => {
      const invalidSourceWithReflects = {
        id: 'test-123',
        source: 'Test source content',
        created: '2024-01-01T00:00:00.000Z',
        who: 'test',
                experienceQualities: {
          embodied: 'thinking' as const,
          focus: false as const,
          mood: 'open' as const,
          purpose: false as const,
          space: false as const,
          time: false as const,
          presence: false as const
        },
        reflects: ['exp-001', 123, 'exp-002'], // Contains non-string element
      };

      const result = SourceSchema.safeParse(invalidSourceWithReflects);
      expect(result.success).toBe(false);
    });

    it('should validate source with custom perspective', () => {
      const validSource: Source = {
        id: 'test-123',
        source: 'Test source content',
        emoji: '🧪',
        created: '2024-01-01T00:00:00.000Z',
        perspective: 'custom-perspective',
        who: 'test',
        processing: 'during',
                experienceQualities: {
          embodied: 'thinking' as const,
          focus: false as const,
          mood: 'open' as const,
          purpose: false as const,
          space: false as const,
          time: false as const,
          presence: false as const
        },
      };

      const result = SourceSchema.safeParse(validSource);
      expect(result.success).toBe(true);
    });

    it('should reject source with missing required fields', () => {
      const invalidSource = {
        id: 'test-123',
        // missing source
        created: '2024-01-01T00:00:00.000Z',
      };

      const result = SourceSchema.safeParse(invalidSource);
      expect(result.success).toBe(false);
    });
  });

  describe('StorageDataSchema', () => {
    it('should validate valid storage data', () => {
      const validStorageData: StorageData = {
        sources: [
          {
            id: 'test-123',
            source: 'Test source content',
            emoji: '🧪',
            created: '2024-01-01T00:00:00.000Z',
            perspective: 'I',
            who: 'test',
            processing: 'during',
                        experienceQualities: {
          embodied: 'thinking' as const,
          focus: false as const,
          mood: 'open' as const,
          purpose: false as const,
          space: false as const,
          time: false as const,
          presence: false as const
        },
          },
        ],
        embeddings: [
          {
            sourceId: 'test-123',
            vector: [0.1, 0.2, 0.3],
            generated: '2024-01-01T00:00:00.000Z',
          },
        ],
      };

      const result = StorageDataSchema.safeParse(validStorageData);
      expect(result.success).toBe(true);
    });

    it('should validate storage data with sources containing reflects field', () => {
      const validStorageDataWithReflects: StorageData = {
        sources: [
          {
            id: 'test-123',
            source: 'Test source content',
            emoji: '🧪',
            created: '2024-01-01T00:00:00.000Z',
            perspective: 'I',
            who: 'test',
            processing: 'during',
                        experienceQualities: {
          embodied: 'thinking' as const,
          focus: false as const,
          mood: 'open' as const,
          purpose: false as const,
          space: false as const,
          time: false as const,
          presence: false as const
        },
          },
          {
            id: 'pattern-001',
            source: 'I notice I always feel anxious before things that end up going well',
            emoji: '💡',
            created: '2024-01-01T00:00:00.000Z',
            perspective: 'I',
            who: 'test',
            processing: 'long-after',
                experienceQualities: {
          embodied: 'sensing' as const,
          focus: false as const,
          mood: 'closed' as const,
          purpose: false as const,
          space: false as const,
          time: 'future' as const,
          presence: false as const
        },
            reflects: ['test-123', 'test-456'],
          },
        ],
      };

      const result = StorageDataSchema.safeParse(validStorageDataWithReflects);
      expect(result.success).toBe(true);
    });

    it('should reject invalid storage data', () => {
      const invalidStorageData = {
        sources: 'not an array',
        embeddings: 'not an array',
      };

      const result = StorageDataSchema.safeParse(invalidStorageData);
      expect(result.success).toBe(false);
    });
  });
});

describe('Zod-based Validation Functions', () => {
  describe('validateSource', () => {
    it('should return success for valid source', () => {
      const validSource: Source = {
        id: 'test-123',
        source: 'Test source content',
        emoji: '🧪',
        created: '2024-01-01T00:00:00.000Z',
        who: 'test',
                experienceQualities: {
          embodied: 'thinking' as const,
          focus: false as const,
          mood: 'open' as const,
          purpose: false as const,
          space: false as const,
          time: false as const,
          presence: false as const
        },
      };

      const result = validateSource(validSource);
      expect(result).toBeDefined();
    });

    it('should return success for valid source with reflects field', () => {
      const validSourceWithReflects: Source = {
        id: 'pattern-001',
            source: 'I notice I always feel anxious before things that end up going well',
            emoji: '💡',
            created: '2024-01-01T00:00:00.000Z',
            perspective: 'I',
            who: 'test',
        processing: 'long-after',
        experienceQualities: {
          embodied: 'sensing' as const,
          focus: false as const,
          mood: 'closed' as const,
          purpose: false as const,
          space: false as const,
          time: 'future' as const,
          presence: false as const
        },
        reflects: ['exp-001', 'exp-002', 'exp-003'],
      };

      const result = validateSource(validSourceWithReflects);
      expect(result).toBeDefined();
    });

    it('should return error for invalid source', () => {
      const invalidSource = {
        id: '',
        source: '',
      };

      expect(() => validateSource(invalidSource)).toThrow();
    });

    it('should return error for source with invalid reflects field', () => {
      const invalidSourceWithReflects = {
        id: 'test-123',
        source: 'Test source content',
        created: '2024-01-01T00:00:00.000Z',
        who: 'test',
                experienceQualities: {
          embodied: 'thinking' as const,
          focus: false as const,
          mood: 'open' as const,
          purpose: false as const,
          space: false as const,
          time: false as const,
          presence: false as const
        },
        reflects: 'not-an-array' // Should be array
      };

      expect(() => validateSource(invalidSourceWithReflects)).toThrow();
    });
  });

  describe('validateStorageData', () => {
    it('should return success for valid storage data', () => {
      const validStorageData: StorageData = {
        sources: [
          {
            id: 'test-123',
            source: 'Test source content',
            emoji: '🧪',
            created: '2024-01-01T00:00:00.000Z',
            perspective: 'I',
            who: 'test',
            processing: 'during',
                        experienceQualities: {
          embodied: 'thinking' as const,
          focus: false as const,
          mood: 'open' as const,
          purpose: false as const,
          space: false as const,
          time: false as const,
          presence: false as const
        },
          },
        ],
      };

      const result = validateStorageData(validStorageData);
      expect(result).toBeDefined();
    });

    it('should return success for valid storage data with reflects fields', () => {
      const validStorageDataWithReflects: StorageData = {
        sources: [
          {
            id: 'test-123',
            source: 'Test source content',
            emoji: '🧪',
            created: '2024-01-01T00:00:00.000Z',
            perspective: 'I',
            who: 'test',
            processing: 'during',
                        experienceQualities: {
          embodied: 'thinking' as const,
          focus: false as const,
          mood: 'open' as const,
          purpose: false as const,
          space: false as const,
          time: false as const,
          presence: false as const
        },
          },
          {
            id: 'pattern-001',
            source: 'I notice I always feel anxious before things that end up going well',
            emoji: '💡',
            created: '2024-01-01T00:00:00.000Z',
            perspective: 'I',
            who: 'test',
            processing: 'long-after',
                experienceQualities: {
          embodied: 'sensing' as const,
          focus: false as const,
          mood: 'closed' as const,
          purpose: false as const,
          space: false as const,
          time: 'future' as const,
          presence: false as const
        },
            reflects: ['test-123', 'test-456'],
          },
        ],
      };

      const result = validateStorageData(validStorageDataWithReflects);
      expect(result).toBeDefined();
    });

    it('should return error for invalid storage data', () => {
      const invalidStorageData = {
        sources: 'not an array',
        embeddings: 'not an array',
      };

      expect(() => validateStorageData(invalidStorageData)).toThrow();
    });
  });

  describe('Experience conversion functions', () => {
    describe('experienceArrayToQualities', () => {
      it('should convert array to qualities with false defaults', () => {
        const result = experienceArrayToQualities([]);
        expect(result).toEqual({
          embodied: false,
          focus: false,
          mood: false,
          purpose: false,
          space: false,
          time: false,
          presence: false,
        });
      });

      it('should convert subtypes to specific values', () => {
        const result = experienceArrayToQualities([
          'embodied.thinking',
          'mood.open',
          'presence.collective',
        ]);
        expect(result).toEqual({
          embodied: 'thinking',
          focus: false,
          mood: 'open',
          purpose: false,
          space: false,
          time: false,
          presence: 'collective',
        });
      });

      it('should convert base qualities to true', () => {
        const result = experienceArrayToQualities(['embodied', 'mood', 'time']);
        expect(result).toEqual({
          embodied: true,
          focus: false,
          mood: true,
          purpose: false,
          space: false,
          time: true,
          presence: false,
        });
      });

      it('should handle mixed base and subtype qualities', () => {
        const result = experienceArrayToQualities([
          'embodied',
          'mood.open',
          'time',
          'presence.collective',
        ]);
        expect(result).toEqual({
          embodied: true,
          focus: false,
          mood: 'open',
          purpose: false,
          space: false,
          time: true,
          presence: 'collective',
        });
      });
    });

    
  });
});
