#!/usr/bin/env node
/**
 * Dedicated entry point for the Bridge MCP server
 * 
 * This file imports only the core MCP server components,
 * excluding all scripts and development tools.
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { overrideConsole, errorLog, debugLog } from './utils/safe-logger.js';
import { server, initializeBridgeConfiguration } from './mcp/server.js';

// DXT timeout configuration
const STARTUP_TIMEOUT = 30000; // 30 seconds for startup
const IDLE_TIMEOUT = 300000; // 5 minutes idle timeout

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
}

// Make updateActivity available globally for server handlers
(global as unknown as { updateActivity?: () => void }).updateActivity = updateActivity;

// Check for idle timeout
function checkIdleTimeout(): void {
  const idleTime = Date.now() - lastActivity;
  if (idleTime > IDLE_TIMEOUT) {
    mcpLog('info', `Server idle for ${Math.floor(idleTime / 1000)}s, shutting down gracefully`);
    process.exit(0);
  }
}

// Set up idle timeout checking
const idleCheckInterval = setInterval(checkIdleTimeout, 60000); // Check every minute

// Handle uncaught exceptions and unhandled promise rejections
process.on('uncaughtException', (err) => {
  errorLog(`Uncaught Exception: ${err.stack || err.message || err}`);
  mcpLog('error', `Uncaught Exception: ${err.stack || err.message || err}`);
  clearInterval(idleCheckInterval);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  const reasonStr = reason instanceof Error ? reason.stack || reason.message : String(reason);
  errorLog(`Unhandled Rejection: ${reasonStr}`);
  mcpLog('error', `Unhandled Rejection: ${reasonStr}`);
  clearInterval(idleCheckInterval);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  mcpLog('info', 'Received SIGINT, shutting down gracefully');
  clearInterval(idleCheckInterval);
  process.exit(0);
});

process.on('SIGTERM', () => {
  mcpLog('info', 'Received SIGTERM, shutting down gracefully');
  clearInterval(idleCheckInterval);
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
    errorLog('Bridge MCP server starting up...');
    errorLog(`Node version: ${process.version}`);
    errorLog(`Working directory: ${process.cwd()}`);
    errorLog(`__dirname: ${import.meta.url}`);
    
    debugLog('Starting Bridge MCP server...');
    // Create transport with activity tracking
    const transport = new StdioServerTransport();

    errorLog('Connecting to transport...');
    // Connect server
    await server.connect(transport);
    errorLog('Bridge MCP server connected successfully');
    mcpLog('info', 'Bridge MCP server started and connected successfully');
    
    // Initialize Bridge configuration after first initialize request is handled
    // This prevents MCP protocol interference during startup
    setTimeout(async () => {
      try {
        await initializeBridgeConfiguration();
        errorLog('Bridge configuration initialized successfully');
        mcpLog('info', 'Bridge configuration initialized successfully');
      } catch (configError) {
        const configErrorMsg = configError instanceof Error ? configError.message : String(configError);
        errorLog(`Failed to initialize Bridge configuration: ${configErrorMsg}`);
        mcpLog('error', `Failed to initialize Bridge configuration: ${configErrorMsg}`);
        // Don't exit - let the server run even if config init fails
      }
    }, 100);

    // Clear startup timeout once initialized
    clearTimeout(startupTimeout);

    // Update activity on successful startup
    updateActivity();

    // Log DXT-specific configuration
    mcpLog('info', `DXT mode active - Idle timeout: ${IDLE_TIMEOUT / 1000}s`);
  } catch (err) {
    clearTimeout(startupTimeout);
    clearInterval(idleCheckInterval);

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