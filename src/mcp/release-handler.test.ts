/**
 * Tests for MCP Release Tool Handler
 */

import { ReleaseHandler } from './release-handler.js';
import { deleteSource } from '../core/storage.js';
import { ToolResultSchema } from './schemas.js';
import type { ReleaseInput } from './schemas.js';

// Mock dependencies
jest.mock('../core/storage.js');
jest.mock('./schemas.js', () => ({
  ...jest.requireActual('./schemas.js'),
  ToolResultSchema: {
    parse: jest.fn((value) => value),
  },
}));

describe('ReleaseHandler', () => {
  let handler: ReleaseHandler;
  let mockDeleteSource: jest.MockedFunction<typeof deleteSource>;
  let mockToolResultSchemaParse: jest.MockedFunction<typeof ToolResultSchema.parse>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock storage functions
    mockDeleteSource = deleteSource as jest.MockedFunction<typeof deleteSource>;
    mockDeleteSource.mockResolvedValue(undefined);

    // Mock schema validation
    mockToolResultSchemaParse = ToolResultSchema.parse as jest.MockedFunction<
      typeof ToolResultSchema.parse
    >;
    mockToolResultSchemaParse.mockImplementation((value) => value);

    // Mock Date for consistent timestamps
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-21T12:00:00Z'));

    handler = new ReleaseHandler();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('handle', () => {
    it('should handle single release successfully', async () => {
      const input: ReleaseInput = {
        releases: [
          {
            id: 'exp_123',
            reason: 'No longer relevant',
          },
        ],
      };

      const result = await handler.handle(input);

      expect(mockDeleteSource).toHaveBeenCalledWith('exp_123');
      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);

      const text = result.content[0].text;
      expect(text).toContain('🙏 Experience released with gratitude');
      expect(text).toContain('📝 ID: exp_123');
      expect(text).toContain('💭 Reason: No longer relevant');
      expect(text).toContain('🕐 Released: 1/21/2025');
      expect(text).toContain('The record has been permanently removed');
    });

    it('should handle single release without reason', async () => {
      const input: ReleaseInput = {
        releases: [
          {
            id: 'exp_123',
          },
        ],
      };

      const result = await handler.handle(input);

      expect(mockDeleteSource).toHaveBeenCalledWith('exp_123');
      expect(result.isError).toBeUndefined();

      const text = result.content[0].text;
      expect(text).toContain('💭 Reason: No reason provided');
    });

    it('should handle batch releases', async () => {
      const input: ReleaseInput = {
        releases: [
          { id: 'exp_1', reason: 'Venting session' },
          { id: 'exp_2', reason: 'Temporary note' },
          { id: 'exp_3' },
        ],
      };

      const result = await handler.handle(input);

      expect(mockDeleteSource).toHaveBeenCalledTimes(3);
      expect(mockDeleteSource).toHaveBeenCalledWith('exp_1');
      expect(mockDeleteSource).toHaveBeenCalledWith('exp_2');
      expect(mockDeleteSource).toHaveBeenCalledWith('exp_3');

      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(2); // Main content + guidance

      const text = result.content[0].text;
      expect(text).toContain('🗑️  Released 3 experiences:');
      expect(text).toContain('📝 ID: exp_1');
      expect(text).toContain('💭 Reason: Venting session');
      expect(text).toContain('📝 ID: exp_2');
      expect(text).toContain('💭 Reason: Temporary note');
      expect(text).toContain('📝 ID: exp_3');
      expect(text).toContain('💭 Reason: No reason provided');
      expect(text).toContain('All records have been permanently removed');

      // Should have venting guidance
      expect(result.content[1].text).toBe('Memory space cleared for new experiences');
    });

    it('should handle large batch releases', async () => {
      const input: ReleaseInput = {
        releases: [{ id: 'exp_1' }, { id: 'exp_2' }, { id: 'exp_3' }, { id: 'exp_4' }],
      };

      const result = await handler.handle(input);

      expect(mockDeleteSource).toHaveBeenCalledTimes(4);
      expect(result.content).toHaveLength(2); // Main content + guidance

      // Should have cleanup guidance
      expect(result.content[1].text).toBe('Focus returns to the present moment');
    });

    it('should handle release with missing ID in batch', async () => {
      const input: ReleaseInput = {
        releases: [
          { id: 'exp_1', reason: 'Valid' },
          { reason: 'Missing ID' }, // Missing id
          { id: 'exp_3', reason: 'Valid' },
        ],
      };

      const result = await handler.handle(input);

      // Should only delete valid IDs
      expect(mockDeleteSource).toHaveBeenCalledTimes(2);
      expect(mockDeleteSource).toHaveBeenCalledWith('exp_1');
      expect(mockDeleteSource).toHaveBeenCalledWith('exp_3');

      const text = result.content[0].text;
      expect(text).toContain('Error: ID is required for release operations');
      expect(text).toContain('📝 ID: exp_1');
      expect(text).toContain('📝 ID: exp_3');
    });

    it('should handle empty releases array gracefully', async () => {
      const input: ReleaseInput = {
        releases: [],
      };

      const result = await handler.handle(input);

      expect(mockDeleteSource).not.toHaveBeenCalled();
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('Releases array is required');
    });

    it('should return error when deleteSource throws', async () => {
      const input: ReleaseInput = {
        releases: [
          {
            id: 'exp_123',
            reason: 'Test',
          },
        ],
      };

      mockDeleteSource.mockRejectedValue(new Error('Storage error'));

      const result = await handler.handle(input);

      expect(result.isError).toBe(true);
      expect(result.content[0]).toEqual({
        type: 'text',
        text: 'Storage error',
      });
    });

    it('should return generic error for non-Error throws', async () => {
      const input: ReleaseInput = {
        releases: [
          {
            id: 'exp_123',
          },
        ],
      };

      mockDeleteSource.mockRejectedValue('String error');

      const result = await handler.handle(input);

      expect(result.isError).toBe(true);
      expect(result.content[0]).toEqual({
        type: 'text',
        text: 'Unknown error',
      });
    });

    it('should validate result with ToolResultSchema', async () => {
      const input: ReleaseInput = {
        releases: [
          {
            id: 'exp_123',
          },
        ],
      };

      await handler.handle(input);

      expect(mockToolResultSchemaParse).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.arrayContaining([
            expect.objectContaining({
              type: 'text',
              text: expect.any(String),
            }),
          ]),
        })
      );
    });

    it('should handle schema validation errors', async () => {
      const input: ReleaseInput = {
        releases: [
          {
            id: 'exp_123',
          },
        ],
      };

      mockToolResultSchemaParse.mockImplementation(() => {
        throw new Error('Schema validation failed');
      });

      const result = await handler.handle(input);

      expect(result.isError).toBe(true);
      expect(result.content[0]).toEqual({
        type: 'text',
        text: 'Schema validation failed',
      });
    });
  });

  describe('selectReleaseGuidance', () => {
    it('should provide venting guidance for venting reasons', async () => {
      const input: ReleaseInput = {
        releases: [
          { id: 'exp_1', reason: 'Just venting' },
          { id: 'exp_2', reason: 'Normal reason' },
        ],
      };

      const result = await handler.handle(input);

      expect(result.content).toHaveLength(2);
      expect(result.content[1].text).toBe('Memory space cleared for new experiences');
    });

    it('should provide venting guidance for temporary reasons', async () => {
      const input: ReleaseInput = {
        releases: [{ id: 'exp_1', reason: 'Temporary note' }],
      };

      const result = await handler.handle(input);

      expect(result.content).toHaveLength(2);
      expect(result.content[1].text).toBe('Memory space cleared for new experiences');
    });

    it('should provide cleanup guidance for many releases', async () => {
      const input: ReleaseInput = {
        releases: [{ id: 'exp_1' }, { id: 'exp_2' }, { id: 'exp_3' }, { id: 'exp_4' }],
      };

      const result = await handler.handle(input);

      expect(result.content).toHaveLength(2);
      expect(result.content[1].text).toBe('Focus returns to the present moment');
    });

    it('should not provide guidance for small normal releases', async () => {
      const input: ReleaseInput = {
        releases: [
          { id: 'exp_1', reason: 'Outdated' },
          { id: 'exp_2', reason: 'Not needed' },
        ],
      };

      const result = await handler.handle(input);

      expect(result.content).toHaveLength(1); // No guidance
    });

    it('should handle case-insensitive venting detection', async () => {
      const input: ReleaseInput = {
        releases: [
          { id: 'exp_1', reason: 'VENTING' },
          { id: 'exp_2', reason: 'VeNtInG session' },
        ],
      };

      const result = await handler.handle(input);

      expect(result.content).toHaveLength(2);
      expect(result.content[1].text).toBe('Memory space cleared for new experiences');
    });

    it('should not provide guidance for single normal release', async () => {
      const input: ReleaseInput = {
        releases: [
          {
            id: 'exp_123',
            reason: 'No longer relevant',
          },
        ],
      };

      const result = await handler.handle(input);

      expect(result.content).toHaveLength(1); // No guidance
    });
  });
});
