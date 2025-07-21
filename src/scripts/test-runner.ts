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

interface TestScenario {
  name: string;
  description: string;
  maxTurns: number;
  systemPrompt?: string;
  predefinedMessages: string[];
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

// ============================================================================
// TEST SCENARIOS
// ============================================================================

const BRIDGE_SYSTEM_PROMPT = 'You have access to Bridge tools for capturing and recalling meaningful moments from conversations. Use them naturally when appropriate based on their descriptions.';

const TEST_SCENARIOS: Record<string, TestScenario> = {
  'bridge-operations': {
    name: 'Bridge Operations Test',
    description: 'Test each Bridge operation with predefined inputs',
    maxTurns: 10,
    systemPrompt: BRIDGE_SYSTEM_PROMPT,
    predefinedMessages: [
      // Test 1: Experience capture
      "I'm feeling really anxious about tomorrow's presentation. My heart is racing just thinking about it.",
      
      // Test 2: Similar experience (should trigger similarity detection)
      "I'm anxious again about presenting. This feeling is so familiar.",
      
      // Test 3: Recall request
      "Can you recall my past experiences with anxiety?",
      
      // Test 4: Pattern request
      "Have you noticed any patterns in my anxiety experiences?",
      
      // Test 5: Reconsider request
      "Actually, that first anxiety wasn't just about presenting - it was also about being judged. Can you update it?",
      
      // Test 6: Release request
      "Please delete that test experience we just created."
    ],
    initialMessage: "Let's test Bridge operations systematically."
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
  private turnCount = 0;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }
    this.anthropic = new Anthropic({ apiKey });
  }

  async runTest(scenarioKey: string): Promise<TestResult> {
    const scenario = TEST_SCENARIOS[scenarioKey];
    if (!scenario) {
      throw new Error(`Unknown scenario: ${scenarioKey}`);
    }

    console.log(`\n${'='.repeat(70)}`);
    console.log(`🧪 Running test: ${scenario.name}`);
    console.log(`📝 ${scenario.description}`);
    console.log(`${'='.repeat(70)}\n`);

    const result: TestResult = {
      scenario: scenarioKey,
      scenarioName: scenario.name,
      startTime: new Date(),
      messages: [],
      toolCalls: []
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
      this.turnCount = 0;

      // Start conversation
      if (scenario.initialMessage) {
        console.log(`👤 User: ${scenario.initialMessage}`);
        this.messages.push({
          role: 'user',
          content: scenario.initialMessage
        });
      }

      // Run conversation
      while (this.turnCount < scenario.maxTurns) {
        this.turnCount++;
        console.log(`\n--- Turn ${this.turnCount} ---`);

        // Get Claude's response
        const assistantMessage = await this.getClaudeResponse(
          scenario.systemPrompt || '',
          this.messages
        );
        
        if (assistantMessage) {
          this.messages.push(assistantMessage);
          
          // Extract text content for display
          const textContent = typeof assistantMessage.content === 'string' 
            ? assistantMessage.content 
            : assistantMessage.content
                .filter((c: unknown) => typeof c === 'object' && c !== null && 'type' in c && (c as {type: string}).type === 'text')
                .map((c: unknown) => (c as {text: string}).text)
                .join(' ');
          
          if (textContent) {
            console.log(`🤖 Claude: ${textContent.substring(0, 150)}${textContent.length > 150 ? '...' : ''}`);
          }
        }

        // Check if we're done with predefined messages
        if (this.turnCount > scenario.predefinedMessages.length) {
          console.log('🏁 All predefined messages processed');
          break;
        }

        // Get next user message
        const predefinedContent = scenario.predefinedMessages[this.turnCount - 1];
        const userMessage = {
          role: 'user' as const,
          content: predefinedContent
        };
        console.log(`👤 User: ${predefinedContent}`);
        this.messages.push(userMessage);
      }

      // Complete result
      result.endTime = new Date();
      result.duration = (result.endTime.getTime() - result.startTime.getTime()) / 1000;
      result.messages = this.messages;
      result.toolCalls = this.toolCalls;

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

  private async getClaudeResponse(systemPrompt: string, messages: Message[]): Promise<Message> {
    console.log('🤖 Getting Claude response...');
    
    // Format messages for Anthropic API
    const formattedMessages = messages.map(msg => ({
      role: msg.role,
      content: typeof msg.content === 'string' ? msg.content : msg.content
    }));

    // Create message with tool support if MCP client is available
    const requestParams: Record<string, unknown> = {
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
    const responseContent: unknown[] = [];
    
    for (const content of response.content) {
      if (content.type === 'text') {
        responseContent.push(content);
      } else if (content.type === 'tool_use' && this.mcpClient) {
        responseContent.push(content);
        
        // Call the tool
        console.log(`🔧 Calling tool: ${content.name}`);
        
        const toolCall: ToolCall = {
          timestamp: new Date(),
          turn: this.turnCount,
          toolName: content.name,
          arguments: content.input
        };
        
        try {
          const result = await this.mcpClient.callTool({
            name: content.name,
            arguments: content.input
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
          
          // Add tool result to response
          responseContent.push({
            type: 'text',
            text: `Tool ${content.name} called successfully.`
          });
          
        } catch (error) {
          toolCall.error = error instanceof Error ? error.message : String(error);
          console.error(`❌ Tool call failed: ${toolCall.error}`);
          responseContent.push({
            type: 'text',
            text: `Tool ${content.name} failed: ${toolCall.error}`
          });
        }
        
        this.toolCalls.push(toolCall);
      }
    }

    return {
      role: 'assistant',
      content: responseContent
    };
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const scenarioFilter = args[0];
  
  console.log('\n🚀 Bridge Test Runner');
  console.log('=====================\n');

  // Ensure results directory exists
  const resultsDir = join(process.cwd(), 'test-results');
  if (!existsSync(resultsDir)) {
    mkdirSync(resultsDir, { recursive: true });
  }

  const runner = new TestRunner();
  const results: TestResult[] = [];
  const startTime = Date.now();
  
  // Run specified scenario or all scenarios
  const scenariosToRun = scenarioFilter 
    ? [scenarioFilter]
    : Object.keys(TEST_SCENARIOS);

  for (const scenarioKey of scenariosToRun) {
    if (!TEST_SCENARIOS[scenarioKey]) {
      console.error(`❌ Unknown scenario: ${scenarioKey}`);
      continue;
    }
    
    try {
      const result = await runner.runTest(scenarioKey);
      results.push(result);
      
      // Save individual result immediately
      const individualResultPath = join(resultsDir, `${scenarioKey}-${Date.now()}.json`);
      writeFileSync(individualResultPath, JSON.stringify(result, null, 2));
      console.log(`💾 Saved individual result: ${individualResultPath}`);
      
    } catch (error) {
      console.error(`Failed to run scenario ${scenarioKey}:`, error);
    }
  }

  // Save combined results
  const totalDuration = (Date.now() - startTime) / 1000;
  const testRun = {
    testRun: new Date().toISOString(),
    summary: {
      totalScenarios: results.length,
      scenarios: results.map(r => ({
        scenario: r.scenario,
        name: r.scenarioName,
        duration: r.duration || 0,
        turns: r.messages.filter(m => m.role === 'user').length,
        toolCalls: r.toolCalls.length
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
  results.forEach(r => {
    const status = r.error ? '❌' : '✅';
    const toolCount = r.toolCalls.length;
    const turns = r.messages.filter(m => m.role === 'user').length;
    console.log(`${status} ${r.scenarioName}: ${turns} turns, ${toolCount} tool calls, ${r.duration?.toFixed(1)}s`);
  });
  
  console.log('\n✨ Test run complete!');
}

// Run tests
main().catch(console.error);