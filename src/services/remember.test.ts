import { RememberService, rememberSchema } from './remember.js';

describe('RememberService', () => {
  let rememberService: RememberService;

  beforeEach(() => {
    rememberService = new RememberService();
  });

  describe('rememberSource', () => {
    it('should remember a basic experience successfully', async () => {
      const input = {
        content: 'Test experience',
        experiencer: 'test_user'
      };

      const result = await rememberService.rememberSource(input);

      expect(result.source.source).toBe('Test experience');
      expect(result.source.experiencer).toBe('test_user');
      expect(result.source.id).toBeDefined();
      expect(result.source.created).toBeDefined();
    });

    it('should use defaults when optional fields are not provided', async () => {
      const rememberService = new RememberService();
      const input = {};

      const result = await rememberService.rememberSource(input);

      expect(result.source.perspective).toBe('I');
      expect(result.source.experiencer).toBe('self');
      expect(result.source.processing).toBe('during');
      expect(result.source.crafted).toBe(false);
      expect(result.defaultsUsed).toContain('perspective="I"');
      expect(result.defaultsUsed).toContain('experiencer="self"');
      expect(result.defaultsUsed).toContain('processing="during"');
    });

    it('should use default content when not provided', async () => {
      const input = { experiencer: 'test_user' };

      const result = await rememberService.rememberSource(input);

      expect(result.source.source).toBe('Experience remembered');
      expect(result.defaultsUsed).toContain('content="Experience remembered"');
    });

    it('should generate embeddings for remembered experiences', async () => {
      const input = {
        content: 'Test experience for embedding',
        experiencer: 'test_user'
      };

      const result = await rememberService.rememberSource(input);

      expect(result.source.id).toBeDefined();
      // Note: Embedding generation is tested separately
    });

    it('should handle experience qualities when provided', async () => {
      const input = {
        content: 'Test experience',
        experiencer: 'test_user',
        experience: ['emotion', 'body', 'purpose']
      };

      const result = await rememberService.rememberSource(input);

      expect(result.source.experience).toEqual(['emotion', 'body', 'purpose']);
    });

    it('should handle empty experience array', async () => {
      const input = {
        content: 'Test experience',
        experiencer: 'test_user',
        experience: []
      };

      const result = await rememberService.rememberSource(input);

      expect(result.source.experience).toBeUndefined();
    });
  });

  describe('rememberSchema', () => {
    it('should validate valid input', () => {
      const input = {
        content: 'Test experience',
        experiencer: 'test_user',
        perspective: 'I',
        processing: 'during',
        crafted: false,
        experience: ['emotion', 'body']
      };

      expect(() => rememberSchema.parse(input)).not.toThrow();
    });

    it('should validate input with optional fields', () => {
      const input = {
        content: 'Test experience'
      };

      expect(() => rememberSchema.parse(input)).not.toThrow();
    });
  });
});