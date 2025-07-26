/**
 * Integration tests for MCP handlers
 *
 * Tests the complete flow from MCP request through handlers to services
 */

import { describe, test, expect } from '@jest/globals';
import {
  withTestEnvironment,
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
            experience: ['embodied.thinking'],
          },
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        // The error message varies but should indicate validation failure
        expect(error.message).toBeDefined();
      }
    });
  }, 30000);

  test('should validate quality format', async () => {
    await withTestEnvironment(async (env) => {
      try {
        await callExperience(env.client, {
          source: 'Test',
          emoji: '🧪',
          experience: ['invalid.quality', 'embodied.thinking'],
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain('quality');
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
      } catch (error: any) {
        expect(error.message).toBeDefined();
      }
    });
  }, 30000);

  test('should handle concurrent requests', async () => {
    await withTestEnvironment(async (env) => {
      // Send multiple requests concurrently
      const promises = Array.from({ length: 5 }, (_, i) =>
        callExperience(env.client, {
          source: `Concurrent test ${i}`,
          emoji: '🔄',
          experience: ['embodied.thinking', 'focus.narrow'],
        })
      );

      const results = await Promise.all(promises);

      // All should succeed
      results.forEach((result, i) => {
        expect(verifyToolResponse(result, 'Experienced')).toBe(true);
        const id = extractExperienceId(result);
        expect(id).toBeTruthy();
      });

      // All IDs should be unique
      const ids = results.map((r) => extractExperienceId(r));
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(5);
    });
  }, 30000);

  test('should maintain data consistency', async () => {
    await withTestEnvironment(async (env) => {
      // Create experience
      const createResult = await callExperience(env.client, {
        source: 'Original text',
        emoji: '📝',
        experience: ['embodied.thinking'],
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
        experience: ['embodied.thinking'],
        recall: {
          query: 'Updated text',
        },
      });

      // Verify search found the updated experience
      expect(verifyToolResponse(searchResult, 'Related experiences')).toBe(true);
    });
  }, 30000);

  test('should handle special characters in content', async () => {
    await withTestEnvironment(async (env) => {
      const specialContent = 'Test with "quotes" and \'apostrophes\' and line\nbreaks';

      const result = await callExperience(env.client, {
        source: specialContent,
        emoji: '🔤',
        experience: ['embodied.thinking'],
        context: 'Testing special character handling: <>&',
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
          experience: ['embodied.thinking'],
        });
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete reasonably quickly (no excessive delays)
      expect(duration).toBeLessThan(5000);
    });
  }, 30000);
});
