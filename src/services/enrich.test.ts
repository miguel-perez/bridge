import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { EnrichService, enrichSchema } from './enrich.js';
import { saveSource, setupTestStorage, clearTestStorage } from '../core/storage.js';
import type { Source } from '../core/types.js';
import { v4 as uuidv4 } from 'uuid';

// Mock the embedding service to avoid transformers library issues
jest.mock('./embeddings.js', () => ({
  embeddingService: {
    initialize: jest.fn().mockResolvedValue(undefined),
    generateEmbedding: jest.fn().mockResolvedValue(new Array(384).fill(0.1) as number[]),
    generateEmbeddings: jest.fn().mockResolvedValue([new Array(384).fill(0.1)] as number[][]),
    clearCache: jest.fn(),
    getExpectedDimension: jest.fn().mockReturnValue(384)
  }
}));

// VectorStore removed - embeddings now in main storage

// Helper to create a minimal valid source
function makeSource(overrides: Partial<Source> = {}): Source {
  return {
    id: overrides.id || uuidv4(),
    source: overrides.source || 'Original content',
    created: overrides.created || new Date().toISOString(),
    perspective: overrides.perspective || 'I',
    experiencer: overrides.experiencer || 'self',
    processing: overrides.processing || 'during',
    crafted: overrides.crafted ?? false,
    experience: {
      qualities: [
        { type: 'affective', prominence: 0.5, manifestation: 'neutral' }
      ],
      emoji: '🌧️',
      narrative: 'Original narrative'
    },
    ...overrides
  };
}

describe('EnrichService', () => {
  let enrichService: EnrichService;
  let baseSource: Source;

  beforeEach(async () => {
    setupTestStorage('EnrichService');
    await clearTestStorage();
    enrichService = new EnrichService();
    baseSource = makeSource();
    await saveSource(baseSource);
  });

  test('enriches an existing record with new content', async () => {
          const result = await enrichService.enrichSource({
        id: baseSource.id,
        content: 'Updated content',
      });
      expect(result.source.source).toBe('Updated content');
      expect(result.updatedFields).toContain('content');
  });

  test('partial update: only updates provided fields', async () => {
    const result = await enrichService.enrichSource({
      id: baseSource.id,
      perspective: 'we',
    });
    expect(result.source.perspective).toBe('we');
    expect(result.updatedFields).toContain('perspective');
    expect(result.source.source).toBe(baseSource.source);
  });

  test('updates experience and generates vector', async () => {
    const result = await enrichService.enrichSource({
      id: baseSource.id,
      experience: {
        qualities: [
          { type: 'spatial', prominence: 0.8, manifestation: 'open space' },
          { type: 'affective', prominence: 0.2, manifestation: 'calm' }
        ],
        emoji: '🌧️',
        narrative: 'Updated narrative'
      }
    });
    expect(result.source.experience?.qualities.length).toBe(2);
    expect(result.source.experience?.qualities[0].type).toBe('spatial');
    expect(result.source.experience?.qualities[1].type).toBe('affective');
    expect(result.updatedFields).toContain('experience.qualities');
  });

  test('throws if record does not exist', async () => {
          await expect(enrichService.enrichSource({
        id: 'nonexistent-id',
        content: 'Should fail'
      })).rejects.toThrow(/not found/);
  });

      test('accepts any perspective string', async () => {
      const input = { id: 'test', content: 'test', created: new Date().toISOString(), perspective: 'invalid' };
      expect(() => enrichSchema.parse(input)).not.toThrow();
    });

  test('accepts any prominence value', async () => {
    const input = {
      id: 'test',
      source: 'test',
      created: new Date().toISOString(),
      experience: {
        qualities: [
          { type: 'affective', prominence: 1.5, manifestation: 'too high' }
        ],
        emoji: '🌧️',
        narrative: 'test'
      }
    };
    expect(() => enrichSchema.parse(input)).not.toThrow();
  });

  test('enrich with only a vector, no qualities', async () => {
    const result = await enrichService.enrichSource({
      id: baseSource.id,
      experience: {
        qualities: [],
        emoji: '🌧️',
        narrative: 'test'
      }
    });
    expect(result.source.experience?.qualities.length).toBe(0);
  });

  test('enrich with no changes does not update fields', async () => {
    const result = await enrichService.enrichSource({ id: baseSource.id });
    expect(result.updatedFields.length).toBe(0);
    expect(result.source.id).toBe(baseSource.id);
    expect(result.source.source).toBe(baseSource.source);
  });
}); 