/**
 * Tests for Streamlined Experience Service
 */

import { ExperienceService, experienceSchema, type ExperienceInput } from './experience.js';
import { embeddingService } from './embeddings.js';
import { saveEmbedding, saveSource } from '../core/storage.js';

// Mock the embeddings service
jest.mock('./embeddings.js');
jest.mock('../core/storage.js', () => ({
  ...jest.requireActual('../core/storage.js'),
  saveEmbedding: jest.fn(),
  saveSource: jest.fn(),
  generateExperienceId: jest.fn(() => 'exp_test123'),
}));

// Type the mocks
const mockSaveSource = saveSource as jest.MockedFunction<typeof saveSource>;
const mockSaveEmbedding = saveEmbedding as jest.MockedFunction<typeof saveEmbedding>;
const mockEmbeddingService = embeddingService as jest.Mocked<typeof embeddingService>;

describe('ExperienceService', () => {
  let service: ExperienceService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ExperienceService();

    // Setup default mock behavior
    mockSaveSource.mockImplementation(async (source) => source);
    mockSaveEmbedding.mockResolvedValue(undefined);
    mockEmbeddingService.initialize.mockResolvedValue(undefined);
    mockEmbeddingService.generateEmbedding.mockResolvedValue(new Array(384).fill(0));
  });

  describe('captureExperience', () => {
    it('should capture a complete experience successfully', async () => {
      const input: ExperienceInput = {
        anchor: '🧪',
        embodied: 'feeling energized and focused',
        focus: 'on writing these tests',
        mood: 'determined and methodical',
        purpose: 'ensuring code quality',
        space: 'at my desk in the office',
        time: 'this Tuesday afternoon',
        presence: 'working alongside Claude',
        who: ['Human', 'Claude'],
        citation: 'Testing the streamlined experience capture'
      };

      const result = await service.captureExperience(input);

      expect(result.experience).toMatchObject({
        id: expect.stringMatching(/^exp_/),
        created: expect.any(String),
        ...input
      });
      expect(result.embedding).toBe(true);

      // Verify storage was called with flat format
      expect(mockSaveSource).toHaveBeenCalledWith({
        id: result.experience.id,
        created: result.experience.created,
        anchor: '🧪',
        embodied: 'feeling energized and focused',
        focus: 'on writing these tests',
        mood: 'determined and methodical',
        purpose: 'ensuring code quality',
        space: 'at my desk in the office',
        time: 'this Tuesday afternoon',
        presence: 'working alongside Claude',
        who: ['Human', 'Claude'],
        citation: 'Testing the streamlined experience capture'
      });

      // Verify embedding was generated from concatenated qualities
      expect(mockEmbeddingService.generateEmbedding).toHaveBeenCalledWith(
        expect.stringContaining('feeling energized and focused')
      );
    });

    it('should capture experience without citation', async () => {
      const input: ExperienceInput = {
        anchor: '💭',
        embodied: 'mind wandering freely',
        focus: 'drifting between ideas',
        mood: 'open and curious',
        purpose: 'exploring possibilities',
        space: 'in a quiet corner',
        time: 'early morning',
        presence: 'thinking with Claude',
        who: ['Alex', 'Claude']
      };

      const result = await service.captureExperience(input);

      expect(result.experience.citation).toBeUndefined();
      
      // Storage should not have citation field
      expect(mockSaveSource).toHaveBeenCalledWith(
        expect.not.objectContaining({
          citation: expect.anything()
        })
      );
    });

    it('should handle embedding generation failure gracefully', async () => {
      mockEmbeddingService.generateEmbedding.mockRejectedValue(new Error('API error'));

      const input: ExperienceInput = {
        anchor: '❌',
        embodied: 'feeling frustrated',
        focus: 'on the error',
        mood: 'annoyed but persistent',
        purpose: 'debugging the issue',
        space: 'same desk same problems',
        time: 'late at night',
        presence: 'troubleshooting with Claude',
        who: ['Developer', 'Claude']
      };

      const result = await service.captureExperience(input);

      expect(result.experience).toBeDefined();
      expect(result.embedding).toBe(false);
      expect(mockSaveSource).toHaveBeenCalled();
    });

    it('should validate who array includes AI identity', async () => {
      const input: ExperienceInput = {
        anchor: '🚫',
        embodied: 'testing validation',
        focus: 'on requirements',
        mood: 'methodical',
        purpose: 'ensuring correctness',
        space: 'in test environment',
        time: 'during testing',
        presence: 'with the system',
        who: ['Human'] // Missing AI identity
      };

      await expect(service.captureExperience(input)).rejects.toThrow();
    });

    it('should validate anchor is a single emoji', async () => {
      const input: ExperienceInput = {
        anchor: 'not-an-emoji',
        embodied: 'testing validation',
        focus: 'on emoji requirement',
        mood: 'careful',
        purpose: 'checking constraints',
        space: 'in validation land',
        time: 'during checks',
        presence: 'with Claude',
        who: ['Tester', 'Claude']
      };

      await expect(service.captureExperience(input)).rejects.toThrow();
    });

    it('should reject empty qualities', async () => {
      const input: ExperienceInput = {
        anchor: '🔍',
        embodied: '', // Empty string
        focus: 'on validation',
        mood: 'checking carefully',
        purpose: 'finding edge cases',
        space: 'in testing',
        time: 'right now',
        presence: 'with Claude',
        who: ['QA', 'Claude']
      };

      await expect(service.captureExperience(input)).rejects.toThrow();
    });
  });

  describe('experienceSchema', () => {
    it('should validate correct experience input', () => {
      const input = {
        anchor: '✅',
        embodied: 'feeling validated',
        focus: 'on schema correctness',
        mood: 'satisfied',
        purpose: 'confirming structure',
        space: 'in the codebase',
        time: 'during development',
        presence: 'pair programming with Claude',
        who: ['Developer', 'Claude'],
        citation: 'Optional citation text'
      };

      const result = experienceSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject missing required fields', () => {
      const input = {
        anchor: '❌',
        embodied: 'incomplete',
        // Missing other required fields
        who: ['Human', 'Claude']
      };

      const result = experienceSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should accept multiple AI identities', () => {
      const input = {
        anchor: '🤖',
        embodied: 'multi-AI collaboration',
        focus: 'on teamwork',
        mood: 'collaborative',
        purpose: 'working together',
        space: 'in digital space',
        time: 'during session',
        presence: 'with multiple AIs',
        who: ['Human', 'Claude', 'GPT-4']
      };

      const result = experienceSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept compound emojis', () => {
      const validEmojis = ['👨‍💻', '🏳️‍🌈', '👨‍👩‍👧‍👦', '🧑🏽‍🦱'];
      
      for (const emoji of validEmojis) {
        const input = {
          anchor: emoji,
          embodied: 'testing compound emojis',
          focus: 'on Unicode support',
          mood: 'thorough',
          purpose: 'ensuring compatibility',
          space: 'in emoji land',
          time: 'during validation',
          presence: 'with Claude',
          who: ['Tester', 'Claude']
        };

        const result = experienceSchema.safeParse(input);
        expect(result.success).toBe(true);
      }
    });
  });
});