import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { CaptureService } from './capture';
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync, rmdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { nanoid } from 'nanoid';

describe('CaptureService', () => {
  let captureService: CaptureService;
  let testDataPath: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original env
    originalEnv = { ...process.env };
    
    // Create a unique test directory
    const testId = nanoid();
    testDataPath = join(tmpdir(), `bridge-test-${testId}`);
    mkdirSync(testDataPath, { recursive: true });
    
    // Set test environment
    process.env.BRIDGE_FILE_PATH = join(testDataPath, 'test-bridge.json');
    process.env.NODE_ENV = 'test';
    
    // Initialize test data file
    const testData = { sources: [] };
    writeFileSync(process.env.BRIDGE_FILE_PATH, JSON.stringify(testData, null, 2));
    
    // Create service instance
    captureService = new CaptureService();
  });

  afterEach(() => {
    // Restore original env
    process.env = originalEnv;
    
    // Clean up test directory
    if (existsSync(testDataPath)) {
      const files = ['test-bridge.json', 'vectors.json', 'pattern-cache.json'];
      files.forEach(file => {
        const filePath = join(testDataPath, file);
        if (existsSync(filePath)) {
          unlinkSync(filePath);
        }
      });
      rmdirSync(testDataPath);
    }
  });

  describe('captureSource', () => {
    it('should capture a basic experience successfully', async () => {
      const input = {
        content: 'I feel really happy today',
        experiencer: 'test-user',
        perspective: 'I' as const,
        processing: 'during' as const,
        experience: {
          qualities: [
            {
              type: 'affective' as const,
              prominence: 0.8,
              manifestation: 'joy and contentment'
            }
          ],
          emoji: '😊',
          narrative: 'Feeling the warmth of happiness spreading through my chest'
        }
      };

      const result = await captureService.captureSource(input);

      expect(result.source).toBeDefined();
      expect(result.source.id).toMatch(/^src_/);
      expect(result.source.experiencer).toBe('test-user');
      expect(result.source.experience?.emoji).toBe('😊');
      
      // Verify it was saved
      const savedData = JSON.parse(readFileSync(process.env.BRIDGE_FILE_PATH!, 'utf-8'));
      expect(savedData.sources).toHaveLength(1);
      expect(savedData.sources[0].experiencer).toBe('test-user');
    });

    it('should use defaults when optional fields are not provided', async () => {
      const input = {
        experience: {
          qualities: [
            {
              type: 'embodied' as const,
              prominence: 0.7,
              manifestation: 'tension in shoulders'
            }
          ],
          emoji: '😌',
          narrative: 'Noticing the physical sensations in my body'
        }
      };

      const result = await captureService.captureSource(input);

      expect(result.defaultsUsed).toContain('perspective="I"');
      expect(result.defaultsUsed).toContain('experiencer="self"');
      expect(result.defaultsUsed).toContain('processing="during"');
      expect(result.source.perspective).toBe('I');
      expect(result.source.experiencer).toBe('self');
    });

    it('should validate and normalize quality types', async () => {
      const input = {
        experience: {
          qualities: [
            {
              type: 'insight' as any, // This should be mapped to 'attentional'
              prominence: 0.9,
              manifestation: 'sudden understanding'
            }
          ],
          emoji: '💡',
          narrative: 'Sudden flash of understanding'
        }
      };

      const result = await captureService.captureSource(input);

      expect(result.source.experience?.qualities).toHaveLength(1);
      expect(result.source.experience?.qualities[0].type).toBe('attentional');
    });

    it('should handle multiple captures', async () => {
      const input1 = {
        experiencer: 'user1',
        experience: {
          qualities: [],
          emoji: '💭',
          narrative: 'First thought'
        }
      };

      const input2 = {
        experiencer: 'user2',
        experience: {
          qualities: [],
          emoji: '💡',
          narrative: 'Second insight'
        }
      };

      const result1 = await captureService.captureSource(input1);
      const result2 = await captureService.captureSource(input2);

      expect(result1.source.experiencer).toBe('user1');
      expect(result2.source.experiencer).toBe('user2');
      
      // Verify both were saved
      const savedData = JSON.parse(readFileSync(process.env.BRIDGE_FILE_PATH!, 'utf-8'));
      expect(savedData.sources).toHaveLength(2);
    });

    it('should parse occurred dates correctly', async () => {
      const input = {
        occurred: '2024-01-15T10:30:00Z',
        experience: {
          qualities: [],
          emoji: '📅',
          narrative: 'Remembering a specific moment'
        }
      };

      const result = await captureService.captureSource(input);

      // The service may parse and reformat the date
      expect(result.source.occurred).toMatch(/2024-01-15T10:30:00/);
    });

    it('should generate embeddings for captured experiences', async () => {
      const input = {
        experience: {
          qualities: [
            {
              type: 'embodied' as const,
              prominence: 0.8,
              manifestation: 'relaxed muscles'
            }
          ],
          emoji: '🧘',
          narrative: 'Deep relaxation flowing through body'
        }
      };

      const result = await captureService.captureSource(input);

      // Should have an embedding
      expect(result.source.embedding).toBeDefined();
      expect(result.source.embedding).toHaveLength(384);
    });

    it('should handle emoji and narrative requirements', async () => {
      const input = {
        experience: {
          qualities: [],
          emoji: '🌟',
          narrative: 'Experiencing a moment of clarity and understanding'
        }
      };

      const result = await captureService.captureSource(input);

      expect(result.source.experience?.emoji).toBe('🌟');
      expect(result.source.experience?.narrative).toBe('Experiencing a moment of clarity and understanding');
    });

    it('should reject invalid quality types that cannot be mapped', async () => {
      const input = {
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
      const input = {
        experience: {
          qualities: [],
          emoji: '📝',
          narrative: 'This is a very long narrative that exceeds the maximum allowed length of 200 characters. It continues on and on with unnecessary details that should be condensed into a more concise summary of the experiential moment being captured.'
        }
      };

      await expect(captureService.captureSource(input)).rejects.toThrow();
    });

    it('should require emoji in experience', async () => {
      const input = {
        experience: {
          qualities: [],
          emoji: '', // Empty emoji should fail
          narrative: 'Missing emoji'
        }
      };

      await expect(captureService.captureSource(input)).rejects.toThrow();
    });

    it('should require narrative in experience', async () => {
      const input = {
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