import { describe, test, expect } from '@jest/globals';
import type {
  Perspective,
  ProcessingLevel,
  ContentType,
  QualityType,
  QualityEvidence,
  Experience,
  Source,
  RecordType,
  BaseRecord,
  SourceRecord,
  StorageRecord
} from './types.js';
import {
  isValidQualityScore,
  isValidQualityType,
  isValidPerspective,
  isValidProcessingLevel,
  isValidSource,
  createSource,
  createSourceRecord
} from './types.js';

describe('Core Types', () => {
  describe('Type definitions', () => {
    test('should define valid Perspective types', () => {
      const validPerspectives: Perspective[] = ['I', 'we', 'you', 'they', 'custom'];
      expect(validPerspectives).toBeDefined();
      expect(validPerspectives.length).toBeGreaterThan(0);
    });

    test('should define valid ProcessingLevel types', () => {
      const validProcessingLevels: ProcessingLevel[] = ['during', 'right-after', 'long-after', 'crafted'];
      expect(validProcessingLevels).toBeDefined();
      expect(validProcessingLevels.length).toBeGreaterThan(0);
    });

    test('should define valid ContentType types', () => {
      const validContentTypes: ContentType[] = ['text', 'audio', 'custom'];
      expect(validContentTypes).toBeDefined();
      expect(validContentTypes.length).toBeGreaterThan(0);
    });

    test('should define valid QualityType types', () => {
      const validQualityTypes: QualityType[] = [
        'embodied',
        'attentional', 
        'affective',
        'purposive',
        'spatial',
        'temporal',
        'intersubjective'
      ];
      expect(validQualityTypes).toBeDefined();
      expect(validQualityTypes.length).toBe(7);
    });
  });

  describe('QualityEvidence interface', () => {
    test('should accept valid QualityEvidence object', () => {
      const qualityEvidence: QualityEvidence = {
        type: 'affective',
        prominence: 0.8,
        manifestation: 'feeling of excitement'
      };
      
      expect(qualityEvidence.type).toBe('affective');
      expect(qualityEvidence.prominence).toBe(0.8);
      expect(qualityEvidence.manifestation).toBe('feeling of excitement');
    });

    test('should accept all quality types', () => {
      const qualityTypes: QualityType[] = [
        'embodied', 'attentional', 'affective', 'purposive', 
        'spatial', 'temporal', 'intersubjective'
      ];
      
      qualityTypes.forEach(type => {
        const evidence: QualityEvidence = {
          type,
          prominence: 0.5,
          manifestation: `test manifestation for ${type}`
        };
        expect(evidence.type).toBe(type);
      });
    });
  });

  describe('Experience interface', () => {
    test('should accept valid Experience object', () => {
      const experience: Experience = {
        qualities: [
          {
            type: 'affective',
            prominence: 0.8,
            manifestation: 'feeling of joy'
          },
          {
            type: 'purposive',
            prominence: 0.6,
            manifestation: 'clear goal direction'
          }
        ],
        emoji: '🌧️'
      };
      
      expect(experience.qualities).toHaveLength(2);
      expect(experience.qualities[0].type).toBe('affective');
      expect(experience.qualities[1].type).toBe('purposive');
      expect(experience.emoji).toBe('🌧️');
    });

    test('should accept empty qualities array', () => {
      const experience: Experience = {
        qualities: [],
        emoji: '🌧️'
      };
      
      expect(experience.qualities).toHaveLength(0);
      expect(experience.emoji).toBe('🌧️');
    });
  });

  describe('Source interface', () => {
    test('should accept minimal Source object', () => {
      const source: Source = {
        id: 'test-id',
        content: 'Test content',
        narrative: 'Test narrative',
        system_time: '2024-01-15T10:30:00Z'
      };
      
      expect(source.id).toBe('test-id');
      expect(source.content).toBe('Test content');
      expect(source.narrative).toBe('Test narrative');
      expect(source.system_time).toBe('2024-01-15T10:30:00Z');
    });

    test('should accept complete Source object', () => {
      const source: Source = {
        id: 'complete-id',
        content: 'Complete test content',
        narrative: 'Generated narrative that weaves content with qualities',
        contentType: 'text',
        system_time: '2024-01-15T10:30:00Z',
        occurred: '2024-01-15T10:00:00Z',
        perspective: 'I',
        experiencer: 'self',
        processing: 'during',
        crafted: false,
        experience: {
          qualities: [
            {
              type: 'affective',
              prominence: 0.8,
              manifestation: 'feeling of joy'
            }
          ],
          emoji: '🌧️'
        },
        narrative_embedding: [0.1, 0.2, 0.3]
      };
      
      expect(source.id).toBe('complete-id');
      expect(source.content).toBe('Complete test content');
      expect(source.narrative).toBe('Generated narrative that weaves content with qualities');
      expect(source.contentType).toBe('text');
      expect(source.perspective).toBe('I');
      expect(source.experiencer).toBe('self');
      expect(source.processing).toBe('during');
      expect(source.crafted).toBe(false);
      expect(source.experience?.qualities).toHaveLength(1);
      expect(source.experience?.emoji).toBe('🌧️');
      expect(source.narrative_embedding).toHaveLength(3);
    });

    test('should accept Source with narrative only', () => {
      const source: Source = {
        id: 'narrative-only-id',
        content: 'Fallback content',
        narrative: 'Primary narrative content',
        system_time: '2024-01-15T10:30:00Z'
      };
      
      expect(source.narrative).toBe('Primary narrative content');
      expect(source.content).toBe('Fallback content');
    });
  });

  describe('Storage types', () => {
    test('should define valid RecordType', () => {
      const recordType: RecordType = 'source';
      expect(recordType).toBe('source');
    });

    test('should accept valid BaseRecord', () => {
      const baseRecord: BaseRecord = {
        type: 'source',
        id: 'test-id'
      };
      
      expect(baseRecord.type).toBe('source');
      expect(baseRecord.id).toBe('test-id');
    });

    test('should accept valid SourceRecord', () => {
      const sourceRecord: SourceRecord = {
        type: 'source',
        id: 'test-id',
        content: 'Test content',
        narrative: 'Test narrative',
        system_time: '2024-01-15T10:30:00Z'
      };
      
      expect(sourceRecord.type).toBe('source');
      expect(sourceRecord.id).toBe('test-id');
      expect(sourceRecord.content).toBe('Test content');
      expect(sourceRecord.narrative).toBe('Test narrative');
    });

    test('should accept StorageRecord union type', () => {
      const storageRecord: StorageRecord = {
        type: 'source',
        id: 'test-id',
        content: 'Test content',
        narrative: 'Test narrative',
        system_time: '2024-01-15T10:30:00Z'
      };
      
      expect(storageRecord.type).toBe('source');
      expect(storageRecord.id).toBe('test-id');
      expect(storageRecord.narrative).toBe('Test narrative');
    });
  });

  describe('Validation functions', () => {
    test('should validate quality scores', () => {
      expect(isValidQualityScore(0.0)).toBe(true);
      expect(isValidQualityScore(0.5)).toBe(true);
      expect(isValidQualityScore(1.0)).toBe(true);
      expect(isValidQualityScore(-0.1)).toBe(false);
      expect(isValidQualityScore(1.1)).toBe(false);
      expect(isValidQualityScore('0.5' as any)).toBe(false);
    });

    test('should validate quality types', () => {
      expect(isValidQualityType('embodied')).toBe(true);
      expect(isValidQualityType('attentional')).toBe(true);
      expect(isValidQualityType('affective')).toBe(true);
      expect(isValidQualityType('purposive')).toBe(true);
      expect(isValidQualityType('spatial')).toBe(true);
      expect(isValidQualityType('temporal')).toBe(true);
      expect(isValidQualityType('intersubjective')).toBe(true);
      expect(isValidQualityType('invalid')).toBe(false);
    });

    test('should validate perspectives', () => {
      expect(isValidPerspective('I')).toBe(true);
      expect(isValidPerspective('we')).toBe(true);
      expect(isValidPerspective('you')).toBe(true);
      expect(isValidPerspective('they')).toBe(true);
      expect(isValidPerspective('custom')).toBe(true);
    });

    test('should validate processing levels', () => {
      expect(isValidProcessingLevel('during')).toBe(true);
      expect(isValidProcessingLevel('right-after')).toBe(true);
      expect(isValidProcessingLevel('long-after')).toBe(true);
      expect(isValidProcessingLevel('crafted')).toBe(true);
      expect(isValidProcessingLevel('invalid')).toBe(false);
    });

    test('should validate source objects', () => {
      const validSource = {
        id: 'test-id',
        content: 'Test content',
        narrative: 'Test narrative',
        system_time: '2024-01-15T10:30:00Z'
      };
      
      const invalidSource = {
        id: '',
        content: 'Test content',
        narrative: 'Test narrative',
        system_time: '2024-01-15T10:30:00Z'
      };
      
      expect(isValidSource(validSource)).toBe(true);
      expect(isValidSource(invalidSource)).toBe(false);
      expect(isValidSource(null)).toBe(false);
      expect(isValidSource(undefined)).toBe(false);
    });
  });

  describe('Factory functions', () => {
    test('should create source with defaults', () => {
      const source = createSource('Test content', 'test-id');
      
      expect(source.id).toBe('test-id');
      expect(source.content).toBe('Test content');
      expect(source.contentType).toBe('text');
      expect(source.perspective).toBe('I');
      expect(source.experiencer).toBe('self');
      expect(source.processing).toBe('during');
      expect(source.crafted).toBe(false);
    });

    test('should create source record', () => {
      const record = createSourceRecord('Test content', 'test-id');
      
      expect(record.type).toBe('source');
      expect(record.id).toBe('test-id');
      expect(record.content).toBe('Test content');
    });
  });
}); 