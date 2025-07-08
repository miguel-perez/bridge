import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema, ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { validateConfiguration, getDataFilePath } from '../core/config.js';
import { setStorageConfig } from '../core/storage.js';
import { mkdirSync } from 'fs';
import { dirname } from 'path';
import { MCPToolHandlers } from './handlers.js';
import { tools } from './tools.js';

// Constants
const SERVER_NAME = 'bridge';
const SERVER_VERSION = '0.1.0';

// Initialize configuration and validate on startup
function initializeConfiguration() {
  try {
    // Validate configuration
    validateConfiguration();
    
    // Get data file path from config
    const dataFilePath = getDataFilePath();
    
    // Ensure directory exists
    const dataDir = dirname(dataFilePath);
    mkdirSync(dataDir, { recursive: true });
    
    // Set storage configuration
    setStorageConfig({ dataFile: dataFilePath });
    
    console.log(`Bridge DXT initialized with data file: ${dataFilePath}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown configuration error';
    console.error('Configuration error:', errorMessage);
    throw new Error(`Bridge DXT configuration failed: ${errorMessage}`);
  }
}

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

// Initialize configuration before setting up handlers
initializeConfiguration();

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

      case 'enrich':
        return await toolHandlers.handleEnrich(args);

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