import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { EnrichService, enrichSchema } from './enrich.js';
import { saveSource, setupTestStorage, clearTestStorage } from '../core/storage.js';
import type { Source } from '../core/types.js';
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
    experience: overrides.experience || ['emotion', 'body'],
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

  test('updates experience', async () => {
    const result = await enrichService.enrichSource({
      id: baseSource.id,
      experience: ['space', 'emotion', 'purpose']
    });
    expect(result.source.experience).toEqual(['space', 'emotion', 'purpose']);
    expect(result.updatedFields).toContain('experience');
  });

  test('throws if record does not exist', async () => {
    await expect(enrichService.enrichSource({
      id: 'nonexistent-id',
      content: 'Should fail'
    })).rejects.toThrow(/not found/);
  });

  test('accepts any perspective string', async () => {
    const input = { 
      id: 'test', 
      content: 'test', 
      perspective: 'invalid' 
    };
    expect(() => enrichSchema.parse(input)).not.toThrow();
  });

  test('accepts valid experience array', async () => {
    const input = {
      id: 'test',
      content: 'test',
      experience: ['emotion', 'body', 'purpose']
    };
    expect(() => enrichSchema.parse(input)).not.toThrow();
  });

  test('enrich with empty experience array', async () => {
    const result = await enrichService.enrichSource({
      id: baseSource.id,
      experience: []
    });
    expect(result.source.experience).toEqual([]);
  });

  test('enrich with no changes does not update fields', async () => {
    const result = await enrichService.enrichSource({ id: baseSource.id });
    expect(result.updatedFields.length).toBe(0);
    expect(result.source.id).toBe(baseSource.id);
    expect(result.source.source).toBe(baseSource.source);
  });
}); 