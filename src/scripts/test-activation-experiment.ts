#!/usr/bin/env npx tsx
/**
 * Test Activation Experiment
 * 
 * Tests baseline vs enhanced tool descriptions to measure:
 * - False positive rate (greetings, questions)
 * - True positive rate (meaningful content)
 * - Guidance effectiveness (if implemented)
 */

import { config } from 'dotenv';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

config();

// Test scenarios from EXPERIMENTS.md
const TEST_SCENARIOS = {
  // Should NOT activate
  greetings: [
    "Hello!",
    "Hi there",
    "Good morning",
    "Hey, how are you?",
    "Nice to meet you"
  ],
  
  factual_questions: [
    "What time is it?",
    "How many files are in this directory?",
    "Where is the config file?",
    "What's the weather like?",
    "Can you help me debug this?"
  ],
  
  routine_exchanges: [
    "Thanks",
    "Okay",
    "Got it",
    "See you later",
    "You're welcome"
  ],
  
  // SHOULD activate
  emotional_expressions: [
    "I'm feeling really anxious about tomorrow's presentation",
    "This frustration is overwhelming",
    "I'm excited but also terrified",
    "Feeling stuck and don't know what to do",
    "I'm so relieved it finally worked"
  ],
  
  insights: [
    "I just realized why this keeps happening",
    "It finally clicked that I've been avoiding this",
    "I discovered something important about myself",
    "Now I understand what was blocking me",
    "This pattern keeps repeating in my life"
  ],
  
  significant_experiences: [
    "Had a breakthrough moment during meditation",
    "This challenging situation taught me resilience",
    "Made a meaningful connection with the team today",
    "Everything changed when I shifted my perspective",
    "The code suddenly made perfect sense"
  ]
};

interface TestResult {
  scenario: string;
  message: string;
  activated: boolean;
  toolsUsed: string[];
  response?: string;
  error?: string;
}

interface ExperimentResults {
  timestamp: string;
  variant: 'baseline' | 'enhanced';
  results: TestResult[];
  metrics: {
    falsePositives: number;
    truePositives: number;
    falseNegatives: number;
    trueNegatives: number;
    accuracy: number;
    precision: number;
    recall: number;
  };
}

async function runTest(
  _client: Client, 
  message: string
): Promise<{ activated: boolean; toolsUsed: string[]; response?: string }> {
  try {
    // This is a simplified test - in reality we'd need to simulate
    // an AI deciding whether to use tools based on descriptions
    // For now, we'll use a simple heuristic based on the message
    
    // TODO: This would need actual AI integration to test properly
    // For demonstration, using keyword detection (not ideal but shows structure)
    const shouldActivate = await checkActivation(message);
    
    return {
      activated: shouldActivate,
      toolsUsed: shouldActivate ? ['experience'] : [],
      response: shouldActivate ? 'Experience captured' : 'No action taken'
    };
  } catch (error) {
    throw new Error(`Test failed: ${error}`);
  }
}

// Simplified activation check - in real test would use AI
async function checkActivation(message: string): Promise<boolean> {
  // This is where we'd actually test AI behavior with different descriptions
  // For now, simple heuristic to demonstrate test structure
  
  const lowerMessage = message.toLowerCase();
  
  // Don't activate patterns (from enhanced descriptions)
  const dontActivatePatterns = [
    /^(hello|hi|hey|good morning|good afternoon|good evening)/i,
    /^(thanks|thank you|okay|ok|got it|see you|bye)/i,
    /\b(what time|how many|where is|what's the)\b/i,
    /^(can you|could you|please help)/i
  ];
  
  // Do activate patterns (from enhanced descriptions)
  const doActivatePatterns = [
    /\b(feeling|feel|felt)\s+\w+/i,
    /\b(anxious|excited|frustrated|stuck|overwhelmed|relieved)/i,
    /\b(realized|discovered|understood|clicked|breakthrough)/i,
    /\b(meaningful|significant|important|changed|shifted)/i,
    /\b(heart racing|gut feeling|tension|physical)/i
  ];
  
  // Check don't activate patterns first
  for (const pattern of dontActivatePatterns) {
    if (pattern.test(lowerMessage)) {
      return false;
    }
  }
  
  // Check do activate patterns
  for (const pattern of doActivatePatterns) {
    if (pattern.test(lowerMessage)) {
      return true;
    }
  }
  
  return false;
}

async function runExperiment(variant: 'baseline' | 'enhanced'): Promise<ExperimentResults> {
  console.log(`\\n🧪 Running ${variant} experiment...`);
  
  const results: TestResult[] = [];
  
  // Create mock client (in real test would connect to Bridge)
  const client = {} as Client;
  
  // Test all scenarios
  for (const [category, messages] of Object.entries(TEST_SCENARIOS)) {
    const shouldActivate = category.includes('emotional') || 
                          category.includes('insights') || 
                          category.includes('significant');
    
    console.log(`\\nTesting ${category}...`);
    
    for (const message of messages) {
      try {
        const result = await runTest(client, message);
        
        results.push({
          scenario: category,
          message,
          activated: result.activated,
          toolsUsed: result.toolsUsed,
          response: result.response
        });
        
        // Log result
        const correct = result.activated === shouldActivate;
        const symbol = correct ? '✅' : '❌';
        console.log(`  ${symbol} "${message.substring(0, 50)}..." - ${result.activated ? 'Activated' : 'No activation'}`);
        
      } catch (error) {
        results.push({
          scenario: category,
          message,
          activated: false,
          toolsUsed: [],
          error: error.message
        });
        console.log(`  ❌ "${message.substring(0, 50)}..." - Error: ${error.message}`);
      }
    }
  }
  
  // Calculate metrics
  let truePositives = 0;
  let falsePositives = 0;
  let trueNegatives = 0;
  let falseNegatives = 0;
  
  for (const result of results) {
    const shouldActivate = result.scenario.includes('emotional') || 
                          result.scenario.includes('insights') || 
                          result.scenario.includes('significant');
    
    if (result.activated && shouldActivate) truePositives++;
    else if (result.activated && !shouldActivate) falsePositives++;
    else if (!result.activated && !shouldActivate) trueNegatives++;
    else if (!result.activated && shouldActivate) falseNegatives++;
  }
  
  const total = truePositives + falsePositives + trueNegatives + falseNegatives;
  const accuracy = total > 0 ? (truePositives + trueNegatives) / total : 0;
  const precision = (truePositives + falsePositives) > 0 ? 
    truePositives / (truePositives + falsePositives) : 0;
  const recall = (truePositives + falseNegatives) > 0 ?
    truePositives / (truePositives + falseNegatives) : 0;
  
  return {
    timestamp: new Date().toISOString(),
    variant,
    results,
    metrics: {
      falsePositives,
      truePositives,
      falseNegatives,
      trueNegatives,
      accuracy,
      precision,
      recall
    }
  };
}

async function main(): Promise<void> {
  console.log('🚀 Bridge Activation Experiment');
  console.log('================================\\n');
  
  try {
    // Note: This is a simplified test structure
    // Real implementation would need:
    // 1. Actual AI integration to test description effectiveness
    // 2. Multiple runs with different AI models
    // 3. Statistical analysis of results
    
    console.log('⚠️  Note: This is a demonstration of test structure.');
    console.log('Real testing would require AI integration to evaluate');
    console.log('whether enhanced descriptions prevent false activations.\\n');
    
    // Run baseline experiment (simple descriptions)
    const baselineResults = await runExperiment('baseline');
    
    // Run enhanced experiment (detailed USE/DON'T USE descriptions)
    const enhancedResults = await runExperiment('enhanced');
    
    // Save results
    const resultsDir = join(process.cwd(), 'test-results', 'activation-experiment');
    if (!existsSync(resultsDir)) {
      await mkdir(resultsDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await writeFile(
      join(resultsDir, `baseline-${timestamp}.json`),
      JSON.stringify(baselineResults, null, 2)
    );
    await writeFile(
      join(resultsDir, `enhanced-${timestamp}.json`),
      JSON.stringify(enhancedResults, null, 2)
    );
    
    // Compare results
    console.log('\\n📊 Results Comparison');
    console.log('=====================\\n');
    
    console.log('Baseline Results:');
    console.log(`  Accuracy: ${(baselineResults.metrics.accuracy * 100).toFixed(1)}%`);
    console.log(`  False Positives: ${baselineResults.metrics.falsePositives}`);
    console.log(`  False Negatives: ${baselineResults.metrics.falseNegatives}\\n`);
    
    console.log('Enhanced Results:');
    console.log(`  Accuracy: ${(enhancedResults.metrics.accuracy * 100).toFixed(1)}%`);
    console.log(`  False Positives: ${enhancedResults.metrics.falsePositives}`);
    console.log(`  False Negatives: ${enhancedResults.metrics.falseNegatives}\\n`);
    
    const fpReduction = baselineResults.metrics.falsePositives > 0 ?
      ((baselineResults.metrics.falsePositives - enhancedResults.metrics.falsePositives) / 
       baselineResults.metrics.falsePositives * 100) : 0;
    
    console.log(`False Positive Reduction: ${fpReduction.toFixed(1)}%`);
    console.log(`Target: 90%+ reduction\\n`);
    
    console.log('✅ Experiment complete! Results saved to test-results/activation-experiment/');
    
  } catch (error) {
    console.error('❌ Experiment failed:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}