/**
 * MCP Server Implementation for Bridge
 *
 * This module implements the Model Context Protocol (MCP) server for Bridge,
 * providing tools for experiencing and enriching experiential data.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
  InitializeRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { validateConfiguration, getDataFilePath } from '../core/config.js';
import { setStorageConfig } from '../core/storage.js';
import { toolTimeout } from '../utils/unified-timeout.js';
import { embeddingService } from '../services/embeddings.js';
import { mkdirSync } from 'fs';
import { dirname } from 'path';
import { MCPToolHandlers } from './handlers.js';
import { getTools } from './tools.js';
import { debugLog } from '../utils/safe-logger.js';

// ============================================================================
// CONSTANTS
// ============================================================================

const SERVER_NAME = 'bridge';
const SERVER_VERSION = '0.1.0';

// ============================================================================
// MCP LOGGING UTILITIES
// ============================================================================

/**
 * Sends log messages to the MCP client using log/message notifications
 * This is the proper way to log in MCP servers - only use MCP protocol logging
 * @deprecated Use mcpLog from safe-logger.ts instead
 */
function mcpLog(level: 'info' | 'warn' | 'error', message: string, serverInstance?: Server): void {
  if (serverInstance && typeof serverInstance.notification === 'function') {
    serverInstance.notification({
      method: 'log/message',
      params: { level, data: message },
    });
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Recursively parses stringified JSON in arguments
 *
 * This is a workaround for MCP transport layer stringification of complex objects.
 * The MCP transport may stringify nested objects, so we need to parse them back.
 *
 * @param obj - The object to parse
 * @returns The parsed object with any stringified JSON converted back to objects
 */
function parseStringifiedJson(obj: unknown): unknown {
  if (typeof obj === 'string') {
    // Check if string looks like JSON (starts with { or [)
    const trimmed = obj.trim();
    if (
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
      try {
        const parsed = JSON.parse(trimmed);
        // Recursively parse the parsed object
        return parseStringifiedJson(parsed);
      } catch (error) {
        // If parsing fails, return the original string
        return obj;
      }
    }
    return obj;
  } else if (Array.isArray(obj)) {
    return obj.map(parseStringifiedJson);
  } else if (obj && typeof obj === 'object' && obj !== null) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = parseStringifiedJson(value);
    }
    return result;
  }
  return obj;
}

/**
 * Initializes Bridge configuration and validates on startup
 *
 * This function:
 * 1. Validates the configuration
 * 2. Creates necessary directories
 * 3. Sets up storage configuration
 * 4. Initializes the vector store
 *
 * @throws Error If configuration fails
 */
async function initializeConfiguration(serverInstance?: Server): Promise<void> {
  try {
    // Validate configuration
    validateConfiguration();

    // Get data file path from config
    const dataFilePath = getDataFilePath();

    // Ensure main data directory exists
    const dataDir = dirname(dataFilePath);
    mkdirSync(dataDir, { recursive: true });

    // Ensure vector store data directory exists (vectors.json will be in the same directory)
    const vectorStoreDir = dataDir;
    mkdirSync(vectorStoreDir, { recursive: true });

    // Set storage configuration
    setStorageConfig({ dataFile: dataFilePath });

    // Initialize embedding service first (needed by vector store)
    try {
      await embeddingService.initialize();
      mcpLog('info', 'Embedding service initialized successfully', serverInstance);
    } catch (embeddingError) {
      // Embedding service initialization failed - experiences will have zero embeddings
      mcpLog(
        'warn',
        `Embedding service initialization failed: ${embeddingError instanceof Error ? embeddingError.message : embeddingError}`,
        serverInstance
      );
    }

    // Core services initialization complete

    // Bridge DXT initialized successfully
    mcpLog('info', 'Bridge configuration initialized successfully', serverInstance);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown configuration error';
    mcpLog('error', `Bridge DXT configuration failed: ${errorMessage}`, serverInstance);
    throw new Error(`Bridge DXT configuration failed: ${errorMessage}`);
  }
}

// ============================================================================
// SERVER SETUP
// ============================================================================

/**
 * Creates the MCP server instance with appropriate capabilities
 */
const server = new Server(
  {
    name: SERVER_NAME,
    version: SERVER_VERSION,
  },
  {
    capabilities: {
      tools: {
        listChanged: false, // We don't dynamically change tools
      },
      resources: {
        listChanged: false, // We don't dynamically change resources
      },
      prompts: {
        listChanged: false, // We don't dynamically change prompts
      },
    },
  }
);

// Create tool handlers
const toolHandlers = new MCPToolHandlers();

/**
 * Initialize Bridge configuration after server connection
 * This ensures MCP logging is available during initialization
 */
export async function initializeBridgeConfiguration(): Promise<void> {
  await initializeConfiguration(server);
}

// ============================================================================
// REQUEST HANDLERS
// ============================================================================

/**
 * Handles initialization requests from MCP clients
 * This is required for MCP protocol compliance
 */
server.setRequestHandler(InitializeRequestSchema, async (request) => {
  const { clientInfo: _clientInfo, protocolVersion: _protocolVersion } = request.params;

  // Prepare response immediately without any logging
  const response = {
    protocolVersion: '2025-06-18',
    capabilities: {
      tools: {
        listChanged: false,
      },
      resources: {
        listChanged: false,
      },
      prompts: {
        listChanged: false,
      },
    },
    serverInfo: {
      name: SERVER_NAME,
      version: SERVER_VERSION,
    },
  };
  
  // Don't log during initialize response to avoid protocol corruption
  
  return response;
});

/**
 * Handles tool listing requests
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const tools = await getTools();
  return { tools };
});

/**
 * Handles tool execution requests
 *
 * This handler:
 * 1. Parses stringified JSON in arguments
 * 2. Routes to appropriate tool handler
 * 3. Provides user-friendly error messages
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  // Track activity for DXT idle timeout
  if ((global as unknown as { updateActivity?: () => void })?.updateActivity) {
    debugLog(`Calling updateActivity for tool: ${name}`);
    (global as unknown as { updateActivity?: () => void }).updateActivity?.();
  } else {
    debugLog(`WARNING: updateActivity not found in global scope for tool: ${name}`);
  }

  try {
    // Parse stringified JSON in arguments before passing to handlers
    const parsedArgs = parseStringifiedJson(args) as Record<string, unknown>;

    switch (name) {
      case 'experience':
        return await toolTimeout(
          toolHandlers.handle('experience', parsedArgs),
          `experience tool execution`
        );

      case 'reconsider':
        return await toolTimeout(
          toolHandlers.handle('reconsider', parsedArgs),
          `reconsider tool execution`
        );

      default:
        throw new McpError(ErrorCode.InvalidParams, `Unknown tool: ${name}`);
    }
  } catch (err) {
    // Log the error via MCP for debugging
    mcpLog(
      'error',
      `Tool execution error in ${name}: ${err instanceof Error ? err.message : err}`,
      server
    );

    // Improved error reporting for user clarity - return proper MCP tool result format
    let errorMessage = 'An unexpected error occurred';

    if (err instanceof McpError) {
      errorMessage = err.message;
    } else if (err instanceof z.ZodError) {
      // Convert Zod validation errors to user-friendly messages
      const details = err.errors
        .map((e) => {
          const field = e.path.join('.');
          const message = e.message;
          // Provide specific guidance for common validation errors
          if (field === 'perspective') {
            return `Invalid perspective`;
          }
          if (field === 'processing') {
            return `Invalid processing level. Must be one of: during, right-after, long-after`;
          }
          if (field === 'content') {
            return `Required: Content is required and cannot be empty.`;
          }
          if (field === 'who') {
            return `Required: Who is required. Specify who experienced this.`;
          }
          if (message.toLowerCase().includes('required')) {
            return `Required: ${message}`;
          }
          return `Invalid ${field}: ${message}`;
        })
        .join('; ');
      errorMessage = details;
    } else if (err instanceof Error) {
      // Special case: match the test expectation for missing content/narrative
      if (err.message.includes('Either content or experience.narrative is required')) {
        errorMessage = `Required: ${err.message}`;
      } else if (err.message.startsWith('[')) {
        // If error is a stringified array (Zod error), flatten it
        try {
          const arr = JSON.parse(err.message);
          if (Array.isArray(arr)) {
            errorMessage = arr
              .map((e: Record<string, unknown>) => (e.message as string) || JSON.stringify(e))
              .join('; ');
          } else {
            errorMessage = err.message;
          }
        } catch {
          errorMessage = err.message;
        }
      } else {
        errorMessage = err.message;
      }
    }
    // Strip 'Error capturing experience:' prefix if present
    if (
      typeof errorMessage === 'string' &&
      errorMessage.startsWith('Error capturing experience:')
    ) {
      errorMessage = errorMessage.replace(/^Error capturing experience:\s*/, '');
    }

    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: errorMessage,
        },
      ],
    };
  }
});

export { server };
