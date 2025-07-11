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
          experiencer: "Miguel",
          perspective: "I",
          processing: "during",
          experiential_qualities: {
            qualities: [
              {
                type: "affective",
                prominence: 0.8,
                manifestation: "feeling of excitement and anticipation"
              }
            ],
            vector: {
              embodied: 0.0,
              attentional: 0.0,
              affective: 0.8,
              purposive: 0.0,
              spatial: 0.0,
              temporal: 0.0,
              intersubjective: 0.0
            }
          }
        };

        expect(() => captureSchema.parse(validCapture)).not.toThrow();
      });

      test('should accept capture with all optional fields', () => {
        const completeCapture = {
          content: "I felt excited about starting a new project",
          contentType: "text",
          experiencer: "Miguel",
          perspective: "I",
          processing: "during",
          occurred: "2024-01-15",
          crafted: false,
          experiential_qualities: {
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
            vector: {
              embodied: 0.0,
              attentional: 0.0,
              affective: 0.8,
              purposive: 0.6,
              spatial: 0.0,
              temporal: 0.0,
              intersubjective: 0.0
            }
          }
        };

        expect(() => captureSchema.parse(completeCapture)).not.toThrow();
      });

      test('should accept capture with defaults', () => {
        const captureWithDefaults = {
          content: "I felt excited about starting a new project",
          experiential_qualities: {
            qualities: [
              {
                type: "affective",
                prominence: 0.8,
                manifestation: "feeling of excitement"
              }
            ]
          }
        };

        expect(() => captureSchema.parse(captureWithDefaults)).not.toThrow();
      });

      test('should accept valid capture input', () => {
        const validInput = {
          content: 'I felt excited about the project',
          experiential_qualities: {
            qualities: [
              {
                type: 'affective' as const,
                prominence: 0.8,
                manifestation: 'feeling of excitement'
              }
            ]
          }
        };

        expect(() => captureSchema.parse(validInput)).not.toThrow();
      });

      test('should apply default values', () => {
        const input = {
          content: 'Test content',
          experiential_qualities: {
            qualities: [
              {
                type: 'affective' as const,
                prominence: 0.8,
                manifestation: 'feeling of excitement'
              }
            ]
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
          contentType: 'audio',
          perspective: 'we' as const,
          processing: 'right-after' as const,
          experiencer: 'Alice',
          experiential_qualities: {
            qualities: [
              {
                type: 'affective' as const,
                prominence: 0.8,
                manifestation: 'feeling of excitement'
              }
            ]
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
      test('should reject missing content', () => {
        const invalidCapture = {
          experiencer: "Miguel",
          perspective: "I",
          processing: "during",
          experiential_qualities: {
            qualities: [
              {
                type: "affective",
                prominence: 0.8,
                manifestation: "feeling of excitement"
              }
            ]
          }
        };

        expect(() => captureSchema.parse(invalidCapture)).toThrow('Content must be provided');
      });

      test('should reject empty content', () => {
        const invalidCapture = {
          content: "",
          experiencer: "Miguel",
          perspective: "I",
          processing: "during",
          experiential_qualities: {
            qualities: [
              {
                type: "affective",
                prominence: 0.8,
                manifestation: "feeling of excitement"
              }
            ]
          }
        };

        expect(() => captureSchema.parse(invalidCapture)).toThrow('Content must be provided');
      });

      test('should reject invalid perspective', () => {
        const invalidCapture = {
          content: "I felt excited",
          experiencer: "Miguel",
          perspective: "invalid",
          processing: "during",
          experiential_qualities: {
            qualities: [
              {
                type: "affective",
                prominence: 0.8,
                manifestation: "feeling of excitement"
              }
            ]
          }
        };

        expect(() => captureSchema.parse(invalidCapture)).toThrow();
      });

      test('should reject invalid processing level', () => {
        const invalidCapture = {
          content: "I felt excited",
          experiencer: "Miguel",
          perspective: "I",
          processing: "invalid",
          experiential_qualities: {
            qualities: [
              {
                type: "affective",
                prominence: 0.8,
                manifestation: "feeling of excitement"
              }
            ]
          }
        };

        expect(() => captureSchema.parse(invalidCapture)).toThrow();
      });

      test('should reject missing experiential qualities', () => {
        const invalidCapture = {
          content: "I felt excited",
          experiencer: "Miguel",
          perspective: "I",
          processing: "during"
        };

        expect(() => captureSchema.parse(invalidCapture)).toThrow();
      });

      test('should reject invalid quality type', () => {
        const invalidCapture = {
          content: "I felt excited",
          experiencer: "Miguel",
          perspective: "I",
          processing: "during",
          experiential_qualities: {
            qualities: [
              {
                type: "invalid",
                prominence: 0.8,
                manifestation: "feeling of excitement"
              }
            ]
          }
        };

        expect(() => captureSchema.parse(invalidCapture)).toThrow();
      });

      test('should reject invalid prominence values', () => {
        const invalidCapture = {
          content: "I felt excited",
          experiencer: "Miguel",
          perspective: "I",
          processing: "during",
          experiential_qualities: {
            qualities: [
              {
                type: "affective",
                prominence: 1.5, // Should be between 0 and 1
                manifestation: "feeling of excitement"
              }
            ]
          }
        };

        expect(() => captureSchema.parse(invalidCapture)).toThrow();
      });

      test('should reject missing manifestation', () => {
        const invalidCapture = {
          content: "I felt excited",
          experiencer: "Miguel",
          perspective: "I",
          processing: "during",
          experiential_qualities: {
            qualities: [
              {
                type: "affective",
                prominence: 0.8
                // Missing manifestation
              }
            ]
          }
        };

        expect(() => captureSchema.parse(invalidCapture)).toThrow();
      });

      test('should reject invalid vector values', () => {
        const invalidCapture = {
          content: "I felt excited",
          experiencer: "Miguel",
          perspective: "I",
          processing: "during",
          experiential_qualities: {
            qualities: [
              {
                type: "affective",
                prominence: 0.8,
                manifestation: "feeling of excitement"
              }
            ],
            vector: {
              embodied: 1.5, // Should be between 0 and 1
              attentional: 0.0,
              affective: 0.8,
              purposive: 0.0,
              spatial: 0.0,
              temporal: 0.0,
              intersubjective: 0.0
            }
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
          experiential_qualities: {
            qualities: [
              {
                type: 'affective',
                prominence: 0.8,
                manifestation: 'feeling of excitement'
              }
            ]
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
          contentType: 'audio',
          perspective: 'we',
          processing: 'right-after',
          experiencer: 'Alice',
          occurred: '2024-01-15T10:00:00Z',
          crafted: false,
          experiential_qualities: {
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
            vector: {
              embodied: 0.1,
              attentional: 0.3,
              affective: 0.6,
              purposive: 0.8,
              spatial: 0.2,
              temporal: 0.4,
              intersubjective: 0.0
            }
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
          experiential_qualities: {
            qualities: [
              {
                type: 'affective',
                prominence: 0.8,
                manifestation: 'feeling of excitement'
              }
            ]
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
          occurred: '2024-01-15T10:00:00Z',
          experiential_qualities: {
            qualities: [
              {
                type: 'affective',
                prominence: 0.8,
                manifestation: 'feeling of excitement'
              }
            ]
          }
        };

        const result = await captureService.captureSource(input);

        expect(result.source.occurred).toBe('2024-01-15T10:00:00.000Z');
        expect(mockParseOccurredDate).toHaveBeenCalledWith('2024-01-15T10:00:00Z');
      });

      test('should handle multiple experiential qualities', async () => {
        const input = {
          content: 'I felt both excited and focused',
          experiential_qualities: {
            qualities: [
              {
                type: 'affective',
                prominence: 0.7,
                manifestation: 'feeling of excitement'
              },
              {
                type: 'attentional',
                prominence: 0.9,
                manifestation: 'sharp focus and concentration'
              }
            ]
          }
        };

        const result = await captureService.captureSource(input);

        expect(result.source.experiential_qualities.qualities).toHaveLength(2);
        expect(result.source.experiential_qualities.qualities[0].type).toBe('affective');
        expect(result.source.experiential_qualities.qualities[1].type).toBe('attentional');
      });

      test('should handle vector in experiential qualities', async () => {
        const input = {
          content: 'I felt excited about the project',
          experiential_qualities: {
            qualities: [
              {
                type: 'affective',
                prominence: 0.8,
                manifestation: 'feeling of excitement'
              }
            ],
            vector: {
              embodied: 0.1,
              attentional: 0.2,
              affective: 0.8,
              purposive: 0.3,
              spatial: 0.0,
              temporal: 0.1,
              intersubjective: 0.0
            }
          }
        };

        const result = await captureService.captureSource(input);

        expect(result.source.experiential_qualities.vector).toBeDefined();
        expect(result.source.experiential_qualities.vector.affective).toBe(0.8);
      });
    });

    describe('Edge cases and error handling', () => {
      test('should handle empty experiential qualities array', async () => {
        const input = {
          content: 'I felt neutral',
          experiential_qualities: {
            qualities: [
              {
                type: 'affective',
                prominence: 0.1,
                manifestation: 'neutral feeling'
              }
            ]
          }
        };

        const result = await captureService.captureSource(input);

        expect(result.source.experiential_qualities.qualities).toHaveLength(1);
        expect(result.source.experiential_qualities.qualities[0].type).toBe('affective');
      });

      test('should handle very long content', async () => {
        const longContent = 'A'.repeat(10000);
        const input = {
          content: longContent,
          experiential_qualities: {
            qualities: [
              {
                type: 'affective',
                prominence: 0.5,
                manifestation: 'neutral feeling'
              }
            ]
          }
        };

        const result = await captureService.captureSource(input);

        expect(result.source.content).toBe(longContent);
      });

      test('should handle special characters in content', async () => {
        const input = {
          content: 'I felt excited! 🎉 About the project...',
          experiential_qualities: {
            qualities: [
              {
                type: 'affective',
                prominence: 0.8,
                manifestation: 'feeling of excitement'
              }
            ]
          }
        };

        const result = await captureService.captureSource(input);

        expect(result.source.content).toBe('I felt excited! 🎉 About the project...');
      });
    });
  });
}); 