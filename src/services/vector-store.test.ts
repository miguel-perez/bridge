// Define the mocks at the top
const mockWriteFile = jest.fn();
const mockReadFile = jest.fn();

// Mock fs before anything else
jest.doMock('fs', () => ({
  promises: {
    writeFile: mockWriteFile,
    readFile: mockReadFile
  }
}));

import { describe, test, expect, beforeEach, jest } from '@jest/globals';

let VectorStoreClass;
let store;

beforeEach(async (): Promise<void> => {
  jest.resetModules();
  jest.clearAllMocks();
  (mockWriteFile as any).mockResolvedValue(undefined);
  (mockReadFile as any).mockResolvedValue('[]');

  // Force reload the module after resetting
  const mod = await import('./vector-store.js');
  VectorStoreClass = mod.VectorStore;
  store = new VectorStoreClass('dummy.json');
  await store.initialize();
});

const DUMMY_DIM = 384;
const makeVec = (val = 1, dim = DUMMY_DIM) => Array(dim).fill(val);

describe('VectorStore', () => {
  test('addVector and getVector', async () => {
    expect(store.addVector('a', makeVec(1))).toBe(true);
    expect(await store.getVector('a')).toEqual(makeVec(1));
  });

  test('addVector rejects wrong dimension', () => {
    expect(store.addVector('bad', [1, 2, 3])).toBe(false);
    expect(store.vectors.has('bad')).toBe(false);
  });

  test('addVectors adds and rejects appropriately', () => {
    const res = store.addVectors([
      { id: 'a', vector: makeVec(1) },
      { id: 'b', vector: [1, 2, 3] },
      { id: 'c', vector: makeVec(2) }
    ]);
    expect(res.added).toBe(2);
    expect(res.rejected).toBe(1);
    expect(store.vectors.has('a')).toBe(true);
    expect(store.vectors.has('c')).toBe(true);
    expect(store.vectors.has('b')).toBe(false);
  });

  test('removeVector deletes and saves', async () => {
    store.addVector('a', makeVec(1));
    await store.removeVector('a');
    await Promise.resolve();
    expect(store.vectors.has('a')).toBe(false);
    expect(mockWriteFile).toHaveBeenCalled();
  });

  test('findSimilar returns correct results', async () => {
    store.addVector('a', makeVec(1));
    store.addVector('b', makeVec(2));
    store.addVector('c', makeVec(0)); // Should be ignored (zero vector)
    const query = makeVec(1);
    const results = await store.findSimilar(query, 2, 0.5);
    expect(results.length).toBe(2);
    expect(results[0].similarity).toBeGreaterThanOrEqual(results[1].similarity);
    expect(results.map(r => r.id)).toContain('a');
    expect(results.map(r => r.id)).toContain('b');
  });

  test('findSimilarById throws if not found', async () => {
    await expect(store.findSimilarById('nope')).rejects.toThrow('Vector not found');
  });

  test('findSimilarById returns correct results', async () => {
    store.addVector('a', makeVec(1));
    store.addVector('b', makeVec(2));
    const results = await store.findSimilarById('a', 2, 0.5);
    expect(results.length).toBe(2);
    expect(results[0].id).toBe('a');
  });

  test('hasVector and getVectorCount', async () => {
    store.addVector('a', makeVec(1));
    expect(await store.hasVector('a')).toBe(true);
    expect(await store.getVectorCount()).toBe(1);
  });

  test('clear removes all and saves', async () => {
    store.addVector('a', makeVec(1));
    await store.clear();
    await Promise.resolve();
    expect(await store.getVectorCount()).toBe(0);
    expect(mockWriteFile).toHaveBeenCalled();
  });

  test('cosineSimilarity returns 0 for mismatched dims', () => {
    expect(store.cosineSimilarity([1, 2], [1])).toBe(0);
  });

  test('saveToDisk writes vectors', async () => {
    store.addVector('a', makeVec(1));
    await store.saveToDisk();
    await Promise.resolve();
    expect(mockWriteFile).toHaveBeenCalledWith(
      'dummy.json',
      expect.stringContaining('"id": "a"'),
      'utf8'
    );
  });

  test('saveToDisk throws on error', async () => {
    (mockWriteFile as any).mockRejectedValueOnce(new Error('fail'));
    store.addVector('a', makeVec(1));
    await expect(store.saveToDisk()).rejects.toThrow('Failed to save vectors to disk');
  });

  test('loadFromDisk loads valid vectors', async () => {
    const data = JSON.stringify([
      { id: 'a', vector: makeVec(1) },
      { id: 'b', vector: [1, 2, 3] } // invalid
    ]);
    (mockReadFile as any).mockResolvedValueOnce(data);
    await store.loadFromDisk();
    expect(store.vectors.has('a')).toBe(true);
    expect(store.vectors.has('b')).toBe(false);
  });

  test('loadFromDisk clears on error', async () => {
    store.addVector('a', makeVec(1));
    (mockReadFile as any).mockRejectedValueOnce(new Error('fail'));
    await store.loadFromDisk();
    expect(store.vectors.size).toBe(0);
  });

  test('initialize calls loadFromDisk', async () => {
    const spy = jest.spyOn(store, 'loadFromDisk');
    await store.initialize();
    expect(spy).toHaveBeenCalled();
  });

  test('validateVectors returns correct counts', async () => {
    store.addVector('a', makeVec(1));
    // Insert an invalid vector directly
    store.vectors.set('b', { id: 'b', vector: [1, 2, 3] });
    const res = await store.validateVectors(DUMMY_DIM);
    expect(res.valid).toBe(1);
    expect(res.invalid).toBe(1);
    expect(res.details[0]).toMatch(/Vector b/);
  });

  test('removeInvalidVectors removes and returns count', async () => {
    store.addVector('a', makeVec(1));
    // Insert an invalid vector directly
    store.vectors.set('b', { id: 'b', vector: [1, 2, 3] });
    const removed = await store.removeInvalidVectors(DUMMY_DIM);
    expect(removed).toBe(1);
    expect(store.vectors.has('b')).toBe(false);
  });

  test('cleanup removes invalid and saves', async () => {
    store.addVector('a', makeVec(1));
    // Insert an invalid vector directly
    store.vectors.set('b', { id: 'b', vector: [1, 2, 3] });
    expect(store.vectors.has('b')).toBe(true); // Ensure invalid vector is present
    const removed = await store.cleanup();
    await Promise.resolve();
    expect(removed).toBe(1);
    expect(store.vectors.has('b')).toBe(false); // Ensure invalid vector is removed
  });

  test('getHealthStats returns correct stats', () => {
    store.addVector('a', makeVec(1));
    // Insert an invalid vector directly
    store.vectors.set('b', { id: 'b', vector: [1, 2, 3] });
    const stats = store.getHealthStats();
    expect(stats.total).toBe(2);
    expect(stats.valid).toBe(1);
    expect(stats.invalid).toBe(1);
  });
}); 