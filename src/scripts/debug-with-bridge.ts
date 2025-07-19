#!/usr/bin/env tsx
/**
 * Debug script for with-bridge scenario
 * Minimal test to isolate the issue
 */

import { Client as MCPClient } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Anthropic } from "@anthropic-ai/sdk";
import { join } from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const BRIDGE_SYSTEM_PROMPT = `You have access to Bridge - a tool for shared experiential memory between humans and AI.

Bridge helps capture and search experiences using these tools:
- remember: Capture an experience with its qualities
- recall: Search for relevant experiences
- reconsider: Update existing experiences
- release: Remove experiences

Use Bridge naturally when it would help with understanding, reflection, or building shared context.`;

async function debugWithBridge() {
  console.log('🔍 Debugging with-bridge scenario...\n');
  
  // Initialize Anthropic
  const anthropic = new Anthropic({ 
    apiKey: process.env.ANTHROPIC_API_KEY 
  });
  
  // Set up MCP client
  const serverPath = join(process.cwd(), 'dist', 'index.js');
  const client = new MCPClient({
    name: "debug-client",
    version: "1.0.0",
  }, {
    capabilities: {}
  });

  const transport = new StdioClientTransport({
    command: "node",
    args: [serverPath]
  });

  try {
    await client.connect(transport);
    console.log('✅ Connected to MCP server\n');
    
    const tools = await client.listTools();
    console.log(`📋 Available tools: ${tools.tools.map(t => t.name).join(', ')}\n`);
    
    // Test a simple conversation
    const messages = [{
      role: 'user' as const,
      content: "I've been thinking about how much I've changed over the past year."
    }];
    
    console.log('🤖 Sending message to Claude with Bridge tools...\n');
    
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 500,
      system: BRIDGE_SYSTEM_PROMPT,
      messages,
      tools: tools.tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.inputSchema
      }))
    });
    
    console.log('📝 Response:', JSON.stringify(response, null, 2));
    
    // Check if Claude used any tools
    for (const content of response.content) {
      if (content.type === 'tool_use') {
        console.log(`\n🔧 Claude wants to use tool: ${content.name}`);
        console.log('Arguments:', JSON.stringify(content.input, null, 2));
        
        // Execute the tool
        const result = await client.callTool({
          name: content.name,
          arguments: content.input as Record<string, unknown>
        });
        
        console.log('✅ Tool result:', JSON.stringify(result, null, 2));
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n🔌 Connection closed');
  }
}

debugWithBridge().catch(console.error);