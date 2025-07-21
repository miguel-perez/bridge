/**
 * Security utilities for Bridge DXT
 * 
 * Provides input validation, sanitization, and security measures
 * to ensure safe operation as a local MCP server.
 */

import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

/**
 * Maximum input lengths to prevent resource exhaustion
 */
export const MAX_INPUT_LENGTHS = {
  SOURCE_TEXT: 10000,
  NARRATIVE: 200,
  MANIFESTATION: 500,
  EXPERIENCER: 100,
  PERSPECTIVE: 50,
  SEARCH_QUERY: 1000
} as const;

/**
 * Sanitizes user input to remove potentially harmful content
 * 
 * @param input - Raw user input
 * @param maxLength - Maximum allowed length
 * @returns Sanitized input
 */
export function sanitizeUserInput(input: string, maxLength: number = MAX_INPUT_LENGTHS.SOURCE_TEXT): string {
  if (typeof input !== 'string') {
    throw new McpError(ErrorCode.InvalidParams, 'Input must be a string');
  }
  
  // Remove script tags and javascript: protocols to prevent injection
  let sanitized = input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/data:text\/html/gi, '')
    .replace(/vbscript:/gi, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  // Enforce length limits
  if (sanitized.length > maxLength) {
    throw new McpError(
      ErrorCode.InvalidParams, 
      `Input exceeds maximum length of ${maxLength} characters (got ${sanitized.length})`
    );
  }
  
  return sanitized;
}

/**
 * Validates file access permissions and prevents path traversal attacks
 * 
 * @param filePath - File path to validate
 * @throws McpError If file path is invalid or unsafe
 */
export function validateFileAccess(filePath: string): void {
  if (typeof filePath !== 'string' || !filePath.trim()) {
    throw new McpError(ErrorCode.InvalidParams, 'File path is required');
  }
  
  const userHome = os.homedir();
  const resolved = path.resolve(expandPath(filePath));
  
  // Prevent path traversal attacks
  if (filePath.includes('..') || filePath.includes('~/../')) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      'Path traversal not allowed: file paths cannot contain ".."'
    );
  }
  
  // Restrict access to user home directory and subdirectories
  if (!resolved.startsWith(userHome)) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      'File access restricted to user home directory and subdirectories'
    );
  }
  
  // Validate directory is accessible
  const dir = path.dirname(resolved);
  try {
    fs.accessSync(dir, fs.constants.F_OK);
  } catch (error) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      `Directory not accessible: ${dir}`
    );
  }
}

/**
 * Expands tilde (~) in file paths to user home directory
 * 
 * @param filePath - Path that may contain ~
 * @returns Expanded path
 */
export function expandPath(filePath: string): string {
  if (filePath.startsWith('~/') || filePath === '~') {
    return path.join(os.homedir(), filePath.slice(2));
  }
  return filePath;
}

/**
 * Validates that a numeric input is within acceptable range
 * 
 * @param value - Numeric value to validate
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @param fieldName - Name of the field for error messages
 */
export function validateNumericRange(
  value: number, 
  min: number, 
  max: number, 
  fieldName: string
): void {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new McpError(ErrorCode.InvalidParams, `${fieldName} must be a valid number`);
  }
  
  if (value < min || value > max) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `${fieldName} must be between ${min} and ${max} (got ${value})`
    );
  }
}

/**
 * Rate limiting utility to prevent resource exhaustion
 */
export class RateLimiter {
  private lastRequest = 0;
  private readonly minInterval: number;
  
  /**
   * Creates a new RateLimiter instance
   * @remarks
   * Configures rate limiting with minimum interval between requests.
   * @param minIntervalMs - Minimum time between requests in milliseconds
   */
  constructor(minIntervalMs: number = 100) {
    this.minInterval = minIntervalMs;
  }
  
  /**
   * Enforces rate limiting with optional delay
   * 
   * @param operation - Operation to rate limit
   * @returns Promise that resolves after any necessary delay
   */
  async enforce<T>(operation: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;
    
    if (timeSinceLastRequest < this.minInterval) {
      const delay = this.minInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequest = Date.now();
    return await operation();
  }
}

/**
 * Validates array inputs have reasonable sizes
 * 
 * @param array - Array to validate
 * @param maxLength - Maximum allowed length
 * @param fieldName - Name of the field for error messages
 */
export function validateArraySize<T>(
  array: T[], 
  maxLength: number, 
  fieldName: string
): void {
  if (!Array.isArray(array)) {
    throw new McpError(ErrorCode.InvalidParams, `${fieldName} must be an array`);
  }
  
  if (array.length > maxLength) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `${fieldName} exceeds maximum length of ${maxLength} items (got ${array.length})`
    );
  }
}

/**
 * Validates that a string is a valid perspective value
 * 
 * @param perspective - Perspective value to validate
 * @returns Sanitized perspective
 */
export function validatePerspective(perspective?: string): string | undefined {
  if (!perspective) return undefined;
  
  const sanitized = sanitizeUserInput(perspective, MAX_INPUT_LENGTHS.PERSPECTIVE);
  
  // Basic validation - allow flexibility but prevent obviously malicious input
  if (sanitized.length === 0) {
    throw new McpError(ErrorCode.InvalidParams, 'Perspective cannot be empty');
  }
  
  return sanitized;
}

/**
 * Validates experiencer name
 * 
 * @param experiencer - Experiencer name to validate
 * @returns Sanitized experiencer name
 */
export function validateExperiencer(experiencer?: string): string | undefined {
  if (!experiencer) return undefined;
  
  const sanitized = sanitizeUserInput(experiencer, MAX_INPUT_LENGTHS.EXPERIENCER);
  
  if (sanitized.length === 0) {
    throw new McpError(ErrorCode.InvalidParams, 'Experiencer cannot be empty');
  }
  
  return sanitized;
}