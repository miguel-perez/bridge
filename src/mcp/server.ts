import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema, ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { setStorageConfig } from '../core/storage.js';
import path from 'path';
import { MCPToolHandlers } from './handlers.js';
import { tools } from './tools.js';

// Constants
const SERVER_NAME = 'captain';
const SERVER_VERSION = '0.1.0';

// Define data file path using environment variable with fallback in project root
const defaultDataPath = process.env.NODE_ENV === 'test' 
  ? path.resolve(process.cwd(), 'data', 'bridge-test.json')
  : path.resolve(process.cwd(), 'bridge.json');
const DATA_FILE_PATH = process.env.BRIDGE_FILE_PATH
  ? path.isAbsolute(process.env.BRIDGE_FILE_PATH)
    ? process.env.BRIDGE_FILE_PATH
    : path.resolve(process.cwd(), process.env.BRIDGE_FILE_PATH)
  : defaultDataPath;

// Create server instance
const server = new Server(
  {
    name: SERVER_NAME,
    version: SERVER_VERSION,
  },
  {
    capabilities: {
      tools: {
        listChanged: false  // We don't dynamically change tools
      },
      resources: {
        listChanged: false  // We don't dynamically change resources
      },
      prompts: {
        listChanged: false  // We don't dynamically change prompts
      },
    },
  }
);

// Set storage and embeddings config to use DATA_FILE_PATH
setStorageConfig({ dataFile: DATA_FILE_PATH });

// Create tool handlers
const toolHandlers = new MCPToolHandlers();

// Set up request handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'capture':
        return await toolHandlers.handleCapture(args);

      case 'release':
        return await toolHandlers.handleRelease(args);

      case 'search':
        return await toolHandlers.handleSearch(args ?? {});

      default:
        throw new McpError(
          ErrorCode.InvalidParams,
          `Unknown tool: ${name}`
        );
    }
  } catch (err) {
    // Improved error reporting for user clarity - return proper MCP tool result format
    let errorMessage = 'An unexpected error occurred';
    
    if (err instanceof McpError) {
      errorMessage = err.message;
    } else if (err instanceof z.ZodError) {
      // Convert Zod validation errors to user-friendly messages
      const details = err.errors.map(e => {
        const field = e.path.join('.');
        const message = e.message;
        
        // Provide specific guidance for common validation errors
        if (field === 'perspective') {
          return `Invalid perspective. Must be one of: I, we, you, they`;
        }
        if (field === 'processing') {
          return `Invalid processing level. Must be one of: during, right-after, long-after, crafted`;
        }
        if (field === 'content') {
          return `Content is required and cannot be empty.`;
        }
        if (field === 'experiencer') {
          return `Experiencer is required. Specify who experienced this.`;
        }
        
        return `Invalid ${field}: ${message}`;
      }).join('; ');
      errorMessage = details;
    } else if (err instanceof Error) {
      errorMessage = err.message;
    }
    
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: errorMessage
        }
      ]
    };
  }
});

export { server }; 