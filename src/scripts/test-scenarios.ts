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
  // Semantic search test - validates embeddings are working
  'semantic-search': {
    description: 'Test semantic search with embeddings',
    turns: [
      ...experienceTurn('I am deeply analyzing this complex problem', "I'll capture that"),
      ...experienceTurn(
        'The solution involves careful thought and consideration',
        "I'll record that"
      ),
      ...recallTurn('problem analysis deep thinking', "I'll search for experiences about"),
    ],
  },

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

  // Progressive vector enhancement tests - validates EXP-014 architecture
  'vector-enhancement-basic': {
    description: 'Test progressive vector enhancement with basic search',
    turns: [
      ...experienceTurn('Working on implementing a new search algorithm'),
      ...experienceTurn('The algorithm uses vector embeddings for similarity'),
      ...recallTurn('search algorithm vector', 'Let me find experiences about'),
    ],
  },

  'embedding-provider-test': {
    description: 'Test embedding provider functionality',
    turns: [
      ...experienceTurn('Testing the new embedding provider integration'),
      ...experienceTurn('The provider generates high-quality semantic vectors'),
      ...recallTurn('embedding provider quality', "I'll search for related experiences about"),
    ],
  },

  'vector-store-scaling': {
    description: 'Test vector store scaling capabilities',
    turns: [
      ...experienceTurn('Scaling the vector database to handle more experiences'),
      ...experienceTurn('Performance remains fast even with thousands of entries'),
      ...recallTurn('scaling performance database', "I'll look for experiences about"),
    ],
  },

  'progressive-enhancement-flow': {
    description: 'Test progressive enhancement from zero-config to advanced search',
    turns: [
      // First test quality-only search (zero-config)
      ...experienceTurn('Starting with basic quality search without embeddings'),
      ...recallTurn('Show experiences with mood.open', "I'll find experiences using quality filtering"),
      // Then test with embeddings
      ...experienceTurn('Now testing semantic search with embeddings enabled'),
      ...recallTurn('happiness joy excitement', "I'll search semantically for"),
    ],
  },

  'claude-desktop-compatibility': {
    description: 'Test Claude Desktop compatibility with API-based embeddings',
    turns: [
      ...experienceTurn('Testing Bridge in Claude Desktop environment'),
      ...experienceTurn('API-based embeddings should work in restricted environment'),
      ...recallTurn('claude desktop restricted', "I'll search for experiences about"),
    ],
  },

  // Still thinking flow test - demonstrates the minimal flow tracking pattern
  'still-thinking-flow': {
    description: 'Test stillThinking parameter for multi-step exploration',
    turns: [
      {
        role: 'user',
        content:
          "I'm debugging a tricky authentication issue. Users are getting logged out randomly.",
      },
      {
        role: 'assistant',
        content:
          'Let me capture this initial observation and start exploring with stillThinking=true to track our investigation.',
        expectedTools: ['experience'],
      },
      {
        role: 'user',
        content: "Good idea. Let's search for similar issues we've encountered before.",
      },
      {
        role: 'assistant',
        content:
          "I'll search for related authentication and logout experiences with stillThinking=true to continue our investigation.",
        expectedTools: ['recall'],
      },
      {
        role: 'user',
        content: 'I just realized - it might be related to timezone differences in session expiry!',
      },
      {
        role: 'assistant',
        content:
          "That's a great insight! Let me capture this realization with stillThinking=false to mark our investigation as complete.",
        expectedTools: ['experience'],
      },
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
  standard: ['core-operations', 'quality-detection', 'advanced-recall', 'still-thinking-flow'],

  // Comprehensive test suite - all scenarios
  comprehensive: Object.keys(SCENARIOS),

  // Quick smoke test - verify basic functionality
  smoke: ['core-operations'],

  // Quality-focused tests
  quality: ['quality-detection', 'advanced-recall'],

  // Evolution-focused tests
  evolution: ['experience-evolution', 'content-types'],

  // Flow tracking tests
  flow: ['still-thinking-flow'],

  // Evidence for experiments - quick but comprehensive
  evidence: ['semantic-search', 'core-operations', 'vector-enhancement-basic'],
  
  // Evidence for EXP-014 - vector enhancement validation
  'exp-014': ['vector-enhancement-basic', 'embedding-provider-test', 'progressive-enhancement-flow'],

  // Vector enhancement tests (EXP-014)
  vector: [
    'vector-enhancement-basic',
    'embedding-provider-test', 
    'vector-store-scaling',
    'progressive-enhancement-flow',
    'claude-desktop-compatibility'
  ],
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

  'still-thinking-minimal': {
    description: 'Test minimal stillThinking flow',
    turns: [
      {
        role: 'user',
        content: "I'm investigating a bug. Let me start tracking this.",
      },
      {
        role: 'assistant',
        content: "I'll help you track this investigation using stillThinking.",
        expectedTools: ['experience'],
      },
    ],
  },
};
