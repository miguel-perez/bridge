import { NoneProvider } from './none-provider.js';

describe('NoneProvider', () => {
  let provider: NoneProvider;

  beforeEach(() => {
    provider = new NoneProvider();
  });

  describe('basic functionality', () => {
    it('should always be available', async () => {
      expect(await provider.isAvailable()).toBe(true);
    });

    it('should return provider name', () => {
      expect(provider.getName()).toBe('NoneProvider');
    });

    it('should return dimension of 1', () => {
      expect(provider.getDimensions()).toBe(1);
    });

    it('should initialize successfully', async () => {
      await expect(provider.initialize()).resolves.not.toThrow();
    });
  });

  describe('generateEmbedding', () => {
    it('should return zero vector', async () => {
      const embedding = await provider.generateEmbedding('test text');
      expect(embedding).toEqual([0]);
    });

    it('should validate text input', async () => {
      await expect(provider.generateEmbedding('')).rejects.toThrow(
        'Text must be a non-empty string'
      );
    });

    it('should handle long text', async () => {
      const longText = 'a'.repeat(10000);
      const embedding = await provider.generateEmbedding(longText);
      expect(embedding).toEqual([0]);
    });

    it('should be consistent across calls', async () => {
      const embedding1 = await provider.generateEmbedding('first');
      const embedding2 = await provider.generateEmbedding('second');
      const embedding3 = await provider.generateEmbedding('first');
      
      expect(embedding1).toEqual([0]);
      expect(embedding2).toEqual([0]);
      expect(embedding3).toEqual([0]);
    });
  });

  describe('edge cases', () => {
    it('should handle special characters', async () => {
      const embedding = await provider.generateEmbedding('🤖 test with émojis & spëcial chars');
      expect(embedding).toEqual([0]);
    });

    it('should handle newlines and whitespace', async () => {
      const embedding = await provider.generateEmbedding('  text\nwith\n\nnewlines  ');
      expect(embedding).toEqual([0]);
    });
  });
});