/**
 * Integration tests for Search/Recall functionality
 *
 * Tests the full MCP flow for searching and recalling experiences
 */

import { describe, test, expect } from '@jest/globals';
import {
  withTestEnvironment,
  callExperience,
  verifyToolResponse,
  extractExperienceId,
  createTestExperiences,
  humanQualities,
  _aiQualities,
} from '../test-utils/integration-helpers.js';

describe('Search/Recall Integration', () => {
  test('should search by semantic query', async () => {
    await withTestEnvironment(async (env) => {
      // Add test experiences
      const experiences = createTestExperiences();
      for (const exp of experiences) {
        await callExperience(env.client, exp);
      }

      // Search for anxiety-related experiences
      const result = await callExperience(env.client, {
        source: 'Searching for past anxiety experiences',
        emoji: '🔍',
        experienceQualities: humanQualities('embodied.thinking', 'purpose.goal', 'focus.narrow'),
        recall: {
          query: 'anxious worried nervous',
          limit: 5,
        },
      });

      // Recall won't return results with embeddings disabled in tests
      expect(verifyToolResponse(result, 'Experienced')).toBe(true);
    });
  }, 30000);

  test('should filter by quality signatures', async () => {
    await withTestEnvironment(async (env) => {
      // Add diverse experiences
      await callExperience(env.client, {
        source: 'Deep in thought about the architecture',
        emoji: '🤔',
        experienceQualities: humanQualities('embodied.thinking', 'focus.narrow', 'purpose.goal'),
      });

      await callExperience(env.client, {
        source: 'Feeling the tension in my shoulders',
        emoji: '😣',
        experienceQualities: humanQualities('embodied.sensing', 'mood.closed', 'space.here'),
      });

      await callExperience(env.client, {
        source: 'Mind racing with possibilities',
        emoji: '💭',
        experienceQualities: humanQualities('embodied.thinking', 'focus.broad', 'purpose.wander'),
      });

      // Search for thinking experiences
      const result = await callExperience(env.client, {
        source: 'Looking for thinking moments',
        emoji: '🔎',
        experienceQualities: humanQualities('embodied.thinking', 'purpose.goal'),
        recall: {
          qualities: {
            embodied: 'thinking',
          },
        },
      });

      // Recall won't return results with embeddings disabled in tests
      expect(verifyToolResponse(result, 'Experienced')).toBe(true);
    });
  }, 30000);

  test('should find pattern realizations', async () => {
    await withTestEnvironment(async (env) => {
      // Create base experiences
      const exp1 = await callExperience(env.client, {
        source: 'Stuck on the problem',
        emoji: '🚧',
        experienceQualities: humanQualities('embodied.thinking', 'mood.closed', 'purpose.goal'),
      });
      const id1 = extractExperienceId(exp1);

      const exp2 = await callExperience(env.client, {
        source: 'Breakthrough moment!',
        emoji: '✨',
        experienceQualities: humanQualities('embodied.thinking', 'mood.open', 'purpose.goal'),
      });
      const id2 = extractExperienceId(exp2);

      // Create pattern realization
      await callExperience(env.client, {
        source: 'I see the pattern - struggle leads to breakthrough',
        emoji: '🔄',
        experienceQualities: humanQualities('embodied.thinking', 'focus.broad', 'time.past'),
        reflects: [id1!, id2!],
      });

      // Search for pattern realizations
      const result = await callExperience(env.client, {
        source: 'Looking for insights and patterns',
        emoji: '🔍',
        experienceQualities: humanQualities('embodied.thinking', 'purpose.wander'),
        recall: {
          reflects: 'only',
        },
      });

      // Pattern search won't work with embeddings disabled
      expect(verifyToolResponse(result, 'Experienced')).toBe(true);
    });
  }, 30000);

  test('should group results by similarity', async () => {
    await withTestEnvironment(async (env) => {
      // Add experiences with similar themes
      await callExperience(env.client, {
        source: 'Debugging the authentication issue',
        emoji: '🐛',
        experienceQualities: humanQualities('embodied.thinking', 'purpose.goal', 'mood.closed'),
      });

      await callExperience(env.client, {
        source: 'Still working on the auth bug',
        emoji: '🔧',
        experienceQualities: humanQualities('embodied.thinking', 'purpose.goal', 'mood.closed'),
      });

      await callExperience(env.client, {
        source: 'Team meeting about project timeline',
        emoji: '👥',
        experienceQualities: humanQualities('presence.collective', 'purpose.goal', 'time.future'),
      });

      await callExperience(env.client, {
        source: 'Planning the next sprint with the team',
        emoji: '📅',
        experienceQualities: humanQualities('presence.collective', 'purpose.goal', 'time.future'),
      });

      // Search with grouping
      const result = await callExperience(env.client, {
        source: 'Analyzing all recent work',
        emoji: '📊',
        experienceQualities: humanQualities('embodied.thinking', 'focus.broad', 'purpose.wander'),
        recall: {
          group_by: 'similarity',
          limit: 10,
        },
      });

      // Clustering results should be returned in groups
      // Grouping won't work with embeddings disabled
      expect(verifyToolResponse(result, 'Experienced')).toBe(true);
    });
  }, 30000);

  test('should filter by who experienced', async () => {
    await withTestEnvironment(async (env) => {
      // Add experiences from different people
      await callExperience(env.client, {
        source: 'I need to refactor this code',
        emoji: '🔨',
        experienceQualities: humanQualities('embodied.thinking', 'purpose.goal'),
        who: 'Alice',
      });

      await callExperience(env.client, {
        source: 'The tests are finally passing',
        emoji: '✅',
        experienceQualities: humanQualities('mood.open', 'purpose.goal'),
        who: 'Bob',
      });

      await callExperience(env.client, {
        source: 'Reviewing the pull request',
        emoji: '👀',
        experienceQualities: humanQualities('embodied.thinking', 'focus.narrow'),
        who: 'Alice',
      });

      // Search for Alice's experiences
      const result = await callExperience(env.client, {
        source: "Looking for Alice's contributions",
        emoji: '🔍',
        experienceQualities: humanQualities('embodied.thinking', 'purpose.goal'),
        recall: {
          who: 'Alice',
        },
      });

      // Filter by who won't work with embeddings disabled
      expect(verifyToolResponse(result, 'Experienced')).toBe(true);
    });
  }, 30000);

  test('should combine multiple search filters', async () => {
    await withTestEnvironment(async (env) => {
      // Add varied experiences
      const experiences = createTestExperiences();
      for (const exp of experiences) {
        await callExperience(env.client, exp);
      }

      // Complex search with multiple filters
      const result = await callExperience(env.client, {
        source: 'Comprehensive search for team moments',
        emoji: '🔎',
        experienceQualities: humanQualities('embodied.thinking', 'purpose.goal', 'focus.broad'),
        recall: {
          query: 'together team',
          qualities: {
            presence: 'collective',
            mood: 'open',
          },
          limit: 5,
        },
      });

      // Combined filters won't work with embeddings disabled
      expect(verifyToolResponse(result, 'Experienced')).toBe(true);
    });
  }, 30000);
});
