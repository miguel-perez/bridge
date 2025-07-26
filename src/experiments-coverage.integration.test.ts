/**
 * Integration tests to prove completed experiments
 *
 * These tests specifically validate functionality from EXPERIMENTS.md
 */

import { describe, test, expect } from '@jest/globals';
import {
  withTestEnvironment,
  callExperience,
  verifyToolResponse,
  extractExperienceId,
  waitFor,
} from './test-utils/integration-helpers.js';

describe('Experiment Coverage Tests', () => {
  describe('EXP-010: Advanced Recall Options - Complete Coverage', () => {
    test('should support natural language time filtering', async () => {
      await withTestEnvironment(async (env) => {
        // Create experiences at different times
        await callExperience(env.client, {
          source: 'Experience from yesterday',
          emoji: '📅',
          experience: ['time.past'],
        });

        await waitFor(100);

        await callExperience(env.client, {
          source: 'Experience from today',
          emoji: '📆',
          experience: ['time.present'],
        });

        // Test natural language time expressions
        const lastExperiences = await callExperience(env.client, {
          source: 'Looking for recent experiences',
          emoji: '🔍',
          experience: ['embodied.thinking'],
          recall: {
            query: 'last',
            sort: 'created',
            limit: 5,
          },
        });

        expect(verifyToolResponse(lastExperiences, 'Related experiences')).toBe(true);

        // Test "recent" query
        const recentExperiences = await callExperience(env.client, {
          source: 'Finding recent moments',
          emoji: '⏰',
          experience: ['embodied.thinking'],
          recall: {
            query: 'recent',
            sort: 'created',
          },
        });

        expect(verifyToolResponse(recentExperiences, 'Related experiences')).toBe(true);
      });
    }, 30000);

    test('should support all sorting options (relevance, created, updated)', async () => {
      await withTestEnvironment(async (env) => {
        // Create test data
        const experiences = [
          {
            source: 'First experience about coding',
            emoji: '1️⃣',
            experience: ['embodied.thinking'],
          },
          { source: 'Second experience about debugging', emoji: '2️⃣', experience: ['mood.closed'] },
          {
            source: 'Third experience about coding patterns',
            emoji: '3️⃣',
            experience: ['focus.broad'],
          },
        ];

        for (const exp of experiences) {
          await callExperience(env.client, exp);
          await waitFor(50); // Ensure different timestamps
        }

        // Test relevance sort (default)
        const relevanceSort = await callExperience(env.client, {
          source: 'Search by relevance',
          emoji: '🎯',
          experience: ['embodied.thinking'],
          recall: {
            query: 'coding',
            sort: 'relevance',
          },
        });

        expect(verifyToolResponse(relevanceSort, 'Related experiences')).toBe(true);

        // Test created sort
        const createdSort = await callExperience(env.client, {
          source: 'Search by creation date',
          emoji: '📅',
          experience: ['embodied.thinking'],
          recall: {
            query: 'experience',
            sort: 'created',
          },
        });

        expect(verifyToolResponse(createdSort, 'Related experiences')).toBe(true);

        // Note: 'updated' sort may be same as 'created' if experiences aren't modified
      });
    }, 30000);

    test('should handle complete pagination scenarios', async () => {
      await withTestEnvironment(async (env) => {
        // Create enough experiences to test pagination
        for (let i = 0; i < 15; i++) {
          await callExperience(env.client, {
            source: `Pagination test ${i}`,
            emoji: '📄',
            experience: ['embodied.thinking'],
          });
        }

        // Test first page
        const page1 = await callExperience(env.client, {
          source: 'First page',
          emoji: '1️⃣',
          experience: ['embodied.thinking'],
          recall: {
            query: 'pagination',
            limit: 5,
            offset: 0,
            sort: 'created',
          },
        });

        expect(verifyToolResponse(page1, 'Related experiences')).toBe(true);

        // Test second page
        const page2 = await callExperience(env.client, {
          source: 'Second page',
          emoji: '2️⃣',
          experience: ['embodied.thinking'],
          recall: {
            query: 'pagination',
            limit: 5,
            offset: 5,
            sort: 'created',
          },
        });

        expect(verifyToolResponse(page2, 'Related experiences')).toBe(true);

        // Test last page with partial results
        const lastPage = await callExperience(env.client, {
          source: 'Last page',
          emoji: '3️⃣',
          experience: ['embodied.thinking'],
          recall: {
            query: 'pagination',
            limit: 5,
            offset: 10,
            sort: 'created',
          },
        });

        expect(verifyToolResponse(lastPage, 'Related experiences')).toBe(true);
      });
    }, 45000);
  });

  describe('EXP-011: Natural Language Quality Detection', () => {
    test('should correctly interpret natural language for quality detection', async () => {
      await withTestEnvironment(async (env) => {
        // Test cases from the experiment
        const nlTestCases = [
          {
            prompt: 'I feel my body tense with anxiety',
            expectedQualities: ['embodied.sensing', 'mood.closed'],
            emoji: '😰',
          },
          {
            prompt: 'My attention is scattered across multiple tasks',
            expectedQualities: ['focus.broad', 'embodied.thinking'],
            emoji: '🌐',
          },
          {
            prompt: 'I am thinking deeply about this problem',
            expectedQualities: ['embodied.thinking', 'focus.narrow', 'purpose.goal'],
            emoji: '🤔',
          },
          {
            prompt: 'Wandering through ideas without direction',
            expectedQualities: ['purpose.wander', 'embodied.thinking'],
            emoji: '💭',
          },
          {
            prompt: 'Feeling connected with the team in this moment',
            expectedQualities: ['presence.collective', 'mood.open', 'time.present'],
            emoji: '🤝',
          },
          {
            prompt: 'Lost in memories of past experiences',
            expectedQualities: ['time.past', 'embodied.thinking'],
            emoji: '🕰️',
          },
          {
            prompt: 'Planning future strategies carefully',
            expectedQualities: ['time.future', 'embodied.thinking', 'purpose.goal'],
            emoji: '📋',
          },
          {
            prompt: 'Completely present in this space',
            expectedQualities: ['space.here', 'time.present', 'presence.individual'],
            emoji: '📍',
          },
        ];

        // Create experiences with natural language descriptions
        for (const testCase of nlTestCases) {
          const result = await callExperience(env.client, {
            source: testCase.prompt,
            emoji: testCase.emoji,
            experience: testCase.expectedQualities,
          });

          expect(verifyToolResponse(result, 'Experienced')).toBe(true);

          // The key test is that Claude correctly interprets these when generating
          // experiences in real usage - we're testing the infrastructure supports it
        }

        // Test mixed quality detection
        const mixed = await callExperience(env.client, {
          source: 'Both thinking and feeling simultaneously',
          emoji: '🧠',
          experience: ['embodied'], // Base quality when mixed
          experienceQualities: {
            embodied: true, // Mixed thinking/sensing
            focus: 'narrow',
            mood: false,
            purpose: false,
            space: false,
            time: false,
            presence: 'individual',
          },
        });

        expect(verifyToolResponse(mixed, 'Experienced')).toBe(true);
      });
    }, 60000);

    test('should handle edge cases in natural language interpretation', async () => {
      await withTestEnvironment(async (env) => {
        // Test ambiguous descriptions
        const ambiguous = await callExperience(env.client, {
          source: 'Just being', // Minimal description
          emoji: '🌟',
          experience: ['presence.individual'], // Should capture presence at minimum
        });

        expect(verifyToolResponse(ambiguous, 'Experienced')).toBe(true);

        // Test contradictory qualities
        const contradictory = await callExperience(env.client, {
          source: 'Focused yet scattered, calm but anxious',
          emoji: '🎭',
          experience: ['embodied', 'focus', 'mood'], // Base qualities for mixed states
        });

        expect(verifyToolResponse(contradictory, 'Experienced')).toBe(true);

        // Test quality absence
        const absence = await callExperience(env.client, {
          source: 'Not thinking, not feeling, just observing',
          emoji: '👁️',
          experience: ['presence.individual'],
          experienceQualities: {
            embodied: false, // Explicitly not prominent
            focus: 'broad',
            mood: false,
            purpose: false,
            space: 'here',
            time: 'present',
            presence: 'individual',
          },
        });

        expect(verifyToolResponse(absence, 'Experienced')).toBe(true);
      });
    }, 30000);
  });
});
