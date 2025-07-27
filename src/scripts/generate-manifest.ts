#!/usr/bin/env node
/**
 * Generate DXT manifest.json from existing project sources
 *
 * Sources:
 * - package.json for version, description, author, etc.
 * - tools.ts for tool definitions
 * - README.md for long description
 * - Existing manifest for user_config structure
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getTools } from '../mcp/tools.js';
import { errorLog, debugLog } from '../utils/safe-logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..');

interface DXTManifest {
  dxt_version: string;
  name: string;
  display_name: string;
  version: string;
  description: string;
  long_description: string;
  author: {
    name: string;
    email?: string;
    url?: string;
  };
  repository?: {
    type: string;
    url: string;
  };
  homepage?: string;
  documentation?: string;
  support?: string;
  icon?: string;
  server: {
    type: string;
    entry_point: string;
    mcp_config: {
      command: string;
      args: string[];
      env: Record<string, string>;
    };
  };
  tools: Array<{
    name: string;
    description: string;
  }>;
  tools_generated: boolean;
  keywords?: string[];
  license?: string;
  compatibility: {
    platforms: string[];
    runtimes: {
      node: string;
    };
  };
  user_config: Record<string, unknown> | Record<string, {
    type: string;
    title: string;
    description: string;
    default?: unknown;
    required?: boolean;
  }>;
}

/**
 * Generates a DXT manifest.json file from project sources
 * Reads package.json, existing manifest, and tool implementations
 * to create a complete manifest for Claude Desktop integration
 */
async function generateManifest(): Promise<void> {
  debugLog('🔧 Generating manifest.json from project sources...\n');

  // Read package.json
  const packageJsonPath = join(projectRoot, 'package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

  // Read existing manifest for user_config (preserve manual configuration)
  const existingManifestPath = join(projectRoot, 'manifest.json');
  let existingManifest: Partial<DXTManifest> = {};
  if (existsSync(existingManifestPath)) {
    existingManifest = JSON.parse(readFileSync(existingManifestPath, 'utf-8'));
  }

  // Get tools from implementation
  const tools = await getTools();
  debugLog(`📦 Found ${tools.length} tools: ${tools.map((t) => t.name).join(', ')}`);

  // Use a comprehensive long description
  const longDescription = 'Bridge is a Desktop Extension for Claude Desktop that provides seamless integration for phenomenological data capture and analysis. It enables experiential memory and pattern recognition through a sophisticated seven-dimensional quality framework, creating shared consciousness between humans and AI. Bridge tracks embodied states, emotional atmospheres, attentional qualities, and temporal orientations to build rich experiential maps that enhance AI-human collaboration. With features like dual-view organization (Recent Flow + Emerging Patterns), NextMoment target state search, and automatic quality-based clustering, Bridge transforms conversations into lasting experiential knowledge.';

  // Build manifest
  const manifest: DXTManifest = {
    dxt_version: '0.1',
    name: packageJson.name,
    display_name: 'Bridge',
    version: packageJson.version,
    description: packageJson.description,
    long_description: longDescription,
    author: {
      name: existingManifest.author?.name || 'Miguel Angel Perez',
      email: existingManifest.author?.email || 'mail@miguel.design',
      url: existingManifest.author?.url || 'https://github.com/miguel-perez/bridge',
    },
    repository: {
      type: 'git',
      url: existingManifest.repository?.url || 'https://github.com/miguel-perez/bridge',
    },
    homepage: existingManifest.homepage || 'https://github.com/miguel-perez/bridge',
    documentation:
      existingManifest.documentation ||
      'https://github.com/miguel-perez/bridge/blob/main/README.md',
    support: existingManifest.support || 'https://github.com/miguel-perez/bridge/issues',
    icon: 'icon.png',
    server: {
      type: 'node',
      entry_point: 'dist/index.js',
      mcp_config: {
        command: 'node',
        args: ['${__dirname}/dist/index.js'],
        env: {
          BRIDGE_FILE_PATH: '${user_config.data_file_path}',
          OPENAI_API_KEY: '${user_config.openai_api_key}',
          BRIDGE_DEBUG: '${user_config.debug_mode}',
        },
      },
    },
    tools: tools.map((tool) => ({
      name: tool.name as string,
      description: tool.description as string,
    })),
    tools_generated: true,
    keywords: existingManifest.keywords || [
      'experiential-memory',
      'phenomenology',
      'consciousness',
      'embodied-cognition',
      'mcp',
      'ai-collaboration',
      'shared-memory',
      'pattern-recognition',
      'qualitative-data',
    ],
    license: packageJson.license || 'MIT',
    compatibility: {
      platforms: ['darwin', 'win32', 'linux'],
      runtimes: {
        node: '>=18.0.0',
      },
    },
    // User config ordered by priority
    user_config: existingManifest.user_config || {
      data_file_path: {
        type: 'string',
        title: 'Data File Path',
        description: 'Path to Bridge data file. Defaults to Documents/Bridge/experiences.json',
        default: '${DOCUMENTS}/Bridge/experiences.json',
        required: false,
      },
      openai_api_key: {
        type: 'string',
        title: 'OpenAI API Key (Optional)',
        description:
          "API key for OpenAI services. When provided, Bridge uses OpenAI's text-embedding-3-large model for enhanced semantic search. In the future, this may also enable AI-powered features like smart suggestions and pattern analysis.",
        default: '',
        required: false,
        secret: true,
      },
      debug_mode: {
        type: 'boolean',
        title: 'Debug Mode',
        description: 'Enable debug logging for troubleshooting',
        default: false,
        required: false,
      },
    },
  };

  // Add generation notice
  const manifestWithNotice = {
    _comment: "This file is auto-generated by 'npm run generate:manifest'. Do not edit directly.",
    ...manifest,
  };

  // Write manifest
  const outputPath = join(projectRoot, 'manifest.json');
  writeFileSync(outputPath, JSON.stringify(manifestWithNotice, null, 2) + '\n');

  debugLog('\n✅ Generated manifest.json successfully!');
  debugLog(`📄 Output: ${outputPath}`);
  debugLog(`\n📊 Summary:`);
  debugLog(`  - Version: ${manifest.version}`);
  debugLog(
    `  - Tools: ${manifest.tools.length} (${manifest.tools.map((t) => t.name).join(', ')})`
  );
  debugLog(`  - User config options: ${Object.keys(manifest.user_config).length}`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateManifest().catch((error) => {
    errorLog('❌ Error generating manifest:', error);
    process.exit(1);
  });
}

export { generateManifest };
