/**
 * Performance and stress tests for Bridge
 *
 * Tests system behavior under load
 */

import { describe, test, expect } from '@jest/globals';
import {
  withTestEnvironment,
  callExperience,
  extractExperienceId,
  verifyToolResponse,
} from './test-utils/integration-helpers.js';

describe('Performance Integration Tests', () => {
  test('should handle rapid sequential experiences', async () => {
    await withTestEnvironment(async (env) => {
      const startTime = Date.now();
      const experienceCount = 20;
      const ids: string[] = [];

      // Rapidly create experiences
      for (let i = 0; i < experienceCount; i++) {
        const result = await callExperience(env.client, {
          source: `Rapid experience ${i}`,
          emoji: '⚡',
          experience: ['embodied.thinking', 'focus.narrow'],
        });

        const id = extractExperienceId(result);
        if (id) {
          ids.push(id);
        } else {
          // If no ID in response, just verify the experience was created
          expect(verifyToolResponse(result, 'Experienced')).toBe(true);
        }
      }

      const duration = Date.now() - startTime;
      console.log(
        `Created ${experienceCount} experiences in ${duration}ms (${duration / experienceCount}ms per experience)`
      );

      // If we got IDs, they should be unique
      if (ids.length > 0) {
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
      }
    });
  }, 60000);

  test('should handle large batch operations', async () => {
    await withTestEnvironment(async (env) => {
      const batchSize = 10;
      const experiences = Array.from({ length: batchSize }, (_, i) => ({
        source: `Batch experience ${i}`,
        emoji: '📦',
        experience: ['embodied.thinking', 'purpose.goal'],
      }));

      const result = await env.client.callTool({
        name: 'experience',
        arguments: { experiences },
      });

      expect(result.content).toBeDefined();
      expect(result.isError).toBeFalsy();
    });
  }, 60000);

  test('should handle search with large result sets', async () => {
    await withTestEnvironment(async (env) => {
      // Create many experiences
      for (let i = 0; i < 50; i++) {
        await callExperience(env.client, {
          source: `Test data ${i} with common keyword: optimization`,
          emoji: '📊',
          experience: ['embodied.thinking', 'purpose.goal'],
        });
      }

      // Search with high limit
      const result = await callExperience(env.client, {
        source: 'Searching large dataset',
        emoji: '🔍',
        experience: ['embodied.thinking'],
        recall: {
          query: 'optimization',
          limit: 100, // Request more than exists
        },
      });

      expect(verifyToolResponse(result, 'Related experiences')).toBe(true);
    });
  }, 90000);

  test('should handle complex pattern networks', async () => {
    await withTestEnvironment(async (env) => {
      const baseIds: string[] = [];

      // Create base experiences
      for (let i = 0; i < 5; i++) {
        const result = await callExperience(env.client, {
          source: `Base experience ${i}`,
          emoji: '🌱',
          experience: ['embodied.thinking'],
        });
        baseIds.push(extractExperienceId(result)!);
      }

      // Create pattern realizations that reflect multiple experiences
      for (let i = 0; i < 3; i++) {
        await callExperience(env.client, {
          source: `Pattern realization ${i}`,
          emoji: '🔗',
          experience: ['embodied.thinking', 'focus.broad'],
          reflects: baseIds.slice(i, i + 2),
        });
      }

      // Search for patterns
      const patterns = await callExperience(env.client, {
        source: 'Finding all patterns',
        emoji: '🔍',
        experience: ['embodied.thinking'],
        recall: {
          reflects: 'only',
        },
      });

      expect(verifyToolResponse(patterns, 'Related experiences')).toBe(true);
    });
  }, 60000);

  test('should maintain performance with mixed operations', async () => {
    await withTestEnvironment(async (env) => {
      const operations: Promise<any>[] = [];

      // Mix of different operations
      for (let i = 0; i < 5; i++) {
        // Create
        operations.push(
          callExperience(env.client, {
            source: `Mixed op create ${i}`,
            emoji: '🎭',
            experience: ['embodied.thinking'],
          })
        );

        // Search
        operations.push(
          callExperience(env.client, {
            source: `Mixed op search ${i}`,
            emoji: '🔍',
            experience: ['embodied.thinking'],
            recall: {
              query: 'mixed',
              limit: 5,
            },
          })
        );
      }

      // Execute all operations concurrently
      const results = await Promise.all(operations);

      // All should succeed
      results.forEach((result) => {
        expect(result.content).toBeDefined();
        expect(result.isError).toBeFalsy();
      });
    });
  }, 60000);

  test('should handle pagination efficiently', async () => {
    await withTestEnvironment(async (env) => {
      // Create many experiences
      const total = 30;
      for (let i = 0; i < total; i++) {
        await callExperience(env.client, {
          source: `Paginated data ${i}`,
          emoji: '📄',
          experience: ['time.present'],
        });
      }

      // Test pagination
      const pageSize = 10;
      for (let offset = 0; offset < total; offset += pageSize) {
        const result = await callExperience(env.client, {
          source: `Page ${offset / pageSize + 1}`,
          emoji: '📖',
          experience: ['embodied.thinking'],
          recall: {
            query: 'paginated',
            limit: pageSize,
            offset: offset,
          },
        });

        expect(
          verifyToolResponse(result, 'Related experiences') ||
            verifyToolResponse(result, 'Experienced')
        ).toBe(true);
      }
    });
  }, 90000);
});
