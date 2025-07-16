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

  type QualityEvidence,
  type Experience,
  type Source,
  type EmbeddingRecord,
  type StorageData,
  type SourceRecord,
  isValidQualityScore,
  isValidQualityType,
  isValidPerspective,
  isValidProcessingLevel,
  isValidSource,
  createSource,
  createSourceRecord,
  // New Zod schemas and validation functions
  QualityEvidenceSchema,
  ExperienceSchema,
  SourceSchema,
  EmbeddingRecordSchema,
  StorageDataSchema,
  SourceRecordSchema,
  validateSource,
  validateExperience,
  validateQualityEvidence,
  validateStorageData
} from './types.js';

describe('Constants', () => {
  it('should have valid perspective values', () => {
    expect(PERSPECTIVES).toEqual(['I', 'we', 'you', 'they']);
  });

  it('should have valid processing levels', () => {
    expect(PROCESSING_LEVELS).toEqual(['during', 'right-after', 'long-after', 'crafted']);
  });

  it('should have valid quality types', () => {
    expect(QUALITY_TYPES).toEqual([
      'embodied', 'attentional', 'affective', 'purposive', 
      'spatial', 'temporal', 'intersubjective'
    ]);
  });

  it('should have sensible defaults', () => {
    expect(DEFAULTS.PERSPECTIVE).toBe('I');
    expect(DEFAULTS.EXPERIENCER).toBe('self');
    expect(DEFAULTS.PROCESSING).toBe('during');
    expect(DEFAULTS.CONTENT_TYPE).toBe('text');
    expect(DEFAULTS.CRAFTED).toBe(false);
    expect(DEFAULTS.QUALITY_PROMINENCE).toBe(0.5);
  });
});

describe('Type Validation Functions', () => {
  describe('isValidQualityScore', () => {
    it('should accept valid quality scores', () => {
      expect(isValidQualityScore(0.0)).toBe(true);
      expect(isValidQualityScore(0.5)).toBe(true);
      expect(isValidQualityScore(1.0)).toBe(true);
    });

    it('should reject invalid quality scores', () => {
      expect(isValidQualityScore(-0.1)).toBe(false);
      expect(isValidQualityScore(1.1)).toBe(false);
      expect(isValidQualityScore(NaN)).toBe(false);
      expect(isValidQualityScore(Infinity)).toBe(false);
    });
  });

  describe('isValidQualityType', () => {
    it('should accept valid quality types', () => {
      expect(isValidQualityType('embodied')).toBe(true);
      expect(isValidQualityType('attentional')).toBe(true);
      expect(isValidQualityType('affective')).toBe(true);
      expect(isValidQualityType('purposive')).toBe(true);
      expect(isValidQualityType('spatial')).toBe(true);
      expect(isValidQualityType('temporal')).toBe(true);
      expect(isValidQualityType('intersubjective')).toBe(true);
    });

    it('should reject invalid quality types', () => {
      expect(isValidQualityType('invalid')).toBe(false);
      expect(isValidQualityType('')).toBe(false);
      expect(isValidQualityType('EMBODIED')).toBe(false);
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
      expect(isValidProcessingLevel('crafted')).toBe(true);
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
        experience: {
          qualities: [],
          emoji: '📝',
          narrative: 'Test narrative'
        }
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
      expect(source.id).toMatch(/^exp_\d+_[a-z0-9]+$/);
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
      expect(record.id).toMatch(/^exp_\d+_[a-z0-9]+$/);
    });
  });
});

describe('Zod Schema Validation', () => {
  describe('QualityEvidenceSchema', () => {
    it('should validate valid quality evidence', () => {
      const validQuality: QualityEvidence = {
        type: 'embodied',
        prominence: 0.8,
        manifestation: 'fingers trembling with excitement'
      };
      
      const result = QualityEvidenceSchema.safeParse(validQuality);
      expect(result.success).toBe(true);
    });

    it('should reject invalid quality evidence', () => {
      const invalidQuality = {
        type: 'invalid',
        prominence: 1.5,
        manifestation: ''
      };
      
      const result = QualityEvidenceSchema.safeParse(invalidQuality);
      expect(result.success).toBe(false);
    });
  });

  describe('ExperienceSchema', () => {
    it('should validate valid experience', () => {
      const validExperience: Experience = {
        qualities: [
          {
            type: 'affective',
            prominence: 0.9,
            manifestation: 'overwhelming joy'
          }
        ],
        emoji: '😊',
        narrative: 'Feeling overwhelming joy in this moment.'
      };
      
      const result = ExperienceSchema.safeParse(validExperience);
      expect(result.success).toBe(true);
    });

    it('should reject experience with invalid narrative length', () => {
      const invalidExperience = {
        qualities: [],
        emoji: '😊',
        narrative: 'A'.repeat(201) // Too long
      };
      
      const result = ExperienceSchema.safeParse(invalidExperience);
      expect(result.success).toBe(false);
    });
  });

  describe('SourceSchema', () => {
    it('should validate valid source', () => {
      const validSource: Source = {
        id: 'test-123',
        source: 'Test source',
        created: '2024-01-01T00:00:00.000Z',
        perspective: 'I',
        experiencer: 'test',
        processing: 'during',
        crafted: false,
        experience: {
          qualities: [],
          emoji: '📝',
          narrative: 'Test narrative'
        }
      };
      
      const result = SourceSchema.safeParse(validSource);
      expect(result.success).toBe(true);
    });

    it('should validate source with custom perspective', () => {
      const sourceWithCustomPerspective: Source = {
        id: 'test-123',
        source: 'Test source',
        created: '2024-01-01T00:00:00.000Z',
        perspective: 'custom-perspective'
      };
      
      const result = SourceSchema.safeParse(sourceWithCustomPerspective);
      expect(result.success).toBe(true);
    });
  });

  describe('EmbeddingRecordSchema', () => {
    it('should validate valid embedding record', () => {
      const validEmbedding: EmbeddingRecord = {
        sourceId: 'test-123',
        vector: [0.1, 0.2, 0.3, 0.4, 0.5],
        generated: '2024-01-01T00:00:00.000Z'
      };
      
      const result = EmbeddingRecordSchema.safeParse(validEmbedding);
      expect(result.success).toBe(true);
    });

    it('should reject invalid embedding record', () => {
      const invalidEmbedding = {
        sourceId: '',
        vector: 'not-an-array',
        generated: 'invalid-date'
      };
      
      const result = EmbeddingRecordSchema.safeParse(invalidEmbedding);
      expect(result.success).toBe(false);
    });
  });

  describe('StorageDataSchema', () => {
    it('should validate valid storage data', () => {
      const validStorageData: StorageData = {
        sources: [
          {
            id: 'test-123',
            source: 'Test source',
            created: '2024-01-01T00:00:00.000Z'
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

    it('should validate storage data without embeddings', () => {
      const storageDataWithoutEmbeddings: StorageData = {
        sources: [
          {
            id: 'test-123',
            source: 'Test source',
            created: '2024-01-01T00:00:00.000Z'
          }
        ]
      };
      
      const result = StorageDataSchema.safeParse(storageDataWithoutEmbeddings);
      expect(result.success).toBe(true);
    });
  });

  describe('SourceRecordSchema', () => {
    it('should validate valid source record', () => {
      const validSourceRecord: SourceRecord = {
        id: 'test-123',
        source: 'Test source',
        created: '2024-01-01T00:00:00.000Z',
        type: 'source'
      };
      
      const result = SourceRecordSchema.safeParse(validSourceRecord);
      expect(result.success).toBe(true);
    });
  });
});

describe('Zod-based Validation Functions', () => {
  describe('validateSource', () => {
    it('should return success for valid source', () => {
      const validSource: Source = {
        id: 'test-123',
        source: 'Test source',
        created: '2024-01-01T00:00:00.000Z'
      };
      
      const result = validateSource(validSource);
      expect(result.success).toBe(true);
    });

    it('should return error for invalid source', () => {
      const invalidSource = {
        id: '',
        source: '',
        created: 'invalid-date'
      };
      
      const result = validateSource(invalidSource);
      expect(result.success).toBe(false);
    });
  });

  describe('validateExperience', () => {
    it('should return success for valid experience', () => {
      const validExperience: Experience = {
        qualities: [],
        emoji: '📝',
        narrative: 'Test narrative'
      };
      
      const result = validateExperience(validExperience);
      expect(result.success).toBe(true);
    });

    it('should return error for invalid experience', () => {
      const invalidExperience = {
        qualities: 'not-an-array',
        emoji: '',
        narrative: 'A'.repeat(201)
      };
      
      const result = validateExperience(invalidExperience);
      expect(result.success).toBe(false);
    });
  });

  describe('validateQualityEvidence', () => {
    it('should return success for valid quality evidence', () => {
      const validQuality: QualityEvidence = {
        type: 'embodied',
        prominence: 0.8,
        manifestation: 'fingers trembling'
      };
      
      const result = validateQualityEvidence(validQuality);
      expect(result.success).toBe(true);
    });

    it('should return error for invalid quality evidence', () => {
      const invalidQuality = {
        type: 'invalid',
        prominence: 1.5,
        manifestation: ''
      };
      
      const result = validateQualityEvidence(invalidQuality);
      expect(result.success).toBe(false);
    });
  });

  describe('validateStorageData', () => {
    it('should return success for valid storage data', () => {
      const validStorageData: StorageData = {
        sources: [
          {
            id: 'test-123',
            source: 'Test source',
            created: '2024-01-01T00:00:00.000Z'
          }
        ]
      };
      
      const result = validateStorageData(validStorageData);
      expect(result.success).toBe(true);
    });

    it('should return error for invalid storage data', () => {
      const invalidStorageData = {
        sources: 'not-an-array',
        embeddings: 'not-an-array'
      };
      
      const result = validateStorageData(invalidStorageData);
      expect(result.success).toBe(false);
    });
  });
}); 