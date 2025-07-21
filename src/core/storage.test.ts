import { describe, it, expect, jest, beforeAll, beforeEach, afterEach } from '@jest/globals';
import type { Source } from './types.js';

// Need to mock before imports for dynamic imports
let generateId: any;
let validateFilePath: any;
let saveSource: any;
let updateSource: any;
let getSource: any;
let getAllRecords: any;
let clearTestStorage: any;
let setupTestStorage: any;

beforeAll(async () => {
  // Mock nanoid module before importing storage
  jest.unstable_mockModule('nanoid', () => ({
    nanoid: jest.fn(() => 'test-id-12345')
  }));
  
  // Now import storage which will use the mocked nanoid
  const storage = await import('./storage');
  generateId = storage.generateId;
  validateFilePath = storage.validateFilePath;
  saveSource = storage.saveSource;
  updateSource = storage.updateSource;
  getSource = storage.getSource;
  getAllRecords = storage.getAllRecords;
  clearTestStorage = storage.clearTestStorage;
  setupTestStorage = storage.setupTestStorage;
});

beforeEach(() => {
  // Setup test storage for each test
  setupTestStorage('storage-test');
});

afterEach(async () => {
  // Clean up test storage after each test
  await clearTestStorage();
});

describe('Storage Layer', () => {
  describe('ID Generation', () => {
    it('should generate unique IDs with correct prefix', async () => {
      const id1 = await generateId('src');
      const id2 = await generateId('src');
      
      expect(id1).toMatch(/^src_test-id-/);
      expect(id2).toMatch(/^src_test-id-/);
      expect(id1).not.toBe(id2); // Should be different due to random suffix
    });

    it('should generate IDs with different prefixes', async () => {
      const srcId = await generateId('src');
      const momId = await generateId('mom');
      const synId = await generateId('syn');

      expect(srcId).toMatch(/^src_test-id-/);
      expect(momId).toMatch(/^mom_test-id-/);
      expect(synId).toMatch(/^syn_test-id-/);
    });
  });

  describe('File Path Validation', () => {
    it('should reject dangerous paths', async () => {
      expect(await validateFilePath('../../../etc/passwd')).toBe(false);
      expect(await validateFilePath('../../secrets.txt')).toBe(false);
      expect(await validateFilePath('../config.ini')).toBe(false);
    });

    it('should accept safe paths', async () => {
      expect(await validateFilePath('normal-file.txt')).toBe(true);
      expect(await validateFilePath('folder/file.txt')).toBe(true);
      expect(await validateFilePath('deep/folder/structure/file.md')).toBe(true);
    });

    it('should validate against allowed roots when provided', async () => {
      // When allowed roots are provided, only files within those roots should be allowed
      const allowedRoots = [process.cwd()]; // Use current working directory as allowed root
      
      expect(await validateFilePath('valid-file.txt', allowedRoots)).toBe(true);
      expect(await validateFilePath('../../../etc/passwd', allowedRoots)).toBe(false);
      
      // Test with empty allowed roots - should fall back to basic validation
      expect(await validateFilePath('safe-file.txt', [])).toBe(true);
      expect(await validateFilePath('../dangerous.txt', [])).toBe(false);
    });
  });

  describe('Source Operations with reflects Field', () => {
    it('should save source with reflects field', async () => {
      const sourceWithReflects: Source = {
        id: 'pattern-001',
        source: 'I notice I always feel anxious before things that end up going well',
        created: '2024-01-01T00:00:00.000Z',
        perspective: 'I',
        experiencer: 'test',
        processing: 'long-after',
        crafted: false,
        experience: ['embodied.sensing', 'mood.closed', 'time.future'],
        reflects: ['exp-001', 'exp-002', 'exp-003']
      };

      const savedSource = await saveSource(sourceWithReflects);
      expect(savedSource).toEqual(sourceWithReflects);
      expect(savedSource.reflects).toEqual(['exp-001', 'exp-002', 'exp-003']);
    });

    it('should save source without reflects field (backward compatibility)', async () => {
      const sourceWithoutReflects: Source = {
        id: 'exp-001',
        source: 'I felt anxious about the presentation',
        created: '2024-01-01T00:00:00.000Z',
        perspective: 'I',
        experiencer: 'test',
        processing: 'during',
        crafted: false,
        experience: ['embodied.sensing', 'mood.closed', 'time.future']
      };

      const savedSource = await saveSource(sourceWithoutReflects);
      expect(savedSource).toEqual(sourceWithoutReflects);
      expect(savedSource.reflects).toBeUndefined();
    });

    it('should update source with reflects field', async () => {
      // First save a source without reflects
      const originalSource: Source = {
        id: 'pattern-001',
        source: 'I notice a pattern',
        created: '2024-01-01T00:00:00.000Z',
        perspective: 'I',
        experiencer: 'test',
        processing: 'long-after',
        crafted: false,
        experience: ['embodied.thinking']
      };

      await saveSource(originalSource);

      // Now update it with reflects field
      const updatedSource: Source = {
        ...originalSource,
        reflects: ['exp-001', 'exp-002']
      };

      const result = await updateSource(updatedSource);
      expect(result.reflects).toEqual(['exp-001', 'exp-002']);
    });

    it('should retrieve source with reflects field', async () => {
      const sourceWithReflects: Source = {
        id: 'pattern-001',
        source: 'I notice I always feel anxious before things that end up going well',
        created: '2024-01-01T00:00:00.000Z',
        perspective: 'I',
        experiencer: 'test',
        processing: 'long-after',
        crafted: false,
        experience: ['embodied.sensing', 'mood.closed', 'time.future'],
        reflects: ['exp-001', 'exp-002', 'exp-003']
      };

      await saveSource(sourceWithReflects);
      const retrievedSource = await getSource('pattern-001');
      
      expect(retrievedSource).toEqual(sourceWithReflects);
      expect(retrievedSource?.reflects).toEqual(['exp-001', 'exp-002', 'exp-003']);
    });

    it('should retrieve all records including those with reflects field', async () => {
      const source1: Source = {
        id: 'exp-001',
        source: 'I felt anxious about the presentation',
        created: '2024-01-01T00:00:00.000Z',
        perspective: 'I',
        experiencer: 'test',
        processing: 'during',
        crafted: false,
        experience: ['embodied.sensing', 'mood.closed', 'time.future']
      };

      const source2: Source = {
        id: 'pattern-001',
        source: 'I notice I always feel anxious before things that end up going well',
        created: '2024-01-01T00:00:00.000Z',
        perspective: 'I',
        experiencer: 'test',
        processing: 'long-after',
        crafted: false,
        experience: ['embodied.sensing', 'mood.closed', 'time.future'],
        reflects: ['exp-001']
      };

      await saveSource(source1);
      await saveSource(source2);

      const allRecords = await getAllRecords();
      expect(allRecords).toHaveLength(2);
      
      const patternRecord = allRecords.find(r => r.id === 'pattern-001');
      expect(patternRecord?.reflects).toEqual(['exp-001']);
      
      const regularRecord = allRecords.find(r => r.id === 'exp-001');
      expect(regularRecord?.reflects).toBeUndefined();
    });

    it('should handle empty reflects array', async () => {
      const sourceWithEmptyReflects: Source = {
        id: 'pattern-001',
        source: 'I notice a pattern',
        created: '2024-01-01T00:00:00.000Z',
        perspective: 'I',
        experiencer: 'test',
        processing: 'long-after',
        crafted: false,
        experience: ['embodied.thinking'],
        reflects: []
      };

      const savedSource = await saveSource(sourceWithEmptyReflects);
      expect(savedSource.reflects).toEqual([]);
      
      const retrievedSource = await getSource('pattern-001');
      expect(retrievedSource?.reflects).toEqual([]);
    });
  });

  describe('Basic Functionality', () => {
    it('should have all required exports', () => {
      // Test that we can import the main functions
      expect(typeof generateId).toBe('function');
      expect(typeof validateFilePath).toBe('function');
      expect(typeof saveSource).toBe('function');
      expect(typeof updateSource).toBe('function');
      expect(typeof getSource).toBe('function');
      expect(typeof getAllRecords).toBe('function');
    });
  });
}); 