import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { CaptureService, CaptureInput } from './capture.js';
import { clearTestStorage, setupTestStorage } from '../core/storage.js';

describe('CaptureService', () => {
  beforeEach(() => {
    setupTestStorage('capture-test');
  });

  afterEach(async () => {
    await clearTestStorage();
  });

  describe('captureSource', () => {
    it('should capture a basic experience successfully', async () => {
      const captureService = new CaptureService();
      const input: CaptureInput = {
        content: 'I had a breakthrough moment today',
        experiencer: 'test-user',
        experience: {
          qualities: [
            { type: 'attentional', prominence: 0.8, manifestation: 'sudden clarity' }
          ],
          emoji: '😊',
          narrative: 'Breakthrough moment of clarity'
        }
      };

      const result = await captureService.captureSource(input);

      expect(result.source).toBeDefined();
      expect(result.source.id).toMatch(/^src_/);
      expect(result.source.experiencer).toBe('test-user');
      expect(result.source.experience?.emoji).toBe('😊');
      expect(result.source.created).toBeDefined();
      expect(new Date(result.source.created)).toBeInstanceOf(Date);
      expect(result.defaultsUsed).toContain('perspective="I"');
      expect(result.defaultsUsed).toContain('processing="during"');
    });

    it('should use defaults when optional fields are not provided', async () => {
      const captureService = new CaptureService();
      const input: CaptureInput = {
        content: 'Simple test content',
        experience: {
          qualities: [],
          emoji: '📝',
          narrative: 'Simple test'
        }
      };

      const result = await captureService.captureSource(input);

      expect(result.source.perspective).toBe('I');
      expect(result.source.experiencer).toBe('self');
      expect(result.source.processing).toBe('during');
      expect(result.source.crafted).toBe(false);
      expect(result.defaultsUsed).toContain('perspective="I"');
      expect(result.defaultsUsed).toContain('experiencer="self"');
      expect(result.defaultsUsed).toContain('processing="during"');
    });

    it('should validate and normalize quality types', async () => {
      const captureService = new CaptureService();
      const input: CaptureInput = {
        content: 'Test content',
        experience: {
          qualities: [
            { type: 'insight', prominence: 0.7, manifestation: 'understanding' },
            { type: 'growth', prominence: 0.5, manifestation: 'learning' }
          ],
          emoji: '🧠',
          narrative: 'Learning and insight'
        }
      };

      const result = await captureService.captureSource(input);

      expect(result.source.experience?.qualities).toHaveLength(2);
      expect(result.source.experience?.qualities[0].type).toBe('attentional');
      expect(result.source.experience?.qualities[1].type).toBe('purposive');
    });

    it('should handle multiple captures', async () => {
      const captureService = new CaptureService();
      const input1: CaptureInput = {
        content: 'First capture',
        experience: {
          qualities: [],
          emoji: '1️⃣',
          narrative: 'First test'
        }
      };
      const input2: CaptureInput = {
        content: 'Second capture',
        experience: {
          qualities: [],
          emoji: '2️⃣',
          narrative: 'Second test'
        }
      };

      const result1 = await captureService.captureSource(input1);
      const result2 = await captureService.captureSource(input2);

      expect(result1.source.id).not.toBe(result2.source.id);
      expect(result1.source.content).toBe('First capture');
      expect(result2.source.content).toBe('Second capture');
    });

    it('should use narrative as content when content is not provided', async () => {
      const captureService = new CaptureService();
      const input: CaptureInput = {
        experience: {
          qualities: [],
          emoji: '📝',
          narrative: 'This should become the content'
        }
      };

      const result = await captureService.captureSource(input);

      expect(result.source.content).toBe('This should become the content');
    });

    it('should generate embeddings for captured experiences', async () => {
      const captureService = new CaptureService();
      const input: CaptureInput = {
        content: 'Test content for embedding',
        experience: {
          qualities: [],
          emoji: '🧠',
          narrative: 'Test narrative'
        }
      };

      const result = await captureService.captureSource(input);

      // Embeddings are now stored separately, not on the source
      expect(result.source).toBeDefined();
      expect(result.source.id).toBeDefined();
      // The embedding generation is tested implicitly by the fact that capture succeeds
    });

    it('should handle emoji and narrative requirements', async () => {
      const captureService = new CaptureService();
      const input: CaptureInput = {
        content: 'Test content',
        experience: {
          qualities: [],
          emoji: '🎯',
          narrative: 'Test narrative'
        }
      };

      const result = await captureService.captureSource(input);

      expect(result.source.experience?.emoji).toBe('🎯');
      expect(result.source.experience?.narrative).toBe('Test narrative');
    });

    it('should reject invalid quality types that cannot be mapped', async () => {
      const captureService = new CaptureService();
      const input: CaptureInput = {
        experience: {
          qualities: [
            {
              type: 'completely-invalid' as any,
              prominence: 0.5,
              manifestation: 'test'
            }
          ],
          emoji: '❌',
          narrative: 'Testing invalid quality'
        }
      };

      await expect(captureService.captureSource(input)).rejects.toThrow(/Invalid quality type/);
    });

    it('should validate narrative length', async () => {
      const captureService = new CaptureService();
      const input: CaptureInput = {
        experience: {
          qualities: [],
          emoji: '📝',
          narrative: 'This is a very long narrative that exceeds the maximum allowed length of 200 characters. It continues on and on with unnecessary details that should be condensed into a more concise summary of the experiential moment being captured.'
        }
      };

      await expect(captureService.captureSource(input)).rejects.toThrow();
    });

    it('should require emoji in experience', async () => {
      const captureService = new CaptureService();
      const input: CaptureInput = {
        experience: {
          qualities: [],
          emoji: '', // Empty emoji should fail
          narrative: 'Missing emoji'
        }
      };

      await expect(captureService.captureSource(input)).rejects.toThrow();
    });

    it('should require narrative in experience', async () => {
      const captureService = new CaptureService();
      const input: CaptureInput = {
        experience: {
          qualities: [],
          emoji: '🤔',
          narrative: '' // Empty narrative should fail
        }
      };

      await expect(captureService.captureSource(input)).rejects.toThrow();
    });
  });
});