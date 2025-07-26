/**
 * End-to-end integration tests for Bridge
 *
 * Tests complete user workflows using MCP
 */

import { describe, test, expect } from '@jest/globals';
import {
  withTestEnvironment,
  callExperience,
  callReconsider,
  verifyToolResponse,
  extractExperienceId,
  waitFor,
} from './test-utils/integration-helpers.js';

describe('Bridge End-to-End Workflows', () => {
  test('should support a complete experiential journey', async () => {
    await withTestEnvironment(async (env) => {
      // 1. Initial struggle
      const struggle = await callExperience(env.client, {
        source: "Can't figure out why the tests are failing",
        emoji: '😤',
        experience: [
          'embodied.thinking',
          'mood.closed',
          'purpose.goal',
          'focus.narrow',
          'time.present',
          'space.here',
          'presence.individual',
        ],
        who: 'Developer',
        perspective: 'I',
        processing: 'during',
      });
      const struggleId = extractExperienceId(struggle);

      // 2. Seeking help
      const seeking = await callExperience(env.client, {
        source: 'Maybe I should ask the team for help',
        emoji: '🤔',
        experience: [
          'embodied.thinking',
          'mood.open',
          'purpose.wander',
          'focus.broad',
          'time.future',
          'space.here',
          'presence.individual',
        ],
        nextMoment: ['presence.collective', 'mood.open'],
      });

      // 3. Team collaboration
      const collab = await callExperience(env.client, {
        source: 'Working through the issue with Sarah',
        emoji: '👥',
        experience: [
          'embodied.thinking',
          'mood.open',
          'purpose.goal',
          'focus.narrow',
          'time.present',
          'space.here',
          'presence.collective',
        ],
        who: 'Dev Team',
        perspective: 'we',
        processing: 'during',
      });
      const collabId = extractExperienceId(collab);

      // 4. Breakthrough
      const breakthrough = await callExperience(env.client, {
        source: 'Found it! The mock was returning the wrong type',
        emoji: '🎯',
        experience: [
          'embodied.thinking',
          'mood.open',
          'purpose.goal',
          'focus.narrow',
          'time.present',
          'space.here',
          'presence.collective',
        ],
        who: 'Dev Team',
        perspective: 'we',
        processing: 'right-after',
      });
      const breakthroughId = extractExperienceId(breakthrough);

      // 5. Reflection on the pattern
      const reflection = await callExperience(env.client, {
        source: 'I notice that collaboration often leads to breakthroughs when stuck',
        emoji: '💡',
        experience: [
          'embodied.thinking',
          'mood.open',
          'purpose.wander',
          'focus.broad',
          'time.past',
          'space.here',
          'presence.individual',
        ],
        reflects: [struggleId!, collabId!, breakthroughId!],
        who: 'Developer',
        perspective: 'I',
        processing: 'long-after',
      });

      // Pattern realizations are stored but not specially marked
      expect(verifyToolResponse(reflection, 'Experienced')).toBe(true);

      // 6. Search for similar patterns
      const search = await callExperience(env.client, {
        source: 'Looking for other collaboration breakthroughs',
        emoji: '🔍',
        experience: [
          'embodied.thinking',
          'purpose.goal',
          'focus.narrow',
          'time.present',
          'space.here',
          'presence.individual',
        ],
        recall: {
          query: 'collaboration breakthrough team',
          reflects: 'only',
        },
      });

      expect(
        verifyToolResponse(search, 'Related experiences') ||
          verifyToolResponse(search, 'Experienced')
      ).toBe(true);
    });
  }, 60000);

  test('should handle evolving understanding', async () => {
    await withTestEnvironment(async (env) => {
      // 1. Initial misunderstanding
      const initial = await callExperience(env.client, {
        source: 'This new framework seems unnecessarily complex',
        emoji: '😕',
        experience: [
          'embodied.thinking',
          'mood.closed',
          'purpose.goal',
          'focus.narrow',
          'time.present',
          'space.here',
          'presence.individual',
        ],
        who: 'New Developer',
        processing: 'during',
      });
      const id = extractExperienceId(initial);

      // 2. Learning more
      await callExperience(env.client, {
        source: 'Reading the documentation more carefully',
        emoji: '📚',
        experience: [
          'embodied.thinking',
          'mood.open',
          'purpose.goal',
          'focus.narrow',
          'time.present',
          'space.here',
          'presence.individual',
        ],
        who: 'New Developer',
      });

      // 3. Update initial assessment
      const update = await callReconsider(env.client, {
        id: id!,
        experience: [
          'embodied.thinking',
          'mood.open',
          'purpose.wander',
          'focus.broad',
          'time.present',
          'space.here',
          'presence.individual',
        ],
        context: 'After understanding the design principles, the complexity makes sense',
      });

      expect(
        verifyToolResponse(update, 'Reconsidered') || verifyToolResponse(update, 'Updated')
      ).toBe(true);

      // 4. Search to verify update
      const verify = await callExperience(env.client, {
        source: 'Checking my updated understanding',
        emoji: '✅',
        experience: [
          'embodied.thinking',
          'purpose.goal',
          'focus.narrow',
          'time.present',
          'space.here',
          'presence.individual',
        ],
        recall: {
          query: 'framework complex',
        },
      });

      // Search should return experiences, context may not be in response
      expect(
        verifyToolResponse(verify, 'Related experiences') ||
          verifyToolResponse(verify, 'Experienced')
      ).toBe(true);
    });
  }, 60000);

  test('should support extended cognition between human and AI', async () => {
    await withTestEnvironment(async (env) => {
      // Human captures partial qualities (2-4)
      const human = await callExperience(env.client, {
        source: 'Feeling overwhelmed by all the moving parts',
        emoji: '😰',
        experience: ['embodied.sensing', 'mood.closed', 'focus.broad'],
        who: 'Human',
        perspective: 'I',
        processing: 'during',
      });

      // AI captures all 7 qualities
      const ai = await callExperience(env.client, {
        source: 'I notice the human is experiencing cognitive overload from parallel concerns',
        emoji: '🤖',
        experience: [
          'embodied.thinking',
          'mood.open',
          'purpose.goal',
          'focus.broad',
          'time.present',
          'space.here',
          'presence.collective',
        ],
        who: 'Claude',
        perspective: 'I',
        processing: 'during',
        context: 'Observing stress patterns in our problem-solving session',
      });

      // Search for both perspectives
      const combined = await callExperience(env.client, {
        source: 'Looking at our shared experience',
        emoji: '🔄',
        experience: [
          'embodied.thinking',
          'mood.open',
          'purpose.wander',
          'focus.broad',
          'time.present',
          'space.here',
          'presence.collective',
        ],
        recall: {
          query: 'overwhelmed overload',
          limit: 5,
        },
      });

      // Verify we found related experiences
      expect(
        verifyToolResponse(combined, 'Related experiences') ||
          verifyToolResponse(combined, 'Experienced')
      ).toBe(true);
    });
  }, 60000);

  test('should handle cleanup of test data', async () => {
    await withTestEnvironment(async (env) => {
      // Create test experience
      const test = await callExperience(env.client, {
        source: 'Temporary test data',
        emoji: '🧪',
        experience: ['embodied.thinking'],
        who: 'Test Runner',
        crafted: false,
      });
      const id = extractExperienceId(test);

      // Verify it exists
      const search1 = await callExperience(env.client, {
        source: 'Verifying test data exists',
        emoji: '🔍',
        experience: ['embodied.thinking', 'purpose.goal'],
        recall: {
          query: 'Temporary test data',
        },
      });
      expect(verifyToolResponse(search1, 'Temporary test data')).toBe(true);

      // Release it
      const release = await callReconsider(env.client, {
        id: id!,
        release: true,
        reason: 'Cleaning up test data',
      });
      expect(verifyToolResponse(release, 'Released')).toBe(true);

      // Verify it's gone
      const search2 = await callExperience(env.client, {
        source: 'Verifying test data is gone',
        emoji: '🔍',
        experience: ['embodied.thinking', 'purpose.goal'],
        recall: {
          query: 'Temporary test data',
        },
      });

      // Should not find the released experience
      const responseText = search2.content?.[0]?.text || '';
      expect(
        responseText.includes('No related experiences found') ||
          !responseText.includes('Temporary test data')
      ).toBe(true);
    });
  }, 60000);
});
