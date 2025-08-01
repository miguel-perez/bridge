/**
 * MCP Server Tests for Bridge
 *
 * Tests MCP protocol compliance, request handlers, and server functionality.
 * These tests would have caught the missing initialize handler issue.
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
      name: 'bridge-mcp-test',
      version: '1.0.0',
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
        command: 'node',
        args: [distPath],
        env: {
          ...process.env,
          NODE_ENV: 'test',
          BRIDGE_FILE_PATH: join(tempDir, 'bridge.json'),
        },
      });

      await client.connect(transport);

      // This would have failed without the initialize handler
      const tools = await client.listTools();
      expect(tools.tools).toHaveLength(2); // experience, reconsider

      const toolNames = tools.tools.map((t) => t.name);
      expect(toolNames).toContain('experience');
      expect(toolNames).toContain('reconsider');

      // Verify tool annotations are present
      const experienceTool = tools.tools.find((t) => t.name === 'experience');
      expect(experienceTool).toBeDefined();
      expect(experienceTool?.readOnlyHint).toBe(false);
      expect(experienceTool?.destructiveHint).toBe(false);

      const reconsiderTool = tools.tools.find((t) => t.name === 'reconsider');
      expect(reconsiderTool).toBeDefined();
    }, 30000);

    test('should execute experience tool with experiential qualities', async () => {
      transport = new StdioClientTransport({
        command: 'node',
        args: [distPath],
        env: {
          ...process.env,
          NODE_ENV: 'test',
          BRIDGE_FILE_PATH: join(tempDir, 'bridge.json'),
        },
      });

      await client.connect(transport);

      const result = await client.callTool({
        name: 'experience',
        arguments: {
          experiences: [{
            anchor: '🌲',
            embodied: 'walking slowly, feeling the earth beneath my feet',
            focus: 'on the sunlight filtering through leaves',
            mood: 'deep sense of peace washing over me',
            purpose: 'just being present in nature',
            space: 'surrounded by ancient trees',
            time: 'timeless moment in the forest',
            presence: 'feeling connected to everything',
            who: ['Test User', 'Claude'],
            citation: 'I felt a deep sense of peace while walking in the forest'
          }]
        },
      });

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
    }, 30000);

    test('should handle reconsider tool', async () => {
      transport = new StdioClientTransport({
        command: 'node',
        args: [distPath],
        env: {
          ...process.env,
          NODE_ENV: 'test',
          BRIDGE_FILE_PATH: join(tempDir, 'bridge.json'),
        },
      });

      await client.connect(transport);

      const result = await client.callTool({
        name: 'reconsider',
        arguments: {
          reconsiderations: [{
            id: 'test-id-123',
            source: 'Updated test content',
            who: ['Test User', 'Claude']
          }]
        },
      });

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
    }, 30000);
  });

  describe('Error Handling Tests', () => {
    test('should handle malformed tool arguments gracefully', async () => {
      transport = new StdioClientTransport({
        command: 'node',
        args: [distPath],
        env: {
          ...process.env,
          NODE_ENV: 'test',
          BRIDGE_FILE_PATH: join(tempDir, 'bridge.json'),
        },
      });

      await client.connect(transport);

      const result = await client.callTool({
        name: 'experience',
        arguments: {
          experiences: [
            {
              // Missing required fields
              anchor: '😕',
              who: ['Test User', 'Claude']
              // Missing all quality fields
            },
          ],
        },
      });

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      // Should return an error response
      expect((result.content as Array<{ text: string }>)[0].text).toContain(
        'Error'
      );
    }, 30000);

    // Removed perspective test - field no longer exists

    test('should handle unknown tool gracefully', async () => {
      transport = new StdioClientTransport({
        command: 'node',
        args: [distPath],
        env: {
          ...process.env,
          NODE_ENV: 'test',
          BRIDGE_FILE_PATH: join(tempDir, 'bridge.json'),
        },
      });

      await client.connect(transport);

      const result = await client.callTool({
        name: 'nonexistent_tool',
        arguments: {},
      });

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect((result.content as Array<{ text: string }>)[0].text).toContain('Unknown tool');
    }, 30000);
  });

  describe('Protocol Compliance Tests', () => {
    test('should establish connection and respond to initialize', async () => {
      transport = new StdioClientTransport({
        command: 'node',
        args: [distPath],
        env: {
          ...process.env,
          NODE_ENV: 'test',
          BRIDGE_FILE_PATH: join(tempDir, 'bridge.json'),
        },
      });

      // This test specifically checks that the initialize handler works
      await expect(client.connect(transport)).resolves.not.toThrow();

      // If we get here, the initialize handshake was successful
      expect(client).toBeDefined();
    }, 30000);

    test('should provide correct tool descriptions', async () => {
      transport = new StdioClientTransport({
        command: 'node',
        args: [distPath],
        env: {
          ...process.env,
          NODE_ENV: 'test',
          BRIDGE_FILE_PATH: join(tempDir, 'bridge.json'),
        },
      });

      await client.connect(transport);

      const tools = await client.listTools();

      // Check that tools have proper descriptions
      const experienceTool = tools.tools.find((t) => t.name === 'experience');
      expect(experienceTool).toBeDefined();
      expect(experienceTool?.description).toBeDefined();
      expect(experienceTool?.description?.length).toBeGreaterThan(0);
    }, 30000);
  });
});
