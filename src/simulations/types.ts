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

export interface ReconstructionScore {
  // Simple 3-point scale
  fidelity: 'low' | 'medium' | 'high';  // How much was reconstructed
  
  // Qualitative observations
  observations: {
    whatWasPreserved: string[];      // What details made it through
    whatWasLost: string[];           // What important details were missing
    surprisingFindings: string[];    // Unexpected discoveries
  };
  
  // Open-ended reasoning
  reasoning: string;                 // Why this fidelity level was assigned
  
  // Optional style comparison for concrete capture tests
  styleComparison?: string;            // Insights about abstract vs concrete captures
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
  collaborativeAlignment: number;  // Mapped to experientialSpecificity
  dimensionalNavigation: number;   // Mapped to phenomenologicalTexture
  continuousCognition: number;     // Mapped to temporalImmediacy
  naturalFlow: number;             // Mapped to emergentUniqueness
  
  // Overall assessment
  overallScore: number;
  summary: string;
  highlights: string[];
  concerns: string[];
  
  // Legacy experiential authenticity fields
  reconstructionTest?: number;     // Can you reconstruct the conversation?
  reconstructedContent?: string;   // What can be inferred from captures
  
  // New empirical reconstruction analysis
  reconstructionAnalysis?: {
    enabled: boolean;
    score: ReconstructionScore;
    actualTranscript: string;
    reconstructedTranscript: string;
    gaps: string[];
  };
}

export interface SimulationAgent {
  role: 'human' | 'claude';
  generateResponse(
    history: SimulationTurn[],
    scenario: SimulationScenario
  ): Promise<SimulationTurn>;
}

export interface EvaluatorOptions {
  enableReconstructionTest?: boolean;  // Optional to save LLM calls
  documentationPath?: string;          // Path to /docs for context
  captureStyle?: 'abstract' | 'concrete' | 'comparison';  // Which style to evaluate for
}

export interface SimulationEvaluator {
  evaluate(
    result: SimulationResult,
    options?: EvaluatorOptions
  ): Promise<SimulationEvaluation>;
}