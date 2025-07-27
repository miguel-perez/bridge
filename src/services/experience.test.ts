import { ExperienceService, experienceSchema, type ExperienceInput } from './experience.js';
import { embeddingService } from './embeddings.js';
import { saveEmbedding, saveSource } from '../core/storage.js';

// Mock the embeddings service
jest.mock('./embeddings.js');
jest.mock('../core/storage.js', () => ({
  ...jest.requireActual('../core/storage.js'),
  saveEmbedding: jest.fn(),
  saveSource: jest.fn(),
}));

// Type the mocks
const mockSaveSource = saveSource as jest.MockedFunction<typeof saveSource>;
const mockSaveEmbedding = saveEmbedding as jest.MockedFunction<typeof saveEmbedding>;
const mockEmbeddingService = embeddingService as jest.Mocked<typeof embeddingService>;

describe('ExperienceService', () => {
  let experienceService: ExperienceService;

  beforeEach(() => {
    jest.clearAllMocks();
    experienceService = new ExperienceService();

    // Setup default mock behavior
    mockSaveSource.mockImplementation(async (source) => source);
    mockSaveEmbedding.mockResolvedValue(undefined);
    mockEmbeddingService.initialize.mockResolvedValue(undefined);
    mockEmbeddingService.generateEmbedding.mockResolvedValue(new Array(384).fill(0));
  });

  describe('rememberExperience', () => {
    it('should experience a basic experience successfully', async () => {
      const input = {
        source: 'Test experience',
        emoji: '🧪',
        who: 'test_user',
      };

      const result = await experienceService.rememberExperience(input);

      expect(result.source.source).toBe('Test experience');
      expect(result.source.who).toBe('test_user');
      expect(result.source.id).toBeDefined();
      expect(result.source.created).toBeDefined();
    });

    it('should use defaults when optional fields are not provided', async () => {
      const experienceService = new ExperienceService();
      const input = {
        emoji: '💭',
      };

      const result = await experienceService.rememberExperience(input);

      expect(result.source.who).toBe('self');
      expect(result.defaultsUsed).toContain('who="self"');
    });

    it('should use default source when not provided', async () => {
      const input = {
        emoji: '💭',
        who: 'test_user',
      };

      const result = await experienceService.rememberExperience(input);

      expect(result.source.source).toBe('Experience experienced');
      expect(result.defaultsUsed).toContain('source="Experience experienced"');
    });

    it('should generate embeddings for experienceed experiences', async () => {
      const input = {
        source: 'Test experience for embedding',
        emoji: '🔤',
        who: 'test_user',
      };

      const result = await experienceService.rememberExperience(input);

      expect(result.source.id).toBeDefined();
      // Note: Embedding generation is tested separately
    });

    it('should handle experience qualities when provided', async () => {
      const input = {
        source: 'Test experience',
        emoji: '✨',
        who: 'test_user',
        experience: {
          embodied: 'sensing',
          focus: false,
          mood: 'open',
          purpose: 'goal',
          space: false,
          time: false,
          presence: false
        },
      };

      const result = await experienceService.rememberExperience(input);

      // Check that experienceQualities matches the input
      expect(result.source.experienceQualities).toEqual(input.experience);
    });

    it('should handle all false experience qualities', async () => {
      const input = {
        source: 'Test experience',
        emoji: '💭',
        who: 'test_user',
        experience: {
          embodied: false,
          focus: false,
          mood: false,
          purpose: false,
          space: false,
          time: false,
          presence: false
        },
      };

      const result = await experienceService.rememberExperience(input);

      expect(result.source.experienceQualities).toEqual(input.experience);
    });

    it('should handle embedding generation failure gracefully', async () => {
      // Mock embedding service to throw an error
      mockEmbeddingService.generateEmbedding.mockRejectedValue(
        new Error('Embedding generation failed')
      );

      const input = {
        source: 'Test experience with embedding failure',
        emoji: '🆘',
        who: 'test_user',
      };

      // Should not throw error even if embedding fails
      const result = await experienceService.rememberExperience(input);

      expect(result.source.source).toBe('Test experience with embedding failure');
      expect(result.source.who).toBe('test_user');
      expect(result.source.id).toBeDefined();

      // Verify embedding was attempted but saveEmbedding was not called
      expect(mockEmbeddingService.initialize).toHaveBeenCalled();
      expect(mockEmbeddingService.generateEmbedding).toHaveBeenCalled();
      expect(saveEmbedding).not.toHaveBeenCalled();
    });

    it('should include context in source and embedding when provided', async () => {
      // Use the already configured mocks

      const input: ExperienceInput = {
        source: 'I feel anxious',
        emoji: '😰',
        experience: {
          embodied: 'sensing',
          focus: false,
          mood: 'closed',
          purpose: false,
          space: false,
          time: false,
          presence: false
        },
        context: 'Before an important presentation',
      };

      const result = await experienceService.rememberExperience(input);

      expect(result.source.context).toBe('Before an important presentation');
      expect(mockEmbeddingService.generateEmbedding).toHaveBeenCalledWith(
        'Context: Before an important presentation. "I feel anxious" [embodied.sensing, mood.closed]'
      );
    });
  });

  describe('experienceSchema', () => {
    it('should validate valid input', () => {
      const input = {
        source: 'Test experience',
        emoji: '🧪',
        who: 'test_user',
        experience: {"embodied":"thinking","focus":false,"mood":"open","purpose":false,"space":false,"time":false,"presence":false},
      };

      expect(() => experienceSchema.parse(input)).not.toThrow();
    });

    it('should validate input with context field', () => {
      const input = {
        source: 'Test experience',
        emoji: '🧪',
        context: 'During a team meeting discussing project milestones',
      };

      expect(() => experienceSchema.parse(input)).not.toThrow();
    });

    it('should validate input with optional fields', () => {
      const input = {
        source: 'Test experience',
        emoji: '🧪',
      };

      expect(() => experienceSchema.parse(input)).not.toThrow();
    });
  });
});
