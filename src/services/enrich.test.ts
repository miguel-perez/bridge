import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { EnrichService, enrichSchema } from './enrich.js';
import { saveSource, setupTestStorage, clearTestStorage } from '../core/storage.js';
import type { SourceRecord } from '../core/types.js';
import { v4 as uuidv4 } from 'uuid';

// Mock the embedding service to avoid transformers library issues
jest.mock('./embeddings.js', () => ({
  embeddingService: {
    initialize: jest.fn().mockResolvedValue(undefined),
    generateEmbedding: jest.fn().mockResolvedValue(new Array(384).fill(0.1)),
    generateEmbeddings: jest.fn().mockResolvedValue([new Array(384).fill(0.1)]),
    clearCache: jest.fn(),
    getExpectedDimension: jest.fn().mockReturnValue(384)
  }
}));

// Helper to create a minimal valid source record
function makeSource(overrides: Partial<SourceRecord> = {}): SourceRecord {
  return {
    id: overrides.id || uuidv4(),
    content: overrides.content || 'Original content',
    narrative: overrides.narrative || 'Original narrative',
    contentType: overrides.contentType || 'text',
    system_time: overrides.system_time || new Date().toISOString(),
    perspective: overrides.perspective || 'I',
    experiencer: overrides.experiencer || 'self',
    processing: overrides.processing || 'during',
    occurred: overrides.occurred || '2024-01-01T00:00:00Z',
    crafted: overrides.crafted ?? false,
    experience: {
      qualities: [
        { type: 'affective', prominence: 0.5, manifestation: 'neutral' }
      ],
      emoji: '🌧️',
    },
    type: 'source',
    ...overrides
  };
}

describe('EnrichService', () => {
  let enrichService: EnrichService;
  let baseSource: SourceRecord;

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
    expect(result.source.content).toBe('Updated content');
    expect(result.updatedFields).toContain('content');
  });

  test('partial update: only updates provided fields', async () => {
    const result = await enrichService.enrichSource({
      id: baseSource.id,
      perspective: 'we',
    });
    expect(result.source.perspective).toBe('we');
    expect(result.updatedFields).toContain('perspective');
    expect(result.source.content).toBe(baseSource.content);
  });

  test('updates experience and generates vector', async () => {
    const result = await enrichService.enrichSource({
      id: baseSource.id,
      experience: {
        qualities: [
          { type: 'spatial', prominence: 0.8, manifestation: 'open space' },
          { type: 'affective', prominence: 0.2, manifestation: 'calm' }
        ],
        emoji: '🌧️'
      }
    });
    expect(result.source.experience?.qualities.length).toBe(2);
    expect(result.source.experience?.qualities[0].type).toBe('spatial');
    expect(result.source.experience?.qualities[1].type).toBe('affective');
    expect(result.updatedFields).toContain('experience');
  });

  test('regenerates embedding if requested', async () => {
    const result = await enrichService.enrichSource({
      id: baseSource.id,
      content: 'New content for embedding',
      regenerate_embeddings: true
    });
    expect(result.embeddingsRegenerated).toBe(true);
    expect(result.source.embedding).toBeDefined();
    expect(Array.isArray(result.source.embedding)).toBe(true);
  });

  test('throws if record does not exist', async () => {
    await expect(enrichService.enrichSource({
      id: 'nonexistent-id',
      content: 'Should fail'
    })).rejects.toThrow(/not found/);
  });

  test('throws on invalid perspective', async () => {
    const badInput = { ...baseSource, perspective: 'invalid' };
    expect(() => enrichSchema.parse(badInput)).toThrow();
  });

  test('throws on out-of-range prominence', async () => {
    const badInput = {
      ...baseSource,
      experience: {
        qualities: [
          { type: 'affective', prominence: 1.5, manifestation: 'too high' }
        ],
        emoji: '🌧️'
      }
    };
    expect(() => enrichSchema.parse(badInput)).toThrow();
  });

  test('throws on invalid occurred date', async () => {
    await saveSource({ ...baseSource, id: 'bad-date' });
    await expect(enrichService.enrichSource({
      id: 'bad-date',
      occurred: 'not-a-date'
    })).rejects.toThrow(/Invalid occurred date/);
  });

  test('enrich with only a vector, no qualities', async () => {
    const result = await enrichService.enrichSource({
      id: baseSource.id,
      experience: {
        qualities: [],
        emoji: '🌧️'
      }
    });
    expect(result.source.experience?.qualities.length).toBe(0);
  });

  test('enrich with no changes does not update fields', async () => {
    const result = await enrichService.enrichSource({ id: baseSource.id });
    expect(result.updatedFields.length).toBe(0);
    expect(result.source.id).toBe(baseSource.id);
    expect(result.source.content).toBe(baseSource.content);
  });
}); 