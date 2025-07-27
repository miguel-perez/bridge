/**
 * Core simulation runner for Bridge experiential tests
 * 
 * Orchestrates conversations between simulated human and AI agents,
 * capturing Bridge tool usage and evaluating experiential quality
 */

import { 
  SimulationScenario, 
  SimulationResult, 
  SimulationTurn, 
  SimulationAgent,
  BridgeToolCall 
} from './types.js';
import { createTestEnvironment, TestEnvironment } from '../test-utils/integration-helpers.js';

/**
 * Runs Bridge simulations by orchestrating human and AI agents
 * Manages conversation flow, Bridge tool calls, and result collection
 */
export class SimulationRunner {
  private env?: TestEnvironment;
  private bridgeCalls: BridgeToolCall[] = [];
  private errors: Array<{
    turn: number;
    error: string;
    type: 'bridge_call' | 'agent_response' | 'evaluation';
  }> = [];
  
  /**
   * Creates a new simulation runner with human and AI agents
   * @param humanAgent - Agent representing human participant
   * @param aiAgent - Agent representing AI participant
   */
  constructor(
    private humanAgent: SimulationAgent,
    private aiAgent: SimulationAgent
  ) {}
  
  /**
   * Sets up the simulation environment and initializes state
   * Creates test environment and resets call/error tracking
   */
  async setup(): Promise<void> {
    this.env = await createTestEnvironment();
    this.bridgeCalls = [];
    this.errors = [];
  }
  
  /**
   * Cleans up simulation resources and test environment
   * Should be called after simulation completion
   */
  async teardown(): Promise<void> {
    if (this.env) {
      await this.env.cleanup();
    }
  }
  
  /**
   * Runs a complete simulation scenario with the configured agents
   * @param scenario - The simulation scenario to execute
   * @returns Promise resolving to simulation results and evaluation
   */
  async runScenario(scenario: SimulationScenario): Promise<SimulationResult> {
    const startTime = Date.now();
    const transcript: SimulationTurn[] = [];
    
    // Create simulation output directory
    const fs = await import('fs/promises');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const simDir = `./data/simulations/live-${timestamp}`;
    await fs.mkdir(simDir, { recursive: true });
    
    try {
      await this.setup();
      
      // Initial context setting (not part of transcript)
      console.log(`🎭 Starting simulation: ${scenario.name}`);
      console.log(`📁 Saving to: ${simDir}`);
      
      let currentSpeaker: 'human' | 'claude' = 'human';
      let turnCount = 0;
      
      while (turnCount < scenario.maxTurns) {
        const agent = currentSpeaker === 'human' ? this.humanAgent : this.aiAgent;
        
        // Generate next turn
        try {
          const turn = await agent.generateResponse(transcript, scenario);
          
          // Save turn immediately
          await fs.writeFile(
            `${simDir}/turn-${turnCount}-${currentSpeaker}.json`,
            JSON.stringify({
              turnNumber: turnCount,
              speaker: currentSpeaker,
              message: turn.message,
              internalThought: turn.internalThought,
              bridgeCalls: turn.bridgeCalls,
              timestamp: turn.timestamp
            }, null, 2)
          );
          
          console.log(`\n[Turn ${turnCount} - ${currentSpeaker.toUpperCase()}]`);
          console.log(`Thought: ${turn.internalThought}`);
          console.log(`Message: ${turn.message}`);
          
          // Execute any Bridge calls
          if (turn.bridgeCalls && turn.bridgeCalls.length > 0) {
            console.log(`Bridge calls: ${JSON.stringify(turn.bridgeCalls, null, 2)}`);
            for (const call of turn.bridgeCalls) {
              await this.executeBridgeCall(call);
              this.bridgeCalls.push(call);
            }
          }
          
          transcript.push(turn);
          
          // Save transcript after each turn
          await fs.writeFile(
            `${simDir}/transcript.json`,
            JSON.stringify(transcript, null, 2)
          );
        } catch (error) {
          this.errors.push({
            turn: turnCount,
            error: error instanceof Error ? error.message : 'Unknown error',
            type: 'agent_response'
          });
          console.error(`Error in turn ${turnCount} (${currentSpeaker}):`, error);
          // Add a placeholder turn to continue
          transcript.push({
            speaker: currentSpeaker,
            message: '[Error generating response]',
            timestamp: new Date()
          });
        }
        
        turnCount++;
        
        // Check for natural ending conditions
        if (this.isConversationComplete(transcript)) {
          console.log(`✅ Simulation completed naturally after ${turnCount} turns`);
          break;
        }
        
        // Alternate speakers
        currentSpeaker = currentSpeaker === 'human' ? 'claude' : 'human';
      }
      
      const duration = Date.now() - startTime;
      
      return {
        scenario,
        transcript,
        bridgeCalls: this.bridgeCalls,
        duration,
        errors: this.errors.length > 0 ? this.errors : undefined
      };
      
    } finally {
      await this.teardown();
    }
  }
  
  private async executeBridgeCall(call: BridgeToolCall): Promise<void> {
    if (!this.env) {
      throw new Error('Environment not initialized');
    }
    
    console.log(`\n🔧 Executing Bridge call:`, JSON.stringify({
      tool: call.tool,
      arguments: call.arguments
    }, null, 2));
    
    try {
      const result = await this.env.client.callTool({
        name: call.tool,
        arguments: call.arguments
      });
      
      call.result = result;
      console.log(`✅ Bridge call succeeded`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Bridge call failed: ${errorMessage}`);
      if (error instanceof Error && 'cause' in error) {
        console.error(`Cause:`, error.cause);
      }
      call.result = { error: errorMessage };
      
      this.errors.push({
        turn: this.bridgeCalls.length,
        error: errorMessage,
        type: 'bridge_call'
      });
    }
  }
  
  private isConversationComplete(
    transcript: SimulationTurn[]
  ): boolean {
    // Check if we've achieved the shared objective
    if (transcript.length < 4) {
      return false; // Need at least a few exchanges
    }
    
    // Look for natural ending signals
    const lastTurn = transcript[transcript.length - 1];
    const endingPhrases = [
      'that makes sense now',
      'i see the pattern',
      'thank you for helping',
      'this gives me a new perspective',
      'i understand better now'
    ];
    
    return endingPhrases.some(phrase => 
      lastTurn.message.toLowerCase().includes(phrase)
    );
  }
  
  /**
   * Extract quality counts from Bridge calls for evaluation
   */
  extractQualityCounts(): { human: number[], ai: number[] } {
    const human: number[] = [];
    const ai: number[] = [];
    
    for (const call of this.bridgeCalls) {
      if (call.tool === 'experience' && call.arguments.experiences) {
        const experiences = call.arguments.experiences as Array<{
          who?: string | string[];
          experience?: Record<string, string | boolean>;
        }>;
        
        for (const exp of experiences) {
          const qualityCount = this.countQualities(exp.experience || {});
          
          if (exp.who === 'Claude') {
            ai.push(qualityCount);
          } else {
            human.push(qualityCount);
          }
        }
      }
    }
    
    return { human, ai };
  }
  
  private countQualities(experience: Record<string, string | boolean>): number {
    // For AI, count all qualities present (even if false)
    // For humans, count only prominent qualities (not false)
    const qualities = ['embodied', 'focus', 'mood', 'purpose', 'space', 'time', 'presence'];
    let presentCount = 0;
    let prominentCount = 0;
    
    for (const quality of qualities) {
      const value = experience[quality];
      if (value !== undefined) {
        presentCount++;
        if (value !== false) {
          prominentCount++;
        }
      }
    }
    
    // If all 7 qualities are present, it's an AI capture (return total count)
    // Otherwise, it's a human capture (return only prominent qualities)
    return presentCount === 7 ? presentCount : prominentCount;
  }
}