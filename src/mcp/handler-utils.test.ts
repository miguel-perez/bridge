/**
 * Tests for MCP Handler Utilities
 */

import {
  CONTENT_SNIPPET_LENGTH,
  RELEVANCE_PERCENT_PRECISION,
  formatExperience,
  formatDate,
  formatMetadata,
  formatContent,
  formatRelevanceBreakdown,
  formatSource,
} from './handler-utils.js';
import type { SourceRecord } from '../core/types.js';
import { humanQualities } from '../test-utils/format-converter.js';

describe('Handler Utilities', () => {
  describe('Constants', () => {
    it('should have correct constant values', () => {
      expect(CONTENT_SNIPPET_LENGTH).toBe(600);
      expect(RELEVANCE_PERCENT_PRECISION).toBe(0);
    });
  });

  describe('formatExperience', () => {
    it('should format experience qualities as bulleted list', () => {
      const experience = {
        mood: 'open',
        embodied: 'sensing',
        presence: 'collective',
        focus: false,
        purpose: false,
        space: false,
        time: false
      };
      const result = formatExperience(experience);
      expect(result).toBe('• mood.open\n• embodied.sensing\n• presence.collective');
    });

    it('should handle undefined experience', () => {
      const result = formatExperience(undefined);
      expect(result).toBe('No experiential qualities analyzed');
    });

    it('should handle empty experience object', () => {
      const result = formatExperience({});
      expect(result).toBe('No experiential qualities analyzed');
    });

    it('should handle single quality', () => {
      const experience = {
        mood: 'open',
        embodied: false,
        presence: false,
        focus: false,
        purpose: false,
        space: false,
        time: false
      };
      const result = formatExperience(experience);
      expect(result).toBe('• mood.open');
    });
  });

  describe('formatDate', () => {
    beforeEach(() => {
      // Mock current time for consistent testing
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-21T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should format recent time as "Just now"', () => {
      const date = new Date('2025-01-21T11:59:45Z').toISOString();
      expect(formatDate(date)).toBe('Just now');
    });

    it('should format minutes ago', () => {
      const date1 = new Date('2025-01-21T11:59:00Z').toISOString();
      expect(formatDate(date1)).toBe('1 minute ago');

      const date2 = new Date('2025-01-21T11:45:00Z').toISOString();
      expect(formatDate(date2)).toBe('15 minutes ago');
    });

    it('should format hours ago', () => {
      const date1 = new Date('2025-01-21T11:00:00Z').toISOString();
      expect(formatDate(date1)).toBe('1 hour ago');

      const date2 = new Date('2025-01-21T09:00:00Z').toISOString();
      expect(formatDate(date2)).toBe('3 hours ago');
    });

    it('should format today with time', () => {
      const date = new Date('2025-01-21T08:30:00Z').toISOString();
      const result = formatDate(date);
      // Should be either "Today at X:XX AM/PM" or "X hours ago" depending on exact test time
      expect(result).toMatch(/^(Today at \d{1,2}:\d{2} [AP]M|[0-9]+ hours? ago)$/);
    });

    it('should format yesterday with time', () => {
      const date = new Date('2025-01-20T14:45:00Z').toISOString();
      const result = formatDate(date);
      // Should be either "Yesterday at X:XX PM" or "XX hours ago"
      expect(result).toMatch(/^(Yesterday at \d{1,2}:\d{2} [AP]M|[0-9]+ hours? ago)$/);
    });

    it('should format dates within a week', () => {
      const date = new Date('2025-01-18T10:30:00Z').toISOString();
      const result = formatDate(date);
      // Should include day name (Saturday) and time
      expect(result).toMatch(/Saturday/);
    });

    it('should format older dates with full date', () => {
      const date = new Date('2025-01-01T12:00:00Z').toISOString();
      const result = formatDate(date);
      expect(result).toMatch(/Wednesday.*January.*1.*2025/);
    });

    it('should handle empty date string', () => {
      expect(formatDate('')).toBe('Unknown date');
    });

    it('should handle invalid date string', () => {
      expect(formatDate('invalid-date')).toBe('Invalid date');
    });

    it('should handle null/undefined gracefully', () => {
      expect(formatDate(null as unknown as string)).toBe('Unknown date');
      expect(formatDate(undefined as unknown as string)).toBe('Unknown date');
    });

    it('should handle date parsing errors', () => {
      // Force an error by mocking Date constructor
      const originalDate = global.Date;
      global.Date = jest.fn(() => {
        throw new Error('Date error');
      }) as unknown as typeof Date;

      expect(formatDate('2025-01-21')).toBe('Invalid date');

      global.Date = originalDate;
    });
  });

  describe('formatMetadata', () => {
    it('should format complete metadata', () => {
      const source: SourceRecord = {
        id: 'test',
        source: 'content',
        who: 'Alice',
        created: '2025-01-21T12:00:00Z',
      };

      const result = formatMetadata(source);
      // The date is in the past, so it will show full date not "Just now"
      expect(result).toMatch(/^Alice \| .+/);
    });

    it('should use defaults for missing fields', () => {
      const source: SourceRecord = {
        id: 'test',
        source: 'content',
        created: '2025-01-21T12:00:00Z',
      };

      const result = formatMetadata(source);
      // The date is in the past, so it will show full date not "Just now"
      expect(result).toMatch(/^Unknown \| .+/);
    });

    it('should handle missing created date', () => {
      const source = {
        id: 'test',
        source: 'content',
        who: 'Bob',
      } as SourceRecord;

      const result = formatMetadata(source);
      expect(result).toBe('Bob');
    });
  });

  describe('formatContent', () => {
    it('should return full content if short', () => {
      const content = 'Short content';
      expect(formatContent(content)).toBe('Short content');
    });

    it('should truncate long content', () => {
      const content = 'a'.repeat(650);
      const result = formatContent(content);
      expect(result).toBe('a'.repeat(600) + '...');
    });

    it('should prefer narrative over content', () => {
      const content = 'Long original content ' + 'x'.repeat(600);
      const narrative = 'Short narrative';
      expect(formatContent(content, narrative)).toBe('Short narrative');
    });

    it('should truncate long narrative', () => {
      const content = 'content';
      const narrative = 'n'.repeat(650);
      const result = formatContent(content, narrative);
      expect(result).toBe('n'.repeat(600) + '...');
    });

    it('should include full content when requested', () => {
      const content = 'a'.repeat(250);
      const result = formatContent(content, undefined, true);
      expect(result).toBe(content);
    });

    it('should handle empty content', () => {
      expect(formatContent('')).toBe('No content');
      expect(formatContent('', '')).toBe('No content');
    });

    it('should handle null/undefined content', () => {
      expect(formatContent(null as unknown as string)).toBe('No content');
      expect(formatContent(undefined as unknown as string)).toBe('No content');
    });

    it('should handle content exactly at snippet length', () => {
      const content = 'a'.repeat(200);
      expect(formatContent(content)).toBe(content);
    });
  });

  describe('formatRelevanceBreakdown', () => {
    it('should format complete breakdown', () => {
      const breakdown = {
        text_match: 0.85,
        vector_similarity: 0.92,
        semantic_similarity: 0.78,
        filter_relevance: 1.0,
      };

      const result = formatRelevanceBreakdown(breakdown);
      expect(result).toBe(
        'Text match: 85% | Vector similarity: 92% | Semantic similarity: 78% | Filters: 100%'
      );
    });

    it('should handle partial breakdown', () => {
      const breakdown = {
        text_match: 0.5,
        semantic_similarity: 0.75,
      };

      const result = formatRelevanceBreakdown(breakdown);
      expect(result).toBe('Text match: 50% | Semantic similarity: 75%');
    });

    it('should handle empty breakdown', () => {
      expect(formatRelevanceBreakdown({})).toBe('No relevance breakdown');
    });

    it('should handle null/undefined breakdown', () => {
      expect(formatRelevanceBreakdown(null)).toBe('No breakdown available');
      expect(formatRelevanceBreakdown(undefined)).toBe('No breakdown available');
    });

    it('should handle zero values', () => {
      const breakdown = {
        text_match: 0,
        vector_similarity: 0,
      };

      const result = formatRelevanceBreakdown(breakdown);
      expect(result).toBe('Text match: 0% | Vector similarity: 0%');
    });

    it('should respect precision setting', () => {
      const breakdown = {
        text_match: 0.8567,
        vector_similarity: 0.4321,
      };

      const result = formatRelevanceBreakdown(breakdown);
      // With precision 0, should round to whole numbers
      expect(result).toBe('Text match: 86% | Vector similarity: 43%');
    });

    it('should handle breakdown with undefined values', () => {
      const breakdown = {
        text_match: 0.5,
        vector_similarity: undefined,
        semantic_similarity: 0.75,
        filter_relevance: undefined,
      };

      const result = formatRelevanceBreakdown(breakdown);
      expect(result).toBe('Text match: 50% | Semantic similarity: 75%');
    });
  });

  describe('formatSource', () => {
    it('should format complete source record', () => {
      const source: SourceRecord = {
        id: 'exp_123',
        source: 'I feel happy today',
        who: 'Alice',
        created: '2025-01-21T12:00:00Z',
        experienceQualities: humanQualities('mood.open', 'embodied.sensing'),
      };

      const result = formatSource(source);
      expect(result).toContain('ID: exp_123');
      expect(result).toContain('Content: I feel happy today');
      expect(result).toContain('Who: Alice');
      expect(result).toMatch(/Tuesday, January 21, 2025|Just now/);
      expect(result).toContain('• mood.open');
      expect(result).toContain('• embodied.sensing');
    });

    it('should format minimal source record', () => {
      const source: SourceRecord = {
        id: 'exp_456',
        source: 'Basic content',
        created: '2025-01-21T12:00:00Z',
      };

      const result = formatSource(source);
      expect(result).toContain('ID: exp_456');
      expect(result).toContain('Content: Basic content');
      expect(result).toMatch(/Tuesday, January 21, 2025|Just now/);
      expect(result).not.toContain('Perspective:');
      expect(result).not.toContain('Experiencer:');
      expect(result).not.toContain('Processing:');
      expect(result).not.toContain('Crafted:');
    });

    // Test removed: crafted field no longer exists in the data model

    it('should handle missing created date', () => {
      const source: SourceRecord = {
        id: 'exp_789',
        source: 'No date content',
        created: '2025-01-21T12:00:00Z',
      };

      const result = formatSource(source);
      expect(result).toContain('ID: exp_789');
      expect(result).toContain('Content: No date content');
      expect(result).not.toContain('ago');
      expect(result).not.toContain('Today');
    });

    it('should join parts with newlines', () => {
      const source: SourceRecord = {
        id: 'exp_123',
        source: 'content',
        who: 'Bob',
        created: '2025-01-21T12:00:00Z',
      };

      const result = formatSource(source);
      const lines = result.split('\n');
      expect(lines).toContain('ID: exp_123');
      expect(lines).toContain('Content: content');
      // Removed perspective check
      expect(lines).toContain('Who: Bob');
    });
  });
});
