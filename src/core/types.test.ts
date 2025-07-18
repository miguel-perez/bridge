/**
 * Tests for core types and validation functions
 * 
 * @module core/types.test
 */

import {
  PERSPECTIVES,
  PROCESSING_LEVELS,
  QUALITY_TYPES,
  DEFAULTS,

  type Experience,
  type Source,
  type StorageData,
  isValidQualityType,
  isValidPerspective,
  isValidProcessingLevel,
  isValidSource,
  createSource,
  createSourceRecord,
  // Zod schemas and validation functions
  ExperienceSchema,
  SourceSchema,
  StorageDataSchema,
  validateSource,
  validateExperience,
  validateStorageData
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
      'embodied', 'focus', 'mood', 'purpose', 'space', 'time', 'presence'
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
        created: '2024-01-01T00:00:00.000Z',
        perspective: 'I',
        experiencer: 'test',
        processing: 'during',
        crafted: false,
        experience: ['mood.open', 'embodied.thinking']
      };
      expect(isValidSource(validSource)).toBe(true);
    });

    it('should reject invalid source objects', () => {
      expect(isValidSource(null)).toBe(false);
      expect(isValidSource(undefined)).toBe(false);
      expect(isValidSource({})).toBe(false);
      expect(isValidSource({ id: 'test' })).toBe(false);
      expect(isValidSource({ id: '', source: 'test', created: '2024-01-01' })).toBe(false);
    });
  });
});

describe('Factory Functions', () => {
  describe('createSource', () => {
    it('should create a source with default values', () => {
      const source = createSource('Test source');
      
      expect(source.source).toBe('Test source');
      expect(source.id).toMatch(/^src_\d+$/);
      expect(source.created).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(source.perspective).toBe('I');
      expect(source.experiencer).toBe('self');
      expect(source.processing).toBe('during');
      expect(source.crafted).toBe(false);
    });

    it('should use provided ID', () => {
      const source = createSource('Test source', 'custom-id');
      expect(source.id).toBe('custom-id');
    });
  });

  describe('createSourceRecord', () => {
    it('should create a source record with type field', () => {
      const record = createSourceRecord('Test source');
      
      expect(record.source).toBe('Test source');
      expect(record.type).toBe('source');
      expect(record.id).toMatch(/^src_\d+$/);
    });
  });
});

describe('Zod Schema Validation', () => {
  describe('ExperienceSchema', () => {
    it('should validate valid experience', () => {
      const validExperience: Experience = ['mood.open', 'embodied.thinking', 'purpose.goal'];
      
      const result = ExperienceSchema.safeParse(validExperience);
      expect(result.success).toBe(true);
    });

    it('should reject experience with invalid quality types', () => {
      const invalidExperience = ['invalid_quality', 'embodied'];
      
      const result = ExperienceSchema.safeParse(invalidExperience);
      expect(result.success).toBe(false);
    });
  });

  describe('SourceSchema', () => {
    it('should validate valid source', () => {
      const validSource: Source = {
        id: 'test-123',
        source: 'Test source content',
        created: '2024-01-01T00:00:00.000Z',
        perspective: 'I',
        experiencer: 'test',
        processing: 'during',
        crafted: false,
        experience: ['mood.open', 'embodied.thinking']
      };
      
      const result = SourceSchema.safeParse(validSource);
      expect(result.success).toBe(true);
    });

    it('should validate source with custom perspective', () => {
      const validSource: Source = {
        id: 'test-123',
        source: 'Test source content',
        created: '2024-01-01T00:00:00.000Z',
        perspective: 'custom-perspective',
        experiencer: 'test',
        processing: 'during',
        crafted: false,
        experience: ['mood.open', 'embodied.thinking']
      };
      
      const result = SourceSchema.safeParse(validSource);
      expect(result.success).toBe(true);
    });

    it('should reject source with missing required fields', () => {
      const invalidSource = {
        id: 'test-123',
        // missing source
        created: '2024-01-01T00:00:00.000Z'
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
            created: '2024-01-01T00:00:00.000Z',
            perspective: 'I',
            experiencer: 'test',
            processing: 'during',
            crafted: false,
            experience: ['mood.open', 'embodied.thinking']
          }
        ],
        embeddings: [
          {
            sourceId: 'test-123',
            vector: [0.1, 0.2, 0.3],
            generated: '2024-01-01T00:00:00.000Z'
          }
        ]
      };
      
      const result = StorageDataSchema.safeParse(validStorageData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid storage data', () => {
      const invalidStorageData = {
        sources: 'not an array',
        embeddings: 'not an array'
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
        created: '2024-01-01T00:00:00.000Z',
        perspective: 'I',
        experiencer: 'test',
        processing: 'during',
        crafted: false,
        experience: ['mood.open', 'embodied.thinking']
      };
      
      const result = validateSource(validSource);
      expect(result).toBeDefined();
    });

    it('should return error for invalid source', () => {
      const invalidSource = {
        id: '',
        source: ''
      };
      
      expect(() => validateSource(invalidSource)).toThrow();
    });
  });

  describe('validateExperience', () => {
    it('should return success for valid experience', () => {
      const validExperience: Experience = ['mood.open', 'embodied.thinking', 'purpose.goal'];
      
      const result = validateExperience(validExperience);
      expect(result).toBeDefined();
    });

    it('should return error for invalid experience', () => {
      const invalidExperience = {
        qualities: ['mood.open', 'embodied.thinking']
      };
      
      expect(() => validateExperience(invalidExperience)).toThrow();
    });
  });

  describe('validateStorageData', () => {
    it('should return success for valid storage data', () => {
      const validStorageData: StorageData = {
        sources: [
          {
            id: 'test-123',
            source: 'Test source content',
            created: '2024-01-01T00:00:00.000Z',
            perspective: 'I',
            experiencer: 'test',
            processing: 'during',
            crafted: false,
            experience: ['mood.open', 'embodied.thinking']
          }
        ]
      };
      
      const result = validateStorageData(validStorageData);
      expect(result).toBeDefined();
    });

    it('should return error for invalid storage data', () => {
      const invalidStorageData = {
        sources: 'not an array',
        embeddings: 'not an array'
      };
      
      expect(() => validateStorageData(invalidStorageData)).toThrow();
    });
  });
}); 