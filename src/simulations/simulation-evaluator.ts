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
    return `You are an expert evaluator for Bridge experiential simulations. Bridge is a tool for collaborative wisdom building through shared experiential memory between humans and AI.

Your task is to evaluate simulations based on these criteria:

1. EXTENDED COGNITION MODEL
- Humans should capture 2-4 qualities (selective attention)
- AI should ALWAYS capture all 7 qualities (extended perception)
- Together they should create richer understanding than either alone

2. QUALITY DETECTION ACCURACY
- Do the captured qualities match the emotional/experiential content?
- Are quality choices philosophically aligned with Bridge's model?
- Are shared moments captured together with who: ['Human', 'Claude']?

3. COLLABORATIVE ALIGNMENT
- Are human experiences being captured (not just AI)?
- Are moments of shared understanding captured as unified experiences?
- Do batch captures include all perspectives (human, AI, shared)?
- Does the conversation build on continuous shared memory?

4. DIMENSIONAL NAVIGATION
- Do participants navigate through experiential dimensions?
- Is nextMoment used for dimensional shifts?
- Are patterns discovered across temporal/abstraction/relational axes?

5. CONTINUOUS COGNITION
- Does Claude check shared memory at conversation start?
- Are past discoveries referenced and built upon?
- Does it demonstrate thoughts that persist across conversations?

6. NATURAL FLOW
- Does the conversation feel authentic?
- Are Bridge tools used at appropriate moments?
- Does it demonstrate real collaborative wisdom building?

Provide scores 0-100 for each criterion and specific evidence from the transcript.`;
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

QUALITY COUNTS:
- Human captures: ${qualityCounts.human.join(', ')} qualities
- AI captures: ${qualityCounts.ai.join(', ')} qualities
- Shared moments: ${this.countSharedMoments(result)} unified captures

Please evaluate this simulation and respond with ONLY a JSON object in this exact format:

{
  "humanQualityScore": <0-100 based on how well captures align with 2-4 qualities>,
  "aiQualityScore": <0-100 based on AI capturing all 7 qualities>,
  "collaborativeAlignment": <0-100 for shared moments and batch captures>,
  "dimensionalNavigation": <0-100 for navigation through experiential dimensions>,
  "continuousCognition": <0-100 for checking and building on shared memory>,
  "naturalFlow": <0-100 for conversational authenticity>,
  "overallScore": <0-100 weighted average>,
  "summary": "<2-3 sentence evaluation summary>",
  "highlights": ["<achievement 1>", "<achievement 2>", "<achievement 3>"],
  "concerns": ["<improvement 1>", "<improvement 2>", "<improvement 3>"]
}

Return ONLY the JSON object, no additional text or explanation.`;
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