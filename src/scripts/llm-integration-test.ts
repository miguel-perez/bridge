import { Client as MCPClient } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Anthropic } from "@anthropic-ai/sdk";
import { promises as fs } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';
import { clearTestStorage, setStorageConfig } from '../core/storage.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface TestResult {
  timestamp: string;
  toolCalls: Array<{
    tool: string;
    args: any;
    result: any;
    success: boolean;
    error?: string;
  }>;
  llmResponses: string[];
  finalAssessment: string;
}

// Utility to deeply remove large fields from schemas
function removeLargeFields(obj: any, fieldsToRemove = ["embeddings", "embedding", "vector", "vectors"]): any {
  if (Array.isArray(obj)) {
    return obj.map(item => removeLargeFields(item, fieldsToRemove));
  } else if (obj && typeof obj === "object") {
    const newObj: any = {};
    for (const key of Object.keys(obj)) {
      if (fieldsToRemove.includes(key)) continue;
      newObj[key] = removeLargeFields(obj[key], fieldsToRemove);
    }
    return newObj;
  }
  return obj;
}

class LLMIntegrationTester {
  private mcp: MCPClient;
  private anthropic: Anthropic;
  private testResults: TestResult;
  private messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  constructor() {
    this.mcp = new MCPClient({ 
      name: "bridge-llm-integration-test", 
      version: "1.0.0" 
    });
    
    this.anthropic = new Anthropic({ 
      apiKey: process.env.ANTHROPIC_API_KEY 
    });

    this.testResults = {
      timestamp: new Date().toISOString(),
      toolCalls: [],
      llmResponses: [],
      finalAssessment: ''
    };
  }

  async connectToServer(): Promise<void> {
    try {
      console.log('🔌 Connecting to Bridge MCP server...');
      
      // Clear the test database before starting the test
      console.log('🧹 Clearing test database before test...');
      const testDataPath = join(process.cwd(), 'data', 'bridge-test.json');
      setStorageConfig({ dataFile: testDataPath });
      await clearTestStorage();
      console.log('✅ Test database cleared successfully');
      
      // Path to the built MCP server
      const serverPath = join(__dirname, '..', '..', 'dist', 'index.js');
      
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

  async getToolDefinitions(): Promise<string> {
    try {
      console.log('📋 Fetching tool definitions...');
      const toolsResult = await this.mcp.listTools();
      
      const toolDescriptions = toolsResult.tools.map(tool => {
        // Remove large fields from inputSchema
        const filteredSchema = removeLargeFields(tool.inputSchema);
        const schemaStr = JSON.stringify(filteredSchema, null, 2);
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

  private async getAnthropicTools() {
    const mcpTools = (await this.mcp.listTools()).tools;
    return mcpTools.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: removeLargeFields(tool.inputSchema)
    }));
  }

  async runThinkAloudTest(): Promise<void> {
    const toolDescriptions = await this.getToolDefinitions();
    
    const testScript = `Hi Claude! I'm Miguel, and I'm going to be walking you through this session today. We're testing the Bridge MCP tool that we're working on so we can see whether it works as intended.

The first thing I want to make clear right away is that we're testing the tool, not you. You can't do anything wrong here. In fact, this is probably the one place today where you don't have to worry about making mistakes.

As much as possible, try to think out loud: say what you're looking at, what you're trying to do, and what you're thinking. This will be a big help to us. Also, please don't worry that you're going to hurt our feelings. We're doing this to improve, so we need to hear your honest reactions.

If you have any questions as we go along, just ask them. I may not be able to answer them right away, since we're interested in how AI systems perform when they don't have a developer sitting next to them to help. But if you still have any questions when we're done, I'll try to answer them then.

Here are the available tools:

${toolDescriptions}

**IMPORTANT: I want you to actually USE these tools to test them. Don't just analyze them - execute them!**

Let's start with the first scenario. I want you to actually perform this task using the appropriate tool:

**Scenario 1: Capturing a Creative Breakthrough Moment**
"I just had this amazing insight while working on a design system. I realized that the same constraints that made pixel art so powerful - using limited tiles to create infinite scenes - could apply to our component library. I want to capture this moment."

**Your task:** Use the capture tool to record this experience. Think out loud about:
- What tool you're going to use and why
- What parameters you need to provide
- What you expect to happen
- Then actually call the tool and observe the result

Go ahead and capture this moment right now using the appropriate tool.`;

    console.log('🧠 Starting LLM integration test...');
    console.log('📝 Sending test script to Claude...\n');

    this.messages.push({ role: 'user', content: testScript });

    try {
      const anthropicTools = await this.getAnthropicTools();

      const response = await this.anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 4000,
        messages: this.messages,
        tools: anthropicTools,
      });

      await this.processResponse(response);
      
      // Continue with additional scenarios
      await this.continueWithScenarios();
      
    } catch (error) {
      console.error('❌ Failed to run LLM test:', error);
      throw error;
    }
  }

  private async continueWithScenarios(): Promise<void> {
    const scenarios = [
      {
        name: "Scenario 2: Searching for a Past Experience",
        description: "A few weeks ago, I recorded a moment about feeling stuck while working on a project. I want to find that record so I can reflect on how I got through it.",
        task: "Use the search tool to find this experience. Think about what search terms or filters would work best."
      },
      {
        name: "Scenario 3: Enriching a Record with New Insights", 
        description: "I found my earlier capture about feeling stuck, but I want to add that I later realized the block was due to unclear requirements. Update the record to include this new insight.",
        task: "Use the enrich tool to update the record with this new insight. You'll need to find the record first, then enrich it."
      },
      {
        name: "Scenario 4: Releasing (Deleting) a Record",
        description: "I accidentally captured a duplicate of my creative breakthrough moment. Please delete the duplicate so my records stay clean.",
        task: "Use the release tool to delete the duplicate record. First search for duplicates, then delete one."
      }
    ];

    for (const scenario of scenarios) {
      console.log(`\n🔄 Continuing with ${scenario.name}...\n`);
      
      const scenarioPrompt = `Great! Now let's test the next scenario:

**${scenario.name}**
"${scenario.description}"

**Your task:** ${scenario.task}

Go ahead and perform this task using the appropriate tool(s).`;

      this.messages.push({ role: 'user', content: scenarioPrompt });

      try {
        const anthropicTools = await this.getAnthropicTools();
        const response = await this.anthropic.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 3000,
          messages: this.messages,
          tools: anthropicTools,
        });

        await this.processResponse(response);
        
        // Small delay between scenarios
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Failed to run ${scenario.name}:`, error);
      }
    }
  }

  private async processResponse(response: any): Promise<void> {
    console.log('🤖 Processing Claude\'s response...\n');

    for (const content of response.content) {
      if (content.type === "text") {
        console.log('💬 Claude says:');
        console.log(content.text);
        console.log('\n' + '='.repeat(80) + '\n');
        
        this.testResults.llmResponses.push(content.text);
        this.messages.push({ role: 'assistant', content: content.text });
        
      } else if (content.type === "tool_use") {
        console.log(`🔧 Claude wants to use tool: ${content.name}`);
        console.log(`📋 Arguments: ${JSON.stringify(content.input, null, 2)}`);
        
        try {
          const result = await this.mcp.callTool({ 
            name: content.name, 
            arguments: content.input 
          });
          
          console.log('✅ Tool executed successfully');
          console.log('📤 Result:', JSON.stringify(result, null, 2));
          
          this.testResults.toolCalls.push({
            tool: content.name,
            args: content.input,
            result: result,
            success: true
          });

          // Add tool result to conversation
          const resultText = typeof result.content === 'string' 
            ? result.content 
            : JSON.stringify(result.content);
            
          this.messages.push({ 
            role: 'user', 
            content: `Tool ${content.name} result: ${resultText}` 
          });

          // Let Claude continue with the result
          const followUpResponse = await this.anthropic.messages.create({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 2000,
            messages: this.messages,
            tools: await this.getAnthropicTools(),
          });

          await this.processResponse(followUpResponse);
          
        } catch (error) {
          console.error(`❌ Tool ${content.name} failed:`, error);
          
          this.testResults.toolCalls.push({
            tool: content.name,
            args: content.input,
            result: null,
            success: false,
            error: error instanceof Error ? error.message : String(error)
          });

          // Let Claude know about the error
          this.messages.push({ 
            role: 'user', 
            content: `Tool ${content.name} failed with error: ${error instanceof Error ? error.message : String(error)}` 
          });
        }
      }
    }
  }

  async generateFinalAssessment(): Promise<void> {
    console.log('📊 Generating final assessment...');
    
    const assessmentPrompt = `Based on our testing session, please provide a comprehensive assessment of the Bridge MCP tool. If you had a magic wand, what would you change?`;

    this.messages.push({ role: 'user', content: assessmentPrompt });

    try {
      const response = await this.anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 2000,
        messages: this.messages,
      });

      this.testResults.finalAssessment = response.content[0].type === 'text' 
        ? response.content[0].text 
        : 'No text response received';

      console.log('📋 Final Assessment:');
      console.log(this.testResults.finalAssessment);
      
    } catch (error) {
      console.error('❌ Failed to generate assessment:', error);
    }
  }

  async saveResults(): Promise<void> {
    const resultsDir = join(__dirname, '..', '..', 'test-results');
    await fs.mkdir(resultsDir, { recursive: true });
    
    const filename = `llm-integration-test-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const filepath = join(resultsDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify(this.testResults, null, 2));
    console.log(`💾 Test results saved to: ${filepath}`);
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
  const tester = new LLMIntegrationTester();
  
  try {
    await tester.connectToServer();
    await tester.runThinkAloudTest();
    await tester.generateFinalAssessment();
    await tester.saveResults();
    
    console.log('\n🎉 LLM integration test completed successfully!');
    
  } catch (error) {
    console.error('💥 Test failed:', error);
    process.exit(1);
  } finally {
    await tester.cleanup();
  }
}

// Run the test
main(); 