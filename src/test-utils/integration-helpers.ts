/**
 * Integration test helpers for Bridge
 *
 * Provides utilities for creating isolated test environments with real MCP client/server communication
 */

import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

/**
 * Test environment for integration tests
 */
export interface TestEnvironment {
  tempDir: string;
  client: Client;
  transport: StdioClientTransport;
  cleanup: () => Promise<void>;
}

/**
 * Creates an isolated test environment with real MCP client/server
 */
export async function createTestEnvironment(): Promise<TestEnvironment> {
  // Create temporary directory for test data
  const tempDir = mkdtempSync(join(tmpdir(), 'bridge-integration-'));
  const dataPath = join(tempDir, 'experiences.json');

  // Get the path to the compiled server
  const projectRoot = process.cwd();
  const serverPath = join(projectRoot, 'dist', 'index.js');

  // Create MCP client
  const client = new Client({
    name: 'bridge-integration-test',
    version: '1.0.0',
  });

  // Create transport with test environment
  const transport = new StdioClientTransport({
    command: 'node',
    args: [serverPath],
    env: {
      ...process.env,
      NODE_ENV: 'test',
      BRIDGE_FILE_PATH: dataPath,
      TEST_DISABLE_EMBEDDINGS: 'true', // Use test mode for embeddings
    },
  });

  // Connect client to server
  await client.connect(transport);

  // Cleanup function
  const cleanup = async (): Promise<void> => {
    try {
      await client.close();
    } catch (error) {
      // Ignore close errors
    }

    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  };

  return {
    tempDir,
    client,
    transport,
    cleanup,
  };
}

/**
 * Creates test data for integration tests
 */
export function createTestExperiences(): Array<{
  source: string;
  emoji: string;
  experience: string[];
  who: string;
  perspective: 'I' | 'we';
  processing: 'during' | 'right-after' | 'long-after';
}> {
  return [
    {
      source: 'Feeling anxious about the upcoming presentation',
      emoji: '😰',
      experience: ['embodied.sensing', 'mood.closed', 'time.future'],
      who: 'Test Human',
      perspective: 'I' as const,
      processing: 'during' as const,
    },
    {
      source: 'The code finally compiled after hours of debugging!',
      emoji: '🎉',
      experience: ['embodied.thinking', 'mood.open', 'purpose.goal'],
      who: 'Test Human',
      perspective: 'I' as const,
      processing: 'right-after' as const,
    },
    {
      source: 'We figured out the solution together',
      emoji: '🤝',
      experience: ['presence.collective', 'mood.open', 'purpose.goal'],
      who: 'Test Team',
      perspective: 'we' as const,
      processing: 'during' as const,
    },
    {
      source: 'Exploring different approaches without a clear direction',
      emoji: '🔍',
      experience: ['purpose.wander', 'focus.broad', 'mood.open'],
      who: 'Test Human',
      perspective: 'I' as const,
      processing: 'during' as const,
    },
  ];
}

/**
 * Runs a test in an isolated environment
 */
export async function withTestEnvironment(
  testFn: (env: TestEnvironment) => Promise<void>
): Promise<void> {
  const env = await createTestEnvironment();
  try {
    await testFn(env);
  } finally {
    await env.cleanup();
  }
}

/**
 * Helper to wait for async operations
 */
export function waitFor(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Helper to call the experience tool via MCP
 */
export async function callExperience(
  client: Client,
  params: {
    source: string;
    emoji: string;
    experience: string[];
    who?: string;
    perspective?: string;
    processing?: string;
    context?: string;
    crafted?: boolean;
    reflects?: string[];
    recall?: {
      query?: string;
      ids?: string | string[];
      limit?: number;
      offset?: number;
      qualities?: Record<string, unknown>;
      who?: string;
      crafted?: boolean;
      processing?: string;
      created?: string | { start: string; end: string };
      perspective?: string;
      reflects?: 'only';
      reflected_by?: string | string[];
      group_by?: 'similarity' | 'who' | 'date' | 'qualities' | 'perspective' | 'none';
      sort?: 'relevance' | 'created';
    };
    nextMoment?: string[];
  }
): Promise<any> {
  // Extract recall and nextMoment from params
  const { recall, nextMoment, ...experienceParams } = params;

  return await client.callTool({
    name: 'experience',
    arguments: {
      experiences: [
        {
          ...experienceParams,
          ...(nextMoment ? { nextMoment } : {}),
        },
      ],
      ...(recall ? { recall } : {}),
    },
  });
}

/**
 * Helper to call the reconsider tool via MCP
 */
export async function callReconsider(
  client: Client,
  params: {
    id: string;
    source?: string;
    experience?: string[];
    who?: string;
    perspective?: string;
    processing?: string;
    context?: string;
    crafted?: boolean;
    reflects?: string[];
    release?: boolean;
    reason?: string;
  }
): Promise<any> {
  return await client.callTool({
    name: 'reconsider',
    arguments: {
      reconsiderations: [params], // Bridge requires array format
    },
  });
}

/**
 * Helper to verify tool response contains expected content
 */
export function verifyToolResponse(result: any, expectedContent: string): boolean {
  if (!result?.content || !Array.isArray(result.content)) {
    return false;
  }

  return result.content.some(
    (item: any) => item.type === 'text' && item.text.includes(expectedContent)
  );
}

/**
 * Helper to extract experience ID from tool response
 */
export function extractExperienceId(result: any): string | null {
  if (!result?.content || !Array.isArray(result.content)) {
    return null;
  }

  for (const item of result.content) {
    if (item.type === 'text') {
      // Extract ID from response like "📝 ID: exp_abc123"
      const match = item.text.match(/📝 ID: (exp_[a-zA-Z0-9-]+)/);
      if (match) {
        return match[1];
      }
    }
  }

  return null;
}
