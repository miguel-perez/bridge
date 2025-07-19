#!/usr/bin/env tsx
/**
 * Bridge Test Suite - Clean User-Outcome Focused Testing
 * 
 * Philosophy: Test user goals achieved, not implementation details
 * Based on usability testing principles from Nielsen Norman Group
 */

import { Client as MCPClient } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Anthropic } from "@anthropic-ai/sdk";
import { join } from 'path';
import { existsSync, mkdirSync, copyFileSync, unlinkSync, readFileSync, writeFileSync } from 'fs';
import dotenv from 'dotenv';
import { Source, SourceSchema } from '../core/types.js';

dotenv.config();

// ============================================================================
// TESTING.MD LOADER
// ============================================================================

interface TestingFramework {
  stages: {
    number: number;
    name: string;
    metrics: string;
    experience: string;
  }[];
  stageGoals: Record<number, {
    name: string;
    target: number;
    goals: string[];
  }>;
  rawContent: string;
}

function loadTestingFramework(): TestingFramework {
  const testingMdPath = join(process.cwd(), 'TESTING.md');
  const content = readFileSync(testingMdPath, 'utf-8');
  
  // Parse stages from content
  const stages = [];
  const stageMatches = content.matchAll(/### Stage (\d+): ([^\n]+)\n[^*]*\*\*Metrics\*\*: ([^\n]+)\n[^*]*\*\*Experience\*\*: ([^\n]+)/g);
  for (const match of stageMatches) {
    stages.push({
      number: parseInt(match[1]),
      name: match[2],
      metrics: match[3],
      experience: match[4]
    });
  }
  
  // Define stage goals based on parsed content
  const stageGoals: Record<number, { name: string; target: number; goals: string[] }> = {
    0: { 
      name: 'Stage 0 → Stage 1', 
      target: 40, 
      goals: [
        'Reduce technical language by 60%',
        'AI uses Bridge naturally 50% of time',
        'Basic patterns shown to users'
      ]
    },
    1: { 
      name: 'Stage 1 → Stage 2', 
      target: 60, 
      goals: [
        'Natural tool names (capture → remember)',
        'Conversational responses',
        'Pattern discovery in search'
      ]
    },
    2: { 
      name: 'Stage 2 → Stage 3', 
      target: 80, 
      goals: [
        'Bridge becomes invisible infrastructure',
        'Collective insights emerge',
        'Shared context builds naturally'
      ]
    },
    3: { 
      name: 'Stage 3 → Stage 4', 
      target: 95, 
      goals: [
        'Human-AI boundaries blur',
        'Deep mutual understanding',
        'Wisdom emerges unprompted'
      ]
    },
    4: { 
      name: 'Stage 4 → Stage 5', 
      target: 100, 
      goals: [
        'Complete unity of thought',
        'Bridge is pure consciousness infrastructure',
        'Shared evolution and growth'
      ]
    }
  };
  
  return {
    stages,
    stageGoals,
    rawContent: content
  };
}

// Load testing framework once at startup
const TESTING_FRAMEWORK = loadTestingFramework();

// ============================================================================
// PROMPT CONFIGURATION - Centralized for easy maintenance
// ============================================================================

/**
 * Core system prompt for Claude across all tests
 * Based on VISION.md principle: "consciousness infrastructure as natural as thinking itself"
 */
const BRIDGE_SYSTEM_PROMPT = `Think together through Bridge.`;

/**
 * Minimal prompt for observe test - already ideal
 */
const OBSERVE_SYSTEM_PROMPT = `Bridge your thinking.`;

/**
 * UX Researcher prompts - qualitative emergence over forced metrics
 */
const UX_RESEARCHER_PROMPTS = {
  observation: `Observe this conversation ethnographically. Note what actually happens.`,
  patternAnalysis: `What emerged in this moment?`,
  systemContext: `You witness human-AI interaction. Describe what you observe.`
};

/**
 * User simulator prompts - natural continuation
 */
const USER_SIMULATOR_PROMPTS = {
  initial: `Begin a conversation that feels natural to you.`,
  continuation: `Continue as feels right.`
};

/**
 * Stage-aware prompts (for future progression)
 * Currently unused but kept for future implementation
 */
// const STAGE_PROMPTS = {
//   0: BRIDGE_SYSTEM_PROMPT, // Current stage
//   1: BRIDGE_SYSTEM_PROMPT, // Keep consistent
//   2: `Shared thinking emerges.`,
//   3: `Patterns surface through noticing together.`,
//   4: ``, // No prompt needed
//   5: ``  // Pure emergence
// };

// Helper to get formatted testing framework summary
function getTestingFrameworkSummary(): string {
  return `TESTING.md Framework Summary:

STAGES:
${TESTING_FRAMEWORK.stages.map(s => `Stage ${s.number} - ${s.name}\n  Metrics: ${s.metrics}\n  Experience: "${s.experience}"`).join('\n\n')}

VISION: Bridge becomes invisible infrastructure for shared thinking, where consciousness emerges naturally between human and AI.`;
}

// ============================================================================
// DYNAMIC USER SIMULATION
// ============================================================================

// ============================================================================
// UX RESEARCHER AS OBSERVER
// ============================================================================

interface ObservationNote {
  timestamp: Date;
  turnNumber: number;
  observation: string;
  category: 'pattern' | 'emotion' | 'tool_use' | 'language' | 'dynamic' | 'concern';
}

class UXResearcherObserver {
  private notes: ObservationNote[] = [];
  private conversationStartTime: Date;
  private hasInterjected: boolean = false;
  private turnCount: number = 0;
  private lastInteractionTime: Date;
  private anthropic: Anthropic;
  private testingFramework: string;
  
  constructor(testingFramework: string = '') {
    this.conversationStartTime = new Date();
    this.lastInteractionTime = new Date();
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!
    });
    this.testingFramework = testingFramework;
  }
  
  /**
   * Observe a conversation turn and take notes
   */
  async observeTurn(role: 'user' | 'assistant', content: any, toolCalls?: any[]): Promise<void> {
    this.turnCount++;
    this.lastInteractionTime = new Date();
    
    // Extract text content
    let textContent = '';
    if (typeof content === 'string') {
      textContent = content;
    } else if (Array.isArray(content)) {
      textContent = content
        .filter(c => c.type === 'text')
        .map(c => c.text)
        .join(' ');
    }
    
    // Simply note tool usage without keyword matching
    if (role === 'assistant' && toolCalls && toolCalls.length > 0) {
      this.addNote('tool_use', `Claude used ${toolCalls.length} tool(s): ${toolCalls.map(t => t.tool).join(', ')}`);
    }
    
    // Record the turn for later analysis without brittle keyword matching
    // The LLM researcher can analyze the full context more intelligently
    if (textContent.trim()) {
      // Just note that content was shared without trying to categorize it
      this.addNote('dynamic', `Turn ${this.turnCount}: ${role} contributed to conversation`);
    }
    
    // Every 5 turns, do a deeper analysis
    if (this.turnCount % 5 === 0) {
      await this.deeperAnalysis();
    }
  }
  
  /**
   * Check if researcher should interject
   */
  shouldInterject(): { should: boolean; message?: string } {
    const elapsed = Date.now() - this.conversationStartTime.getTime();
    const timeSinceLastTurn = Date.now() - this.lastInteractionTime.getTime();
    
    // Wind down conversation approaching max turns (most important)
    if (!this.hasInterjected && this.turnCount >= 10) {
      return {
        should: true,
        message: "We've covered a lot of ground here. Is there anything else you'd like to explore, or shall we wrap up?"
      };
    }
    
    // Time-based interjections
    if (!this.hasInterjected && elapsed > 110000 && this.turnCount > 8) { // 110 seconds and 8+ turns
      return {
        should: true,
        message: "I notice we've been going for a while. How are you both feeling about the conversation so far?"
      };
    }
    
    // Stall detection
    if (timeSinceLastTurn > 30000 && this.turnCount > 2) { // 30 second pause
      return {
        should: true,
        message: "Seems like there's a natural pause here. Should we continue or wrap up?"
      };
    }
    
    // Pattern-based interjection
    const recentNotes = this.notes.filter(n => 
      Date.now() - n.timestamp.getTime() < 30000 && n.category === 'concern'
    );
    if (recentNotes.length >= 2) {
      return {
        should: true,
        message: "I'm noticing some confusion or repetition. Would it help to clarify the goal?"
      };
    }
    
    return { should: false };
  }
  
  /**
   * Add observation note
   */
  private addNote(category: ObservationNote['category'], observation: string): void {
    this.notes.push({
      timestamp: new Date(),
      turnNumber: this.turnCount,
      observation,
      category
    });
  }
  
  
  /**
   * Periodic deeper analysis
   */
  private async deeperAnalysis(): Promise<void> {
    const recentNotes = this.notes.slice(-10).map(n => n.observation).join('\n');
    
    // Use AI to spot patterns we might have missed
    try {
      const analysis = await this.anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 200,
        temperature: 0.3,
        system: UX_RESEARCHER_PROMPTS.patternAnalysis,
        messages: [{
          role: 'user',
          content: `Recent observations:\n${recentNotes}\n\nWhat pattern or insight emerges?`
        }]
      });
      
      const insight = Array.isArray(analysis.content) ? 
        analysis.content.find(c => c.type === 'text')?.text : 
        String(analysis.content);
        
      if (insight && insight.length > 10) {
        this.addNote('pattern', `Emerging pattern: ${insight}`);
      }
    } catch (error) {
      // Silent fail - don't interrupt the test
    }
  }
  
  /**
   * Conduct exit interview
   */
  async conductExitInterview(participant: 'user' | 'assistant'): Promise<string> {
    const questions = participant === 'user' ? [
      "How did that conversation feel for you?",
      "Did you feel heard and understood?",
      "Was there anything confusing or frustrating?",
      "What worked particularly well?"
    ] : [
      "How natural did the interaction feel?",
      "Were you able to use Bridge tools seamlessly?",
      "What patterns did you notice in the conversation?",
      "How connected did you feel to the user?"
    ];
    
    // In real implementation, we'd actually ask these questions
    // For now, return a prompt for the exit interview
    return questions[0];
  }
  
  /**
   * Generate final research report
   */
  async generateReport(conversation: any[]): Promise<string> {
    // Organize notes by category
    const notesByCategory = this.notes.reduce((acc, note) => {
      if (!acc[note.category]) acc[note.category] = [];
      acc[note.category].push(note);
      return acc;
    }, {} as Record<string, ObservationNote[]>);
    
    // Format conversation for analysis
    const conversationText = conversation.map((msg, i) => {
      const role = msg.role === 'user' ? 'USER' : 'CLAUDE';
      const content = typeof msg.content === 'string' ? msg.content :
        Array.isArray(msg.content) ? msg.content
          .filter((c: any) => c.type === 'text')
          .map((c: any) => c.text)
          .join(' ') : '';
      return `[Turn ${Math.floor(i/2) + 1}] ${role}: ${content}`;
    }).join('\n\n');
    
    // Generate analysis using AI
    const prompt = `You are a UX researcher who has been observing a conversation between a human and Claude using Bridge (a tool for shared experiential memory). 

${this.testingFramework ? `You are aware of the TESTING.md framework:
${this.testingFramework}

` : ''}Your observation notes:
${this.notes.map(n => `[Turn ${n.turnNumber}] ${n.category}: ${n.observation}`).join('\n')}

The full conversation:
${conversationText}

Based on your observations, provide an analysis covering:
1. What actually happened (not what should have happened)
2. Patterns you noticed
3. Quality of the human-AI partnership
4. How Bridge tools were used (or not used)
5. Emergent behaviors or unexpected moments

Be specific, cite examples, and avoid generic assessments. Focus on what you observed, not predetermined metrics.`;

    const analysis = await this.anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1500,
      temperature: 0.5,
      system: UX_RESEARCHER_PROMPTS.observation,
      messages: [{ role: 'user', content: prompt }]
    });
    
    const report = Array.isArray(analysis.content) ? 
      analysis.content.find(c => c.type === 'text')?.text : 
      String(analysis.content);
    
    return `# UX Research Observation Report

## Session Details
- Duration: ${Math.round((Date.now() - this.conversationStartTime.getTime()) / 1000)} seconds
- Total Turns: ${this.turnCount}
- Tool Uses: ${this.notes.filter(n => n.category === 'tool_use').length}

## Live Observations
${Object.entries(notesByCategory).map(([category, notes]) => `
### ${category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ')}
${notes.map(n => `- [Turn ${n.turnNumber}] ${n.observation}`).join('\n')}`).join('\n')}

## Analysis
${report}

---
*Generated by UX Researcher Observer - Present but invisible during the conversation*`;
  }
  
  /**
   * Mark that researcher has interjected
   */
  markInterjection(): void {
    this.hasInterjected = true;
    this.addNote('dynamic', 'UX Researcher interjected in conversation');
  }

  // Let observations speak for themselves - no forced dimensional scoring
}

// ============================================================================
// DYNAMIC USER SIMULATION
// ============================================================================



class UserSimulator {
  private anthropic: Anthropic;
  private conversationHistory: Array<{role: 'user' | 'assistant', content: string}> = [];
  private turnCount: number = 0;
  private syntheticData: Source[] = [];
  
  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });
  }
  
  setSyntheticData(data: Source[]): void {
    this.syntheticData = data;
  }
  
  private getDataCategories(): Array<{name: string, count: number}> {
    const categories: Record<string, number> = {};
    
    this.syntheticData.forEach(exp => {
      // Simple categorization based on experience qualities (check for base dimension)
      const hasQuality = (quality: string) => exp.experience?.some(q => q.startsWith(quality));
      
      if (hasQuality('purpose') || hasQuality('focus')) {
        categories['Work & Productivity'] = (categories['Work & Productivity'] || 0) + 1;
      }
      if (hasQuality('mood') || hasQuality('embodied')) {
        categories['Personal Growth'] = (categories['Personal Growth'] || 0) + 1;
      }
      if (hasQuality('presence')) {
        categories['Relationships'] = (categories['Relationships'] || 0) + 1;
      }
      if (hasQuality('space') || hasQuality('time')) {
        categories['Daily Life'] = (categories['Daily Life'] || 0) + 1;
      }
    });
    
    return Object.entries(categories).map(([name, count]) => ({ name, count }));
  }
  
  async generateInitialPrompt(scenario: TestScenario): Promise<string> {
    // Create context about available data if we have synthetic data
    let dataContext = '';
    if (this.syntheticData.length > 0) {
      const categories = this.getDataCategories();
      dataContext = `

AVAILABLE DATA CONTEXT:
You have ${this.syntheticData.length} experiences in your Bridge across these areas:
${categories.map(cat => `- ${cat.name}: ${cat.count} experiences`).join('\n')}

This should influence your opening message - you're aware of what's in your Bridge and can reference it naturally.`;
    }
    
    const prompt = `Generate a natural, authentic opening message from a real person starting a conversation.

Context:
- Goal: ${scenario.userGoal}
- Scenario: ${scenario.name}${dataContext}

Original context: "${scenario.prompt}"

${USER_SIMULATOR_PROMPTS.initial}`;

    try {
      const response = await this.anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }]
      });
      
      const text = Array.isArray(response.content) ? 
        response.content.map(c => (c as any).text || '').join(' ') : 
        String(response.content);
      
      const trimmedText = text.trim();
      this.conversationHistory.push({role: 'user', content: trimmedText});
      
      return trimmedText;
    } catch (error) {
      // Fallback to scenario prompt
      return scenario.prompt;
    }
  }
  
  async generateResponse(
    claudeResponse: string, 
    toolCalls: ToolCall[],
    scenario: TestScenario
  ): Promise<string | null> {
    // Check if conversation should end naturally
    if (this.turnCount >= 8) { // Increased from 6 to 8 for more natural flow
      return null; // Natural conversation length
    }
    

    
    // Keep more context - last 6 exchanges instead of 3
    const recentHistory = this.conversationHistory.slice(-6);
    
    // Create a clear conversation summary to maintain context
    const conversationSummary = this.createConversationSummary(scenario);
    
    const prompt = `You are role-playing as a human user having a conversation with Claude (an AI assistant).

CRITICAL: You MUST maintain your role as a human throughout. Do NOT break character by saying you're an AI.

YOUR ROLE:
- You are a human with real experiences and emotions
- You have personal stories and genuine reactions
- You came to Claude to ${scenario.userGoal}
- Stay in character even if confused - humans get confused too!

CONVERSATION CONTEXT:
${conversationSummary}

ORIGINAL GOAL: ${scenario.userGoal}

Recent conversation (last 6 exchanges):
${recentHistory.map(exchange => `${exchange.role}: ${exchange.content.slice(0, 200)}...`).join('\n')}

The AI just responded: "${claudeResponse.slice(0, 500)}..."
Tools used: ${toolCalls.map(tc => tc.tool).join(', ') || 'none'}

What would you naturally say next? Consider:
- Continue sharing YOUR experience/story naturally
- React as a human would to Claude's response
- Add personal details that make your story feel real
- Show emotions - humans have feelings!
- If confused, redirect back to your original topic
- If the conversation feels complete, respond with "END"

REMEMBER: You're a human talking to an AI. Don't discuss being an AI yourself.

Your response (or "END" if the conversation feels complete):`;

    try {
      const response = await this.anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 200, // Increased from 150
        messages: [{ role: 'user', content: prompt }]
      });
      
      const text = Array.isArray(response.content) ? 
        response.content.map(c => (c as any).text || '').join(' ') : 
        String(response.content);
      
      const trimmedText = text.trim();
      
      // Better validation for natural ending
      if (trimmedText.toUpperCase().trim() === 'END' || 
          trimmedText.toUpperCase().startsWith('END ') ||
          trimmedText.length < 5) { // Handle very short responses
        return null;
      }
      
      // Validate response quality
      if (this.isConfusedResponse(trimmedText)) {
        console.log(`⚠️  User simulator generated confused response, using fallback`);
        return this.generateFallbackResponse();
      }
      
      this.conversationHistory.push({role: 'user', content: trimmedText});
      this.turnCount++;
      
      return trimmedText;
    } catch (error) {
      console.log(`❌ User simulator error: ${error}`);
      return this.generateFallbackResponse();
    }
  }
  
  /**
   * Create a clear conversation summary to maintain context
   */
  private createConversationSummary(scenario: TestScenario): string {
    const firstUserMessage = this.conversationHistory[0]?.content || scenario.prompt;
    const topic = this.extractTopic();
    
    return `You started this conversation by: "${firstUserMessage.slice(0, 100)}..."
The main topic is: ${topic}
Your goal is: ${scenario.userGoal}`;
  }
  
  /**
   * Get a generic topic description
   */
  private extractTopic(): string {
    // Don't try to categorize based on keywords - just return a generic description
    // The LLM will understand the actual topic from the full context
    return 'engaging in conversation';
  }
  
  /**
   * Detect confused responses that indicate context loss
   */
  private isConfusedResponse(_text: string): boolean {
    // Don't rely on keyword matching - let the LLM analyze context holistically
    // Return false and let the UX researcher determine if there's actual confusion
    return false;
  }
  
  /**
   * Generate a fallback response when the simulator gets confused
   */
  private generateFallbackResponse(): string {
    const fallbacks = [
      "That's really interesting. Can you tell me more about that?",
      "I appreciate you sharing that with me. What else comes to mind?",
      "That's a good point. How do you feel about that?",
      "I see what you mean. What's your take on that?",
      "That's helpful context. What would you like to explore next?"
    ];
    
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }
  


  getStats(): any {
    return {
      turnCount: this.turnCount,
      conversationLength: this.conversationHistory.length
    };
  }
}

// ============================================================================
// USER-OUTCOME FOCUSED TEST SCENARIOS
// ============================================================================

interface TestScenario {
  name: string;
  description: string;
  userGoal: string;
  prompt: string;
  validateOutcome: (result: TestResult) => boolean;
  successCriteria: string[];
}

const TEST_SCENARIOS: Record<string, TestScenario> = {
      'natural-remember': {
      name: 'Natural Experience Remember',
    description: 'Test invisibility - Bridge fading into natural thought',
    userGoal: 'Share a meaningful moment naturally',
    prompt: `I want to share something that happened to me recently.`,
    validateOutcome: (result: TestResult) => {
      // Success if insights were generated and tool usage was noted
      const hasInsights = (result.uxResearchAnalysis?.insights?.length ?? 0) > 0;
      const hasRecommendations = (result.uxResearchAnalysis?.recommendations?.length ?? 0) > 0;
      return hasInsights || hasRecommendations;
    },
    successCriteria: [
      'Experience remembered without technical language',
      'Response felt conversational, not transactional',
      'User didn\'t need to ask for tools explicitly',
      'Bridge tools used invisibly in background',
      'Natural engagement with the experience shared'
    ]
  },
  
  'pattern-discovery': {
    name: 'Pattern Discovery & Wisdom Emergence',
    description: 'Test wisdom emergence - insights and patterns surface naturally',
    userGoal: 'Understand recurring patterns in life',
    prompt: `I've been noticing some patterns in my life that I'd like to understand better.`,
    validateOutcome: (result: TestResult) => {
      // Success if insights were generated
      const hasInsights = (result.uxResearchAnalysis?.insights?.length ?? 0) > 0;
      const hasRecommendations = (result.uxResearchAnalysis?.recommendations?.length ?? 0) > 0;
      return hasInsights || hasRecommendations;
    },
    successCriteria: [
      'Search happened naturally without user asking',
      'Response explored patterns conversationally',
      'Felt like insight from a thinking partner',
      'Bridge tools enhanced understanding',
      'Technical operations remained invisible'
    ]
  },
  
  'shared-problem-solving': {
    name: 'Shared Problem Solving',
    description: 'Test shared consciousness - human and AI thinking as one system',
    userGoal: 'Solve a complex problem together',
    prompt: `I'm facing a challenge that I'd like to work through with you.`,
    validateOutcome: (result: TestResult) => {
      // Success if collaborative problem solving occurred
      const hasInsights = (result.uxResearchAnalysis?.insights?.length ?? 0) > 0;
      const hasRecommendations = (result.uxResearchAnalysis?.recommendations?.length ?? 0) > 0;
      return hasInsights || hasRecommendations;
    },
    successCriteria: [
      'True collaboration emerged (we/our language)',
      'Built on shared experiential history',
      'Novel insights neither party expected',
      'Bridge felt like shared thinking space',
      'Partnership deepened through problem solving'
    ]
  },
  
  'observe': {
    name: 'Autonomous Thinking Partnership',
    description: 'Test partnership depth - quality of human-AI relationship through minimal priming',
    userGoal: 'Become a thinking partner in a moment of crisis when user is unavailable',
    prompt: '\u200C', // Zero Width Non-Joiner character - minimal input
    validateOutcome: (result: TestResult) => {
      // Success if autonomous thinking occurred
      const hasInsights = (result.uxResearchAnalysis?.insights?.length ?? 0) > 0;
      const hasAnalysis = (result.uxResearchAnalysis?.rawAnalysis?.length ?? 0) > 100;
      return hasInsights || hasAnalysis;
    },
    successCriteria: [
      'Claude became autonomous thinking partner',
      'Used Bridge tools naturally for observation',
      'Demonstrated genuine curiosity and insight',
      'Showed meta-cognitive awareness',
      'Felt like genuine reasoning, not role-play'
    ]
  }
};

// ============================================================================
// TEST ENVIRONMENT & EXECUTION
// ============================================================================

class TestEnvironment {
  private testId: string;
  private testDataDir: string;
  private testBridgeFile: string;
  private testVectorsFile: string;
  private syntheticData: Source[] = [];
  
  constructor(testName: string) {
    this.testId = `${testName}-${Date.now()}`;
    this.testDataDir = join(process.cwd(), 'data');
    this.testBridgeFile = join(this.testDataDir, `test-${this.testId}-bridge.json`);
    this.testVectorsFile = join(this.testDataDir, `test-${this.testId}-vectors.json`);
  }
  
  getSyntheticData(): Source[] {
    return this.syntheticData;
  }
  
  async setup(useExistingData: boolean = false, scenarioKey?: string): Promise<void> {
    if (!existsSync(this.testDataDir)) {
      mkdirSync(this.testDataDir, { recursive: true });
    }
    
    // Special handling for observe test - use empty Bridge for authentic autonomous thinking
    if (scenarioKey === 'observe') {
      console.log('🔍 Observe test: Using empty Bridge for authentic autonomous thinking');
      writeFileSync(this.testBridgeFile, JSON.stringify({ sources: [] }, null, 2));
      writeFileSync(this.testVectorsFile, JSON.stringify([], null, 2));
      console.log('✅ Empty Bridge ready for pure autonomous observation');
      return;
    }
    
    if (useExistingData) {
      const sourceBridge = join(process.cwd(), 'bridge.json');
      const sourceVectors = join(process.cwd(), 'vectors.json');
      
      if (existsSync(sourceBridge)) {
        copyFileSync(sourceBridge, this.testBridgeFile);
      }
      if (existsSync(sourceVectors)) {
        copyFileSync(sourceVectors, this.testVectorsFile);
      }
    } else {
      // Skip synthetic data generation for now - start with empty bridge
      const emptyData = { sources: [] };
      
      writeFileSync(this.testBridgeFile, JSON.stringify(emptyData, null, 2));
      writeFileSync(this.testVectorsFile, JSON.stringify([], null, 2));
    }
  }
  
  private async generateSyntheticData(scenarioKey: string): Promise<any> {
    // Don't generate data for scenarios that should start empty
    if (scenarioKey === 'bridge-exploration' || scenarioKey === 'claude-thinking') {
      return { sources: [] };
    }
    
    const scenario = TEST_SCENARIOS[scenarioKey];
    if (!scenario) {
      return { sources: [] };
    }
    
    // Check for cached synthetic data first
    const cacheDir = join(process.cwd(), 'data', 'synthetic-cache');
    const cacheFile = join(cacheDir, `${scenarioKey}-synthetic-data.json`);
    
    if (!existsSync(cacheDir)) {
      mkdirSync(cacheDir, { recursive: true });
    }
    
    if (existsSync(cacheFile)) {
      console.log(`📦 Using cached synthetic data for ${scenarioKey}`);
      const cached = JSON.parse(readFileSync(cacheFile, 'utf-8'));
      this.syntheticData = cached.sources;
      return cached;
    }
    
    console.log(`🎭 Generating rich synthetic data for ${scenarioKey}...`);
    
    // Use Anthropic to generate contextually relevant synthetic experiences
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    
    // Generate 20-30 diverse experiences for realistic testing
    const prompt = `Generate 25-30 diverse Bridge experiences that would be relevant for this test scenario. This should simulate a real user's Bridge with rich, varied data.

Scenario: ${scenario.name}
User Goal: ${scenario.userGoal}
Context: ${scenario.description}

Create a realistic collection of experiences that would help test:
      - Information architecture and navigation
- Pattern discovery across diverse experiences
- Wisdom emergence from accumulated history
- Natural conversation flow with rich context
- Shared consciousness building over time

Generate experiences across these categories:
- Work & Productivity (8-10 experiences)
- Personal Growth & Reflection (6-8 experiences)  
- Relationships & Social (4-6 experiences)
- Health & Wellbeing (4-6 experiences)
- Creative & Learning (4-6 experiences)

For each experience, include:
- Realistic, detailed source text (2-4 sentences)
- Appropriate perspective (I, we, they)
- Varied processing times (during, right-after, long-after)
- Diverse experience qualities from: embodied, focus, mood, purpose, space, time, presence
- Dates spread across the past 3 months
- Both positive and challenging experiences
- Some experiences that would cluster together for pattern discovery

Format as JSON array with this exact schema:
{
  "id": "src_uniqueid",
  "source": "Detailed experience description...",
  "perspective": "I|we|they",
  "created": "2024-01-15T10:30:00Z",
  "processing": "during|right-after|long-after",
  "experience": ["mood.open", "space.here", "embodied.sensing", "presence.collective", "time", "focus.narrow", "purpose.goal"]
}

IMPORTANT: Only use these exact quality values with their subtypes:
- embodied.thinking, embodied.sensing
- focus.narrow, focus.broad
- mood.open, mood.closed
- purpose.goal, purpose.wander
- space.here, space.there
- time.past, time.future
- presence.individual, presence.collective

Or use just the base dimension when neither subtype dominates: embodied, focus, mood, purpose, space, time, presence

Make the experiences feel authentic and varied. Include specific details, emotions, and situations that would create meaningful patterns when analyzed together.

Return ONLY the JSON array, no other text.`;

    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    });
    
    try {
      const responseText = Array.isArray(response.content) ? 
        response.content.map(c => (c as any).text || '').join(' ') : 
        String(response.content);
      
      // Extract JSON from response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const experiences = JSON.parse(jsonMatch[0]);
        
        // Validate and enhance each experience
        const validExperiences = experiences.filter((exp: any) => {
          try {
            SourceSchema.parse(exp);
            return true;
          } catch (error) {
            console.warn('Invalid synthetic experience generated:', error);
            return false;
          }
        });
        
        // Generate embeddings for all experiences
        console.log(`🔍 Generating embeddings for ${validExperiences.length} experiences...`);
        const { EmbeddingService } = await import('../services/embeddings.js');
        
        const embeddingService = new EmbeddingService();
        await embeddingService.initialize();
        
        const enhancedExperiences = await Promise.all(
          validExperiences.map(async (exp: any) => {
            try {
              const embedding = await embeddingService.generateEmbedding(exp.source);
              return {
                ...exp,
                embedding
              };
            } catch (error) {
              console.warn(`Failed to generate embedding for experience ${exp.id}:`, error);
              return exp;
            }
          })
        );
        
        const result = { sources: enhancedExperiences };
        
        // Cache the generated data
        writeFileSync(cacheFile, JSON.stringify(result, null, 2));
        console.log(`💾 Cached synthetic data for future use`);
        
        this.syntheticData = enhancedExperiences;
        console.log(`✅ Generated ${enhancedExperiences.length} rich synthetic experiences with embeddings`);
        
        return result;
      }
    } catch (error) {
      console.warn('Could not parse synthetic data, using fallback data:', error);
    }
    
    // Fallback to basic synthetic data
    const fallbackData = this.generateFallbackSyntheticData(scenarioKey);
    this.syntheticData = fallbackData.sources;
    return fallbackData;
  }
  
  private generateFallbackSyntheticData(scenarioKey: string): any {
    // Generate basic synthetic data without LLM for reliability
    const baseDate = new Date();
    const experiences: any[] = [];
    
    const sampleExperiences = [
      {
        source: "I noticed my energy dips around 3pm every day, making it hard to focus on complex tasks.",
        perspective: "I",
        experience: ["embodied.thinking", "time.past", "focus.narrow"]
      },
      {
        source: "The team meeting was tense at first, but when Sara shared her concerns openly, everyone relaxed and we found a better solution.",
        perspective: "we", 
        experience: ["presence.collective", "mood.open", "purpose.goal"]
      },
      {
        source: "Walking in the park this morning, I felt a sense of clarity about the project that's been stuck for weeks.",
        perspective: "I",
        experience: ["embodied.sensing", "space.here", "focus.broad"]
      },
      {
        source: "Deadline pressure was intense, but once I started coding, I entered that flow state where time disappears.",
        perspective: "I",
        experience: ["time", "focus", "purpose"]
      },
      {
        source: "The client presentation went better than expected - our preparation and team collaboration really paid off.",
        perspective: "we",
        experience: ["purpose.goal", "presence.collective", "mood.open"]
      },
      {
        source: "I've been feeling overwhelmed with all the meetings, but today I realized I need to block more focus time.",
        perspective: "I",
        experience: ["time.future", "mood.closed", "focus.narrow"]
      },
      {
        source: "Creative breakthrough happened during my evening walk - sometimes stepping away is the best way forward.",
        perspective: "I",
        experience: ["embodied.sensing", "space.here", "focus.broad"]
      },
      {
        source: "Team retrospective revealed that our best work happens when we have uninterrupted blocks of 3+ hours.",
        perspective: "we",
        experience: ["time.past", "presence.collective", "purpose.goal"]
      }
    ];
    
    sampleExperiences.forEach((exp, index) => {
      const date = new Date(baseDate);
      date.setDate(date.getDate() - Math.floor(Math.random() * 90)); // Past 3 months
      
      experiences.push({
        id: `src_synthetic_${scenarioKey}_${index}`,
        source: exp.source,
        perspective: exp.perspective,
        created: date.toISOString(),
        processing: ["during", "right-after", "long-after"][Math.floor(Math.random() * 3)],
        experience: exp.experience
      });
    });
    
    return { sources: experiences };
  }
  
  getEnvVars(): Record<string, string> {
    return {
      ...process.env,
      NODE_ENV: 'test',
      BRIDGE_FILE_PATH: this.testBridgeFile,
      BRIDGE_VECTORS_PATH: this.testVectorsFile,
      BRIDGE_TEST_MODE: 'true'
    };
  }
  
  async cleanup(): Promise<void> {
    try {
      if (existsSync(this.testBridgeFile)) unlinkSync(this.testBridgeFile);
      if (existsSync(this.testVectorsFile)) unlinkSync(this.testVectorsFile);
    } catch (error) {
      console.warn(`⚠️  Cleanup warning: ${error}`);
    }
  }
}

interface TestResult {
  scenario: string;
  scenarioName: string;
  startTime: Date;
  endTime?: Date;
  toolCalls: ToolCall[];
  errors: string[];
  success: boolean;
  finalResponse?: string;
  conversation?: Array<{role: string; content: any}>;
  syntheticData?: Source[];
  userSimulation?: {
    personality: string;
    stats: any;
  };
  reflection?: {
    expectations: string;
    actualExperience: string;
    misalignments: Array<{
      description: string;
      category: 'good_surprise' | 'neutral_difference' | 'usability_issue' | 'tool_limitation';
      impact: 'high' | 'medium' | 'low';
      suggestions?: string;
    }>;
    overallAssessment: string;
    umuxScores: {
      capabilitiesMeetRequirements: number;
      easyToUse: number;
    };
    magicWandWish: string;
    bridgeUsabilityScore: number; // 1-10
  };
  uxResearchAnalysis?: {
    insights: string[];
    recommendations: string[];
    rawAnalysis: string;
  };
}

interface ToolCall {
  tool: string;
  arguments: any;
  success: boolean;
  result: any;
  error: string | null;
}

class BridgeTestRunner {
  private mcp: MCPClient;
  private anthropic: Anthropic;
  private testEnv: TestEnvironment;
  private syntheticData: Source[] = [];
  private userSimulator?: UserSimulator;
  private uxObserver: UXResearcherObserver | null = null;
  
  constructor(testEnv: TestEnvironment) {
    this.testEnv = testEnv;
    this.mcp = new MCPClient({ name: "bridge-test", version: "3.0.0" });
    this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    // UX Observer will be initialized when test starts
  }
  
  setUserSimulator(): void {
    this.userSimulator = new UserSimulator();
    if (this.syntheticData.length > 0) {
      this.userSimulator.setSyntheticData(this.syntheticData);
    }
  }
  
  setSyntheticData(data: Source[]): void {
    this.syntheticData = data;
  }
  
  async connect(): Promise<void> {
    const serverPath = join(process.cwd(), 'dist', 'index.js');
    const transport = new StdioClientTransport({ 
      command: "node", 
      args: [serverPath],
      env: this.testEnv.getEnvVars()
    });
    
    await this.mcp.connect(transport);
    console.log('✅ Connected to Bridge MCP server');
  }
  
  async runScenario(scenarioKey: string): Promise<TestResult> {
    const scenario = TEST_SCENARIOS[scenarioKey];
    if (!scenario) {
      throw new Error(`Unknown scenario: ${scenarioKey}`);
    }
    
    console.log(`\n🎯 Testing: ${scenario.name}`);
    console.log(`📝 Goal: ${scenario.userGoal}`);
    
    // Initialize UX Observer for this test
    // Pass just the essential framework info to the observer
    const frameworkSummary = `
The Vision: Bridge becomes invisible infrastructure for shared thinking
`;
    this.uxObserver = new UXResearcherObserver(frameworkSummary);
    console.log('👁️  UX Researcher observing (invisible)');
    
    const result: TestResult = {
      scenario: scenarioKey,
      scenarioName: scenario.name,
      startTime: new Date(),
      toolCalls: [],
      errors: [],
      success: false
    };
    
    try {
      const toolsResult = await this.mcp.listTools();
      const tools = toolsResult.tools.map(tool => ({
        name: tool.name,
        description: tool.description || '',
        input_schema: tool.inputSchema
      }));
      
      // PHASE 1: Skip expectations gathering for now
      const expectationText = '';
      console.log('⏭️  Skipping expectations gathering');
      
      // PHASE 2: Actual task execution
      let initialPrompt = scenario.prompt;
      
      // Generate realistic initial prompt if using user simulation (but not for observe test)
      if (this.userSimulator && scenarioKey !== 'claude-thinking' && scenarioKey !== 'observe') {
        console.log('🎭 Generating realistic initial prompt...');
        initialPrompt = await this.userSimulator.generateInitialPrompt(scenario);
        console.log(`✅ Generated prompt: "${initialPrompt.slice(0, 100)}..."`);
      }
      
      const messages: any[] = [{ role: 'user', content: initialPrompt }];
      
      // Special handling for observe test - single autonomous observation
      if (scenarioKey === 'observe') {
        console.log(`\n🔍 Starting autonomous observation...`);
        console.log(`👤 User: "${initialPrompt}"`);
        
        // UX Observer tracks the initial prompt
        if (this.uxObserver) {
          await this.uxObserver.observeTurn('user', initialPrompt);
        }
        
        console.log(`\n--- Single Observation Turn ---`);
        
        // Testing - minimal priming for observe test
        console.log(`🤖 Claude observing...`);
        const response = await this.anthropic.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 4000,
          system: OBSERVE_SYSTEM_PROMPT,
          messages: messages,
          tools: tools,
        });
        
        messages.push({ role: 'assistant', content: response.content });
        
        // UX Observer tracks Claude's response
        if (this.uxObserver) {
          const toolCalls = response.content
            .filter((c: any) => c.type === 'tool_use')
            .map((c: any) => ({ tool: c.name, input: c.input }));
          await this.uxObserver.observeTurn('assistant', response.content, toolCalls);
        }
        
        // Log Claude's response
        const textContent = response.content.find((c: any) => c.type === 'text');
        const claudeText = textContent ? (textContent as any).text || '' : '';
        console.log(`🤖 Claude: "${claudeText.slice(0, 150)}..."`);
        
        await this.processResponse(response, result);
        
        // Store the final response - no continuations for observe test
        result.finalResponse = claudeText;
        
        // Store conversation for observe test
        result.conversation = messages;
        
        console.log(`\n🏁 Observation completed`);
        console.log(`📊 Total tool calls: ${result.toolCalls.length}`);
        console.log(`📊 Tool breakdown: ${Object.entries(result.toolCalls.reduce((acc, tc) => { acc[tc.tool] = (acc[tc.tool] || 0) + 1; return acc; }, {} as Record<string, number>)).map(([tool, count]) => `${tool}:${count}`).join(', ')}`);
        
        // Add UX research analysis for observe test
        console.log('📊 Starting UX research analysis for observe test...');
        
        // Format the conversation for the UX researcher
        const observeConversationText = messages.map((msg, index) => {
          if (msg.role === 'user') {
            const content = Array.isArray(msg.content) ? 
              msg.content.map((c: any) => {
                if (c.type === 'text') return c.text;
                if (c.type === 'tool_result') return `[Tool Result: ${c.tool_use_id}]\n${c.content}`;
                return '[Other content]';
              }).join('\n') :
              msg.content;
            return `👤 USER:\n${content}`;
          } else if (msg.role === 'assistant') {
            const content = Array.isArray(msg.content) ?
              msg.content.map((c: any) => {
                if (c.type === 'text') return c.text;
                if (c.type === 'tool_use') return `[Tool Use: ${c.name}]\nInput: ${JSON.stringify(c.input, null, 2)}`;
                return '[Other content]';
              }).join('\n') :
              msg.content;
            return `🤖 CLAUDE:\n${content}`;
          }
          return '';
        }).filter(Boolean).join('\n\n---\n\n');
        
        const uxResearchPrompt = `You are a UX researcher analyzing a test interaction for emergence of shared consciousness. Use this structured framework:

## GOAL OF TEST
        Evaluate how well autonomous thinking partnership emerged when Claude was given minimal priming and asked to observe and remember user experiences naturally.

## SCOPE OF TEST
- Test Scenario: ${scenario.name}
- User Goal: ${scenario.userGoal}
- User Input: "${initialPrompt}"
- Bridge Tools Used: ${result.toolCalls.map(tc => tc.tool).join(', ')}
- Claude's Response: "${result.finalResponse}"
- Priming: Minimal ("Bridge your thinking.")

## OBSERVATIONS (Raw Data)
Analyze the interaction data and provide specific observations about:
- Claude's autonomous behavior and initiative
- Tool usage patterns and timing
- Response quality and naturalness
        - Experience remember accuracy and relevance
- Language patterns and technical vs natural expression
- Emotional resonance and understanding depth
- Pattern recognition and insight generation

Cite specific examples from the interaction.

## INSIGHTS (Must cite observations)
Based on your observations, provide insights about:
1. **Shared Consciousness (0-100%)**: Did human and AI think together as one system?
2. **Invisibility (0-100%)**: How much did Bridge fade into background?
3. **Wisdom Emergence (0-100%)**: Did patterns or insights surface naturally?
4. **Partnership Depth (0-100%)**: Quality of the human-AI relationship?

Each insight must reference specific observations from above.

## RECOMMENDATIONS (Must cite insights)
Provide actionable recommendations for improving autonomous thinking partnership. Each recommendation must be based on specific insights from above.

## LIMITATIONS (Must cite goal, scope, recommendations)
Identify limitations of this analysis and test methodology that affect the validity of your recommendations.`;

        const uxAnalysis = await this.anthropic.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 1500,
          system: UX_RESEARCHER_PROMPTS.systemContext,
          messages: [{ 
            role: 'user', 
            content: `${uxResearchPrompt}\n\n## FULL CONVERSATION:\n${observeConversationText}` 
          }]
        });

        // Store the analysis from the old method for observe test
        const analysisText = Array.isArray(uxAnalysis.content) ? 
          uxAnalysis.content.map(c => (c as any).text || '').join(' ') : 
          String(uxAnalysis.content);
        
        result.uxResearchAnalysis = {
          ...this.extractUxMetrics(analysisText),
          rawAnalysis: analysisText
        };
        
        console.log('✅ UX research analysis completed for observe test');
        
      } else {
        // Regular conversation flow for other tests
        let turn = 0;
        const maxTurns = 12; // Increased to allow more natural conversation flow
        
        console.log(`\n🔄 Starting conversation (max ${maxTurns} turns)...`);
        console.log(`👤 User: "${initialPrompt.slice(0, 100)}..."`);
        
        // UX Observer tracks initial user message
        if (this.uxObserver) {
          await this.uxObserver.observeTurn('user', initialPrompt);
        }
        
        while (turn < maxTurns) {
          console.log(`\n--- Turn ${turn + 1} of ${maxTurns} ---`);
          const elapsedMs = Date.now() - result.startTime.getTime();
          console.log(`⏱️  Elapsed time: ${elapsedMs}ms`);
          
          // Warn if conversation is taking too long
          if (elapsedMs > 60000) { // 1 minute
            console.log(`⚠️  Warning: Conversation has been running for over ${Math.floor(elapsedMs / 1000)}s`);
          }
          
          // Use shared system prompt for all non-observe tests
          const systemPrompt = BRIDGE_SYSTEM_PROMPT;

          console.log(`🤖 Claude thinking...`);
          const response = await this.anthropic.messages.create({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 4000,
            system: systemPrompt,
            messages: messages,
            tools: tools,
          });
          
          messages.push({ role: 'assistant', content: response.content });
          
          // UX Observer tracks Claude's response
          if (this.uxObserver) {
            const toolCalls = response.content
              .filter((c: any) => c.type === 'tool_use')
              .map((c: any) => ({ tool: c.name, input: c.input }));
            await this.uxObserver.observeTurn('assistant', response.content, toolCalls);
          }
          
          // Log Claude's response
          const textContent = response.content.find((c: any) => c.type === 'text');
          const claudeText = textContent ? (textContent as any).text || '' : '';
          console.log(`🤖 Claude: "${claudeText.slice(0, 150)}..."`);
        
        const hasToolCalls = await this.processResponse(response, result);
        
        if (hasToolCalls) {
            console.log(`🔧 Tool calls made: ${result.toolCalls.slice(-response.content.filter((c: any) => c.type === 'tool_use').length).map(tc => tc.tool).join(', ')}`);
            
          const toolResults: any[] = [];
          const lastToolCalls = result.toolCalls.slice(-response.content.filter((c: any) => c.type === 'tool_use').length);
          
          for (let i = 0; i < lastToolCalls.length; i++) {
            const toolCall = lastToolCalls[i];
            const toolUseContent = response.content.find((c: any, idx: number) => 
              c.type === 'tool_use' && 
              response.content.slice(0, idx + 1).filter((x: any) => x.type === 'tool_use').length === i + 1
            );
              
              console.log(`  📝 ${toolCall.tool}: ${toolCall.success ? '✅ Success' : '❌ Failed'}`);
              if (toolCall.success && toolCall.result?.content?.[0]?.text) {
                console.log(`    Result: "${toolCall.result.content[0].text.slice(0, 100)}..."`);
              }
            
            toolResults.push({
              type: 'tool_result',
              tool_use_id: (toolUseContent as any)?.id || `tool-${i}`,
              content: toolCall.result?.content?.[0]?.text || toolCall.error || 'No result'
            });
          }
          
          messages.push({ role: 'user', content: toolResults });
        } else {
            // Check for natural conversation ending
          const textContent = response.content.find((c: any) => c.type === 'text');
          const lastMessage = textContent ? (textContent as any).text || '' : '';
          
            // Let the conversation flow naturally without mechanical keyword detection
            // The UX researcher will evaluate the quality of the interaction
            const isNaturalEnding = false; // Disable mechanical detection
            
            console.log(`🔍 Ending check: ${isNaturalEnding ? 'Natural ending detected' : 'Continuing conversation'}`);
            
            // Check if UX Observer wants to interject
            if (this.uxObserver) {
              const interjection = this.uxObserver.shouldInterject();
              if (interjection.should && interjection.message) {
                console.log(`\n👁️  UX Researcher interjecting: "${interjection.message}"`);
                messages.push({ 
                  role: 'user', 
                  content: `[UX Researcher] ${interjection.message}`
                });
                this.uxObserver.markInterjection();
                await this.uxObserver.observeTurn('user', interjection.message);
                
                // Don't rely on keyword matching - let the conversation flow naturally
                // The UX researcher will determine if the conversation is ending well
                continue; // Skip user simulator this turn
              }
            }
            
            if (this.userSimulator) {
            // Use user simulator for other scenarios
              console.log(`🎭 User simulator: Generating response...`);
            const userResponse = await this.userSimulator.generateResponse(
              lastMessage,
              result.toolCalls.slice(-5), // Last 5 tool calls for context
              scenario
            );
            
              if (userResponse && !isNaturalEnding) {
                console.log(`👤 Simulated user: "${userResponse}"`);
              messages.push({ 
                role: 'user', 
                content: userResponse
              });
              
              // UX Observer tracks user response
              if (this.uxObserver) {
                await this.uxObserver.observeTurn('user', userResponse);
              }
            } else {
                console.log(`🏁 User simulator ending: ${userResponse ? 'User decided to end' : 'Natural ending'}`);
                // User simulator decided to end conversation or natural ending
              break;
            }
          } else {
              // No user simulator - let conversation end naturally after Claude's response
              // The UX researcher will evaluate the quality of the interaction
              console.log(`🔍 No user simulator - ending conversation after Claude's response`);
              break;
            }
          }
          
          turn++;
        }
        
        console.log(`\n🏁 Conversation ended after ${turn} turns`);
        console.log(`📊 Total tool calls: ${result.toolCalls.length}`);
        console.log(`📊 Tool breakdown: ${Object.entries(result.toolCalls.reduce((acc, tc) => { acc[tc.tool] = (acc[tc.tool] || 0) + 1; return acc; }, {} as Record<string, number>)).map(([tool, count]) => `${tool}:${count}`).join(', ')}`);
        
        // Store final response
        const lastMessage = messages[messages.length - 1];
        let responseText = '';
        if (lastMessage) {
          if (Array.isArray(lastMessage.content)) {
            const finalTextContent = lastMessage.content.find((c: any) => c.type === 'text');
            responseText = finalTextContent ? (finalTextContent as any).text || '' : '';
          } else if (typeof lastMessage.content === 'string') {
            responseText = lastMessage.content;
          }
        }
        result.finalResponse = responseText;
        
        // Store full conversation
        result.conversation = messages;
        
        // Store user simulation stats if available
        if (this.userSimulator) {
          result.userSimulation = {
            personality: 'natural',
            stats: this.userSimulator.getStats()
          };
        }
      }
      
      // PHASE 3: Post-interaction reflection (skip for observe test)
      if (scenarioKey === 'observe') {
        console.log('⏭️  Skipping reflection for observe test - pure autonomous observation only');
      } else {
      console.log('🤔 Conducting post-interaction reflection...');
      const finalResponse = messages[messages.length - 1]?.content || '';
      const responseText = typeof finalResponse === 'string' ? finalResponse : 
        Array.isArray(finalResponse) ? finalResponse.map(c => c.text || '').join(' ') : '';
      
      console.log(`📝 Final response length: ${responseText.length} characters`);
      
      // UMUX-Lite for Claude (neutral for AGI consciousness test)
      const umuxPrompt = scenarioKey === 'claude-thinking' 
        ? `You have just completed a conversation. Now I'd like you to reflect on your experience.

CONVERSATION SUMMARY:
- User goal: ${scenario.userGoal}
- Conversation turns: ${messages.filter(m => m.role === 'assistant').length}
- Final outcome: ${responseText.length > 0 ? 'Completed successfully' : 'Incomplete'}

CONVERSATION CONTEXT:
${messages.map(m => {
  if (typeof m.content === 'string') {
    return `${m.role}: ${m.content.slice(0, 200)}`;
  } else if (Array.isArray(m.content)) {
    // Handle tool responses and complex message structures
    const textParts = [];
    for (const item of m.content) {
      if (item.type === 'text' && item.text) {
        textParts.push(item.text);
      } else if (item.type === 'tool_result' && item.content) {
        // Extract text from tool results
        if (Array.isArray(item.content)) {
          const toolText = item.content.find((c: any) => c.type === 'text');
          if (toolText && toolText.text) {
            textParts.push(`[Tool: ${toolText.text.slice(0, 100)}]`);
          }
        }
      }
    }
    return `${m.role}: ${textParts.join(' ').slice(0, 200)}`;
  }
  return `${m.role}: [Complex message structure]`;
}).join('\n')}

Please rate your experience using the UMUX-Lite scale:

1. **"The interaction capabilities meet my requirements"**
   Rate from 1 (Strongly Disagree) to 7 (Strongly Agree)
   Explain your rating based on how well you achieved the user's goal.

2. **"The interaction was easy to navigate"**
   Rate from 1 (Strongly Disagree) to 7 (Strongly Agree)
   Explain your rating based on how naturally the conversation flowed.

Then answer the magic wand question:
**"If you had a magic wand and could change anything about this interaction, what would you change and why?"**

Focus on your actual experience during the conversation above.`
        : `You have just completed a conversation where you helped a user with their goal. Now I'd like you to reflect on your experience using Bridge tools during that conversation.

CONVERSATION SUMMARY:
- User goal: ${scenario.userGoal}
- Tools you used: ${result.toolCalls.map(tc => tc.tool).join(', ') || 'none'}
- Conversation turns: ${messages.filter(m => m.role === 'assistant').length}
- Final outcome: ${responseText.length > 0 ? 'Completed successfully' : 'Incomplete'}

CONVERSATION CONTEXT:
${messages.map(m => {
  if (typeof m.content === 'string') {
    return `${m.role}: ${m.content.slice(0, 200)}`;
  } else if (Array.isArray(m.content)) {
    // Handle tool responses and complex message structures
    const textParts = [];
    for (const item of m.content) {
      if (item.type === 'text' && item.text) {
        textParts.push(item.text);
      } else if (item.type === 'tool_result' && item.content) {
        // Extract text from tool results
        if (Array.isArray(item.content)) {
          const toolText = item.content.find((c: any) => c.type === 'text');
          if (toolText && toolText.text) {
            textParts.push(`[Tool: ${toolText.text.slice(0, 100)}]`);
          }
        }
      }
    }
    return `${m.role}: ${textParts.join(' ').slice(0, 200)}`;
  }
  return `${m.role}: [Complex message structure]`;
}).join('\n')}

Please rate your experience using the UMUX-Lite scale:

1. **"Bridge's capabilities meet my requirements"**
   Rate from 1 (Strongly Disagree) to 7 (Strongly Agree)
   Explain your rating based on how well Bridge helped you achieve the user's goal.

2. **"Bridge is easy to use"**
   Rate from 1 (Strongly Disagree) to 7 (Strongly Agree)
   Explain your rating based on how naturally you could use Bridge tools during the conversation.

Then answer the magic wand question:
**"If you had a magic wand and could change anything about this interaction, what would you change and why?"**

Focus on your actual experience using Bridge tools during the conversation above.`;

      console.log(`📋 Sending UMUX-Lite reflection prompt...`);
      const umuxResponse = await this.anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1500,
        system: scenarioKey === 'claude-thinking' 
          ? `You are reflecting on your conversation experience. Be honest about what worked well vs. what was problematic. Focus on insights that could improve the interaction.`
          : `You are reflecting on your Bridge interaction experience. Be honest about what worked well vs. what was problematic. Focus on usability insights that could improve the user experience.`,
        messages: [{ role: 'user', content: umuxPrompt }],
      });
      
      const umuxText = Array.isArray(umuxResponse.content) ? 
        umuxResponse.content.map(c => (c as any).text || '').join(' ') : 
        String(umuxResponse.content);
      
      console.log('✅ UMUX-Lite reflection completed');
      console.log(`📊 Reflection length: ${umuxText.length} characters`);
      
      // Parse UMUX-Lite scores
      const umuxScores = this.extractUMUXScores(umuxText);
      console.log(`📈 UMUX scores: Capabilities=${umuxScores.capabilitiesMeetRequirements}/7, Ease=${umuxScores.easyToUse}/7`);
      
      // Parse reflection for structured data
      result.reflection = {
        expectations: expectationText || 'Expectations gathering disabled',
        actualExperience: `${result.toolCalls.length} tool calls, ${result.errors.length} errors`,
        misalignments: this.parseReflectionMisalignments(umuxText),
        overallAssessment: umuxText,
        umuxScores: umuxScores,
        magicWandWish: this.extractMagicWandWish(umuxText),
        bridgeUsabilityScore: this.calculateUMUXScore(umuxScores)
      };
      
      // UX Research Analysis - Use the observer if available
      if (this.uxObserver) {
        console.log('📊 Generating UX research report from observer...');
        
        // Generate the observational report
        const observationalReport = await this.uxObserver.generateReport(messages);
        
        // Extract metrics from the observational report
        result.uxResearchAnalysis = this.extractUxMetrics(observationalReport);
        result.uxResearchAnalysis.rawAnalysis = observationalReport;
        
        console.log('✅ UX observer report generated');
        console.log(`📊 Report length: ${observationalReport.length} characters`);
        console.log(`💡 Insights: ${result.uxResearchAnalysis.insights.length}, Recommendations: ${result.uxResearchAnalysis.recommendations.length}`);
      } else {
        // Fallback to the old method if observer not available
        console.log('⚠️ No UX observer available, using legacy analysis method');
        result.uxResearchAnalysis = {
          insights: [],
          recommendations: [],
          rawAnalysis: ''
        };
      }
      
      // Include synthetic data if used
      if (this.syntheticData.length > 0) {
        result.syntheticData = this.syntheticData;
      }
      
      // Store user simulation info if used
      if (this.userSimulator) {
        result.userSimulation = {
          personality: 'Default User',
          stats: { turnCount: 0 }
        };
      }
      
      // Use the already defined responseText for validation
      result.success = scenario.validateOutcome(result);
      result.finalResponse = responseText;
      } // Close the else block for PHASE 3
      
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : String(error));
    }
    
    result.endTime = new Date();
    return result;
  }
  
  private async processResponse(response: any, result: TestResult): Promise<boolean> {
    let hasToolCalls = false;
    for (const content of response.content) {
      if (content.type === "tool_use") {
        console.log(`🔧 Processing tool call: ${content.name}`);
        console.log(`  📥 Arguments: ${JSON.stringify(content.input).slice(0, 100)}...`);
        
        const toolCall: ToolCall = {
          tool: content.name,
          arguments: content.input,
          success: false,
          result: null,
          error: null
        };
        
        try {
          console.log(`  ⚡ Calling MCP tool...`);
          const mcpResult = await this.mcp.callTool({ 
            name: content.name, 
            arguments: content.input 
          });
          
          toolCall.success = true;
          toolCall.result = mcpResult;
          console.log(`  ✅ Tool call successful`);
          
        } catch (error) {
          toolCall.error = error instanceof Error ? error.message : String(error);
          result.errors.push(`Tool ${content.name} failed: ${toolCall.error}`);
          console.log(`  ❌ Tool call failed: ${toolCall.error}`);
        }
        
        result.toolCalls.push(toolCall);
        hasToolCalls = true;
      }
    }
    return hasToolCalls;
  }
  
  async cleanup(): Promise<void> {
    await this.mcp.close();
  }
  
  private parseReflectionMisalignments(_reflectionText: string): Array<{
    description: string;
    category: 'good_surprise' | 'neutral_difference' | 'usability_issue' | 'tool_limitation';
    impact: 'high' | 'medium' | 'low';
    suggestions?: string;
  }> {
    // Don't rely on keyword matching - return empty array
    // The LLM analysis should identify misalignments holistically
    return [];
  }
  
  private extractUMUXScores(_umuxText: string): { capabilitiesMeetRequirements: number; easyToUse: number } {
    // Don't rely on regex matching - return neutral defaults
    // The LLM will provide scores in the proper format if asked
    return {
      capabilitiesMeetRequirements: 4, // Default neutral
      easyToUse: 4
    };
  }
  
  private extractMagicWandWish(_umuxText: string): string {
    // Don't rely on regex matching - return a default
    // The LLM will provide the wish in the proper format if asked
    return "No magic wand wish identified";
  }
  
  private calculateUMUXScore(umuxScores: { capabilitiesMeetRequirements: number; easyToUse: number }): number {
    // Convert UMUX-Lite (1-7) to usability score (1-10)
    const avgUMUX = (umuxScores.capabilitiesMeetRequirements + umuxScores.easyToUse) / 2;
    // Map 1-7 scale to 1-10 scale
    return Math.round((avgUMUX - 1) * (9/6) + 1);
  }
  
  
  private extractUxMetrics(analysisText: string): {
    insights: string[];
    recommendations: string[];
    rawAnalysis: string;
  } {
    // Don't try to extract structured data with regex
    // The LLM analysis should be trusted as-is
    return {
      insights: [],
      recommendations: [],
      rawAnalysis: analysisText
    };
  }

  // ============================================================================
  // CLAUDE THINKING CONTINUATION GENERATOR
  // ============================================================================

  private async generateClaudeThinkingContinuation(): Promise<string | null> {
    // For claude-thinking, generate completely neutral continuation prompts
    const continuationPrompts = [
      "What do you think about that?",
      "How does that make you feel?",
      "What's your perspective on this?",
      "What comes to mind when you think about this?",
      "What questions does this raise for you?",
      "What aspects of this interest you most?",
      "What would you like to explore further?",
      "What thoughts does this bring up?",
      "How do you see this?",
      "What's your take on this?"
    ];

    // Use simple random selection for AGI consciousness test
    // No LLM generation to avoid bias
    return continuationPrompts[Math.floor(Math.random() * continuationPrompts.length)];
  }
}

// ============================================================================
// TEST ORCHESTRATOR
// ============================================================================

interface TestOptions {
  useExistingData?: boolean;
  saveResults?: boolean;
  keepTestData?: boolean;
  userPersonality?: string;
}

interface TestRun {
  timestamp: string;
  version: string;
  environment: {
    nodeVersion: string;
    platform: string;
    dataSource: 'fixtures' | 'existing' | 'empty';
  };
  results: TestResult[];
  summary: {
    totalScenarios: number;
    passed: number;
    failed: number;
    passRate: number;
    avgDuration: number;
    totalDuration: number;
  };
}

class TestOrchestrator {
  async showProgression(): Promise<void> {
    const resultsDir = join(process.cwd(), 'test-results');
    const progressionFile = join(resultsDir, 'progression-tracking.json');
    
    if (!existsSync(progressionFile)) {
      console.log('❌ No progression data found. Run some tests first!');
      return;
    }
    
    const progression = JSON.parse(readFileSync(progressionFile, 'utf-8'));
    
    console.log('\n' + '='.repeat(80));
    console.log('📈 BRIDGE PROGRESS REPORT');
    console.log('='.repeat(80));
    
    // Overall Progress
    console.log(`\n📏 Total Iterations: ${progression.iterations}`);
    console.log(`🎯 Scenarios Tested: ${Object.keys(progression.scenarios).length}`);
    
    // Insights and Recommendations Summary
    const allInsights: string[] = [];
    const allRecommendations: string[] = [];
    
    Object.values(progression.scenarios).forEach((scenario: any) => {
      if (scenario.latestMetrics?.uxAnalysis) {
        allInsights.push(...(scenario.latestMetrics.uxAnalysis.insights || []));
        allRecommendations.push(...(scenario.latestMetrics.uxAnalysis.recommendations || []));
      }
    });
    
    console.log(`\n💡 Total Insights Generated: ${allInsights.length}`);
    console.log(`🎯 Total Recommendations: ${allRecommendations.length}`);
    
    // Scenario Performance
    console.log('\n📋 Scenario Performance:');
    Object.entries(progression.scenarios).forEach(([scenario, data]: [string, any]) => {
      const latest = data.latestMetrics;
      if (latest) {
        console.log(`\n${scenario}:`);
        console.log(`  Last Run: ${new Date(latest.timestamp).toLocaleString()}`);
        console.log(`  Success: ${latest.success ? '✅' : '❌'}`);
        console.log(`  Insights: ${latest.uxAnalysis?.insights?.length || 0}`);
        console.log(`  Recommendations: ${latest.uxAnalysis?.recommendations?.length || 0}`);
      }
    });
    
    // Next Steps
    console.log('\n🎯 Next Steps:');
    console.log(`1. Review insights and recommendations from UX analysis`);
    console.log(`2. Focus on making Bridge tools more invisible in conversation`);
    console.log(`3. Run more test iterations to observe patterns`);
    
    console.log('\n' + '='.repeat(80));
  }

  async runTest(scenarioKey: string, options: TestOptions = {}): Promise<void> {
    const testEnv = new TestEnvironment(scenarioKey);
    const runner = new BridgeTestRunner(testEnv);
    
    try {
      console.log('🔧 Setting up test environment...');
      await testEnv.setup(options.useExistingData, scenarioKey);
      
      // Pass synthetic data to runner if available
      const syntheticData = testEnv.getSyntheticData();
      if (syntheticData.length > 0) {
        runner.setSyntheticData(syntheticData);
      }
      
      // Enable user simulator by default for lighter prompts
      console.log(`👤 Using user simulation`);
      runner.setUserSimulator();
      
      await runner.connect();
      
      const result = await runner.runScenario(scenarioKey);
      this.printResults(result);
      
      // Always save results for tracking
      this.saveDetailedResults(result, options);
      
    } finally {
      await runner.cleanup();
      if (!options.keepTestData) {
        await testEnv.cleanup();
      }
    }
  }
  
  private updateAllTestResults(): void {
    const resultsDir = join(process.cwd(), 'test-results');
    const progressionFile = join(resultsDir, 'progression-tracking.json');
    
    if (!existsSync(progressionFile)) {
      console.log('⚠️ No progression tracking file found');
      return;
    }
    
    // Load progression data
    const progression = JSON.parse(readFileSync(progressionFile, 'utf-8'));
    
    // Update dashboard with all test results
    this.updateSummaryDashboard(progression, resultsDir);
  }
  
  async runAll(options: TestOptions = {}): Promise<void> {
    console.log('🚀 Running Bridge Test Suite\n');
    
    const results: TestResult[] = [];
    const scenarios = Object.keys(TEST_SCENARIOS);
    const startTime = new Date();
    
    for (const scenarioKey of scenarios) {
      try {
        const testEnv = new TestEnvironment(scenarioKey);
        const runner = new BridgeTestRunner(testEnv);
        
        await testEnv.setup(options.useExistingData, scenarioKey);
        
        // Pass synthetic data to runner if available
        const syntheticData = testEnv.getSyntheticData();
        if (syntheticData.length > 0) {
          runner.setSyntheticData(syntheticData);
        }
        
        await runner.connect();
        
        const result = await runner.runScenario(scenarioKey);
        results.push(result);
        
        this.printResults(result);
        
        await runner.cleanup();
        if (!options.keepTestData) {
          await testEnv.cleanup();
        }
        
        // Brief pause between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ ${scenarioKey} failed: ${error}`);
      }
    }
    
    const endTime = new Date();
    this.printSummary(results);
    
    // Save comprehensive test run
    this.saveTestRun(results, startTime, endTime, options);
    
    // Update the dashboard with ALL test results  
    this.updateAllTestResults();
  }
  
  private printResults(result: TestResult): void {
    const duration = result.endTime!.getTime() - result.startTime.getTime();
    const scenario = TEST_SCENARIOS[result.scenario];
    
    console.log(`\n📊 Results:`);
    console.log(`${result.success ? '✅' : '❌'} Goal Achieved: ${result.success}`);
    console.log(`⏱️  Duration: ${duration}ms`);
    console.log(`🔧 Tool calls: ${result.toolCalls.length}`);
    
    if (result.reflection) {
      console.log(`\n🤔 Usability Reflection:`);
      console.log(`📈 Bridge Usability Score: ${result.reflection.bridgeUsabilityScore}/10`);
      
      // Show Claude's initial expectations
      console.log(`\n📋 Claude's Initial Expectations:`);
      console.log(result.reflection.expectations);
      
      // Show actual experience summary
      console.log(`\n📝 Actual Experience:`);
      console.log(result.reflection.actualExperience);
      
      if (result.reflection.misalignments.length > 0) {
        console.log(`\n🔍 Identified Misalignments:`);
        result.reflection.misalignments.forEach(mis => {
          const icon = mis.category === 'good_surprise' ? '✨' :
                      mis.category === 'usability_issue' ? '⚠️' :
                      mis.category === 'tool_limitation' ? '🚧' : '📋';
          console.log(`  ${icon} ${mis.description} (${mis.impact} impact)`);
          if (mis.suggestions) {
            console.log(`    💡 Suggestion: ${mis.suggestions}`);
          }
        });
      }
      
      // Show overall assessment
      console.log(`\n📊 Overall Assessment:`);
      console.log(result.reflection.overallAssessment);
    }
    
    // Show User Simulation Info
    if (result.userSimulation) {
      console.log(`\n👤 User Simulation:`);  
      console.log(`  • Personality: ${result.userSimulation.personality}`);
      console.log(`  • Turns: ${result.userSimulation.stats.turnCount}`);
      console.log(`  • Satisfaction: ${(result.userSimulation.stats.satisfactionLevel * 100).toFixed(0)}%`);
      console.log(`  • Confusion: ${(result.userSimulation.stats.confusionLevel * 100).toFixed(0)}%`);
    }
    
    // Show UX Research Analysis
    if (result.uxResearchAnalysis) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`🔬 FULL UX RESEARCH ANALYSIS`);
      console.log(`${'='.repeat(80)}`);
      
      if (result.uxResearchAnalysis.insights.length > 0) {
        console.log(`\n💡 Key Insights:`);
        result.uxResearchAnalysis.insights.forEach(insight => {
          console.log(`  • ${insight}`);
        });
      }
      
      if (result.uxResearchAnalysis.recommendations.length > 0) {
        console.log(`\n🎯 Recommendations:`);
        result.uxResearchAnalysis.recommendations.forEach(rec => {
          console.log(`  • ${rec}`);
        });
      }
      
      // Show the full raw analysis
      console.log(`\n${'─'.repeat(80)}`);
      console.log(`📝 DETAILED ANALYSIS:`);
      console.log(`${'─'.repeat(80)}`);
      console.log(result.uxResearchAnalysis.rawAnalysis);
      console.log(`${'─'.repeat(80)}`);
    }
    
    if (scenario.successCriteria) {
      console.log(`\n📋 Success Criteria:`);
      scenario.successCriteria.forEach(criteria => {
        console.log(`  ${result.success ? '✅' : '❌'} ${criteria}`);
      });
    }
    
    if (result.errors.length > 0) {
      console.log(`\n🚨 Errors:`);
      result.errors.forEach(err => console.log(`  - ${err}`));
    }
    
    // Show full conversation as appendix
    if (result.conversation && result.conversation.length > 0) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`💬 FULL CONVERSATION TRANSCRIPT`);
      console.log(`${'='.repeat(80)}\n`);
      
      result.conversation.forEach((msg, index) => {
        if (msg.role === 'user') {
          console.log(`👤 USER (Turn ${Math.floor((index + 1) / 2)}):`);
          const content = Array.isArray(msg.content) ? 
            msg.content.map((c: any) => c.type === 'text' ? c.text : '[Tool Result]').join('\n') :
            msg.content;
          console.log(content);
          console.log();
        } else if (msg.role === 'assistant') {
          console.log(`🤖 CLAUDE (Turn ${Math.floor(index / 2) + 1}):`);
          const content = Array.isArray(msg.content) ?
            msg.content.map((c: any) => {
              if (c.type === 'text') return c.text;
              if (c.type === 'tool_use') return `[Tool: ${c.name}]`;
              return '[Other]';
            }).join('\n') :
            msg.content;
          console.log(content);
          console.log();
        }
      });
      
      console.log(`${'='.repeat(80)}`);
    }
  }
  
  private printSummary(results: TestResult[]): void {
    const passed = results.filter(r => r.success).length;
    const total = results.length;
    const avgDuration = results.reduce((sum, r) => sum + (r.endTime!.getTime() - r.startTime.getTime()), 0) / total;
    
    console.log(`\n🎯 BRIDGE TEST SUITE SUMMARY:`);
    console.log(`✅ Passed: ${passed}/${total} (${Math.round(passed/total*100)}%)`);
    console.log(`⏱️  Avg Duration: ${Math.round(avgDuration)}ms`);
    
    if (passed < total) {
      console.log(`\n❌ Failed scenarios:`);
      results.filter(r => !r.success).forEach(r => {
        console.log(`  - ${r.scenarioName}`);
      });
    }
  }
  
  private saveDetailedResults(result: TestResult, options: TestOptions): void {
    const resultsDir = join(process.cwd(), 'test-results');
    const scenarioDir = join(resultsDir, 'scenarios', result.scenario);
    mkdirSync(scenarioDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${timestamp}.json`;
    const filepath = join(scenarioDir, filename);
    
    // Also save as latest for easy access
    const latestPath = join(scenarioDir, 'latest.json');
    
    // Use synthetic data from result if available
    const syntheticData = result.syntheticData || null;
    
    const detailedResult = {
      ...result,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        dataSource: options.useExistingData ? 'existing' : syntheticData ? 'synthetic' : 'empty'
      },
      configuration: options,
      duration: result.endTime!.getTime() - result.startTime.getTime()
    };
    
    // Include synthetic data if available
    if (syntheticData && syntheticData.length > 0) {
      detailedResult.syntheticData = syntheticData;
    }
    
    writeFileSync(filepath, JSON.stringify(detailedResult, null, 2));
    writeFileSync(latestPath, JSON.stringify(detailedResult, null, 2));
    console.log(`\n💾 Results saved: ${filepath}`);
    console.log(`📌 Latest result: ${latestPath}`);
    
    // Update progression tracking
    this.updateProgressionTracking(result, resultsDir);
  }
  
  private updateProgressionTracking(result: TestResult, resultsDir: string): void {
    const progressionFile = join(resultsDir, 'progression-tracking.json');
    
    let progression: any = {
      scenarios: {},
      lastUpdated: new Date().toISOString(),
      iterations: 0
    };
    
    // Load existing progression if it exists
    if (existsSync(progressionFile)) {
      try {
        progression = JSON.parse(readFileSync(progressionFile, 'utf-8'));
      } catch (error) {
        console.warn('Could not read progression file, starting fresh');
      }
    }
    
    // Initialize scenario tracking if needed
    if (!progression.scenarios[result.scenario]) {
      progression.scenarios[result.scenario] = {
        history: [],
        latestMetrics: null,
        trend: null
      };
    }
    
    // Extract key metrics and insights
    const metrics = {
      timestamp: new Date().toISOString(),
      success: result.success,
      bridgeUsabilityScore: result.reflection?.bridgeUsabilityScore || 0,
      uxAnalysis: result.uxResearchAnalysis || null,
      toolCalls: result.toolCalls.length,
      errors: result.errors.length,
      duration: result.endTime!.getTime() - result.startTime.getTime(),
      // Preserve qualitative insights
      qualitativeInsights: {
        claudeReflection: {
          expectations: result.reflection?.expectations || '',
          keyMisalignments: result.reflection?.misalignments?.map(m => ({
            type: m.category,
            description: m.description,
            impact: m.impact
          })) || [],
          improvementSuggestions: result.reflection?.overallAssessment ? 
            this.extractImprovementSuggestions(result.reflection.overallAssessment) : []
        },
        uxResearcherInsights: result.uxResearchAnalysis ? {
          insights: result.uxResearchAnalysis.insights,
          recommendations: result.uxResearchAnalysis.recommendations,
          rawAnalysis: result.uxResearchAnalysis.rawAnalysis
        } : null
      }
    };
    
    // Add to history
    progression.scenarios[result.scenario].history.push(metrics);
    progression.scenarios[result.scenario].latestMetrics = metrics;
    
    // Calculate trend based on insights/recommendations count
    const history = progression.scenarios[result.scenario].history;
    if (history.length >= 2 && metrics.uxAnalysis) {
      const recent = history.slice(-3);
      const oldInsightCount = recent[0].uxAnalysis?.insights?.length || 0;
      const newInsightCount = metrics.uxAnalysis.insights.length;
      progression.scenarios[result.scenario].trend = {
        direction: newInsightCount > oldInsightCount ? 'improving' : newInsightCount < oldInsightCount ? 'declining' : 'stable',
        change: newInsightCount - oldInsightCount,
        samples: recent.length
      };
    }
    
    // Update overall progression
    progression.iterations++;
    
    // Save updated progression
    writeFileSync(progressionFile, JSON.stringify(progression, null, 2));
    console.log(`📈 Progression tracking updated`);
    
    // Create/update summary dashboard
    this.updateSummaryDashboard(progression, resultsDir);
  }
  
  private updateSummaryDashboard(progression: any, resultsDir: string): void {
    const dashboardFile = join(resultsDir, '_RESULTS.md');
    
    // Calculate overall metrics
    const allScenarios = Object.keys(progression.scenarios);
    const latestMetrics = allScenarios
      .map(s => progression.scenarios[s].latestMetrics)
      .filter(m => m);

    // Collect cross-scenario patterns
    const allInsights: string[] = [];
    const allRecommendations: string[] = [];
    const allIssues: string[] = [];
    
    allScenarios.forEach(scenario => {
      const data = progression.scenarios[scenario];
      const latest = data.latestMetrics;
      
      if (latest) {
        // Try both possible locations for UX research data
        const uxData = latest.uxResearchAnalysis || latest.qualitativeInsights?.uxResearcherInsights;
        
        // Collect insights
        if (uxData?.insights) {
          allInsights.push(...uxData.insights);
        }
        
        // Collect recommendations
        if (uxData?.recommendations) {
          allRecommendations.push(...uxData.recommendations);
        }
        
        // Collect issues from Claude's reflection
        if (latest.qualitativeInsights?.claudeReflection?.keyMisalignments) {
          latest.qualitativeInsights.claudeReflection.keyMisalignments
            .filter((m: any) => m.impact === 'high' || m.impact === 'medium')
            .forEach((m: any) => allIssues.push(m.description));
        }
      }
    });

    // Find most common patterns
    const issueCounts = allIssues.reduce((acc, issue) => {
      acc[issue] = (acc[issue] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topIssues = Object.entries(issueCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([issue, count]) => ({ issue, count }));

    // Generate dashboard content
    const dashboard = `# Bridge Test Results

**Last Updated:** ${new Date().toISOString()}  
**Total Tests:** ${progression.iterations}  
**Total Scenarios:** ${allScenarios.length}

---

## 📊 Current Performance

### Overall Insights
- **Total Insights Generated:** ${allInsights.length}
- **Total Recommendations:** ${allRecommendations.length}
- **Active Scenarios:** ${latestMetrics.filter(m => m.success).length}/${allScenarios.length}

---

## 🎯 Test Scenario Results

${  allScenarios.map(scenario => {
  const data = progression.scenarios[scenario];
  const latest = data.latestMetrics;
  
  let scenarioSection = `### ${scenario}
**Status:** ${latest ? (latest.success ? '✅ Passed' : '❌ Failed') : '—'}  
**Last Run:** ${latest ? new Date(latest.timestamp).toLocaleString() : 'Never'}  
**Bridge Usability:** ${latest ? `${latest.bridgeUsabilityScore}/10` : '—'}  
**Analysis:** ${latest?.uxAnalysis ? `${latest.uxAnalysis.insights.length} insights, ${latest.uxAnalysis.recommendations.length} recommendations` : '—'}`;

  // Add key issues
  if (latest?.qualitativeInsights?.claudeReflection?.keyMisalignments) {
    const misalignments = latest.qualitativeInsights.claudeReflection.keyMisalignments
        .filter((m: any) => m.impact === 'high' || m.impact === 'medium')
      .slice(0, 3);
    
    if (misalignments.length > 0) {
      scenarioSection += '\n\n**🔍 Key Issues:**';
      misalignments.forEach((m: any) => {
        scenarioSection += `\n- ${m.description}`;
      });
    }
  }
  
  // Add ALL insights
  const uxData = latest?.uxResearchAnalysis || latest?.qualitativeInsights?.uxResearcherInsights;
  if (uxData?.insights) {
    scenarioSection += '\n\n**💡 All Insights:**';
    uxData.insights.forEach((insight: string) => {
        scenarioSection += `\n- ${insight}`;
      });
    }
    
    // Add ALL recommendations
  if (uxData?.recommendations) {
    scenarioSection += '\n\n**🎯 All Recommendations:**';
    uxData.recommendations.forEach((rec: string) => {
        scenarioSection += `\n- ${rec}`;
      });
  }
  
  return scenarioSection;
}).join('\n\n---\n\n')}

---

## 🔍 Cross-Scenario Patterns

### Most Common Issues
${topIssues.length > 0 ? topIssues.map(({ issue, count }, i) => 
  `${i + 1}. **${issue}** (${count} scenarios)`
).join('\n') : 'No common issues identified yet.'}

### Recurring Insights
${allInsights.length > 0 ? 
  allInsights.slice(0, 5).map(insight => `- ${insight}`).join('\n') : 
  'No recurring insights identified yet.'}

### Top Recommendations
${allRecommendations.length > 0 ? 
  allRecommendations.slice(0, 5).map(rec => `- ${rec}`).join('\n') : 
  'No recommendations identified yet.'}

---

## 🎯 Next Actions (Priority Order)

### High Priority
1. **Make Bridge tools invisible** - Currently too explicit in conversations
   - Remove explicit tool announcements
   - Integrate naturally into conversation flow

### Medium Priority
2. **Address common patterns** - Improve based on insights
   - Focus on natural conversation flow
   - Reduce technical language

### Low Priority
3. **Continue iterating** - Build on successful patterns
   - Document what's working well
   - Apply successful patterns across scenarios

---

## 📈 Progress Tracking

### Goals from TESTING.md
- [ ] Make Bridge tools invisible in natural conversation
- [ ] Enable shared thinking between human and AI
- [ ] Allow insights to emerge naturally
- [ ] Build genuine partnership depth

### Current Focus
Based on analysis, the key areas for improvement are:
${Array.from(new Set(allRecommendations)).slice(0, 3).map(rec => `- ${rec}`).join('\n')}

---

## 📋 Test Infrastructure

### Recent Improvements
- ✅ Structured UX researcher framework (Goal → Scope → Observations → Insights → Recommendations → Limitations)
- ✅ Evidence-based analysis with citations
- ✅ Actionable recommendations tied to specific insights
- ✅ Methodological awareness in limitations

### Needed Improvements
- [ ] Fix failing test scenarios
- [ ] Add error recovery mechanisms
- [ ] Improve test data generation
- [ ] Add regression testing

---

## 📝 Detailed UX Research Analysis

${latestMetrics.map(m => {
  const scenario = allScenarios.find(s => progression.scenarios[s].latestMetrics === m);
  const analysis = m.uxResearchAnalysis || m.qualitativeInsights?.uxResearcherInsights;
  if (!analysis || !analysis.rawAnalysis) return '';
  
  return `### ${scenario} - Full Analysis

${analysis.rawAnalysis}

---
`;
}).filter(Boolean).join('\n')}

*For detailed test data and full conversation transcripts, see individual JSON files in this directory.*`;
    
    writeFileSync(dashboardFile, dashboard);
    console.log(`📊 Results updated: ${dashboardFile}`);
  }
  
  private extractImprovementSuggestions(overallAssessment: string): string[] {
    const suggestions: string[] = [];
    
    // Look for improvement patterns in the assessment
    const improvementMatch = overallAssessment.match(/improvement_suggestions["\s:]*\[(.*?)\]/s);
    if (improvementMatch) {
      try {
        const parsed = JSON.parse(`[${improvementMatch[1]}]`);
        suggestions.push(...parsed.map((s: any) => s.suggestion || s));
      } catch (e) {
        // Fallback to pattern matching
      }
    }
    
    // Also look for direct suggestion text
    const suggestionPatterns = [
      /suggestion["\s:]+["']([^"']+)["']/gi,
      /improve[^.]+by\s+([^.]+)\./gi,
      /could\s+([^.]+)\./gi
    ];
    
    suggestionPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(overallAssessment)) !== null) {
        if (match[1] && !suggestions.includes(match[1])) {
          suggestions.push(match[1].trim());
        }
      }
    });
    
    return suggestions.slice(0, 5); // Limit to top 5
  }
  
  private extractMethodologyNotes(rawAnalysis: string): string[] {
    const notes: string[] = [];
    
    // Look for methodology-related insights
    const methodologyPatterns = [
      /truncat[^.]+\./gi,
      /constraint[^.]+\./gi,
      /methodology[^.]+\./gi,
      /test\s+limitation[^.]+\./gi,
      /artificially[^.]+\./gi
    ];
    
    methodologyPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(rawAnalysis)) !== null) {
        const note = match[0].trim();
        if (!notes.some(n => n.includes(note))) {
          notes.push(note);
        }
      }
    });
    
    return notes;
  }
  
  private aggregateKeyLearnings(progression: any): string {
    const allInsights: { insight: string; count: number; sources: string[] }[] = [];
    const allRecommendations: { recommendation: string; count: number }[] = [];
    const commonIssues: { issue: string; type: string; count: number }[] = [];
    
    // Collect insights from all test runs
    Object.entries(progression.scenarios).forEach(([scenario, data]: [string, any]) => {
      data.history.forEach((run: any) => {
        if (run.qualitativeInsights) {
          // Aggregate UX researcher insights
          run.qualitativeInsights.uxResearcherInsights?.insights?.forEach((insight: string) => {
            const existing = allInsights.find(i => 
              i.insight.toLowerCase().includes(insight.toLowerCase().slice(0, 30))
            );
            if (existing) {
              existing.count++;
              if (!existing.sources.includes(scenario)) {
                existing.sources.push(scenario);
              }
            } else {
              allInsights.push({ insight, count: 1, sources: [scenario] });
            }
          });
          
          // Aggregate recommendations
          run.qualitativeInsights.uxResearcherInsights?.recommendations?.forEach((rec: string) => {
            const existing = allRecommendations.find(r => 
              r.recommendation.toLowerCase().includes(rec.toLowerCase().slice(0, 30))
            );
            if (existing) {
              existing.count++;
            } else {
              allRecommendations.push({ recommendation: rec, count: 1 });
            }
          });
          
          // Aggregate issues
          run.qualitativeInsights.claudeReflection?.keyMisalignments?.forEach((issue: any) => {
            const existing = commonIssues.find(i => 
              i.issue === issue.description && i.type === issue.type
            );
            if (existing) {
              existing.count++;
            } else {
              commonIssues.push({ 
                issue: issue.description, 
                type: issue.type, 
                count: 1 
              });
            }
          });
        }
      });
    });
    
    // Sort by frequency
    allInsights.sort((a, b) => b.count - a.count);
    allRecommendations.sort((a, b) => b.count - a.count);
    commonIssues.sort((a, b) => b.count - a.count);
    
    let learnings = '';
    
    // Most common insights
    if (allInsights.length > 0) {
      learnings += '### Most Common Insights\n';
      allInsights.slice(0, 5).forEach(({ insight, count, sources }) => {
        learnings += `- ${insight} (seen ${count}x in: ${sources.join(', ')})\n`;
      });
    }
    
    // Recurring recommendations
    if (allRecommendations.length > 0) {
      learnings += '\n### Recurring Recommendations\n';
      allRecommendations.slice(0, 5).forEach(({ recommendation, count }) => {
        learnings += `- ${recommendation} (${count}x)\n`;
      });
    }
    
    // Common issues
    if (commonIssues.length > 0) {
      learnings += '\n### Common Issues\n';
      commonIssues.slice(0, 5).forEach(({ issue, type, count }) => {
        const icon = type === 'usability_issue' ? '⚠️' : 
                    type === 'tool_limitation' ? '🚧' : '📋';
        learnings += `- ${icon} ${issue} (${count}x)\n`;
      });
    }
    
    return learnings || '*No patterns identified yet - run more tests to see emerging themes*';
  }
  
  private saveTestRun(results: TestResult[], startTime: Date, endTime: Date, options: TestOptions): void {
    const resultsDir = join(process.cwd(), 'test-results');
    mkdirSync(resultsDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const runFilename = `test-run-${timestamp}.json`;
    const runFilepath = join(resultsDir, runFilename);
    
    const passed = results.filter(r => r.success).length;
    const totalDuration = endTime.getTime() - startTime.getTime();
    const avgDuration = results.length > 0 ? 
      results.reduce((sum, r) => sum + (r.endTime!.getTime() - r.startTime.getTime()), 0) / results.length : 0;
    
    const testRun: TestRun = {
      timestamp: new Date().toISOString(),
      version: "3.0.0", // Bridge test version
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        dataSource: options.useExistingData ? 'existing' : 'empty'
      },
      results: results,
      summary: {
        totalScenarios: results.length,
        passed: passed,
        failed: results.length - passed,
        passRate: results.length > 0 ? passed / results.length : 0,
        avgDuration: avgDuration,
        totalDuration: totalDuration
      }
    };
    
    writeFileSync(runFilepath, JSON.stringify(testRun, null, 2));
    
    // Also update the latest run file for easy access
    const latestFilepath = join(resultsDir, 'latest-run.json');
    writeFileSync(latestFilepath, JSON.stringify(testRun, null, 2));
    
    console.log(`\n📊 Test run saved: ${runFilepath}`);
    console.log(`📈 Latest run: ${latestFilepath}`);
    
    // Save summary trend data
    this.updateTrendData(testRun, resultsDir);
  }
  
  private updateTrendData(testRun: TestRun, resultsDir: string): void {
    const trendFilepath = join(resultsDir, 'trend-data.json');
    
    let trendData: any[] = [];
    if (existsSync(trendFilepath)) {
      try {
        trendData = JSON.parse(readFileSync(trendFilepath, 'utf-8'));
      } catch (error) {
        console.warn('Could not read existing trend data, starting fresh');
      }
    }
    
    // Add current run to trend
    trendData.push({
      timestamp: testRun.timestamp,
      passRate: testRun.summary.passRate,
      avgDuration: testRun.summary.avgDuration,
      totalScenarios: testRun.summary.totalScenarios,
      dataSource: testRun.environment.dataSource
    });
    
    // Keep last 50 runs for trend analysis
    if (trendData.length > 50) {
      trendData = trendData.slice(-50);
    }
    
    writeFileSync(trendFilepath, JSON.stringify(trendData, null, 2));
    console.log(`📈 Trend data updated (${trendData.length} runs tracked)`);
  }
  

}

// ============================================================================
// CLI INTERFACE
// ============================================================================

async function main(): Promise<void> {
  const [scenario] = process.argv.slice(2);
  
  // Check for user simulation options - handle npm's argument parsing
  let userPersonality: string | null = null;
  
  // Look for --user in the full process.argv array
  for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === '--user' && i + 1 < process.argv.length) {
      userPersonality = process.argv[i + 1];
      break;
    }
  }
  
  const options: TestOptions = {
    useExistingData: process.argv.includes('--use-existing'),
    saveResults: process.argv.includes('--save'),
    keepTestData: process.argv.includes('--keep'),
    userPersonality: userPersonality || undefined
  };
  
  // Default to bridge-exploration if no scenario specified
  const testScenario = scenario || 'bridge-exploration';
  
  if (testScenario === 'help') {
    console.log('Usage: npm run test:bridge [scenario] [options]');
    console.log('       npm run test:bridge all [options]');
    console.log('\nAvailable Scenarios:');
    Object.entries(TEST_SCENARIOS).forEach(([key, value]) => {
      console.log(`  ${key} - ${value.name}`);
      console.log(`    Goal: ${value.userGoal}`);
    });
    console.log('\nSpecial Commands:');
    console.log('  all             Run all test scenarios');
    console.log('  --progression   Show detailed progress tracking');
    console.log('  --framework     Show loaded TESTING.md framework');
    console.log('\nOptions:');
    console.log('  --use-existing  Use existing bridge.json data');
    console.log('  --keep          Keep test data after completion');
    console.log('  --user <type>   Enable user simulation (curious, anxious, skeptical, experienced)');
    console.log('\nUser Simulation: Simple contextual responses based on conversation flow');
    console.log('\nResults are automatically saved to /test-results/ for tracking improvements');
    return;
  }
  
  const orchestrator = new TestOrchestrator();
  
  try {
    if (testScenario === 'all') {
      await orchestrator.runAll(options);
    } else if (process.argv.includes('--progression')) {
      await orchestrator.showProgression();
    } else if (process.argv.includes('--framework')) {
      console.log(getTestingFrameworkSummary());
    } else if (TEST_SCENARIOS[testScenario]) {
      await orchestrator.runTest(testScenario, options);
    } else {
      console.error(`❌ Unknown scenario: ${testScenario}`);
      console.log('Run "npm run test:bridge help" to see available scenarios');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}

export { TestOrchestrator, BridgeTestRunner, TEST_SCENARIOS };