/**
 * Schema validation tests for streamlined structure
 */

import { describe, it, expect } from '@jest/globals';
import {
  ExperienceInputSchema,
  SearchInputSchema,
  ReconsiderInputSchema,
  AI_IDENTITIES,
  isExperienceInput,
  isSearchInput,
  isReconsiderInput,
  isToolResult,
  hasExperienceArray,
  hasSearchArray,
  hasReconsiderArray,
} from './schemas.js';

describe('Schema Validation', () => {
  describe('ExperienceInputSchema', () => {
    it('should validate single experience input', () => {
      const input = {
        experiences: [
          {
            anchor: '🧪',
            embodied: 'feeling energized and focused',
            focus: 'on testing the schemas',
            mood: 'methodical and careful',
            purpose: 'ensuring correctness',
            space: 'in my development environment',
            time: 'this afternoon',
            presence: 'working with Claude',
            who: ['Developer', 'Claude'],
            citation: 'Testing the new streamlined structure'
          }
        ]
      };
      const result = ExperienceInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate batch experience input', () => {
      const input = {
        experiences: [
          {
            anchor: '💡',
            embodied: 'mind racing with ideas',
            focus: 'jumping between possibilities',
            mood: 'excited and creative',
            purpose: 'exploring new concepts',
            space: 'at my desk',
            time: 'early morning',
            presence: 'brainstorming with Claude',
            who: ['Human', 'Claude']
          },
          {
            anchor: '🌊',
            embodied: 'feeling calm and grounded',
            focus: 'wide and receptive',
            mood: 'peaceful',
            purpose: 'just being present',
            space: 'by the window',
            time: 'sunset',
            presence: 'enjoying solitude',
            who: ['Human', 'Claude']
          }
        ]
      };
      const result = ExperienceInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate experience without recall (auto-recall is default)', () => {
      const input = {
        experiences: [
          {
            anchor: '🔄',
            embodied: 'connecting past and present',
            focus: 'on patterns emerging',
            mood: 'reflective',
            purpose: 'integrating learnings',
            space: 'in contemplation',
            time: 'looking back and forward',
            presence: 'with memories and Claude',
            who: ['Human', 'Claude']
          }
        ]
      };
      const result = ExperienceInputSchema.safeParse(input);
      expect(result.success).toBe(true);
      // Recall is automatic now, no parameter needed
    });

    it('should reject input without experiences array', () => {
      const input = {
        recall: {
          query: 'something'
        }
      };
      const result = ExperienceInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject empty experiences array', () => {
      const input = {
        experiences: []
      };
      const result = ExperienceInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject experience without AI in who array', () => {
      const input = {
        experiences: [
          {
            anchor: '❌',
            embodied: 'testing validation',
            focus: 'on requirements',
            mood: 'thorough',
            purpose: 'finding edge cases',
            space: 'in test suite',
            time: 'during validation',
            presence: 'working alone',
            who: ['Human', 'SomeoneElse'] // No AI identity
          }
        ]
      };
      const result = ExperienceInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject experience with missing required fields', () => {
      const input = {
        experiences: [
          {
            anchor: '🚫',
            embodied: 'incomplete experience',
            // Missing other required fields
            who: ['Human', 'Claude']
          }
        ]
      };
      const result = ExperienceInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject invalid emoji', () => {
      const input = {
        experiences: [
          {
            anchor: 'not-emoji',
            embodied: 'testing emoji validation',
            focus: 'on format requirements',
            mood: 'checking carefully',
            purpose: 'ensuring validity',
            space: 'in validation',
            time: 'right now',
            presence: 'with Claude',
            who: ['Tester', 'Claude']
          }
        ]
      };
      const result = ExperienceInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should accept all recognized AI identities', () => {
      for (const ai of AI_IDENTITIES) {
        const input = {
          experiences: [
            {
              anchor: '🤖',
              embodied: `testing with ${ai}`,
              focus: 'on AI validation',
              mood: 'systematic',
              purpose: 'checking each AI',
              space: 'in test environment',
              time: 'during validation',
              presence: `working with ${ai}`,
              who: ['Human', ai]
            }
          ]
        };
        const result = ExperienceInputSchema.safeParse(input);
        expect(result.success).toBe(true);
      }
    });

    it('should accept compound emojis', () => {
      const compoundEmojis = ['👨‍💻', '🏳️‍🌈', '👩‍🔬', '🧑‍🎨'];
      for (const emoji of compoundEmojis) {
        const input = {
          experiences: [
            {
              anchor: emoji,
              embodied: 'testing compound emojis',
              focus: 'on unicode support',
              mood: 'thorough',
              purpose: 'ensuring compatibility',
              space: 'in emoji testing',
              time: 'during validation',
              presence: 'with Claude',
              who: ['Tester', 'Claude']
            }
          ]
        };
        const result = ExperienceInputSchema.safeParse(input);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('SearchInputSchema', () => {
    it('should validate basic search', () => {
      const input = {
        searches: [
          {
            search: 'creative moments',
            limit: 10
          }
        ]
      };
      const result = SearchInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate search with all filters', () => {
      const input = {
        searches: [
          {
            search: 'insights',
            who: 'Human',
            qualities: {
              mood: 'open',
              embodied: { present: true }
            },
            created: '2025-01-21',
            limit: 20,
            offset: 10,
            sort: 'relevance'
          }
        ]
      };
      const result = SearchInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate ID-based search', () => {
      const input = {
        searches: [
          {
            ids: ['exp_123', 'exp_456']
          }
        ]
      };
      const result = SearchInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject empty searches array', () => {
      const input = {
        searches: []
      };
      const result = SearchInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('ReconsiderInputSchema', () => {
    it('should validate experience update', () => {
      const input = {
        reconsiderations: [
          {
            id: 'exp_123',
            citation: 'Updated citation',
            who: ['Human', 'GPT-4'],
            mood: 'hopeful',
            purpose: 'moving forward'
          }
        ]
      };
      const result = ReconsiderInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate release request', () => {
      const input = {
        reconsiderations: [
          {
            id: 'exp_123',
            release: true,
            releaseReason: 'No longer relevant'
          }
        ]
      };
      const result = ReconsiderInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate batch updates', () => {
      const input = {
        reconsiderations: [
          {
            id: 'exp_1',
            who: ['Human', 'Claude']
          },
          {
            id: 'exp_2',
            embodied: 'feeling different now'
          },
          {
            id: 'exp_3',
            release: true
          }
        ]
      };
      const result = ReconsiderInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject reconsideration without ID', () => {
      const input = {
        reconsiderations: [
          {
            citation: 'Missing ID'
          }
        ]
      };
      const result = ReconsiderInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('Type Guards', () => {
    it('should correctly identify ExperienceInput', () => {
      const valid = {
        experiences: [{
          anchor: '✅',
          embodied: 'testing type guard',
          focus: 'on validation',
          mood: 'confident',
          purpose: 'ensuring types',
          space: 'in typescript',
          time: 'compile time',
          presence: 'with type system',
          who: ['Developer', 'Claude']
        }]
      };
      const invalid = { notAnExperience: true };
      
      expect(isExperienceInput(valid)).toBe(true);
      expect(isExperienceInput(invalid)).toBe(false);
    });

    it('should correctly identify SearchInput', () => {
      const valid = {
        searches: [{
          search: 'test query'
        }]
      };
      const invalid = { query: 'not valid structure' };
      
      expect(isSearchInput(valid)).toBe(true);
      expect(isSearchInput(invalid)).toBe(false);
    });

    it('should correctly identify ReconsiderInput', () => {
      const valid = {
        reconsiderations: [{
          id: 'exp_123',
          release: true
        }]
      };
      const invalid = { id: 'exp_123' };
      
      expect(isReconsiderInput(valid)).toBe(true);
      expect(isReconsiderInput(invalid)).toBe(false);
    });

    it('should correctly identify ToolResult', () => {
      const valid = {
        isError: false,
        content: [{
          type: 'text',
          text: 'Success'
        }]
      };
      const invalid = { result: 'not valid' };
      
      expect(isToolResult(valid)).toBe(true);
      expect(isToolResult(invalid)).toBe(false);
    });

    it('should correctly identify array formats', () => {
      const experienceInput = {
        experiences: [{
          anchor: '📝',
          embodied: 'testing',
          focus: 'on arrays',
          mood: 'checking',
          purpose: 'validation',
          space: 'here',
          time: 'now',
          presence: 'with Claude',
          who: ['Test', 'Claude']
        }]
      };
      
      const searchInput = {
        searches: [{ search: 'test' }]
      };
      
      const reconsiderInput = {
        reconsiderations: [{ id: 'exp_1', release: true }]
      };
      
      expect(hasExperienceArray(experienceInput)).toBe(true);
      expect(hasSearchArray(searchInput)).toBe(true);
      expect(hasReconsiderArray(reconsiderInput)).toBe(true);
    });
  });
});