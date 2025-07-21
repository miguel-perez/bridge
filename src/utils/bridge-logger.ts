/**
 * Bridge Logger Utility
 * 
 * Provides logging functionality that doesn't interfere with JSON RPC messages.
 * In MCP/JSON RPC mode, logging is disabled to prevent stdout corruption.
 * In other contexts (tests, scripts), logging can be enabled.
 */

interface BridgeLogger {
  log: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

/**
 * Creates a logger that respects the MCP/JSON RPC context
 */
function createBridgeLogger(): BridgeLogger {
  // Removed: const isMCPMode = ...; // No longer needed
  // Removed: const isTestMode = ...; // No longer needed
  
  // Disable logging in MCP mode to prevent JSON RPC corruption
  // Removed: const shouldLog = ...; // No longer needed since all methods are no-ops
  
  return {
    log: (): void => {},
    warn: (): void => {},
    error: (): void => {},
  };
}

// Export a singleton logger instance
export const bridgeLogger = createBridgeLogger();