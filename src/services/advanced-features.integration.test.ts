/**
 * Integration tests for advanced Bridge features
 *
 * Tests less common but important functionality
 */

import { describe, test, expect } from '@jest/globals';
import {
  withTestEnvironment,
  callExperience,
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
              experienceQualities: {"embodied":"thinking","focus":false,"mood":false,"purpose":"goal","space":false,"time":false,"presence":false},
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
              experienceQualities: {"embodied":"thinking","focus":false,"mood":"open","purpose":false,"space":false,"time":false,"presence":false},
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
        experienceQualities: {"embodied":false,"focus":false,"mood":false,"purpose":false,"space":false,"time":"present","presence":false},
      });

      // Search with date filter
      const result = await callExperience(env.client, {
        source: 'Searching recent experiences',
        emoji: '🔍',
        experienceQualities: {"embodied":"thinking","focus":false,"mood":false,"purpose":false,"space":false,"time":false,"presence":false},
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

  // Test removed: crafted field no longer exists in the data model

  test('should handle reflected_by queries', async () => {
    await withTestEnvironment(async (env) => {
      // Create base experiences
      const exp1 = await callExperience(env.client, {
        source: 'Feeling stuck',
        emoji: '🚧',
        experienceQualities: {"embodied":false,"focus":false,"mood":"closed","purpose":false,"space":false,"time":false,"presence":false},
      });
      const id1 = extractExperienceId(exp1);

      const exp2 = await callExperience(env.client, {
        source: 'Asked for help',
        emoji: '🤝',
        experienceQualities: {"embodied":false,"focus":false,"mood":false,"purpose":false,"space":false,"time":false,"presence":"collective"},
      });
      const id2 = extractExperienceId(exp2);

      // Create reflection
      const reflection = await callExperience(env.client, {
        source: 'I notice I need others when stuck',
        emoji: '💡',
        experienceQualities: {"embodied":"thinking","focus":"broad","mood":false,"purpose":false,"space":false,"time":false,"presence":false},
        reflects: [id1!, id2!],
      });
      const reflectionId = extractExperienceId(reflection);

      // Search for experiences reflected by this pattern
      const result = await callExperience(env.client, {
        source: 'What does this pattern reflect on?',
        emoji: '🔍',
        experienceQualities: {"embodied":"thinking","focus":false,"mood":false,"purpose":false,"space":false,"time":false,"presence":false},
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
          experienceQualities: {"embodied":false,"focus":false,"mood":false,"purpose":false,"space":false,"time":false,"presence":"individual"},
          perspective,
        });
      }

      // Search for specific perspective
      const result = await callExperience(env.client, {
        source: 'Looking for collective experiences',
        emoji: '👥',
        experienceQualities: {"embodied":"thinking","focus":false,"mood":false,"purpose":false,"space":false,"time":false,"presence":false},
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
        experienceQualities: {"embodied":"sensing","focus":false,"mood":false,"purpose":false,"space":false,"time":false,"presence":false},
        processing: 'during',
      });

      await callExperience(env.client, {
        source: 'Just realized something',
        emoji: '💭',
        experienceQualities: {"embodied":"thinking","focus":false,"mood":false,"purpose":false,"space":false,"time":false,"presence":false},
        processing: 'right-after',
      });

      await callExperience(env.client, {
        source: 'Looking back, I understand now',
        emoji: '🔮',
        experienceQualities: {"embodied":"thinking","focus":false,"mood":false,"purpose":false,"space":false,"time":"past","presence":false},
        processing: 'long-after',
      });

      // Search by processing time
      const result = await callExperience(env.client, {
        source: 'Finding retrospective insights',
        emoji: '🔍',
        experienceQualities: {"embodied":"thinking","focus":false,"mood":false,"purpose":false,"space":false,"time":false,"presence":false},
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
        experienceQualities: {"embodied":"thinking","focus":false,"mood":"open","purpose":"goal","space":false,"time":false,"presence":false},
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
        experienceQualities: {"embodied":"thinking","focus":false,"mood":false,"purpose":false,"space":false,"time":false,"presence":false},
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
        experienceQualities: {"embodied":false,"focus":false,"mood":false,"purpose":false,"space":false,"time":"present","presence":false},
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      await callExperience(env.client, {
        source: 'Second experience',
        emoji: '2️⃣',
        experienceQualities: {"embodied":false,"focus":false,"mood":false,"purpose":false,"space":false,"time":"present","presence":false},
      });

      // Search with created sort
      const result = await callExperience(env.client, {
        source: 'Chronological search',
        emoji: '📅',
        experienceQualities: {"embodied":"thinking","focus":false,"mood":false,"purpose":false,"space":false,"time":false,"presence":false},
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
          experienceQualities: {"embodied":"thinking","focus":false,"mood":false,"purpose":"goal","space":false,"time":false,"presence":false},
          recall: {
            group_by: groupBy,
          },
        });

        expect(result.content).toBeDefined();
      }
    });
  }, 30000);
});
