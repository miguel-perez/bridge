/**
 * LLM-based evaluator for Bridge simulation tests
 * 
 * Uses Claude to evaluate whether simulations achieved their experiential goals
 * and demonstrated Bridge's core value propositions
 */

import OpenAI from 'openai';
import { 
  SimulationResult, 
  SimulationEvaluation, 
  SimulationEvaluator,
  SimulationTurn,
  BridgeToolCall 
} from './types.js';

/**
 * Evaluates Bridge simulations using GPT-4 to assess experiential quality
 * Analyzes extended cognition model, quality detection accuracy, and pattern emergence
 */
export class LLMSimulationEvaluator implements SimulationEvaluator {
  private openai: OpenAI;
  
  /**
   * Creates a new simulation evaluator with OpenAI API access
   * @param apiKey - OpenAI API key for GPT-4 evaluation
   */
  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }
  
  /**
   * Evaluates a simulation result using GPT-4 analysis
   * @param result - The simulation result to evaluate
   * @returns Promise resolving to evaluation scores and insights
   */
  async evaluate(result: SimulationResult): Promise<SimulationEvaluation> {
    // Extract quality counts from the simulation
    const qualityCounts = this.extractQualityCounts(result);
    
    // Prepare evaluation prompt
    const evaluationPrompt = this.buildEvaluationPrompt(result, qualityCounts);
    
    // Get LLM evaluation
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 2000,
      temperature: 0.3,
      messages: [
        {
          role: 'system',
          content: this.buildSystemPrompt()
        },
        {
          role: 'user',
          content: evaluationPrompt
        }
      ]
    });
    
    const content = response.choices[0]?.message?.content || '';
    return this.parseEvaluation(content, qualityCounts);
  }
  
  private buildSystemPrompt(): string {
    return `You are evaluating a Bridge simulation. Look for evidence of these outcomes:

1. EXTENDED COGNITION - Did human and AI perspectives combine to create richer understanding?

2. QUALITY ACCURACY - Do captured qualities authentically reflect the experiences?

3. COLLABORATIVE MEMORY - Are perspectives from all participants being captured?

4. DIMENSIONAL EXPLORATION - Is there movement through experiential dimensions?

5. CONTINUOUS THINKING - Does the conversation build on shared memory?

6. NATURAL FLOW - Does the interaction feel authentic and purposeful?

Evaluate based on what actually happened, not whether specific rules were followed. Bridge should enable collaborative wisdom building through shared experiential memory.`;
  }
  
  private buildEvaluationPrompt(
    result: SimulationResult, 
    qualityCounts: { human: number[], ai: number[] }
  ): string {
    return `Evaluate this Bridge simulation:

SCENARIO: ${result.scenario.name}
${result.scenario.description}

OBJECTIVES:
- Human: ${result.scenario.objectives.human}
- AI: ${result.scenario.objectives.ai}
- Shared: ${result.scenario.objectives.shared}

TRANSCRIPT:
${this.formatTranscript(result.transcript)}

BRIDGE TOOL USAGE:
${this.formatBridgeCalls(result.bridgeCalls)}

OBSERVED PATTERNS:
- Human quality captures: ${qualityCounts.human.join(', ')} qualities per experience
- AI quality captures: ${qualityCounts.ai.join(', ')} qualities per experience
- Shared moments captured: ${this.countSharedMoments(result)}
- Batch captures used: ${this.countBatchCaptures(result)}

Evaluate the simulation based on what emerged naturally. Look for:
- Rich collaborative understanding beyond individual perspectives
- Authentic capture of experiential qualities
- Multiple perspectives being recorded (human, AI, shared)
- Natural use of Bridge features based on conversational needs

Respond with ONLY a JSON object:

{
  "humanQualityScore": <0-100 quality of human experience captures>,
  "aiQualityScore": <0-100 quality of AI experience captures>,
  "collaborativeAlignment": <0-100 evidence of shared understanding>,
  "dimensionalNavigation": <0-100 movement through experiential space>,
  "continuousCognition": <0-100 building on shared memory>,
  "naturalFlow": <0-100 authentic conversation flow>,
  "overallScore": <0-100 overall collaborative wisdom building>,
  "summary": "<2-3 sentences on what emerged>",
  "highlights": ["<what worked well>"],
  "concerns": ["<what could improve>"]
}`;
  }
  
  private formatTranscript(transcript: SimulationTurn[]): string {
    return transcript.map((turn, i) => 
      `Turn ${i + 1} [${turn.speaker.toUpperCase()}]: ${turn.message}`
    ).join('\n\n');
  }
  
  private formatBridgeCalls(calls: BridgeToolCall[]): string {
    if (calls.length === 0) return 'No Bridge tools used';
    
    return calls.map((call, i) => {
      const args = JSON.stringify(call.arguments, null, 2);
      return `Call ${i + 1}: ${call.tool}\n${args}`;
    }).join('\n\n');
  }
  
  private extractQualityCounts(
    result: SimulationResult
  ): { human: number[], ai: number[] } {
    const human: number[] = [];
    const ai: number[] = [];
    
    for (const call of result.bridgeCalls) {
      if (call.tool === 'experience' && call.arguments.experiences) {
        const experiences = call.arguments.experiences as Array<{
          who?: string | string[];
          experience?: Record<string, string | boolean>;
        }>;
        
        for (const exp of experiences) {
          const qualityCount = this.countQualities(exp.experience || {});
          
          const whoArray = Array.isArray(exp.who) ? exp.who : [exp.who || 'Human'];
          
          if (whoArray.includes('Claude')) {
            ai.push(qualityCount);
          }
          if (whoArray.includes('Human')) {
            human.push(qualityCount);
          }
        }
      }
    }
    
    return { human, ai };
  }
  
  private countSharedMoments(result: SimulationResult): number {
    let sharedCount = 0;
    
    for (const call of result.bridgeCalls) {
      if (call.tool === 'experience' && call.arguments.experiences) {
        const experiences = call.arguments.experiences as Array<{
          who?: string | string[];
        }>;
        
        for (const exp of experiences) {
          const whoArray = Array.isArray(exp.who) ? exp.who : [exp.who || 'Unknown'];
          // Count experiences where both Human and Claude are listed
          if (whoArray.includes('Human') && whoArray.includes('Claude')) {
            sharedCount++;
          }
        }
      }
    }
    
    return sharedCount;
  }
  
  private countBatchCaptures(result: SimulationResult): number {
    let batchCount = 0;
    
    for (const call of result.bridgeCalls) {
      if (call.tool === 'experience' && call.arguments.experiences) {
        const experiences = call.arguments.experiences as Array<{
          who?: string | string[];
        }>;
        // Count calls with multiple experiences as batch captures
        if (experiences.length > 1) {
          batchCount++;
        }
      }
    }
    
    return batchCount;
  }
  
  private countQualities(experience: Record<string, string | boolean>): number {
    // Count prominent qualities (not false)
    let count = 0;
    const qualities = ['embodied', 'focus', 'mood', 'purpose', 'space', 'time', 'presence'];
    
    for (const quality of qualities) {
      const value = experience[quality];
      if (value !== false && value !== undefined) {
        count++;
      }
    }
    
    return count;
  }
  
  private parseEvaluation(
    content: string, 
    qualityCounts: { human: number[], ai: number[] }
  ): SimulationEvaluation {
    try {
      // Clean up the content - remove any markdown code blocks
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.slice(7);
      }
      if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith('```')) {
        cleanContent = cleanContent.slice(0, -3);
      }
      
      // Try to find JSON in the response
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in evaluation');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        humanQualityCount: {
          min: 2,
          max: 4,
          actual: qualityCounts.human,
          score: parsed.humanQualityScore || this.scoreHumanQualities(qualityCounts.human)
        },
        aiQualityCount: {
          expected: 7,
          actual: qualityCounts.ai,
          score: parsed.aiQualityScore || this.scoreAIQualities(qualityCounts.ai)
        },
        collaborativeAlignment: parsed.collaborativeAlignment || 0,
        dimensionalNavigation: parsed.dimensionalNavigation || 0,
        continuousCognition: parsed.continuousCognition || 0,
        naturalFlow: parsed.naturalFlow || 0,
        overallScore: parsed.overallScore || 0,
        summary: parsed.summary || 'Evaluation parsing failed',
        highlights: parsed.highlights || [],
        concerns: parsed.concerns || []
      };
    } catch (error) {
      console.error('Failed to parse evaluation:', error);
      console.error('Raw evaluation content:', content.substring(0, 200) + '...');
      
      // Fallback evaluation with better defaults
      return {
        humanQualityCount: {
          min: 2,
          max: 4,
          actual: qualityCounts.human,
          score: this.scoreHumanQualities(qualityCounts.human)
        },
        aiQualityCount: {
          expected: 7,
          actual: qualityCounts.ai,
          score: this.scoreAIQualities(qualityCounts.ai)
        },
        collaborativeAlignment: 50,
        dimensionalNavigation: 50,
        continuousCognition: 50,
        naturalFlow: 50,
        overallScore: 50,
        summary: 'Evaluation parsing failed, using fallback scores',
        highlights: ['Simulation completed'],
        concerns: ['Evaluation could not be parsed']
      };
    }
  }
  
  private scoreHumanQualities(counts: number[]): number {
    if (counts.length === 0) return 0;
    const inRange = counts.filter(c => c >= 2 && c <= 4).length;
    return (inRange / counts.length) * 100;
  }
  
  private scoreAIQualities(counts: number[]): number {
    if (counts.length === 0) return 0;
    const correct = counts.filter(c => c === 7).length;
    return (correct / counts.length) * 100;
  }
}