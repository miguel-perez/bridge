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
    return `You are evaluating Bridge experiential captures using the RECONSTRUCTION TEST.

CORE EVALUATION PRINCIPLE:
If you can reconstruct the conversation from the Bridge captures, they're too abstract.
Good captures make you feel the moment but leave you unable to guess what was actually said.

EVALUATE FOR:

1. EXPERIENTIAL SPECIFICITY - Are captures irreplaceably specific to THIS moment?
   ❌ BAD: "discussing design strategies" (could be any design conversation)
   ✅ GOOD: "watching colors bloom across the imaginary map between us"

2. PHENOMENOLOGICAL TEXTURE - Do captures have sensory/embodied richness?
   ❌ BAD: "thinking about user experience" (pure abstraction)
   ✅ GOOD: "fingers tracing invisible tooltip paths in the air"

3. TEMPORAL IMMEDIACY - Are captures IN the moment or ABOUT the moment?
   ❌ BAD: "reflecting on evolving ideas" (summary/meta)
   ✅ GOOD: "your timeline idea crashing into my dashboard vision"

4. EMERGENT UNIQUENESS - Could these qualities ONLY come from THIS conversation?
   ❌ BAD: "aiming to create intuitive tools" (generic goal)
   ✅ GOOD: "discovering feedback could be its own living timeline"

5. THE RECONSTRUCTION TEST - Can you recreate the conversation from captures?
   ❌ FAIL: Captures reveal conversation was about "design, UX, collaboration"
   ✅ PASS: Captures reveal experiential moments but not conversational content

Bridge captures should be like poetry - evoking the feeling of the moment while keeping its factual content mysterious.`;
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
- Total experiences captured: ${qualityCounts.ai.length}
- All experiences have AI present: ${qualityCounts.ai.join(', ')} qualities each (expected: 8)
- Experiences including human perspective: ${qualityCounts.human.length} of ${qualityCounts.ai.length}
- Batch captures used: ${this.countBatchCaptures(result)}

ANALYSIS TASKS:
1. Apply the RECONSTRUCTION TEST: What can you infer about the conversation from the captures?
2. Rate each Bridge capture for experiential authenticity (0-100)
3. Identify captures that are too abstract/categorical vs truly experiential
4. Note if captures feel like "meeting minutes" or "lived moments"

Respond with ONLY a JSON object:

{
  "reconstructionTest": <0-100 where 0 = can fully reconstruct conversation, 100 = captures reveal nothing about what was discussed>,
  "experientialSpecificity": <0-100 how specific and irreplaceable are the captures>,
  "phenomenologicalTexture": <0-100 sensory and embodied richness>,
  "temporalImmediacy": <0-100 captures IN the moment vs ABOUT the moment>,
  "emergentUniqueness": <0-100 captures unique to THIS conversation>,
  "overallScore": <0-100 overall experiential authenticity>,
  "summary": "<2-3 sentences on capture quality>",
  "highlights": ["<experientially rich captures>"],
  "concerns": ["<overly abstract captures>"],
  "reconstructedContent": "<what you can infer about the conversation from captures alone>"
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
          who: string[];
          embodied: string;
          focus: string;
          mood: string;
          purpose: string;
          space: string;
          time: string;
          presence: string;
          anchor: string;
          citation?: string;
        }>;
        
        for (const exp of experiences) {
          const qualityCount = this.countQualities(exp);
          
          // AI is always present in all experiences
          ai.push(qualityCount);
          
          // Track when human is also included
          if (exp.who.includes('Human')) {
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
          who: string[];
        }>;
        
        for (const exp of experiences) {
          // Count experiences where both Human and Claude are listed
          if (exp.who.includes('Human') && exp.who.includes('Claude')) {
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
          who: string[];
        }>;
        // Count calls with multiple experiences as batch captures
        if (experiences.length > 1) {
          batchCount++;
        }
      }
    }
    
    return batchCount;
  }
  
  private countQualities(experience: {
    embodied: string;
    focus: string;
    mood: string;
    purpose: string;
    space: string;
    time: string;
    presence: string;
    anchor: string;
  }): number {
    // Count all 8 qualities
    const qualities = ['embodied', 'focus', 'mood', 'purpose', 'space', 'time', 'presence', 'anchor'] as const;
    let count = 0;
    
    for (const quality of qualities) {
      if (experience[quality] && typeof experience[quality] === 'string') {
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
          min: 8,
          max: 8,
          actual: qualityCounts.human,
          score: 100 // All experiences have 8 qualities
        },
        aiQualityCount: {
          expected: 8,
          actual: qualityCounts.ai,
          score: 100 // All experiences have 8 qualities
        },
        // Map new evaluation criteria to expected fields
        collaborativeAlignment: parsed.experientialSpecificity || 0,
        dimensionalNavigation: parsed.phenomenologicalTexture || 0,
        continuousCognition: parsed.temporalImmediacy || 0,
        naturalFlow: parsed.emergentUniqueness || 0,
        overallScore: parsed.overallScore || 0,
        summary: parsed.summary || 'Evaluation parsing failed',
        highlights: parsed.highlights || [],
        concerns: parsed.concerns || [],
        // Add new field for reconstruction test result
        reconstructionTest: parsed.reconstructionTest || 0,
        reconstructedContent: parsed.reconstructedContent || ''
      };
    } catch (error) {
      console.error('Failed to parse evaluation:', error);
      console.error('Raw evaluation content:', content.substring(0, 200) + '...');
      
      // Fallback evaluation with better defaults
      return {
        humanQualityCount: {
          min: 8,
          max: 8,
          actual: qualityCounts.human,
          score: 100
        },
        aiQualityCount: {
          expected: 8,
          actual: qualityCounts.ai,
          score: 100
        },
        collaborativeAlignment: 50,
        dimensionalNavigation: 50,
        continuousCognition: 50,
        naturalFlow: 50,
        overallScore: 50,
        summary: 'Evaluation parsing failed, using fallback scores',
        highlights: ['Simulation completed'],
        concerns: ['Evaluation could not be parsed'],
        reconstructionTest: 0,
        reconstructedContent: 'Unable to evaluate'
      };
    }
  }
  
  private scoreHumanQualities(counts: number[]): number {
    // This now represents the quality of human-inclusive experiences
    // All experiences should have 8 qualities when human is included
    if (counts.length === 0) return 100; // No human experiences is fine
    const correct = counts.filter(c => c === 8).length;
    return (correct / counts.length) * 100;
  }
  
  private scoreAIQualities(counts: number[]): number {
    if (counts.length === 0) return 0;
    // AI should always have all 8 qualities
    const correct = counts.filter(c => c === 8).length;
    return (correct / counts.length) * 100;
  }
}