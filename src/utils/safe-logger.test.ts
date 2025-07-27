// Reset module before importing to ensure clean state
jest.resetModules();

import { debugLog, errorLog, mcpLog, overrideConsole } from './safe-logger.js';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';

describe('safe-logger', () => {
  let originalEnv: string | undefined;
  let consoleErrorSpy: jest.SpyInstance;
  let stderrSpy: jest.SpyInstance;
  let originalLog: unknown;
  let originalInfo: unknown;
  let originalWarn: unknown;

  beforeEach(() => {
    // Store original values
    originalEnv = process.env.BRIDGE_DEBUG;
    originalLog = console.log;
    originalInfo = console.info;
    originalWarn = console.warn;
    
    // Reset module state
    jest.resetModules();
    
    // Mock console.error
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock process.stderr.write
    stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    // Restore everything
    process.env.BRIDGE_DEBUG = originalEnv;
    console.log = originalLog as typeof console.log;
    console.info = originalInfo as typeof console.info;
    console.warn = originalWarn as typeof console.warn;
    consoleErrorSpy.mockRestore();
    stderrSpy.mockRestore();
  });

  describe('debugLog', () => {
    const originalEnv = process.env.BRIDGE_DEBUG;
    
    afterEach(() => {
      process.env.BRIDGE_DEBUG = originalEnv;
    });
    it('should log to stderr when BRIDGE_DEBUG is true', async () => {
      process.env.BRIDGE_DEBUG = 'true';
      
      // Re-import after setting env var
      jest.resetModules();
      const { debugLog: freshDebugLog } = await import('./safe-logger.js');
      
      freshDebugLog('test message', { data: 123 });
      
      expect(stderrSpy).toHaveBeenCalledWith('[Bridge Debug] test message [object Object]\n');
    });

    it('should not log when BRIDGE_DEBUG is false', () => {
      process.env.BRIDGE_DEBUG = 'false';
      debugLog('test message');
      
      expect(stderrSpy).not.toHaveBeenCalled();
    });
  });

  describe('errorLog', () => {
    it('should always log to stderr', () => {
      errorLog('error message', new Error('test error'));
      
      expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('[Bridge Error] error message Error: test error'));
    });
  });

  describe('mcpLog', () => {
    it('should send notification when server is provided', () => {
      const mockServer = {
        notification: jest.fn()
      } as unknown as Server;

      mcpLog('info', 'test message', mockServer);

      expect(mockServer.notification).toHaveBeenCalledWith({
        method: 'log/message',
        params: { level: 'info', data: 'test message' }
      });
    });

    it('should fall back to stderr when no server and debug is enabled', async () => {
      process.env.BRIDGE_DEBUG = 'true';
      
      // Re-import after setting env var
      jest.resetModules();
      const { mcpLog: freshMcpLog } = await import('./safe-logger.js');
      
      freshMcpLog('warn', 'warning message');

      expect(stderrSpy).toHaveBeenCalledWith('[Bridge WARN] warning message\n');
    });
  });

  describe('overrideConsole', () => {
    it('should override console methods', () => {
      const originalLog = console.log;
      const originalInfo = console.info;
      const originalWarn = console.warn;

      overrideConsole();

      // Test that methods were overridden
      expect(console.log).not.toBe(originalLog);
      expect(console.info).not.toBe(originalInfo);
      expect(console.warn).not.toBe(originalWarn);

      // Test that calling them triggers error logging
      console.log('test');
      expect(stderrSpy).toHaveBeenCalledWith(
        '[Bridge Error] WARNING: console.log() called in MCP server - this breaks JSON-RPC! test\n'
      );

      // Restore for other tests
      console.log = originalLog as typeof console.log;
      console.info = originalInfo as typeof console.info;
      console.warn = originalWarn as typeof console.warn;
    });
  });
});