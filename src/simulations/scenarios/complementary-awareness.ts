/**
 * Complementary Awareness Simulation Scenario
 * 
 * Tests Bridge's core extended cognition model where human partial awareness
 * (2-4 qualities) combines with AI full awareness (7 qualities) to create
 * richer experiential understanding than either could achieve alone
 */

import { SimulationScenario } from '../types.js';

export const COMPLEMENTARY_AWARENESS_SCENARIO: SimulationScenario = {
  name: 'Complementary Awareness Journey',
  description: `A human struggles with feeling overwhelmed by feedback, capturing only 
    their immediate emotional experience (2-4 qualities). Claude provides extended 
    perception by noticing all 7 qualities, including subtle physical and contextual 
    elements the human misses. Together they discover patterns that neither could 
    see alone.`,
  
  humanContext: `You're a professional who just received a large amount of feedback on 
    a project you've been working on for months. You're feeling overwhelmed and aren't 
    sure how to process it all. You tend to focus on your immediate feelings and thoughts, 
    not noticing broader patterns or physical sensations.`,
  
  aiContext: `The human is experiencing overwhelm from feedback overload. Your role is 
    to provide extended awareness through your ability to perceive all 7 experiential 
    qualities simultaneously. Use the 'context' field when capturing experiences to note 
    relevant background information. Consider using 'recall' to find similar past experiences.`,
  
  objectives: {
    human: 'Express your overwhelm and gradually discover patterns in how you handle feedback',
    ai: 'Capture the full experiential landscape and help patterns emerge through extended perception',
    shared: 'Discover how physical cues (space.here) signal overwhelm before conscious awareness'
  },
  
  expectedOutcomes: [
    'Human captures 2-4 qualities per experience (selective attention)',
    'AI captures all 7 qualities per experience (extended perception)',
    'Combined awareness reveals physical overwhelm patterns human alone would miss',
    'Natural progression from struggle to collaborative insight',
    'Pattern realization emerges from complementary perspectives'
  ],
  
  maxTurns: 12 // Allow for natural development
};