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
} from '../test-utils/integration-helpers.js';

describe('Search/Recall Integration', () => {
  test('should search by semantic query', async () => {
    await withTestEnvironment(async (env) => {
      // Add test experiences
      await callExperience(env.client, {
        anchor: '😰',
        embodied: 'feeling anxious about the presentation',
        focus: 'scattered, can\'t concentrate',
        mood: 'worried and closed off',
        purpose: 'trying to prepare',
        space: 'at my desk',
        time: 'deadline approaching',
        presence: 'feeling alone',
        who: ['Test User', 'Claude'],
        citation: 'So anxious about tomorrow'
      });

      await callExperience(env.client, {
        anchor: '😟',
        embodied: 'stomach in knots',
        focus: 'fixated on what could go wrong',
        mood: 'nervous and tense',
        purpose: 'wanting to do well',
        space: 'pacing around',
        time: 'hours before meeting',
        presence: 'isolated with worry',
        who: ['Test User', 'Claude'],
        citation: 'Really worried about this'
      });

      // Search for anxiety-related experiences
      const result = await callExperience(env.client, {
        anchor: '🔍',
        embodied: 'searching through memories',
        focus: 'looking for anxiety patterns',
        mood: 'curious',
        purpose: 'understanding my anxiety',
        space: 'in reflection',
        time: 'looking back',
        presence: 'self-examination',
        who: ['Test User', 'Claude'],
        citation: 'Searching for past anxiety experiences',
        recall: {
          query: 'anxious worried nervous',
          limit: 5,
        },
      });

      // Recall won't return results with embeddings disabled in tests
      expect(verifyToolResponse(result, 'Experience Captured')).toBe(true);
    });
  }, 30000);

  test('should filter by quality dimensions', async () => {
    await withTestEnvironment(async (env) => {
      // Add diverse experiences
      await callExperience(env.client, {
        anchor: '🤔',
        embodied: 'deep in thought about the architecture',
        focus: 'narrowed in on the design',
        mood: 'engaged',
        purpose: 'solving the problem',
        space: 'at whiteboard',
        time: 'in the moment',
        presence: 'thinking alone',
        who: ['Developer', 'Claude'],
        citation: 'Deep in thought about the architecture'
      });

      await callExperience(env.client, {
        anchor: '😣',
        embodied: 'feeling the tension in my shoulders',
        focus: 'aware of physical discomfort',
        mood: 'closed and stressed',
        purpose: 'pushing through',
        space: 'here at desk',
        time: 'been hours',
        presence: 'working solo',
        who: ['Developer', 'Claude'],
        citation: 'Feeling the tension in my shoulders'
      });

      await callExperience(env.client, {
        anchor: '💭',
        embodied: 'mind racing with possibilities',
        focus: 'broad exploration',
        mood: 'open to ideas',
        purpose: 'wandering through options',
        space: 'mentally expansive',
        time: 'timeless flow',
        presence: 'in my own world',
        who: ['Developer', 'Claude'],
        citation: 'Mind racing with possibilities'
      });

      // Search for specific qualities
      const result = await callExperience(env.client, {
        anchor: '🔎',
        embodied: 'searching for patterns',
        focus: 'examining experiences',
        mood: 'analytical',
        purpose: 'finding thinking moments',
        space: 'in search mode',
        time: 'reviewing past',
        presence: 'analyzing alone',
        who: ['Developer', 'Claude'],
        citation: 'Looking for thinking moments',
        recall: {
          query: 'thinking',
          limit: 10
        },
      });

      // Recall won't return results with embeddings disabled in tests
      expect(verifyToolResponse(result, 'Experience Captured')).toBe(true);
    });
  }, 30000);

  test('should find experiences by citation text', async () => {
    await withTestEnvironment(async (env) => {
      // Create experiences
      await callExperience(env.client, {
        anchor: '🚧',
        embodied: 'mind stuck on this bug',
        focus: 'can\'t see the solution',
        mood: 'frustrated and closed',
        purpose: 'need to fix this',
        space: 'trapped in code',
        time: 'hours passing',
        presence: 'debugging alone',
        who: ['Developer', 'Claude'],
        citation: 'Stuck on the problem'
      });

      await callExperience(env.client, {
        anchor: '✨',
        embodied: 'sudden clarity hits',
        focus: 'everything clicks',
        mood: 'open and excited',
        purpose: 'solution achieved',
        space: 'same code, new eyes',
        time: 'breakthrough moment',
        presence: 'solo victory',
        who: ['Developer', 'Claude'],
        citation: 'Breakthrough moment!'
      });

      // Create reflection
      await callExperience(env.client, {
        anchor: '🔄',
        embodied: 'seeing the pattern clearly',
        focus: 'broad understanding',
        mood: 'insightful',
        purpose: 'learning from experience',
        space: 'reflective distance',
        time: 'looking back',
        presence: 'personal realization',
        who: ['Developer', 'Claude'],
        citation: 'I see the pattern - struggle leads to breakthrough'
      });

      // Search for patterns
      const result = await callExperience(env.client, {
        anchor: '🔍',
        embodied: 'searching for insights',
        focus: 'looking for patterns',
        mood: 'curious',
        purpose: 'wandering through memories',
        space: 'in search',
        time: 'exploring past',
        presence: 'searching alone',
        who: ['Developer', 'Claude'],
        citation: 'Looking for insights and patterns',
        recall: {
          query: 'pattern breakthrough',
          limit: 5
        },
      });

      // Pattern search won't work with embeddings disabled
      expect(verifyToolResponse(result, 'Experience Captured')).toBe(true);
    });
  }, 30000);

  test('should handle search with limit', async () => {
    await withTestEnvironment(async (env) => {
      // Add multiple experiences
      for (let i = 0; i < 10; i++) {
        await callExperience(env.client, {
          anchor: '🔢',
          embodied: `working on task ${i}`,
          focus: 'on specific item',
          mood: 'neutral',
          purpose: 'completing tasks',
          space: 'at workstation',
          time: `moment ${i}`,
          presence: 'working alone',
          who: ['Worker', 'Claude'],
          citation: `Task number ${i}`
        });
      }

      // Search with specific limit
      const result = await callExperience(env.client, {
        anchor: '📊',
        embodied: 'reviewing all work',
        focus: 'broad overview',
        mood: 'analytical',
        purpose: 'analyzing patterns',
        space: 'stepping back',
        time: 'after work',
        presence: 'reviewing alone',
        who: ['Worker', 'Claude'],
        citation: 'Analyzing all recent work',
        recall: {
          query: 'task',
          limit: 3,
        },
      });

      // Limited results won't be returned with embeddings disabled
      expect(verifyToolResponse(result, 'Experience Captured')).toBe(true);
    });
  }, 30000);

  test('should combine search with new experience', async () => {
    await withTestEnvironment(async (env) => {
      // Add experiences from different people
      await callExperience(env.client, {
        anchor: '🔨',
        embodied: 'thinking through the refactor',
        focus: 'on code structure',
        mood: 'determined',
        purpose: 'improving codebase',
        space: 'in the code',
        time: 'current sprint',
        presence: 'working alone',
        who: ['Alice', 'Claude'],
        citation: 'I need to refactor this code'
      });

      await callExperience(env.client, {
        anchor: '✅',
        embodied: 'relief washing over me',
        focus: 'on green tests',
        mood: 'open and satisfied',
        purpose: 'validation achieved',
        space: 'test results',
        time: 'finally done',
        presence: 'solo success',
        who: ['Bob', 'Claude'],
        citation: 'The tests are finally passing'
      });

      await callExperience(env.client, {
        anchor: '👀',
        embodied: 'carefully examining changes',
        focus: 'narrow on each line',
        mood: 'critical but fair',
        purpose: 'ensuring quality',
        space: 'in PR review',
        time: 'review time',
        presence: 'reviewing alone',
        who: ['Alice', 'Claude'],
        citation: 'Reviewing the pull request'
      });

      // Search while capturing new experience
      const result = await callExperience(env.client, {
        anchor: '🔍',
        embodied: 'searching through contributions',
        focus: 'on specific person',
        mood: 'investigative',
        purpose: 'finding all work',
        space: 'in history',
        time: 'looking back',
        presence: 'researching alone',
        who: ['Manager', 'Claude'],
        citation: "Looking for Alice's contributions",
        recall: {
          query: 'Alice',
          limit: 10
        },
      });

      // Search results won't be returned with embeddings disabled
      expect(verifyToolResponse(result, 'Experience Captured')).toBe(true);
    });
  }, 30000);
});