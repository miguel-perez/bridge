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
import { convertArrayToSwitchboard, humanQualities, aiQualities } from './format-converter.js';
import { randomUUID } from 'crypto';
import type { ExperienceQualities } from '../core/types.js';

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
  // Create temporary directory for test data with unique identifier
  const testId = randomUUID().slice(0, 8);
  const tempDir = mkdtempSync(join(tmpdir(), `bridge-integration-${testId}-`));
  const dataPath = join(tempDir, 'experiences.json');

  // Get the path to the compiled server
  const projectRoot = process.cwd();
  const serverPath = join(projectRoot, 'dist', 'index.js');

  // Create MCP client with unique name
  const client = new Client({
    name: `bridge-integration-test-${testId}`,
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
      BRIDGE_TEST_ID: testId, // Add unique test identifier
    },
  });

  // Connect client to server with retry logic
  let retries = 3;
  while (retries > 0) {
    try {
      await client.connect(transport);
      break;
    } catch (error) {
      retries--;
      if (retries === 0) {
        throw error;
      }
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

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
  experienceQualities: Record<string, string | boolean>;
  who: string;
  perspective: 'I' | 'we';
  processing: 'during' | 'right-after' | 'long-after';
}> {
  return [
    {
      source: 'Feeling anxious about the upcoming presentation',
      emoji: '😰',
      experienceQualities: {
        embodied: 'sensing' as const,
        focus: false as const,
        mood: 'closed' as const,
        purpose: false as const,
        space: false as const,
        time: 'future' as const,
        presence: false as const
      },
      who: 'Test Human',
      perspective: 'I' as const,
      processing: 'during' as const,
    },
    {
      source: 'The code finally compiled after hours of debugging!',
      emoji: '🎉',
      experienceQualities: {
        embodied: 'thinking' as const,
        focus: false as const,
        mood: 'open' as const,
        purpose: 'goal' as const,
        space: false as const,
        time: false as const,
        presence: false as const
      },
      who: 'Test Human',
      perspective: 'I' as const,
      processing: 'right-after' as const,
    },
    {
      source: 'We figured out the solution together',
      emoji: '🤝',
      experienceQualities: {
        embodied: false as const,
        focus: false as const,
        mood: 'open' as const,
        purpose: 'goal' as const,
        space: false as const,
        time: false as const,
        presence: 'collective' as const
      },
      who: 'Test Team',
      perspective: 'we' as const,
      processing: 'during' as const,
    },
    {
      source: 'Exploring different approaches without a clear direction',
      emoji: '🔍',
      experienceQualities: {
        embodied: false as const,
        focus: 'broad' as const,
        mood: 'open' as const,
        purpose: 'wander' as const,
        space: false as const,
        time: false as const,
        presence: false as const
      },
      who: 'Test Human',
      perspective: 'I' as const,
      processing: 'during' as const,
    },
  ];
}

/**
 * Helper to reset any shared state between tests
 */
export async function resetSharedState(): Promise<void> {
  // Clear any global caches or state that might persist between tests
  if (typeof global !== 'undefined') {
    // Clear any global variables that might be set
    delete (global as unknown as Record<string, unknown>).updateActivity;
  }
  
  // Clear any module-level caches
  const modules = [
    '../services/embeddings.js',
    '../services/embedding-providers/provider-factory.js',
    '../core/storage.js'
  ];
  
  for (const modulePath of modules) {
    try {
      const module = await import(modulePath);
      if (module.embeddingService && typeof (module.embeddingService as unknown as { clearCache?: () => void })?.clearCache === 'function') {
        (module.embeddingService as unknown as { clearCache?: () => void }).clearCache?.();
      }
    } catch (error) {
      // Ignore import errors - modules might not exist or might not have caches
    }
  }
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
}

/**
 * Runs a test in an isolated environment with better isolation
 */
export async function withTestEnvironment(
  testFn: (env: TestEnvironment) => Promise<void>
): Promise<void> {
  // Reset shared state before test
  await resetSharedState();
  
  const env = await createTestEnvironment();
  try {
    // Add a small delay to ensure previous test cleanup is complete
    await new Promise(resolve => setTimeout(resolve, 50));
    
    await testFn(env);
  } finally {
    await env.cleanup();
    // Add a small delay after cleanup to ensure resources are released
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Reset shared state after test
    await resetSharedState();
  }
}

/**
 * Runs a test in an isolated environment with additional isolation measures
 */
export async function withIsolatedTestEnvironment(
  testFn: (env: TestEnvironment) => Promise<void>
): Promise<void> {
  // Reset shared state before test
  await resetSharedState();
  
  const env = await createTestEnvironment();
  try {
    // Add longer delay for tests that need more isolation
    await new Promise(resolve => setTimeout(resolve, 100));
    
    await testFn(env);
  } finally {
    await env.cleanup();
    // Add longer delay after cleanup
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Reset shared state after test
    await resetSharedState();
  }
}

/**
 * Helper to wait for async operations
 */
export function waitFor(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Helper to call the experience tool via MCP with retry logic
 */
export async function callExperience(
  client: Client,
  params: {
    source: string;
    emoji: string;
    experienceQualities: ExperienceQualities | Record<string, string | boolean | false>;
    who?: string;
    perspective?: string;
    processing?: string;
    context?: string;
    reflects?: string[];
    recall?: {
      query?: string;
      ids?: string | string[];
      limit?: number;
      offset?: number;
      qualities?: Record<string, unknown>;
      who?: string;
        processing?: string;
      created?: string | { start: string; end: string };
      perspective?: string;
      reflects?: 'only';
      reflected_by?: string | string[];
      group_by?: 'similarity' | 'who' | 'date' | 'qualities' | 'perspective' | 'none';
      sort?: 'relevance' | 'created';
    };
    nextMoment?: string[] | Record<string, string | boolean>;
  }
): Promise<unknown> {
  // Extract recall and nextMoment from params
  const { recall, nextMoment, ...experienceParams } = params;

  // Add retry logic for flaky operations
  let retries = 3;
  while (retries > 0) {
    try {
      const result = await client.callTool({
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
      return result;
    } catch (error) {
      retries--;
      if (retries === 0) {
        throw error;
      }
      // Wait before retry with exponential backoff
      await new Promise(resolve => setTimeout(resolve, 100 * (3 - retries)));
    }
  }
}

/**
 * Helper to call the reconsider tool via MCP with retry logic
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
    reflects?: string[];
    release?: boolean;
    reason?: string;
  }
): Promise<unknown> {
  // Add retry logic for flaky operations
  let retries = 3;
  while (retries > 0) {
    try {
      const result = await client.callTool({
        name: 'reconsider',
        arguments: {
          reconsiderations: [params], // Bridge requires array format
        },
      });
      return result;
    } catch (error) {
      retries--;
      if (retries === 0) {
        throw error;
      }
      // Wait before retry with exponential backoff
      await new Promise(resolve => setTimeout(resolve, 100 * (3 - retries)));
    }
  }
}

/**
 * Helper to verify tool response contains expected content
 */
export function verifyToolResponse(response: unknown, expectedText: string): boolean {
  const typedResponse = response as { content?: unknown };
  if (!typedResponse || !typedResponse.content) return false;
  
  // Handle both single content and array content
  const contents = Array.isArray(typedResponse.content) ? typedResponse.content : [typedResponse.content];
  
  return contents.some((content: unknown) => {
    if (typeof content === 'string') {
      return content.toLowerCase().includes(expectedText.toLowerCase());
    }
    if (content && typeof (content as { text?: string }).text === 'string') {
      return (content as { text: string }).text.toLowerCase().includes(expectedText.toLowerCase());
    }
    return false;
  });
}

/**
 * Legacy helper to verify tool response contains expected content
 * @param result - Tool response result object
 * @param expectedContent - Expected text content to find
 * @returns True if expected content is found
 */
export function verifyToolResponseOld(result: unknown, expectedContent: string): boolean {
  const typedResult = result as { content?: Array<{ type: string; text: string }> };
  if (!typedResult?.content || !Array.isArray(typedResult.content)) {
    return false;
  }

  return typedResult.content.some(
    (item) => item.type === 'text' && item.text.includes(expectedContent)
  );
}

/**
 * Helper to extract experience ID from tool response with better error handling
 */
export function extractExperienceId(result: unknown): string | null {
  const typedResult = result as { content?: Array<{ type: string; text: string }> };
  if (!typedResult?.content || !Array.isArray(typedResult.content)) {
    return null;
  }

  for (const item of typedResult.content) {
    if (item.type === 'text') {
      // Extract ID from response like "📝 ID: exp_abc123" or "📝 ID: exp__abc123"
      const match = item.text.match(/📝 ID: (exp_[a-zA-Z0-9_-]+)/);
      if (match) {
        return match[1];
      }
    }
  }

  return null;
}

/**
 * Helper to wait for a condition with timeout and retry logic
 */
export async function waitForCondition(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Helper to verify tool response with retry logic
 */
export async function verifyToolResponseWithRetry(
  response: unknown, 
  expectedText: string, 
  maxRetries: number = 3
): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    if (verifyToolResponse(response, expectedText)) {
      return true;
    }
    if (i < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, 100 * (i + 1)));
    }
  }
  return false;
}

// Export format conversion utilities
export { convertArrayToSwitchboard, humanQualities, aiQualities };
