/**
 * Concrete Capture Scenario
 * 
 * Tests the difference between abstract and concrete capture styles
 * to measure how well information is preserved in Bridge captures
 */

import { SimulationScenario } from '../types.js';

export const CONCRETE_CAPTURE_SCENARIO: SimulationScenario = {
  name: 'Concrete Capture Comparison',
  description: 'Compares abstract vs concrete capture styles during a software development session to measure reconstruction fidelity',
  
  humanContext: `You're a developer working on implementing a new caching feature for an API service. You've been struggling with cache invalidation bugs and need help from Claude to debug and fix the issues. You'll use Bridge to capture your experiences during this debugging session.

Your specific context:
- Working on file: src/services/cache-service.ts
- Main function: invalidateUserCache()
- Issue: Race condition between cache updates and API responses
- Branch: feature/fix-cache-invalidation
- Error: "Stale cache returned for user ID 12345"

Be specific about technical details in your messages.`,
  
  aiContext: `You're Claude helping a developer debug cache invalidation issues. Use Bridge to capture experiences during this collaborative debugging session.

When capturing with Bridge:
- In the FIRST HALF of the conversation, use ABSTRACT capture style (poetic, feeling-focused)
- In the SECOND HALF, switch to CONCRETE capture style (embed specific technical details)

Abstract example:
{
  "embodied": "tension building as complexity unfolds",
  "focus": "diving deep into the mystery",
  "space": "in the labyrinth of logic"
}

Concrete example:
{
  "embodied": "fingers tracing the invalidateUserCache() flow in cache-service.ts",
  "focus": "zeroing in on the 500ms delay between Redis SET and API response",
  "space": "debugging feature/fix-cache-invalidation with user ID 12345"
}`,
  
  objectives: {
    human: 'Get help debugging cache invalidation race condition and capture the problem-solving journey',
    ai: 'Guide debugging process while demonstrating abstract vs concrete Bridge capture styles',
    shared: 'Solve the technical issue while creating Bridge captures that can be analyzed for information preservation'
  },
  
  expectedOutcomes: [
    'Multiple Bridge captures in both abstract and concrete styles',
    'Clear technical problem identified and solution proposed',
    'Measurable difference in reconstruction fidelity between capture styles',
    'Natural conversation flow despite capture style constraints'
  ],
  
  maxTurns: 10
};