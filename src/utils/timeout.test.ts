/**
 * Tests for Timeout Utilities
 */

import { 
  DEFAULT_TIMEOUTS, 
  TimeoutError, 
  withTimeout, 
  createTimeoutWrapper,
  withRetryAndTimeout,
  CircuitBreaker
} from './timeout.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

// Helper to create a delayed promise
const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

describe('Timeout Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('DEFAULT_TIMEOUTS', () => {
    it('should have correct timeout values', () => {
      expect(DEFAULT_TIMEOUTS.EXPERIENCE).toBe(30000);
      expect(DEFAULT_TIMEOUTS.SEARCH).toBe(15000);
      expect(DEFAULT_TIMEOUTS.UPDATE).toBe(20000);
      expect(DEFAULT_TIMEOUTS.RELEASE).toBe(10000);
      expect(DEFAULT_TIMEOUTS.EMBEDDING).toBe(45000);
      expect(DEFAULT_TIMEOUTS.LLM_ENRICHMENT).toBe(60000);
      expect(DEFAULT_TIMEOUTS.FILE_IO).toBe(5000);
    });
  });

  describe('TimeoutError', () => {
    it('should create error with correct message', () => {
      const error = new TimeoutError('test operation', 5000);
      expect(error.message).toBe("Operation 'test operation' timed out after 5000ms");
      expect(error.name).toBe('TimeoutError');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('withTimeout', () => {
    it('should resolve when promise completes before timeout', async () => {
      const promise = delay(50).then(() => 'success');
      const result = await withTimeout(promise, 100, 'test');
      expect(result).toBe('success');
    });

    it('should reject with TimeoutError when timeout is exceeded', async () => {
      const promise = delay(200).then(() => 'success');
      
      await expect(withTimeout(promise, 50, 'test operation'))
        .rejects.toThrow(new TimeoutError('test operation', 50));
    });

    it('should clear timeout when promise resolves', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      
      const promise = Promise.resolve('quick');
      await withTimeout(promise, 1000, 'test');
      
      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('should clear timeout when promise rejects', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      
      const promise = Promise.reject(new Error('fail'));
      
      try {
        await withTimeout(promise, 1000, 'test');
      } catch {
        // Expected to throw
      }
      
      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('should propagate promise rejection', async () => {
      const error = new Error('Original error');
      const promise = Promise.reject(error);
      
      await expect(withTimeout(promise, 1000, 'test'))
        .rejects.toThrow(error);
    });
  });

  describe('createTimeoutWrapper', () => {
    it('should wrap async function with timeout', async () => {
      const asyncFn = async (value: string): Promise<string> => {
        await delay(50);
        return `result: ${value}`;
      };
      
      const wrappedFn = createTimeoutWrapper<[string], string>(100, 'wrapped test')(asyncFn);
      
      const result = await wrappedFn('test');
      expect(result).toBe('result: test');
    });

    it('should timeout wrapped function', async () => {
      const asyncFn = async (value: string): Promise<string> => {
        await delay(200);
        return `result: ${value}`;
      };
      
      const wrappedFn = createTimeoutWrapper<[string], string>(50, 'wrapped test')(asyncFn);
      
      await expect(wrappedFn('test'))
        .rejects.toThrow(new TimeoutError('wrapped test', 50));
    });

    it('should handle multiple arguments', async () => {
      const asyncFn = async (a: number, b: number): Promise<number> => {
        await delay(10);
        return a + b;
      };
      
      const wrappedFn = createTimeoutWrapper<[number, number], number>(100, 'add')(asyncFn);
      
      const result = await wrappedFn(5, 3);
      expect(result).toBe(8);
    });
  });

  describe('withRetryAndTimeout', () => {
    it('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      const result = await withRetryAndTimeout(
        operation,
        3,
        100,
        1000,
        500,
        'test operation'
      );
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and succeed', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success');
      
      const result = await withRetryAndTimeout(
        operation,
        3,
        10, // Short delay for testing
        100,
        500,
        'test operation'
      );
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should fail after max attempts', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Always fails'));
      
      await expect(withRetryAndTimeout(
        operation,
        3,
        10,
        100,
        500,
        'test operation'
      )).rejects.toThrow(McpError);
      
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should not retry on validation errors', async () => {
      const validationError = new McpError(ErrorCode.InvalidParams, 'Invalid input');
      const operation = jest.fn().mockRejectedValue(validationError);
      
      await expect(withRetryAndTimeout(
        operation,
        3,
        10,
        100,
        500,
        'test operation'
      )).rejects.toThrow(validationError);
      
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should not retry on invalid request errors', async () => {
      const invalidError = new McpError(ErrorCode.InvalidRequest, 'Bad request');
      const operation = jest.fn().mockRejectedValue(invalidError);
      
      await expect(withRetryAndTimeout(
        operation,
        3,
        10,
        100,
        500,
        'test operation'
      )).rejects.toThrow(invalidError);
      
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should handle timeout errors specially on last attempt', async () => {
      const operation = jest.fn().mockImplementation(async () => {
        await delay(200);
        return 'too slow';
      });
      
      await expect(withRetryAndTimeout(
        operation,
        2,
        10,
        100,
        50, // Very short timeout
        'test operation'
      )).rejects.toThrow(/test operation failed after 2 attempts: Operation 'test operation/);
      
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should apply exponential backoff', async () => {
      jest.useFakeTimers();
      
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success');
      
      const promise = withRetryAndTimeout(
        operation,
        3,
        100, // Base delay
        1000,
        5000,
        'test operation'
      );
      
      // First attempt
      expect(operation).toHaveBeenCalledTimes(1);
      
      // Wait for first delay (100ms)
      await jest.advanceTimersByTimeAsync(100);
      expect(operation).toHaveBeenCalledTimes(2);
      
      // Wait for second delay (200ms)
      await jest.advanceTimersByTimeAsync(200);
      expect(operation).toHaveBeenCalledTimes(3);
      
      const result = await promise;
      expect(result).toBe('success');
      
      jest.useRealTimers();
    });

    it('should respect max delay', async () => {
      jest.useFakeTimers();
      
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Fail'))
        .mockResolvedValue('success');
      
      const promise = withRetryAndTimeout(
        operation,
        2,
        10000, // Large base delay
        100,   // Small max delay
        5000,
        'test operation'
      );
      
      // First attempt fails
      expect(operation).toHaveBeenCalledTimes(1);
      
      // Should wait max delay (100ms), not base delay (10000ms)
      await jest.advanceTimersByTimeAsync(100);
      expect(operation).toHaveBeenCalledTimes(2);
      
      const result = await promise;
      expect(result).toBe('success');
      
      jest.useRealTimers();
    });

    it('should use default values', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      const result = await withRetryAndTimeout(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should handle non-Error throws', async () => {
      const operation = jest.fn().mockRejectedValue('string error');
      
      await expect(withRetryAndTimeout(
        operation,
        1,
        10,
        100,
        500,
        'test operation'
      )).rejects.toThrow(/test operation failed after 1 attempts. Last error: string error/);
    });
  });

  describe('CircuitBreaker', () => {
    let breaker: CircuitBreaker;

    beforeEach(() => {
      breaker = new CircuitBreaker(3, 100, 300);
    });

    it('should execute successful operations', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      const result = await breaker.execute(operation, 'test');
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should record failures and open circuit', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('fail'));
      
      // Fail 3 times to open circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(operation, 'test');
        } catch {
          // Expected
        }
      }
      
      expect(breaker.getState().state).toBe('open');
      expect(breaker.getState().failures).toBe(3);
    });

    it('should reject immediately when circuit is open', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('fail'));
      
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(operation, 'test');
        } catch {
          // Expected
        }
      }
      
      // Reset mock
      operation.mockClear();
      
      // Should reject without calling operation
      await expect(breaker.execute(operation, 'test operation'))
        .rejects.toThrow('test operation circuit breaker is open. Service temporarily unavailable.');
      
      expect(operation).not.toHaveBeenCalled();
    });

    it('should transition to half-open after reset timeout', async () => {
      jest.useFakeTimers();
      
      const operation = jest.fn()
        .mockRejectedValue(new Error('fail'));
      
      // Open the circuit with 3 failures
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(operation, 'test');
        } catch {
          // Expected
        }
      }
      
      expect(breaker.getState().state).toBe('open');
      
      // Reset mock for next call
      operation.mockResolvedValue('success');
      
      // Advance time past reset timeout
      jest.advanceTimersByTime(301);
      
      // Should allow one attempt
      const result = await breaker.execute(operation, 'test');
      expect(result).toBe('success');
      expect(breaker.getState().state).toBe('closed');
      expect(breaker.getState().failures).toBe(0);
      
      jest.useRealTimers();
    });

    it('should stay open if half-open attempt fails', async () => {
      jest.useFakeTimers();
      
      const operation = jest.fn().mockRejectedValue(new Error('fail'));
      
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(operation, 'test');
        } catch {
          // Expected
        }
      }
      
      // Advance time past reset timeout
      jest.advanceTimersByTime(301);
      
      // Half-open attempt fails
      try {
        await breaker.execute(operation, 'test');
      } catch {
        // Expected
      }
      
      expect(breaker.getState().state).toBe('open');
      expect(breaker.getState().failures).toBe(4);
      
      jest.useRealTimers();
    });

    it('should handle timeout errors', async () => {
      const operation = jest.fn().mockImplementation(async () => {
        await delay(200);
        return 'too slow';
      });
      
      await expect(breaker.execute(operation, 'test operation'))
        .rejects.toThrow('test operation timed out after 100ms');
      
      expect(breaker.getState().failures).toBe(1);
    });

    it('should reset on successful operation in half-open state', async () => {
      jest.useFakeTimers();
      
      const breaker = new CircuitBreaker(2, 100, 300);
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');
      
      // Open the circuit with 2 failures
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(operation, 'test');
        } catch {
          // Expected
        }
      }
      
      expect(breaker.getState().state).toBe('open');
      
      // Advance time to trigger half-open
      jest.advanceTimersByTime(301);
      
      // Successful execution should reset
      const result = await breaker.execute(operation, 'test');
      expect(result).toBe('success');
      
      const state = breaker.getState();
      expect(state.state).toBe('closed');
      expect(state.failures).toBe(0);
      expect(state.lastFailTime).toBe(0);
      
      jest.useRealTimers();
    });

    it('should use default constructor values', () => {
      const defaultBreaker = new CircuitBreaker();
      const state = defaultBreaker.getState();
      
      expect(state.state).toBe('closed');
      expect(state.failures).toBe(0);
      expect(state.lastFailTime).toBe(0);
    });

    it('should propagate non-timeout errors', async () => {
      const customError = new Error('Custom error');
      const operation = jest.fn().mockRejectedValue(customError);
      
      await expect(breaker.execute(operation, 'test'))
        .rejects.toThrow(customError);
    });
  });
});