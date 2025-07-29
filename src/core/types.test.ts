/**
 * Tests for core types and validation functions
 */

import {
  QUALITY_TYPES,
  DEFAULTS,
  type Experience,
  type StorageData,
  isValidQualityType,
  isValidExperience,
  createExperience,
  // Zod schemas and validation functions
  ExperienceSchema,
  StorageDataSchema,
  validateExperience,
  validateStorageData,
  // Conversion functions
  experienceArrayToQualities,
} from './types.js';

describe('Constants', () => {
  // PERSPECTIVES constant removed - field no longer in source structure

  // PROCESSING_LEVELS constant removed - field no longer in source structure

  it('should have valid quality types', () => {
    expect(QUALITY_TYPES).toEqual([
      'embodied',
      'focus',
      'mood',
      'purpose',
      'space',
      'time',
      'presence',
    ]);
  });

  it('should have sensible defaults', () => {
    expect(DEFAULTS.EXPERIENCER).toBe('self');
  });
});

describe('Type Validation Functions', () => {
  describe('isValidQualityType', () => {
    it('should return true for valid quality types', () => {
      expect(isValidQualityType('embodied')).toBe(true);
      expect(isValidQualityType('focus')).toBe(true);
      expect(isValidQualityType('mood')).toBe(true);
      expect(isValidQualityType('purpose')).toBe(true);
      expect(isValidQualityType('space')).toBe(true);
      expect(isValidQualityType('time')).toBe(true);
      expect(isValidQualityType('presence')).toBe(true);
    });
    it('should return true for dot notation quality types', () => {
      expect(isValidQualityType('embodied.thinking')).toBe(true);
      expect(isValidQualityType('mood.open')).toBe(true);
      expect(isValidQualityType('purpose.goal')).toBe(true);
    });

    it('should return false for invalid quality types', () => {
      expect(isValidQualityType('EMBODIED')).toBe(false);
      expect(isValidQualityType('foo')).toBe(false);
      expect(isValidQualityType('attentional')).toBe(false);
      expect(isValidQualityType('emotion')).toBe(false); // old name
      expect(isValidQualityType('body')).toBe(false); // old name
    });
  });

  // isValidPerspective and isValidProcessingLevel removed - fields no longer in source structure

  describe('isValidExperience', () => {
    it('should accept valid experience objects', () => {
      const validExperience: Experience = {
        id: 'exp_test123',
        created: '2024-01-01T00:00:00.000Z',
        anchor: '🧪',
        embodied: 'thinking deeply about the problem',
        focus: 'on the test implementation',
        mood: 'open and curious',
        purpose: 'ensuring code quality',
        space: 'in the testing environment',
        time: 'during development',
        presence: 'pair programming with AI',
        who: ['test', 'Claude'],
        citation: 'Test source'
      };
      expect(isValidExperience(validExperience)).toBe(true);
    });

    it('should accept valid experience objects without citation', () => {
      const validExperienceNoCitation: Experience = {
        id: 'exp_test123',
        created: '2024-01-01T00:00:00.000Z',
        anchor: '💡',
        embodied: 'sensing the pattern in my anxiety',
        focus: 'on recurring emotional patterns',
        mood: 'closed but observant',
        purpose: 'understanding my reactions',
        space: 'in reflection',
        time: 'looking toward future situations',
        presence: 'introspecting with Claude',
        who: ['test', 'Claude']
      };
      expect(isValidExperience(validExperienceNoCitation)).toBe(true);
    });

    it('should accept experience with all string qualities', () => {
      const validExperienceAllStrings: Experience = {
        id: 'exp_test123',
        created: '2024-01-01T00:00:00.000Z',
        anchor: '🧪',
        embodied: 'fully present in body and mind',
        focus: 'laser-focused on the task',
        mood: 'energized and positive',
        purpose: 'completing the test suite',
        space: 'at my workstation',
        time: 'in this moment',
        presence: 'collaborating with Claude',
        who: ['Developer', 'Claude']
      };
      expect(isValidExperience(validExperienceAllStrings)).toBe(true);
    });

    it('should reject experience missing AI in who array', () => {
      const invalidExperienceNoAI = {
        id: 'exp_test123',
        created: '2024-01-01T00:00:00.000Z',
        anchor: '🧪',
        embodied: 'reviewing code with the team',
        focus: 'on code quality',
        mood: 'open to feedback during the review',
        purpose: 'improving the codebase',
        space: 'in the code review session',
        time: 'during standup',
        presence: 'with the team',
        who: ['test'] // Missing AI identity
      };
      expect(isValidExperience(invalidExperienceNoAI)).toBe(false);
    });

    it('should reject invalid experience objects', () => {
      expect(isValidExperience(null)).toBe(false);
      expect(isValidExperience(undefined)).toBe(false);
      expect(isValidExperience({})).toBe(false);
      expect(isValidExperience({ id: 'test' })).toBe(false);
      expect(isValidExperience({ id: '', anchor: '🧪', created: '2024-01-01' })).toBe(
        false
      );
    });

    it('should reject experience with empty qualities', () => {
      const invalidExperienceEmptyQualities = {
        id: 'exp_test123',
        created: '2024-01-01T00:00:00.000Z',
        anchor: '🧪',
        embodied: '', // Empty string
        focus: 'on testing',
        mood: 'focused',
        purpose: 'validation',
        space: 'here',
        time: 'now',
        presence: 'with Claude',
        who: ['test', 'Claude']
      };
      expect(isValidExperience(invalidExperienceEmptyQualities)).toBe(false);
    });
  });
});

describe('Factory Functions', () => {
  describe('createExperience', () => {
    it('should create an experience with default values', () => {
      const qualities = {
        embodied: 'testing the factory function',
        focus: 'on validation',
        mood: 'methodical',
        purpose: 'ensuring correctness',
        space: 'in the test suite',
        time: 'during testing',
        presence: 'with Claude'
      };
      
      const experience = createExperience(
        qualities,
        ['Developer', 'Claude'],
        '🧪',
        'Test source'
      );

      expect(experience.anchor).toBe('🧪');
      expect(experience.id).toMatch(/^exp_/);
      expect(experience.created).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(experience.who).toEqual(['Developer', 'Claude']);
      expect(experience.citation).toBe('Test source');
    });

    it('should use provided ID', () => {
      const qualities = {
        embodied: 'testing with custom ID',
        focus: 'on ID handling',
        mood: 'precise',
        purpose: 'ID validation',
        space: 'in tests',
        time: 'now',
        presence: 'with Claude'
      };
      
      const experience = createExperience(
        qualities,
        ['Tester', 'Claude'],
        '🧪',
        undefined,
        'custom-id'
      );
      expect(experience.id).toBe('custom-id');
    });
  });

});

describe('Zod Schema Validation', () => {
  describe('ExperienceSchema', () => {
    it('should validate valid experience', () => {
      const validExperience: Experience = {
        id: 'exp_test123',
        created: '2024-01-01T00:00:00.000Z',
        anchor: '🧪',
        embodied: 'thinking through the validation',
        focus: 'on schema correctness',
        mood: 'open and curious',
        purpose: 'ensuring data integrity',
        space: 'in the validation layer',
        time: 'during schema checks',
        presence: 'working with Claude',
        who: ['test', 'Claude'],
        citation: 'Test source content'
      };

      const result = ExperienceSchema.safeParse(validExperience);
      expect(result.success).toBe(true);
    });

    it('should validate experience without citation', () => {
      const validExperienceNoCitation: Experience = {
        id: 'exp_test123',
        created: '2024-01-01T00:00:00.000Z',
        anchor: '💡',
        embodied: 'sensing anxiety patterns',
        focus: 'on emotional patterns',
        mood: 'closed but aware',
        purpose: 'pattern recognition',
        space: 'in self-reflection',
        time: 'anticipating future',
        presence: 'exploring with Claude',
        who: ['test', 'Claude']
      };

      const result = ExperienceSchema.safeParse(validExperienceNoCitation);
      expect(result.success).toBe(true);
    });

    it('should validate experience with mixed AI identities', () => {
      const validExperienceMixedAI: Experience = {
        id: 'exp_test123',
        created: '2024-01-01T00:00:00.000Z',
        anchor: '😵',
        embodied: 'feeling the overwhelm in my chest',
        focus: 'scattered across many concerns',
        mood: 'closed and defensive',
        purpose: 'just trying to cope',
        space: 'trapped in my thoughts',
        time: 'stuck in this moment',
        presence: 'seeking support from AIs',
        who: ['test', 'Claude', 'GPT-4']
      };

      const result = ExperienceSchema.safeParse(validExperienceMixedAI);
      expect(result.success).toBe(true);
    });

    it('should reject experience with invalid anchor', () => {
      const invalidExperienceAnchor = {
        id: 'exp_test123',
        created: '2024-01-01T00:00:00.000Z',
        anchor: 'not-an-emoji', // Invalid
        embodied: 'testing anchor validation',
        focus: 'on emoji requirements',
        mood: 'methodical',
        purpose: 'validation testing',
        space: 'in the test',
        time: 'during validation',
        presence: 'with Claude',
        who: ['test', 'Claude']
      };

      const result = ExperienceSchema.safeParse(invalidExperienceAnchor);
      expect(result.success).toBe(false);
    });

    it('should reject experience missing required fields', () => {
      const invalidExperienceMissing = {
        id: 'exp_test123',
        created: '2024-01-01T00:00:00.000Z',
        anchor: '🧪',
        embodied: 'partial data',
        // Missing other required fields
        who: ['test', 'Claude']
      };

      const result = ExperienceSchema.safeParse(invalidExperienceMissing);
      expect(result.success).toBe(false);
    });

    it('should reject experience with empty who array', () => {
      const invalidExperienceEmptyWho = {
        id: 'exp_test123',
        created: '2024-01-01T00:00:00.000Z',
        anchor: '🧪',
        embodied: 'testing who validation',
        focus: 'on array requirements',
        mood: 'checking carefully',
        purpose: 'validation',
        space: 'in tests',
        time: 'now',
        presence: 'alone?',
        who: [] // Empty array
      };

      const result = ExperienceSchema.safeParse(invalidExperienceEmptyWho);
      expect(result.success).toBe(false);
    });

    it('should reject experience with missing required fields', () => {
      const invalidExperience = {
        id: 'exp_test123',
        // missing most fields
        created: '2024-01-01T00:00:00.000Z',
      };

      const result = ExperienceSchema.safeParse(invalidExperience);
      expect(result.success).toBe(false);
    });
  });

  describe('StorageDataSchema', () => {
    it('should validate valid storage data', () => {
      const validStorageData: StorageData = {
        sources: [
          {
            id: 'exp_test123',
            created: '2024-01-01T00:00:00.000Z',
            anchor: '🧪',
            embodied: 'thinking through storage',
            focus: 'on data persistence',
            mood: 'organized',
            purpose: 'testing storage layer',
            space: 'in the database',
            time: 'during save operation',
            presence: 'with Claude',
            who: ['test', 'Claude'],
            citation: 'Test source content'
          },
        ],
        embeddings: [
          {
            sourceId: 'test-123',
            vector: [0.1, 0.2, 0.3],
            generated: '2024-01-01T00:00:00.000Z',
          },
        ],
      };

      const result = StorageDataSchema.safeParse(validStorageData);
      expect(result.success).toBe(true);
    });

    it('should validate storage data with multiple experiences', () => {
      const validStorageDataMultiple: StorageData = {
        sources: [
          {
            id: 'exp_test123',
            created: '2024-01-01T00:00:00.000Z',
            anchor: '🧪',
            embodied: 'first experience',
            focus: 'on testing',
            mood: 'methodical',
            purpose: 'validation',
            space: 'in memory',
            time: 'at start',
            presence: 'with Claude',
            who: ['test', 'Claude']
          },
          {
            id: 'exp_pattern001',
            created: '2024-01-01T00:00:00.000Z',
            anchor: '💡',
            embodied: 'noticing anxiety patterns',
            focus: 'on recurring feelings',
            mood: 'introspective',
            purpose: 'self-understanding',
            space: 'in reflection',
            time: 'looking back and forward',
            presence: 'processing with Claude',
            who: ['test', 'Claude'],
            citation: 'I notice I always feel anxious before things that end up going well'
          },
        ],
      };

      const result = StorageDataSchema.safeParse(validStorageDataMultiple);
      expect(result.success).toBe(true);
    });

    it('should reject invalid storage data', () => {
      const invalidStorageData = {
        sources: 'not an array',
        embeddings: 'not an array',
      };

      const result = StorageDataSchema.safeParse(invalidStorageData);
      expect(result.success).toBe(false);
    });
  });
});

describe('Zod-based Validation Functions', () => {
  describe('validateExperience', () => {
    it('should return success for valid experience', () => {
      const validExperience: Experience = {
        id: 'exp_test123',
        created: '2024-01-01T00:00:00.000Z',
        anchor: '🧪',
        embodied: 'thinking through validation',
        focus: 'on correctness',
        mood: 'open and systematic',
        purpose: 'ensuring data integrity',
        space: 'in the validator',
        time: 'during runtime',
        presence: 'with Claude',
        who: ['test', 'Claude'],
        citation: 'Test source content'
      };

      const result = validateExperience(validExperience);
      expect(result).toBeDefined();
    });

    it('should return success for valid experience without citation', () => {
      const validExperienceNoCitation: Experience = {
        id: 'exp_pattern001',
        created: '2024-01-01T00:00:00.000Z',
        anchor: '💡',
        embodied: 'sensing patterns in my anxiety',
        focus: 'on emotional cycles',
        mood: 'closed yet observant',
        purpose: 'understanding patterns',
        space: 'in contemplation',
        time: 'reflecting on future events',
        presence: 'exploring with Claude',
        who: ['test', 'Claude']
      };

      const result = validateExperience(validExperienceNoCitation);
      expect(result).toBeDefined();
    });

    it('should return error for invalid experience', () => {
      const invalidExperience = {
        id: '',
        anchor: '',
      };

      expect(() => validateExperience(invalidExperience)).toThrow();
    });

    it('should return error for experience missing AI identity', () => {
      const invalidExperienceNoAI = {
        id: 'exp_test123',
        created: '2024-01-01T00:00:00.000Z',
        anchor: '🧪',
        embodied: 'testing without AI',
        focus: 'on validation',
        mood: 'careful',
        purpose: 'checking requirements',
        space: 'in tests',
        time: 'now',
        presence: 'alone',
        who: ['test'] // Missing AI
      };

      expect(() => validateExperience(invalidExperienceNoAI)).toThrow();
    });
  });

  describe('validateStorageData', () => {
    it('should return success for valid storage data', () => {
      const validStorageData: StorageData = {
        sources: [
          {
            id: 'exp_test123',
            created: '2024-01-01T00:00:00.000Z',
            anchor: '🧪',
            embodied: 'validating storage',
            focus: 'on data structure',
            mood: 'systematic',
            purpose: 'ensuring persistence',
            space: 'in storage layer',
            time: 'during operation',
            presence: 'with Claude',
            who: ['test', 'Claude'],
            citation: 'Test source content'
          },
        ],
      };

      const result = validateStorageData(validStorageData);
      expect(result).toBeDefined();
    });

    it('should return success for valid storage data with mixed experiences', () => {
      const validStorageDataMixed: StorageData = {
        sources: [
          {
            id: 'exp_test123',
            created: '2024-01-01T00:00:00.000Z',
            anchor: '🧪',
            embodied: 'working on tests',
            focus: 'on validation',
            mood: 'methodical',
            purpose: 'quality assurance',
            space: 'in the codebase',
            time: 'this afternoon',
            presence: 'with Claude',
            who: ['test', 'Claude']
          },
          {
            id: 'exp_pattern001',
            created: '2024-01-01T00:00:00.000Z',
            anchor: '💡',
            embodied: 'recognizing anxiety patterns',
            focus: 'on emotional patterns',
            mood: 'introspective',
            purpose: 'self-awareness',
            space: 'in reflection',
            time: 'considering future',
            presence: 'processing with multiple AIs',
            who: ['test', 'Claude', 'GPT-4'],
            citation: 'I notice I always feel anxious before things that end up going well'
          },
        ],
      };

      const result = validateStorageData(validStorageDataMixed);
      expect(result).toBeDefined();
    });

    it('should return error for invalid storage data', () => {
      const invalidStorageData = {
        sources: 'not an array',
        embeddings: 'not an array',
      };

      expect(() => validateStorageData(invalidStorageData)).toThrow();
    });
  });

  describe('Experience conversion functions', () => {
    describe('experienceArrayToQualities', () => {
      it('should convert array to qualities with false defaults', () => {
        const result = experienceArrayToQualities([]);
        expect(result).toEqual({
          embodied: false,
          focus: false,
          mood: false,
          purpose: false,
          space: false,
          time: false,
          presence: false,
        });
      });

      it('should convert subtypes to specific values', () => {
        const result = experienceArrayToQualities([
          'embodied.thinking',
          'mood.open',
          'presence.collective',
        ]);
        expect(result).toEqual({
          embodied: 'thinking',
          focus: false,
          mood: 'open',
          purpose: false,
          space: false,
          time: false,
          presence: 'collective',
        });
      });

      it('should convert base qualities to true', () => {
        const result = experienceArrayToQualities(['embodied', 'mood', 'time']);
        expect(result).toEqual({
          embodied: true,
          focus: false,
          mood: true,
          purpose: false,
          space: false,
          time: true,
          presence: false,
        });
      });

      it('should handle mixed base and subtype qualities', () => {
        const result = experienceArrayToQualities([
          'embodied',
          'mood.open',
          'time',
          'presence.collective',
        ]);
        expect(result).toEqual({
          embodied: true,
          focus: false,
          mood: 'open',
          purpose: false,
          space: false,
          time: true,
          presence: 'collective',
        });
      });
    });

    
  });
});
