/**
 * Unified timeout utilities for Bridge operations
 *
 * Provides timeout management for all Bridge operations including MCP tools,
 * embeddings, and DXT requirements with retry and circuit breaker support.
 */

import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

/**
 * Timeout configurations for different operations (in milliseconds)
 */
export const TIMEOUTS = {
  // Tool operations (DXT requirements - shorter timeouts)
  TOOL_EXECUTION: 10000, // 10 seconds for tool execution
  TOOL_EXPERIENCE: 10000, // 10 seconds for experience capture
  TOOL_SEARCH: 8000, // 8 seconds for search operations
  TOOL_UPDATE: 10000, // 10 seconds for update operations
  TOOL_RELEASE: 5000, // 5 seconds for release operations

  // Service operations (can be longer)
  EMBEDDING_GENERATION: 45000, // 45 seconds for embedding generation
  LLM_ENRICHMENT: 60000, // 60 seconds for LLM enrichment
  FILE_OPERATION: 5000, // 5 seconds for file operations

  // Deprecated aliases for backward compatibility
  EXPERIENCE: 30000,
  SEARCH: 15000,
  UPDATE: 20000,
  RELEASE: 10000,
  EMBEDDING: 45000,
  FILE_IO: 5000,
} as const;

/**
 * Custom timeout error class
 */
export class TimeoutError extends Error {
  /**
   * Creates a new timeout error with operation details
   * @param operation - Name of the operation that timed out
   * @param timeoutMs - Timeout duration in milliseconds
   */
  constructor(operation: string, timeoutMs: number) {
    super(`Operation '${operation}' timed out after ${timeoutMs}ms`);
    this.name = 'TimeoutError';
  }
}

/**
 * Options for timeout operations
 */
export interface TimeoutOptions {
  timeoutMs: number;
  operation: string;
  addContext?: boolean;
}

/**
 * Wraps a promise with a timeout
 *
 * @param promise - Promise to wrap with timeout
 * @param options - Timeout options or milliseconds
 * @returns Promise that rejects with TimeoutError if timeout is exceeded
 */
export function withTimeout<T>(
  promise: Promise<T>,
  options: TimeoutOptions | number,
  operationName?: string
): Promise<T> {
  // Handle both old signatures for backward compatibility
  const opts: TimeoutOptions =
    typeof options === 'number'
      ? { timeoutMs: options, operation: operationName || 'operation' }
      : options;

  let timeoutHandle: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      const error = new TimeoutError(opts.operation, opts.timeoutMs);

      // Add context for DXT timeout errors
      if (opts.addContext) {
        error.message +=
          `. This may indicate: ` +
          `1) Slow embedding generation (try 'none' provider), ` +
          `2) Large dataset (consider limiting results), ` +
          `3) System resource constraints`;
      }

      reject(error);
    }, opts.timeoutMs);
  });

  return Promise.race([promise.finally(() => clearTimeout(timeoutHandle)), timeoutPromise]);
}

/**
 * Creates a timeout wrapper for a specific operation type
 *
 * @param operationType - Key from TIMEOUTS object
 * @param addContext - Whether to add DXT context to timeout errors
 * @returns Function wrapper that applies timeout
 */
export function createTimeoutWrapper(
  operationType: keyof typeof TIMEOUTS,
  addContext: boolean = false
): <T>(promise: Promise<T>, operationName?: string) => Promise<T> {
  return async function timeoutWrapper<T>(promise: Promise<T>, operationName?: string): Promise<T> {
    return withTimeout(promise, {
      timeoutMs: TIMEOUTS[operationType],
      operation: operationName || operationType.toLowerCase().replace(/_/g, ' '),
      addContext,
    });
  };
}

/**
 * Pre-configured timeout wrappers for common operations
 */
export const toolTimeout = createTimeoutWrapper('TOOL_EXECUTION', true);
export const embeddingTimeout = createTimeoutWrapper('EMBEDDING_GENERATION', true);
export const fileTimeout = createTimeoutWrapper('FILE_OPERATION', true);
export const searchTimeout = createTimeoutWrapper('TOOL_SEARCH', true);

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
  timeoutMs: number = TIMEOUTS.TOOL_EXECUTION,
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
        await new Promise((resolve) => setTimeout(resolve, delay));
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

  /**
   * Creates a new circuit breaker with failure thresholds and timeouts
   * @param failureThreshold - Number of failures before opening circuit
   * @param timeoutMs - Timeout for individual operations
   * @param resetTimeoutMs - Time to wait before attempting reset
   */
  constructor(
    private readonly failureThreshold: number = 5,
    private readonly timeoutMs: number = 60000, // 1 minute
    private readonly resetTimeoutMs: number = 300000 // 5 minutes
  ) {}

  /**
   * Executes operation with circuit breaker protection
   */
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

  /**
   * Gets current circuit breaker state
   */
  getState(): { state: string; failures: number; lastFailTime: number } {
    return {
      state: this.state,
      failures: this.failures,
      lastFailTime: this.lastFailTime,
    };
  }
}

// Re-export legacy names for backward compatibility
export const DEFAULT_TIMEOUTS = TIMEOUTS;
export const DXT_TIMEOUTS = {
  TOOL_EXECUTION: TIMEOUTS.TOOL_EXECUTION,
  EMBEDDING_GENERATION: TIMEOUTS.EMBEDDING_GENERATION,
  FILE_OPERATION: TIMEOUTS.FILE_OPERATION,
  SEARCH_OPERATION: TIMEOUTS.TOOL_SEARCH,
};
