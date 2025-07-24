/**
 * Tests for MCP Tool Handlers
 */

import { MCPToolHandlers } from './handlers.js';
import { ExperienceHandler } from './experience-handler.js';
import { RecallHandler } from './recall-handler.js';
import { ReconsiderHandler } from './reconsider-handler.js';
import { ReleaseHandler } from './release-handler.js';

// Mock all handler modules
jest.mock('./experience-handler.js');
jest.mock('./recall-handler.js');
jest.mock('./reconsider-handler.js');
jest.mock('./release-handler.js');

describe('MCPToolHandlers', () => {
  let handlers: MCPToolHandlers;
  let mockExperienceHandler: jest.Mocked<ExperienceHandler>;
  let mockRecallHandler: jest.Mocked<RecallHandler>;
  let mockReconsiderHandler: jest.Mocked<ReconsiderHandler>;
  let mockReleaseHandler: jest.Mocked<ReleaseHandler>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create handler instance
    handlers = new MCPToolHandlers();

    // Get mocked instances
    mockExperienceHandler = (ExperienceHandler as jest.MockedClass<typeof ExperienceHandler>).mock
      .instances[0] as jest.Mocked<ExperienceHandler>;
    mockRecallHandler = (RecallHandler as jest.MockedClass<typeof RecallHandler>).mock
      .instances[0] as jest.Mocked<RecallHandler>;
    mockReconsiderHandler = (ReconsiderHandler as jest.MockedClass<typeof ReconsiderHandler>).mock
      .instances[0] as jest.Mocked<ReconsiderHandler>;
    mockReleaseHandler = (ReleaseHandler as jest.MockedClass<typeof ReleaseHandler>).mock
      .instances[0] as jest.Mocked<ReleaseHandler>;
  });

  describe('constructor', () => {
    it('should initialize all handlers', () => {
      expect(ExperienceHandler).toHaveBeenCalledTimes(1);
      expect(RecallHandler).toHaveBeenCalledTimes(1);
      expect(ReconsiderHandler).toHaveBeenCalledTimes(1);
      expect(ReleaseHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('handle', () => {
    it('should delegate experience tool to ExperienceHandler', async () => {
      const args = { source: 'test experience', experience: ['mood.open'] };
      const expectedResult = { id: 'exp_123', message: 'Captured' };

      mockExperienceHandler.handle.mockResolvedValue(expectedResult);

      const result = await handlers.handle('experience', args);

      expect(mockExperienceHandler.handle).toHaveBeenCalledWith(args, false);
      expect(result).toBe(expectedResult);
    });

    it('should delegate recall tool to RecallHandler', async () => {
      const args = { query: 'test search' };
      const expectedResult = { experiences: [], message: 'No results' };

      mockRecallHandler.handle.mockResolvedValue(expectedResult);

      const result = await handlers.handle('recall', args);

      expect(mockRecallHandler.handle).toHaveBeenCalledWith(args, false);
      expect(result).toBe(expectedResult);
    });

    it('should delegate reconsider tool to ReconsiderHandler', async () => {
      const args = { id: 'exp_123', experience: ['mood.closed'] };
      const expectedResult = { success: true, message: 'Updated' };

      mockReconsiderHandler.handle.mockResolvedValue(expectedResult);

      const result = await handlers.handle('reconsider', args);

      expect(mockReconsiderHandler.handle).toHaveBeenCalledWith(args, false);
      expect(result).toBe(expectedResult);
    });

    it('should delegate release tool to ReleaseHandler', async () => {
      const args = { id: 'exp_123', reason: 'cleanup' };
      const expectedResult = { success: true, message: 'Released' };

      mockReleaseHandler.handle.mockResolvedValue(expectedResult);

      const result = await handlers.handle('release', args);

      expect(mockReleaseHandler.handle).toHaveBeenCalledWith(args, false);
      expect(result).toBe(expectedResult);
    });

    it('should throw error for unknown tool', async () => {
      await expect(handlers.handle('unknown', {})).rejects.toThrow('Unknown tool: unknown');
    });

    it('should pass stillThinking parameter when provided', async () => {
      const args = { source: 'test', experience: ['mood.open'], stillThinking: true };
      const expectedResult = { id: 'exp_123', message: 'Captured' };

      mockExperienceHandler.handle.mockResolvedValue(expectedResult);

      const result = await handlers.handle('experience', args);

      expect(mockExperienceHandler.handle).toHaveBeenCalledWith(
        { source: 'test', experience: ['mood.open'] },
        true
      );
      expect(result).toBe(expectedResult);
    });

    it('should propagate errors from handlers', async () => {
      const error = new Error('Handler error');
      mockExperienceHandler.handle.mockRejectedValue(error);

      await expect(handlers.handle('experience', {})).rejects.toThrow('Handler error');
    });
  });

  describe('error handling', () => {
    it('should handle null args', async () => {
      mockExperienceHandler.handle.mockResolvedValue({ success: true });

      const result = await handlers.handle('experience', null);

      expect(mockExperienceHandler.handle).toHaveBeenCalledWith({}, false);
      expect(result).toEqual({ success: true });
    });

    it('should handle undefined args', async () => {
      mockRecallHandler.handle.mockResolvedValue({ experiences: [] });

      const result = await handlers.handle('recall', undefined);

      expect(mockRecallHandler.handle).toHaveBeenCalledWith({}, false);
      expect(result).toEqual({ experiences: [] });
    });

    it('should handle empty string tool name', async () => {
      await expect(handlers.handle('', {})).rejects.toThrow('Unknown tool: ');
    });

    it('should handle tool names with different casing', async () => {
      await expect(handlers.handle('Experience', {})).rejects.toThrow('Unknown tool: Experience');
      await expect(handlers.handle('RECALL', {})).rejects.toThrow('Unknown tool: RECALL');
    });
  });
});
