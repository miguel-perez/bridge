/**
 * Tests for MCP Reconsider Tool Handler
 */

import { ReconsiderHandler } from './reconsider-handler.js';
import { EnrichService } from '../services/enrich.js';
import { formatReconsiderResponse } from '../utils/formatters.js';
import type { ReconsiderInput } from './schemas.js';
import type { ExperienceResult } from '../utils/formatters.js';

// Mock dependencies
jest.mock('../services/enrich.js');
jest.mock('../utils/formatters.js');

describe('ReconsiderHandler', () => {
  let handler: ReconsiderHandler;
  let mockEnrichService: jest.Mocked<EnrichService>;
  let mockFormatReconsiderResponse: jest.MockedFunction<typeof formatReconsiderResponse>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock EnrichService
    mockEnrichService = {
      enrichSource: jest.fn()
    } as jest.Mocked<EnrichService>;
    (EnrichService as jest.MockedClass<typeof EnrichService>).mockImplementation(() => mockEnrichService);
    
    // Mock formatters
    mockFormatReconsiderResponse = formatReconsiderResponse as jest.MockedFunction<typeof formatReconsiderResponse>;
    mockFormatReconsiderResponse.mockReturnValue('Reconsidered successfully');
    
    handler = new ReconsiderHandler();
  });

  describe('handle', () => {
    it('should handle single reconsideration successfully', async () => {
      const input: ReconsiderInput = {
        id: 'exp_123',
        source: 'Updated text',
        experience: ['mood.open']
      };

      const mockResult: ExperienceResult = {
        source: {
          id: 'exp_123',
          source: 'Updated text',
          created: '2025-01-21T12:00:00Z',
          experience: ['mood.open']
        }
      };

      mockEnrichService.enrichSource.mockResolvedValue(mockResult);

      const result = await handler.handle(input);

      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(2); // Response + guidance
      expect(result.content[0]).toEqual({
        type: 'text',
        text: 'Reconsidered successfully'
      });
      expect(result.content[1]).toEqual({
        type: 'text',
        text: 'Updated. See connections with recall'
      });
    });

    it('should handle batch reconsiderations', async () => {
      const input: ReconsiderInput = {
        reconsiderations: [
          {
            id: 'exp_1',
            source: 'Updated text 1',
            experience: ['mood.open']
          },
          {
            id: 'exp_2',
            source: 'Updated text 2',
            experience: ['embodied.sensing']
          }
        ]
      };

      const mockResults: ExperienceResult[] = [
        {
          source: {
            id: 'exp_1',
            source: 'Updated text 1',
            created: '2025-01-21T12:00:00Z',
            experience: ['mood.open']
          }
        },
        {
          source: {
            id: 'exp_2',
            source: 'Updated text 2',
            created: '2025-01-21T12:00:00Z',
            experience: ['embodied.sensing']
          }
        }
      ];

      mockEnrichService.enrichSource
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1]);

      const result = await handler.handle(input);

      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      const text = result.content[0].text;
      expect(text).toContain('✅ 2 experiences reconsidered');
      expect(text).toContain('--- Experience 1 ---');
      expect(text).toContain('--- Experience 2 ---');
      expect(text).toContain('📝 ID: exp_1');
      expect(text).toContain('📝 ID: exp_2');
    });

    it('should handle reconsideration with all fields', async () => {
      const input: ReconsiderInput = {
        id: 'exp_123',
        source: 'Updated text',
        perspective: 'we',
        experiencer: 'Team',
        processing: 'long-after',
        crafted: true,
        experience: ['presence.collective']
      };

      const mockResult: ExperienceResult = {
        source: {
          id: 'exp_123',
          source: 'Updated text',
          created: '2025-01-21T12:00:00Z',
          perspective: 'we',
          experiencer: 'Team',
          processing: 'long-after',
          crafted: true,
          experience: ['presence.collective']
        }
      };

      mockEnrichService.enrichSource.mockResolvedValue(mockResult);

      const result = await handler.handle(input);

      expect(mockEnrichService.enrichSource).toHaveBeenCalledWith({
        id: 'exp_123',
        source: 'Updated text',
        perspective: 'we',
        experiencer: 'Team',
        processing: 'long-after',
        crafted: true,
        experience: ['presence.collective']
      });
      expect(result.isError).toBeUndefined();
    });

    it('should handle reconsideration without experience qualities', async () => {
      const input: ReconsiderInput = {
        id: 'exp_123',
        source: 'Updated text only'
      };

      const mockResult: ExperienceResult = {
        source: {
          id: 'exp_123',
          source: 'Updated text only',
          created: '2025-01-21T12:00:00Z'
        }
      };

      mockEnrichService.enrichSource.mockResolvedValue(mockResult);

      const result = await handler.handle(input);

      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1); // No guidance for non-quality updates
      expect(result.content[0]).toEqual({
        type: 'text',
        text: 'Reconsidered successfully'
      });
    });

    it('should return error when service throws', async () => {
      const input: ReconsiderInput = {
        id: 'exp_123',
        source: 'Updated text'
      };

      mockEnrichService.enrichSource.mockRejectedValue(new Error('Service error'));

      const result = await handler.handle(input);

      expect(result.isError).toBe(true);
      expect(result.content[0]).toEqual({
        type: 'text',
        text: 'Service error'
      });
    });

    it('should return generic error for non-Error throws', async () => {
      const input: ReconsiderInput = {
        id: 'exp_123',
        source: 'Updated text'
      };

      mockEnrichService.enrichSource.mockRejectedValue('String error');

      const result = await handler.handle(input);

      expect(result.isError).toBe(true);
      expect(result.content[0]).toEqual({
        type: 'text',
        text: 'Unknown error'
      });
    });

    it('should catch and handle formatting errors', async () => {
      const input: ReconsiderInput = {
        id: 'exp_123',
        source: 'Updated text'
      };

      // Mock formatReconsiderResponse to throw
      mockEnrichService.enrichSource.mockResolvedValue({
        source: { id: 'exp_123', source: 'Updated', created: '2025-01-21T12:00:00Z' }
      });
      mockFormatReconsiderResponse.mockImplementation(() => {
        throw new Error('Formatting error');
      });

      const result = await handler.handle(input);

      // The error is caught by handleRegularReconsider's try-catch
      expect(result.isError).toBe(true);
      expect(result.content[0]).toEqual({
        type: 'text',
        text: 'Formatting error'
      });
    });
  });

  describe('handleRegularReconsider', () => {
    it('should validate single reconsideration requires ID', async () => {
      const input: ReconsiderInput = {
        source: 'Updated text',
        experience: ['mood.open']
        // Missing id
      };

      const result = await handler.handle(input);

      expect(result.isError).toBe(true);
      expect(result.content[0]).toEqual({
        type: 'text',
        text: 'ID is required for reconsideration'
      });
    });

    it('should validate batch reconsiderations require IDs', async () => {
      const input: ReconsiderInput = {
        reconsiderations: [
          {
            id: 'exp_1',
            source: 'Updated text 1'
          },
          {
            // Missing id
            source: 'Updated text 2'
          }
        ]
      };

      const result = await handler.handle(input);

      expect(result.isError).toBe(true);
      expect(result.content[0]).toEqual({
        type: 'text',
        text: 'Each reconsideration item must have an ID'
      });
    });

    it('should handle empty batch reconsiderations gracefully', async () => {
      const input: ReconsiderInput = {
        reconsiderations: []
      };

      const result = await handler.handle(input);

      expect(result.isError).toBe(true);
      expect(result.content[0]).toEqual({
        type: 'text',
        text: 'ID is required for reconsideration'
      });
    });

    it('should pass undefined for missing optional fields', async () => {
      const input: ReconsiderInput = {
        id: 'exp_123',
        source: 'Updated text'
        // No optional fields provided
      };

      const mockResult: ExperienceResult = {
        source: {
          id: 'exp_123',
          source: 'Updated text',
          created: '2025-01-21T12:00:00Z'
        }
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
        experience: undefined
      });
    });

    it('should handle experience as empty array', async () => {
      const input: ReconsiderInput = {
        id: 'exp_123',
        source: 'Updated text',
        experience: []
      };

      const mockResult: ExperienceResult = {
        source: {
          id: 'exp_123',
          source: 'Updated text',
          created: '2025-01-21T12:00:00Z',
          experience: []
        }
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
        experience: []
      });
    });
  });

  describe('selectReconsiderGuidance', () => {
    it('should provide guidance when qualities are updated', async () => {
      const input: ReconsiderInput = {
        id: 'exp_123',
        source: 'Updated text',
        experience: ['mood.open', 'embodied.thinking']
      };

      const mockResult: ExperienceResult = {
        source: {
          id: 'exp_123',
          source: 'Updated text',
          created: '2025-01-21T12:00:00Z',
          experience: ['mood.open', 'embodied.thinking']
        }
      };

      mockEnrichService.enrichSource.mockResolvedValue(mockResult);

      const result = await handler.handle(input);

      expect(result.content).toHaveLength(2);
      expect(result.content[1]).toEqual({
        type: 'text',
        text: 'Updated. See connections with recall'
      });
    });

    it('should not provide guidance when no qualities', async () => {
      const input: ReconsiderInput = {
        id: 'exp_123',
        source: 'Updated text'
      };

      const mockResult: ExperienceResult = {
        source: {
          id: 'exp_123',
          source: 'Updated text',
          created: '2025-01-21T12:00:00Z'
        }
      };

      mockEnrichService.enrichSource.mockResolvedValue(mockResult);

      const result = await handler.handle(input);

      expect(result.content).toHaveLength(1);
    });

    it('should not provide guidance when qualities are empty', async () => {
      const input: ReconsiderInput = {
        id: 'exp_123',
        source: 'Updated text',
        experience: []
      };

      const mockResult: ExperienceResult = {
        source: {
          id: 'exp_123',
          source: 'Updated text',
          created: '2025-01-21T12:00:00Z',
          experience: []
        }
      };

      mockEnrichService.enrichSource.mockResolvedValue(mockResult);

      const result = await handler.handle(input);

      expect(result.content).toHaveLength(1);
    });
  });
});