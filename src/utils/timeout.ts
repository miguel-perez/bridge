/**
 * Timeout utilities for Bridge DXT operations
 * 
 * Provides timeout management for MCP tool operations to ensure
 * responsive user experience and prevent resource exhaustion.
 */

import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

/**
 * Default timeout values for different operations (in milliseconds)
 */
export const DEFAULT_TIMEOUTS = {
  REMEMBER: 30000,     // 30 seconds for experience remember
  SEARCH: 15000,      // 15 seconds for search operations  
  UPDATE: 20000,      // 20 seconds for update operations
  RELEASE: 10000,     // 10 seconds for release operations
  EMBEDDING: 45000,   // 45 seconds for embedding generation
  LLM_ENRICHMENT: 60000, // 60 seconds for LLM enrichment
  FILE_IO: 5000       // 5 seconds for file operations
} as const;

/**
 * Custom timeout error class
 */
export class TimeoutError extends Error {
  constructor(operation: string, timeoutMs: number) {
    super(`Operation '${operation}' timed out after ${timeoutMs}ms`);
    this.name = 'TimeoutError';
  }
}

/**
 * Wraps a promise with a timeout
 * 
 * @param promise - Promise to wrap with timeout
 * @param timeoutMs - Timeout in milliseconds
 * @param operationName - Name of the operation for error messages
 * @returns Promise that rejects with TimeoutError if timeout is exceeded
 */
export function withTimeout<T>(
  promise: Promise<T>, 
  timeoutMs: number, 
  operationName: string
): Promise<T> {
  let timeoutHandle: NodeJS.Timeout;
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new TimeoutError(operationName, timeoutMs));
    }, timeoutMs);
  });
  
  return Promise.race([
    promise.finally(() => clearTimeout(timeoutHandle)),
    timeoutPromise
  ]);
}

/**
 * Creates a timeout-aware wrapper for async functions
 * 
 * @param timeoutMs - Default timeout in milliseconds
 * @param operationName - Name of the operation for error messages
 * @returns Function wrapper that applies timeout
 */
export function createTimeoutWrapper<TArgs extends any[], TReturn>(
  timeoutMs: number,
  operationName: string
) {
  return function<T extends (...args: TArgs) => Promise<TReturn>>(
    fn: T
  ): (...args: TArgs) => Promise<TReturn> {
    return async (...args: TArgs): Promise<TReturn> => {
      return withTimeout(fn(...args), timeoutMs, operationName);
    };
  };
}

/**
 * Retry wrapper with exponential backoff and timeout
 * 
 * @param operation - Operation to retry
 * @param maxAttempts - Maximum number of retry attempts
 * @param baseDelayMs - Base delay between retries in milliseconds
 * @param maxDelayMs - Maximum delay between retries
 * @param timeoutMs - Timeout for each individual attempt
 * @param operationName - Name of the operation for error messages
 * @returns Promise that resolves with the operation result or rejects after all retries fail
 */
export async function withRetryAndTimeout<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelayMs: number = 1000,
  maxDelayMs: number = 10000,
  timeoutMs: number = DEFAULT_TIMEOUTS.REMEMBER,
  operationName: string = 'operation'
): Promise<T> {
  let lastError: Error = new Error('No attempts made');
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await withTimeout(operation(), timeoutMs, `${operationName} (attempt ${attempt})`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on certain types of errors
      if (error instanceof McpError) {
        if (error.code === ErrorCode.InvalidParams || error.code === ErrorCode.InvalidRequest) {
          throw error; // Don't retry validation errors
        }
      }
      
      if (error instanceof TimeoutError && attempt === maxAttempts) {
        throw new McpError(
          ErrorCode.InternalError,
          `${operationName} failed after ${maxAttempts} attempts: ${error.message}`
        );
      }
      
      // Calculate delay with exponential backoff
      if (attempt < maxAttempts) {
        const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new McpError(
    ErrorCode.InternalError,
    `${operationName} failed after ${maxAttempts} attempts. Last error: ${lastError.message}`
  );
}

/**
 * Circuit breaker pattern implementation for external service calls
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  constructor(
    private readonly failureThreshold: number = 5,
    private readonly timeoutMs: number = 60000, // 1 minute
    private readonly resetTimeoutMs: number = 300000 // 5 minutes
  ) {}
  
  async execute<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
    if (this.state === 'open') {
      const timeSinceLastFail = Date.now() - this.lastFailTime;
      if (timeSinceLastFail >= this.resetTimeoutMs) {
        this.state = 'half-open';
      } else {
        throw new McpError(
          ErrorCode.InternalError,
          `${operationName} circuit breaker is open. Service temporarily unavailable.`
        );
      }
    }
    
    try {
      const result = await withTimeout(operation(), this.timeoutMs, operationName);
      
      if (this.state === 'half-open') {
        this.reset();
      }
      
      return result;
    } catch (error) {
      this.recordFailure();
      
      if (error instanceof TimeoutError) {
        throw new McpError(
          ErrorCode.InternalError,
          `${operationName} timed out after ${this.timeoutMs}ms`
        );
      }
      
      throw error;
    }
  }
  
  private recordFailure(): void {
    this.failures++;
    this.lastFailTime = Date.now();
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'open';
    }
  }
  
  private reset(): void {
    this.failures = 0;
    this.state = 'closed';
    this.lastFailTime = 0;
  }
  
  getState(): { state: string; failures: number; lastFailTime: number } {
    return {
      state: this.state,
      failures: this.failures,
      lastFailTime: this.lastFailTime
    };
  }
}