/**
 * Tests for unified timeout utilities
 */

import {
  withTimeout,
  TimeoutError,
  TIMEOUTS,
  createTimeoutWrapper,
  withRetryAndTimeout,
  CircuitBreaker,
  toolTimeout,
  embeddingTimeout,
  DEFAULT_TIMEOUTS,
  DXT_TIMEOUTS,
} from './unified-timeout.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

describe('Unified Timeout Utilities', () => {
  beforeEach(() => {
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('withTimeout', () => {
    it('should resolve if operation completes before timeout', async () => {
      const promise = Promise.resolve('success');
      const result = await withTimeout(promise, { timeoutMs: 1000, operation: 'test' });
      expect(result).toBe('success');
    });

    it('should reject with TimeoutError if operation takes too long', async () => {
      const promise = new Promise((resolve) => {
        setTimeout(() => resolve('too late'), 2000);
      });

      const timeoutPromise = withTimeout(promise, { timeoutMs: 1000, operation: 'test operation' });

      jest.advanceTimersByTime(1001);

      await expect(timeoutPromise).rejects.toThrow(TimeoutError);
      await expect(timeoutPromise).rejects.toThrow(
        "Operation 'test operation' timed out after 1000ms"
      );
    });

    it('should support legacy number parameter', async () => {
      const promise = Promise.resolve('success');
      const result = await withTimeout(promise, 1000, 'legacy operation');
      expect(result).toBe('success');
    });

    it('should add context when specified', async () => {
      const promise = new Promise((resolve) => {
        setTimeout(() => resolve('too late'), 2000);
      });

      const timeoutPromise = withTimeout(promise, {
        timeoutMs: 1000,
        operation: 'test',
        addContext: true,
      });

      jest.advanceTimersByTime(1001);

      await expect(timeoutPromise).rejects.toThrow(/This may indicate:/);
    });

    it('should clear timeout when promise resolves', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      const promise = Promise.resolve('success');

      await withTimeout(promise, { timeoutMs: 1000, operation: 'test' });

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });

    it('should clear timeout when promise rejects', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      const promise = Promise.reject(new Error('failed'));

      await expect(withTimeout(promise, { timeoutMs: 1000, operation: 'test' })).rejects.toThrow(
        'failed'
      );

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });
  });

  describe('createTimeoutWrapper', () => {
    it('should create a wrapper function with correct timeout', async () => {
      const wrapper = createTimeoutWrapper('TOOL_EXECUTION');
      const promise = Promise.resolve('result');

      const result = await wrapper(promise, 'custom operation');
      expect(result).toBe('result');
    });

    it('should use operation type as default name', async () => {
      const wrapper = createTimeoutWrapper('EMBEDDING_GENERATION');
      const promise = new Promise((resolve) => {
        setTimeout(() => resolve('too late'), 50000);
      });

      const wrappedPromise = wrapper(promise);
      jest.advanceTimersByTime(45001);

      await expect(wrappedPromise).rejects.toThrow('embedding generation');
    });

    it('should add context when specified', async () => {
      const wrapper = createTimeoutWrapper('TOOL_EXECUTION', true);
      const promise = new Promise((resolve) => {
        setTimeout(() => resolve('too late'), 20000);
      });

      const wrappedPromise = wrapper(promise);
      jest.advanceTimersByTime(10001);

      await expect(wrappedPromise).rejects.toThrow(/This may indicate:/);
    });
  });

  describe('Pre-configured wrappers', () => {
    it('toolTimeout should use TOOL_EXECUTION timeout', async () => {
      const promise = new Promise((resolve) => {
        setTimeout(() => resolve('too late'), 20000);
      });

      const wrappedPromise = toolTimeout(promise, 'test tool');
      jest.advanceTimersByTime(10001);

      await expect(wrappedPromise).rejects.toThrow(TimeoutError);
    });

    it('embeddingTimeout should use EMBEDDING_GENERATION timeout', async () => {
      const promise = Promise.resolve('success');
      const result = await embeddingTimeout(promise);
      expect(result).toBe('success');
    });
  });

  describe('withRetryAndTimeout', () => {
    beforeEach(() => {
      jest.useRealTimers(); // Use real timers for async retry logic
    });

    afterEach(() => {
      jest.useFakeTimers();
    });

    it('should retry on timeout', async () => {
      let attempts = 0;
      const operation = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          return new Promise((resolve) => {
            setTimeout(() => resolve('too late'), 2000);
          });
        }
        return Promise.resolve('success');
      });

      const result = await withRetryAndTimeout(
        operation,
        3,
        10, // Short retry delay for tests
        100,
        50, // Short timeout for tests
        'test operation'
      );

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should not retry on validation errors', async () => {
      const operation = jest
        .fn()
        .mockRejectedValue(new McpError(ErrorCode.InvalidParams, 'Invalid parameters'));

      await expect(withRetryAndTimeout(operation, 3, 100, 1000, 1000, 'test')).rejects.toThrow(
        'Invalid parameters'
      );

      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should throw McpError after max attempts', async () => {
      const operation = jest.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve('too late'), 2000);
          })
      );

      await expect(
        withRetryAndTimeout(operation, 2, 10, 100, 50, 'test operation')
      ).rejects.toThrow(McpError);

      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe('CircuitBreaker', () => {
    it('should allow operations when closed', async () => {
      const breaker = new CircuitBreaker(3, 1000, 5000);
      const operation = jest.fn().mockResolvedValue('success');

      const result = await breaker.execute(operation, 'test');

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalled();
    });

    it('should open after failure threshold', async () => {
      const breaker = new CircuitBreaker(2, 1000, 5000);
      const operation = jest.fn().mockRejectedValue(new Error('failed'));

      // First failure
      await expect(breaker.execute(operation, 'test')).rejects.toThrow('failed');

      // Second failure - should open circuit
      await expect(breaker.execute(operation, 'test')).rejects.toThrow('failed');

      // Third attempt - circuit is open
      await expect(breaker.execute(operation, 'test')).rejects.toThrow('circuit breaker is open');

      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should transition to half-open after reset timeout', async () => {
      const breaker = new CircuitBreaker(1, 1000, 5000);
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('failed'))
        .mockResolvedValue('success');

      // Open the circuit
      await expect(breaker.execute(operation, 'test')).rejects.toThrow('failed');

      // Circuit is open
      await expect(breaker.execute(operation, 'test')).rejects.toThrow('circuit breaker is open');

      // Wait for reset timeout
      jest.advanceTimersByTime(5001);

      // Should try again (half-open state)
      const result = await breaker.execute(operation, 'test');
      expect(result).toBe('success');

      // Circuit should be closed again
      const state = breaker.getState();
      expect(state.state).toBe('closed');
    });

    it('should handle timeout errors', async () => {
      const breaker = new CircuitBreaker(2, 1000, 5000);
      const operation = jest.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve('too late'), 2000);
          })
      );

      const promise = breaker.execute(operation, 'test');
      jest.advanceTimersByTime(1001);

      await expect(promise).rejects.toThrow(McpError);
      await expect(promise).rejects.toThrow('test timed out after 1000ms');
    });

    it('getState should return current state', () => {
      const breaker = new CircuitBreaker(3, 1000, 5000);

      const state = breaker.getState();
      expect(state).toEqual({
        state: 'closed',
        failures: 0,
        lastFailTime: 0,
      });
    });
  });

  describe('Backward compatibility', () => {
    it('DEFAULT_TIMEOUTS should match TIMEOUTS', () => {
      expect(DEFAULT_TIMEOUTS).toBe(TIMEOUTS);
    });

    it('DXT_TIMEOUTS should have correct values', () => {
      expect(DXT_TIMEOUTS.TOOL_EXECUTION).toBe(10000);
      expect(DXT_TIMEOUTS.EMBEDDING_GENERATION).toBe(45000);
      expect(DXT_TIMEOUTS.FILE_OPERATION).toBe(5000);
      expect(DXT_TIMEOUTS.SEARCH_OPERATION).toBe(8000);
    });
  });
});
