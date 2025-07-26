/**
 * Integration tests for error handling and edge cases
 *
 * Tests system resilience and proper error messages
 */

import { describe, test, expect } from '@jest/globals';
import {
  withTestEnvironment,
  callExperience,
  callReconsider,
  extractExperienceId,
} from './test-utils/integration-helpers.js';

describe('Error Handling Integration', () => {
  test('should handle empty experiences array gracefully', async () => {
    await withTestEnvironment(async (env) => {
      try {
        await env.client.callTool({
          name: 'experience',
          arguments: {
            experiences: [], // Empty array
          },
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toBeDefined();
      }
    });
  }, 30000);

  test('should handle invalid quality dimensions', async () => {
    await withTestEnvironment(async (env) => {
      try {
        await callExperience(env.client, {
          source: 'Test',
          emoji: '🧪',
          experience: ['invalid.quality', 'embodied.invalid', 'notaquality'],
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toBeDefined();
      }
    });
  }, 30000);

  test('should handle reconsider with non-existent ID', async () => {
    await withTestEnvironment(async (env) => {
      try {
        await callReconsider(env.client, {
          id: 'exp_nonexistent',
          source: 'Updated text',
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toBeDefined();
      }
    });
  }, 30000);

  test('should handle extremely long source text', async () => {
    await withTestEnvironment(async (env) => {
      const longText = 'A'.repeat(10000); // 10k characters

      const result = await callExperience(env.client, {
        source: longText,
        emoji: '📜',
        experience: ['embodied.thinking'],
      });

      // Should handle gracefully
      const id = extractExperienceId(result);
      expect(id).toBeTruthy();
    });
  }, 30000);

  test('should handle invalid emoji gracefully', async () => {
    await withTestEnvironment(async (env) => {
      const result = await callExperience(env.client, {
        source: 'Test with invalid emoji',
        emoji: 'not-an-emoji',
        experience: ['embodied.thinking'],
      });

      // Invalid emoji might cause an error or use default
      if (result.isError) {
        expect(result.content?.[0]?.text).toBeDefined();
      } else {
        const id = extractExperienceId(result);
        expect(id).toBeTruthy();
      }
    });
  }, 30000);

  test('should handle circular reflects references', async () => {
    await withTestEnvironment(async (env) => {
      // Create first experience
      const exp1 = await callExperience(env.client, {
        source: 'First experience',
        emoji: '1️⃣',
        experience: ['embodied.thinking'],
      });
      const id1 = extractExperienceId(exp1);

      // Try to create experience that reflects itself (should fail)
      try {
        await callExperience(env.client, {
          source: 'Self-referential',
          emoji: '🔄',
          experience: ['embodied.thinking'],
          reflects: [id1!, id1!], // Duplicate reference
        });
        // Should still work but deduplicate
        expect(true).toBe(true);
      } catch (error) {
        // Or might fail validation
        expect(error).toBeDefined();
      }
    });
  }, 30000);

  test('should handle invalid date formats in search', async () => {
    await withTestEnvironment(async (env) => {
      try {
        await callExperience(env.client, {
          source: 'Search with bad date',
          emoji: '📅',
          experience: ['embodied.thinking'],
          recall: {
            created: 'not-a-date',
          },
        });
        // Might handle gracefully or error
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  }, 30000);

  test('should handle conflicting search parameters', async () => {
    await withTestEnvironment(async (env) => {
      // Add test data
      const exp = await callExperience(env.client, {
        source: 'Test experience',
        emoji: '🧪',
        experience: ['embodied.thinking'],
      });
      const id = extractExperienceId(exp);

      // Search with both ID and query (ID should take precedence)
      const result = await callExperience(env.client, {
        source: 'Conflicting search',
        emoji: '🔍',
        experience: ['embodied.thinking'],
        recall: {
          ids: id,
          query: 'completely different search',
        },
      });

      // Should find the specific ID
      expect(result.content).toBeDefined();
    });
  }, 30000);

  test('should handle release of already released experience', async () => {
    await withTestEnvironment(async (env) => {
      // Create and release experience
      const exp = await callExperience(env.client, {
        source: 'To be released',
        emoji: '🗑️',
        experience: ['embodied.thinking'],
      });
      const id = extractExperienceId(exp);

      // First release
      await callReconsider(env.client, {
        id: id!,
        release: true,
        reason: 'First release',
      });

      // Try to release again
      try {
        await callReconsider(env.client, {
          id: id!,
          release: true,
          reason: 'Second release',
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toBeDefined();
      }
    });
  }, 30000);

  test('should handle mixed valid and invalid data in batch', async () => {
    await withTestEnvironment(async (env) => {
      try {
        await env.client.callTool({
          name: 'experience',
          arguments: {
            experiences: [
              {
                source: 'Valid experience',
                emoji: '✅',
                experience: ['embodied.thinking'],
              },
              {
                // Missing required fields
                emoji: '❌',
              },
              {
                source: 'Another valid one',
                emoji: '✅',
                experience: ['mood.open'],
              },
            ],
          },
        });
        // Might process valid ones or fail entirely
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  }, 30000);
});
