/**
 * MCP Server Tests for Bridge
 * 
 * Tests MCP protocol compliance, request handlers, and server functionality.
 * These tests would have caught the missing initialize handler issue.
 * 
 * @module mcp/server.test
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { Client as MCPClient } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { join } from 'path';


describe('MCP Server Protocol Compliance', () => {
  let client: MCPClient;
  let transport: StdioClientTransport;

  beforeEach(async () => {
    client = new MCPClient({ 
      name: "bridge-mcp-test", 
      version: "1.0.0" 
    });
  }, 30000);

  afterEach(async () => {
    try {
      await client.close();
    } catch (error) {
      // Ignore cleanup errors
    }
  }, 10000);

  describe('End-to-End Connection Tests', () => {
    test('should complete full MCP handshake and list tools', async () => {
      const serverPath = join(__dirname, '..', '..', 'dist', 'index.js');
      
      transport = new StdioClientTransport({ 
        command: "node", 
        args: [serverPath],
        env: { ...process.env, NODE_ENV: 'test' }
      });
      
      await client.connect(transport);
      
      // This would have failed without the initialize handler
      const tools = await client.listTools();
      expect(tools.tools).toHaveLength(4); // capture, release, search, update
      
      const toolNames = tools.tools.map(t => t.name);
      expect(toolNames).toContain('capture');
      expect(toolNames).toContain('release');
      expect(toolNames).toContain('search');
      expect(toolNames).toContain('update');
    }, 30000);

    test('should execute capture tool with experiential qualities', async () => {
      const serverPath = join(__dirname, '..', '..', 'dist', 'index.js');
      
      transport = new StdioClientTransport({ 
        command: "node", 
        args: [serverPath],
        env: { ...process.env, NODE_ENV: 'test' }
      });
      
      await client.connect(transport);
      
      const result = await client.callTool({
        name: 'capture',
        arguments: {
          content: 'Test experiential moment',
          experiencer: 'Test User',
          perspective: 'I',
          processing: 'during',
          experiential_qualities: {
            qualities: [
              {
                type: 'embodied',
                prominence: 0.7,
                manifestation: 'tense shoulders'
              },
              {
                type: 'attentional',
                prominence: 0.8,
                manifestation: 'focused on the task'
              }
            ]
          }
        }
      });
      
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect((result.content as any[])[0]).toHaveProperty('type', 'text');
      expect((result.content as any[])[0].text).toContain('Captured experience');
    }, 30000);

    test('should handle search tool with empty arguments', async () => {
      const serverPath = join(__dirname, '..', '..', 'dist', 'index.js');
      
      transport = new StdioClientTransport({ 
        command: "node", 
        args: [serverPath],
        env: { ...process.env, NODE_ENV: 'test' }
      });
      
      await client.connect(transport);
      
      const result = await client.callTool({
        name: 'search',
        arguments: {}
      });
      
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
    }, 30000);

    test('should handle release tool', async () => {
      const serverPath = join(__dirname, '..', '..', 'dist', 'index.js');
      
      transport = new StdioClientTransport({ 
        command: "node", 
        args: [serverPath],
        env: { ...process.env, NODE_ENV: 'test' }
      });
      
      await client.connect(transport);
      
      const result = await client.callTool({
        name: 'release',
        arguments: {
          id: 'test-id-123'
        }
      });
      
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
    }, 30000);

    test('should handle update tool', async () => {
      const serverPath = join(__dirname, '..', '..', 'dist', 'index.js');
      
      transport = new StdioClientTransport({ 
        command: "node", 
        args: [serverPath],
        env: { ...process.env, NODE_ENV: 'test' }
      });
      
      await client.connect(transport);
      
      const result = await client.callTool({
        name: 'update',
        arguments: {
          id: 'test-id-123',
          enrichment_type: 'reflection'
        }
      });
      
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
    }, 30000);
  });

  describe('Error Handling Tests', () => {
    test('should handle malformed tool arguments gracefully', async () => {
      const serverPath = join(__dirname, '..', '..', 'dist', 'index.js');
      
      transport = new StdioClientTransport({ 
        command: "node", 
        args: [serverPath],
        env: { ...process.env, NODE_ENV: 'test' }
      });
      
      await client.connect(transport);
      
      const result = await client.callTool({
        name: 'capture',
        arguments: {
          // Missing required fields
          content: '',
          experiencer: '',
          perspective: 'I',
          processing: 'during',
          experiential_qualities: {
            qualities: []
          }
        }
      });
      
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      // Should return an error response - content validation happens first
      expect((result.content as any[])[0].text).toContain('Content must be provided');
    }, 30000);

    test('should handle invalid perspective values', async () => {
      const serverPath = join(__dirname, '..', '..', 'dist', 'index.js');
      
      transport = new StdioClientTransport({ 
        command: "node", 
        args: [serverPath],
        env: { ...process.env, NODE_ENV: 'test' }
      });
      
      await client.connect(transport);
      
      const result = await client.callTool({
        name: 'capture',
        arguments: {
          content: 'Test content',
          experiencer: 'Test User',
          perspective: 'invalid_perspective', // This should fail Zod enum validation
          processing: 'during',
          experiential_qualities: {
            qualities: [
              {
                type: 'affective',
                prominence: 0.5,
                manifestation: 'test feeling'
              }
            ]
          }
        }
      });
      
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      // Should return an error response for invalid perspective
      expect((result.content as any[])[0].text).toContain('Invalid perspective');
    }, 30000);

    test('should handle unknown tool gracefully', async () => {
      const serverPath = join(__dirname, '..', '..', 'dist', 'index.js');
      
      transport = new StdioClientTransport({ 
        command: "node", 
        args: [serverPath],
        env: { ...process.env, NODE_ENV: 'test' }
      });
      
      await client.connect(transport);
      
      const result = await client.callTool({
        name: 'nonexistent_tool',
        arguments: {}
      });
      
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect((result.content as any[])[0].text).toContain('Unknown tool');
    }, 30000);
  });

  describe('Protocol Compliance Tests', () => {
    test('should establish connection and respond to initialize', async () => {
      const serverPath = join(__dirname, '..', '..', 'dist', 'index.js');
      
      transport = new StdioClientTransport({ 
        command: "node", 
        args: [serverPath],
        env: { ...process.env, NODE_ENV: 'test' }
      });
      
      // This test specifically checks that the initialize handler works
      await expect(client.connect(transport)).resolves.not.toThrow();
      
      // If we get here, the initialize handshake was successful
      expect(client).toBeDefined();
    }, 30000);

    test('should provide correct tool descriptions', async () => {
      const serverPath = join(__dirname, '..', '..', 'dist', 'index.js');
      
      transport = new StdioClientTransport({ 
        command: "node", 
        args: [serverPath],
        env: { ...process.env, NODE_ENV: 'test' }
      });
      
      await client.connect(transport);
      
      const tools = await client.listTools();
      
      // Check that tools have proper descriptions
      const captureTool = tools.tools.find(t => t.name === 'capture');
      expect(captureTool).toBeDefined();
      expect(captureTool?.description).toBeDefined();
      expect(captureTool?.description?.length).toBeGreaterThan(0);
      
      const searchTool = tools.tools.find(t => t.name === 'search');
      expect(searchTool).toBeDefined();
      expect(searchTool?.description).toBeDefined();
      expect(searchTool?.description?.length).toBeGreaterThan(0);
    }, 30000);
  });
}); 