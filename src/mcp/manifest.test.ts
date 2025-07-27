/**
 * Tests for DXT manifest generation and validation
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { getTools } from './tools.js';

describe('DXT Manifest', () => {
  const manifestPath = join(process.cwd(), 'manifest.json');
  let manifest: unknown;

  beforeAll(() => {
    // Load manifest directly (no generation needed - we maintain it manually)
    if (!existsSync(manifestPath)) {
      throw new Error(
        'manifest.json not found. Please ensure manifest.json exists in project root.'
      );
    }

    const manifestContent = readFileSync(manifestPath, 'utf-8');
    manifest = JSON.parse(manifestContent);
  });

  describe('manifest.json structure', () => {
    test('should have all required fields', () => {
      // Required fields per DXT spec
      expect((manifest as unknown as { dxt_version: unknown }).dxt_version).toBeDefined();
      expect((manifest as unknown as { name: unknown }).name).toBeDefined();
      expect((manifest as unknown as { version: unknown }).version).toBeDefined();
      expect((manifest as unknown as { description: unknown }).description).toBeDefined();
      expect((manifest as unknown as { author: { name: unknown } }).author).toBeDefined();
      expect((manifest as unknown as { author: { name: unknown } }).author.name).toBeDefined();
      expect((manifest as unknown as { server: unknown }).server).toBeDefined();
      expect((manifest as unknown as { server: { type: unknown } }).server.type).toBeDefined();
      expect((manifest as unknown as { server: { entry_point: unknown } }).server.entry_point).toBeDefined();
      expect((manifest as unknown as { server: { mcp_config: unknown } }).server.mcp_config).toBeDefined();
    });

    test('should have valid dxt_version', () => {
      expect((manifest as unknown as { dxt_version: string }).dxt_version).toBe('0.1');
    });

    test('should have valid server configuration', () => {
      expect((manifest as unknown as { server: { type: string } }).server.type).toBe('node');
      expect((manifest as unknown as { server: { entry_point: string } }).server.entry_point).toBe('dist/index.js');
      expect((manifest as unknown as { server: { mcp_config: { command: string } } }).server.mcp_config.command).toBe('node');
      expect((manifest as unknown as { server: { mcp_config: { args: string[] } } }).server.mcp_config.args).toContain('${__dirname}/dist/index.js');
      expect((manifest as unknown as { server: { mcp_config: { env: unknown } } }).server.mcp_config.env).toBeDefined();
    });

    test('should have valid tools array', () => {
      expect(Array.isArray((manifest as unknown as { tools: unknown[] }).tools)).toBe(true);
      expect((manifest as unknown as { tools: unknown[] }).tools.length).toBeGreaterThan(0);

      ((manifest as unknown as { tools: Array<{ name: string; description: string }> }).tools).forEach((tool) => {
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(typeof tool.name).toBe('string');
        expect(typeof tool.description).toBe('string');
      });
    });

    test('should have tools_generated flag', () => {
      expect((manifest as unknown as { tools_generated: boolean }).tools_generated).toBe(true);
    });

    test('should have valid compatibility', () => {
      expect((manifest as unknown as { compatibility: unknown }).compatibility).toBeDefined();
      expect((manifest as unknown as { compatibility: { platforms: string[] } }).compatibility.platforms).toContain('darwin');
      expect((manifest as unknown as { compatibility: { platforms: string[] } }).compatibility.platforms).toContain('win32');
      expect((manifest as unknown as { compatibility: { platforms: string[] } }).compatibility.platforms).toContain('linux');
      expect((manifest as unknown as { compatibility: { runtimes: { node: string } } }).compatibility.runtimes.node).toBe('>=18.0.0');
    });

    test('should have user_config with proper structure', () => {
      expect((manifest as unknown as { user_config: unknown }).user_config).toBeDefined();

      // Check key config options
      expect((manifest as unknown as { user_config: { data_file_path: { type: string; required: boolean } } }).user_config.data_file_path).toBeDefined();
      expect((manifest as unknown as { user_config: { data_file_path: { type: string; required: boolean } } }).user_config.data_file_path.type).toBe('string');
      expect((manifest as unknown as { user_config: { data_file_path: { type: string; required: boolean } } }).user_config.data_file_path.required).toBe(false);

      expect((manifest as unknown as { user_config: { embedding_provider: { enum: string[] } } }).user_config.embedding_provider).toBeDefined();
      expect((manifest as unknown as { user_config: { embedding_provider: { enum: string[] } } }).user_config.embedding_provider.enum).toContain('none');
      // No default value - auto-detection based on API key

      // Check secret fields are marked correctly
      expect((manifest as unknown as { user_config: { openai_api_key: { secret: boolean } } }).user_config.openai_api_key.secret).toBe(true);
    });
  });

  describe('tool synchronization', () => {
    test('manifest tools should match implementation', async () => {
      const implementedTools = await getTools();

      expect((manifest as unknown as { tools: unknown[] }).tools.length).toBe(implementedTools.length);

      const manifestToolNames = ((manifest as unknown as { tools: Array<{ name: string }> }).tools).map((t) => t.name).sort();
      const implementedToolNames = implementedTools.map((t) => t.name).sort();

      expect(manifestToolNames).toEqual(implementedToolNames);
    });

    test('manifest should only contain experience and reconsider tools', () => {
      const toolNames = ((manifest as unknown as { tools: Array<{ name: string }> }).tools).map((t) => t.name);

      expect(toolNames).toContain('experience');
      expect(toolNames).toContain('reconsider');
      expect(toolNames.length).toBe(2);
    });
  });

  describe('icon existence', () => {
    test('icon.png should exist', () => {
      const iconPath = join(process.cwd(), 'icon.png');
      expect(existsSync(iconPath)).toBe(true);
    });
  });

  describe('environment variable mapping', () => {
    test('should map all user_config to env correctly', () => {
      const env = ((manifest as unknown as { server: { mcp_config: { env: Record<string, string> } } }).server.mcp_config).env;

      expect(env.BRIDGE_FILE_PATH).toBe('${user_config.data_file_path}');
      expect(env.BRIDGE_DEBUG).toBe('${user_config.debug_mode}');
      expect(env.BRIDGE_EMBEDDING_PROVIDER).toBe('${user_config.embedding_provider}');
      expect(env.OPENAI_API_KEY).toBe('${user_config.openai_api_key}');
    });
  });

  describe('metadata quality', () => {
    test('should have meaningful descriptions', () => {
      expect((manifest as unknown as { description: string }).description.length).toBeGreaterThan(20);
      expect((manifest as unknown as { long_description: string }).long_description.length).toBeGreaterThan(100);

      ((manifest as unknown as { tools: Array<{ description: string }> }).tools).forEach((tool) => {
        expect(tool.description.length).toBeGreaterThan(20);
        expect(tool.description).not.toContain('TODO');
        expect(tool.description).not.toContain('FIXME');
      });
    });

    test('should have valid URLs', () => {
      if ((manifest as unknown as { homepage?: string }).homepage) {
        expect((manifest as unknown as { homepage: string }).homepage).toMatch(/^https?:\/\//);
      }
      if ((manifest as unknown as { documentation?: string }).documentation) {
        expect((manifest as unknown as { documentation: string }).documentation).toMatch(/^https?:\/\//);
      }
      if ((manifest as unknown as { support?: string }).support) {
        expect((manifest as unknown as { support: string }).support).toMatch(/^https?:\/\//);
      }
    });

    test('should have relevant keywords', () => {
      expect(Array.isArray((manifest as unknown as { keywords: string[] }).keywords)).toBe(true);
      expect((manifest as unknown as { keywords: string[] }).keywords.length).toBeGreaterThan(3);
      expect((manifest as unknown as { keywords: string[] }).keywords).toContain('mcp');
    });
  });
});
