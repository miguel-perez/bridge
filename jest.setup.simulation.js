// Load environment variables for simulation tests
require('dotenv').config();

// Disable embeddings during testing to avoid tensor conversion issues
process.env.TEST_DISABLE_EMBEDDINGS = 'true';

// Mock nanoid to avoid ESM import issues
jest.mock('nanoid', () => ({
  nanoid: () => 'test-id-' + Math.random().toString(36).substr(2, 9)
}));