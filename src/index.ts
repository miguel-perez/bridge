#!/usr/bin/env node
// Entry point for the Bridge MCP server. Launches the server using Stdio transport for integration with MCP clients (e.g., Claude Desktop).
// Handles startup errors gracefully and logs them for troubleshooting.

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { server, initializeBridgeConfiguration } from './mcp/server.js';

// MCP-compliant logging function
function mcpLog(level: 'info' | 'warn' | 'error', message: string): void {
  if (server && typeof server.notification === 'function') {
    server.notification({
      method: 'log/message',
      params: { level, data: message }
    });
  }
}

// Handle uncaught exceptions and unhandled promise rejections
process.on('uncaughtException', (err) => {
  mcpLog('error', `Uncaught Exception: ${err.stack || err.message || err}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  mcpLog('error', `Unhandled Rejection: ${reason}`);
  process.exit(1);
});

// Start the MCP server
(async (): Promise<void> => {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    mcpLog('info', 'Bridge MCP server started and connected successfully');
    
    // Initialize Bridge configuration after server connection
    // This ensures MCP logging is available during initialization
    await initializeBridgeConfiguration();
    mcpLog('info', 'Bridge configuration initialized successfully');
  } catch (err) {
    mcpLog('error', `Failed to start Bridge MCP server: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
})();