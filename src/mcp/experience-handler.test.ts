/**
 * Tests for Streamlined Experience Handler
 */

import { ExperienceHandler } from './experience-handler.js';
import * as experienceModule from '../services/experience.js';
import * as searchModule from '../services/search.js';
import * as storage from '../core/storage.js';

// Mock dependencies
jest.mock('../services/experience.js');
jest.mock('../services/search.js');
jest.mock('../core/storage.js');
jest.mock('../core/config.js', () => ({
  SEMANTIC_CONFIG: {
    SIMILARITY_DETECTION_THRESHOLD: 0.35
  }
}));

// Mock call-counter module
let mockCallCount = 0;
jest.mock('./call-counter.js', () => ({
  incrementCallCount: jest.fn(() => ++mockCallCount),
  getCallCount: jest.fn(() => mockCallCount),
  resetCallCount: jest.fn(() => {
    mockCallCount = 0;
  })
}));

// Mock the ToolResultSchema to avoid validation issues in tests
jest.mock('./schemas.js', () => ({
  ...jest.requireActual('./schemas.js'),
  ToolResultSchema: {
    parse: jest.fn((value) => value)
  }
}));

describe('ExperienceHandler', () => {
  let handler: ExperienceHandler;
  let mockCaptureExperience: jest.MockedFunction<typeof experienceModule.experienceService.captureExperience>;
  let mockRecall: jest.MockedFunction<typeof searchModule.recall>;
  let mockGetAllRecords: jest.MockedFunction<typeof storage.getAllRecords>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create handler instance
    handler = new ExperienceHandler();

    // Setup mocks
    mockCaptureExperience = (experienceModule.experienceService.captureExperience as jest.MockedFunction<typeof experienceModule.experienceService.captureExperience>);
    mockRecall = (searchModule.recall as jest.MockedFunction<typeof searchModule.recall>);
    
    // Setup storage mocks
    mockGetAllRecords = storage.getAllRecords as jest.MockedFunction<typeof storage.getAllRecords>;
    mockGetAllRecords.mockResolvedValue([]);
  });

  describe('handle', () => {
    it('should handle single experience successfully', async () => {
      // Make sure we have multiple records so we don't get first experience guidance
      mockGetAllRecords.mockResolvedValue([
        { id: 'exp_1', source: 'Test 1', created: '2025-01-21T12:00:00Z' },
        { id: 'exp_2', source: 'Test 2', created: '2025-01-21T12:00:00Z' },
        { id: 'exp_3', source: 'Test 3', created: '2025-01-21T12:00:00Z' }
      ]);

      const mockExperience = {
        id: 'exp_123',
        created: '2025-01-21T12:00:00Z',
        anchor: '😊',
        embodied: 'feeling light and energized',
        focus: 'taking in the whole moment',
        mood: 'open to whatever comes',
        purpose: 'just being present',
        space: 'in my cozy living room',
        time: 'this peaceful Sunday morning',
        presence: 'enjoying my own company',
        who: ['Human', 'Claude'] as string[],
      };

      mockCaptureExperience.mockResolvedValue({
        experience: mockExperience,
        embedding: true
      });
      mockRecall.mockResolvedValue([]);

      const result = await handler.handle({
        experiences: [
          {
            embodied: 'feeling light and energized',
            focus: 'taking in the whole moment',
            mood: 'open to whatever comes',
            purpose: 'just being present',
            space: 'in my cozy living room',
            time: 'this peaceful Sunday morning',
            presence: 'enjoying my own company',
            anchor: '😊',
            who: ['Human', 'Claude'],
          }
        ]
      });

      expect(result.content.length).toBeGreaterThanOrEqual(1);
      expect(result.content[0]).toEqual({
        type: 'text',
        text: expect.stringContaining('😊 Experience Captured')
      });

      expect(mockCaptureExperience).toHaveBeenCalledWith({
        embodied: 'feeling light and energized',
        focus: 'taking in the whole moment',
        mood: 'open to whatever comes',
        purpose: 'just being present',
        space: 'in my cozy living room',
        time: 'this peaceful Sunday morning',
        presence: 'enjoying my own company',
        anchor: '😊',
        who: ['Human', 'Claude'],
      });
    });

    it('should handle batch experiences', async () => {
      const mockExperience1 = {
        id: 'exp_123',
        created: '2025-01-21T12:00:00Z',
        anchor: '😊',
        embodied: 'feeling light and energized',
        focus: 'taking in the whole moment',
        mood: 'open to whatever comes',
        purpose: 'just being present',
        space: 'in my cozy living room',
        time: 'this peaceful Sunday morning',
        presence: 'enjoying my own company',
        who: ['Human', 'Claude'] as string[],
      };

      const mockExperience2 = {
        id: 'exp_124',
        created: '2025-01-21T12:00:00Z',
        anchor: '🤔',
        embodied: 'mind racing with possibilities',
        focus: 'narrowing in on the problem',
        mood: 'curious but cautious',
        purpose: 'finding the solution',
        space: 'at my desk',
        time: 'late into the evening',
        presence: 'collaborating with Claude',
        who: ['Alex', 'Claude'] as string[],
      };

      mockCaptureExperience
        .mockResolvedValueOnce({ experience: mockExperience1, embedding: true })
        .mockResolvedValueOnce({ experience: mockExperience2, embedding: true });

      const result = await handler.handle({
        experiences: [
          {
            embodied: 'feeling light and energized',
            focus: 'taking in the whole moment',
            mood: 'open to whatever comes',
            purpose: 'just being present',
            space: 'in my cozy living room',
            time: 'this peaceful Sunday morning',
            presence: 'enjoying my own company',
            anchor: '😊',
            who: ['Human', 'Claude'],
          },
          {
            embodied: 'mind racing with possibilities',
            focus: 'narrowing in on the problem',
            mood: 'curious but cautious',
            purpose: 'finding the solution',
            space: 'at my desk',
            time: 'late into the evening',
            presence: 'collaborating with Claude',
            anchor: '🤔',
            who: ['Alex', 'Claude'],
          }
        ]
      });

      expect(result.content[0].text).toContain('Captured 2 experiences');
      expect(mockCaptureExperience).toHaveBeenCalledTimes(2);
    });

    it('should handle experience with recall', async () => {
      const mockPastExperiences = [
        {
          id: 'exp_past',
          created: '2025-01-20T12:00:00Z',
          anchor: '💭',
          embodied: 'remembering how it felt',
          focus: 'on that specific moment',
          mood: 'nostalgic and warm',
          purpose: 'reflecting on growth',
          space: 'same room different time',
          time: 'yesterday afternoon',
          presence: 'thinking of old friends',
          who: ['Human', 'Claude'] as string[],
        }
      ];

      const mockNewExperience = {
        id: 'exp_123',
        created: '2025-01-21T12:00:00Z',
        anchor: '✨',
        embodied: 'feeling connected to past',
        focus: 'bridging then and now',
        mood: 'grateful for the journey',
        purpose: 'integrating experiences',
        space: 'in the same spot',
        time: 'right now',
        presence: 'with Claude again',
        who: ['Human', 'Claude'] as string[],
      };

      mockRecall.mockResolvedValue(mockPastExperiences);
      mockCaptureExperience.mockResolvedValue({
        experience: mockNewExperience,
        embedding: true
      });

      const result = await handler.handle({
        experiences: [
          {
            embodied: 'feeling connected to past',
            focus: 'bridging then and now',
            mood: 'grateful for the journey',
            purpose: 'integrating experiences',
            space: 'in the same spot',
            time: 'right now',
            presence: 'with Claude again',
            anchor: '✨',
            who: ['Human', 'Claude'],
          }
        ]
      });

      expect(result.content[0].text).toContain('Found 1 past experiences');
      expect(result.content[0].text).toContain('💭');
      // Recall should be called with the captured experience qualities
      expect(mockRecall).toHaveBeenCalledWith(
        'feeling connected to past bridging then and now grateful for the journey integrating experiences in the same spot right now with Claude again',
        25
      );
    });

    it('should handle errors gracefully', async () => {
      mockCaptureExperience.mockRejectedValue(new Error('Database error'));

      const result = await handler.handle({
        experiences: [
          {
            embodied: 'feeling uncertain',
            focus: 'scattered thoughts',
            mood: 'anxious',
            purpose: 'trying to ground',
            space: 'somewhere unfamiliar',
            time: 'lost track of time',
            presence: 'feeling isolated',
            anchor: '😰',
            who: ['Human', 'Claude'],
          }
        ]
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error');
    });

    it('should validate who array includes AI', async () => {
      const result = await handler.handle({
        experiences: [
          {
            embodied: 'testing validation',
            focus: 'on requirements',
            mood: 'methodical',
            purpose: 'ensuring correctness',
            space: 'in test environment',
            time: 'during testing',
            presence: 'with the system',
            anchor: '🧪',
            who: ['Human'], // Missing AI identity - should fail validation
          }
        ]
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error');
    });
  });
});