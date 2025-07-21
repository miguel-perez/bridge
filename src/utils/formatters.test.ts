/**
 * Tests for Formatter Utilities
 */

import {
  smartTruncate,
  formatSearchResult,
  formatDetailedSearchResult,
  formatStructuredSearchResult,
  formatExperienceResponse,
  formatBatchExperienceResponse,
  formatRecallResponse,
  formatReconsiderResponse,
  formatReleaseResponse,
  type ExperienceResult,
  type RecallResult
} from './formatters.js';
import type { SearchResult } from '../core/search.js';

// Mock the messages module
jest.mock('./messages.js', () => ({
  Messages: {
    experience: {
      success: 'Experienced',
      successWithQualities: 'Experienced ({qualities})',
      batch: 'Experienced {count} moments',
      from: 'From {experiencer}',
      as: 'As {perspective}',
      when: 'When {processing}',
      captured: 'Captured {timeAgo}'
    },
    recall: {
      none: 'No experiences found',
      found: 'Found {count} experience(s)'
    },
    reconsider: {
      success: 'Reconsidered',
      successWithQualities: 'Reconsidered as {qualities}'
    },
    release: {
      success: 'Released',
      batch: 'Released {count} experiences'
    },
    processing: {
      during: 'in the moment',
      rightAfter: 'right after',
      longAfter: 'looking back'
    },
    time: {
      justNow: 'just now',
      oneMinuteAgo: '1 minute ago',
      minutesAgo: '{minutes} minutes ago',
      oneHourAgo: '1 hour ago',
      hoursAgo: '{hours} hours ago',
      yesterday: 'yesterday',
      daysAgo: '{days} days ago'
    }
  },
  formatMessage: jest.fn((template: string, params: Record<string, any>) => {
    let result = template;
    for (const [key, value] of Object.entries(params)) {
      result = result.replace(`{${key}}`, String(value));
    }
    return result;
  }),
  formatQualityList: jest.fn((qualities: string[]) => qualities.join(', '))
}));

describe('Formatter Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock current date for consistent time-based tests
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-21T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('smartTruncate', () => {
    it('should not truncate text shorter than maxLength', () => {
      const text = 'Short text';
      expect(smartTruncate(text)).toBe(text);
    });

    it('should truncate at word boundary', () => {
      const text = 'This is a very long text that needs to be truncated at a word boundary to maintain readability without cutting words in half';
      const result = smartTruncate(text, 50);
      expect(result).toBe('This is a very long text that needs to be...');
      expect(result.length).toBeLessThanOrEqual(50);
    });

    it('should truncate at maxLength if no word boundary found', () => {
      const text = 'Verylongwordwithouanyspaceswhatsoevertobreakproperly';
      const result = smartTruncate(text, 20);
      expect(result).toBe('Verylongwordwithouan...');
    });

    it('should use default length of 120', () => {
      const text = 'a'.repeat(150);
      const result = smartTruncate(text);
      expect(result.length).toBe(123); // 120 + '...'
    });

    it('should handle empty string', () => {
      expect(smartTruncate('')).toBe('');
    });
  });

  describe('formatSearchResult', () => {
    const baseResult: SearchResult = {
      type: 'source',
      id: 'test_123',
      snippet: 'This is a test snippet',
      relevance: 0.8
    };

    it('should format basic search result', () => {
      const result = formatSearchResult(baseResult, 0);
      expect(result).toBe('1. [SOURCE] This is a test snippet');
    });

    it('should include ID when showId is true', () => {
      const result = formatSearchResult(baseResult, 0, true);
      expect(result).toBe('1. [SOURCE] (ID: test_123) This is a test snippet');
    });

    it('should truncate long snippets', () => {
      const longResult = {
        ...baseResult,
        snippet: 'This is a very long snippet that needs to be truncated because it exceeds the maximum allowed length for display purposes in the user interface'
      };
      const result = formatSearchResult(longResult, 0);
      expect(result).toContain('...');
    });

    it('should use ID as summary when snippet is missing and showId is true', () => {
      const noSnippetResult = { ...baseResult, snippet: undefined };
      const result = formatSearchResult(noSnippetResult, 0, true);
      expect(result).toBe('1. [SOURCE] (ID: test_123) test_123');
    });

    it('should use placeholder when no snippet and showId is false', () => {
      const noSnippetResult = { ...baseResult, snippet: undefined };
      const result = formatSearchResult(noSnippetResult, 0, false);
      expect(result).toBe('1. [SOURCE] [no summary]');
    });

    it('should handle missing type', () => {
      const noTypeResult = { ...baseResult, type: undefined };
      const result = formatSearchResult(noTypeResult, 0);
      expect(result).toBe('1. [] This is a test snippet');
    });

    it('should handle different indices correctly', () => {
      const result1 = formatSearchResult(baseResult, 0);
      const result2 = formatSearchResult(baseResult, 5);
      const result3 = formatSearchResult(baseResult, 99);
      
      expect(result1).toMatch(/^1\./);
      expect(result2).toMatch(/^6\./);
      expect(result3).toMatch(/^100\./);
    });
  });

  describe('formatDetailedSearchResult', () => {
    it('should include perspective and processing for source type', () => {
      const sourceResult: SearchResult = {
        type: 'source',
        id: 'test_123',
        snippet: 'Test snippet',
        relevance: 0.8,
        source: {
          id: 'test_123',
          source: 'Original text',
          created: '2025-01-21T12:00:00Z',
          perspective: 'I',
          processing: 'during'
        }
      };

      const result = formatDetailedSearchResult(sourceResult, 0);
      expect(result).toContain('1. [SOURCE] Test snippet');
      expect(result).toContain('Perspective: I');
      expect(result).toContain('Processing: during');
    });

    it('should format without details for non-source types', () => {
      const otherResult: SearchResult = {
        type: 'other',
        id: 'test_123',
        snippet: 'Test snippet',
        relevance: 0.8
      };

      const result = formatDetailedSearchResult(otherResult, 0);
      expect(result).toBe('1. [OTHER] Test snippet');
    });

    it('should handle missing perspective and processing', () => {
      const sourceResult: SearchResult = {
        type: 'source',
        id: 'test_123',
        snippet: 'Test snippet',
        relevance: 0.8,
        source: {
          id: 'test_123',
          source: 'Original text',
          created: '2025-01-21T12:00:00Z'
        }
      };

      const result = formatDetailedSearchResult(sourceResult, 0);
      expect(result).toBe('1. [SOURCE] Test snippet');
    });
  });

  describe('formatStructuredSearchResult', () => {
    it('should format basic result as structured object', () => {
      const result: SearchResult = {
        type: 'source',
        id: 'test_123',
        snippet: 'Test snippet',
        relevance: 0.8
      };

      const structured = formatStructuredSearchResult(result);
      expect(structured).toEqual({
        type: 'source',
        id: 'test_123',
        snippet: 'Test snippet',
        relevance: 0.8
      });
    });

    it('should include source data when available', () => {
      const result: SearchResult = {
        type: 'source',
        id: 'test_123',
        snippet: 'Test snippet',
        relevance: 0.8,
        source: {
          id: 'test_123',
          source: 'Original text',
          created: '2025-01-21T12:00:00Z'
        }
      };

      const structured = formatStructuredSearchResult(result);
      expect(structured.source).toEqual(result.source);
    });
  });

  describe('formatExperienceResponse', () => {
    const baseExperience: ExperienceResult = {
      source: {
        id: 'exp_123',
        source: 'I feel happy',
        created: '2025-01-21T11:55:00Z',
        experiencer: 'Alice',
        perspective: 'I',
        processing: 'during',
        experience: ['mood.open']
      }
    };

    it('should format experience with qualities', () => {
      const result = formatExperienceResponse(baseExperience);
      expect(result).toContain('Experienced (mood.open)');
      expect(result).toContain('From Alice');
      expect(result).toContain('As I');
      expect(result).toContain('When in the moment');
      expect(result).toContain('Captured 5 minutes ago');
    });

    it('should format experience without qualities', () => {
      const noQualities = {
        ...baseExperience,
        source: { ...baseExperience.source, experience: [] }
      };
      const result = formatExperienceResponse(noQualities);
      expect(result).toContain('Experienced');
      expect(result).not.toContain('(');
    });

    it('should show ID when requested', () => {
      const result = formatExperienceResponse(baseExperience, true);
      expect(result).toContain('📝 ID: exp_123');
    });

    it('should handle missing optional fields', () => {
      const minimal: ExperienceResult = {
        source: {
          id: 'exp_123',
          source: 'Test',
          created: '2025-01-21T11:55:00Z'
        }
      };
      const result = formatExperienceResponse(minimal);
      expect(result).toContain('From me');
      expect(result).toContain('As I');
    });
  });

  describe('formatBatchExperienceResponse', () => {
    const experiences: ExperienceResult[] = [
      {
        source: {
          id: 'exp_1',
          source: 'First experience',
          created: '2025-01-21T11:55:00Z',
          experience: ['mood.open']
        }
      },
      {
        source: {
          id: 'exp_2',
          source: 'Second experience',
          created: '2025-01-21T11:50:00Z',
          experience: []
        }
      }
    ];

    it('should format multiple experiences', () => {
      const result = formatBatchExperienceResponse(experiences);
      expect(result).toContain('Experienced 2 moments');
      expect(result).toContain('--- 1 ---');
      expect(result).toContain('--- 2 ---');
      expect(result).toContain('Experienced (mood.open)');
      expect(result).toContain('Experienced\n'); // Second one has no qualities
    });

    it('should show IDs when requested', () => {
      const result = formatBatchExperienceResponse(experiences, true);
      expect(result).toContain('📝 ID: exp_1');
      expect(result).toContain('📝 ID: exp_2');
    });
  });

  describe('formatRecallResponse', () => {
    const recalls: RecallResult[] = [
      {
        id: 'exp_1',
        content: 'First recalled experience that is quite long and detailed',
        snippet: 'First recalled experience',
        metadata: {
          created: '2025-01-21T11:00:00Z',
          experience: ['mood.open', 'embodied.sensing']
        },
        relevance_score: 0.9
      },
      {
        id: 'exp_2',
        content: 'Second recalled experience',
        metadata: {
          created: '2025-01-21T10:00:00Z'
        },
        relevance_score: 0.7
      }
    ];

    it('should format recall results', () => {
      const result = formatRecallResponse(recalls);
      expect(result).toContain('Found 2 experience(s)');
      expect(result).toContain('1. "First recalled experience"');
      expect(result).toContain('mood.open, embodied.sensing');
      expect(result).toContain('1 hour ago');
      expect(result).toContain('2. "Second recalled experience"');
      expect(result).toContain('2 hours ago');
    });

    it('should show IDs when requested', () => {
      const result = formatRecallResponse(recalls, true);
      expect(result).toContain('ID: exp_1');
      expect(result).toContain('ID: exp_2');
    });

    it('should handle empty results', () => {
      const result = formatRecallResponse([]);
      expect(result).toBe('No experiences found');
    });

    it('should truncate long content', () => {
      const longRecall: RecallResult = {
        id: 'exp_long',
        content: 'a'.repeat(200),
        metadata: {
          created: '2025-01-21T11:00:00Z'
        },
        relevance_score: 0.8
      };
      const result = formatRecallResponse([longRecall]);
      expect(result).toContain('...');
      expect(result.includes('a'.repeat(200))).toBe(false);
    });

    it('should prefer snippet over content', () => {
      const withSnippet: RecallResult = {
        id: 'exp_1',
        content: 'Very long original content that should not be shown',
        snippet: 'Short snippet',
        metadata: {
          created: '2025-01-21T11:00:00Z'
        },
        relevance_score: 0.9
      };
      const result = formatRecallResponse([withSnippet]);
      expect(result).toContain('Short snippet');
      expect(result).not.toContain('Very long original');
    });
  });

  describe('formatReconsiderResponse', () => {
    const reconsiderResult: ExperienceResult = {
      source: {
        id: 'exp_123',
        source: 'Updated experience',
        created: '2025-01-21T11:55:00Z',
        experience: ['mood.closed', 'embodied.thinking']
      }
    };

    it('should format reconsider with qualities', () => {
      const result = formatReconsiderResponse(reconsiderResult);
      expect(result).toContain('Reconsidered as mood.closed, embodied.thinking');
    });

    it('should format reconsider without qualities', () => {
      const noQualities = {
        ...reconsiderResult,
        source: { ...reconsiderResult.source, experience: [] }
      };
      const result = formatReconsiderResponse(noQualities);
      expect(result).toContain('Reconsidered');
      expect(result).not.toContain(' as ');
    });
  });

  describe('formatReleaseResponse', () => {
    it('should format single release', () => {
      const result = formatReleaseResponse(1);
      expect(result).toBe('Released');
    });

    it('should format batch release', () => {
      const result = formatReleaseResponse(5);
      expect(result).toBe('Released 5 experiences');
    });

    it('should default to single release', () => {
      const result = formatReleaseResponse();
      expect(result).toBe('Released');
    });
  });

  describe('Time formatting', () => {
    it('should format various time differences correctly', () => {
      const testCases = [
        { created: '2025-01-21T12:00:00Z', expected: 'just now' },
        { created: '2025-01-21T11:59:00Z', expected: '1 minute ago' },
        { created: '2025-01-21T11:45:00Z', expected: '15 minutes ago' },
        { created: '2025-01-21T11:00:00Z', expected: '1 hour ago' },
        { created: '2025-01-21T09:00:00Z', expected: '3 hours ago' },
        { created: '2025-01-20T12:00:00Z', expected: 'yesterday' },
        { created: '2025-01-18T12:00:00Z', expected: '3 days ago' },
        { created: '2025-01-10T12:00:00Z', expected: '1/10/2025' }
      ];

      for (const { created, expected } of testCases) {
        const result: ExperienceResult = {
          source: {
            id: 'test',
            source: 'test',
            created
          }
        };
        const formatted = formatExperienceResponse(result);
        expect(formatted).toContain(expected);
      }
    });
  });

  describe('Processing formatting', () => {
    it('should format processing levels correctly', () => {
      const testCases = [
        { processing: 'during', expected: 'in the moment' },
        { processing: 'right-after', expected: 'right after' },
        { processing: 'long-after', expected: 'looking back' },
        { processing: undefined, expected: 'in the moment' }, // default
        { processing: 'unknown', expected: 'in the moment' } // default
      ];

      for (const { processing, expected } of testCases) {
        const result: ExperienceResult = {
          source: {
            id: 'test',
            source: 'test',
            created: '2025-01-21T12:00:00Z',
            processing
          }
        };
        const formatted = formatExperienceResponse(result);
        expect(formatted).toContain(`When ${expected}`);
      }
    });
  });
});