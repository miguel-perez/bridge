/**
 * Tests for MCP Reconsider Tool Handler
 */

import { ReconsiderHandler } from './reconsider-handler.js';
import { EnrichService } from '../services/enrich.js';
import { formatReconsiderResponse } from '../utils/formatters.js';
import * as storage from '../core/storage.js';
import type { ReconsiderInput } from './schemas.js';
import type { EnrichResult } from '../services/enrich.js';

// Mock dependencies
jest.mock('../services/enrich.js');
jest.mock('../utils/formatters.js');
jest.mock('../core/storage.js');

describe('ReconsiderHandler', () => {
  let handler: ReconsiderHandler;
  let mockEnrichService: jest.Mocked<EnrichService>;
  let mockFormatReconsiderResponse: jest.MockedFunction<typeof formatReconsiderResponse>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock EnrichService
    mockEnrichService = new EnrichService() as jest.Mocked<EnrichService>;
    mockEnrichService.enrichSource = jest.fn();
    (EnrichService as jest.MockedClass<typeof EnrichService>).mockImplementation(
      () => mockEnrichService
    );

    // Mock formatters
    mockFormatReconsiderResponse = formatReconsiderResponse as jest.MockedFunction<
      typeof formatReconsiderResponse
    >;
    mockFormatReconsiderResponse.mockReturnValue('Reconsidered successfully');

    handler = new ReconsiderHandler();
  });

  describe('handle', () => {
    it('should handle single reconsideration successfully', async () => {
      const input: ReconsiderInput = {
        reconsiderations: [
          {
            id: 'exp_123',
            source: 'Updated text',
            experience: ['mood.open'],
          },
        ],
      };

      const mockResult: EnrichResult = {
        source: {
          id: 'exp_123',
          source: 'Updated text',
          created: '2025-01-21T12:00:00Z',
          experience: ['mood.open'],
        },
        updatedFields: ['source', 'experience'],
        embeddingsRegenerated: false,
      };

      mockEnrichService.enrichSource.mockResolvedValue(mockResult);

      const result = await handler.handle(input);

      expect(result.isError).toBeFalsy();
      expect(result.content).toHaveLength(2); // Response + guidance
      expect(result.content[0]).toEqual({
        type: 'text',
        text: 'Reconsidered successfully',
      });
      expect(result.content[1]).toEqual({
        type: 'text',
        text: 'Updated. See connections with recall',
      });
    });

    it('should handle batch reconsiderations', async () => {
      const input: ReconsiderInput = {
        reconsiderations: [
          {
            id: 'exp_1',
            source: 'Updated text 1',
            experience: ['mood.open'],
          },
          {
            id: 'exp_2',
            source: 'Updated text 2',
            experience: ['embodied.sensing'],
          },
        ],
      };

      const mockResults: EnrichResult[] = [
        {
          source: {
            id: 'exp_1',
            source: 'Updated text 1',
            created: '2025-01-21T12:00:00Z',
            experience: ['mood.open'],
          },
          updatedFields: ['source', 'experience'],
          embeddingsRegenerated: false,
        },
        {
          source: {
            id: 'exp_2',
            source: 'Updated text 2',
            created: '2025-01-21T12:00:00Z',
            experience: ['embodied.sensing'],
          },
          updatedFields: ['source', 'experience'],
          embeddingsRegenerated: false,
        },
      ];

      mockEnrichService.enrichSource
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1]);

      const result = await handler.handle(input);

      expect(result.isError).toBeFalsy();
      expect(result.content).toHaveLength(1);
      const text = result.content[0].text;
      expect(text).toContain('✅ 2 experiences updated successfully!');
      expect(text).toContain('📝 Updated: exp_1');
      expect(text).toContain('📝 Updated: exp_2');
    });

    it('should handle reconsideration with all fields', async () => {
      const input: ReconsiderInput = {
        reconsiderations: [
          {
            id: 'exp_123',
            source: 'Updated text',
            perspective: 'we',
            who: 'Team',
            processing: 'long-after',
            experience: {
              embodied: false,
              focus: false,
              mood: false,
              purpose: false,
              space: false,
              time: false,
              presence: 'collective',
            },
          },
        ],
      };

      const mockResult: EnrichResult = {
        source: {
          id: 'exp_123',
          source: 'Updated text',
          created: '2025-01-21T12:00:00Z',
          perspective: 'we',
          who: 'Team',
          processing: 'long-after',
          experience: ['presence.collective'],
        },
        updatedFields: ['source', 'perspective', 'who', 'processing', 'experience'],
        embeddingsRegenerated: false,
      };

      mockEnrichService.enrichSource.mockResolvedValue(mockResult);

      const result = await handler.handle(input);

      expect(mockEnrichService.enrichSource).toHaveBeenCalledWith({
        id: 'exp_123',
        source: 'Updated text',
        perspective: 'we',
        who: 'Team',
        processing: 'long-after',
        experience: ['presence.collective'],
        reflects: undefined,
        context: undefined,
        crafted: undefined,
      });
      expect(result.isError).toBeUndefined();
    });

    it('should handle reconsideration without experience qualities', async () => {
      const input: ReconsiderInput = {
        reconsiderations: [
          {
            id: 'exp_123',
            source: 'Updated text only',
          },
        ],
      };

      const mockResult: EnrichResult = {
        source: {
          id: 'exp_123',
          source: 'Updated text only',
          created: '2025-01-21T12:00:00Z',
        },
        updatedFields: ['source'],
        embeddingsRegenerated: false,
      };

      mockEnrichService.enrichSource.mockResolvedValue(mockResult);

      const result = await handler.handle(input);

      expect(result.isError).toBeFalsy();
      expect(result.content).toHaveLength(1); // No guidance for non-quality updates
      expect(result.content[0]).toEqual({
        type: 'text',
        text: 'Reconsidered successfully',
      });
    });

    it('should return error when service throws', async () => {
      const input: ReconsiderInput = {
        reconsiderations: [
          {
            id: 'exp_123',
            source: 'Updated text',
          },
        ],
      };

      mockEnrichService.enrichSource.mockRejectedValue(new Error('Service error'));

      const result = await handler.handle(input);

      expect(result.isError).toBe(true);
      expect(result.content[0]).toEqual({
        type: 'text',
        text: 'Service error',
      });
    });

    it('should return generic error for non-Error throws', async () => {
      const input: ReconsiderInput = {
        reconsiderations: [
          {
            id: 'exp_123',
            source: 'Updated text',
          },
        ],
      };

      mockEnrichService.enrichSource.mockRejectedValue('String error');

      const result = await handler.handle(input);

      expect(result.isError).toBe(true);
      expect(result.content[0]).toEqual({
        type: 'text',
        text: 'Unknown error',
      });
    });

    it('should catch and handle formatting errors', async () => {
      const input: ReconsiderInput = {
        reconsiderations: [
          {
            id: 'exp_123',
            source: 'Updated text',
          },
        ],
      };

      // Mock formatReconsiderResponse to throw
      mockEnrichService.enrichSource.mockResolvedValue({
        source: { id: 'exp_123', source: 'Updated', created: '2025-01-21T12:00:00Z' },
        updatedFields: ['source'],
        embeddingsRegenerated: false,
      });
      mockFormatReconsiderResponse.mockImplementation(() => {
        throw new Error('Formatting error');
      });

      const result = await handler.handle(input);

      // The error is caught by handleRegularReconsider's try-catch
      expect(result.isError).toBe(true);
      expect(result.content[0]).toEqual({
        type: 'text',
        text: 'Formatting error',
      });
    });
  });

  describe('handleRegularReconsider', () => {
    it('should validate single reconsideration requires ID', async () => {
      const input: ReconsiderInput = {
        reconsiderations: [
          {
            source: 'Updated text',
            experience: ['mood.open'],
            // Missing id
          } as any,
        ],
      };

      const result = await handler.handle(input);

      expect(result.isError).toBe(true);
      expect(result.content[0]).toEqual({
        type: 'text',
        text: 'Each reconsideration item must have an ID',
      });
    });

    it('should validate batch reconsiderations require IDs', async () => {
      const input: ReconsiderInput = {
        reconsiderations: [
          {
            id: 'exp_1',
            source: 'Updated text 1',
          },
          {
            id: 'exp_2',
            source: 'Updated text 2',
          },
        ],
      };

      // Mock the enrichSource calls for batch processing
      const mockResults: EnrichResult[] = [
        {
          source: {
            id: 'exp_1',
            source: 'Updated text 1',
            created: '2025-01-21T12:00:00Z',
          },
          updatedFields: ['source'],
          embeddingsRegenerated: false,
        },
        {
          source: {
            id: 'exp_2',
            source: 'Updated text 2',
            created: '2025-01-21T12:00:00Z',
          },
          updatedFields: ['source'],
          embeddingsRegenerated: false,
        },
      ];

      mockEnrichService.enrichSource
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1]);

      const result = await handler.handle(input);

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('✅ 2 experiences updated successfully!');
      expect(result.content[0].text).toContain('📝 Updated: exp_1');
      expect(result.content[0].text).toContain('📝 Updated: exp_2');
    });

    it('should handle empty batch reconsiderations gracefully', async () => {
      const input: ReconsiderInput = {
        reconsiderations: [],
      };

      const result = await handler.handle(input);

      expect(result.isError).toBe(true);
      expect(result.content[0]).toEqual({
        type: 'text',
        text: 'Reconsiderations array is required',
      });
    });

    it('should pass undefined for missing optional fields', async () => {
      const input: ReconsiderInput = {
        reconsiderations: [
          {
            id: 'exp_123',
            source: 'Updated text',
            // No optional fields provided
          },
        ],
      };

      const mockResult: EnrichResult = {
        source: {
          id: 'exp_123',
          source: 'Updated text',
          created: '2025-01-21T12:00:00Z',
        },
        updatedFields: ['source'],
        embeddingsRegenerated: false,
      };

      mockEnrichService.enrichSource.mockResolvedValue(mockResult);

      await handler.handle(input);

      expect(mockEnrichService.enrichSource).toHaveBeenCalledWith({
        id: 'exp_123',
        source: 'Updated text',
        perspective: undefined,
        experiencer: undefined,
        processing: undefined,
        crafted: undefined,
        experience: undefined,
        reflects: undefined,
      });
    });

    it('should handle experience as empty array', async () => {
      const input: ReconsiderInput = {
        reconsiderations: [
          {
            id: 'exp_123',
            source: 'Updated text',
            experience: [],
          },
        ],
      };

      const mockResult: EnrichResult = {
        source: {
          id: 'exp_123',
          source: 'Updated text',
          created: '2025-01-21T12:00:00Z',
          experience: [],
        },
        updatedFields: ['source', 'experience'],
        embeddingsRegenerated: false,
      };

      mockEnrichService.enrichSource.mockResolvedValue(mockResult);

      await handler.handle(input);

      expect(mockEnrichService.enrichSource).toHaveBeenCalledWith({
        id: 'exp_123',
        source: 'Updated text',
        experience: [],
        perspective: undefined,
        experiencer: undefined,
        processing: undefined,
        crafted: undefined,
        reflects: undefined,
      });
    });
  });

  describe('selectReconsiderGuidance', () => {
    it('should provide guidance when qualities are updated', async () => {
      const input: ReconsiderInput = {
        reconsiderations: [
          {
            id: 'exp_123',
            source: 'Updated text',
            experience: ['mood.open', 'embodied.thinking'],
          },
        ],
      };

      const mockResult: EnrichResult = {
        source: {
          id: 'exp_123',
          source: 'Updated text',
          created: '2025-01-21T12:00:00Z',
          experience: ['mood.open', 'embodied.thinking'],
        },
        updatedFields: ['source', 'experience'],
        embeddingsRegenerated: false,
      };

      mockEnrichService.enrichSource.mockResolvedValue(mockResult);

      const result = await handler.handle(input);

      expect(result.content).toHaveLength(2);
      expect(result.content[1]).toEqual({
        type: 'text',
        text: 'Updated. See connections with recall',
      });
    });

    it('should not provide guidance when no qualities', async () => {
      const input: ReconsiderInput = {
        reconsiderations: [
          {
            id: 'exp_123',
            source: 'Updated text',
          },
        ],
      };

      const mockResult: EnrichResult = {
        source: {
          id: 'exp_123',
          source: 'Updated text',
          created: '2025-01-21T12:00:00Z',
        },
        updatedFields: ['source'],
        embeddingsRegenerated: false,
      };

      mockEnrichService.enrichSource.mockResolvedValue(mockResult);

      const result = await handler.handle(input);

      expect(result.content).toHaveLength(1);
    });

    it('should not provide guidance when qualities are empty', async () => {
      const input: ReconsiderInput = {
        id: 'exp_123',
        source: 'Updated text',
        experience: [],
      };

      const mockResult: EnrichResult = {
        source: {
          id: 'exp_123',
          source: 'Updated text',
          created: '2025-01-21T12:00:00Z',
          experience: [],
        },
        updatedFields: ['source', 'experience'],
        embeddingsRegenerated: false,
      };

      mockEnrichService.enrichSource.mockResolvedValue(mockResult);

      const result = await handler.handle(input);

      expect(result.content).toHaveLength(1);
    });
  });

  describe('release mode', () => {
    let mockDeleteSource: jest.MockedFunction<typeof storage.deleteSource>;

    beforeEach(() => {
      // Mock deleteSource from storage
      mockDeleteSource = jest.mocked(storage.deleteSource);
      mockDeleteSource.mockResolvedValue(undefined);
    });

    it('should handle single release with reason', async () => {
      const input: ReconsiderInput = {
        reconsiderations: [
          {
            id: 'exp_123',
            release: true,
            releaseReason: 'Test data during development',
          },
        ],
      };

      const result = await handler.handle(input);

      expect(mockDeleteSource).toHaveBeenCalledWith('exp_123');
      expect(result.isError).toBeFalsy();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain('Experience released with gratitude');
      expect(result.content[0].text).toContain('exp_123');
      expect(result.content[0].text).toContain('Test data during development');
    });

    it('should handle single release without reason', async () => {
      const input: ReconsiderInput = {
        reconsiderations: [
          {
            id: 'exp_456',
            release: true,
          },
        ],
      };

      const result = await handler.handle(input);

      expect(mockDeleteSource).toHaveBeenCalledWith('exp_456');
      expect(result.content[0].text).toContain('No reason provided');
    });

    it('should handle batch releases', async () => {
      const input: ReconsiderInput = {
        reconsiderations: [
          { id: 'exp_1', release: true, releaseReason: 'Cleanup' },
          { id: 'exp_2', release: true },
          { id: 'exp_3', release: true, releaseReason: 'Duplicate' },
        ],
      };

      const result = await handler.handle(input);

      expect(mockDeleteSource).toHaveBeenCalledTimes(3);
      expect(mockDeleteSource).toHaveBeenCalledWith('exp_1');
      expect(mockDeleteSource).toHaveBeenCalledWith('exp_2');
      expect(mockDeleteSource).toHaveBeenCalledWith('exp_3');

      expect(result.content[0].text).toContain('3 experiences released with gratitude');
      expect(result.content[0].text).toContain('exp_1 (Cleanup)');
      expect(result.content[0].text).toContain('exp_2');
      expect(result.content[0].text).toContain('exp_3 (Duplicate)');
    });

    it('should handle mixed operations (updates and releases)', async () => {
      const input: ReconsiderInput = {
        reconsiderations: [
          { id: 'exp_1', source: 'Updated text' },
          { id: 'exp_2', release: true, releaseReason: 'No longer relevant' },
          { id: 'exp_3', experience: ['mood.open'] },
        ],
      };

      const mockResult1: EnrichResult = {
        source: {
          id: 'exp_1',
          source: 'Updated text',
          created: '2025-01-21T12:00:00Z',
        },
        updatedFields: ['source'],
        embeddingsRegenerated: false,
      };

      const mockResult3: EnrichResult = {
        source: {
          id: 'exp_3',
          source: 'Original text',
          created: '2025-01-21T12:00:00Z',
          experience: ['mood.open'],
        },
        updatedFields: ['experience'],
        embeddingsRegenerated: false,
      };

      mockEnrichService.enrichSource
        .mockResolvedValueOnce(mockResult1)
        .mockResolvedValueOnce(mockResult3);

      const result = await handler.handle(input);

      expect(mockEnrichService.enrichSource).toHaveBeenCalledTimes(2);
      expect(mockDeleteSource).toHaveBeenCalledTimes(1);
      expect(mockDeleteSource).toHaveBeenCalledWith('exp_2');

      expect(result.content[0].text).toContain('2 experiences updated successfully');
      expect(result.content[0].text).toContain('1 experiences released with gratitude');
      expect(result.content[0].text).toContain('exp_2 (No longer relevant)');
    });

    it('should handle release errors gracefully', async () => {
      const input: ReconsiderInput = {
        reconsiderations: [
          {
            id: 'exp_999',
            release: true,
          },
        ],
      };

      mockDeleteSource.mockRejectedValue(new Error('Experience not found'));

      const result = await handler.handle(input);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Experience not found');
    });
  });
});
