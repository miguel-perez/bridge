/**
 * Integration tests for advanced Bridge features
 *
 * Tests less common but important functionality
 */

import { describe, test, expect } from '@jest/globals';
import {
  withTestEnvironment,
  callExperience,
  callReconsider,
  verifyToolResponse,
  extractExperienceId,
  createTestExperiences,
} from '../test-utils/integration-helpers.js';

describe('Advanced Features Integration', () => {
  test('should handle stillThinking flow state', async () => {
    await withTestEnvironment(async (env) => {
      // Test the stillThinking parameter for multi-step flows
      const result1 = await env.client.callTool({
        name: 'experience',
        arguments: {
          experiences: [
            {
              source: 'Starting investigation',
              emoji: '🔍',
              experience: ['embodied.thinking', 'purpose.goal'],
            },
          ],
          stillThinking: true,
        },
      });

      // stillThinking doesn't show in response, just affects flow
      expect(result1.content).toBeDefined();

      // Continue the flow
      const result2 = await env.client.callTool({
        name: 'experience',
        arguments: {
          experiences: [
            {
              source: 'Found a clue',
              emoji: '🔎',
              experience: ['embodied.thinking', 'mood.open'],
            },
          ],
          stillThinking: false,
        },
      });

      // Flow completion also doesn't show in response
      expect(result2.content).toBeDefined();
    });
  }, 30000);

  test('should filter by date ranges', async () => {
    await withTestEnvironment(async (env) => {
      // Create experiences across different times
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);

      // Add test data
      await callExperience(env.client, {
        source: 'Recent experience',
        emoji: '📅',
        experience: ['time.present'],
      });

      // Search with date filter
      const result = await callExperience(env.client, {
        source: 'Searching recent experiences',
        emoji: '🔍',
        experience: ['embodied.thinking'],
        recall: {
          created: {
            start: yesterday.toISOString().split('T')[0],
            end: new Date().toISOString().split('T')[0],
          },
        },
      });

      expect(result.content).toBeDefined();
    });
  }, 30000);

  test('should handle crafted vs raw experiences', async () => {
    await withTestEnvironment(async (env) => {
      // Create crafted content
      await callExperience(env.client, {
        source: 'A carefully written reflection on the project',
        emoji: '✍️',
        experience: ['embodied.thinking', 'mood.open'],
        crafted: true,
      });

      // Create raw experience
      await callExperience(env.client, {
        source: 'ugh this bug is driving me crazy',
        emoji: '😤',
        experience: ['embodied.sensing', 'mood.closed'],
        crafted: false,
      });

      // Search for crafted content only
      const crafted = await callExperience(env.client, {
        source: 'Looking for polished thoughts',
        emoji: '📝',
        experience: ['embodied.thinking'],
        recall: {
          crafted: true,
        },
      });

      expect(crafted.content).toBeDefined();

      // Search for raw experiences only
      const raw = await callExperience(env.client, {
        source: 'Looking for authentic moments',
        emoji: '💭',
        experience: ['embodied.thinking'],
        recall: {
          crafted: false,
        },
      });

      expect(raw.content).toBeDefined();
    });
  }, 30000);

  test('should handle reflected_by queries', async () => {
    await withTestEnvironment(async (env) => {
      // Create base experiences
      const exp1 = await callExperience(env.client, {
        source: 'Feeling stuck',
        emoji: '🚧',
        experience: ['mood.closed'],
      });
      const id1 = extractExperienceId(exp1);

      const exp2 = await callExperience(env.client, {
        source: 'Asked for help',
        emoji: '🤝',
        experience: ['presence.collective'],
      });
      const id2 = extractExperienceId(exp2);

      // Create reflection
      const reflection = await callExperience(env.client, {
        source: 'I notice I need others when stuck',
        emoji: '💡',
        experience: ['embodied.thinking', 'focus.broad'],
        reflects: [id1!, id2!],
      });
      const reflectionId = extractExperienceId(reflection);

      // Search for experiences reflected by this pattern
      const result = await callExperience(env.client, {
        source: 'What does this pattern reflect on?',
        emoji: '🔍',
        experience: ['embodied.thinking'],
        recall: {
          reflected_by: reflectionId,
        },
      });

      expect(result.content).toBeDefined();
    });
  }, 30000);

  test('should handle multiple perspective values', async () => {
    await withTestEnvironment(async (env) => {
      // Test various perspective values
      const perspectives = ['I', 'we', 'you', 'they', 'it', 'one'];

      for (const perspective of perspectives) {
        await callExperience(env.client, {
          source: `Experience from ${perspective} perspective`,
          emoji: '👁️',
          experience: ['presence.individual'],
          perspective,
        });
      }

      // Search for specific perspective
      const result = await callExperience(env.client, {
        source: 'Looking for collective experiences',
        emoji: '👥',
        experience: ['embodied.thinking'],
        recall: {
          perspective: 'we',
        },
      });

      expect(result.content).toBeDefined();
    });
  }, 30000);

  test('should handle processing timing filters', async () => {
    await withTestEnvironment(async (env) => {
      // Create experiences with different processing times
      await callExperience(env.client, {
        source: 'In the moment realization',
        emoji: '⚡',
        experience: ['embodied.sensing'],
        processing: 'during',
      });

      await callExperience(env.client, {
        source: 'Just realized something',
        emoji: '💭',
        experience: ['embodied.thinking'],
        processing: 'right-after',
      });

      await callExperience(env.client, {
        source: 'Looking back, I understand now',
        emoji: '🔮',
        experience: ['embodied.thinking', 'time.past'],
        processing: 'long-after',
      });

      // Search by processing time
      const result = await callExperience(env.client, {
        source: 'Finding retrospective insights',
        emoji: '🔍',
        experience: ['embodied.thinking'],
        recall: {
          processing: 'long-after',
        },
      });

      expect(result.content).toBeDefined();
    });
  }, 30000);

  test('should handle quality switchboard format', async () => {
    await withTestEnvironment(async (env) => {
      // Test the full quality switchboard format
      const result = await callExperience(env.client, {
        source: 'Testing switchboard format',
        emoji: '🎛️',
        experience: ['embodied.thinking', 'mood.open', 'purpose.goal'],
        experienceQualities: {
          embodied: 'thinking',
          focus: true, // Mixed state
          mood: 'open',
          purpose: 'goal',
          space: false, // Not prominent
          time: false,
          presence: 'individual',
        },
      });

      expect(verifyToolResponse(result, 'Experienced')).toBe(true);
    });
  }, 30000);

  test('should handle complex quality filtering with OR logic', async () => {
    await withTestEnvironment(async (env) => {
      // Add varied experiences
      const experiences = createTestExperiences();
      for (const exp of experiences) {
        await callExperience(env.client, exp);
      }

      // Complex quality filter with OR logic
      const result = await callExperience(env.client, {
        source: 'Complex quality search',
        emoji: '🔍',
        experience: ['embodied.thinking'],
        recall: {
          qualities: {
            mood: ['open', 'closed'], // OR logic
            purpose: 'goal',
            embodied: { present: true }, // Any embodied quality
          },
        },
      });

      expect(result.content).toBeDefined();
    });
  }, 30000);

  test('should handle sorting by creation date', async () => {
    await withTestEnvironment(async (env) => {
      // Add experiences with slight delays to ensure different timestamps
      await callExperience(env.client, {
        source: 'First experience',
        emoji: '1️⃣',
        experience: ['time.present'],
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      await callExperience(env.client, {
        source: 'Second experience',
        emoji: '2️⃣',
        experience: ['time.present'],
      });

      // Search with created sort
      const result = await callExperience(env.client, {
        source: 'Chronological search',
        emoji: '📅',
        experience: ['embodied.thinking'],
        recall: {
          sort: 'created',
          limit: 10,
        },
      });

      expect(result.content).toBeDefined();
    });
  }, 30000);

  test('should handle grouping by different dimensions', async () => {
    await withTestEnvironment(async (env) => {
      // Add experiences for grouping
      const testData = createTestExperiences();
      for (const exp of testData) {
        await callExperience(env.client, exp);
      }

      // Test different grouping options
      const groupingTypes = ['who', 'date', 'qualities', 'perspective'] as const;

      for (const groupBy of groupingTypes) {
        const result = await callExperience(env.client, {
          source: `Testing ${groupBy} grouping`,
          emoji: '📊',
          experience: ['embodied.thinking', 'purpose.goal'],
          recall: {
            group_by: groupBy,
          },
        });

        expect(result.content).toBeDefined();
      }
    });
  }, 30000);
});
