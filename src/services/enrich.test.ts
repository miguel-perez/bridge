import { describe, test, expect, beforeEach } from '@jest/globals';
import { EnrichService, enrichSchema } from './enrich.js';
import { saveSource, setupTestStorage, clearTestStorage } from '../core/storage.js';
import type { SourceRecord } from '../core/types.js';
import { v4 as uuidv4 } from 'uuid';

// Helper to create a minimal valid source record
function makeSource(overrides: Partial<SourceRecord> = {}): SourceRecord {
  return {
    id: overrides.id || uuidv4(),
    content: overrides.content || 'Original content',
    contentType: overrides.contentType || 'text',
    system_time: overrides.system_time || new Date().toISOString(),
    perspective: overrides.perspective || 'I',
    experiencer: overrides.experiencer || 'self',
    processing: overrides.processing || 'during',
    occurred: overrides.occurred || '2024-01-01T00:00:00Z',
    crafted: overrides.crafted ?? false,
    experiential_qualities: overrides.experiential_qualities || {
      qualities: [
        { type: 'affective', prominence: 0.5, manifestation: 'neutral' }
      ],
      vector: {
        embodied: 0, attentional: 0, affective: 0.5, purposive: 0, spatial: 0, temporal: 0, intersubjective: 0
      }
    },
    content_embedding: overrides.content_embedding || [0.1, 0.2, 0.3, 0.4, 0.5, ...Array(379).fill(0)],
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

  test('updates experiential qualities and generates vector', async () => {
    const result = await enrichService.enrichSource({
      id: baseSource.id,
      experiential_qualities: {
        qualities: [
          { type: 'spatial', prominence: 0.8, manifestation: 'open space' },
          { type: 'affective', prominence: 0.2, manifestation: 'calm' }
        ]
      }
    });
    expect(result.source.experiential_qualities?.qualities.length).toBe(2);
    expect(result.source.experiential_qualities?.vector.spatial).toBe(0.8);
    expect(result.source.experiential_qualities?.vector.affective).toBe(0.2);
    expect(result.updatedFields).toContain('experiential_qualities');
  });

  test('regenerates embedding if requested', async () => {
    const result = await enrichService.enrichSource({
      id: baseSource.id,
      content: 'New content for embedding',
      regenerate_embeddings: true
    });
    expect(result.embeddingsRegenerated).toBe(true);
    expect(result.source.content_embedding).toBeDefined();
    expect(Array.isArray(result.source.content_embedding)).toBe(true);
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
      experiential_qualities: {
        qualities: [
          { type: 'affective', prominence: 1.5, manifestation: 'too high' }
        ]
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
      experiential_qualities: {
        qualities: [],
        vector: {
          embodied: 0.1, attentional: 0.2, affective: 0.3, purposive: 0.4, spatial: 0.5, temporal: 0.6, intersubjective: 0.7
        }
      }
    });
    expect(result.source.experiential_qualities?.vector.affective).toBe(0.3);
    expect(result.source.experiential_qualities?.qualities.length).toBe(0);
  });

  test('enrich with no changes does not update fields', async () => {
    const result = await enrichService.enrichSource({ id: baseSource.id });
    expect(result.updatedFields.length).toBe(0);
    expect(result.source.id).toBe(baseSource.id);
    expect(result.source.content).toBe(baseSource.content);
  });
}); 