/**
 * Tests for DXT manifest generation and validation
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { getTools } from './tools.js';

describe('DXT Manifest', () => {
  const manifestPath = join(process.cwd(), 'manifest.json');
  let manifest: any;

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
      expect(manifest.dxt_version).toBeDefined();
      expect(manifest.name).toBeDefined();
      expect(manifest.version).toBeDefined();
      expect(manifest.description).toBeDefined();
      expect(manifest.author).toBeDefined();
      expect(manifest.author.name).toBeDefined();
      expect(manifest.server).toBeDefined();
      expect(manifest.server.type).toBeDefined();
      expect(manifest.server.entry_point).toBeDefined();
      expect(manifest.server.mcp_config).toBeDefined();
    });

    test('should have valid dxt_version', () => {
      expect(manifest.dxt_version).toBe('0.1');
    });

    test('should have valid server configuration', () => {
      expect(manifest.server.type).toBe('node');
      expect(manifest.server.entry_point).toBe('dist/index.js');
      expect(manifest.server.mcp_config.command).toBe('node');
      expect(manifest.server.mcp_config.args).toContain('${__dirname}/dist/index.js');
      expect(manifest.server.mcp_config.env).toBeDefined();
    });

    test('should have valid tools array', () => {
      expect(Array.isArray(manifest.tools)).toBe(true);
      expect(manifest.tools.length).toBeGreaterThan(0);

      manifest.tools.forEach((tool: any) => {
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(typeof tool.name).toBe('string');
        expect(typeof tool.description).toBe('string');
      });
    });

    test('should have tools_generated flag', () => {
      expect(manifest.tools_generated).toBe(true);
    });

    test('should have valid compatibility', () => {
      expect(manifest.compatibility).toBeDefined();
      expect(manifest.compatibility.platforms).toContain('darwin');
      expect(manifest.compatibility.platforms).toContain('win32');
      expect(manifest.compatibility.platforms).toContain('linux');
      expect(manifest.compatibility.runtimes.node).toBe('>=18.0.0');
    });

    test('should have user_config with proper structure', () => {
      expect(manifest.user_config).toBeDefined();

      // Check key config options
      expect(manifest.user_config.data_file_path).toBeDefined();
      expect(manifest.user_config.data_file_path.type).toBe('string');
      expect(manifest.user_config.data_file_path.required).toBe(false);

      expect(manifest.user_config.embedding_provider).toBeDefined();
      expect(manifest.user_config.embedding_provider.enum).toContain('default');
      // No default value - auto-detection based on API key

      // Check secret fields are marked correctly
      expect(manifest.user_config.openai_api_key.secret).toBe(true);
    });
  });

  describe('tool synchronization', () => {
    test('manifest tools should match implementation', async () => {
      const implementedTools = await getTools();

      expect(manifest.tools.length).toBe(implementedTools.length);

      const manifestToolNames = manifest.tools.map((t: any) => t.name).sort();
      const implementedToolNames = implementedTools.map((t: any) => t.name).sort();

      expect(manifestToolNames).toEqual(implementedToolNames);
    });

    test('manifest should only contain experience and reconsider tools', () => {
      const toolNames = manifest.tools.map((t: any) => t.name);

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
      const env = manifest.server.mcp_config.env;

      expect(env.BRIDGE_FILE_PATH).toBe('${user_config.data_file_path}');
      expect(env.BRIDGE_DEBUG).toBe('${user_config.debug_mode}');
      expect(env.BRIDGE_EMBEDDING_PROVIDER).toBe('${user_config.embedding_provider}');
      expect(env.OPENAI_API_KEY).toBe('${user_config.openai_api_key}');
    });
  });

  describe('metadata quality', () => {
    test('should have meaningful descriptions', () => {
      expect(manifest.description.length).toBeGreaterThan(20);
      expect(manifest.long_description.length).toBeGreaterThan(100);

      manifest.tools.forEach((tool: any) => {
        expect(tool.description.length).toBeGreaterThan(20);
        expect(tool.description).not.toContain('TODO');
        expect(tool.description).not.toContain('FIXME');
      });
    });

    test('should have valid URLs', () => {
      if (manifest.homepage) {
        expect(manifest.homepage).toMatch(/^https?:\/\//);
      }
      if (manifest.documentation) {
        expect(manifest.documentation).toMatch(/^https?:\/\//);
      }
      if (manifest.support) {
        expect(manifest.support).toMatch(/^https?:\/\//);
      }
    });

    test('should have relevant keywords', () => {
      expect(Array.isArray(manifest.keywords)).toBe(true);
      expect(manifest.keywords.length).toBeGreaterThan(3);
      expect(manifest.keywords).toContain('mcp');
    });
  });
});
