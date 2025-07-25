/**
 * Tests for core types and validation functions
 */

import {
  PERSPECTIVES,
  PROCESSING_LEVELS,
  QUALITY_TYPES,
  DEFAULTS,
  type Source,
  type StorageData,
  isValidQualityType,
  isValidPerspective,
  isValidProcessingLevel,
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
  qualitiesToExperienceArray,
} from './types.js';

describe('Constants', () => {
  it('should have valid perspective values', () => {
    expect(PERSPECTIVES).toEqual(['I', 'we', 'you', 'they']);
  });

  it('should have valid processing levels', () => {
    expect(PROCESSING_LEVELS).toEqual(['during', 'right-after', 'long-after']);
  });

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
    expect(DEFAULTS.PERSPECTIVE).toBe('I');
    expect(DEFAULTS.EXPERIENCER).toBe('self');
    expect(DEFAULTS.PROCESSING).toBe('during');
    expect(DEFAULTS.CRAFTED).toBe(false);
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

  describe('isValidPerspective', () => {
    it('should accept valid perspectives', () => {
      expect(isValidPerspective('I')).toBe(true);
      expect(isValidPerspective('we')).toBe(true);
      expect(isValidPerspective('you')).toBe(true);
      expect(isValidPerspective('they')).toBe(true);
      expect(isValidPerspective('custom')).toBe(true);
    });

    it('should reject invalid perspectives', () => {
      expect(isValidPerspective('')).toBe(false);
      expect(isValidPerspective('invalid')).toBe(true); // Custom perspectives are allowed
    });
  });

  describe('isValidProcessingLevel', () => {
    it('should accept valid processing levels', () => {
      expect(isValidProcessingLevel('during')).toBe(true);
      expect(isValidProcessingLevel('right-after')).toBe(true);
      expect(isValidProcessingLevel('long-after')).toBe(true);
    });

    it('should reject invalid processing levels', () => {
      expect(isValidProcessingLevel('invalid')).toBe(false);
      expect(isValidProcessingLevel('')).toBe(false);
      expect(isValidProcessingLevel('DURING')).toBe(false);
    });
  });

  describe('isValidSource', () => {
    it('should accept valid source objects', () => {
      const validSource: Source = {
        id: 'test-123',
        source: 'Test source',
        emoji: '🧪',
        created: '2024-01-01T00:00:00.000Z',
        perspective: 'I',
        who: 'test',
        processing: 'during',
        crafted: false,
        experience: ['mood.open', 'embodied.thinking'],
      };
      expect(isValidSource(validSource)).toBe(true);
    });

    it('should accept valid source objects with reflects field', () => {
      const validSourceWithReflects: Source = {
        id: 'test-123',
        source: 'I notice I always feel anxious before things that end up going well',
        emoji: '💡',
        created: '2024-01-01T00:00:00.000Z',
        perspective: 'I',
        who: 'test',
        processing: 'during',
        crafted: false,
        experience: ['embodied.sensing', 'mood.closed', 'time.future'],
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
        perspective: 'I',
        who: 'test',
        processing: 'during',
        crafted: false,
        experience: ['mood.open', 'embodied.thinking'],
        reflects: [],
      };
      expect(isValidSource(validSourceWithEmptyReflects)).toBe(true);
    });

    it('should accept source objects with context', () => {
      const validSourceWithContext: Source = {
        id: 'test-123',
        source: 'Test source',
        emoji: '🧪',
        created: '2024-01-01T00:00:00.000Z',
        perspective: 'I',
        who: 'test',
        processing: 'during',
        crafted: false,
        experience: ['mood.open'],
        context: 'During a code review session',
      };
      expect(isValidSource(validSourceWithContext)).toBe(true);
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
        perspective: 'I',
        who: 'test',
        processing: 'during',
        crafted: false,
        experience: ['mood.open', 'embodied.thinking'],
        reflects: 'not-an-array', // Should be array
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
      expect(source.perspective).toBe('I');
      expect(source.who).toBe('self');
      expect(source.processing).toBe('during');
      expect(source.crafted).toBe(false);
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
        perspective: 'I',
        who: 'test',
        processing: 'during',
        crafted: false,
        experience: ['mood.open', 'embodied.thinking'],
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
        perspective: 'I',
        who: 'test',
        processing: 'during',
        crafted: false,
        experience: ['embodied.sensing', 'mood.closed', 'time.future'],
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
        perspective: 'I',
        who: 'test',
        processing: 'during',
        crafted: false,
        experience: ['mood.closed', 'focus.broad'],
        context: 'End of quarter with multiple deadlines converging',
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
        perspective: 'I',
        who: 'test',
        processing: 'during',
        crafted: false,
        experience: ['mood.open', 'embodied.thinking'],
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
        perspective: 'I',
        who: 'test',
        processing: 'during',
        crafted: false,
        experience: ['mood.open', 'embodied.thinking'],
        reflects: 'not-an-array', // Should be array
      };

      const result = SourceSchema.safeParse(invalidSourceWithReflects);
      expect(result.success).toBe(false);
    });

    it('should reject source with invalid reflects array elements', () => {
      const invalidSourceWithReflects = {
        id: 'test-123',
        source: 'Test source content',
        created: '2024-01-01T00:00:00.000Z',
        perspective: 'I',
        who: 'test',
        processing: 'during',
        crafted: false,
        experience: ['mood.open', 'embodied.thinking'],
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
        crafted: false,
        experience: ['mood.open', 'embodied.thinking'],
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
            crafted: false,
            experience: ['mood.open', 'embodied.thinking'],
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
            crafted: false,
            experience: ['mood.open', 'embodied.thinking'],
          },
          {
            id: 'pattern-001',
            source: 'I notice I always feel anxious before things that end up going well',
            emoji: '💡',
            created: '2024-01-01T00:00:00.000Z',
            perspective: 'I',
            who: 'test',
            processing: 'long-after',
            crafted: false,
            experience: ['embodied.sensing', 'mood.closed', 'time.future'],
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
        perspective: 'I',
        who: 'test',
        processing: 'during',
        crafted: false,
        experience: ['mood.open', 'embodied.thinking'],
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
        crafted: false,
        experience: ['embodied.sensing', 'mood.closed', 'time.future'],
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
        perspective: 'I',
        who: 'test',
        processing: 'during',
        crafted: false,
        experience: ['mood.open', 'embodied.thinking'],
        reflects: 'not-an-array', // Should be array
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
            crafted: false,
            experience: ['mood.open', 'embodied.thinking'],
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
            crafted: false,
            experience: ['mood.open', 'embodied.thinking'],
          },
          {
            id: 'pattern-001',
            source: 'I notice I always feel anxious before things that end up going well',
            emoji: '💡',
            created: '2024-01-01T00:00:00.000Z',
            perspective: 'I',
            who: 'test',
            processing: 'long-after',
            crafted: false,
            experience: ['embodied.sensing', 'mood.closed', 'time.future'],
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

    describe('qualitiesToExperienceArray', () => {
      it('should convert false values to empty array', () => {
        const result = qualitiesToExperienceArray({
          embodied: false,
          focus: false,
          mood: false,
          purpose: false,
          space: false,
          time: false,
          presence: false,
        });
        expect(result).toEqual([]);
      });

      it('should convert true values to base quality names', () => {
        const result = qualitiesToExperienceArray({
          embodied: true,
          focus: false,
          mood: true,
          purpose: false,
          space: false,
          time: true,
          presence: false,
        });
        expect(result).toEqual(['embodied', 'mood', 'time']);
      });

      it('should convert subtype values to dot notation', () => {
        const result = qualitiesToExperienceArray({
          embodied: 'thinking',
          focus: false,
          mood: 'open',
          purpose: false,
          space: false,
          time: false,
          presence: 'collective',
        });
        expect(result).toEqual(['embodied.thinking', 'mood.open', 'presence.collective']);
      });

      it('should handle mixed true and subtype values', () => {
        const result = qualitiesToExperienceArray({
          embodied: true,
          focus: false,
          mood: 'open',
          purpose: false,
          space: false,
          time: true,
          presence: 'collective',
        });
        expect(result).toEqual(['embodied', 'mood.open', 'time', 'presence.collective']);
      });
    });
  });
});
