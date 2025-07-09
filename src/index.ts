#!/usr/bin/env node
// Entry point for the Bridge MCP server. Launches the server using Stdio transport for integration with MCP clients (e.g., Claude Desktop).
// Handles startup errors gracefully and logs them for troubleshooting.
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { server } from './mcp/server.js';

// Start the MCP server
(async () => {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
  } catch (err) {
    console.error('Failed to start Bridge MCP server:', err);
    process.exit(1);
  }
})();