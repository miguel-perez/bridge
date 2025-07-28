#!/usr/bin/env node
/**
 * Entry point for the Bridge MCP server
 *
 * Launches the server using Stdio transport for integration with MCP clients
 * (e.g., Claude Desktop). Includes DXT-specific error handling and timeouts.
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { server, initializeBridgeConfiguration } from './mcp/server.js';
import { overrideConsole, errorLog, debugLog } from './utils/safe-logger.js';

// DXT timeout configuration
const STARTUP_TIMEOUT = 30000; // 30 seconds for startup
// Idle timeout disabled - MCP servers should stay running for better UX
// const IDLE_TIMEOUT = 1800000; // 30 minutes idle timeout (increased from 5 minutes)

// MCP-compliant logging function
function mcpLog(level: 'info' | 'warn' | 'error', message: string): void {
  if (server && typeof server.notification === 'function') {
    server.notification({
      method: 'log/message',
      params: { level, data: message },
    });
  }
}

// Track last activity for idle timeout
let lastActivity = Date.now();

// Update activity timestamp
function updateActivity(): void {
  lastActivity = Date.now();
  debugLog(`Activity updated at ${new Date(lastActivity).toISOString()}`);
}

// Make updateActivity available globally for server handlers
(global as any).updateActivity = updateActivity;

// Idle timeout checking disabled for better UX
// MCP servers should stay running to avoid reconnection issues
/*
// Check for idle timeout
function checkIdleTimeout(): void {
  const now = Date.now();
  const idleTime = now - lastActivity;
  debugLog(`Idle check: ${Math.floor(idleTime / 1000)}s since last activity (${new Date(lastActivity).toISOString()})`);
  if (idleTime > IDLE_TIMEOUT) {
    mcpLog('info', `Server idle for ${Math.floor(idleTime / 1000)}s, shutting down gracefully`);
    process.exit(0);
  }
}

// Set up idle timeout checking
const idleCheckInterval = setInterval(checkIdleTimeout, 60000); // Check every minute
*/

// Handle uncaught exceptions and unhandled promise rejections
process.on('uncaughtException', (err) => {
  mcpLog('error', `Uncaught Exception: ${err.stack || err.message || err}`);
  // clearInterval(idleCheckInterval);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  mcpLog('error', `Unhandled Rejection: ${reason}`);
  // clearInterval(idleCheckInterval);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  mcpLog('info', 'Received SIGINT, shutting down gracefully');
  // clearInterval(idleCheckInterval);
  process.exit(0);
});

process.on('SIGTERM', () => {
  mcpLog('info', 'Received SIGTERM, shutting down gracefully');
  // clearInterval(idleCheckInterval);
  process.exit(0);
});

// Startup timeout
const startupTimeout = setTimeout(() => {
  mcpLog('error', 'Server startup timeout exceeded');
  process.exit(1);
}, STARTUP_TIMEOUT);

// Override console methods to prevent protocol corruption
overrideConsole();

// Start the MCP server
(async (): Promise<void> => {
  try {
    debugLog('Starting Bridge MCP server...');
    // Create transport with activity tracking
    const transport = new StdioServerTransport();

    // Track activity on transport events
    // Note: StdioServerTransport doesn't expose write method directly
    // Activity will be tracked through server handlers instead

    // Connect server
    await server.connect(transport);
    mcpLog('info', 'Bridge MCP server started and connected successfully');
    

    // Initialize Bridge configuration after server connection
    // This ensures MCP logging is available during initialization
    try {
      await initializeBridgeConfiguration();
      mcpLog('info', 'Bridge configuration initialized successfully');
    } catch (configError) {
      const configErrorMsg = configError instanceof Error ? configError.message : String(configError);
      mcpLog('error', `Failed to initialize Bridge configuration: ${configErrorMsg}`);
      // Don't exit - let the server run even if config init fails
    }

    // Clear startup timeout once initialized
    clearTimeout(startupTimeout);

    // Update activity on successful startup
    updateActivity();

    // Log DXT-specific configuration
    mcpLog('info', 'Bridge MCP server running - no idle timeout');
  } catch (err) {
    clearTimeout(startupTimeout);
    // clearInterval(idleCheckInterval);

    const errorMessage = err instanceof Error ? err.message : String(err);
    mcpLog('error', `Failed to start Bridge MCP server: ${errorMessage}`);

    // Provide helpful error messages for common issues
    if (errorMessage.includes('ENOENT')) {
      mcpLog('error', 'File not found. Ensure all dependencies are installed.');
    } else if (errorMessage.includes('EADDRINUSE')) {
      mcpLog('error', 'Port already in use. Another instance may be running.');
    } else if (errorMessage.includes('permission')) {
      mcpLog('error', 'Permission denied. Check file and directory permissions.');
    }

    process.exit(1);
  }
})();
