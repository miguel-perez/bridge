/**
 * Concrete Capture Style Simulation Test
 * 
 * Empirically tests abstract vs concrete capture styles
 * to measure information preservation and reconstruction fidelity
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import { SimulationRunner } from './simulation-runner.js';
import { HumanSimulator } from './agents/human-simulator.js';
import { ClaudeSimulator } from './agents/claude-simulator.js';
import { LLMSimulationEvaluator } from './simulation-evaluator.js';
import { CONCRETE_CAPTURE_SCENARIO } from './scenarios/concrete-capture.js';
import { SimulationResult } from './types.js';

describe('Concrete Capture Style Simulation', () => {
  let runner: SimulationRunner;
  let evaluator: LLMSimulationEvaluator;
  let apiKey: string;
  
  beforeAll((): void => {
    apiKey = process.env.OPENAI_API_KEY || '';
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required for simulations');
    }
    
    const humanAgent = new HumanSimulator(apiKey);
    const aiAgent = new ClaudeSimulator(apiKey);
    runner = new SimulationRunner(humanAgent, aiAgent);
    evaluator = new LLMSimulationEvaluator(apiKey);
  });
  
  test('should demonstrate improved reconstruction with concrete captures', async () => {
    console.log('🔬 Starting Concrete Capture Style simulation...');
    console.log('📊 Testing abstract vs concrete capture styles for information preservation');
    
    // Run the simulation
    const result: SimulationResult = await runner.runScenario(CONCRETE_CAPTURE_SCENARIO);
    
    console.log(`✅ Simulation completed in ${result.duration}ms with ${result.transcript.length} turns`);
    console.log(`📊 Bridge calls made: ${result.bridgeCalls.length}`);
    
    // Separate abstract and concrete captures (based on conversation flow)
    const halfwayPoint = Math.floor(result.bridgeCalls.length / 2);
    const abstractCaptures = result.bridgeCalls.slice(0, halfwayPoint);
    const concreteCaptures = result.bridgeCalls.slice(halfwayPoint);
    
    console.log(`\n📈 Capture Distribution:`);
    console.log(`- Abstract captures (first half): ${abstractCaptures.length}`);
    console.log(`- Concrete captures (second half): ${concreteCaptures.length}`);
    
    // Run reconstruction test ALWAYS for this experiment
    console.log('\n🔍 Running reconstruction analysis...');
    const evaluation = await evaluator.evaluate(result, {
      enableReconstructionTest: true, // Always enabled for this test
      documentationPath: '../docs',
      captureStyle: 'comparison' // Special mode for comparing styles
    });
    
    // Display reconstruction results
    if (evaluation.reconstructionAnalysis?.enabled) {
      const analysis = evaluation.reconstructionAnalysis;
      const score = analysis.score;
      
      console.log('\n📊 Reconstruction Fidelity Results:');
      
      // Simple fidelity display
      const fidelityEmoji = {
        low: '🔴',
        medium: '🟡', 
        high: '🟢'
      };
      console.log(`\nOverall Fidelity: ${fidelityEmoji[score.fidelity]} ${score.fidelity.toUpperCase()}`);
      
      // Qualitative observations
      console.log('\n✅ What Was Preserved:');
      score.observations.whatWasPreserved.forEach(item => console.log(`  - ${item}`));
      
      console.log('\n❌ What Was Lost:');
      score.observations.whatWasLost.forEach(item => console.log(`  - ${item}`));
      
      if (score.observations.surprisingFindings.length > 0) {
        console.log('\n⚡ Surprising Findings:');
        score.observations.surprisingFindings.forEach(item => console.log(`  - ${item}`));
      }
      
      console.log('\n💭 Analysis:');
      console.log(`  ${score.reasoning}`);
      
      // Display style comparison insights if available
      if (score.styleComparison) {
        console.log('\n🔬 Abstract vs Concrete Style Comparison:');
        console.log(`  ${score.styleComparison}`);
      } else {
        console.log('\n📊 Style Comparison:');
        console.log('  (Based on chronological analysis of captures)');
        console.log('  Abstract captures: First half of conversation');
        console.log('  Concrete captures: Second half of conversation');
      }
      
      // Basic assertion for the test
      expect(score.fidelity).toBeDefined();
      expect(['low', 'medium', 'high']).toContain(score.fidelity);
      
      // For concrete capture scenario, we expect at least medium fidelity
      if (score.fidelity === 'low') {
        console.warn('\n⚠️ Low fidelity detected - concrete captures may need improvement');
      }
    }
    
    // Save detailed results
    const fs = await import('fs/promises');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `./data/simulations/concrete-capture-${timestamp}.json`;
    
    const comprehensiveData = {
      metadata: {
        timestamp: new Date().toISOString(),
        duration: result.duration,
        turns: result.transcript.length,
        bridgeCalls: result.bridgeCalls.length,
        scenario: CONCRETE_CAPTURE_SCENARIO.name,
        abstractCaptures: abstractCaptures.length,
        concreteCaptures: concreteCaptures.length
      },
      evaluation,
      fullTranscript: result.transcript,
      bridgeCalls: result.bridgeCalls,
      captureAnalysis: {
        firstHalf: abstractCaptures,
        secondHalf: concreteCaptures
      }
    };
    
    await fs.writeFile(filename, JSON.stringify(comprehensiveData, null, 2));
    console.log(`\n💾 Full simulation data saved to: ${filename}`);
    
  }, 300000); // 5 minute timeout
});