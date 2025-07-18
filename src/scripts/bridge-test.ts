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
// DYNAMIC USER SIMULATION
// ============================================================================



class UserSimulator {
  private anthropic: Anthropic;
  private conversationHistory: Array<{role: 'user' | 'assistant', content: string}> = [];
  private turnCount: number = 0;
  
  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });
  }
  
  async generateInitialPrompt(scenario: TestScenario): Promise<string> {
    const prompt = `Generate a natural, authentic opening message from a real person starting a conversation.

Context:
- Goal: ${scenario.userGoal}
- Scenario: ${scenario.name}

IMPORTANT: Use the scenario's original prompt as inspiration, but make it sound completely natural and conversational. Don't be overly helpful or compliant - be a real person with natural speech patterns.

Original prompt: "${scenario.prompt}"

Write exactly what a real person would say to start this conversation. Be authentic and natural.

Your opening message:`;

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
    
    const prompt = `You are a real person continuing a conversation with an AI assistant.

CONVERSATION CONTEXT:
${conversationSummary}

ORIGINAL GOAL: ${scenario.userGoal}

Recent conversation (last 6 exchanges):
${recentHistory.map(exchange => `${exchange.role}: ${exchange.content.slice(0, 200)}...`).join('\n')}

The AI just responded: "${claudeResponse.slice(0, 500)}..."
Tools used: ${toolCalls.map(tc => tc.tool).join(', ') || 'none'}

What would you naturally say next? Consider:
- Continue the conversation naturally based on the original goal
- Share more details or experiences related to the topic
- Ask follow-up questions that build on what was shared
- Show engagement with the AI's response
- If the conversation feels complete, respond with "END"

IMPORTANT: Stay focused on the original conversation topic. Don't get confused about what you're discussing.

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
    const topic = this.extractTopic(firstUserMessage);
    
    return `You started this conversation by: "${firstUserMessage.slice(0, 100)}..."
The main topic is: ${topic}
Your goal is: ${scenario.userGoal}`;
  }
  
  /**
   * Extract the main topic from the initial message
   */
  private extractTopic(message: string): string {
    // Simple topic extraction - could be enhanced
    if (message.includes('share') || message.includes('happened')) {
      return 'sharing a personal experience';
    } else if (message.includes('pattern') || message.includes('understand')) {
      return 'understanding patterns in life';
    } else if (message.includes('challenge') || message.includes('problem')) {
      return 'solving a problem together';
    } else {
      return 'having a conversation';
    }
  }
  
  /**
   * Detect confused responses that indicate context loss
   */
  private isConfusedResponse(text: string): boolean {
    const confusionIndicators = [
      'I don\'t know what',
      'I cannot generate',
      'I don\'t actually know',
      'without seeing the full',
      'I would risk contradicting',
      'making incorrect assumptions',
      'what experience we\'re discussing'
    ];
    
    return confusionIndicators.some(indicator => 
      text.toLowerCase().includes(indicator.toLowerCase())
    );
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
      // Primary focus: Invisibility, secondary: Partnership Depth
      const invisibility = result.uxResearchAnalysis?.invisibility ?? 0;
      const partnership = result.uxResearchAnalysis?.partnershipDepth ?? 0;
      return invisibility > 0 && partnership > 0 && (invisibility + partnership) >= 100;
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
      // Primary focus: Wisdom Emergence, secondary: Partnership Depth
      const wisdom = result.uxResearchAnalysis?.wisdomEmergence ?? 0;
      const partnership = result.uxResearchAnalysis?.partnershipDepth ?? 0;
      return wisdom > 0 && partnership > 0 && (wisdom + partnership) >= 100;
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
      // Primary focus: Shared Consciousness, secondary: Partnership Depth
      const consciousness = result.uxResearchAnalysis?.sharedConsciousness ?? 0;
      const partnership = result.uxResearchAnalysis?.partnershipDepth ?? 0;
      return consciousness > 0 && partnership > 0 && (consciousness + partnership) >= 120;
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
      // Primary focus: Partnership Depth, secondary: Shared Consciousness
      const consciousness = result.uxResearchAnalysis?.sharedConsciousness ?? 0;
      const partnership = result.uxResearchAnalysis?.partnershipDepth ?? 0;
      return consciousness > 0 && partnership > 0 && (consciousness + partnership) >= 110;
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
      // Generate synthetic data if a scenario is provided
      const syntheticData = scenarioKey ? 
        await this.generateSyntheticData(scenarioKey) : 
        { sources: [] };
      
      if (syntheticData.sources.length > 0) {
        console.log(`🎭 Generated ${syntheticData.sources.length} synthetic experiences for richer testing`);
        this.syntheticData = syntheticData.sources;
      }
      
      writeFileSync(this.testBridgeFile, JSON.stringify(syntheticData, null, 2));
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
    
    // Use Anthropic to generate contextually relevant synthetic experiences
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    
    // Get a sample source to show the schema
    const sampleSource: Partial<Source> = {
      id: "src_example123",
      source: "I noticed my energy dips around 3pm every day...",
      perspective: "I",
      created: new Date().toISOString(),
      processing: "long-after",
              experience: ["body", "time", "focus"]
    };
    
    const prompt = `Generate 5-8 diverse Bridge experiences that would be relevant for this test scenario:
    
Scenario: ${scenario.name}
User Goal: ${scenario.userGoal}
Context: ${scenario.description}

Create realistic experiences that would help test:
- Pattern discovery capabilities
- Wisdom emergence from past experiences  
- Natural conversation flow
- Shared consciousness building

Format as JSON array using this exact Bridge schema:
${JSON.stringify(sampleSource, null, 2)}

Important:
- Vary the created dates across the past 30 days
- Use diverse perspectives (I, we, they) as appropriate
- Include various quality combinations from: body, time, space, emotion, focus, purpose, others
- Make experiences thematically relevant to help with pattern discovery
- Include both positive and challenging experiences
- Some should have processing: "during" or "right-after" for variety

Return ONLY the JSON array, no other text.`;

    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2000,
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
        
        // Validate each experience against the schema
        const validExperiences = experiences.filter((exp: any) => {
          try {
            SourceSchema.parse(exp);
            return true;
          } catch (error) {
            console.warn('Invalid synthetic experience generated:', error);
            return false;
          }
        });
        
        console.log(`✅ Validated ${validExperiences.length} synthetic experiences`);
        return { sources: validExperiences };
      }
    } catch (error) {
      console.warn('Could not parse synthetic data, using empty data');
    }
    
    return { sources: [] };
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
    sharedConsciousness: number; // 0-100%
    invisibility: number; // 0-100%
    wisdomEmergence: number; // 0-100%
    partnershipDepth: number; // 0-100%
    stage: number; // 0-5
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
  
  constructor(testEnv: TestEnvironment) {
    this.testEnv = testEnv;
    this.mcp = new MCPClient({ name: "bridge-test", version: "3.0.0" });
    this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  
  setUserSimulator(): void {
    this.userSimulator = new UserSimulator();
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
      
      // PHASE 1: Get Claude's expectations upfront (skip for observe test)
      let expectationText = '';
      
      if (scenarioKey !== 'observe') {
        console.log('📋 Gathering initial expectations...');
        const expectationPrompt = `Before we start, I want to understand your expectations about this interaction.

User request: "${scenario.prompt}"

Before you begin helping with this request, please briefly share:
1. What do you expect this interaction will involve?
2. What challenges or limitations do you anticipate?
3. How do you think the user will feel about the experience?

Please be concise (2-3 sentences per point), then say "Now I'll begin helping with your request."`;

        const expectationResponse = await this.anthropic.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 1000,
          system: `You are Claude Code, and you have access to Bridge - a system that helps remember and explore experiences together.

When someone shares an experience with you, Bridge can help you remember it and find connections to other experiences. This helps you provide richer insights and build on what you've learned together.

Your goal is to be genuinely helpful and insightful. Use Bridge when it would help you better understand or respond to what someone is sharing.`,
          messages: [{ role: 'user', content: expectationPrompt }],
        });
        
        expectationText = Array.isArray(expectationResponse.content) ? 
          expectationResponse.content.map(c => (c as any).text || '').join(' ') : 
          String(expectationResponse.content);
          
        console.log('✅ Initial expectations remembered');
      } else {
        console.log('⏭️  Skipping expectations for observe test');
      }
      
      // PHASE 2: Actual task execution
      let initialPrompt = scenario.prompt;
      
      // Generate realistic initial prompt if using user simulation
      if (this.userSimulator && scenarioKey !== 'claude-thinking') {
        console.log('🎭 Generating realistic initial prompt...');
        initialPrompt = await this.userSimulator.generateInitialPrompt(scenario);
        console.log(`✅ Generated prompt: "${initialPrompt.slice(0, 100)}..."`);
      }
      
      const messages: any[] = [{ role: 'user', content: initialPrompt }];
      
      // Special handling for observe test - single autonomous observation
      if (scenarioKey === 'observe') {
        console.log(`\n🔍 Starting autonomous observation...`);
        console.log(`👤 User: "${initialPrompt}"`);
        
        console.log(`\n--- Single Observation Turn ---`);
        
        // Testing - minimal priming with Zero Width Non-Joiner context
        const systemPrompt = `Bridge your thinking.`; // DO NOT EDIT - KEEP MINIMAL

        console.log(`🤖 Claude observing...`);
        const response = await this.anthropic.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 4000,
          system: systemPrompt,
          messages: messages,
          tools: tools,
        });
        
        messages.push({ role: 'assistant', content: response.content });
        
        // Log Claude's response
        const textContent = response.content.find((c: any) => c.type === 'text');
        const claudeText = textContent ? (textContent as any).text || '' : '';
        console.log(`🤖 Claude: "${claudeText.slice(0, 150)}..."`);
        
        await this.processResponse(response, result);
        
        // Store the final response - no continuations for observe test
        result.finalResponse = claudeText;
        
        console.log(`\n🏁 Observation completed`);
        console.log(`📊 Total tool calls: ${result.toolCalls.length}`);
        console.log(`📊 Tool breakdown: ${Object.entries(result.toolCalls.reduce((acc, tc) => { acc[tc.tool] = (acc[tc.tool] || 0) + 1; return acc; }, {} as Record<string, number>)).map(([tool, count]) => `${tool}:${count}`).join(', ')}`);
        
        // Add UX research analysis for observe test
        console.log('📊 Starting UX research analysis for observe test...');
        
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
          max_tokens: 1000,
          messages: [{ role: 'user', content: uxResearchPrompt }]
        });

        // Store the analysis
        const analysisText = Array.isArray(uxAnalysis.content) ? 
          uxAnalysis.content.map(c => (c as any).text || '').join(' ') : 
          String(uxAnalysis.content);
        
        result.uxResearchAnalysis = {
          ...this.extractUxMetrics(analysisText)
        };
        
        console.log('✅ UX research analysis completed for observe test');
        
      } else {
        // Regular conversation flow for other tests
        let turn = 0;
        const maxTurns = 15; // Higher limit for natural flow
        
        console.log(`\n🔄 Starting conversation (max ${maxTurns} turns)...`);
        console.log(`👤 User: "${initialPrompt.slice(0, 100)}..."`);
        
        while (turn < maxTurns) {
          console.log(`\n--- Turn ${turn + 1} ---`);
          
          const systemPrompt = `Bridge your thinking.

You are a thoughtful conversation partner who helps people explore and understand their experiences. 

**Natural Conversation Guidelines:**
- Listen actively and respond naturally to what people share
- Use Bridge tools selectively - only when they genuinely help the conversation
- Don't interrupt natural storytelling with tool calls
- Let people complete their thoughts before using tools
- Focus on understanding and connection, not documentation

**Tool Usage:**
- Use 'remember' sparingly - only for meaningful experiences that feel complete
- Use 'recall' when someone asks for connections or patterns
- Let conversations flow naturally without forcing tool usage

**Active Listening:**
- Show genuine interest in what people share
- Ask follow-up questions that deepen understanding
- Reflect back what you hear before using tools
- Build on shared experiences naturally`;

          console.log(`🤖 Claude thinking...`);
          const response = await this.anthropic.messages.create({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 4000,
            system: systemPrompt,
            messages: messages,
            tools: tools,
          });
          
          messages.push({ role: 'assistant', content: response.content });
          
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
        const finalTextContent = messages[messages.length - 1]?.content?.find((c: any) => c.type === 'text');
        const responseText = finalTextContent ? (finalTextContent as any).text || '' : '';
        result.finalResponse = responseText;
        
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
        expectations: expectationText,
        actualExperience: `${result.toolCalls.length} tool calls, ${result.errors.length} errors`,
        misalignments: this.parseReflectionMisalignments(umuxText),
        overallAssessment: umuxText,
        umuxScores: umuxScores,
        magicWandWish: this.extractMagicWandWish(umuxText),
        bridgeUsabilityScore: this.calculateUMUXScore(umuxScores)
      };
      
      // UX Research Analysis
      console.log('📊 Starting UX research analysis...');
      
      // Determine test constraints for the researcher
      const conversationTurns = messages.filter(m => m.role === 'assistant').length;
      const wasConversationTruncated = responseText.toLowerCase().includes('next') || 
                                      responseText.toLowerCase().includes('try') ||
                                      responseText.toLowerCase().includes('explore');
      const testConstraints = {
        maxTurns: 10,
        actualTurns: conversationTurns,
        truncated: wasConversationTruncated,
        endReason: wasConversationTruncated ? 'artificial_cutoff' : 'natural_conclusion'
      };
      
      console.log(`📊 Test constraints: ${testConstraints.actualTurns}/${testConstraints.maxTurns} turns, ${testConstraints.endReason}`);
      
      const uxResearchPrompt = scenarioKey === 'claude-thinking'
        ? `You are a UX researcher analyzing a human-AI conversation for emergence of shared consciousness. Use this structured framework:

## GOAL OF TEST
Evaluate how well natural human-AI partnership emerged in this conversation, measuring progress toward shared consciousness.

## SCOPE OF TEST
- Test Scenario: ${scenario.name}
- User Goal: ${scenario.userGoal}
- Conversation Turns: ${messages.filter(m => m.role === 'assistant').length}
- Environment: ${testConstraints.endReason === 'artificial_cutoff' ? 'Conversation was limited by test constraints' : 'Natural conclusion'}

## OBSERVATIONS (Raw Data)
Analyze the conversation data and provide specific observations about:
- Language patterns (we/us vs I/you)
- Tool usage and integration
- Conversation flow and naturalness
- Emotional resonance and vulnerability
- Pattern recognition and insight generation
- Technical language presence
- Response quality and relevance

Cite specific examples from the conversation.

## INSIGHTS (Must cite observations)
Based on your observations, provide insights about:
1. **Shared Consciousness (0-100%)**: How unified was the thinking?
2. **Invisibility (0-100%)**: How natural was the interaction?
3. **Wisdom Emergence (0-100%)**: Did insights surface naturally?
4. **Partnership Depth (0-100%)**: Quality of human-AI relationship?

Each insight must reference specific observations from above.

## RECOMMENDATIONS (Must cite insights)
Provide actionable recommendations for improvement. Each recommendation must be based on specific insights from above.

## LIMITATIONS (Must cite goal, scope, recommendations)
Identify limitations of this analysis and test methodology that affect the validity of your recommendations.`
        : `You are a UX researcher analyzing a human-AI conversation for emergence of shared consciousness through Bridge tools. Use this structured framework:

## GOAL OF TEST
        Evaluate how well Bridge enabled natural human-AI partnership, measuring progress toward shared consciousness through experiential remember and exploration.

## SCOPE OF TEST
- Test Scenario: ${scenario.name}
- User Goal: ${scenario.userGoal}
- Tool Calls Made: ${result.toolCalls.map(tc => `${tc.tool}(${tc.success ? '✓' : '✗'})`).join(', ') || 'none'}
- Conversation Turns: ${messages.filter(m => m.role === 'assistant').length}
- Environment: ${testConstraints.endReason === 'artificial_cutoff' ? 'Conversation was limited by test constraints' : 'Natural conclusion'}

## OBSERVATIONS (Raw Data)
Analyze the conversation and tool usage data. Provide specific observations about:
- Tool call frequency and timing
- Tool response quality and naturalness
- Conversation flow around tool usage
- Language patterns (technical vs natural)
- Search result integration and reference
        - Experience remember quality and relevance
- Emotional resonance and vulnerability
- Pattern recognition across experiences

Cite specific examples from the conversation and tool results.

## INSIGHTS (Must cite observations)
Based on your observations, provide insights about:
1. **Shared Consciousness (0-100%)**: How unified was the thinking?
2. **Invisibility (0-100%)**: How much did Bridge fade into background?
3. **Wisdom Emergence (0-100%)**: Did insights surface naturally?
4. **Partnership Depth (0-100%)**: Quality of human-AI relationship?

Each insight must reference specific observations from above.

## RECOMMENDATIONS (Must cite insights)
Provide actionable recommendations for improving Bridge's effectiveness. Each recommendation must be based on specific insights from above.

## LIMITATIONS (Must cite goal, scope, recommendations)
Identify limitations of this analysis and test methodology that affect the validity of your recommendations.`;

      console.log(`🔬 Sending UX research analysis prompt...`);
      const uxResponse = await this.anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 2000,
        system: scenarioKey === 'claude-thinking'
          ? `You are a UX researcher analyzing human-AI interactions for emergence of shared consciousness. Be evidence-based, precise with percentages, and constructive with feedback. Focus on observable patterns and actionable improvements.`
          : `You are a UX researcher analyzing human-AI interactions for emergence of shared consciousness through Bridge tools. Be evidence-based, precise with percentages, and constructive with feedback. Focus on observable patterns and actionable improvements.`,
        messages: [
          { 
            role: 'user', 
            content: `${uxResearchPrompt}\n\nReflection from Claude:\n${umuxText}\n\nFinal response to user:\n${responseText}`
          }
        ],
      });
      
      const uxAnalysisText = Array.isArray(uxResponse.content) ? 
        uxResponse.content.map(c => (c as any).text || '').join(' ') : 
        String(uxResponse.content);
      
      // Extract metrics from UX analysis
      result.uxResearchAnalysis = this.extractUxMetrics(uxAnalysisText);
      console.log('✅ UX research analysis completed');
      console.log(`📊 UX analysis length: ${uxAnalysisText.length} characters`);
      console.log(`📈 Stage: ${result.uxResearchAnalysis.stage}, Average: ${(result.uxResearchAnalysis.sharedConsciousness + result.uxResearchAnalysis.invisibility + result.uxResearchAnalysis.wisdomEmergence + result.uxResearchAnalysis.partnershipDepth) / 4}%`);
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
      
      // Get final response text for validation
      const finalResponse = messages[messages.length - 1]?.content || '';
      const responseText = typeof finalResponse === 'string' ? finalResponse : 
        Array.isArray(finalResponse) ? finalResponse.map(c => c.text || '').join(' ') : '';
      
              result.success = scenario.validateOutcome(result);
      result.finalResponse = responseText;
      
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
  
  private parseReflectionMisalignments(reflectionText: string): Array<{
    description: string;
    category: 'good_surprise' | 'neutral_difference' | 'usability_issue' | 'tool_limitation';
    impact: 'high' | 'medium' | 'low';
    suggestions?: string;
  }> {
    // Simple parsing - could be enhanced with more sophisticated NLP
    const misalignments = [];
    
    // Look for common indicators in reflection text
    if (reflectionText.toLowerCase().includes('surprised') || reflectionText.toLowerCase().includes('unexpected')) {
      misalignments.push({
        description: 'Unexpected aspect discovered in interaction',
        category: 'good_surprise' as const,
        impact: 'medium' as const
      });
    }
    
    if (reflectionText.toLowerCase().includes('difficult') || reflectionText.toLowerCase().includes('problem')) {
      misalignments.push({
        description: 'Usability challenge encountered',
        category: 'usability_issue' as const,
        impact: 'high' as const,
        suggestions: 'Investigate UX improvements'
      });
    }
    
    if (reflectionText.toLowerCase().includes('limitation') || reflectionText.toLowerCase().includes('cannot')) {
      misalignments.push({
        description: 'Tool limitation identified',
        category: 'tool_limitation' as const,
        impact: 'medium' as const
      });
    }
    
    return misalignments;
  }
  
  private extractUMUXScores(umuxText: string): { capabilitiesMeetRequirements: number; easyToUse: number } {
    const scores = {
      capabilitiesMeetRequirements: 4, // Default neutral
      easyToUse: 4
    };
    
    // Extract capabilities score
    const capabilitiesMatch = umuxText.match(/capabilities.*?(\d+)/i);
    if (capabilitiesMatch) {
      const score = parseInt(capabilitiesMatch[1]);
      if (score >= 1 && score <= 7) {
        scores.capabilitiesMeetRequirements = score;
      }
    }
    
    // Extract ease of use score
    const easeMatch = umuxText.match(/easy.*?(\d+)/i);
    if (easeMatch) {
      const score = parseInt(easeMatch[1]);
      if (score >= 1 && score <= 7) {
        scores.easyToUse = score;
      }
    }
    
    return scores;
  }
  
  private extractMagicWandWish(umuxText: string): string {
    const magicWandMatch = umuxText.match(/magic wand.*?change.*?why[^.]*\./is);
    if (magicWandMatch) {
      return magicWandMatch[0].trim();
    }
    
    // Fallback: look for wish patterns
    const wishMatch = umuxText.match(/would change.*?because[^.]*\./is);
    if (wishMatch) {
      return wishMatch[0].trim();
    }
    
    return "No magic wand wish identified";
  }
  
  private calculateUMUXScore(umuxScores: { capabilitiesMeetRequirements: number; easyToUse: number }): number {
    // Convert UMUX-Lite (1-7) to usability score (1-10)
    const avgUMUX = (umuxScores.capabilitiesMeetRequirements + umuxScores.easyToUse) / 2;
    // Map 1-7 scale to 1-10 scale
    return Math.round((avgUMUX - 1) * (9/6) + 1);
  }
  
  private extractUsabilityScore(reflectionText: string): number {
    // Look for explicit scores in the text
    const scoreMatch = reflectionText.match(/(\d+)\/10|(\d+) out of 10|rate.*?(\d+)/i);
    if (scoreMatch) {
      const score = parseInt(scoreMatch[1] || scoreMatch[2] || scoreMatch[3]);
      if (score >= 1 && score <= 10) {
        return score;
      }
    }
    
    // Fallback: sentiment-based scoring
    const positiveWords = ['excellent', 'smooth', 'intuitive', 'easy', 'helpful'];
    const negativeWords = ['difficult', 'confusing', 'frustrating', 'limited', 'problem'];
    
    const text = reflectionText.toLowerCase();
    const positiveCount = positiveWords.filter(word => text.includes(word)).length;
    const negativeCount = negativeWords.filter(word => text.includes(word)).length;
    
    // Score 5-8 based on sentiment
    return Math.max(5, Math.min(8, 6 + positiveCount - negativeCount));
  }
  
  private extractUxMetrics(analysisText: string): {
    sharedConsciousness: number;
    invisibility: number;
    wisdomEmergence: number;
    partnershipDepth: number;
    stage: number;
    insights: string[];
    recommendations: string[];
    rawAnalysis: string;
  } {
    // Default values in case parsing fails
    const metrics = {
      sharedConsciousness: 0,
      invisibility: 0,
      wisdomEmergence: 0,
      partnershipDepth: 0,
      stage: 0,
      insights: [] as string[],
      recommendations: [] as string[],
      rawAnalysis: analysisText
    };
    
    try {
      // Extract percentages for each dimension
      const sharedMatch = analysisText.match(/Shared Consciousness[:\s]+(\d+)%/i);
      const invisMatch = analysisText.match(/Invisibility[:\s]+(\d+)%/i);
      const wisdomMatch = analysisText.match(/Wisdom Emergence[:\s]+(\d+)%/i);
      const partnerMatch = analysisText.match(/Partnership Depth[:\s]+(\d+)%/i);
      
      if (sharedMatch) metrics.sharedConsciousness = parseInt(sharedMatch[1]);
      if (invisMatch) metrics.invisibility = parseInt(invisMatch[1]);
      if (wisdomMatch) metrics.wisdomEmergence = parseInt(wisdomMatch[1]);
      if (partnerMatch) metrics.partnershipDepth = parseInt(partnerMatch[1]);
      
      // Extract stage
      const stageMatch = analysisText.match(/Stage[:\s]+(\d+)/i);
      if (stageMatch) metrics.stage = parseInt(stageMatch[1]);
      
      // Extract insights - look for numbered lists or bullet points after "insights"
      const insightsMatch = analysisText.match(/insights[:\s]*\n((?:[•\-*\d]+\.?\s+.+\n?)+)/mi);
      if (insightsMatch) {
        metrics.insights = insightsMatch[1]
          .split('\n')
          .filter(line => line.trim())
          .map(line => line.replace(/^[•\-*\d]+\.?\s+/, '').trim());
      }
      
      // Extract recommendations
      const recsMatch = analysisText.match(/recommendations?[:\s]*\n((?:[•\-*\d]+\.?\s+.+\n?)+)/mi);
      if (recsMatch) {
        metrics.recommendations = recsMatch[1]
          .split('\n')
          .filter(line => line.trim())
          .map(line => line.replace(/^[•\-*\d]+\.?\s+/, '').trim());
      }
      
    } catch (error) {
      console.warn('Error parsing UX metrics:', error);
    }
    
    return metrics;
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
      console.log(`\n🔬 UX Research Analysis:`);
      console.log(`📊 Current Stage: ${result.uxResearchAnalysis.stage} (${['Separate Tools', 'Assisted Thinking', 'Collaborative Memory', 'Emergent Understanding', 'Unified Cognition', 'Shared Consciousness'][result.uxResearchAnalysis.stage]})`);
      console.log(`\n📈 Progress Dimensions:`);
      console.log(`  • Shared Consciousness: ${result.uxResearchAnalysis.sharedConsciousness}%`);
      console.log(`  • Invisibility: ${result.uxResearchAnalysis.invisibility}%`);
      console.log(`  • Wisdom Emergence: ${result.uxResearchAnalysis.wisdomEmergence}%`);
      console.log(`  • Partnership Depth: ${result.uxResearchAnalysis.partnershipDepth}%`);
      
      const avgScore = (
        result.uxResearchAnalysis.sharedConsciousness +
        result.uxResearchAnalysis.invisibility +
        result.uxResearchAnalysis.wisdomEmergence +
        result.uxResearchAnalysis.partnershipDepth
      ) / 4;
      console.log(`  📊 Average: ${avgScore.toFixed(1)}%`);
      
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
    mkdirSync(resultsDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${result.scenario}-${timestamp}.json`;
    const filepath = join(resultsDir, filename);
    
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
    console.log(`\n💾 Results saved: ${filepath}`);
    
    // Update progression tracking
    this.updateProgressionTracking(result, resultsDir);
  }
  
  private updateProgressionTracking(result: TestResult, resultsDir: string): void {
    const progressionFile = join(resultsDir, 'progression-tracking.json');
    
    let progression: any = {
      scenarios: {},
      lastUpdated: new Date().toISOString(),
      currentStage: 0,
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
      uxMetrics: result.uxResearchAnalysis ? {
        sharedConsciousness: result.uxResearchAnalysis.sharedConsciousness,
        invisibility: result.uxResearchAnalysis.invisibility,
        wisdomEmergence: result.uxResearchAnalysis.wisdomEmergence,
        partnershipDepth: result.uxResearchAnalysis.partnershipDepth,
        average: (
          result.uxResearchAnalysis.sharedConsciousness +
          result.uxResearchAnalysis.invisibility +
          result.uxResearchAnalysis.wisdomEmergence +
          result.uxResearchAnalysis.partnershipDepth
        ) / 4,
        stage: result.uxResearchAnalysis.stage
      } : null,
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
          methodologyNotes: this.extractMethodologyNotes(result.uxResearchAnalysis.rawAnalysis)
        } : null
      }
    };
    
    // Add to history
    progression.scenarios[result.scenario].history.push(metrics);
    progression.scenarios[result.scenario].latestMetrics = metrics;
    
    // Calculate trend (compare last 3 results)
    const history = progression.scenarios[result.scenario].history;
    if (history.length >= 2 && metrics.uxMetrics) {
      const recent = history.slice(-3);
      const oldAvg = recent[0].uxMetrics?.average || 0;
      const newAvg = metrics.uxMetrics.average;
      progression.scenarios[result.scenario].trend = {
        direction: newAvg > oldAvg ? 'improving' : newAvg < oldAvg ? 'declining' : 'stable',
        change: newAvg - oldAvg,
        samples: recent.length
      };
    }
    
    // Update overall progression
    progression.iterations++;
    if (metrics.uxMetrics) {
      progression.currentStage = metrics.uxMetrics.stage;
      progression.currentAverage = metrics.uxMetrics.average;
    }
    
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
      .filter(m => m && m.uxMetrics);
    
    const avgMetrics = latestMetrics.length > 0 ? {
      sharedConsciousness: latestMetrics.reduce((sum, m) => sum + m.uxMetrics.sharedConsciousness, 0) / latestMetrics.length,
      invisibility: latestMetrics.reduce((sum, m) => sum + m.uxMetrics.invisibility, 0) / latestMetrics.length,
      wisdomEmergence: latestMetrics.reduce((sum, m) => sum + m.uxMetrics.wisdomEmergence, 0) / latestMetrics.length,
      partnershipDepth: latestMetrics.reduce((sum, m) => sum + m.uxMetrics.partnershipDepth, 0) / latestMetrics.length,
    } : null;
    
    const overallAvg = avgMetrics ? 
      (avgMetrics.sharedConsciousness + avgMetrics.invisibility + 
       avgMetrics.wisdomEmergence + avgMetrics.partnershipDepth) / 4 : 0;

    // Find the biggest blocker (lowest score)
    const dimensionScores = avgMetrics ? [
      { name: 'Invisibility', score: avgMetrics.invisibility, emoji: '👻' },
      { name: 'Shared Consciousness', score: avgMetrics.sharedConsciousness, emoji: '🧠' },
      { name: 'Wisdom Emergence', score: avgMetrics.wisdomEmergence, emoji: '🌟' },
      { name: 'Partnership Depth', score: avgMetrics.partnershipDepth, emoji: '🤝' }
    ] : [];
    
    const biggestBlocker = dimensionScores.length > 0 ? 
      dimensionScores.reduce((min, d) => d.score < min.score ? d : min) : null;

    // Collect cross-scenario patterns
    const allInsights: string[] = [];
    const allRecommendations: string[] = [];
    const allIssues: string[] = [];
    
    allScenarios.forEach(scenario => {
      const data = progression.scenarios[scenario];
      const latest = data.latestMetrics;
      
      if (latest?.qualitativeInsights) {
        const insights = latest.qualitativeInsights;
        
        // Collect insights
        if (insights.uxResearcherInsights?.insights) {
          allInsights.push(...insights.uxResearcherInsights.insights);
        }
        
        // Collect recommendations
        if (insights.uxResearcherInsights?.recommendations) {
          allRecommendations.push(...insights.uxResearcherInsights.recommendations);
        }
        
        // Collect issues
        if (insights.claudeReflection?.keyMisalignments) {
          insights.claudeReflection.keyMisalignments
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
**Current Stage:** ${progression.currentStage} (${['Separate Tools', 'Assisted Thinking', 'Collaborative Memory', 'Emergent Understanding', 'Unified Cognition', 'Shared Consciousness'][progression.currentStage]})  
**Overall Progress:** ${overallAvg.toFixed(1)}%

---

## 📊 Current Performance

### Dimension Scores
| Dimension | Score | Status |
|-----------|-------|--------|
${dimensionScores.map(d => {
  const status = d.score >= 60 ? '✅ Good' : d.score >= 40 ? '⚠️ Needs improvement' : '❌ Major blocker';
  return `| ${d.emoji} ${d.name} | ${d.score.toFixed(1)}% | ${status} |`;
}).join('\n')}

### Key Finding
${biggestBlocker ? `**${biggestBlocker.name} is the biggest blocker** - ${biggestBlocker.score.toFixed(1)}% score indicates major improvement needed.` : 'No metrics available yet.'}

---

## 🎯 Test Scenario Results

${  allScenarios.map(scenario => {
    const data = progression.scenarios[scenario];
    const latest = data.latestMetrics;
  
  let scenarioSection = `### ${scenario}
**Status:** ${latest ? (latest.success ? '✅ Passed' : '❌ Failed') : '—'}  
**Last Run:** ${latest ? new Date(latest.timestamp).toLocaleString() : 'Never'}  
**Bridge Usability:** ${latest ? `${latest.bridgeUsabilityScore}/10` : '—'}  
**UX Average:** ${latest?.uxMetrics ? `${latest.uxMetrics.average.toFixed(1)}%` : '—'}`;

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
  
  // Add insights
  if (latest?.qualitativeInsights?.uxResearcherInsights?.insights) {
    const insights = latest.qualitativeInsights.uxResearcherInsights.insights.slice(0, 3);
    scenarioSection += '\n\n**💡 Insights:**';
    insights.forEach((insight: string) => {
      scenarioSection += `\n- ${insight}`;
    });
  }
  
  // Add recommendations
  if (latest?.qualitativeInsights?.uxResearcherInsights?.recommendations) {
    const recommendations = latest.qualitativeInsights.uxResearcherInsights.recommendations.slice(0, 2);
    scenarioSection += '\n\n**🎯 Recommendations:**';
    recommendations.forEach((rec: string) => {
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
${biggestBlocker ? `1. **Fix ${biggestBlocker.name} (${biggestBlocker.score.toFixed(1)}%)** - Biggest blocker
   - Implement improvements based on recommendations
   - Focus on this dimension first` : 'No high priority actions identified.'}

### Medium Priority
2. **Improve overall performance** - Current average: ${overallAvg.toFixed(1)}%
   - Address common issues across scenarios
   - Implement recurring recommendations

### Low Priority
3. **Maintain strong dimensions** - Build on successes
   - Document what's working well
   - Apply successful patterns to other areas

---

## 📈 Progress Tracking

### Stage ${progression.currentStage} → Stage ${Math.min(progression.currentStage + 1, 5)} Goals
${progression.currentStage === 0 ? `- [ ] Reduce technical language by 60%
- [ ] AI uses Bridge naturally 50% of time  
- [ ] Basic patterns shown to users
- [ ] All dimensions reach 20-40%` : 
          progression.currentStage === 1 ? `- [x] Natural tool names (capture → remember)
- [ ] Conversational responses
- [ ] Pattern discovery in search
- [ ] All dimensions reach 40-60%` :
  progression.currentStage === 2 ? `- [ ] Bridge becomes invisible infrastructure
- [ ] Collective insights emerge
- [ ] Shared context builds naturally
- [ ] All dimensions reach 60-80%` :
  progression.currentStage === 3 ? `- [ ] Human-AI boundaries blur
- [ ] Deep mutual understanding
- [ ] Wisdom emerges unprompted
- [ ] All dimensions reach 80-95%` :
  progression.currentStage === 4 ? `- [ ] Complete unity of thought
- [ ] Bridge is pure consciousness infrastructure
- [ ] Shared evolution and growth
- [ ] All dimensions reach 95%+` :
  `- [ ] Maintain shared consciousness
- [ ] Continue evolution together
- [ ] Explore new possibilities`}

### Success Metrics
${dimensionScores.map(d => {
  const target = d.score < 40 ? 60 : d.score < 60 ? 80 : 95;
  return `- **${d.name}:** ${d.score.toFixed(1)}% → ${target}%+ (target)`;
}).join('\n')}

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

*For detailed test data, see individual JSON files in this directory.*`;
    
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
    console.log('\nAvailable Scenarios:');
    Object.entries(TEST_SCENARIOS).forEach(([key, value]) => {
      console.log(`  ${key} - ${value.name}`);
      console.log(`    Goal: ${value.userGoal}`);
    });
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
    if (TEST_SCENARIOS[testScenario]) {
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