/**
 * Tests for Security Utilities
 */

import {
  MAX_INPUT_LENGTHS,
  sanitizeUserInput,
  validateFileAccess,
  expandPath,
  validateNumericRange,
  RateLimiter,
  validateArraySize,
  validatePerspective,
  validateExperiencer
} from './security.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

// Mock fs module
jest.mock('fs');

describe('Security Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('MAX_INPUT_LENGTHS', () => {
    it('should have correct length limits', () => {
      expect(MAX_INPUT_LENGTHS.SOURCE_TEXT).toBe(10000);
      expect(MAX_INPUT_LENGTHS.NARRATIVE).toBe(200);
      expect(MAX_INPUT_LENGTHS.MANIFESTATION).toBe(500);
      expect(MAX_INPUT_LENGTHS.EXPERIENCER).toBe(100);
      expect(MAX_INPUT_LENGTHS.PERSPECTIVE).toBe(50);
      expect(MAX_INPUT_LENGTHS.SEARCH_QUERY).toBe(1000);
    });
  });

  describe('sanitizeUserInput', () => {
    it('should sanitize script tags', () => {
      const input = 'Hello <script>alert("xss")</script> World';
      const result = sanitizeUserInput(input);
      expect(result).toBe('Hello  World');
    });

    it('should sanitize nested script tags', () => {
      const input = 'Hello <script><script>alert("xss")</script></script> World';
      const result = sanitizeUserInput(input);
      // The regex removes the outer script tags, leaving the inner </script>
      expect(result).toBe('Hello </script> World');
    });

    it('should sanitize javascript: protocol', () => {
      const input = 'Click <a href="javascript:alert(1)">here</a>';
      const result = sanitizeUserInput(input);
      expect(result).toBe('Click <a href="alert(1)">here</a>');
    });

    it('should sanitize data:text/html', () => {
      const input = '<a href="data:text/html,<script>alert(1)</script>">link</a>';
      const result = sanitizeUserInput(input);
      // The data:text/html is removed, then script tags are removed
      expect(result).toBe('<a href=",">link</a>');
    });

    it('should sanitize vbscript: protocol', () => {
      const input = '<a href="vbscript:msgbox(1)">link</a>';
      const result = sanitizeUserInput(input);
      expect(result).toBe('<a href="msgbox(1)">link</a>');
    });

    it('should trim whitespace', () => {
      const input = '  \n\t Hello World  \n\t ';
      const result = sanitizeUserInput(input);
      expect(result).toBe('Hello World');
    });

    it('should throw error for non-string input', () => {
      expect(() => sanitizeUserInput(123 as unknown as string))
        .toThrow(new McpError(ErrorCode.InvalidParams, 'Input must be a string'));
    });

    it('should throw error for input exceeding max length', () => {
      const longInput = 'a'.repeat(101);
      expect(() => sanitizeUserInput(longInput, 100))
        .toThrow(new McpError(
          ErrorCode.InvalidParams,
          'Input exceeds maximum length of 100 characters (got 101)'
        ));
    });

    it('should use default max length', () => {
      const longInput = 'a'.repeat(10001);
      expect(() => sanitizeUserInput(longInput))
        .toThrow(new McpError(
          ErrorCode.InvalidParams,
          'Input exceeds maximum length of 10000 characters (got 10001)'
        ));
    });

    it('should handle case-insensitive protocol matching', () => {
      const input = 'Test JAVASCRIPT:alert(1) and JaVaScRiPt:alert(2)';
      const result = sanitizeUserInput(input);
      expect(result).toBe('Test alert(1) and alert(2)');
    });
  });

  describe('validateFileAccess', () => {
    const userHome = os.homedir();
    
    beforeEach(() => {
      (fs.accessSync as jest.Mock).mockImplementation(() => {});
    });

    it('should allow access to files in home directory', () => {
      const filePath = path.join(userHome, 'test.txt');
      expect(() => validateFileAccess(filePath)).not.toThrow();
    });

    it('should allow access to subdirectories of home', () => {
      const filePath = path.join(userHome, 'documents', 'test.txt');
      expect(() => validateFileAccess(filePath)).not.toThrow();
    });

    it('should expand tilde paths', () => {
      expect(() => validateFileAccess('~/test.txt')).not.toThrow();
    });

    it('should throw error for empty path', () => {
      expect(() => validateFileAccess(''))
        .toThrow(new McpError(ErrorCode.InvalidParams, 'File path is required'));
    });

    it('should throw error for non-string path', () => {
      expect(() => validateFileAccess(null as unknown as string))
        .toThrow(new McpError(ErrorCode.InvalidParams, 'File path is required'));
    });

    it('should throw error for path traversal with ..', () => {
      expect(() => validateFileAccess('../etc/passwd'))
        .toThrow(new McpError(
          ErrorCode.InvalidRequest,
          'Path traversal not allowed: file paths cannot contain ".."'
        ));
    });

    it('should throw error for path traversal with ~/../', () => {
      expect(() => validateFileAccess('~/../etc/passwd'))
        .toThrow(new McpError(
          ErrorCode.InvalidRequest,
          'Path traversal not allowed: file paths cannot contain ".."'
        ));
    });

    it('should throw error for paths outside home directory', () => {
      expect(() => validateFileAccess('/etc/passwd'))
        .toThrow(new McpError(
          ErrorCode.InvalidRequest,
          'File access restricted to user home directory and subdirectories'
        ));
    });

    it('should throw error when directory is not accessible', () => {
      (fs.accessSync as jest.Mock).mockImplementation(() => {
        throw new Error('Access denied');
      });

      const filePath = path.join(userHome, 'test.txt');
      expect(() => validateFileAccess(filePath))
        .toThrow(new McpError(
          ErrorCode.InvalidRequest,
          `Directory not accessible: ${userHome}`
        ));
    });

    it('should handle whitespace-only paths', () => {
      expect(() => validateFileAccess('   \t\n   '))
        .toThrow(new McpError(ErrorCode.InvalidParams, 'File path is required'));
    });
  });

  describe('expandPath', () => {
    const userHome = os.homedir();

    it('should expand ~ to home directory', () => {
      expect(expandPath('~')).toBe(userHome);
    });

    it('should expand ~/ to home directory', () => {
      expect(expandPath('~/test.txt')).toBe(path.join(userHome, 'test.txt'));
    });

    it('should expand ~/subdirectory paths', () => {
      expect(expandPath('~/documents/file.txt'))
        .toBe(path.join(userHome, 'documents', 'file.txt'));
    });

    it('should not expand paths without leading ~', () => {
      expect(expandPath('/absolute/path')).toBe('/absolute/path');
      expect(expandPath('relative/path')).toBe('relative/path');
      expect(expandPath('./current/path')).toBe('./current/path');
    });

    it('should not expand ~ in middle of path', () => {
      expect(expandPath('/path/with/~/inside')).toBe('/path/with/~/inside');
    });
  });

  describe('validateNumericRange', () => {
    it('should accept valid numbers within range', () => {
      expect(() => validateNumericRange(5, 0, 10, 'test')).not.toThrow();
      expect(() => validateNumericRange(0, 0, 10, 'test')).not.toThrow();
      expect(() => validateNumericRange(10, 0, 10, 'test')).not.toThrow();
    });

    it('should throw error for non-numeric values', () => {
      expect(() => validateNumericRange('5' as unknown as number, 0, 10, 'test'))
        .toThrow(new McpError(ErrorCode.InvalidParams, 'test must be a valid number'));
    });

    it('should throw error for NaN', () => {
      expect(() => validateNumericRange(NaN, 0, 10, 'test'))
        .toThrow(new McpError(ErrorCode.InvalidParams, 'test must be a valid number'));
    });

    it('should throw error for values below minimum', () => {
      expect(() => validateNumericRange(-1, 0, 10, 'test'))
        .toThrow(new McpError(
          ErrorCode.InvalidParams,
          'test must be between 0 and 10 (got -1)'
        ));
    });

    it('should throw error for values above maximum', () => {
      expect(() => validateNumericRange(11, 0, 10, 'test'))
        .toThrow(new McpError(
          ErrorCode.InvalidParams,
          'test must be between 0 and 10 (got 11)'
        ));
    });

    it('should handle decimal values', () => {
      expect(() => validateNumericRange(5.5, 0, 10, 'test')).not.toThrow();
      expect(() => validateNumericRange(10.1, 0, 10, 'test'))
        .toThrow(new McpError(
          ErrorCode.InvalidParams,
          'test must be between 0 and 10 (got 10.1)'
        ));
    });
  });

  describe('RateLimiter', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should execute operation immediately on first call', async () => {
      const limiter = new RateLimiter(100);
      const operation = jest.fn().mockResolvedValue('result');
      
      const result = await limiter.enforce(operation);
      
      expect(result).toBe('result');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should delay subsequent operations', async () => {
      const limiter = new RateLimiter(100);
      const operation1 = jest.fn().mockResolvedValue('result1');
      const operation2 = jest.fn().mockResolvedValue('result2');
      
      // First operation executes immediately
      await limiter.enforce(operation1);
      
      // Start second operation
      const promise = limiter.enforce(operation2);
      
      // Operation shouldn't execute yet
      expect(operation2).not.toHaveBeenCalled();
      
      // Advance time
      jest.advanceTimersByTime(100);
      
      // Now it should execute
      const result = await promise;
      expect(result).toBe('result2');
      expect(operation2).toHaveBeenCalledTimes(1);
    });

    it('should not delay if enough time has passed', async () => {
      const limiter = new RateLimiter(100);
      const operation1 = jest.fn().mockResolvedValue('result1');
      const operation2 = jest.fn().mockResolvedValue('result2');
      
      await limiter.enforce(operation1);
      
      // Advance time past the interval
      jest.advanceTimersByTime(150);
      
      // Second operation should execute immediately
      const result = await limiter.enforce(operation2);
      expect(result).toBe('result2');
      expect(operation2).toHaveBeenCalledTimes(1);
    });

    it('should use default interval of 100ms', async () => {
      const limiter = new RateLimiter();
      const operation1 = jest.fn().mockResolvedValue('result1');
      const operation2 = jest.fn().mockResolvedValue('result2');
      
      await limiter.enforce(operation1);
      
      const promise = limiter.enforce(operation2);
      expect(operation2).not.toHaveBeenCalled();
      
      jest.advanceTimersByTime(100);
      await promise;
      
      expect(operation2).toHaveBeenCalledTimes(1);
    });

    it('should handle operation errors', async () => {
      const limiter = new RateLimiter(100);
      const error = new Error('Operation failed');
      const operation = jest.fn().mockRejectedValue(error);
      
      await expect(limiter.enforce(operation)).rejects.toThrow(error);
    });

    it('should calculate correct delay', async () => {
      const limiter = new RateLimiter(100);
      const operation1 = jest.fn().mockResolvedValue('result1');
      const operation2 = jest.fn().mockResolvedValue('result2');
      
      await limiter.enforce(operation1);
      
      // Advance time partially
      jest.advanceTimersByTime(30);
      
      const promise = limiter.enforce(operation2);
      
      // Should wait remaining 70ms
      jest.advanceTimersByTime(69);
      expect(operation2).not.toHaveBeenCalled();
      
      jest.advanceTimersByTime(1);
      await promise;
      expect(operation2).toHaveBeenCalledTimes(1);
    });
  });

  describe('validateArraySize', () => {
    it('should accept valid arrays within size limit', () => {
      expect(() => validateArraySize([1, 2, 3], 5, 'test')).not.toThrow();
      expect(() => validateArraySize([], 5, 'test')).not.toThrow();
      expect(() => validateArraySize([1, 2, 3, 4, 5], 5, 'test')).not.toThrow();
    });

    it('should throw error for non-array input', () => {
      expect(() => validateArraySize('not an array' as unknown as unknown[], 5, 'test'))
        .toThrow(new McpError(ErrorCode.InvalidParams, 'test must be an array'));
    });

    it('should throw error for arrays exceeding size limit', () => {
      expect(() => validateArraySize([1, 2, 3, 4, 5, 6], 5, 'test'))
        .toThrow(new McpError(
          ErrorCode.InvalidParams,
          'test exceeds maximum length of 5 items (got 6)'
        ));
    });

    it('should work with different array types', () => {
      expect(() => validateArraySize(['a', 'b', 'c'], 5, 'strings')).not.toThrow();
      expect(() => validateArraySize([{}, {}, {}], 5, 'objects')).not.toThrow();
      expect(() => validateArraySize([true, false], 5, 'booleans')).not.toThrow();
    });
  });

  describe('validatePerspective', () => {
    it('should return undefined for falsy input', () => {
      expect(validatePerspective(undefined)).toBeUndefined();
      expect(validatePerspective('')).toBeUndefined();
      expect(validatePerspective(null as unknown as string)).toBeUndefined();
    });

    it('should sanitize and return valid perspective', () => {
      expect(validatePerspective('I')).toBe('I');
      expect(validatePerspective('we')).toBe('we');
      expect(validatePerspective('they')).toBe('they');
    });

    it('should sanitize malicious input', () => {
      expect(validatePerspective('<script>alert(1)</script>I')).toBe('I');
    });

    it('should throw error for empty perspective after sanitization', () => {
      expect(() => validatePerspective('   '))
        .toThrow(new McpError(ErrorCode.InvalidParams, 'Perspective cannot be empty'));
    });

    it('should respect perspective length limit', () => {
      const longPerspective = 'a'.repeat(51);
      expect(() => validatePerspective(longPerspective))
        .toThrow(new McpError(
          ErrorCode.InvalidParams,
          'Input exceeds maximum length of 50 characters (got 51)'
        ));
    });

    it('should trim whitespace', () => {
      expect(validatePerspective('  I  ')).toBe('I');
    });
  });

  describe('validateExperiencer', () => {
    it('should return undefined for falsy input', () => {
      expect(validateExperiencer(undefined)).toBeUndefined();
      expect(validateExperiencer('')).toBeUndefined();
      expect(validateExperiencer(null as unknown as string)).toBeUndefined();
    });

    it('should sanitize and return valid experiencer', () => {
      expect(validateExperiencer('Alice')).toBe('Alice');
      expect(validateExperiencer('Bob Smith')).toBe('Bob Smith');
      expect(validateExperiencer('Team Alpha')).toBe('Team Alpha');
    });

    it('should sanitize malicious input', () => {
      expect(validateExperiencer('Alice<script>alert(1)</script>')).toBe('Alice');
    });

    it('should throw error for empty experiencer after sanitization', () => {
      expect(() => validateExperiencer('   '))
        .toThrow(new McpError(ErrorCode.InvalidParams, 'Experiencer cannot be empty'));
    });

    it('should respect experiencer length limit', () => {
      const longExperiencer = 'a'.repeat(101);
      expect(() => validateExperiencer(longExperiencer))
        .toThrow(new McpError(
          ErrorCode.InvalidParams,
          'Input exceeds maximum length of 100 characters (got 101)'
        ));
    });

    it('should trim whitespace', () => {
      expect(validateExperiencer('  Alice  ')).toBe('Alice');
    });
  });
});