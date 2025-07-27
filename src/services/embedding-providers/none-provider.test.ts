import { NoneProvider } from './none-provider.js';

describe('NoneProvider', () => {
  let provider: NoneProvider;

  beforeEach(() => {
    provider = new NoneProvider({});
  });

  describe('basic functionality', () => {
    it('should return provider name', () => {
      expect(provider.getName()).toBe('None');
    });

    it('should return dimension of 1', () => {
      expect(provider.getDimensions()).toBe(1);
    });

    it('should always be available', async () => {
      expect(await provider.isAvailable()).toBe(true);
    });
  });

  describe('initialization', () => {
    it('should initialize without errors', async () => {
      await expect(provider.initialize()).resolves.not.toThrow();
    });

  });

  describe('generateEmbedding', () => {
    beforeEach(async () => {
      await provider.initialize();
    });

    it('should generate zero vector', async () => {
      const embedding = await provider.generateEmbedding('test text');
      expect(embedding).toEqual([0]);
    });

    it('should validate empty text', async () => {
      await expect(provider.generateEmbedding('')).rejects.toThrow('Text cannot be empty');
    });

    it('should work with any text input', async () => {
      const texts = [
        'Short text',
        'A much longer text with multiple words and sentences.',
        '🚀 Text with emojis! 🎉',
        'Text\nwith\nnewlines',
      ];

      for (const text of texts) {
        const embedding = await provider.generateEmbedding(text);
        expect(embedding).toEqual([0]);
      }
    });
  });

  describe('cleanup', () => {
    it('should cleanup without errors', async () => {
      await provider.initialize();
      await expect(provider.cleanup()).resolves.not.toThrow();
    });
  });
});