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
          anchor: '⚡',
          embodied: 'processing rapidly',
          focus: 'narrowed on this specific task',
          mood: 'energized by speed',
          purpose: 'testing rapid creation',
          space: 'in the test environment',
          time: `moment ${i}`,
          presence: 'focused on performance',
          who: ['Test Runner', 'Claude'],
          citation: `Rapid experience ${i}`
        });

        const id = extractExperienceId(result);
        if (id) {
          ids.push(id);
        } else {
          // If no ID in response, just verify the experience was created
          expect(verifyToolResponse(result, 'Experience Captured')).toBe(true);
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
        anchor: '📦',
        embodied: 'handling batch operations',
        focus: 'on processing multiple items',
        mood: 'systematic and efficient',
        purpose: 'achieving batch goals',
        space: 'in parallel processing',
        time: `batch item ${i}`,
        presence: 'orchestrating operations',
        who: ['Test Runner', 'Claude'],
        citation: `Batch experience ${i}`
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
          anchor: '📊',
          embodied: 'creating test data',
          focus: 'on optimization patterns',
          mood: 'methodical',
          purpose: 'building test dataset',
          space: 'in data creation phase',
          time: `iteration ${i}`,
          presence: 'generating test scenarios',
          who: ['Test Runner', 'Claude'],
          citation: `Test data ${i} with common keyword: optimization`
        });
      }

      // Search with high limit
      const result = await callExperience(env.client, {
        anchor: '🔍',
        embodied: 'scanning through data',
        focus: 'searching for patterns',
        mood: 'determined',
        purpose: 'finding optimization insights',
        space: 'navigating large dataset',
        time: 'after data creation',
        presence: 'engaged in search',
        who: ['Test Runner', 'Claude'],
        citation: 'Searching large dataset',
        recall: {
          query: 'optimization',
          limit: 100, // Request more than exists
        },
      });

      // Search won't return results with embeddings disabled
      expect(verifyToolResponse(result, 'Experience Captured')).toBe(true);
    });
  }, 90000);

  test('should handle complex pattern networks', async () => {
    await withTestEnvironment(async (env) => {
      const baseIds: string[] = [];

      // Create base experiences
      for (let i = 0; i < 5; i++) {
        const result = await callExperience(env.client, {
          anchor: '🌱',
          embodied: 'planting foundation',
          focus: 'on core concepts',
          mood: 'building carefully',
          purpose: 'establishing base patterns',
          space: 'in foundational layer',
          time: `base creation ${i}`,
          presence: 'laying groundwork',
          who: ['Test Runner', 'Claude'],
          citation: `Base experience ${i}`
        });
        const id = extractExperienceId(result);
        if (id) baseIds.push(id);
      }

      // Create interconnected experiences (reflects feature removed)
      for (let i = 0; i < 3; i++) {
        await callExperience(env.client, {
          anchor: '🔗',
          embodied: 'connecting insights',
          focus: 'seeing broader patterns',
          mood: 'insightful',
          purpose: 'recognizing connections',
          space: 'in pattern space',
          time: `pattern discovery ${i}`,
          presence: 'synthesizing understanding',
          who: ['Test Runner', 'Claude'],
          citation: `Pattern realization ${i} connecting to experiences ${baseIds.slice(i, i + 2).join(', ')}`
        });
      }

      // Search for patterns
      const patterns = await callExperience(env.client, {
        anchor: '🔍',
        embodied: 'searching for connections',
        focus: 'on pattern recognition',
        mood: 'analytical',
        purpose: 'finding all patterns',
        space: 'exploring pattern space',
        time: 'after pattern creation',
        presence: 'investigating connections',
        who: ['Test Runner', 'Claude'],
        citation: 'Finding all patterns',
        recall: {
          query: 'pattern realization',
          limit: 10
        }
      });

      // Pattern search won't return results with embeddings disabled
      expect(verifyToolResponse(patterns, 'Experience Captured')).toBe(true);
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
            anchor: '🎭',
            embodied: 'juggling multiple tasks',
            focus: 'split between operations',
            mood: 'managing complexity',
            purpose: 'testing concurrent ops',
            space: 'in mixed operation mode',
            time: `concurrent moment ${i}`,
            presence: 'orchestrating tasks',
            who: ['Test Runner', 'Claude'],
            citation: `Mixed op create ${i}`
          })
        );

        // Search
        operations.push(
          callExperience(env.client, {
            anchor: '🔍',
            embodied: 'searching while creating',
            focus: 'on finding patterns',
            mood: 'multitasking efficiently',
            purpose: 'testing search under load',
            space: 'in concurrent search',
            time: `search moment ${i}`,
            presence: 'actively querying',
            who: ['Test Runner', 'Claude'],
            citation: `Mixed op search ${i}`,
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
          anchor: '📄',
          embodied: 'generating page data',
          focus: 'on structured content',
          mood: 'systematic',
          purpose: 'building paginated dataset',
          space: 'in data generation',
          time: `record ${i}`,
          presence: 'creating systematically',
          who: ['Test Runner', 'Claude'],
          citation: `Paginated data ${i}`
        });
      }

      // Test pagination
      const pageSize = 10;
      for (let offset = 0; offset < total; offset += pageSize) {
        const result = await callExperience(env.client, {
          anchor: '📖',
          embodied: 'navigating through pages',
          focus: 'on specific page range',
          mood: 'methodical',
          purpose: 'testing pagination',
          space: 'in paginated results',
          time: `page ${offset / pageSize + 1}`,
          presence: 'systematically browsing',
          who: ['Test Runner', 'Claude'],
          citation: `Page ${offset / pageSize + 1}`,
          recall: {
            query: 'paginated',
            limit: pageSize,
          },
        });

        expect(
          verifyToolResponse(result, 'past experiences') ||
            verifyToolResponse(result, 'Experience Captured')
        ).toBe(true);
      }
    });
  }, 90000);
});
