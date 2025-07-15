import { describe, test, expect, beforeEach } from '@jest/globals';
import { ReleaseService } from './release.js';
import { saveSource, getSource, setupTestStorage, clearTestStorage } from '../core/storage.js';
import type { SourceRecord } from '../core/types.js';
import { v4 as uuidv4 } from 'uuid';

// Helper to create a minimal valid source record
function makeSource(overrides: Partial<SourceRecord> = {}): SourceRecord {
  return {
    id: overrides.id || uuidv4(),
    content: overrides.content || 'Release test content',
    created: overrides.created || new Date().toISOString(),
    perspective: overrides.perspective || 'I',
    experiencer: overrides.experiencer || 'self',
    processing: overrides.processing || 'during',
    crafted: overrides.crafted ?? false,
    experience: overrides.experience || {
      qualities: [
        { type: 'affective', prominence: 0.5, manifestation: 'neutral' }
      ],
      emoji: '😊',
      narrative: 'Test narrative'
    },
    embedding: overrides.embedding || [0.1, 0.2, 0.3, 0.4, 0.5, ...Array(379).fill(0)],
    type: 'source',
    ...overrides
  };
}

describe('ReleaseService', () => {
  let releaseService: ReleaseService;
  let baseSource: SourceRecord;

  beforeEach(async () => {
    setupTestStorage('ReleaseService');
    await clearTestStorage();
    releaseService = new ReleaseService();
    baseSource = makeSource();
    await saveSource(baseSource);
  });

  test('releases an existing source record', async () => {
    const result = await releaseService.releaseSource({ id: baseSource.id });
    expect(result.success).toBe(true);
    expect(result.releasedSource).toBeDefined();
    expect(result.releasedSource?.id).toBe(baseSource.id);
    expect(result.message).toMatch(/Released source/);
    // Should be deleted from storage
    const after = await getSource(baseSource.id);
    expect(after).toBeNull();
  });

  test('throws if record does not exist', async () => {
    await expect(releaseService.releaseSource({ id: 'nonexistent-id' })).rejects.toThrow(/No source found/);
  });

  test('releases a record with minimal content', async () => {
    const minimal = makeSource({ 
      content: 'x', 
      experience: { 
        qualities: [], 
        emoji: '📝',
        narrative: 'Minimal test'
      } 
    });
    await saveSource(minimal);
    const result = await releaseService.releaseSource({ id: minimal.id });
    expect(result.success).toBe(true);
    expect(result.releasedSource?.content).toBe('x');
  });

  test('message includes content snippet and id', async () => {
    const result = await releaseService.releaseSource({ id: baseSource.id });
    expect(result.message).toContain(baseSource.id);
    expect(result.message).toContain(baseSource.content.substring(0, 10));
  });
}); 