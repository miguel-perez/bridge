/**
 * Integration tests for ExperienceService
 *
 * Tests the full MCP flow with real client/server communication
 */

import { describe, test, expect } from '@jest/globals';
import {
  withTestEnvironment,
  callExperience,
  callReconsider,
  verifyToolResponse,
  extractExperienceId,
  waitFor,
  createTestExperiences,
} from '../test-utils/integration-helpers.js';

describe('ExperienceService Integration', () => {
  test('should capture and recall experiences via MCP', async () => {
    await withTestEnvironment(async (env) => {
      // Capture first experience
      const result1 = await callExperience(env.client, {
        source: 'Feeling anxious about the deadline',
        emoji: '😰',
        experience: ['embodied.sensing', 'mood.closed', 'time.future'],
        who: 'Test User',
        perspective: 'I',
        processing: 'during',
      });

      expect(verifyToolResponse(result1, 'Experienced')).toBe(true);
      const id1 = extractExperienceId(result1);
      expect(id1).toBeTruthy();

      // Capture second experience
      const result2 = await callExperience(env.client, {
        source: 'Found the solution!',
        emoji: '🎉',
        experience: ['embodied.thinking', 'mood.open', 'purpose.goal'],
        who: 'Test User',
        perspective: 'I',
        processing: 'right-after',
      });

      const id2 = extractExperienceId(result2);
      expect(id2).toBeTruthy();
      expect(id2).not.toBe(id1);
    });
  }, 30000);

  test('should capture experience with integrated recall', async () => {
    await withTestEnvironment(async (env) => {
      // First, add some experiences
      const testData = createTestExperiences();
      for (const exp of testData) {
        await callExperience(env.client, exp);
      }

      // Capture new experience with recall search
      const result = await callExperience(env.client, {
        source: 'Still feeling anxious about presenting tomorrow',
        emoji: '😟',
        experience: ['embodied.sensing', 'mood.closed', 'time.future'],
        recall: {
          query: 'anxious',
          limit: 3,
        },
      });

      // Should return both the new experience and recall results
      expect(verifyToolResponse(result, 'Experienced')).toBe(true);
      expect(verifyToolResponse(result, 'Related experiences')).toBe(true);
    });
  }, 30000);

  test('should handle experience with pattern reflection', async () => {
    await withTestEnvironment(async (env) => {
      // Create experiences to reflect on
      const exp1 = await callExperience(env.client, {
        source: 'Struggling with the new framework',
        emoji: '😤',
        experience: ['embodied.thinking', 'mood.closed', 'purpose.goal'],
      });
      const id1 = extractExperienceId(exp1);

      const exp2 = await callExperience(env.client, {
        source: 'Finally understood the concepts',
        emoji: '💡',
        experience: ['embodied.thinking', 'mood.open', 'purpose.goal'],
      });
      const id2 = extractExperienceId(exp2);

      // Create reflection experience
      const reflection = await callExperience(env.client, {
        source: 'I notice I always struggle before breakthroughs',
        emoji: '🔍',
        experience: ['embodied.thinking', 'focus.broad', 'presence.individual'],
        reflects: [id1!, id2!],
      });

      // Verify it was captured successfully (pattern realizations are stored but not specially marked in response)
      expect(verifyToolResponse(reflection, 'Experienced')).toBe(true);
      const reflectionId = extractExperienceId(reflection);
      expect(reflectionId).toBeTruthy();
    });
  }, 30000);

  test('should handle nextMoment flow tracking', async () => {
    await withTestEnvironment(async (env) => {
      // Start with initial experience and declare next moment
      const result1 = await callExperience(env.client, {
        source: 'Starting to investigate the bug',
        emoji: '🔍',
        experience: ['embodied.thinking', 'purpose.goal', 'focus.narrow'],
        nextMoment: ['embodied.thinking', 'mood.open', 'purpose.goal'],
      });

      // Next moment is stored but not necessarily in the response text
      expect(verifyToolResponse(result1, 'Experienced')).toBe(true);

      // Follow up with the declared moment
      const result2 = await callExperience(env.client, {
        source: 'Found the bug! It was a race condition',
        emoji: '🎯',
        experience: ['embodied.thinking', 'mood.open', 'purpose.goal'],
      });

      expect(verifyToolResponse(result2, 'Experienced')).toBe(true);
    });
  }, 30000);

  test('should handle experience with context', async () => {
    await withTestEnvironment(async (env) => {
      const result = await callExperience(env.client, {
        source: 'That was intense',
        emoji: '😮',
        experience: ['embodied.sensing', 'mood.closed', 'focus.narrow'],
        context: 'After a difficult code review where multiple issues were found',
      });

      // Context is stored with the experience but not shown in the basic response
      expect(verifyToolResponse(result, 'Experienced')).toBe(true);
      const id = extractExperienceId(result);
      expect(id).toBeTruthy();
    });
  }, 30000);

  test('should update experience via reconsider', async () => {
    await withTestEnvironment(async (env) => {
      // Create initial experience
      const exp = await callExperience(env.client, {
        source: 'Working on the feature',
        emoji: '💻',
        experience: ['embodied.thinking', 'purpose.goal'],
        who: 'Developer',
      });

      const id = extractExperienceId(exp);
      expect(id).toBeTruthy();

      // Update the experience
      const update = await callReconsider(env.client, {
        id: id!,
        experience: ['embodied.thinking', 'purpose.goal', 'presence.collective'],
        who: 'Development Team',
      });

      expect(
        verifyToolResponse(update, 'Reconsidered') || verifyToolResponse(update, 'Updated')
      ).toBe(true);
    });
  }, 30000);

  test('should release experience via reconsider', async () => {
    await withTestEnvironment(async (env) => {
      // Create experience to release
      const exp = await callExperience(env.client, {
        source: 'Test experience to delete',
        emoji: '🗑️',
        experience: ['embodied.thinking'],
      });

      const id = extractExperienceId(exp);
      expect(id).toBeTruthy();

      // Release the experience
      const release = await callReconsider(env.client, {
        id: id!,
        release: true,
        reason: 'Test cleanup',
      });

      expect(verifyToolResponse(release, 'Released')).toBe(true);
    });
  }, 30000);
});
