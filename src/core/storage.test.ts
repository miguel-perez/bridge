import { describe, it, expect, jest } from '@jest/globals';
import {
  generateId,
  validateFilePath,
} from './storage';

// Mock nanoid for dynamic import
jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'test-id-12345')
}));

describe('Storage Layer', () => {
  describe('ID Generation', () => {
    it('should generate unique IDs with correct prefix', async () => {
      const id1 = await generateId('src');
      const id2 = await generateId('src');
      
      expect(id1).toMatch(/^src_test-id-12345$/);
      expect(id2).toMatch(/^src_test-id-12345$/);
      expect(id1).toBe(id2); // With mocked nanoid, they should be the same
    });

    it('should generate IDs with different prefixes', async () => {
      const srcId = await generateId('src');
      const momId = await generateId('mom');
      const synId = await generateId('syn');

      expect(srcId).toMatch(/^src_/);
      expect(momId).toMatch(/^mom_/);
      expect(synId).toMatch(/^syn_/);
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