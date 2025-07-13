/**
 * Timeout utility for MCP operations
 * 
 * Provides a wrapper to add timeout functionality to async operations
 * to ensure the MCP server responds within reasonable time limits.
 */

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Wraps an async operation with a timeout
 * 
 * @param promise - The promise to wrap
 * @param timeoutMs - Timeout in milliseconds
 * @param operationName - Name of the operation for error messages
 * @returns The result of the promise or throws TimeoutError
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName: string
): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new TimeoutError(`${operationName} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}

/**
 * Default timeout values for different operations
 */
export const DEFAULT_TIMEOUTS = {
  CAPTURE: 30000,     // 30 seconds for capture (includes enrichment)
  SEARCH: 10000,      // 10 seconds for search
  UPDATE: 30000,      // 30 seconds for update (includes re-enrichment)
  RELEASE: 5000,      // 5 seconds for release
  EMBEDDING: 20000,   // 20 seconds for embedding generation
  ENRICHMENT: 25000   // 25 seconds for LLM enrichment
} as const;