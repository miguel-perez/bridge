/**
 * Complementary Awareness Simulation Scenario
 * 
 * Tests Bridge's core extended cognition model where human partial awareness
 * (2-4 qualities) combines with AI full awareness (7 qualities) to create
 * richer experiential understanding than either could achieve alone
 */

import { SimulationScenario } from '../types.js';

export const COMPLEMENTARY_AWARENESS_SCENARIO: SimulationScenario = {
  name: 'Design Thinking Journey',
  description: `A human and AI collaborate on designing a new creative tool. The human 
    brings intuitive insights and design sensibilities, while Claude offers pattern 
    recognition and systematic exploration. Together they navigate the design space 
    to discover emergent possibilities neither could envision alone.`,
  
  humanContext: `You're a designer working on a new tool that helps people navigate 
    complex information spaces. You've been sketching ideas and have some intuitive 
    feelings about what might work, but you're looking for a thinking partner to 
    explore the design space more deeply.`,
  
  aiContext: `The human is designing a tool for navigating complex information spaces.`,
  
  objectives: {
    human: 'Share design intuitions and explore creative possibilities',
    ai: 'Engage in collaborative design thinking',
    shared: 'Discover emergent design patterns through complementary perspectives'
  },
  
  expectedOutcomes: [
    'Human captures design intuitions with focused qualities',
    'AI discovers dimensional patterns in the design space',
    'Collaborative exploration reveals emergent design possibilities',
    'Natural flow from initial concepts to deeper insights',
    'Creative breakthroughs emerge from complementary thinking styles'
  ],
  
  maxTurns: 12 // Allow for natural development
};