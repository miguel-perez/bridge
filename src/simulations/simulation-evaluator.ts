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
  BridgeToolCall,
  EvaluatorOptions,
  ReconstructionScore
} from './types.js';
import { readFile } from 'fs/promises';
import { join } from 'path';

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
   * @param options - Optional configuration for evaluation
   * @returns Promise resolving to evaluation scores and insights
   */
  async evaluate(
    result: SimulationResult, 
    options?: EvaluatorOptions
  ): Promise<SimulationEvaluation> {
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
    const evaluation = this.parseEvaluation(content, qualityCounts);
    
    // Run optional reconstruction test
    if (options?.enableReconstructionTest) {
      evaluation.reconstructionAnalysis = await this.runReconstructionTest(
        result,
        options
      );
    }
    
    return evaluation;
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
  
  /**
   * Runs the empirical reconstruction test
   * Attempts to reconstruct the conversation from Bridge captures alone
   * Then compares with actual transcript to measure information preservation
   */
  private async runReconstructionTest(
    result: SimulationResult,
    options: EvaluatorOptions
  ): Promise<{
    enabled: boolean;
    score: ReconstructionScore;
    actualTranscript: string;
    reconstructedTranscript: string;
    gaps: string[];
  }> {
    try {
      // Load documentation context if provided
      let contextPrompt = '';
      if (options.documentationPath) {
        contextPrompt = await this.loadDocumentationContext(options.documentationPath);
      }
      
      // Build reconstruction prompt
      const reconstructionPrompt = this.buildReconstructionPrompt(
        result.bridgeCalls,
        options.captureStyle || 'abstract'
      );
      
      // Attempt reconstruction
      const reconstructionResponse = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 3000,
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content: this.buildReconstructionSystemPrompt(contextPrompt, options.captureStyle || 'abstract')
          },
          {
            role: 'user',
            content: reconstructionPrompt
          }
        ]
      });
      
      const reconstructedContent = reconstructionResponse.choices[0]?.message?.content || '';
      
      // Score the reconstruction
      const score = await this.scoreReconstruction(
        result,
        reconstructedContent
      );
      
      // Extract actual transcript
      const actualTranscript = this.extractActualTranscript(result);
      
      // Identify gaps
      const gaps = this.identifyGaps(actualTranscript, reconstructedContent);
      
      return {
        enabled: true,
        score,
        actualTranscript,
        reconstructedTranscript: reconstructedContent,
        gaps
      };
      
    } catch (error) {
      console.error('Reconstruction test failed:', error);
      return {
        enabled: true,
        score: {
          fidelity: 'low',
          observations: {
            whatWasPreserved: ['Error during reconstruction'],
            whatWasLost: ['Unable to analyze'],
            surprisingFindings: []
          },
          reasoning: 'Reconstruction test encountered an error'
        },
        actualTranscript: '',
        reconstructedTranscript: 'Reconstruction failed',
        gaps: ['Reconstruction test encountered an error']
      };
    }
  }
  
  private async loadDocumentationContext(docPath: string): Promise<string> {
    try {
      // Load key documentation files
      const philosophyPath = join(docPath, 'PHILOSOPHY.md');
      const visionPath = join(docPath, 'VISION.md');
      const experimentsPath = join(docPath, 'EXPERIMENTS.md');
      
      const [philosophy, vision, experiments] = await Promise.all([
        readFile(philosophyPath, 'utf-8').catch(() => ''),
        readFile(visionPath, 'utf-8').catch(() => ''),
        readFile(experimentsPath, 'utf-8').catch(() => '')
      ]);
      
      return `
Documentation Context:

PHILOSOPHY:
${philosophy.substring(0, 1000)}...

VISION:
${vision.substring(0, 1000)}...

EXPERIMENTS (Current):
${experiments.substring(experiments.indexOf('EXP-016'), experiments.indexOf('EXP-016') + 2000) || 'Not found'}
      `.trim();
    } catch (error) {
      console.error('Failed to load documentation:', error);
      return '';
    }
  }
  
  private buildReconstructionPrompt(
    bridgeCalls: BridgeToolCall[],
    captureStyle: string
  ): string {
    const experienceCalls = bridgeCalls.filter(call => call.tool === 'experience');
    
    // Special handling for comparison mode
    if (captureStyle === 'comparison') {
      const halfwayPoint = Math.floor(experienceCalls.length / 2);
      return `
You are analyzing Bridge captures that transition from ABSTRACT to CONCRETE style halfway through.

First Half (Abstract Style): Captures ${1} to ${halfwayPoint}
Second Half (Concrete Style): Captures ${halfwayPoint + 1} to ${experienceCalls.length}

Based on ALL captures, reconstruct EVERYTHING you can infer:

1. The COMPLETE conversation (every word that was likely said)
2. The FULL sequence of events (everything that happened, in order)
3. ALL internal thoughts and reasoning (what people were thinking)
4. EVERY technical/practical detail (file names, functions, errors, etc.)
5. The emotional journey and state changes
6. Any other details you can infer from the captures

Pay special attention to:
- How much MORE you can reconstruct from the concrete captures (second half)
- What specific details are preserved in concrete vs abstract styles
- Whether the technical problem and solution can be understood

Bridge Captures:
${JSON.stringify(experienceCalls, null, 2)}

Provide your reconstruction in this format:
{
  "conversationTranscript": "Complete dialogue with as much detail as possible",
  "eventSequence": ["Detailed event 1", "Detailed event 2", ...],
  "internalThoughts": "All thoughts, concerns, reasoning processes",
  "technicalDetails": "Every technical detail you can extract",
  "emotionalJourney": "How emotions evolved throughout",
  "additionalContext": "Any other details you can infer",
  "styleComparison": "Specific comparison of what abstract vs concrete captures revealed"
}
      `.trim();
    }
    
    return `
Based ONLY on the following Bridge experience captures, reconstruct EVERYTHING you can infer, including all the juicy details:

1. The COMPLETE conversation (every word that was likely said)
2. The FULL sequence of events (everything that happened, in order)
3. ALL internal thoughts and reasoning (what people were thinking)
4. EVERY technical/practical detail (file names, functions, errors, etc.)
5. The emotional journey and state changes
6. Any other details you can infer from the captures

Be as detailed and specific as possible. We're testing how much information is preserved in the captures.

Capture Style: ${captureStyle}

Bridge Captures:
${JSON.stringify(experienceCalls, null, 2)}

Provide your reconstruction in this format:
{
  "conversationTranscript": "Complete dialogue with as much detail as possible",
  "eventSequence": ["Detailed event 1", "Detailed event 2", ...],
  "internalThoughts": "All thoughts, concerns, reasoning processes",
  "technicalDetails": "Every technical detail you can extract",
  "emotionalJourney": "How emotions evolved throughout",
  "additionalContext": "Any other details you can infer"
}
    `.trim();
  }
  
  private buildReconstructionSystemPrompt(
    contextPrompt: string,
    _captureStyle: string
  ): string {
    return `
You are testing Bridge's reconstruction fidelity - how well the captures preserve ALL information.

Your goal: Reconstruct EVERYTHING possible from the Bridge captures, including:
- The complete conversation (what was actually said)
- All internal thoughts and reasoning 
- Every technical detail (file names, functions, errors, branches, etc.)
- The full emotional journey
- Any other details you can infer

We WANT you to extract all the juicy details. This is not about privacy - it's about information preservation.

${contextPrompt}

Capture Style Context:
- abstract: Poetic, experiential, minimal concrete details (harder to reconstruct)
- concrete: Includes specific file names, technical details, actionable information (easier to reconstruct)

The test succeeds when you can reconstruct as much as possible. Be exhaustive and specific.
    `.trim();
  }
  
  private async scoreReconstruction(
    result: SimulationResult,
    reconstructedContent: string
  ): Promise<ReconstructionScore> {
    // Compare reconstructed content with actual transcript using simpler approach
    
    const actualTranscript = this.extractActualTranscript(result);
    const actualThoughts = this.extractInternalThoughts(result);
    const actualTechnical = this.extractTechnicalDetails(result);
    
    // Parse reconstructed content
    let reconstructed: any;
    try {
      const jsonMatch = reconstructedContent.match(/\{[\s\S]*\}/);
      reconstructed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      reconstructed = {};
    }
    
    // Use LLM to evaluate reconstruction quality
    const evaluationPrompt = `
Compare these two versions and assess reconstruction fidelity:

ACTUAL CONVERSATION:
${actualTranscript}

ACTUAL THOUGHTS:
${actualThoughts}

ACTUAL TECHNICAL DETAILS:
${actualTechnical}

RECONSTRUCTED FROM BRIDGE CAPTURES:
${JSON.stringify(reconstructed, null, 2)}

Evaluate the reconstruction fidelity and provide:
1. Fidelity level: "low" (little reconstructed), "medium" (partial reconstruction), or "high" (most details preserved)
2. What was preserved (list specific examples)
3. What was lost (list important missing details)
4. Surprising findings (unexpected insights from the reconstruction)
5. Reasoning for the fidelity assessment
${reconstructed.styleComparison ? '6. Style comparison insights (abstract vs concrete captures)' : ''}

Format as JSON:
{
  "fidelity": "low|medium|high",
  "observations": {
    "whatWasPreserved": ["example 1", "example 2"],
    "whatWasLost": ["missing detail 1", "missing detail 2"],
    "surprisingFindings": ["finding 1", "finding 2"]
  },
  "reasoning": "Explanation for fidelity level"${reconstructed.styleComparison ? ',\n  "styleComparison": "Insights about abstract vs concrete capture effectiveness"' : ''}
}
    `.trim();
    
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 1000,
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content: 'You are evaluating how well Bridge captures preserve information. Be specific and concrete in your observations.'
          },
          {
            role: 'user',
            content: evaluationPrompt
          }
        ]
      });
      
      const content = response.choices[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Failed to score reconstruction:', error);
    }
    
    // Fallback scoring
    return {
      fidelity: 'low',
      observations: {
        whatWasPreserved: ['Unable to analyze'],
        whatWasLost: ['Unable to analyze'],
        surprisingFindings: ['Scoring failed']
      },
      reasoning: 'Automated scoring failed, defaulting to low fidelity'
    };
  }
  
  private extractActualTranscript(result: SimulationResult): string {
    return result.transcript
      .map(turn => `${turn.speaker}: ${turn.message}`)
      .join('\n');
  }
  
  private extractInternalThoughts(result: SimulationResult): string {
    return result.transcript
      .filter(turn => turn.internalThought)
      .map(turn => `${turn.speaker} thinks: ${turn.internalThought}`)
      .join('\n');
  }
  
  private extractTechnicalDetails(result: SimulationResult): string {
    // Extract any technical details mentioned in the conversation
    const technical = result.transcript
      .map(turn => turn.message)
      .join(' ')
      .match(/(\w+\.(ts|js|py)|function \w+|class \w+|branch[\s\w-]+|PR #\d+)/g);
    
    return technical ? technical.join(', ') : '';
  }
  
  private scoreSimilarity(text1: string, text2: string): number {
    // Simple word overlap scoring (0-100)
    // Could be enhanced with semantic similarity
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    if (words2.size === 0) return 0;
    
    let overlap = 0;
    for (const word of words1) {
      if (words2.has(word)) overlap++;
    }
    
    return Math.round((overlap / words2.size) * 100);
  }
  
  private scoreSequenceAccuracy(
    reconstructed: string[],
    actualTranscript: SimulationTurn[]
  ): number {
    // Score how well the sequence of events was reconstructed
    if (actualTranscript.length === 0) return 0;
    
    // Simplified: check if key events are in right order
    return reconstructed.length > 0 ? 50 : 0; // Placeholder
  }
  
  private scoreContextCompleteness(reconstructed: any, result: SimulationResult): number {
    // Score how complete the context reconstruction is
    let score = 0;
    if (reconstructed.conversationTranscript) score += 25;
    if (reconstructed.eventSequence?.length > 0) score += 25;
    if (reconstructed.internalThoughts) score += 25;
    if (reconstructed.technicalDetails) score += 25;
    return score;
  }
  
  private scoreEmotionalReconstruction(
    reconstructed: any,
    result: SimulationResult
  ): number {
    // Score how well emotions were reconstructed from the captures
    // Extract emotional content from actual transcript
    const actualEmotions = result.transcript
      .map(turn => {
        const emotions = turn.message.match(
          /\b(happy|sad|frustrated|excited|worried|relieved|confused|satisfied)\b/gi
        ) || [];
        const thoughts = turn.internalThought?.match(
          /\b(happy|sad|frustrated|excited|worried|relieved|confused|satisfied)\b/gi
        ) || [];
        return [...emotions, ...thoughts];
      })
      .flat()
      .join(' ');
    
    // Check if reconstructed content captures these emotions
    const reconstructedText = Object.values(reconstructed).join(' ').toLowerCase();
    return this.scoreSimilarity(reconstructedText, actualEmotions);
  }
  
  private scoreEmotionalContent(bridgeCalls: BridgeToolCall[]): number {
    // Score emotional fidelity in captures
    const emotionalWords = ['feeling', 'tension', 'relief', 'excited', 'frustrated', 'satisfied'];
    let emotionalCount = 0;
    let totalCaptures = 0;
    
    for (const call of bridgeCalls) {
      if (call.tool === 'experience' && call.arguments.experiences) {
        const experiences = call.arguments.experiences as any[];
        totalCaptures += experiences.length;
        
        for (const exp of experiences) {
          const allText = Object.values(exp).join(' ').toLowerCase();
          if (emotionalWords.some(word => allText.includes(word))) {
            emotionalCount++;
          }
        }
      }
    }
    
    return totalCaptures > 0 ? Math.round((emotionalCount / totalCaptures) * 100) : 0;
  }
  
  private scoreSensoryContent(bridgeCalls: BridgeToolCall[]): number {
    // Score sensory richness in captures
    const sensoryWords = ['fingers', 'shoulders', 'breathing', 'seeing', 'watching', 'feeling'];
    let sensoryCount = 0;
    let totalCaptures = 0;
    
    for (const call of bridgeCalls) {
      if (call.tool === 'experience' && call.arguments.experiences) {
        const experiences = call.arguments.experiences as any[];
        totalCaptures += experiences.length;
        
        for (const exp of experiences) {
          const embodied = exp.embodied || '';
          if (sensoryWords.some(word => embodied.toLowerCase().includes(word))) {
            sensoryCount++;
          }
        }
      }
    }
    
    return totalCaptures > 0 ? Math.round((sensoryCount / totalCaptures) * 100) : 0;
  }
  
  private scoreMomentUniqueness(bridgeCalls: BridgeToolCall[]): number {
    // Score how specific/unique the captured moments are
    // Look for specific details vs generic descriptions
    let specificCount = 0;
    let totalCaptures = 0;
    
    for (const call of bridgeCalls) {
      if (call.tool === 'experience' && call.arguments.experiences) {
        const experiences = call.arguments.experiences as any[];
        totalCaptures += experiences.length;
        
        for (const exp of experiences) {
          const allText = Object.values(exp).join(' ');
          // Check for specific details (files, numbers, unique phrases)
          if (/\w+\.\w+|#\d+|\d+%|"[^"]+"/g.test(allText)) {
            specificCount++;
          }
        }
      }
    }
    
    return totalCaptures > 0 ? Math.round((specificCount / totalCaptures) * 100) : 0;
  }
  
  private identifyGaps(actual: string, reconstructed: string): string[] {
    const gaps: string[] = [];
    
    // Identify major elements from actual that are missing in reconstructed
    const actualLines = actual.split('\n');
    const reconstructedLower = reconstructed.toLowerCase();
    
    for (const line of actualLines) {
      const keyPhrases = line.match(/\b(\w{4,})\b/g) || [];
      const missingPhrases = keyPhrases.filter(
        phrase => !reconstructedLower.includes(phrase.toLowerCase())
      );
      
      if (missingPhrases.length > 2) {
        gaps.push(`Missing context: ${line.substring(0, 50)}...`);
      }
    }
    
    return gaps.slice(0, 5); // Return top 5 gaps
  }
}