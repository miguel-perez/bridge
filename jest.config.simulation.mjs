/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Setup files for simulations
  setupFiles: ['<rootDir>/jest.setup.simulation.js'],
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
  // Only match simulation test files
  testMatch: [
    '**/?(*.)+(simulation).ts'
  ],
  // Exclude simulation tests from coverage
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.integration.test.ts',
    '!src/**/*.simulation.ts',
    '!src/simulations/**/*.ts',
    '!src/scripts/**/*.ts',
    '!src/test-setup.ts'
  ],
  coverageReporters: ['json-summary', 'text', 'lcov'],
  coverageDirectory: 'coverage-simulation',
  // Long timeout for simulations
  testTimeout: 300000, // 5 minutes
  // Run sequentially for better control
  maxWorkers: 1,
  // Transform ESM dependencies  
  transformIgnorePatterns: [
    'node_modules/(?!(nanoid|@modelcontextprotocol|openai)/)'
  ],
  // Verbose output for simulation progress
  verbose: true
};