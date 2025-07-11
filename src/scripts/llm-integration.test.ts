import { Client as MCPClient } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Anthropic } from "@anthropic-ai/sdk";
import { join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Test scenarios for different development phases
const TEST_SCENARIOS = {
  // Quick tool validation
  'tool-discovery': `
    List all available tools and describe what each one does. 
    Focus on understanding the tool purposes and required parameters.
  `,
  
  // Basic functionality testing
  'basic-capture': `
    Create a simple experiential capture about feeling excited about a new project.
    Use the capture tool with minimal required fields.
  `,
  
  // Search functionality
  'basic-search': `
    Search for experiences related to "learning" or "growth".
    Try different search parameters and see what results you get.
  `,
  
  // Complex workflow
  'capture-search-enrich': `
    1. First, capture an experience about learning to code
    2. Then search for experiences about learning or education
    3. Finally, enrich one of the search results with additional experiential analysis
    Report on each step and any issues you encounter.
  `,
  
  // Error handling
  'error-testing': `
    Try to use the capture tool with invalid or missing parameters.
    Test what happens when you provide bad experiential qualities.
    Report how the system handles errors.
  `,
  
  // Full integration test
  'full-integration': `
    Hi, Claude My name is Miguel, and I'm going to be walking you through this session today. 
    We're asking Claude to try using the Bridge MCP tool that we're working on so we can see whether it works as intended. 
    The first thing I want to make clear right away is that we're testing the site, not you. 
    You can't do anything wrong here. In fact, this is probably the one place today where you don't have to worry about making mistakes. 
    As much as possible to try to think out loud: to say what you're looking at, what you're trying to do, and what you're thinking. 
    This will be a big help to us. Also, please don't worry that you're going to hurt our feelings. 
    We're doing this to improve, so we need to hear your honest reactions. If you have any questions as we go along, just ask them. 
    I may not be able to answer them right away, since we're interested in how AI do when they don't have a developer sitting next to them to help. 
    But if you still have any questions when we're done I'll try to answer them then. 
    First, I'm going to ask you to look at this MCP tool and tell me what you make of it: what strikes you about it, whose it for, what you can do, and what it's for. 
    Just look around and do a little narrative. Don't use any of the tools just yet. 
    Afterward, look at all the tool definitions and define a lists of tasks. Then begin to execute them. 
    First, say what you would expect to happen. Then, run the tool and observe what actually happens. 
    Create a comprehensive path through all the features in an order that is most efficient. Focus a lot on search. 
    
    IMPORTANT: When using the search tool, make sure to include these parameters for better results:
    - includeContext: true (to show metadata like experiencer, perspective, processing level, and experiential qualities)
    - includeFullContent: true (to show the full content instead of truncated snippets)
    - limit: 10 (to get a reasonable number of results)
    
    Finally, note misalignments between your expectation and reality, good or bad.
  `
};

class EnhancedLLMTester {
  private mcp: MCPClient;
  private anthropic: Anthropic;
  private testResults: any[] = [];

  constructor() {
    this.mcp = new MCPClient({ 
      name: "bridge-llm-integration-test", 
      version: "1.0.0" 
    });
    
    this.anthropic = new Anthropic({ 
      apiKey: process.env.ANTHROPIC_API_KEY 
    });
  }

  async connectToServer(): Promise<void> {
    try {
      console.log('🔌 Connecting to Bridge MCP server...');
      
      // Path to the built MCP server
      const serverPath = join(process.cwd(), 'dist', 'index.js');
      
      const transport = new StdioClientTransport({ 
        command: "node", 
        args: [serverPath],
        env: { ...process.env, NODE_ENV: 'test' }
      });
      
      await this.mcp.connect(transport);
      console.log('✅ Connected to MCP server successfully');
      
    } catch (error) {
      console.error('❌ Failed to connect to MCP server:', error);
      throw error;
    }
  }

  private async getAnthropicTools() {
    const mcpTools = (await this.mcp.listTools()).tools;
    return mcpTools.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema
    }));
  }

  async runSpecificTest(scenarioName: string): Promise<void> {
    const testPrompt = TEST_SCENARIOS[scenarioName as keyof typeof TEST_SCENARIOS];
    if (!testPrompt) {
      throw new Error(`Unknown test scenario: ${scenarioName}`);
    }

    console.log(`🧠 Running test scenario: ${scenarioName}`);
    console.log('📝 Sending test prompt to Claude...\n');

    const messages = [{ role: 'user' as const, content: testPrompt }];
    const testResult: {
      scenario: string;
      startTime: Date;
      endTime?: Date;
      toolCalls: Array<{
        tool: string;
        arguments: any;
        success: boolean;
        result: any;
        error: string | null;
      }>;
      errors: string[];
      success: boolean;
    } = {
      scenario: scenarioName,
      startTime: new Date(),
      toolCalls: [],
      errors: [],
      success: true
    };

    try {
      const anthropicTools = await this.getAnthropicTools();
      const response = await this.anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 4000,
        messages: messages,
        tools: anthropicTools,
      });

      await this.processResponse(response, messages, anthropicTools, testResult);
      
    } catch (error) {
      console.error(`❌ Failed to run test scenario ${scenarioName}:`, error);
      testResult.success = false;
      testResult.errors.push(error instanceof Error ? error.message : String(error));
    }

    testResult.endTime = new Date();
    this.testResults.push(testResult);
    this.printTestSummary(testResult);
  }

  async runAllTests(): Promise<void> {
    console.log('🧠 Running all test scenarios...\n');
    
    for (const scenarioName of Object.keys(TEST_SCENARIOS)) {
      try {
        await this.runSpecificTest(scenarioName);
        console.log('\n' + '='.repeat(80) + '\n');
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`❌ Test scenario ${scenarioName} failed:`, error);
      }
    }
    
    this.printOverallSummary();
  }

  private async processResponse(response: any, messages: any[], anthropicTools: any[], testResult: any): Promise<void> {
    console.log('🤖 Processing Claude\'s response...\n');

    for (const content of response.content) {
      if (content.type === "text") {
        console.log('💬 Claude says:');
        console.log(content.text);
        console.log('\n' + '-'.repeat(40) + '\n');
        
        messages.push({ role: 'assistant', content: content.text });
        
      } else if (content.type === "tool_use") {
        console.log(`🔧 Claude wants to use tool: ${content.name}`);
        console.log(`📋 Arguments: ${JSON.stringify(content.input, null, 2)}`);
        
        const toolCall: {
          tool: string;
          arguments: any;
          success: boolean;
          result: any;
          error: string | null;
        } = {
          tool: content.name,
          arguments: content.input,
          success: false,
          result: null,
          error: null
        };
        
        try {
          const result = await this.mcp.callTool({ 
            name: content.name, 
            arguments: content.input 
          });
          
          console.log('✅ Tool executed successfully');
          console.log('📤 Result:', JSON.stringify(result, null, 2));
          
          toolCall.success = true;
          toolCall.result = result;
          testResult.toolCalls.push(toolCall);
          
          // Add tool result to conversation
          const resultText = typeof result.content === 'string' 
            ? result.content 
            : JSON.stringify(result.content);
            
          messages.push({ 
            role: 'user', 
            content: `Tool ${content.name} result: ${resultText}` 
          });

          // Let Claude continue with the result
          const followUpResponse = await this.anthropic.messages.create({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 2000,
            messages: messages,
            tools: anthropicTools,
          });

          await this.processResponse(followUpResponse, messages, anthropicTools, testResult);
          
        } catch (error) {
          console.error(`❌ Tool ${content.name} failed:`, error);
          
          toolCall.error = error instanceof Error ? error.message : String(error);
          testResult.toolCalls.push(toolCall);
          testResult.errors.push(`Tool ${content.name} failed: ${toolCall.error}`);
          
          // Let Claude know about the error
          messages.push({ 
            role: 'user', 
            content: `Tool ${content.name} failed with error: ${toolCall.error}` 
          });
        }
      }
    }
  }

  private printTestSummary(testResult: any): void {
    const duration = testResult.endTime.getTime() - testResult.startTime.getTime();
    const successCount = testResult.toolCalls.filter((tc: any) => tc.success).length;
    const totalCalls = testResult.toolCalls.length;
    
    console.log(`\n📊 Test Summary for ${testResult.scenario}:`);
    console.log(`⏱️  Duration: ${duration}ms`);
    console.log(`🔧 Tool calls: ${successCount}/${totalCalls} successful`);
    console.log(`❌ Errors: ${testResult.errors.length}`);
    
    if (testResult.errors.length > 0) {
      console.log('🚨 Error details:');
      testResult.errors.forEach((error: string) => console.log(`  - ${error}`));
    }
  }

  private printOverallSummary(): void {
    console.log('\n🎯 Overall Test Summary:');
    console.log(`📊 Total scenarios: ${this.testResults.length}`);
    console.log(`✅ Successful scenarios: ${this.testResults.filter(r => r.success).length}`);
    console.log(`❌ Failed scenarios: ${this.testResults.filter(r => !r.success).length}`);
    
    const totalToolCalls = this.testResults.reduce((sum, r) => sum + r.toolCalls.length, 0);
    const successfulToolCalls = this.testResults.reduce((sum, r) => 
      sum + r.toolCalls.filter((tc: any) => tc.success).length, 0);
    
    console.log(`🔧 Total tool calls: ${successfulToolCalls}/${totalToolCalls} successful`);
  }

  async getToolDefinitions(): Promise<string> {
    try {
      console.log('📋 Fetching tool definitions...');
      const toolsResult = await this.mcp.listTools();
      
      const toolDescriptions = toolsResult.tools.map(tool => {
        const schemaStr = JSON.stringify(tool.inputSchema, null, 2);
        return `**${tool.name}**
Description: ${tool.description}
Input Schema: \`\`\`json\n${schemaStr}\n\`\`\`
`;
      }).join('\n\n');

      console.log(`✅ Found ${toolsResult.tools.length} tools`);
      return toolDescriptions;
      
    } catch (error) {
      console.error('❌ Failed to get tool definitions:', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    try {
      await this.mcp.close();
      console.log('🧹 Cleanup completed');
    } catch (error) {
      console.error('⚠️ Cleanup warning:', error);
    }
  }
}

async function main() {
  const tester = new EnhancedLLMTester();
  
  try {
    await tester.connectToServer();
    
    // Check command line arguments for specific test
    const scenario = process.argv[2];
    if (scenario) {
      if (scenario === 'all') {
        await tester.runAllTests();
      } else if (TEST_SCENARIOS[scenario as keyof typeof TEST_SCENARIOS]) {
        await tester.runSpecificTest(scenario);
      } else {
        console.log('Available test scenarios:');
        console.log('  all - Run all scenarios');
        Object.keys(TEST_SCENARIOS).forEach(name => console.log(`  ${name}`));
        return;
      }
    } else {
      // Default to full integration test
      await tester.runSpecificTest('full-integration');
    }
    
    console.log('\n🎉 LLM integration test completed!');
    
  } catch (error) {
    console.error('💥 Test failed:', error);
    process.exit(1);
  } finally {
    await tester.cleanup();
  }
}

// Run the test
main(); 