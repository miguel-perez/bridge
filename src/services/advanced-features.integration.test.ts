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
} from '../test-utils/integration-helpers.js';

describe('Advanced Features Integration', () => {
  test('should handle multiple experiences in batch', async () => {
    await withTestEnvironment(async (env) => {
      // Test batch experience capture
      const result = await env.client.callTool({
        name: 'experience',
        arguments: {
          experiences: [
            {
              anchor: '🔍',
              embodied: 'my mind works through this analytically',
              focus: 'narrowing in on the issue',
              mood: 'determined',
              purpose: 'finding the solution',
              space: 'deep in investigation',
              time: 'starting the search',
              presence: 'working alone',
              who: ['Investigator', 'Claude'],
              citation: 'Starting investigation'
            },
            {
              anchor: '🔎',
              embodied: 'excitement building',
              focus: 'honing in on a clue',
              mood: 'curious and receptive',
              purpose: 'following the lead',
              space: 'closer to answer',
              time: 'making progress',
              presence: 'still solo',
              who: ['Investigator', 'Claude'],
              citation: 'Found a clue'
            },
          ],
        },
      });

      expect(result.content).toBeDefined();
      expect(result.isError).toBeFalsy();
    });
  }, 30000);

  test('should handle recall with date filtering', async () => {
    await withTestEnvironment(async (env) => {
      // Create experiences
      await callExperience(env.client, {
        anchor: '📅',
        embodied: 'marking this moment',
        focus: 'on the present',
        mood: 'neutral',
        purpose: 'documenting now',
        space: 'right here',
        time: 'this moment',
        presence: 'present alone',
        who: ['Timekeeper', 'Claude'],
        citation: 'Recent experience'
      });

      // Search with date filter (even though it won't return results in test mode)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const result = await env.client.callTool({
        name: 'experience',
        arguments: {
          experiences: [{
            anchor: '🔍',
            embodied: 'searching through time',
            focus: 'on recent memories',
            mood: 'methodical',
            purpose: 'finding recent items',
            space: 'in temporal search',
            time: 'looking backward',
            presence: 'searching alone',
            who: ['Searcher', 'Claude'],
            citation: 'Searching recent experiences',
            recall: {
              created: {
                start: yesterday.toISOString().split('T')[0],
                end: new Date().toISOString().split('T')[0],
              },
            }
          }]
        }
      });

      expect(result.content).toBeDefined();
    });
  }, 30000);

  test('should handle full quality expressions', async () => {
    await withTestEnvironment(async (env) => {
      // Test the full quality expression format
      const result = await callExperience(env.client, {
        anchor: '🎛️',
        embodied: 'analyzing this systematically, mind sharp and clear',
        focus: 'taking in multiple perspectives while staying centered',
        mood: 'welcoming whatever emerges from this exploration',
        purpose: 'pushing toward completion of this understanding',
        space: 'in this exact spot at my desk',
        time: 'right now in this moment',
        presence: 'just me in this, working solo',
        who: ['Analyst', 'Claude'],
        citation: 'Testing full quality expressions'
      });

      expect(verifyToolResponse(result, 'Experience Captured')).toBe(true);
    });
  }, 30000);

  test('should handle recall with simple query', async () => {
    await withTestEnvironment(async (env) => {
      // Add varied experiences
      await callExperience(env.client, {
        anchor: '😤',
        embodied: 'frustration building in my chest',
        focus: 'stuck on this one thing',
        mood: 'closed and irritated',
        purpose: 'need to solve this',
        space: 'trapped at desk',
        time: 'been too long',
        presence: 'struggling alone',
        who: ['Developer', 'Claude'],
        citation: 'So frustrated with this bug'
      });

      await callExperience(env.client, {
        anchor: '😌',
        embodied: 'feeling calm and centered',
        focus: 'taking it all in',
        mood: 'open and peaceful',
        purpose: 'just being present',
        space: 'comfortable here',
        time: 'no rush',
        presence: 'content alone',
        who: ['Developer', 'Claude'],
        citation: 'Feeling peaceful after meditation'
      });

      // Simple query-based recall
      const result = await callExperience(env.client, {
        anchor: '🔍',
        embodied: 'searching through experiences',
        focus: 'looking for patterns',
        mood: 'curious',
        purpose: 'understanding emotions',
        space: 'in reflection',
        time: 'reviewing past',
        presence: 'analyzing alone',
        who: ['Developer', 'Claude'],
        citation: 'Looking for emotional experiences',
        recall: {
          query: 'frustrated peaceful emotions',
          limit: 10
        }
      });

      expect(result.content).toBeDefined();
    });
  }, 30000);

  test('should handle experiences with minimal qualities', async () => {
    await withTestEnvironment(async (env) => {
      // Test minimal experience - API might validate that some qualities must be present
      const result = await callExperience(env.client, {
        anchor: '🕳️',
        embodied: false,
        focus: false,
        mood: false,
        purpose: false,
        space: false,
        time: false,
        presence: 'existing minimally',
        who: ['Minimalist', 'Claude'],
        citation: 'Minimal experience'
      });

      // API might reject or accept minimal experiences
      expect(result.content).toBeDefined();
      if (result.isError) {
        // If error, should explain why
        const responseText = (result.content as Array<{ text: string }>)[0].text;
        expect(responseText).toContain('Error');
      } else {
        // Otherwise should succeed
        expect(verifyToolResponse(result, 'Experience Captured')).toBe(true);
      }
    });
  }, 30000);

  test('should handle citation with special characters', async () => {
    await withTestEnvironment(async (env) => {
      const result = await callExperience(env.client, {
        anchor: '🔤',
        embodied: 'processing special text',
        focus: 'on character handling',
        mood: 'technical',
        purpose: 'testing edge cases',
        space: 'in test mode',
        time: 'during testing',
        presence: 'testing alone',
        who: ['Tester', 'Claude'],
        citation: 'Testing "quotes", \'apostrophes\', \n newlines, and 特殊字符'
      });

      expect(verifyToolResponse(result, 'Experience Captured')).toBe(true);
    });
  }, 30000);

  test('should handle different who array combinations', async () => {
    await withTestEnvironment(async (env) => {
      // Test various who combinations
      const combinations = [
        ['Alice', 'Claude'],
        ['Bob', 'Claude', 'Alice'],
        ['Team', 'GPT-4'],
        ['Everyone', 'Claude'],
        ['Test User', 'Claude', 'Assistant']
      ];

      for (const who of combinations) {
        const result = await callExperience(env.client, {
          anchor: '👥',
          embodied: 'experiencing together',
          focus: 'on collaboration',
          mood: 'cooperative',
          purpose: 'testing who arrays',
          space: 'shared space',
          time: 'now',
          presence: who.length > 2 ? 'group experience' : 'pair work',
          who: who,
          citation: `Experience with ${who.join(' and ')}`
        });

        expect(verifyToolResponse(result, 'Experience Captured')).toBe(true);
      }
    });
  }, 30000);

  test('should handle recall with default limit', async () => {
    await withTestEnvironment(async (env) => {
      // Add many experiences
      for (let i = 0; i < 30; i++) {
        await callExperience(env.client, {
          anchor: '🔢',
          embodied: `working on item ${i}`,
          focus: 'on this task',
          mood: 'steady',
          purpose: 'completing work',
          space: 'at station',
          time: `moment ${i}`,
          presence: 'working alone',
          who: ['Worker', 'Claude'],
          citation: `Task ${i}`
        });
      }

      // Recall without specifying limit (should use default of 25)
      const result = await callExperience(env.client, {
        anchor: '📊',
        embodied: 'reviewing everything',
        focus: 'broad overview',
        mood: 'analytical',
        purpose: 'understanding patterns',
        space: 'stepping back',
        time: 'after work',
        presence: 'analyzing alone',
        who: ['Analyst', 'Claude'],
        citation: 'Reviewing all tasks',
        recall: {
          query: 'task work'
        }
      });

      expect(result.content).toBeDefined();
    });
  }, 30000);
});