/**
 * Types for Bridge simulation testing
 * 
 * Defines structures for experiential simulation tests that validate
 * Bridge's collaborative wisdom building through LLM-powered scenarios
 */

export interface SimulationTurn {
  speaker: 'human' | 'claude';
  message: string;
  internalThought?: string; // What the agent is thinking but not saying
  bridgeCalls?: BridgeToolCall[];
  timestamp: Date;
}

export interface BridgeToolCall {
  tool: 'experience' | 'reconsider';
  arguments: Record<string, unknown>;
  result: unknown;
}

export interface SimulationScenario {
  name: string;
  description: string;
  humanContext: string; // Background for human simulator
  aiContext: string;    // Background for AI simulator
  objectives: {
    human: string;
    ai: string;
    shared: string;
  };
  expectedOutcomes: string[];
  maxTurns: number;
}

export interface SimulationResult {
  scenario: SimulationScenario;
  transcript: SimulationTurn[];
  bridgeCalls: BridgeToolCall[];
  duration: number;
  evaluation?: SimulationEvaluation;
  errors?: Array<{
    turn: number;
    error: string;
    type: 'bridge_call' | 'agent_response' | 'evaluation';
  }>;
}

export interface SimulationEvaluation {
  // Core metrics (0-100)
  humanQualityCount: {
    min: number;
    max: number;
    actual: number[];
    score: number;
  };
  aiQualityCount: {
    expected: number;
    actual: number[];
    score: number;
  };
  complementaryValue: number;  // Do combined qualities > sum of parts?
  patternEmergence: number;    // Did meaningful insights arise?
  naturalFlow: number;         // Does conversation feel authentic?
  
  // Overall assessment
  overallScore: number;
  summary: string;
  highlights: string[];
  concerns: string[];
}

export interface SimulationAgent {
  role: 'human' | 'claude';
  generateResponse(
    history: SimulationTurn[],
    scenario: SimulationScenario
  ): Promise<SimulationTurn>;
}

export interface SimulationEvaluator {
  evaluate(
    result: SimulationResult
  ): Promise<SimulationEvaluation>;
}