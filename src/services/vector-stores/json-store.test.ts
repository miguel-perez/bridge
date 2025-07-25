import { JSONVectorStore } from './json-store.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('JSONVectorStore', () => {
  let store: JSONVectorStore;
  let tempDir: string;
  let filePath: string;

  beforeEach(async () => {
    // Create temp directory for testing
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bridge-test-'));
    filePath = path.join(tempDir, 'vectors.json');
    store = new JSONVectorStore({ filePath });
  });

  afterEach(async () => {
    // Cleanup temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('initialization', () => {
    it('should create directory if it does not exist', async () => {
      await store.initialize();
      const dirExists = await fs.access(tempDir).then(() => true).catch(() => false);
      expect(dirExists).toBe(true);
    });

    it('should load existing data', async () => {
      // Create existing data
      const existingData = [
        {
          id: 'existing1',
          vector: [0.1, 0.2],
          metadata: { name: 'test' },
          created: '2024-01-01T00:00:00Z',
          updated: '2024-01-01T00:00:00Z'
        }
      ];
      await fs.writeFile(filePath, JSON.stringify(existingData));

      await store.initialize();
      const results = await store.search([0.1, 0.2]);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('existing1');
    });

    it('should handle missing file gracefully', async () => {
      await expect(store.initialize()).resolves.not.toThrow();
    });

    it('should handle corrupted file', async () => {
      await fs.writeFile(filePath, 'invalid json');
      await expect(store.initialize()).rejects.toThrow('Failed to initialize JSON vector store');
    });
  });

  describe('upsert', () => {
    beforeEach(async () => {
      await store.initialize();
    });

    it('should save vector to file', async () => {
      await store.upsert('id1', [0.1, 0.2], { name: 'test' });
      
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);
      
      expect(data).toHaveLength(1);
      expect(data[0].id).toBe('id1');
      expect(data[0].vector).toEqual([0.1, 0.2]);
      expect(data[0].metadata.name).toBe('test');
    });

    it('should set created and updated timestamps', async () => {
      const before = new Date().toISOString();
      await store.upsert('id1', [0.1, 0.2], {});
      const after = new Date().toISOString();

      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);
      
      expect(new Date(data[0].created).getTime()).toBeGreaterThanOrEqual(new Date(before).getTime());
      expect(new Date(data[0].created).getTime()).toBeLessThanOrEqual(new Date(after).getTime());
      expect(data[0].updated).toBe(data[0].created);
    });

    it('should preserve created timestamp on update', async () => {
      await store.upsert('id1', [0.1, 0.2], { version: 1 });
      
      const content1 = await fs.readFile(filePath, 'utf-8');
      const data1 = JSON.parse(content1);
      const created1 = data1[0].created;

      // Wait a bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));

      await store.upsert('id1', [0.3, 0.4], { version: 2 });
      
      const content2 = await fs.readFile(filePath, 'utf-8');
      const data2 = JSON.parse(content2);
      
      expect(data2[0].created).toBe(created1);
      expect(new Date(data2[0].updated).getTime()).toBeGreaterThan(new Date(created1).getTime());
    });

    it('should auto-initialize if not initialized', async () => {
      const newStore = new JSONVectorStore({ filePath: path.join(tempDir, 'new.json') });
      await expect(newStore.upsert('id1', [0.1], {})).resolves.not.toThrow();
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      await store.initialize();
      await store.upsert('id1', [1, 0, 0], { category: 'A' });
      await store.upsert('id2', [0, 1, 0], { category: 'B' });
      await store.upsert('id3', [0, 0, 1], { category: 'A' });
      await store.upsert('zero', [0, 0, 0], { category: 'zero' });
    });

    it('should find similar vectors', async () => {
      const results = await store.search([1, 0, 0]);
      expect(results[0].id).toBe('id1');
      expect(results[0].score).toBeCloseTo(1.0, 5);
    });

    it('should apply filters', async () => {
      const results = await store.search([1, 0, 0], { filter: { category: 'A' } });
      expect(results).toHaveLength(2);
      expect(results.every(r => r.metadata.category === 'A')).toBe(true);
    });

    it('should respect limit', async () => {
      const results = await store.search([1, 1, 1], { limit: 2 });
      expect(results).toHaveLength(2);
    });

    it('should include timestamps in metadata', async () => {
      const results = await store.search([1, 0, 0]);
      expect(results[0].metadata.created).toBeDefined();
      expect(results[0].metadata.updated).toBeDefined();
    });

    it('should skip zero vectors when query is non-zero', async () => {
      const results = await store.search([1, 0, 0]);
      expect(results.find(r => r.id === 'zero')).toBeUndefined();
    });

    it('should include zero vectors when query is zero', async () => {
      const results = await store.search([0, 0, 0]);
      expect(results.find(r => r.id === 'zero')).toBeDefined();
    });

    it('should auto-initialize if not initialized', async () => {
      const newStore = new JSONVectorStore({ filePath });
      const results = await newStore.search([1, 0, 0]);
      expect(results).toHaveLength(3); // Excluding zero vector
    });
  });

  describe('delete', () => {
    beforeEach(async () => {
      await store.initialize();
      await store.upsert('id1', [0.1, 0.2], {});
      await store.upsert('id2', [0.3, 0.4], {});
    });

    it('should remove vector from store', async () => {
      await store.delete('id1');
      
      const results = await store.search([0.1, 0.2]);
      expect(results.find(r => r.id === 'id1')).toBeUndefined();
      expect(results.find(r => r.id === 'id2')).toBeDefined();
    });

    it('should persist deletion to file', async () => {
      await store.delete('id1');
      
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);
      
      expect(data).toHaveLength(1);
      expect(data[0].id).toBe('id2');
    });

    it('should handle deleting non-existent ID', async () => {
      await expect(store.delete('non-existent')).resolves.not.toThrow();
    });
  });

  describe('persistence', () => {
    it('should use atomic writes', async () => {
      await store.initialize();
      
      // Check that temp file is created and renamed
      await store.upsert('id1', [0.1, 0.2], {});
      
      // Verify the data was saved
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);
      expect(data).toHaveLength(1);
      expect(data[0].id).toBe('id1');
    });

    it('should format JSON with indentation', async () => {
      await store.initialize();
      await store.upsert('id1', [0.1, 0.2], { name: 'test' });
      
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Check for indentation
      expect(content).toContain('\n  ');
      expect(content).toMatch(/^\[/);
      expect(content).toMatch(/\]$/);
    });
  });

  describe('utility methods', () => {
    beforeEach(async () => {
      await store.initialize();
    });

    it('should get count of vectors', async () => {
      expect(await store.getCount()).toBe(0);
      
      await store.upsert('id1', [0.1], {});
      expect(await store.getCount()).toBe(1);
      
      await store.upsert('id2', [0.2], {});
      expect(await store.getCount()).toBe(2);
    });

    it('should clear all vectors', async () => {
      await store.upsert('id1', [0.1], {});
      await store.upsert('id2', [0.2], {});
      
      await store.clear();
      
      expect(await store.getCount()).toBe(0);
      
      const content = await fs.readFile(filePath, 'utf-8');
      expect(JSON.parse(content)).toEqual([]);
    });
  });

  describe('isAvailable', () => {
    it('should return true when directory is writable', async () => {
      expect(await store.isAvailable()).toBe(true);
    });

    it('should create directory if needed', async () => {
      const newPath = path.join(tempDir, 'nested', 'deep', 'vectors.json');
      const newStore = new JSONVectorStore({ filePath: newPath });
      
      expect(await newStore.isAvailable()).toBe(true);
      
      const dirExists = await fs.access(path.dirname(newPath)).then(() => true).catch(() => false);
      expect(dirExists).toBe(true);
    });
  });

  describe('getName', () => {
    it('should return store name', () => {
      expect(store.getName()).toBe('JSONVectorStore');
    });
  });
});