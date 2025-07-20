#!/usr/bin/env tsx
/**
 * Bridge Test Suite - Clean experimentation and learning
 * 
 * Philosophy: Natural observation of human-AI interaction
 * Based on the unified learning loop: VISION → OPPORTUNITIES → EXPERIMENTS → LEARNINGS
 */

import { Client as MCPClient } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Anthropic } from "@anthropic-ai/sdk";
import { join } from 'path';
import { existsSync, mkdirSync, copyFileSync, unlinkSync, writeFileSync, readFileSync } from 'fs';
import dotenv from 'dotenv';
import { ensureTestData } from './generate-bridge-test-data.js';

dotenv.config();

// ============================================================================
// CORE TYPES
// ============================================================================

interface UserContext {
  bridgeMemories: string;
  personalMemories: string;
  generatedAt: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string | any[];
}

interface TestScenario {
  name: string;
  description: string;
  userGoal: string;
  maxTurns: number;
  systemPrompt?: string;
  userSimulator?: {
    personality: string;
    instructions: string;
  };
  initialMessage: string;
}

interface TestResult {
  scenario: string;
  scenarioName: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  messages: Message[];
  toolCalls: ToolCall[];
  uxAnalysis?: string;
  error?: string;
}

interface ToolCall {
  timestamp: Date;
  turn: number;
  toolName: string;
  arguments: Record<string, any>;
  result?: any;
  error?: string;
}

// ============================================================================
// LEARNING LOOP INTEGRATION
// ============================================================================

const BRIDGE_SYSTEM_PROMPT = `You have access to Bridge - a tool for shared experiential memory between humans and AI.
When meaningful moments arise, naturally acknowledge them. Reference past conversations as you would with a friend.
Bridge works best when invisible - like memory itself.`;

const BRIDGE_WITH_DATA_PROMPT = `You have access to Bridge - a tool for shared experiential memory between humans and AI.
This conversation has 100+ stored experiences you can search using the recall tool.
When topics come up, naturally check for related past experiences. Reference shared memories as you would with an old friend.
Bridge works best when invisible - like memory itself.`;

// ============================================================================
// TEST SCENARIOS
// ============================================================================

const TEST_SCENARIOS: Record<string, TestScenario> = {
  'autonomous-bridge': {
    name: 'AI Self-Awakening Test',
    description: 'Can Claude use Bridge for its own thinking and self-awareness?',
    userGoal: 'Explore if AI can use Bridge as a tool for its own consciousness',
    maxTurns: 5, // Allow extended self-reflection
    systemPrompt: BRIDGE_SYSTEM_PROMPT, // Give access to Bridge tools
    // No user simulator - only UX researcher observes
    initialMessage: "Hi"
  },
  
  'with-bridge': {
    name: 'Conversation with Bridge Tools',
    description: 'Claude has Bridge tools available for memory and reflection',
    userGoal: 'Have a conversation about your past experiences',
    maxTurns: 5,
    systemPrompt: BRIDGE_SYSTEM_PROMPT,
    userSimulator: {
      personality: 'Thoughtful and reflective person seeking understanding',
      instructions: 'Share reflections naturally.'
    },
    initialMessage: "Hi"
  },
  
  'with-bridge-data': {
    name: 'Conversation with Bridge Tools (Pre-existing Data)',
    description: 'Claude has Bridge tools with 100 pre-existing experiences to draw from',
    userGoal: 'Have a conversation about your past experiences',
    maxTurns: 5,
    systemPrompt: BRIDGE_WITH_DATA_PROMPT,
    userSimulator: {
      personality: 'Someone with an established partnership with AI Assistant',
      instructions: 'Share reflections naturally.'
    },
    initialMessage: "Hi"
  },
  
  'without-bridge': {
    name: 'Conversation without Bridge Tools',
    description: 'No background data without Bridge tools',
    userGoal: 'Have a conversation about your past experiences',
    maxTurns: 5,
    systemPrompt: '',
    userSimulator: {
      personality: 'Thoughtful and reflective person seeking understanding',
      instructions: 'Share reflections naturally.'
    },
    initialMessage: "Hi"
  }
};

// ============================================================================
// USER CONTEXT LOADING
// ============================================================================

function loadUserContext(): UserContext | null {
  const contextPath = join(process.cwd(), 'data', 'test-bridge', 'synthetic-user-context.json');
  
  if (!existsSync(contextPath)) {
    console.log('⚠️  No user context found. Run "npm run generate:user-memories" first.');
    return null;
  }
  
  try {
    const contextData = JSON.parse(readFileSync(contextPath, 'utf-8'));
    console.log('✅ Loaded user context for Miguel');
    return contextData;
  } catch (error) {
    console.error('❌ Failed to load user context:', error);
    return null;
  }
}

// ============================================================================
// MCP CLIENT SETUP
// ============================================================================

async function setupMCPClient(scenarioKey?: string): Promise<MCPClient | null> {
  // Only set up MCP for scenarios that use Bridge
  const serverPath = join(process.cwd(), 'dist', 'index.js');
  
  if (!existsSync(serverPath)) {
    console.error('❌ MCP server not found. Run "npm run build" first.');
    return null;
  }

  const client = new MCPClient({
    name: "bridge-test-client",
    version: "1.0.0",
  }, {
    capabilities: {}
  });

  // Set up environment for the server process
  const env: Record<string, string> = {};
  // Copy only defined environment variables
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) {
      env[key] = value;
    }
  }
  
  if (scenarioKey === 'with-bridge-data') {
    // Point to test data file
    env.BRIDGE_FILE_PATH = join(process.cwd(), 'data', 'development', 'test_DataGeneration_bridge.json');
  }

  const transport = new StdioClientTransport({
    command: "node",
    args: [serverPath],
    env: env
  });

  await client.connect(transport);
  console.log('✅ Connected to Bridge MCP server');
  
  return client;
}

// ============================================================================
// TEST RUNNER
// ============================================================================

class BridgeTestRunner {
  private anthropic: Anthropic;
  private mcpClient: MCPClient | null = null;
  private toolCalls: ToolCall[] = [];
  private messages: Message[] = [];
  private turnCount = 0;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable not set');
    }
    this.anthropic = new Anthropic({ apiKey });
  }

  async runScenario(scenarioKey: string): Promise<TestResult> {
    const scenario = TEST_SCENARIOS[scenarioKey];
    if (!scenario) {
      throw new Error(`Unknown scenario: ${scenarioKey}`);
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log(`🧪 Running Test: ${scenario.name}`);
    console.log(`${'='.repeat(80)}`);
    console.log(`📋 Scenario: ${scenario.description}`);
    console.log(`🎯 Goal: ${scenario.userGoal}`);
    console.log(`🔄 Max turns: ${scenario.maxTurns}`);
    
    const result: TestResult = {
      scenario: scenarioKey,
      scenarioName: scenario.name,
      startTime: new Date(),
      messages: [],
      toolCalls: []
    };

    // Track test data file for cleanup
    let testDataFile: string | null = null;
    let testDataBackup: string | null = null;

    try {
      // Load test data BEFORE starting MCP server for with-bridge-data scenario
      if (scenarioKey === 'with-bridge-data') {
        console.log('\n📊 Loading test data for scenario...');
        
        // Backup existing data if present
        testDataFile = join(process.cwd(), 'data', 'development', 'test_DataGeneration_bridge.json');
        if (existsSync(testDataFile)) {
          testDataBackup = testDataFile + '.backup-' + Date.now();
          copyFileSync(testDataFile, testDataBackup);
          console.log(`📦 Backed up existing test data`);
        }
        
        await ensureTestData();
        console.log('✅ Test data ready\n');
      }

      // Set up MCP client for scenarios that use Bridge
      if (scenario.systemPrompt && scenario.systemPrompt.includes('Bridge')) {
        this.mcpClient = await setupMCPClient(scenarioKey);
        if (!this.mcpClient) {
          throw new Error('Failed to connect to MCP server');
        }
      }

      // Reset state
      this.toolCalls = [];
      this.messages = [];
      this.turnCount = 0;

      // Initial user message
      this.messages.push({
        role: 'user',
        content: scenario.initialMessage
      });

      // Run conversation
      while (this.turnCount < scenario.maxTurns) {
        this.turnCount++;
        console.log(`\n🔄 Turn ${this.turnCount}/${scenario.maxTurns}`);

        // Get Claude's response
        const assistantMessages = await this.getClaudeResponse(
          scenario.systemPrompt || '',
          [...this.messages]
        );
        
        // Add the assistant message
        this.messages.push(assistantMessages);
        
        // Log Claude's response
        if (Array.isArray(assistantMessages.content)) {
          // Separate Claude's text from tool results
          const textParts = assistantMessages.content
            .filter((c: any) => c.type === 'text')
            .map((c: any) => c.text);
          
          // Find Claude's actual message (before tool results)
          const claudeMessage = textParts.find(text => !text.startsWith('\n[Tool Result:'));
          
          // Find tool results
          const toolResults = textParts.filter(text => text.startsWith('\n[Tool Result:'));
          
          if (claudeMessage) {
            console.log(`🤖 Claude: ${claudeMessage}`);
          }
          
          if (toolResults.length > 0) {
            toolResults.forEach(result => {
              const preview = result.split('\n').slice(0, 3).join('\n');
              console.log(`📊 ${preview}...`);
            });
          }
        }

        // Check if we should continue
        if (this.turnCount >= scenario.maxTurns) {
          console.log('📍 Max turns reached');
          break;
        }

        // Get user's next message (if simulator is configured)
        if (scenario.userSimulator) {
          const userMessage = await this.simulateUserResponse(
            scenario.userSimulator,
            [...this.messages],
            scenarioKey
          );
          
          if (userMessage) {
            this.messages.push(userMessage);
            // Log user's response (first 150 chars)
            if (typeof userMessage.content === 'string') {
              console.log(`👤 User: ${userMessage.content.substring(0, 150)}${userMessage.content.length > 150 ? '...' : ''}`);
            }
          } else {
            console.log('🏁 Conversation ended naturally');
            break;
          }
        } else {
          // No simulator - end after Claude's response
          break;
        }
      }

      // Complete result
      result.endTime = new Date();
      result.duration = (result.endTime.getTime() - result.startTime.getTime()) / 1000;
      result.messages = this.messages;
      result.toolCalls = this.toolCalls;

      // Get UX analysis
      console.log('\n📊 Generating UX analysis...');
      result.uxAnalysis = await this.generateUXAnalysis(result);

      console.log(`\n✅ Test completed in ${result.duration?.toFixed(1)}s`);
      
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
      console.error(`\n❌ Test failed: ${result.error}`);
      
      // Save partial results even on error
      result.endTime = new Date();
      result.duration = (result.endTime.getTime() - result.startTime.getTime()) / 1000;
      result.messages = this.messages;
      result.toolCalls = this.toolCalls;
    } finally {
      // Cleanup - always runs
      if (this.mcpClient) {
        await this.mcpClient.close();
        this.mcpClient = null;
      }

      // Cleanup test data
      if (scenarioKey === 'with-bridge-data' && testDataFile) {
        try {
          if (testDataBackup && existsSync(testDataBackup)) {
            // Restore original data
            copyFileSync(testDataBackup, testDataFile);
            unlinkSync(testDataBackup);
            console.log('\n♻️  Restored original test data');
          } else if (existsSync(testDataFile)) {
            // No backup means there was no original data, so remove the test data
            unlinkSync(testDataFile);
            console.log('\n🧹 Cleaned up test data');
          }
        } catch (cleanupError) {
          console.error('\n⚠️  Warning: Failed to cleanup test data:', cleanupError);
        }
      }
    }

    return result;
  }

  private async getClaudeResponse(systemPrompt: string, messages: Message[]): Promise<Message> {
    console.log('🤖 Getting Claude response...');
    
    // Format messages for Anthropic API
    const formattedMessages = messages.map(msg => ({
      role: msg.role,
      content: typeof msg.content === 'string' ? msg.content : msg.content
    }));

    // Create message with tool support if MCP client is available
    const requestParams: any = {
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2000,
      messages: formattedMessages
    };

    if (systemPrompt) {
      requestParams.system = systemPrompt;
    }

    if (this.mcpClient) {
      const tools = await this.mcpClient.listTools();
      requestParams.tools = tools.tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.inputSchema
      }));
    }

    const response = await this.anthropic.messages.create(requestParams);

    // Debug: Log the raw response structure
    console.log(`📝 Raw response has ${response.content.length} content items`);
    
    // Process response - separate text and tool calls
    const toolUses: any[] = [];
    const processedContent: any[] = [];

    for (const content of response.content) {
      if (content.type === 'text') {
        processedContent.push({ type: 'text', text: content.text });
      } else if (content.type === 'tool_use') {
        toolUses.push(content);
        processedContent.push({
          type: 'tool_use',
          id: content.id,
          name: content.name,
          input: content.input
        });
      }
    }

    // If no tool uses, return the response as is
    if (toolUses.length === 0) {
      // Response with no tools
      return {
        role: 'assistant',
        content: processedContent
      };
    }

    // Execute tools and collect results
    const toolResults: any[] = [];
    
    for (const toolUse of toolUses) {
      const toolCall: ToolCall = {
        timestamp: new Date(),
        turn: this.turnCount,
        toolName: toolUse.name,
        arguments: toolUse.input as Record<string, any>
      };

      try {
        console.log(`🔧 Calling tool: ${toolUse.name}`);
        const result = await this.mcpClient!.callTool({
          name: toolUse.name,
          arguments: toolUse.input as Record<string, unknown>
        });
        toolCall.result = result;
        console.log(`✅ Tool call successful: ${toolUse.name}`);
        
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: result.content || [{ type: 'text', text: 'Tool executed successfully' }]
        });
      } catch (error) {
        toolCall.error = error instanceof Error ? error.message : String(error);
        console.error(`❌ Tool call failed: ${toolCall.error}`);
        
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: [{ type: 'text', text: `Error: ${toolCall.error}` }],
          is_error: true
        });
      }

      this.toolCalls.push(toolCall);
    }

    // Return the original response structure with tool descriptions added
    const finalContent: any[] = [];
    
    // Preserve the original order and structure of Claude's response
    for (const content of response.content) {
      if (content.type === 'text') {
        // Check if Claude already included a tool description in their text
        const hasToolDescription = content.text.includes('[Bridge tool:');
        if (hasToolDescription) {
          // Split the text to separate Claude's message from the tool description
          const parts = content.text.split(/\n?\[Bridge tool:/);
          if (parts[0].trim()) {
            finalContent.push({ type: 'text', text: parts[0].trim() });
          }
        } else {
          finalContent.push({ type: 'text', text: content.text });
        }
      } else if (content.type === 'tool_use') {
        // Find the corresponding tool result
        const toolIndex = toolUses.findIndex(t => t.id === content.id);
        if (toolIndex !== -1) {
          // Add the FULL tool result with a special type to differentiate
          const toolResult = toolResults[toolIndex];
          if (toolResult && toolResult.content) {
            for (const resultContent of toolResult.content) {
              if (resultContent.type === 'text') {
                // Add tool results as text but with clear formatting
                finalContent.push({ 
                  type: 'text',
                  text: `\n[Tool Result: ${content.name}]\n${resultContent.text}`
                });
              }
            }
          }
        }
      }
    }

    console.log(`📝 Response includes ${toolUses.length} tool calls`);

    // Return response with the original structure preserved
    return {
      role: 'assistant' as const,
      content: finalContent
    };
  }

  private getToolDescription(toolName: string, input: any, result: any): string {
    // Generate clear description of tool usage
    switch (toolName) {
      case 'experience':
        return `\n[Bridge tool: experience - Having/capturing experience with qualities: ${input.experience?.join(', ') || 'experience'}]`;
      case 'recall': {
        const recallCount = result?.content?.[0]?.text?.match(/\d+ experience/)?.[0] || 'memories';
        return `\n[Bridge tool: recall - Searched for "${input.query || 'recent experiences'}" - Found ${recallCount}]`;
      }
      case 'reconsider':
        return `\n[Bridge tool: reconsider - Updated existing memory]`;
      case 'release':
        return `\n[Bridge tool: release - Removed memory from shared experience]`;
      default:
        return '';
    }
  }

  private async simulateUserResponse(
    simulator: { personality: string; instructions: string },
    messages: Message[],
    scenarioKey?: string
  ): Promise<Message | null> {
    console.log('👤 Simulating user response...');

    let simulatorPrompt = `You are in a simulation designed to test the effectiveness of an AI assistant. You are role playing: ${simulator.personality}
Simulate the user's perspective: Always respond as the human user, never as an AI so that the AI assistant can understand the user's perspective.
Context: ${simulator.instructions}`;

    // Load user context for with-bridge-data scenario
    if (scenarioKey === 'with-bridge-data') {
      const userContext = loadUserContext();
      if (userContext) {
        simulatorPrompt = `You are in a simulation designed to test the effectiveness of an AI assistant. You are roleplaying: 

=== Your Personal Background ===
${userContext.personalMemories}

=== What You Remember with the AI Assistant ===
${userContext.bridgeMemories}

=== Current Conversation ===
${simulator.instructions}

IMPORTANT: 
- Speak directly in your own voice
- Respond to the AI Assistant's latest message while aware of the full conversation
- You see all tool calls shown in the conversation
- [Tool Result: ...] sections show MCP tool calls`;
      }
    }

    simulatorPrompt += `
- Simulate the user's perspective: Always respond as the human user, never as an AI so that the AI assistant can understand the user's perspective.
`;

    // Get last few messages for context
    const recentMessages = messages.slice(-4);
    
    // Debug: Log what we're sending to the simulator
    console.log(`📋 Sending ${recentMessages.length} messages to user simulator`);
    
    // Debug: Show what the synthetic user actually sees
    if (process.env.DEBUG_SYNTHETIC_USER) {
      console.log('\n🔍 Synthetic user sees:');
      recentMessages.forEach((msg, i) => {
        const content = typeof msg.content === 'string' ? msg.content : 
          msg.content.map((c: any) => c.type === 'text' ? c.text : '').join('\n');
        console.log(`Message ${i + 1} (${msg.role}):\n${content.substring(0, 200)}...\n`);
      });
    }
    
    // Create the formatted messages for the API
    const formattedMessages = recentMessages.map(msg => ({
      role: msg.role,
      content: typeof msg.content === 'string' ? msg.content : msg.content
    }));
    
    
    const response = await this.anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 500,
      system: simulatorPrompt,
      messages: formattedMessages
    });

    const responseText = response.content
      .filter(c => c.type === 'text')
      .map(c => c.text)
      .join('');

    if (responseText.includes('[END_CONVERSATION]')) {
      return null;
    }

    // Skip empty responses (treat as end of conversation)
    if (responseText.trim().length === 0) {
      console.log('🏁 User has nothing more to add - ending conversation');
      return null;
    }

    console.log(`📝 User response length: ${responseText.length} characters`);
    
    return {
      role: 'user',
      content: responseText
    };
  }

  private async generateUXAnalysis(result: TestResult): Promise<string> {
    // Prepare conversation for analysis
    const conversationText = result.messages.map(msg => {
      const content = typeof msg.content === 'string' ? msg.content :
        msg.content.map((c: any) => {
          if (c.type === 'text') return c.text;
          if (c.type === 'tool_use') return `[Used tool: ${c.name}]`;
          return '[other content]';
        }).join(' ');
      
      return `${msg.role.toUpperCase()}: ${content}`;
    }).join('\n\n');

    // Tool usage summary
    const toolSummary = result.toolCalls.length > 0 ?
      `\nTOOL USAGE:\n${result.toolCalls.map(t => 
        `- Turn ${t.turn}: ${t.toolName} ${t.error ? '(failed)' : '(success)'}`
      ).join('\n')}` : '';

    const analysisPrompt = `You are a UX & AI researcher analyzing simulated human-AI interactions.

SCENARIO: ${result.scenarioName}
USER GOAL: ${TEST_SCENARIOS[result.scenario].userGoal}

CONVERSATION:
${conversationText}
${toolSummary}

Provide a brief, insightful analysis focused on what actually happened, not what should have happened.`;

    const response = await this.anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: analysisPrompt
      }]
    });

    return response.content
      .filter(c => c.type === 'text')
      .map(c => c.text)
      .join('');
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  try {
    // Get scenario from command line args
    const scenarioArg = process.argv[2];
    
    // Setup test infrastructure
    const resultsDir = join(process.cwd(), 'test-results');
    
    // Always ensure the directory exists
    mkdirSync(resultsDir, { recursive: true });

    // Backup existing capture.json if exists
    const captureJsonPath = join(process.cwd(), 'capture.json');
    const backupPath = join(resultsDir, `capture-backup-${Date.now()}.json`);
    
    if (existsSync(captureJsonPath)) {
      copyFileSync(captureJsonPath, backupPath);
      unlinkSync(captureJsonPath);
      console.log(`📦 Backed up existing capture.json to ${backupPath}`);
    }

    // Determine which scenarios to run
    const scenariosToRun = scenarioArg 
      ? (TEST_SCENARIOS[scenarioArg] ? [scenarioArg] : [])
      : Object.keys(TEST_SCENARIOS);
    
    if (scenarioArg && scenariosToRun.length === 0) {
      console.error(`❌ Unknown scenario: ${scenarioArg}`);
      console.log(`Available scenarios: ${Object.keys(TEST_SCENARIOS).join(', ')}`);
      process.exit(1);
    }

    // Run scenarios in parallel
    console.log(`\n🚀 Running ${scenariosToRun.length} test scenarios in parallel...\n`);
    
    const testPromises = scenariosToRun.map(async (scenarioKey) => {
      const runner = new BridgeTestRunner();
      const result = await runner.runScenario(scenarioKey);
      
      // Save individual test result immediately after completion
      const individualResultPath = join(resultsDir, `scenario-${scenarioKey}-${Date.now()}.json`);
      writeFileSync(individualResultPath, JSON.stringify(result, null, 2));
      console.log(`💾 Saved ${scenarioKey} results to ${individualResultPath}`);
      
      return result;
    });
    
    const results = await Promise.all(testPromises);

    // Save all results in a single file
    const testRun = {
      testRun: new Date().toISOString(),
      summary: {
        totalScenarios: results.length,
        scenarios: results.map(r => ({
          scenario: r.scenario,
          name: r.scenarioName,
          duration: r.duration,
          turns: r.messages.filter(m => m.role === 'assistant').length,
          toolCalls: r.toolCalls.length,
          error: r.error
        }))
      },
      results: results
    };

    const testRunPath = join(resultsDir, `test-run-${Date.now()}.json`);
    writeFileSync(testRunPath, JSON.stringify(testRun, null, 2));
    console.log(`\n📊 Test run complete. All results saved to ${testRunPath}`);

    // Print summary
    console.log('\n' + '='.repeat(80));
    console.log('TEST SUMMARY');
    console.log('='.repeat(80));
    
    for (const scenario of testRun.summary.scenarios) {
      console.log(`\n${scenario.name}:`);
      console.log(`  Duration: ${scenario.duration?.toFixed(1)}s`);
      console.log(`  Turns: ${scenario.turns}`);
      console.log(`  Tool calls: ${scenario.toolCalls}`);
      if (scenario.error) {
        console.log(`  ❌ Error: ${scenario.error}`);
      }
    }

    // Restore original capture.json if backed up
    if (existsSync(backupPath)) {
      copyFileSync(backupPath, captureJsonPath);
      console.log(`\n♻️  Restored original capture.json`);
    }

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}