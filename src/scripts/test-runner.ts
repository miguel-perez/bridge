#!/usr/bin/env tsx
/**
 * Bridge Test Runner - Simplified for core operations testing
 * 
 * Tests Bridge operations with predefined inputs only.
 * No synthetic users, no UX analysis - just functional testing.
 */

import { Client as MCPClient } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Anthropic } from "@anthropic-ai/sdk";
import { join } from 'path';
import { existsSync, mkdirSync, copyFileSync, unlinkSync, writeFileSync } from 'fs';
import dotenv from 'dotenv';
import { ensureTestData } from './generate-bridge-test-data.js';

dotenv.config();



// ============================================================================
// CORE TYPES
// ============================================================================

interface Message {
  role: 'user' | 'assistant';
  content: string | unknown[];
}

interface TestTurn {
  role: 'user' | 'assistant';
  content: string;
  expectedTools?: string[];
}

interface TestScenario {
  description: string;
  turns: TestTurn[];
}

interface TestResult {
  scenario: string;
  scenarioName: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  messages: Message[];
  toolCalls: ToolCall[];
  conversationFlow: ConversationTurn[];
  error?: string;
}

interface ToolCall {
  timestamp: Date;
  turn: number;
  toolName: string;
  arguments: Record<string, unknown>;
  result?: unknown;
  resultText?: string[];
  error?: string;
}

interface ConversationTurn {
  turnNumber: number;
  userMessage?: string;
  assistantResponse?: {
    text?: string;
    toolCalls?: Array<{
      toolName: string;
      arguments: Record<string, unknown>;
      result: string[];
    }>;
  };
}

// ============================================================================
// TEST SCENARIOS
// ============================================================================

const SCENARIOS: Record<string, TestScenario> = {
  'experience-capture': {
    description: 'Test experience tool with various emotional states',
    turns: [
      {
        role: 'user',
        content: 'I feel anxious about the presentation tomorrow'
      },
      {
        role: 'assistant',
        content: 'I can help you capture that experience. Let me remember this moment for you.',
        expectedTools: ['experience']
      },
      {
        role: 'user',
        content: 'Actually, I feel excited now - the anxiety turned into anticipation'
      },
      {
        role: 'assistant',
        content: 'That\'s a beautiful shift! Let me capture this evolution of your experience.',
        expectedTools: ['experience']
      }
    ]
  },
  'recall-queries': {
    description: 'Test recall with text, dimensional, and mixed queries',
    turns: [
      {
        role: 'user',
        content: 'What have I experienced about anxiety?'
      },
      {
        role: 'assistant',
        content: 'Let me search through your experiences to find moments related to anxiety.',
        expectedTools: ['recall']
      },
      {
        role: 'user',
        content: 'Show me experiences with embodied sensing'
      },
      {
        role: 'assistant',
        content: 'I\'ll search for experiences that involve embodied sensing.',
        expectedTools: ['recall']
      }
    ]
  },
  'clustering-analysis': {
    description: 'Test clustering similar experiences to reveal patterns',
    turns: [
      {
        role: 'user',
        content: 'I feel anxious about the presentation tomorrow'
      },
      {
        role: 'assistant',
        content: 'I can help you capture that experience. Let me remember this moment for you.',
        expectedTools: ['experience']
      },
      {
        role: 'user',
        content: 'I also feel anxious about the meeting next week'
      },
      {
        role: 'assistant',
        content: 'I\'ll capture that experience too. Let me remember this moment.',
        expectedTools: ['experience']
      },
      {
        role: 'user',
        content: 'Show me clusters of similar experiences'
      },
      {
        role: 'assistant',
        content: 'I\'ll analyze your experiences to find patterns and group similar moments together.',
        expectedTools: ['recall']
      }
    ]
  },
  'sequence-analysis': {
    description: 'Test temporal sequence analysis to reveal patterns over time',
    turns: [
      {
        role: 'user',
        content: 'I felt stuck yesterday, but today I feel unstuck'
      },
      {
        role: 'assistant',
        content: 'That\'s an important transition! Let me capture both experiences to track this pattern.',
        expectedTools: ['experience']
      },
      {
        role: 'user',
        content: 'Show me my patterns of getting stuck and unstuck over time'
      },
      {
        role: 'assistant',
        content: 'I\'ll analyze your experiences to find temporal patterns and transitions.',
        expectedTools: ['recall']
      }
    ]
  },
  'reconsider-evolution': {
    description: 'Test reconsider as understanding deepens',
    turns: [
      {
        role: 'user',
        content: 'I feel stuck on this problem'
      },
      {
        role: 'assistant',
        content: 'Let me capture that experience of feeling stuck.',
        expectedTools: ['experience']
      },
      {
        role: 'user',
        content: 'Actually, I realize I\'m not stuck - I\'m just taking time to think deeply'
      },
      {
        role: 'assistant',
        content: 'That\'s a wonderful reframe! Let me update that experience to reflect your deeper understanding.',
        expectedTools: ['reconsider']
      }
    ]
  },
  'release-cleanup': {
    description: 'Test selective removal of experiences',
    turns: [
      {
        role: 'user',
        content: 'I had a really bad day yesterday'
      },
      {
        role: 'assistant',
        content: 'I\'m sorry to hear that. Let me capture that experience.',
        expectedTools: ['experience']
      },
      {
        role: 'user',
        content: 'Actually, I want to let that go - it\'s not serving me anymore'
      },
      {
        role: 'assistant',
        content: 'That\'s a healthy choice. Let me help you release that experience.',
        expectedTools: ['release']
      }
    ]
  },
  'dimensional-focus': {
    description: 'Deep dive into dimensional filtering patterns',
    turns: [
      {
        role: 'user',
        content: 'I feel focused and energized while working on this project'
      },
      {
        role: 'assistant',
        content: 'That sounds like a great state! Let me capture that experience.',
        expectedTools: ['experience']
      },
      {
        role: 'user',
        content: 'Show me all my experiences with embodied thinking and mood open'
      },
      {
        role: 'assistant',
        content: 'I\'ll search for experiences that combine embodied thinking with an open mood.',
        expectedTools: ['recall']
      }
    ]
  },
  'sophisticated-filtering': {
    description: 'Test sophisticated quality filtering with boolean logic and absence filtering',
    turns: [
      {
        role: 'user',
        content: 'I feel anxious about the presentation tomorrow'
      },
      {
        role: 'assistant',
        content: 'I\'ve captured that experience with the following qualities: embodied.sensing, mood.closed, time.future',
        expectedTools: ['experience']
      },
      {
        role: 'user',
        content: 'I also feel anxious about the meeting next week'
      },
      {
        role: 'assistant',
        content: 'I can see from your past experiences that anxiety often shows up as embodied.sensing and mood.closed. Let me capture this one too.',
        expectedTools: ['experience']
      },
      {
        role: 'user',
        content: 'Show me experiences with embodied dimensions but without mood dimensions'
      },
      {
        role: 'assistant',
        content: 'I\'ll search for experiences that have embodied qualities but no mood dimensions.',
        expectedTools: ['recall']
      },
      {
        role: 'user',
        content: 'Now show me experiences with either embodied thinking OR focus narrow, but only if they also have mood closed'
      },
      {
        role: 'assistant',
        content: 'I\'ll search for experiences that have mood.closed AND either embodied.thinking OR focus.narrow.',
        expectedTools: ['recall']
      }
    ]
  }
};

// ============================================================================
// MCP CLIENT SETUP
// ============================================================================

async function setupMCPClient(): Promise<MCPClient | null> {
  const serverPath = join(process.cwd(), 'dist', 'index.js');
  
  if (!existsSync(serverPath)) {
    console.error('❌ MCP server not found. Run "npm run build" first.');
    return null;
  }

  const client = new MCPClient({
    name: "bridge-test-client",
    version: "1.0.0",
  });

  const env = {
    ...process.env,
    BRIDGE_FILE_PATH: join(process.cwd(), 'data', 'test-bridge', 'bridge.json')
  };

  const transport = new StdioClientTransport({
    command: "node",
    args: [serverPath],
    env
  });

  await client.connect(transport);
  
  console.log('✅ MCP client connected');
  console.log(`📁 Test data: ${env.BRIDGE_FILE_PATH}`);
  
  const tools = await client.listTools();
  console.log(`🔧 Available tools: ${tools.tools.map(t => t.name).join(', ')}`);
  
  return client;
}

// ============================================================================
// TEST RUNNER
// ============================================================================

class TestRunner {
  private anthropic: Anthropic;
  private mcpClient: MCPClient | null = null;
  private messages: Message[] = [];
  private toolCalls: ToolCall[] = [];
  private conversationFlow: ConversationTurn[] = [];
  private turnCount = 0;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }
    this.anthropic = new Anthropic({ apiKey });
  }

  async runTest(scenarioKey: string, retryCount: number = 0): Promise<TestResult> {
    const MAX_RETRIES = 2;
    const scenario = SCENARIOS[scenarioKey];
    if (!scenario) {
      throw new Error(`Unknown scenario: ${scenarioKey}`);
    }

    console.log(`\n${'='.repeat(70)}`);
    console.log(`🧪 Running test: ${scenarioKey}${retryCount > 0 ? ` (retry ${retryCount}/${MAX_RETRIES})` : ''}`);
    console.log(`📝 ${scenario.description}`);
    console.log(`${'='.repeat(70)}\n`);

    const result: TestResult = {
      scenario: scenarioKey,
      scenarioName: scenarioKey, // Use scenarioKey as name for simplicity
      startTime: new Date(),
      messages: [],
      toolCalls: [],
      conversationFlow: []
    };

    // Setup test data
    const testDataFile = join(process.cwd(), 'data', 'test-bridge', 'bridge.json');
    const testDataDir = join(process.cwd(), 'data', 'test-bridge');
    
    // Ensure test data directory exists
    if (!existsSync(testDataDir)) {
      mkdirSync(testDataDir, { recursive: true });
    }

    // Generate fresh test data
    console.log('\n📦 Generating test data...');
    await ensureTestData();

    let testDataBackup: string | undefined;
    
    // Backup existing test data if it exists
    if (existsSync(testDataFile)) {
      testDataBackup = `${testDataFile}.backup`;
      copyFileSync(testDataFile, testDataBackup);
      console.log('💾 Backed up existing test data');
    }

    try {
      // Setup MCP client
      this.mcpClient = await setupMCPClient();
      if (!this.mcpClient) {
        throw new Error('Failed to setup MCP client');
      }

      // Reset state
      this.messages = [];
      this.toolCalls = [];
      this.conversationFlow = [];
      this.turnCount = 0;

      // Run conversation through predefined turns
      for (let i = 0; i < scenario.turns.length; i++) {
        const turn = scenario.turns[i];
        this.turnCount++;
        console.log(`\n--- Turn ${this.turnCount} ---`);

        const currentTurn: ConversationTurn = {
          turnNumber: this.turnCount
        };

        // Add user message if it's a user turn
        if (turn.role === 'user') {
          currentTurn.userMessage = turn.content;
          const userMessage = {
            role: 'user' as const,
            content: turn.content
          };
          console.log(`👤 User: ${turn.content}`);
          this.messages.push(userMessage);
        }

        // Get Claude's response for all turns
        const finalMessage = await this.getClaudeResponse('', this.messages);
        
        if (finalMessage) {
          // Extract response details for conversation flow
          const responseDetails = this.extractResponseDetails(finalMessage);
          currentTurn.assistantResponse = responseDetails;
          
          // Display summary
          if (responseDetails.text) {
            console.log(`🤖 Claude: ${responseDetails.text.substring(0, 150)}${responseDetails.text.length > 150 ? '...' : ''}`);
          }
        }

        // Save current turn
        this.conversationFlow.push(currentTurn);
      }

      console.log('🏁 All turns processed');

      // Complete result
      result.endTime = new Date();
      result.duration = (result.endTime.getTime() - result.startTime.getTime()) / 1000;
      result.messages = this.messages;
      result.toolCalls = this.toolCalls;
      result.conversationFlow = this.conversationFlow;

      console.log(`\n✅ Test completed in ${result.duration?.toFixed(1)}s`);
      
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
      console.error(`\n❌ Test failed: ${result.error}`);
      
      // Save partial results even on error
      result.endTime = new Date();
      result.duration = (result.endTime.getTime() - result.startTime.getTime()) / 1000;
      result.messages = this.messages;
      result.toolCalls = this.toolCalls;
      result.conversationFlow = this.conversationFlow;
      
      // Retry logic for transient failures
      const MAX_RETRIES = 2;
      if (retryCount < MAX_RETRIES && 
          (result.error.includes('timeout') || 
           result.error.includes('429') || 
           result.error.includes('invalid_request_error'))) {
        console.log(`\n🔄 Retrying test due to transient error...`);
        await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1))); // Exponential backoff
        return this.runTest(scenarioKey, retryCount + 1);
      }
    } finally {
      // Cleanup
      if (this.mcpClient) {
        await this.mcpClient.close();
        this.mcpClient = null;
      }

      // Cleanup test data
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

    return result;
  }

  private extractResponseDetails(message: Message): ConversationTurn['assistantResponse'] & {hasToolUse?: boolean} {
    const details: ConversationTurn['assistantResponse'] & {hasToolUse?: boolean} = {};
    
    if (typeof message.content === 'string') {
      details.text = message.content;
    } else if (Array.isArray(message.content)) {
      const textParts: string[] = [];
      const toolCallDetails: Array<{
        toolName: string;
        arguments: Record<string, unknown>;
        result: string[];
      }> = [];
      let hasToolUse = false;
      
      for (const content of message.content) {
        if (typeof content === 'object' && content !== null && 'type' in content) {
          const typedContent = content as {type: string; text?: string; name?: string; input?: unknown; id?: string};
          
          if (typedContent.type === 'text' && typedContent.text) {
            textParts.push(typedContent.text);
          } else if (typedContent.type === 'tool_use' && typedContent.name && typedContent.input) {
            hasToolUse = true;
            // Find the corresponding tool call result
            const toolCall = this.toolCalls.find(tc => 
              tc.toolName === typedContent.name && 
              tc.turn === this.turnCount
            );
            
            toolCallDetails.push({
              toolName: typedContent.name,
              arguments: typedContent.input as Record<string, unknown>,
              result: toolCall?.resultText || []
            });
          }
        }
      }
      
      if (textParts.length > 0) {
        details.text = textParts.join(' ');
      }
      
      if (toolCallDetails.length > 0) {
        details.toolCalls = toolCallDetails;
      }
      
      details.hasToolUse = hasToolUse;
    }
    
    return details;
  }

  private async getClaudeResponse(systemPrompt: string, messages: Message[]): Promise<Message> {
    console.log('🤖 Getting Claude response...');
    
    // Handle the response recursively to deal with multiple tool uses
    return this.handleClaudeResponse(systemPrompt, messages);
  }

  private async handleClaudeResponse(systemPrompt: string, messages: Message[]): Promise<Message> {
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

    // Add tools if MCP client is available
    if (this.mcpClient) {
      const tools = await this.mcpClient.listTools();
      requestParams.tools = tools.tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.inputSchema
      }));
    }

    const response = await this.anthropic.messages.create(requestParams);

    // Process response and handle tool use
    const toolUses: Array<{id: string; name: string; result: {content?: unknown[]; isError?: boolean}}> = [];
    let hasToolUse = false;
    
    for (const content of response.content) {
      if (content.type === 'tool_use' && this.mcpClient) {
        hasToolUse = true;
        // Call the tool
        console.log(`🔧 Calling tool: ${content.name}`);
        
        const toolCall: ToolCall = {
          timestamp: new Date(),
          turn: this.turnCount,
          toolName: content.name,
          arguments: content.input as Record<string, unknown>
        };
        
        try {
          const result = await this.mcpClient.callTool({
            name: content.name,
            arguments: content.input as Record<string, unknown>
          });
          
          toolCall.result = result;
          
          // Display full tool response for visibility
          if (result.content && Array.isArray(result.content)) {
            console.log(`📝 Tool response:`);
            const textResponses: string[] = [];
            result.content.forEach((item: unknown, index: number) => {
              if (typeof item === 'object' && item !== null && 'type' in item && 'text' in item) {
                const typedItem = item as {type: string; text: string};
                if (typedItem.type === 'text') {
                  console.log(`   ${index + 1}. ${typedItem.text}`);
                  textResponses.push(typedItem.text);
                }
              }
            });
            toolCall.resultText = textResponses;
          }
          
          // Store tool result for continuation
          toolUses.push({
            id: content.id,
            name: content.name,
            result: {
              content: result.content as unknown[]
            }
          });
          
        } catch (error) {
          toolCall.error = error instanceof Error ? error.message : String(error);
          console.error(`❌ Tool call failed: ${toolCall.error}`);
          
          // Store error result
          toolUses.push({
            id: content.id,
            name: content.name,
            result: { 
              isError: true, 
              content: [{ type: 'text', text: `Error: ${toolCall.error}` }] 
            }
          });
        }
        
        this.toolCalls.push(toolCall);
      }
    }

    // If there were tool uses, we need to handle the continuation properly
    if (hasToolUse) {
      // First, add the assistant message with tool uses to our conversation
      this.messages.push({
        role: 'assistant',
        content: response.content
      });
      
      // Then add tool results as user messages
      for (const toolUse of toolUses) {
        this.messages.push({
          role: 'user',
          content: [{
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: toolUse.result.content || []
          }]
        });
      }
      
      // Get Claude's response after tool use
      try {
        // Create a new request with the updated messages
        const continuationParams: any = {
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 2000,
          messages: this.messages.map(msg => ({
            role: msg.role,
            content: typeof msg.content === 'string' ? msg.content : msg.content
          }))
        };
        
        if (systemPrompt) {
          continuationParams.system = systemPrompt;
        }
        
        // Add tools for continuation
        if (this.mcpClient) {
          const tools = await this.mcpClient.listTools();
          continuationParams.tools = tools.tools.map(tool => ({
            name: tool.name,
            description: tool.description,
            input_schema: tool.inputSchema
          }));
        }
        
        const continuationResponse = await this.anthropic.messages.create(continuationParams as any); // eslint-disable-line @typescript-eslint/no-explicit-any
        
        // Process the continuation response for tool uses
        let hasContinuationToolUse = false;
        const continuationToolUses: Array<{id: string; name: string; result: {content?: unknown[]; isError?: boolean}}> = [];
        
        for (const content of continuationResponse.content) {
          if (content.type === 'tool_use' && this.mcpClient) {
            hasContinuationToolUse = true;
            console.log(`🔧 Continuation has tool use: ${content.name}`);
            
            // Process this tool use
            const toolCall: ToolCall = {
              timestamp: new Date(),
              turn: this.turnCount,
              toolName: content.name,
              arguments: content.input as Record<string, unknown>
            };
            
            try {
              const result = await this.mcpClient.callTool({
                name: content.name,
                arguments: content.input as Record<string, unknown>
              });
              
              toolCall.result = result;
              
              // Display tool response
              if (result.content && Array.isArray(result.content)) {
                console.log(`📝 Tool response:`);
                const textResponses: string[] = [];
                result.content.forEach((item: unknown, index: number) => {
                  if (typeof item === 'object' && item !== null && 'type' in item && 'text' in item) {
                    const typedItem = item as {type: string; text: string};
                    if (typedItem.type === 'text') {
                      console.log(`   ${index + 1}. ${typedItem.text}`);
                      textResponses.push(typedItem.text);
                    }
                  }
                });
                toolCall.resultText = textResponses;
              }
              
              continuationToolUses.push({
                id: content.id,
                name: content.name,
                result: { content: result.content as unknown[] }
              });
            } catch (error) {
              toolCall.error = error instanceof Error ? error.message : String(error);
              console.error(`❌ Tool call failed: ${toolCall.error}`);
              
              continuationToolUses.push({
                id: content.id,
                name: content.name,
                result: { 
                  isError: true, 
                  content: [{ type: 'text', text: `Error: ${toolCall.error}` }] 
                }
              });
            }
            
            this.toolCalls.push(toolCall);
          }
        }
        
        if (hasContinuationToolUse) {
          // Add the assistant message with tool uses
          this.messages.push({
            role: 'assistant',
            content: continuationResponse.content
          });
          
          // Add tool results
          for (const toolUse of continuationToolUses) {
            this.messages.push({
              role: 'user',
              content: [{
                type: 'tool_result',
                tool_use_id: toolUse.id,
                content: toolUse.result.content || []
              }]
            });
          }
          
          // Recursively handle any further responses
          return this.handleClaudeResponse(systemPrompt, this.messages);
        } else {
          // No more tool uses, add final response
          const finalResponse = {
            role: 'assistant' as const,
            content: continuationResponse.content
          };
          this.messages.push(finalResponse);
          return finalResponse;
        }
      } catch (error) {
        console.error('❌ Continuation failed:', error instanceof Error ? error.message : String(error));
        throw error;
      }
    }

    // No tool use, just add and return the response
    const finalResponse = {
      role: 'assistant' as const,
      content: response.content
    };
    this.messages.push(finalResponse);
    return finalResponse;
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

/**
 * Main entry point for Bridge test runner
 * @remarks
 * Executes Bridge integration tests with Claude and MCP server.
 * Supports both sequential and parallel execution modes.
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  let scenarioFilter: string | undefined;
  let runParallel = false;
  
  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--parallel' || args[i] === '-p') {
      runParallel = true;
    } else if (!args[i].startsWith('-')) {
      scenarioFilter = args[i];
    }
  }
  
  console.log('\n🚀 Bridge Test Runner');
  console.log('=====================\n');

  // Ensure results directory exists
  const resultsDir = join(process.cwd(), 'loop');
  if (!existsSync(resultsDir)) {
    mkdirSync(resultsDir, { recursive: true });
  }

  const runner = new TestRunner();
  const startTime = Date.now();
  
  // Run specified scenario or all scenarios
  const scenariosToRun = scenarioFilter 
    ? [scenarioFilter]
    : Object.keys(SCENARIOS);

  // Filter out unknown scenarios
  const validScenarios = scenariosToRun.filter(key => {
    if (!SCENARIOS[key]) {
      console.error(`❌ Unknown scenario: ${key}`);
      return false;
    }
    return true;
  });

  console.log(`🏃 Running ${validScenarios.length} scenario(s) ${runParallel ? 'in parallel' : 'sequentially'}...\n`);

  const results: TestResult[] = [];
  
  if (runParallel) {
    // Run all scenarios in parallel with timeout
    const scenarioPromises = validScenarios.map(async (scenarioKey) => {
    try {
      // Add timeout to prevent hanging
      const timeoutMs = 60000; // 60 seconds per scenario (increased from 30)
      const resultPromise = runner.runTest(scenarioKey);
      
      const timeoutPromise = new Promise<TestResult>((_, reject) => {
        const timer = setTimeout(() => {
          reject(new Error(`Test timeout after ${timeoutMs/1000}s`));
        }, timeoutMs);
        
        // Clean up timer if result comes first
        resultPromise.then(() => clearTimeout(timer)).catch(() => clearTimeout(timer));
      });
      
      const result = await Promise.race([resultPromise, timeoutPromise]);
      
      // Save individual result immediately
      const individualResultPath = join(resultsDir, `${scenarioKey}-${Date.now()}.json`);
      writeFileSync(individualResultPath, JSON.stringify(result, null, 2));
      console.log(`💾 Saved: ${scenarioKey} → ${individualResultPath}`);
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Failed ${scenarioKey}: ${errorMessage}`);
      
      // Return error result instead of throwing
      return {
        scenario: scenarioKey,
        scenarioName: scenarioKey,
        startTime: new Date(),
        endTime: new Date(),
        duration: 0,
        messages: [],
        toolCalls: [],
        conversationFlow: [],
        error: errorMessage
      } as TestResult;
    }
    });

    // Wait for all scenarios to complete
    results.push(...await Promise.all(scenarioPromises));
  } else {
    // Run scenarios sequentially to avoid resource contention
    for (const scenarioKey of validScenarios) {
      try {
        console.log(`\n🏃 Starting: ${scenarioKey}...`);
        const result = await runner.runTest(scenarioKey);
        
        // Save individual result immediately
        const individualResultPath = join(resultsDir, `${scenarioKey}-${Date.now()}.json`);
        writeFileSync(individualResultPath, JSON.stringify(result, null, 2));
        console.log(`💾 Saved: ${scenarioKey} → ${individualResultPath}`);
        
        results.push(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ Failed ${scenarioKey}: ${errorMessage}`);
        
        // Return error result instead of throwing
        results.push({
          scenario: scenarioKey,
          scenarioName: scenarioKey,
          startTime: new Date(),
          endTime: new Date(),
          duration: 0,
          messages: [],
          toolCalls: [],
          conversationFlow: [],
          error: errorMessage
        } as TestResult);
      }
    }
  }

  // Save combined results
  const totalDuration = (Date.now() - startTime) / 1000;
  const testRun = {
    testRun: new Date().toISOString(),
    summary: {
      totalScenarios: results.length,
      totalDuration: totalDuration,
      scenarios: results.map(r => ({
        scenario: r.scenario,
        name: r.scenarioName,
        duration: r.duration || 0,
        turns: r.conversationFlow.length,
        toolCalls: r.toolCalls.length,
        error: r.error
      }))
    },
    results
  };

  const resultPath = join(resultsDir, `test-run-${Date.now()}.json`);
  writeFileSync(resultPath, JSON.stringify(testRun, null, 2));
  
  console.log('\n' + '='.repeat(70));
  console.log('📊 Test Summary');
  console.log('='.repeat(70));
  console.log(`Total scenarios: ${results.length}`);
  console.log(`Total duration: ${totalDuration.toFixed(1)}s`);
  console.log(`Results saved to: ${resultPath}`);
  
  // Display summary table
  console.log('\nScenario Results:');
  const passed = results.filter(r => !r.error).length;
  const failed = results.filter(r => r.error).length;
  
  results.forEach(r => {
    const status = r.error ? '❌' : '✅';
    if (r.error) {
      console.log(`${status} ${r.scenarioName}: Failed - ${r.error}`);
    } else {
      const toolCount = r.toolCalls.length;
      const turns = r.conversationFlow.length;
      console.log(`${status} ${r.scenarioName}: ${turns} turns, ${toolCount} tool calls, ${r.duration?.toFixed(1)}s`);
    }
  });
  
  console.log(`\n📋 Summary: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    console.log('\n💡 Troubleshooting tips:');
    console.log('  - Run tests sequentially (default) to avoid resource contention');
    console.log('  - Check your API key and rate limits');
    console.log('  - Run individual tests with: npm run test:bridge:experience');
    console.log('  - Use --parallel flag only if you have sufficient API capacity');
  }
  
  console.log('\n✨ Test run complete!');
}

// Run tests
main().catch(console.error);