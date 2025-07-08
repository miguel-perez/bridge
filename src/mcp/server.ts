import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema, ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { validateConfiguration, getDataFilePath } from '../core/config.js';
import { setStorageConfig } from '../core/storage.js';
import { initializeVectorStore } from '../services/vector-store.js';
import { mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { MCPToolHandlers } from './handlers.js';
import { tools } from './tools.js';

// Constants
const SERVER_NAME = 'bridge';
const SERVER_VERSION = '0.1.0';

// Helper function to recursively parse stringified JSON in arguments
// This is a workaround for MCP transport layer stringification of complex objects
function parseStringifiedJson(obj: any): any {
  if (typeof obj === 'string') {
    // Check if string looks like JSON (starts with { or [)
    const trimmed = obj.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || 
        (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
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
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = parseStringifiedJson(value);
    }
    return result;
  }
  return obj;
}

// Initialize configuration and validate on startup
async function initializeConfiguration() {
  try {
    // Validate configuration
    validateConfiguration();
    
    // Get data file path from config
    const dataFilePath = getDataFilePath();
    
    // Ensure main data directory exists
    const dataDir = dirname(dataFilePath);
    mkdirSync(dataDir, { recursive: true });
    
    // Ensure vector store data directory exists (vectors.json will be in the same directory)
    const vectorStoreDir = dirname(join(dataDir, 'vectors.json'));
    mkdirSync(vectorStoreDir, { recursive: true });
    
    // Set storage configuration
    setStorageConfig({ dataFile: dataFilePath });
    
          // Initialize vector store with the same data directory
      try {
        const vectorStore = initializeVectorStore(dataDir);
        await vectorStore.initialize();
        await vectorStore.getVectorCount(); // Initialize and verify vector count
        // Vector store initialized successfully
      } catch (vectorError) {
        // Vector store initialization failed - semantic search won't work without it
        // but basic functionality will still work
      }
      
      // Bridge DXT initialized successfully
      } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown configuration error';
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
// Note: This is now async, but we can't await it here since this is module-level code
// The initialization will happen when the module is imported
initializeConfiguration().catch(() => {
  // Configuration failed - exit with error code
  process.exit(1);
});

// Create tool handlers
const toolHandlers = new MCPToolHandlers();

// Set up request handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // Parse stringified JSON in arguments before passing to handlers
    const parsedArgs = parseStringifiedJson(args);

    switch (name) {
      case 'capture':
        return await toolHandlers.handleCapture(parsedArgs);

      case 'release':
        return await toolHandlers.handleRelease(parsedArgs);

      case 'search':
        return await toolHandlers.handleSearch(parsedArgs ?? {});

      case 'enrich':
        return await toolHandlers.handleEnrich(parsedArgs);

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