/**
 * Bridge Logger Utility
 * 
 * Provides logging functionality that doesn't interfere with JSON RPC messages.
 * In MCP/JSON RPC mode, logging is disabled to prevent stdout corruption.
 * In other contexts (tests, scripts), logging can be enabled.
 */

interface BridgeLogger {
  log: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
}

/**
 * Creates a logger that respects the MCP/JSON RPC context
 */
function createBridgeLogger(): BridgeLogger {
  // Check if we're in MCP mode (JSON RPC over stdio)
  const isMCPMode = process.env.MCP_MODE === 'true' || 
                    process.argv.includes('--mcp') ||
                    // If started by Claude Desktop or similar MCP client
                    process.env.MCP_SERVER_NAME === 'bridge';
  
  // In test mode, we might want to see logs
  const isTestMode = process.env.BRIDGE_TEST_MODE === 'true' ||
                     process.env.NODE_ENV === 'test';
  
  // Disable logging in MCP mode to prevent JSON RPC corruption
  const shouldLog = !isMCPMode && !isTestMode;
  
  return {
    log: (...args: any[]) => {
      if (shouldLog) {
        console.log(...args);
      }
    },
    warn: (...args: any[]) => {
      if (shouldLog) {
        console.warn(...args);
      }
    },
    error: (...args: any[]) => {
      if (shouldLog) {
        console.error(...args);
      }
    }
  };
}

// Export a singleton logger instance
export const bridgeLogger = createBridgeLogger();