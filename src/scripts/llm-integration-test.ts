import { Client as MCPClient } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Anthropic } from "@anthropic-ai/sdk";
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class SimpleLLMTester {
  private mcp: MCPClient;
  private anthropic: Anthropic;

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

  private async getAnthropicTools() {
    const mcpTools = (await this.mcp.listTools()).tools;
    return mcpTools.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema
    }));
  }

  async runTest(): Promise<void> {  
    const testPrompt = `
Hi, Claude My name is Miguel, and I’m going to be walking you through this session today. We’re asking Claude to try using the Bridge MCP tool that we’re working on so we can see whether it works as intended. The first thing I want to make clear right away is that we’re testing the site, not you. You can’t do anything wrong here. In fact, this is probably the one place today where you don’t have to worry about making mistakes. As much as possible to try to think out loud: to say what you’re looking at, what you’re trying to do, and what you’re thinking. This will be a big help to us. Also, please don’t worry that you’re going to hurt our feelings. We’re doing this to improve, so we need to hear your honest reactions. If you have any questions as we go along, just ask them. I may not be able to answer them right away, since we’re interested in how AI  do when they don’t have a developer sitting next to them to help. But if you still have any questions when we’re done I’ll try to answer them then. First, I’m going to ask you to look at this MCP tool and tell me what you make of it: what strikes you about it, whose it for, what you can do, and what it’s for. Just look around and do a little narrative. Don't use any of the tools just yet. Afterward, look at all the tool definitions and define a lists of tasks. Then begin to execute them. First, say what you would expect to happen. Then, run the tool and observe what actually happens. Create a comprehensive path through all the features in an order that is most efficient. Focus a lot on search. Finally, note misalignments between your expectation and reality, good or bad. 
  `;

    console.log('🧠 Starting simplified LLM integration test...');
    console.log('📝 Sending test prompt to Claude...\n');

    const messages = [{ role: 'user' as const, content: testPrompt }];

    try {
      const anthropicTools = await this.getAnthropicTools();

      const response = await this.anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 4000,
        messages: messages,
        tools: anthropicTools,
      });

      await this.processResponse(response, messages, anthropicTools);
      
    } catch (error) {
      console.error('❌ Failed to run LLM test:', error);
      throw error;
    }
  }

  private async processResponse(response: any, messages: any[], anthropicTools: any[]): Promise<void> {
    console.log('🤖 Processing Claude\'s response...\n');

    for (const content of response.content) {
      if (content.type === "text") {
        console.log('💬 Claude says:');
        console.log(content.text);
        console.log('\n' + '='.repeat(80) + '\n');
        
        messages.push({ role: 'assistant', content: content.text });
        
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

          await this.processResponse(followUpResponse, messages, anthropicTools);
          
        } catch (error) {
          console.error(`❌ Tool ${content.name} failed:`, error);
          
          // Let Claude know about the error
          messages.push({ 
            role: 'user', 
            content: `Tool ${content.name} failed with error: ${error instanceof Error ? error.message : String(error)}` 
          });
        }
      }
    }
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
  const tester = new SimpleLLMTester();
  
  try {
    await tester.connectToServer();
    await tester.runTest();
    
    console.log('\n🎉 Simplified LLM integration test completed!');
    
  } catch (error) {
    console.error('💥 Test failed:', error);
    process.exit(1);
  } finally {
    await tester.cleanup();
  }
}

// Run the test
main(); 