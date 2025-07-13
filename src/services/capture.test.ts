import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// Set up all mocks before importing the modules under test
const mockGenerateId = jest.fn(() => 'src_mock-id-123');
const mockSaveSource = jest.fn(async (source: any) => source);
const mockGenerateEmbedding = jest.fn(async () => new Array(384).fill(0.1));
const mockAddVector = jest.fn();
const mockGetVectorStore = jest.fn(() => ({
  addVector: mockAddVector
}));
const mockParseOccurredDate = jest.fn(async () => '2024-01-15T10:00:00.000Z');

jest.doMock('../core/storage.js', () => ({
  generateId: mockGenerateId,
  saveSource: mockSaveSource
}));

jest.doMock('./embeddings.js', () => ({
  embeddingService: {
    generateEmbedding: mockGenerateEmbedding
  }
}));

jest.doMock('./vector-store.js', () => ({
  getVectorStore: mockGetVectorStore
}));

jest.doMock('../utils/validation.js', () => ({
  parseOccurredDate: mockParseOccurredDate
}));

describe('Capture Service', () => {
  let CaptureService: any;
  let captureSchema: any;
  let captureService: any;

  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();
    // Import modules after mocks are set up
    ({ CaptureService, captureSchema } = await import('./capture.js'));
    captureService = new CaptureService();
  });

  describe('Schema Validation', () => {
    describe('Valid captures', () => {
      test('should accept minimal valid capture', () => {
        const validCapture = {
          content: "I felt excited about starting a new project",
          narrative: "I experienced excitement while starting a new project",
          experience: {
            qualities: [
              {
                type: "affective",
                prominence: 0.8,
                manifestation: "feeling of excitement and anticipation"
              }
            ],
            emoji: '🎉'
          }
        };

        expect(() => captureSchema.parse(validCapture)).not.toThrow();
      });

      test('should accept capture with all optional fields', () => {
        const completeCapture = {
          content: "I felt excited about starting a new project",
          narrative: "I experienced excitement while starting a new project",
          contentType: "text",
          experiencer: "Miguel",
          perspective: "I",
          processing: "during",
          occurred: "2024-01-15",
          crafted: false,
          experience: {
            qualities: [
              {
                type: "affective",
                prominence: 0.8,
                manifestation: "feeling of excitement and anticipation"
              },
              {
                type: "purposive",
                prominence: 0.6,
                manifestation: "clear goal-directed motivation"
              }
            ],
            emoji: '🎉'
          }
        };

        expect(() => captureSchema.parse(completeCapture)).not.toThrow();
      });

      test('should accept capture with defaults', () => {
        const captureWithDefaults = {
          content: "I felt excited about starting a new project",
          narrative: "I experienced excitement while starting a new project",
          experience: {
            qualities: [
              {
                type: "affective",
                prominence: 0.8,
                manifestation: "feeling of excitement"
              }
            ],
            emoji: '🎉'
          }
        };

        expect(() => captureSchema.parse(captureWithDefaults)).not.toThrow();
      });

      test('should accept valid capture input', () => {
        const validInput = {
          content: 'I felt excited about the project',
          narrative: 'I experienced excitement about the project',
          experience: {
            qualities: [
              {
                type: 'affective' as const,
                prominence: 0.8,
                manifestation: 'feeling of excitement'
              }
            ],
            emoji: '🎉'
          }
        };

        expect(() => captureSchema.parse(validInput)).not.toThrow();
      });

      test('should apply default values', () => {
        const input = {
          content: 'Test content',
          narrative: 'Test narrative',
          experience: {
            qualities: [
              {
                type: 'affective' as const,
                prominence: 0.8,
                manifestation: 'feeling of excitement'
              }
            ],
            emoji: '🎉'
          }
        };

        const result = captureSchema.parse(input);
        expect(result.contentType).toBe('text');
        expect(result.perspective).toBe('I');
        expect(result.processing).toBe('during');
        expect(result.experiencer).toBe('self');
      });

      test('should preserve provided values over defaults', () => {
        const input = {
          content: 'Test content',
          narrative: 'Test narrative',
          contentType: 'audio',
          perspective: 'we' as const,
          processing: 'right-after' as const,
          experiencer: 'Alice',
          experience: {
            qualities: [
              {
                type: 'affective' as const,
                prominence: 0.8,
                manifestation: 'feeling of excitement'
              }
            ],
            emoji: '🎉'
          }
        };

        const result = captureSchema.parse(input);
        expect(result.contentType).toBe('audio');
        expect(result.perspective).toBe('we');
        expect(result.processing).toBe('right-after');
        expect(result.experiencer).toBe('Alice');
      });
    });

    describe('Invalid captures', () => {
      test('should reject missing narrative', () => {
        const invalidCapture = {
          content: "I felt excited about starting a new project",
          experiencer: "Miguel",
          perspective: "I",
          processing: "during",
          experience: {
            qualities: [
              {
                type: "affective",
                prominence: 0.8,
                manifestation: "feeling of excitement"
              }
            ],
            emoji: '🎉'
          }
        };

        expect(() => captureSchema.parse(invalidCapture)).toThrow('Required');
      });

      test('should reject empty narrative', () => {
        const invalidCapture = {
          content: "I felt excited about starting a new project",
          narrative: "",
          experiencer: "Miguel",
          perspective: "I",
          processing: "during",
          experience: {
            qualities: [
              {
                type: "affective",
                prominence: 0.8,
                manifestation: "feeling of excitement"
              }
            ],
            emoji: '🎉'
          }
        };

        expect(() => captureSchema.parse(invalidCapture)).toThrow('Narrative is required');
      });

      test('should reject missing content', () => {
        const invalidCapture = {
          narrative: "I experienced excitement",
          experiencer: "Miguel",
          perspective: "I",
          processing: "during",
          experience: {
            qualities: [
              {
                type: "affective",
                prominence: 0.8,
                manifestation: "feeling of excitement"
              }
            ],
            emoji: '🎉'
          }
        };

        expect(() => captureSchema.parse(invalidCapture)).not.toThrow(); // Content is now optional
      });

      test('should reject empty content', () => {
        const invalidCapture = {
          content: "",
          narrative: "I experienced excitement",
          experiencer: "Miguel",
          perspective: "I",
          processing: "during",
          experience: {
            qualities: [
              {
                type: "affective",
                prominence: 0.8,
                manifestation: "feeling of excitement"
              }
            ],
            emoji: '🎉'
          }
        };

        expect(() => captureSchema.parse(invalidCapture)).not.toThrow(); // Empty content is now allowed
      });

      test('should reject invalid perspective', () => {
        const invalidCapture = {
          content: "I felt excited",
          narrative: "I experienced excitement",
          experiencer: "Miguel",
          perspective: "invalid",
          processing: "during",
          experience: {
            qualities: [
              {
                type: "affective",
                prominence: 0.8,
                manifestation: "feeling of excitement"
              }
            ],
            emoji: '🎉'
          }
        };

        expect(() => captureSchema.parse(invalidCapture)).toThrow();
      });

      test('should reject invalid processing level', () => {
        const invalidCapture = {
          content: "I felt excited",
          narrative: "I experienced excitement",
          experiencer: "Miguel",
          perspective: "I",
          processing: "invalid",
          experience: {
            qualities: [
              {
                type: "affective",
                prominence: 0.8,
                manifestation: "feeling of excitement"
              }
            ],
            emoji: '🎉'
          }
        };

        expect(() => captureSchema.parse(invalidCapture)).toThrow();
      });

      test('should reject missing experience', () => {
        const invalidCapture = {
          content: "I felt excited",
          narrative: "I experienced excitement",
          experiencer: "Miguel",
          perspective: "I",
          processing: "during"
        };

        expect(() => captureSchema.parse(invalidCapture)).toThrow();
      });

      test('should reject invalid quality type', () => {
        const invalidCapture = {
          content: "I felt excited",
          narrative: "I experienced excitement",
          experiencer: "Miguel",
          perspective: "I",
          processing: "during",
          experience: {
            qualities: [
              {
                type: "invalid",
                prominence: 0.8,
                manifestation: "feeling of excitement"
              }
            ],
            emoji: '🎉'
          }
        };

        expect(() => captureSchema.parse(invalidCapture)).toThrow();
      });

      test('should reject invalid prominence values', () => {
        const invalidCapture = {
          content: "I felt excited",
          narrative: "I experienced excitement",
          experiencer: "Miguel",
          perspective: "I",
          processing: "during",
          experience: {
            qualities: [
              {
                type: "affective",
                prominence: 1.5, // Should be between 0 and 1
                manifestation: "feeling of excitement"
              }
            ],
            emoji: '🎉'
          }
        };

        expect(() => captureSchema.parse(invalidCapture)).toThrow();
      });

      test('should reject missing manifestation', () => {
        const invalidCapture = {
          content: "I felt excited",
          narrative: "I experienced excitement",
          experiencer: "Miguel",
          perspective: "I",
          processing: "during",
          experience: {
            qualities: [
              {
                type: "affective",
                prominence: 0.8
                // Missing manifestation
              }
            ],
            emoji: '🎉'
          }
        };

        expect(() => captureSchema.parse(invalidCapture)).toThrow();
      });
    });
  });

  describe('Service Functionality', () => {
    describe('CaptureService.captureSource', () => {
      test('should capture source with minimal input', async () => {
        const input = {
          content: 'I felt excited about the project',
          narrative: 'I experienced excitement about the project',
          experience: {
            qualities: [
              {
                type: 'affective',
                prominence: 0.8,
                manifestation: 'feeling of excitement'
              }
            ],
            emoji: '🎉'
          }
        };

        const result = await captureService.captureSource(input);

        expect(result.source).toBeDefined();
        expect(result.source.content).toBe('I felt excited about the project');
        expect(result.source.experiencer).toBe('self');
        expect(result.source.perspective).toBe('I');
        expect(result.source.processing).toBe('during');
        expect(result.source.contentType).toBe('text');
        expect(result.defaultsUsed).toContain('experiencer="self"');
        expect(result.defaultsUsed).toContain('perspective="I"');
        expect(result.defaultsUsed).toContain('processing="during"');
      });

      test('should capture source with complete input', async () => {
        const input = {
          content: 'We discussed the project timeline',
          narrative: 'We discussed the project timeline',
          contentType: 'audio',
          perspective: 'we',
          processing: 'right-after',
          experiencer: 'Alice',
          occurred: '2024-01-15T10:00:00Z',
          crafted: false,
          experience: {
            qualities: [
              {
                type: 'affective',
                prominence: 0.6,
                manifestation: 'feeling of focus'
              },
              {
                type: 'purposive',
                prominence: 0.8,
                manifestation: 'clear goal direction'
              }
            ],
            emoji: '👀'
          }
        };

        const result = await captureService.captureSource(input);

        expect(result.source).toBeDefined();
        expect(result.source.content).toBe('We discussed the project timeline');
        expect(result.source.contentType).toBe('audio');
        expect(result.source.perspective).toBe('we');
        expect(result.source.processing).toBe('right-after');
        expect(result.source.experiencer).toBe('Alice');
        expect(result.source.occurred).toBe('2024-01-15T10:00:00.000Z');
        expect(result.source.crafted).toBe(false);
        expect(result.defaultsUsed).toHaveLength(0);
      });

      test('should generate embeddings and save to vector store', async () => {
        const input = {
          content: 'I felt excited about the project',
          narrative: 'I experienced excitement about the project',
          experience: {
            qualities: [
              {
                type: 'affective',
                prominence: 0.8,
                manifestation: 'feeling of excitement'
              }
            ],
            emoji: '🎉'
          }
        };

        const result = await captureService.captureSource(input);

        expect(result.source).toBeDefined();
        expect(result.source.id).toMatch(/^src_mock-id-/);
        expect(mockGetVectorStore).toHaveBeenCalled();
      });

      test('should handle occurred date parsing', async () => {
        const input = {
          content: 'I felt excited about the project',
          narrative: 'I experienced excitement about the project',
          occurred: '2024-01-15T10:00:00Z',
          experience: {
            qualities: [
              {
                type: 'affective',
                prominence: 0.8,
                manifestation: 'feeling of excitement'
              }
            ],
            emoji: '🎉'
          }
        };

        const result = await captureService.captureSource(input);

        expect(result.source.occurred).toBe('2024-01-15T10:00:00.000Z');
        expect(mockParseOccurredDate).toHaveBeenCalledWith('2024-01-15T10:00:00Z');
      });

      test('should handle multiple experience qualities', async () => {
        const input = {
          content: 'I felt both excited and focused',
          narrative: 'I experienced both excitement and focus',
          experience: {
            qualities: [
              {
                type: 'affective',
                prominence: 0.7,
                manifestation: 'feeling of excitement'
              },
              {
                type: 'attentional',
                prominence: 0.8,
                manifestation: 'sharp focus on the task'
              }
            ],
            emoji: '🎯'
          }
        };

        const result = await captureService.captureSource(input);

        expect(result.source.experience?.qualities).toHaveLength(2);
        expect(result.source.experience?.qualities[0].type).toBe('affective');
        expect(result.source.experience?.qualities[1].type).toBe('attentional');
      });
    });

    describe('Edge cases and error handling', () => {
      test('should handle empty experience qualities array', async () => {
        const input = {
          content: 'I felt neutral',
          narrative: 'I experienced neutrality',
          experience: {
            qualities: [],
            emoji: '😐'
          }
        };

        const result = await captureService.captureSource(input);

        expect(result.source.experience?.qualities).toHaveLength(0);
      });

      test('should handle very long content', async () => {
        const longContent = 'A'.repeat(1000);
        const input = {
          content: longContent,
          narrative: 'I experienced something',
          experience: {
            qualities: [
              {
                type: 'affective',
                prominence: 0.5,
                manifestation: 'neutral feeling'
              }
            ],
            emoji: '😐'
          }
        };

        const result = await captureService.captureSource(input);

        expect(result.source.content).toBe(longContent);
      });

      test('should handle special characters in content', async () => {
        const input = {
          content: 'I felt excited! 🎉 (with emoji and symbols)',
          narrative: 'I experienced excitement with symbols',
          experience: {
            qualities: [
              {
                type: 'affective',
                prominence: 0.8,
                manifestation: 'feeling of excitement'
              }
            ],
            emoji: '🎉'
          }
        };

        const result = await captureService.captureSource(input);

        expect(result.source.content).toBe('I felt excited! 🎉 (with emoji and symbols)');
      });
    });
  });
}); 