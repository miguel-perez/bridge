/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Disable embeddings during testing to avoid tensor conversion issues
  setupFiles: ['<rootDir>/jest.setup.js'],
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
      isolatedModules: true,
      tsconfig: {
        module: 'esnext'
      }
    }]
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  testMatch: [
    '**/?(*.)+(integration.test|integration.spec).ts'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.integration.test.ts',
    '!src/scripts/**/*.ts',
    '!src/test-setup.ts'
  ],
  coverageReporters: ['json-summary', 'text', 'lcov'],
  coverageDirectory: 'coverage-integration',
  // Increase timeout for integration tests
  testTimeout: 60000,
  // Run tests sequentially for better isolation
  maxWorkers: 1,
  // Transform ESM dependencies  
  transformIgnorePatterns: [
    'node_modules/(?!(nanoid|@modelcontextprotocol)/)'
  ],
  // Global setup
  setupFilesAfterEnv: []
};