/**
 * Tests for MCP Tool Handlers
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { MCPToolHandlers } from './handlers.js';
import { ExperienceHandler } from './experience-handler.js';
import { ReconsiderHandler } from './reconsider-handler.js';

// Mock all handler modules
jest.mock('./experience-handler.js');
jest.mock('./reconsider-handler.js');

describe('MCPToolHandlers', () => {
  let handlers: MCPToolHandlers;
  let mockExperienceHandler: jest.Mocked<ExperienceHandler>;
  let mockReconsiderHandler: jest.Mocked<ReconsiderHandler>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create handler instance
    handlers = new MCPToolHandlers();

    // Get mocked instances
    mockExperienceHandler = (ExperienceHandler as jest.MockedClass<typeof ExperienceHandler>).mock
      .instances[0] as jest.Mocked<ExperienceHandler>;
    mockReconsiderHandler = (ReconsiderHandler as jest.MockedClass<typeof ReconsiderHandler>).mock
      .instances[0] as jest.Mocked<ReconsiderHandler>;
  });

  describe('constructor', () => {
    it('should initialize all handlers', () => {
      expect(ExperienceHandler).toHaveBeenCalledTimes(1);
      expect(ReconsiderHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('handle', () => {
    it('should delegate experience tool to ExperienceHandler', async () => {
      const args = {
        experiences: [{
          embodied: 'thinking through this problem',
          focus: 'concentrating on the test',
          mood: 'feeling optimistic',
          purpose: 'working toward completion',
          space: 'in my testing environment',
          time: 'focused on the present',
          presence: 'collaborating with the code',
          anchor: '🧪',
          who: ['Human', 'Claude'],
          citation: 'test experience'
        }]
      };
      const expectedResult = { id: 'exp_123', message: 'Captured' };

      mockExperienceHandler.handle.mockResolvedValue(expectedResult);

      const result = await handlers.handle('experience', args);

      expect(mockExperienceHandler.handle).toHaveBeenCalledWith(args);
      expect(result).toBe(expectedResult);
    });

    it('should delegate reconsider tool to ReconsiderHandler', async () => {
      const args = {
        reconsiderations: [{
          id: 'exp_123',
          mood: 'feeling more withdrawn',
          embodied: 'sensing tension in my body'
        }]
      };
      const expectedResult = { success: true, message: 'Updated' };

      mockReconsiderHandler.handle.mockResolvedValue(expectedResult);

      const result = await handlers.handle('reconsider', args);

      expect(mockReconsiderHandler.handle).toHaveBeenCalledWith(args);
      expect(result).toBe(expectedResult);
    });

    it('should throw error for unknown tool', async () => {
      await expect(handlers.handle('unknown', {})).rejects.toThrow('Unknown tool: unknown');
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

      expect(mockExperienceHandler.handle).toHaveBeenCalledWith({});
      expect(result).toEqual({ success: true });
    });

    it('should handle undefined args', async () => {
      mockExperienceHandler.handle.mockResolvedValue({ content: [] });

      const result = await handlers.handle('experience', undefined);

      expect(mockExperienceHandler.handle).toHaveBeenCalledWith({});
      expect(result).toEqual({ content: [] });
    });
  });

  describe('tool-specific behavior', () => {
    it('should handle experience with array format', async () => {
      const args = {
        experiences: [
          {
            embodied: 'feeling tension in my chest',
            focus: 'unable to concentrate',
            mood: 'anxious and overwhelmed',
            purpose: 'trying to calm down',
            space: 'feeling trapped',
            time: 'worried about deadlines',
            presence: 'feeling isolated',
            anchor: '😰',
            who: ['Human'],
            citation: 'feeling anxious'
          },
        ],
      };

      mockExperienceHandler.handle.mockResolvedValue({
        content: [{ type: 'text', text: 'Experienced' }],
      });

      const result = await handlers.handle('experience', args);

      expect(mockExperienceHandler.handle).toHaveBeenCalledWith(args);
      expect(result).toHaveProperty('content');
    });

    it('should handle reconsider with array format', async () => {
      const args = {
        reconsiderations: [
          {
            id: 'exp_123',
            mood: 'feeling more hopeful',
            embodied: 'thinking clearly now'
          },
        ],
      };

      mockReconsiderHandler.handle.mockResolvedValue({
        content: [{ type: 'text', text: 'Reconsidered' }],
      });

      const result = await handlers.handle('reconsider', args);

      expect(mockReconsiderHandler.handle).toHaveBeenCalledWith(args);
      expect(result).toHaveProperty('content');
    });
  });
});
