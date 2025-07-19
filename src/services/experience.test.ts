import { ExperienceService, experienceSchema } from './experience.js';

describe('ExperienceService', () => {
  let experienceService: ExperienceService;

  beforeEach(() => {
    experienceService = new ExperienceService();
  });

  describe('captureExperience', () => {
    it('should experience a basic experience successfully', async () => {
      const input = {
        source: 'Test experience',
        experiencer: 'test_user'
      };

      const result = await experienceService.captureExperience(input);

      expect(result.source.source).toBe('Test experience');
      expect(result.source.experiencer).toBe('test_user');
      expect(result.source.id).toBeDefined();
      expect(result.source.created).toBeDefined();
    });

    it('should use defaults when optional fields are not provided', async () => {
      const experienceService = new ExperienceService();
      const input = {};

      const result = await experienceService.captureExperience(input);

      expect(result.source.perspective).toBe('I');
      expect(result.source.experiencer).toBe('self');
      expect(result.source.processing).toBe('during');
      expect(result.source.crafted).toBe(false);
      expect(result.defaultsUsed).toContain('perspective="I"');
      expect(result.defaultsUsed).toContain('experiencer="self"');
      expect(result.defaultsUsed).toContain('processing="during"');
    });

    it('should use default source when not provided', async () => {
      const input = { experiencer: 'test_user' };

      const result = await experienceService.captureExperience(input);

      expect(result.source.source).toBe('Experience experienceed');
      expect(result.defaultsUsed).toContain('source="Experience experienceed"');
    });

    it('should generate embeddings for experienceed experiences', async () => {
      const input = {
        source: 'Test experience for embedding',
        experiencer: 'test_user'
      };

      const result = await experienceService.captureExperience(input);

      expect(result.source.id).toBeDefined();
      // Note: Embedding generation is tested separately
    });

    it('should handle experience qualities when provided', async () => {
      const input = {
        source: 'Test experience',
        experiencer: 'test_user',
        experience: ['mood.open', 'embodied.sensing', 'purpose.goal']
      };

      const result = await experienceService.captureExperience(input);

      expect(result.source.experience).toEqual(['mood.open', 'embodied.sensing', 'purpose.goal']);
    });

    it('should handle empty experience array', async () => {
      const input = {
        source: 'Test experience',
        experiencer: 'test_user',
        experience: []
      };

      const result = await experienceService.captureExperience(input);

      expect(result.source.experience).toBeUndefined();
    });
  });

  describe('experienceSchema', () => {
    it('should validate valid input', () => {
      const input = {
        source: 'Test experience',
        experiencer: 'test_user',
        perspective: 'I',
        processing: 'during',
        crafted: false,
        experience: ['mood.open', 'embodied.thinking']
      };

      expect(() => experienceSchema.parse(input)).not.toThrow();
    });

    it('should validate input with optional fields', () => {
      const input = {
        source: 'Test experience'
      };

      expect(() => experienceSchema.parse(input)).not.toThrow();
    });
  });
});