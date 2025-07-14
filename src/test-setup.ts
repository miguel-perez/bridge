/**
 * Global test setup for Jest
 * Disables embeddings during testing to avoid tensor conversion issues
 */

import { jest } from '@jest/globals';

// Disable embeddings during testing to avoid tensor conversion issues
process.env.BRIDGE_DISABLE_EMBEDDINGS = 'true';

// Create global mocks that can be used across tests
export const createMockNanoid = () => jest.fn(() => 'test-id-12345');

export const createMockFs = () => ({
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(() => '{"sources": []}'),
  existsSync: jest.fn(() => false),
  mkdirSync: jest.fn(),
  readdirSync: jest.fn(() => []),
  rmSync: jest.fn(),
  unlinkSync: jest.fn()
});

export const createMockPath = () => ({
  join: jest.fn((...args: string[]) => args.join('/')),
  resolve: jest.fn((...args: string[]) => args.join('/')),
  dirname: jest.fn((path: string) => path.split('/').slice(0, -1).join('/') || '.')
});

export const createMockOs = () => ({
  tmpdir: jest.fn(() => '/tmp')
});

export const createMockEmbeddingService = () => ({
  generateEmbedding: jest.fn(() => Promise.resolve(new Array(384).fill(0.1))),
  generateEmbeddings: jest.fn(() => Promise.resolve([new Array(384).fill(0.1)])),
  initialize: jest.fn(() => Promise.resolve())
});

export const createMockVectorStore = () => ({
  addVector: jest.fn(() => true),
  addVectors: jest.fn(() => ({ added: 2, rejected: 0 })),
  removeVector: jest.fn(() => Promise.resolve()),
  findSimilar: jest.fn(() => Promise.resolve([])),
  findSimilarById: jest.fn(() => Promise.resolve([])),
  getVector: jest.fn(() => Promise.resolve([0.1, 0.2, 0.3])),
  hasVector: jest.fn(() => Promise.resolve(true)),
  getVectorCount: jest.fn(() => 0),
  clear: jest.fn(() => undefined),
  saveToDisk: jest.fn(() => Promise.resolve()),
  loadFromDisk: jest.fn(() => Promise.resolve()),
  initialize: jest.fn(() => Promise.resolve()),
  validateVectors: jest.fn(() => Promise.resolve({ valid: 2, invalid: 0, details: [] })),
  removeInvalidVectors: jest.fn(() => Promise.resolve(0)),
  cleanup: jest.fn(() => Promise.resolve(0)),
  getHealthStats: jest.fn(() => ({ total: 2, valid: 2, invalid: 0 }))
});

export const createMockStorage = () => ({
  generateId: jest.fn(() => Promise.resolve('src_test-id-12345')),
  saveSource: jest.fn((source: any) => Promise.resolve(source)),
  getAllRecords: jest.fn(() => Promise.resolve([])),
  updateSource: jest.fn((source: any) => Promise.resolve(source))
});

export const createMockPatternManager = () => ({
  onCapture: jest.fn(() => Promise.resolve()),
  onUpdate: jest.fn(() => Promise.resolve()),
  onRelease: jest.fn(() => Promise.resolve()),
  onDelete: jest.fn(() => Promise.resolve()),
  getPatterns: jest.fn(() => Promise.resolve([])),
  refreshPatterns: jest.fn(() => Promise.resolve())
});

// Helper to setup all common mocks
export function setupCommonMocks() {
  return {
    nanoid: createMockNanoid(),
    fs: createMockFs(),
    path: createMockPath(),
    os: createMockOs(),
    embeddingService: createMockEmbeddingService(),
    vectorStore: createMockVectorStore(),
    storage: createMockStorage(),
    patternManager: createMockPatternManager()
  };
}