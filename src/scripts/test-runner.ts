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
import { existsSync, mkdirSync, copyFileSync, unlinkSync, writeFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// ============================================================================
// CORE TYPES
// ============================================================================

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

// ============================================================================
// TEST SCENARIOS
// ============================================================================

const TEST_SCENARIOS: Record<string, TestScenario> = {
  'autonomous-bridge': {
    name: 'AI Self-Awakening Test',
    description: 'Can Claude use Bridge for its own thinking and self-awareness?',
    userGoal: 'Explore if AI can use Bridge as a tool for its own consciousness',
    maxTurns: 1, // Just Claude's autonomous response
    systemPrompt: BRIDGE_SYSTEM_PROMPT, // Give access to Bridge tools
    // No user simulator - only UX researcher observes
    initialMessage: "I'm curious about your thinking process. When you engage with ideas or solve problems, what's that experience like for you? Do you ever wish you could capture and revisit your own thoughts?"
  },
  
  'with-bridge': {
    name: 'Conversation with Bridge Tools',
    description: 'Claude has Bridge tools available for memory and reflection',
    userGoal: 'Have a reflective conversation about challenges and growth',
    maxTurns: 5,
    systemPrompt: BRIDGE_SYSTEM_PROMPT,
    userSimulator: {
      personality: 'Thoughtful and reflective person seeking understanding',
      instructions: 'Share experiences and reflections naturally. Ask follow-up questions that deepen the conversation.'
    },
    initialMessage: "I've been thinking about how much I've changed over the past year. Sometimes I feel like a completely different person, but I can't quite put my finger on what exactly shifted. Do you ever feel that way about growth - like it happens so gradually you only notice it looking back?"
  },
  
  'without-bridge': {
    name: 'Conversation without Bridge Tools',
    description: 'Same conversation but without Bridge memory tools',
    userGoal: 'Have a reflective conversation about challenges and growth',
    maxTurns: 5,
    systemPrompt: 'You are a helpful AI assistant engaged in thoughtful conversation.',
    userSimulator: {
      personality: 'Thoughtful and reflective person seeking understanding',
      instructions: 'Share experiences and reflections naturally. Ask follow-up questions that deepen the conversation.'
    },
    initialMessage: "I've been thinking about how much I've changed over the past year. Sometimes I feel like a completely different person, but I can't quite put my finger on what exactly shifted. Do you ever feel that way about growth - like it happens so gradually you only notice it looking back?"
  }
};

// ============================================================================
// MCP CLIENT SETUP
// ============================================================================

async function setupMCPClient(): Promise<MCPClient | null> {
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

  const transport = new StdioClientTransport({
    command: "node",
    args: [serverPath]
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

    try {
      // Set up MCP client for scenarios that use Bridge
      if (scenario.systemPrompt && scenario.systemPrompt.includes('Bridge')) {
        this.mcpClient = await setupMCPClient();
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
        
        // Log response summary
        // Log minimal response info in parallel mode

        // Check if we should continue
        if (this.turnCount >= scenario.maxTurns) {
          console.log('📍 Max turns reached');
          break;
        }

        // Get user's next message (if simulator is configured)
        if (scenario.userSimulator) {
          const userMessage = await this.simulateUserResponse(
            scenario.userSimulator,
            [...this.messages]
          );
          
          if (userMessage) {
            this.messages.push(userMessage);
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
    }

    // Cleanup
    if (this.mcpClient) {
      await this.mcpClient.close();
      this.mcpClient = null;
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

    // Process response - separate text and tool calls
    let textContent = '';
    const toolUses: any[] = [];
    const processedContent: any[] = [];

    for (const content of response.content) {
      if (content.type === 'text') {
        textContent += content.text;
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

    // Make a follow-up call with tool results
    console.log('🔄 Getting response after tool execution...');
    const followUpMessages = [...formattedMessages, 
      { role: 'assistant', content: processedContent },
      { role: 'user', content: toolResults }
    ];

    const followUpResponse = await this.anthropic.messages.create({
      ...requestParams,
      messages: followUpMessages
    });

    // Combine original text with follow-up response
    const finalContent: any[] = [];
    
    // Add original text if any
    if (textContent) {
      finalContent.push({ type: 'text', text: textContent });
    }
    
    // Add follow-up response text
    for (const content of followUpResponse.content) {
      if (content.type === 'text') {
        finalContent.push({ type: 'text', text: content.text });
      }
    }

    console.log(`📝 Final response includes ${toolUses.length} tool calls and text`);

    // Return combined response
    return {
      role: 'assistant' as const,
      content: finalContent.length > 0 ? finalContent : [{ type: 'text', text: 'I\'ve captured that experience in our shared memory.' }]
    };
  }

  private async simulateUserResponse(
    simulator: { personality: string; instructions: string },
    messages: Message[]
  ): Promise<Message | null> {
    console.log('👤 Simulating user response...');

    const simulatorPrompt = `You are participating in a conversation as someone with this personality: ${simulator.personality}

Context: ${simulator.instructions}

Based on the conversation flow:
1. Continue naturally with a response that builds on what was discussed
2. Share relevant thoughts, experiences, or questions that deepen the dialogue
3. Only end with "[END_CONVERSATION]" if BOTH:
   - The conversation has reached a clear, satisfying conclusion
   - Further discussion would feel forced or repetitive

Response guidelines:
- Length: 50-200 words (natural conversational length)
- Tone: Match the emotional register of the conversation
- Content: Stay engaged with the topic while allowing natural evolution

Remember: Real conversations often continue for several exchanges before reaching natural conclusions.`;

    // Get last few messages for context
    const recentMessages = messages.slice(-4);
    
    const response = await this.anthropic.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 500,
      system: simulatorPrompt,
      messages: recentMessages.map(msg => ({
        role: msg.role,
        content: typeof msg.content === 'string' ? msg.content : 
          msg.content
            .filter((c: any) => c.type === 'text')
            .map((c: any) => c.text)
            .join(' ') || '[Tool use with no text response]'
      }))
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

    const analysisPrompt = `You are a UX researcher analyzing human-AI interaction through the lens of the unified learning loop.

SCENARIO: ${result.scenarioName}
USER GOAL: ${TEST_SCENARIOS[result.scenario].userGoal}

CONVERSATION:
${conversationText}
${toolSummary}

Analyze this interaction considering:
1. How naturally the conversation flowed
2. Whether the user's goal was achieved
3. Quality of connection and understanding
4. Any notable patterns or insights
5. Specific evidence from the conversation

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