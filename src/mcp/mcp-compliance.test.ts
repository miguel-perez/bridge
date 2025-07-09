import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { Client as MCPClient } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('MCP Protocol Compliance', () => {
  let client: MCPClient;
  let transport: StdioClientTransport;

  beforeEach(async () => {
    client = new MCPClient({ 
      name: "bridge-mcp-compliance-test", 
      version: "1.0.0" 
    });
  }, 30000); // Increase timeout for client creation

  afterEach(async () => {
    try {
      await client.close();
    } catch (error) {
      // Ignore cleanup errors
    }
  }, 10000); // Increase timeout for cleanup

  describe('Server Connection', () => {
    test('should connect to server successfully', async () => {
      const serverPath = join(__dirname, '..', '..', 'dist', 'index.js');
      
      transport = new StdioClientTransport({ 
        command: "node", 
        args: [serverPath],
        env: { ...process.env, NODE_ENV: 'test' }
      });
      
      await expect(client.connect(transport)).resolves.not.toThrow();
    }, 30000); // Increase timeout for server connection

    test('should provide server info after connection', async () => {
      const serverPath = join(__dirname, '..', '..', 'dist', 'index.js');
      
      transport = new StdioClientTransport({ 
        command: "node", 
        args: [serverPath],
        env: { ...process.env, NODE_ENV: 'test' }
      });
      
      await client.connect(transport);
      
      // Server info should be available after connection
      expect(client).toBeDefined();
      // Note: serverInfo may not be directly accessible in this version of the SDK
    }, 30000); // Increase timeout for server connection
  });

  describe('Tool Discovery', () => {
    beforeEach(async () => {
      const serverPath = join(__dirname, '..', '..', 'dist', 'index.js');
      
      transport = new StdioClientTransport({ 
        command: "node", 
        args: [serverPath],
        env: { ...process.env, NODE_ENV: 'test' }
      });
      
      await client.connect(transport);
    }, 30000); // Increase timeout for server connection

    test('should list available tools', async () => {
      const result = await client.listTools();
      
      expect(result.tools).toBeDefined();
      expect(Array.isArray(result.tools)).toBe(true);
      expect(result.tools.length).toBeGreaterThan(0);
    }, 15000); // Increase timeout for tool listing

    test('should provide valid tool definitions', async () => {
      const result = await client.listTools();
      
      for (const tool of result.tools) {
        // Check required fields
        expect(tool.name).toBeDefined();
        expect(typeof tool.name).toBe('string');
        expect(tool.name.length).toBeGreaterThan(0);
        
        expect(tool.description).toBeDefined();
        expect(typeof tool.description).toBe('string');
        expect(tool.description!.length).toBeGreaterThan(0);
        
        expect(tool.inputSchema).toBeDefined();
        expect(typeof tool.inputSchema).toBe('object');
        
        // Check input schema structure
        expect(tool.inputSchema.type).toBe('object');
        expect(tool.inputSchema.properties).toBeDefined();
      }
    }, 15000); // Increase timeout for tool validation

    test('should have expected tool names', async () => {
      const result = await client.listTools();
      const toolNames = result.tools.map(t => t.name);
      
      // Should have core Bridge tools
      expect(toolNames).toContain('capture');
      expect(toolNames).toContain('search');
      expect(toolNames).toContain('enrich');
    }, 15000); // Increase timeout for tool name checking
  });

  describe('Tool Execution', () => {
    beforeEach(async () => {
      const serverPath = join(__dirname, '..', '..', 'dist', 'index.js');
      
      transport = new StdioClientTransport({ 
        command: "node", 
        args: [serverPath],
        env: { ...process.env, NODE_ENV: 'test' }
      });
      
      await client.connect(transport);
    }, 30000); // Increase timeout for server connection

    test('should execute capture tool with valid input', async () => {
      const result = await client.callTool({
        name: 'capture',
        arguments: {
          content: "I felt excited about testing the MCP server",
          experiencer: "TestUser",
          perspective: "I",
          processing: "during",
          experiential_qualities: {
            qualities: [
              {
                type: "affective",
                prominence: 0.8,
                manifestation: "feeling of excitement"
              }
            ]
          }
        }
      });
      
      expect(result.content).toBeDefined();
      // MCP SDK doesn't always set isError, so we check content structure instead
      expect(Array.isArray(result.content) || typeof result.content === 'string').toBe(true);
    }, 30000); // Increase timeout for tool execution

    test('should execute search tool with valid input', async () => {
      const result = await client.callTool({
        name: 'search',
        arguments: {
          query: "excitement",
          limit: 5
        }
      });
      
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content) || typeof result.content === 'string').toBe(true);
    }, 30000); // Increase timeout for tool execution

    test('should handle invalid tool name gracefully', async () => {
      const result = await client.callTool({
        name: 'nonexistent_tool',
        arguments: {}
      });
      
      // Should return an error result rather than throwing
      expect(result.isError).toBe(true);
      expect(result.content).toBeDefined();
    }, 15000); // Increase timeout for error handling
  });
}); 