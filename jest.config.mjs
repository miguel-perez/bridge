/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        module: 'esnext'
      }
    }]
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  testMatch: [
    '**/?(*.)+(spec|test).ts'
  ],
  // Exclude LLM integration tests from regular test runs
  testPathIgnorePatterns: [
    '/node_modules/',
    '/src/scripts/llm-integration.test.ts'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/scripts/llm-integration.test.ts'
  ],
  // Increase timeout for tests
  testTimeout: 30000,
  // Transform ESM dependencies
  transformIgnorePatterns: [
    'node_modules/(?!(nanoid|@modelcontextprotocol)/)'
  ]
}; 