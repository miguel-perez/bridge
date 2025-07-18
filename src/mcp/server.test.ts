/**
 * MCP Server Tests for Bridge
 * 
 * Tests MCP protocol compliance, request handlers, and server functionality.
 * These tests would have caught the missing initialize handler issue.
 * 
 * @module mcp/server.test
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { join } from 'path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { tmpdir } from 'os';
import { mkdtempSync, rmSync } from 'fs';

// Use process.cwd() to get the project root and build relative paths
const projectRoot = process.cwd();
const distPath = join(projectRoot, 'dist', 'index.js');


describe('MCP Server Protocol Compliance', () => {
  let client: Client;
  let transport: StdioClientTransport;
  let tempDir: string;

  beforeEach(async () => {
    // Create a temporary directory for test data
    tempDir = mkdtempSync(join(tmpdir(), 'bridge-test-'));
    
    client = new Client({ 
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
    
    // Clean up temporary directory
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  }, 10000);

  describe('End-to-End Connection Tests', () => {
    test('should complete full MCP handshake and list tools', async () => {
      
      transport = new StdioClientTransport({ 
        command: "node", 
        args: [distPath],
        env: { 
          ...process.env, 
          NODE_ENV: 'test',
          BRIDGE_FILE_PATH: join(tempDir, 'bridge.json')
        }
      });
      
      await client.connect(transport);
      
      // This would have failed without the initialize handler
      const tools = await client.listTools();
      expect(tools.tools).toHaveLength(4); // remember, release, recall, update
      
      const toolNames = tools.tools.map(t => t.name);
      expect(toolNames).toContain('remember');
      expect(toolNames).toContain('recall');
      expect(toolNames).toContain('release');
      expect(toolNames).toContain('reconsider');
      
      // Verify tool annotations are present
      const rememberTool = tools.tools.find(t => t.name === 'remember');
      expect(rememberTool).toBeDefined();
      expect(rememberTool?.readOnlyHint).toBe(false);
      expect(rememberTool?.destructiveHint).toBe(false);

      const recallTool = tools.tools.find(t => t.name === 'recall');
      expect(recallTool).toBeDefined();
      expect(recallTool?.readOnlyHint).toBe(true);
      expect(recallTool?.destructiveHint).toBe(false);
      
      const reconsiderTool = tools.tools.find(t => t.name === 'reconsider');
      expect(reconsiderTool).toBeDefined();
      
      const releaseTool = tools.tools.find(t => t.name === 'release');
      expect(releaseTool).toBeDefined();
    }, 30000);

    test('should execute remember tool with experiential qualities', async () => {
      
      transport = new StdioClientTransport({ 
        command: "node", 
        args: [distPath],
        env: { 
          ...process.env, 
          NODE_ENV: 'test',
          BRIDGE_FILE_PATH: join(tempDir, 'bridge.json')
        }
      });
      
      await client.connect(transport);
      
      const result = await client.callTool({
        name: 'remember',
        arguments: {
          content: 'I felt a deep sense of peace while walking in the forest',
          experiencer: 'Test User',
          perspective: 'I',
          processing: 'during',
          experiential_qualities: {
            qualities: [
              {
                type: 'affective',
                prominence: 0.8,
                manifestation: 'deep sense of peace'
              }
            ]
          }
        }
      });
      
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
    }, 30000);

    test('should handle recall tool with empty arguments', async () => {
      transport = new StdioClientTransport({ 
        command: "node", 
        args: [distPath],
        env: { 
          ...process.env, 
          NODE_ENV: 'test',
          BRIDGE_FILE_PATH: join(tempDir, 'bridge.json')
        }
      });
      
      await client.connect(transport);
      
      const result = await client.callTool({
        name: 'recall',
        arguments: {}
      });
      
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
    }, 30000);

    test('should handle release tool', async () => {
      transport = new StdioClientTransport({ 
        command: "node", 
        args: [distPath],
        env: { 
          ...process.env, 
          NODE_ENV: 'test',
          BRIDGE_FILE_PATH: join(tempDir, 'bridge.json')
        }
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

    test('should handle reconsider tool', async () => {
      transport = new StdioClientTransport({ 
        command: "node", 
        args: [distPath],
        env: { 
          ...process.env, 
          NODE_ENV: 'test',
          BRIDGE_FILE_PATH: join(tempDir, 'bridge.json')
        }
      });
      
      await client.connect(transport);
      
      const result = await client.callTool({
        name: 'reconsider',
        arguments: {
          id: 'test-id-123',
          source: 'Updated test content'
        }
      });
      
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
    }, 30000);
  });

  describe('Error Handling Tests', () => {
    test('should handle malformed tool arguments gracefully', async () => {
      transport = new StdioClientTransport({ 
        command: "node", 
        args: [distPath],
        env: { 
          ...process.env, 
          NODE_ENV: 'test',
          BRIDGE_FILE_PATH: join(tempDir, 'bridge.json')
        }
      });
      
      await client.connect(transport);
      
      const result = await client.callTool({
        name: 'remember',
        arguments: {
          // Missing required fields
          source: '',
          experiencer: '',
          perspective: 'I',
          processing: 'during'
        }
      });
      
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      // Should return an error response - source is now required
      expect((result.content as any[])[0].text).toContain("Source content is required");
    }, 30000);

    test('should handle invalid perspective values', async () => {
      transport = new StdioClientTransport({ 
        command: "node", 
        args: [distPath],
        env: { 
          ...process.env, 
          NODE_ENV: 'test',
          BRIDGE_FILE_PATH: join(tempDir, 'bridge.json')
        }
      });
      
      await client.connect(transport);
      
      const result = await client.callTool({
        name: 'remember',
        arguments: {
          source: 'Test content',
          experiencer: 'Test User',
          perspective: 'invalid_perspective', // This should fail Zod enum validation
          processing: 'during'
        }
      });
      
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      // Should return an error response for invalid perspective
      expect((result.content as any[])[0].text).toContain('Invalid enum value');
    }, 30000);

    test('should handle unknown tool gracefully', async () => {
      transport = new StdioClientTransport({ 
        command: "node", 
        args: [distPath],
        env: { 
          ...process.env, 
          NODE_ENV: 'test',
          BRIDGE_FILE_PATH: join(tempDir, 'bridge.json')
        }
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
      transport = new StdioClientTransport({ 
        command: "node", 
        args: [distPath],
        env: { 
          ...process.env, 
          NODE_ENV: 'test',
          BRIDGE_FILE_PATH: join(tempDir, 'bridge.json')
        }
      });
      
      // This test specifically checks that the initialize handler works
      await expect(client.connect(transport)).resolves.not.toThrow();
      
      // If we get here, the initialize handshake was successful
      expect(client).toBeDefined();
    }, 30000);

    test('should provide correct tool descriptions', async () => {
      transport = new StdioClientTransport({ 
        command: "node", 
        args: [distPath],
        env: { 
          ...process.env, 
          NODE_ENV: 'test',
          BRIDGE_FILE_PATH: join(tempDir, 'bridge.json')
        }
      });
      
      await client.connect(transport);
      
      const tools = await client.listTools();
      
      // Check that tools have proper descriptions
      const rememberTool = tools.tools.find(t => t.name === 'remember');
      expect(rememberTool).toBeDefined();
      expect(rememberTool?.description).toBeDefined();
      expect(rememberTool?.description?.length).toBeGreaterThan(0);
      
      const recallTool = tools.tools.find(t => t.name === 'recall');
      expect(recallTool).toBeDefined();
      expect(recallTool?.description).toBeDefined();
      expect(recallTool?.description?.length).toBeGreaterThan(0);
    }, 30000);
  });
}); 