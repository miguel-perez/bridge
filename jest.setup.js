// Global Jest setup - disable embeddings during testing
process.env.BRIDGE_DISABLE_EMBEDDINGS = 'true';

// Mock nanoid to avoid ESM import issues
jest.mock('nanoid', () => ({
  nanoid: () => 'test-id-' + Math.random().toString(36).substr(2, 9)
}));