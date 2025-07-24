/**
 * Test Scenarios for Bridge
 *
 * This file contains DRY test scenarios that reduce redundancy while
 * maintaining comprehensive test coverage for all Bridge operations.
 */

import { TestScenario } from './test-runner.js';

// ============================================================================
// TEST SCENARIO BUILDERS
// ============================================================================

/**
 * Creates a simple experience capture turn
 */
function experienceTurn(
  userContent: string,
  assistantPrefix = "I'll capture that experience"
): TestScenario['turns'] {
  return [
    { role: 'user', content: userContent },
    { role: 'assistant', content: `${assistantPrefix}.`, expectedTools: ['experience'] },
  ];
}

/**
 * Creates a recall turn
 */
function recallTurn(
  userContent: string,
  assistantPrefix = "I'll search for"
): TestScenario['turns'] {
  return [
    { role: 'user', content: userContent },
    { role: 'assistant', content: `${assistantPrefix} that.`, expectedTools: ['recall'] },
  ];
}

/**
 * Creates a reconsider turn
 */
function reconsiderTurn(
  userContent: string,
  assistantPrefix = "I'll update that experience"
): TestScenario['turns'] {
  return [
    { role: 'user', content: userContent },
    { role: 'assistant', content: `${assistantPrefix}.`, expectedTools: ['reconsider'] },
  ];
}

/**
 * Creates a release turn
 */
function releaseTurn(
  userContent: string,
  assistantPrefix = "I'll release that experience"
): TestScenario['turns'] {
  return [
    { role: 'user', content: userContent },
    { role: 'assistant', content: `${assistantPrefix}.`, expectedTools: ['release'] },
  ];
}

// ============================================================================
// TEST SCENARIOS
// ============================================================================

export const SCENARIOS: Record<string, TestScenario> = {
  // Core operations test - covers all 4 tools in one scenario
  'core-operations': {
    description: 'Test all core Bridge operations in sequence',
    turns: [
      ...experienceTurn('I feel anxious about the presentation tomorrow'),
      ...recallTurn('What have I experienced about anxiety?'),
      ...reconsiderTurn(
        "Actually, I realize it's excitement, not anxiety",
        "That's a great reframe! I'll update"
      ),
      ...releaseTurn('Delete my test experiences', "I'll help you clean up"),
    ],
  },

  // Quality detection test - covers main quality types efficiently
  'quality-detection': {
    description: 'Test quality detection across all dimensions',
    turns: [
      // Test each quality dimension with clear examples
      ...experienceTurn('I am thinking deeply about this problem'), // embodied.thinking
      ...experienceTurn('I feel the tension in my shoulders'), // embodied.sensing
      ...experienceTurn('I am laser focused on this task'), // focus.narrow
      ...experienceTurn('My attention is spread across many things'), // focus.broad
      ...experienceTurn('I feel open and receptive'), // mood.open
      ...experienceTurn('I feel closed off and defensive'), // mood.closed
      ...experienceTurn('I am working toward a specific goal'), // purpose.goal
      ...experienceTurn('I am exploring without a specific aim'), // purpose.wander
      ...experienceTurn('I am fully present in this room'), // space.here
      ...experienceTurn('My mind is elsewhere'), // space.there
      ...experienceTurn('I keep thinking about what happened yesterday'), // time.past
      ...experienceTurn('I am planning for tomorrow'), // time.future
      ...experienceTurn('I am working alone on this'), // presence.individual
      ...experienceTurn('We are collaborating on this together'), // presence.collective
    ],
  },

  // Advanced recall test - covers filtering, sorting, clustering
  'advanced-recall': {
    description: 'Test advanced recall features comprehensively',
    turns: [
      // Setup: Create diverse experiences
      ...experienceTurn('Feeling anxious about the deadline'),
      ...experienceTurn('Feeling anxious about the meeting'),
      ...experienceTurn('Feeling excited about the project'),

      // Test different recall modes
      ...recallTurn('Show me experiences about anxiety'), // Semantic search
      ...recallTurn('Show me experiences with mood.closed'), // Quality filter
      ...recallTurn('Show me clusters of similar experiences'), // Clustering
      ...recallTurn('Show me my most recent 3 experiences'), // Sorting & limit
      ...recallTurn('Show me pattern realizations'), // Reflects filter
    ],
  },

  // Evolution test - covers reconsider and pattern recognition
  'experience-evolution': {
    description: 'Test how experiences evolve and connect',
    turns: [
      ...experienceTurn('I feel stuck on this problem'),
      ...experienceTurn('Still feeling stuck after trying different approaches'),
      ...reconsiderTurn(
        "I realize I wasn't stuck - I was processing",
        "Great insight! I'll update"
      ),
      ...experienceTurn('I see a pattern: what feels like being stuck is often deep processing'),
      ...recallTurn('Show me my patterns about being stuck'),
    ],
  },

  // Crafted vs raw content test
  'content-types': {
    description: 'Test different content types and processing modes',
    turns: [
      ...experienceTurn('Blog post: "My morning routine starts with meditation..."'),
      ...experienceTurn('Journal: feeling overwhelmed by all the tasks'),
      ...recallTurn('Show me only my crafted content'),
      ...recallTurn('Show me only my raw experiences'),
    ],
  },
};

// ============================================================================
// SCENARIO GROUPS FOR DIFFERENT TESTING NEEDS
// ============================================================================

export const SCENARIO_GROUPS = {
  // Minimal test suite - just core functionality
  minimal: ['core-operations'],

  // Standard test suite - good coverage without redundancy
  standard: ['core-operations', 'quality-detection', 'advanced-recall'],

  // Comprehensive test suite - all scenarios
  comprehensive: Object.keys(SCENARIOS),

  // Quick smoke test - verify basic functionality
  smoke: ['core-operations'],

  // Quality-focused tests
  quality: ['quality-detection', 'advanced-recall'],

  // Evolution-focused tests
  evolution: ['experience-evolution', 'content-types'],
};

// ============================================================================
// REDUCED COMPLEXITY SCENARIOS
// ============================================================================

/**
 * Ultra-minimal scenarios for rate-limited environments
 * Each scenario has maximum 4 turns to minimize API calls
 */
export const MINIMAL_SCENARIOS: Record<string, TestScenario> = {
  'basic-flow': {
    description: 'Test basic experience and recall',
    turns: [
      ...experienceTurn('Feeling excited about the new project'),
      ...recallTurn('What am I excited about?'),
    ],
  },

  'quality-basics': {
    description: 'Test basic quality detection',
    turns: [
      ...experienceTurn('I am deeply focused on solving this problem'),
      ...recallTurn('Show me experiences with focus.narrow'),
    ],
  },

  'update-flow': {
    description: 'Test experience updates',
    turns: [
      ...experienceTurn('Feeling confused'),
      ...reconsiderTurn('Actually, I was just learning something new'),
    ],
  },
};
