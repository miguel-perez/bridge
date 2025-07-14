import { describe, it, expect, jest, beforeAll } from '@jest/globals';

// Need to mock before imports for dynamic imports
let generateId: any;
let validateFilePath: any;

beforeAll(async () => {
  // Mock nanoid module before importing storage
  jest.unstable_mockModule('nanoid', () => ({
    nanoid: jest.fn(() => 'test-id-12345')
  }));
  
  // Now import storage which will use the mocked nanoid
  const storage = await import('./storage');
  generateId = storage.generateId;
  validateFilePath = storage.validateFilePath;
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

  describe('Basic Functionality', () => {
    it('should have all required exports', () => {
      // Test that we can import the main functions
      expect(typeof generateId).toBe('function');
      expect(typeof validateFilePath).toBe('function');
    });
  });
}); 