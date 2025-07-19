#!/usr/bin/env tsx
/**
 * Simple MCP Connection Test
 * Tests basic MCP server connectivity
 */

import { Client as MCPClient } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { join } from 'path';
import { existsSync } from 'fs';

async function testMCPConnection() {
  console.log('🔍 Testing MCP Server Connection...\n');
  
  const serverPath = join(process.cwd(), 'dist', 'index.js');
  console.log(`📁 Server path: ${serverPath}`);
  console.log(`✅ Server exists: ${existsSync(serverPath)}\n`);
  
  if (!existsSync(serverPath)) {
    console.error('❌ Server file not found!');
    return;
  }

  const client = new MCPClient({
    name: "mcp-test-client",
    version: "1.0.0",
  }, {
    capabilities: {}
  });

  const transport = new StdioClientTransport({
    command: "node",
    args: [serverPath]
  });

  try {
    console.log('🔌 Connecting to MCP server...');
    await client.connect(transport);
    console.log('✅ Connected successfully!\n');
    
    console.log('📋 Listing available tools...');
    const tools = await client.listTools();
    console.log(`Found ${tools.tools.length} tools:`);
    tools.tools.forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.description?.substring(0, 50)}...`);
    });
    
    console.log('\n🧪 Testing experience tool...');
    const result = await client.callTool({
      name: 'experience',
      arguments: {
        source: 'Test connection successful',
        experiencer: 'Test Client',
        experience: ['embodied.thinking']
      }
    });
    console.log('✅ Tool call successful!');
    console.log('Result:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Connection failed:', error);
  } finally {
    await client.close();
    console.log('\n🔌 Connection closed');
  }
}

testMCPConnection().catch(console.error);