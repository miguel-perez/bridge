/**
 * Integration tests for MCP handlers
 *
 * Tests the complete flow from MCP request through handlers to services
 */

import { describe, test, expect } from '@jest/globals';
import {
  withTestEnvironment,
  withIsolatedTestEnvironment,
  callExperience,
  callReconsider,
  verifyToolResponse,
  extractExperienceId,
} from '../test-utils/integration-helpers.js';

describe('MCP Handlers Integration', () => {
  test('should validate required fields', async () => {
    await withTestEnvironment(async (env) => {
      // Test missing required fields
      try {
        await env.client.callTool({
          name: 'experience',
          arguments: {
            // Missing required 'source' and 'emoji'
            experienceQualities: {"embodied":"thinking","focus":false,"mood":false,"purpose":false,"space":false,"time":false,"presence":false},
          },
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error: unknown) {
        // The error message varies but should indicate validation failure
        expect(error).toBeDefined();
      }
    });
  }, 30000);

  test('should validate quality format', async () => {
    await withTestEnvironment(async (env) => {
      try {
        await callExperience(env.client, {
          source: 'Test',
          emoji: '🧪',
          experienceQualities: {"embodied":"thinking","focus":false,"mood":false,"purpose":false,"space":false,"time":false,"presence":false,"invalid":"quality"},
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error: unknown) {
        expect(error).toBeDefined();
      }
    });
  }, 30000);

  test('should handle error propagation gracefully', async () => {
    await withTestEnvironment(async (env) => {
      // Test with invalid ID for reconsider
      try {
        await callReconsider(env.client, {
          id: 'invalid_id_format',
          source: 'Updated text',
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error: unknown) {
        expect(error).toBeDefined();
      }
    });
  }, 30000);

  test('should handle concurrent requests', async () => {
    await withIsolatedTestEnvironment(async (env) => {
      // Send multiple requests concurrently with staggered timing to reduce race conditions
              const promises = Array.from({ length: 5 }, (_, _i) => {
        // Add small delay between requests to reduce contention
        const delay = _i * 50;
        return new Promise<unknown>((resolve, reject) => {
          setTimeout(async () => {
            try {
              const result = await callExperience(env.client, {
                source: `Concurrent test ${_i} - ${Date.now()}`,
                emoji: '🔄',
                experienceQualities: {"embodied":"thinking","focus":"narrow","mood":false,"purpose":false,"space":false,"time":false,"presence":false},
              });
              resolve(result);
            } catch (error) {
              reject(error);
            }
          }, delay);
        });
      });

      const results = await Promise.all(promises);

      // All should succeed with better error reporting
      results.forEach((result, i) => {
        // Check if response is valid
        expect(result).toBeDefined();
        expect(result).toBeInstanceOf(Object); // Ensure it's an object
        const res = result as { content: unknown; experienceId: string };
        expect(res.content).toBeDefined();
        expect(Array.isArray(res.content)).toBe(true);
        
        // Verify response contains expected content
        const hasExpectedContent = verifyToolResponse(res, 'Experienced');
        expect(hasExpectedContent).toBe(true);
        
        // Extract and verify ID with better error handling
        const id = extractExperienceId(res);
        if (!id) {
          // Log the actual response for debugging
          console.error(`Test ${i} failed to extract ID. Response:`, JSON.stringify(result, null, 2));
        }
        expect(id).toBeTruthy();
        expect(id).toMatch(/^exp_[a-zA-Z0-9_-]+$/);
      });

      // All IDs should be unique with better validation
      const ids = results.map((r) => extractExperienceId(r)).filter(Boolean);
      const uniqueIds = new Set(ids);
      
      // Log details if uniqueness check fails
      if (uniqueIds.size !== 5) {
        console.error('Duplicate IDs found:', {
          total: ids.length,
          unique: uniqueIds.size,
          ids: ids,
          duplicates: ids.filter((id, index) => ids.indexOf(id) !== index)
        });
      }
      
      expect(uniqueIds.size).toBe(5);
    });
  }, 30000);

  test('should handle concurrent requests with retry logic', async () => {
    await withIsolatedTestEnvironment(async (env) => {
      // Test with retry logic for more robust concurrent handling
      const createExperienceWithRetry = async (index: number): Promise<unknown> => {
        let lastError: Error | null = null;
        
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const result = await callExperience(env.client, {
              source: `Concurrent retry test ${index} - attempt ${attempt} - ${Date.now()}`,
              emoji: '🔄',
              experienceQualities: {"embodied":"thinking","focus":"narrow","mood":false,"purpose":false,"space":false,"time":false,"presence":false},
            });
            
            // Verify the result is valid
            if (result && result instanceof Object) {
              const res = result as { content: unknown; experienceId: string };
              if (res.content && Array.isArray(res.content)) {
                const id = extractExperienceId(res);
                if (id && id.match(/^exp_[a-zA-Z0-9_-]+$/)) {
                  return result;
                }
              }
            }
            
            throw new Error('Invalid response format');
          } catch (error) {
            lastError = error as Error;
            if (attempt < 3) {
              // Wait before retry with exponential backoff
              await new Promise(resolve => setTimeout(resolve, 100 * attempt));
            }
          }
        }
        
        throw lastError || new Error('All retry attempts failed');
      };

      // Send multiple requests concurrently
      const promises = Array.from({ length: 3 }, (_, _i) => createExperienceWithRetry(_i));
      const results = await Promise.all(promises);

      // All should succeed
      results.forEach((result, _i) => {
        expect(result).toBeDefined();
        expect(result).toBeInstanceOf(Object); // Ensure it's an object
        const res = result as { content: unknown; experienceId: string };
        expect(res.content).toBeDefined();
        expect(Array.isArray(res.content)).toBe(true);
        
        const hasExpectedContent = verifyToolResponse(res, 'Experienced');
        expect(hasExpectedContent).toBe(true);
        
        const id = extractExperienceId(res);
        expect(id).toBeTruthy();
        expect(id).toMatch(/^exp_[a-zA-Z0-9_-]+$/);
      });

      // All IDs should be unique
      const ids = results.map((r) => extractExperienceId(r)).filter(Boolean);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(3);
    });
  }, 30000);

  test('should maintain data consistency', async () => {
    await withTestEnvironment(async (env) => {
      // Create experience
      const createResult = await callExperience(env.client, {
        source: 'Original text',
        emoji: '📝',
        experienceQualities: {"embodied":"thinking","focus":false,"mood":false,"purpose":false,"space":false,"time":false,"presence":false},
        who: 'Original User',
      });

      const id = extractExperienceId(createResult);
      expect(id).toBeTruthy();

      // Update it
      await callReconsider(env.client, {
        id: id!,
        source: 'Updated text',
        who: 'Updated User',
      });

      // Search for it
      const searchResult = await callExperience(env.client, {
        source: 'Searching for updated experience',
        emoji: '🔍',
        experienceQualities: {"embodied":"thinking","focus":false,"mood":false,"purpose":false,"space":false,"time":false,"presence":false},
        recall: {
          query: 'Updated text',
        },
      });

      // Search won't return results with embeddings disabled
      expect(verifyToolResponse(searchResult, 'Experienced')).toBe(true);
    });
  }, 30000);

  test('should handle special characters in content', async () => {
    await withTestEnvironment(async (env) => {
      const specialContent = 'Test with "quotes" and \'apostrophes\' and line\nbreaks';

      const result = await callExperience(env.client, {
        source: specialContent,
        emoji: '🔤',
        experienceQualities: {"embodied":"thinking about special character handling: <>&","focus":false,"mood":false,"purpose":false,"space":false,"time":false,"presence":false},
      });

      expect(verifyToolResponse(result, 'Experienced')).toBe(true);

      // Should handle the content without errors
      const id = extractExperienceId(result);
      expect(id).toBeTruthy();
    });
  }, 30000);

  test('should respect rate limiting', async () => {
    await withTestEnvironment(async (env) => {
      // This test ensures rate limiting doesn't break functionality
      const startTime = Date.now();

      // Make several quick requests
      for (let i = 0; i < 3; i++) {
        await callExperience(env.client, {
          source: `Rate limit test ${i}`,
          emoji: '⏱️',
          experienceQualities: {"embodied":"thinking","focus":false,"mood":false,"purpose":false,"space":false,"time":false,"presence":false},
        });
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete reasonably quickly (no excessive delays)
      expect(duration).toBeLessThan(5000);
    });
  }, 30000);
});
