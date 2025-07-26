import {
  getConfig,
  updateConfig,
  setDataFilePath,
  getDataFilePath,
  validateConfiguration,
  isDebugMode,
} from './config.js';

describe('Config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables
    process.env = { ...originalEnv };
    // Clear any cached config
    updateConfig({
      dataFilePath: process.env.BRIDGE_FILE_PATH || 'bridge.json',
      debugMode: false,
    });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getConfig', () => {
    test('should return current configuration', () => {
      const config = getConfig();
      expect(config).toHaveProperty('dataFilePath');
      expect(config).toHaveProperty('debugMode');
    });

    test('should return a copy of configuration', () => {
      const config1 = getConfig();
      const config2 = getConfig();
      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });
  });

  describe('updateConfig', () => {
    test('should update configuration partially', () => {
      updateConfig({ debugMode: true });
      const config = getConfig();
      expect(config.debugMode).toBe(true);
    });

    test('should update multiple properties', () => {
      updateConfig({
        debugMode: true,
        dataFilePath: '/tmp/bridge.json',
      });
      const config = getConfig();
      expect(config.debugMode).toBe(true);
      expect(config.dataFilePath).toBe('/tmp/bridge.json');
    });
  });

  describe('setDataFilePath', () => {
    test('should set data file path', () => {
      setDataFilePath('/custom/path/bridge.json');
      expect(getDataFilePath()).toBe('/custom/path/bridge.json');
    });
  });

  describe('getDataFilePath', () => {
    test('should return current data file path', () => {
      setDataFilePath('test-bridge.json');
      expect(getDataFilePath()).toBe('test-bridge.json');
    });
  });

  describe('isDebugMode', () => {
    test('should return debug mode status', () => {
      updateConfig({ debugMode: true });
      expect(isDebugMode()).toBe(true);

      updateConfig({ debugMode: false });
      expect(isDebugMode()).toBe(false);
    });
  });

  describe('validateConfiguration', () => {
    test('should not throw with valid configuration', () => {
      setDataFilePath('valid-path.json');
      expect(() => validateConfiguration()).not.toThrow();
    });

    test('should throw with empty data file path', () => {
      expect(() => setDataFilePath('')).toThrow('Data file path must be a non-empty string.');
    });
  });

  describe('environment variable handling', () => {
    test('should use BRIDGE_FILE_PATH environment variable', () => {
      process.env.BRIDGE_FILE_PATH = '/env/path/bridge.json';
      // Reset config to pick up new env var
      updateConfig({
        dataFilePath: process.env.BRIDGE_FILE_PATH || 'bridge.json',
        debugMode: false,
      });
      expect(getDataFilePath()).toBe('/env/path/bridge.json');
    });

    test('should handle BRIDGE_DEBUG environment variable', () => {
      process.env.BRIDGE_DEBUG = 'true';
      updateConfig({
        dataFilePath: getDataFilePath(),
        debugMode: process.env.BRIDGE_DEBUG === 'true',
      });
      expect(isDebugMode()).toBe(true);
    });
  });
});
