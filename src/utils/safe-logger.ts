/* eslint-disable no-console */
/**
 * Safe logging utilities for MCP servers
 * 
 * CRITICAL: MCP servers communicate via JSON-RPC over stdin/stdout.
 * Any console.log() to stdout will corrupt the protocol and crash the server.
 * 
 * This module provides safe alternatives that:
 * 1. Use stderr for debug output (visible in logs but doesn't corrupt protocol)
 * 2. Use MCP protocol's log/message for client-visible logging
 * 3. Can be completely disabled in production
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';

// Global flag to control debug output
const DEBUG_ENABLED = process.env.BRIDGE_DEBUG === 'true' || process.env.NODE_ENV === 'development';

/**
 * Safe debug logger that outputs to stderr
 * Only outputs when BRIDGE_DEBUG=true or NODE_ENV=development
 */
export function debugLog(...args: unknown[]): void {
  if (DEBUG_ENABLED) {
    process.stderr.write(`[Bridge Debug] ${args.map(arg => String(arg)).join(' ')}\n`);
  }
}

/**
 * Safe error logger that always outputs to stderr
 * Use for critical errors that should always be logged
 */
export function errorLog(...args: unknown[]): void {
  process.stderr.write(`[Bridge Error] ${args.map(arg => String(arg)).join(' ')}\n`);
}

/**
 * MCP-compliant logger that sends messages to the client
 * This is the proper way to log in MCP servers
 */
export function mcpLog(
  level: 'info' | 'warn' | 'error',
  message: string,
  server?: Server
): void {
  if (server && typeof server.notification === 'function') {
    server.notification({
      method: 'log/message',
      params: { level, data: message },
    });
  } else if (DEBUG_ENABLED) {
    // Fallback to stderr if no server instance
    process.stderr.write(`[Bridge ${level.toUpperCase()}] ${message}\n`);
  }
}

/**
 * Override console methods to prevent accidental usage
 * This helps catch any console.log calls during development
 */
export function overrideConsole(): void {
  const _originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
  };

  console.log = (...args: unknown[]): void => {
    errorLog('WARNING: console.log() called in MCP server - this breaks JSON-RPC!', ...args);
    if (DEBUG_ENABLED) {
      // In debug mode, show stack trace to find the source
      errorLog(new Error('console.log stack trace').stack);
    }
  };

  console.info = (...args: unknown[]): void => {
    errorLog('WARNING: console.info() called in MCP server - this breaks JSON-RPC!', ...args);
  };

  console.warn = (...args: unknown[]): void => {
    errorLog('WARNING: console.warn() called in MCP server - this breaks JSON-RPC!', ...args);
  };

  // Keep console.error as-is since it outputs to stderr
}

/**
 * Utility to wrap async functions with error logging
 * Ensures errors are logged to stderr before propagating
 */
export function withErrorLogging<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  context: string
): T {
  return (async (...args: Parameters<T>): Promise<unknown> => {
    try {
      return await fn(...args);
    } catch (error) {
      errorLog(`Error in ${context}:`, error);
      throw error;
    }
  }) as T;
}