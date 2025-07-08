import { describe, test, expect } from '@jest/globals';
import type {
  Perspective,
  ProcessingLevel,
  ContentType,
  QualityType,
  QualityEvidence,
  QualityVector,
  ExperientialQualities,
  Source,
  RecordType,
  BaseRecord,
  SourceRecord,
  StorageRecord
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

  describe('QualityVector interface', () => {
    test('should accept valid QualityVector object', () => {
      const vector: QualityVector = {
        embodied: 0.1,
        attentional: 0.2,
        affective: 0.3,
        purposive: 0.4,
        spatial: 0.5,
        temporal: 0.6,
        intersubjective: 0.7
      };
      
      expect(vector.embodied).toBe(0.1);
      expect(vector.attentional).toBe(0.2);
      expect(vector.affective).toBe(0.3);
      expect(vector.purposive).toBe(0.4);
      expect(vector.spatial).toBe(0.5);
      expect(vector.temporal).toBe(0.6);
      expect(vector.intersubjective).toBe(0.7);
    });

    test('should accept zero values', () => {
      const zeroVector: QualityVector = {
        embodied: 0.0,
        attentional: 0.0,
        affective: 0.0,
        purposive: 0.0,
        spatial: 0.0,
        temporal: 0.0,
        intersubjective: 0.0
      };
      
      expect(zeroVector.embodied).toBe(0.0);
      expect(zeroVector.intersubjective).toBe(0.0);
    });

    test('should accept maximum values', () => {
      const maxVector: QualityVector = {
        embodied: 1.0,
        attentional: 1.0,
        affective: 1.0,
        purposive: 1.0,
        spatial: 1.0,
        temporal: 1.0,
        intersubjective: 1.0
      };
      
      expect(maxVector.embodied).toBe(1.0);
      expect(maxVector.intersubjective).toBe(1.0);
    });
  });

  describe('ExperientialQualities interface', () => {
    test('should accept valid ExperientialQualities object', () => {
      const qualities: ExperientialQualities = {
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
        vector: {
          embodied: 0.1,
          attentional: 0.2,
          affective: 0.8,
          purposive: 0.6,
          spatial: 0.0,
          temporal: 0.0,
          intersubjective: 0.0
        }
      };
      
      expect(qualities.qualities).toHaveLength(2);
      expect(qualities.vector.affective).toBe(0.8);
      expect(qualities.vector.purposive).toBe(0.6);
    });

    test('should accept empty qualities array', () => {
      const qualities: ExperientialQualities = {
        qualities: [],
        vector: {
          embodied: 0.0,
          attentional: 0.0,
          affective: 0.0,
          purposive: 0.0,
          spatial: 0.0,
          temporal: 0.0,
          intersubjective: 0.0
        }
      };
      
      expect(qualities.qualities).toHaveLength(0);
    });
  });

  describe('Source interface', () => {
    test('should accept minimal Source object', () => {
      const source: Source = {
        id: 'test-id',
        content: 'Test content',
        system_time: '2024-01-15T10:30:00Z'
      };
      
      expect(source.id).toBe('test-id');
      expect(source.content).toBe('Test content');
      expect(source.system_time).toBe('2024-01-15T10:30:00Z');
    });

    test('should accept complete Source object', () => {
      const source: Source = {
        id: 'complete-id',
        content: 'Complete test content',
        contentType: 'text',
        system_time: '2024-01-15T10:30:00Z',
        occurred: '2024-01-15T10:30:00Z',
        perspective: 'I',
        experiencer: 'TestUser',
        processing: 'during',
        crafted: false,
        experiential_qualities: {
          qualities: [
            {
              type: 'affective',
              prominence: 0.8,
              manifestation: 'feeling of excitement'
            }
          ],
          vector: {
            embodied: 0.0,
            attentional: 0.0,
            affective: 0.8,
            purposive: 0.0,
            spatial: 0.0,
            temporal: 0.0,
            intersubjective: 0.0
          }
        },
        content_embedding: [0.1, 0.2, 0.3, 0.4, 0.5]
      };
      
      expect(source.id).toBe('complete-id');
      expect(source.contentType).toBe('text');
      expect(source.perspective).toBe('I');
      expect(source.experiencer).toBe('TestUser');
      expect(source.processing).toBe('during');
      expect(source.crafted).toBe(false);
      expect(source.experiential_qualities).toBeDefined();
      expect(source.content_embedding).toHaveLength(5);
    });
  });

  describe('Record types', () => {
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
        system_time: '2024-01-15T10:30:00Z'
      };
      
      expect(sourceRecord.type).toBe('source');
      expect(sourceRecord.id).toBe('test-id');
      expect(sourceRecord.content).toBe('Test content');
    });

    test('should accept StorageRecord as SourceRecord', () => {
      const storageRecord: StorageRecord = {
        type: 'source',
        id: 'test-id',
        content: 'Test content',
        system_time: '2024-01-15T10:30:00Z'
      };
      
      expect(storageRecord.type).toBe('source');
      expect(storageRecord.id).toBe('test-id');
    });
  });

  describe('Type compatibility', () => {
    test('should allow Source to be used as SourceRecord', () => {
      const source: Source = {
        id: 'test-id',
        content: 'Test content',
        system_time: '2024-01-15T10:30:00Z'
      };
      
      const sourceRecord: SourceRecord = {
        ...source,
        type: 'source'
      };
      
      expect(sourceRecord.type).toBe('source');
      expect(sourceRecord.content).toBe('Test content');
    });

    test('should allow QualityEvidence in ExperientialQualities', () => {
      const evidence: QualityEvidence = {
        type: 'affective',
        prominence: 0.8,
        manifestation: 'feeling of joy'
      };
      
      const qualities: ExperientialQualities = {
        qualities: [evidence],
        vector: {
          embodied: 0.0,
          attentional: 0.0,
          affective: 0.8,
          purposive: 0.0,
          spatial: 0.0,
          temporal: 0.0,
          intersubjective: 0.0
        }
      };
      
      expect(qualities.qualities[0]).toBe(evidence);
      expect(qualities.qualities[0].type).toBe('affective');
    });
  });
}); 