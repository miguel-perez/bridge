#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { server } from './mcp/server.js';

// Start the MCP server
(async () => {
  const transport = new StdioServerTransport();
  await server.connect(transport);
})();