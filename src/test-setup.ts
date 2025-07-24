/**
 * Global test setup for Jest
 * Disables embeddings during testing to avoid tensor conversion issues
 */

import { jest } from '@jest/globals';

// Disable embeddings during testing to avoid tensor conversion issues
process.env.TEST_DISABLE_EMBEDDINGS = 'true';

// Create global mocks that can be used across tests
export const createMockNanoid = () => jest.fn(() => 'test-id-12345');

export const createMockFs = () => ({
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(() => '{"sources": []}'),
  existsSync: jest.fn(() => false),
  mkdirSync: jest.fn(),
  readdirSync: jest.fn(() => []),
  rmSync: jest.fn(),
  unlinkSync: jest.fn(),
});

export const createMockPath = () => ({
  join: jest.fn((...args: string[]) => args.join('/')),
  resolve: jest.fn((...args: string[]) => args.join('/')),
  dirname: jest.fn((path: string) => path.split('/').slice(0, -1).join('/') || '.'),
});

export const createMockOs = () => ({
  tmpdir: jest.fn(() => '/tmp'),
});

export const createMockEmbeddingService = () => ({
  generateEmbedding: jest.fn(() => Promise.resolve(new Array(384).fill(0.1))),
  generateEmbeddings: jest.fn(() => Promise.resolve([new Array(384).fill(0.1)])),
  initialize: jest.fn(() => Promise.resolve()),
});

// VectorStore removed - embeddings now in main storage

export const createMockStorage = () => ({
  generateId: jest.fn(() => Promise.resolve('src_test-id-12345')),
  saveSource: jest.fn((source: any) => Promise.resolve(source)),
  getAllRecords: jest.fn(() => Promise.resolve([])),
  updateSource: jest.fn((source: any) => Promise.resolve(source)),
});

// Helper to setup all common mocks
/**
 *
 */
export function setupCommonMocks() {
  return {
    nanoid: createMockNanoid(),
    fs: createMockFs(),
    path: createMockPath(),
    os: createMockOs(),
    embeddingService: createMockEmbeddingService(),
    storage: createMockStorage(),
  };
}

// Global teardown to clean up any pending timers or background processes
/**
 *
 */
export async function globalTeardown(): Promise<void> {
  // Wait a bit for any pending operations to complete
  await new Promise((resolve) => setTimeout(resolve, 100));
}
