/**
 * Core types for the Bridge experiential data experience system.
 * Defines the data structures for capturing and analyzing human experience
 * through simplified quality arrays.
 */

import { z } from 'zod';

// ============================================================================
// CONSTANTS
// ============================================================================

// Perspective and processing constants removed for streamlining

/** Valid content types for experiential data */
export const CONTENT_TYPES = ['text', 'audio'] as const;

/** Valid experiential quality types - simplified names from README */
export const QUALITY_TYPES = [
  'embodied',
  'focus',
  'mood',
  'purpose',
  'space',
  'time',
  'presence',
] as const;

/** Valid subtypes for each quality dimension */
export const QUALITY_SUBTYPES = {
  embodied: ['thinking', 'sensing'] as const,
  focus: ['narrow', 'broad'] as const,
  mood: ['open', 'closed'] as const,
  purpose: ['goal', 'wander'] as const,
  space: ['here', 'there'] as const,
  time: ['past', 'future'] as const,
  presence: ['individual', 'collective'] as const,
} as const;

/** Default values for experiential data */
export const DEFAULTS = {
  EXPERIENCER: 'self',
  CONTENT_TYPE: 'text' as const,
} as const;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

// Perspective and ProcessingLevel types removed for streamlining

/** Experiential quality types */
export type QualityType = (typeof QUALITY_TYPES)[number];

/** Quality subtypes for each dimension */
export type QualitySubtype<T extends QualityType> = (typeof QUALITY_SUBTYPES)[T][number];

/**
 * Complete switchboard of experiential qualities.
 * Each quality can be:
 * - false: not prominent (receded)
 * - string: full sentence in experiencer's voice describing the quality
 * 
 * Examples:
 * - embodied: "my mind races through possibilities" | "feeling it in my bones" | false
 * - mood: "open to whatever emerges from this" | "shutting down, need space" | false
 * 
 * @deprecated Use the new flat Experience interface instead
 */
export interface ExperienceQualities {
  embodied: string | false;
  focus: string | false;
  mood: string | false;
  purpose: string | false;
  space: string | false;
  time: string | false;
  presence: string | false;
}

/**
 * A experiential moment - the eight qualities ARE the experience
 * All qualities are required strings, no nested objects
 * 
 * The paradigm shift: Instead of describing an experience,
 * the qualities themselves constitute the complete experience
 */
export interface Experience {
  /** System-generated unique identifier (exp_xxxxx) */
  id: string;
  /** ISO timestamp when captured */
  created: string;
  /** Emoji - visual/emotional anchor */
  anchor: string;
  
  // The eight qualities that ARE the experience
  /** Body-mind unity in this moment */
  embodied: string;
  /** Attention's direction and quality */
  focus: string;
  /** Emotional atmosphere */
  mood: string;
  /** Direction or drift */
  purpose: string;
  /** Where I am */
  space: string;
  /** Temporal orientation */
  time: string;
  /** Social field */
  presence: string;
  
  /** REQUIRED: Array, must include AI identity (Claude, GPT-4, etc.) */
  who: string[];
  /** Optional: Direct quotes from humans when available */
  citation?: string;
}

/** 
 * A experienceed experiential moment 
 * @deprecated Use Experience interface instead - kept for migration
 */
export interface Source {
  /** Unique identifier for this source */
  id: string;
  /** The experienceed source (text, audio transcript, etc.) */
  source: string;
  /** Single emoji that serves as a visual/memory anchor for this experience */
  emoji: string;
  /** When the experience was experienceed (auto-generated) */
  created: string;

  // Context fields
  /** Who experienced this (single person or array for shared experiences) */
  who?: string | string[];

  // Analysis fields
  /** Experience analysis results (prominent qualities as array) */
  experience?: string[];
  /** Complete switchboard of experiential qualities */
  experienceQualities?: ExperienceQualities;

  // Pattern realization fields
  /** Array of experience IDs that this experience reflects on/connects to */
  reflects?: string[];
}

/**
 * Embedding record for semantic search
 */
export interface EmbeddingRecord {
  /** Source ID this embedding belongs to */
  sourceId: string;
  /** Vector embedding for semantic search */
  vector: number[];
  /** When the embedding was generated */
  generated: string;
}

// ============================================================================
// STORAGE TYPES
// ============================================================================

/** Storage data structure */
export interface StorageData {
  sources: Source[];
  embeddings?: EmbeddingRecord[];
}

/** Valid record types in the storage system */
export type RecordType = 'source';

/** Base interface for all storage records */
export interface BaseRecord {
  type: RecordType;
  id: string;
}

/** Storage record for experiential sources */
export interface SourceRecord extends Source {
  // Note: type field removed from data model but kept in interface for compatibility
  type?: 'source';
}

/** Union type of all possible storage records */
export type StorageRecord = SourceRecord;

// ============================================================================
// ZOD SCHEMAS FOR INTERNAL DATA MODELS
// ============================================================================

/** Helper function for emoji validation */
const validateEmoji = (val: string) => {
  // Comprehensive emoji validation for composite emojis
  if (!val || val.length === 0) return false;

  // Use Intl.Segmenter if available (modern browsers/Node.js)
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
    const segments = Array.from(segmenter.segment(val));

    // Must be exactly one grapheme cluster (visual character)
    if (segments.length !== 1) return false;

    // Check if the single grapheme contains emoji characters
    const segment = segments[0].segment;
    return /\p{Emoji}/u.test(segment);
  }

  // Fallback for older environments - comprehensive emoji regex
  // This pattern matches:
  // - Basic emojis: \p{Emoji}
  // - Variation selectors: \uFE0F
  // - Zero-width joiners: \u200D
  // - Skin tone modifiers: \p{Emoji_Modifier}
  // - Regional indicators: \p{Regional_Indicator}
  const comprehensiveEmojiRegex =
    /^(?:\p{Emoji}(?:\p{Emoji_Modifier}|\uFE0F|\u200D(?:\p{Emoji}(?:\p{Emoji_Modifier}|\uFE0F)?))*)+$/u;

  // Additional check: ensure it's not multiple separate emojis
  // Split by common emoji boundaries (space, etc) and check we only have one "unit"
  const trimmed = val.trim();
  if (trimmed !== val) return false; // No leading/trailing whitespace
  if (/\s/.test(val)) return false; // No internal whitespace

  return comprehensiveEmojiRegex.test(val);
};

/** Known AI identities that must be included in who array */
export const AI_IDENTITIES = ['Claude', 'GPT-4', 'GPT-3.5', 'Gemini', 'Assistant'] as const;
export type AIIdentity = (typeof AI_IDENTITIES)[number];

/** Check if who array includes at least one AI identity */
const validateWhoArray = (who: string[]) => {
  // Check if any element in who array is an AI identity
  return who.some(w => AI_IDENTITIES.includes(w as AIIdentity));
};

/** Zod schema for Experience - the new flat structure */
export const ExperienceSchema = z.object({
  id: z.string()
    .min(1)
    .regex(/^exp_/, 'ID must start with exp_ prefix')
    .describe('System-generated unique identifier'),
  created: z.string()
    .refine((val) => !isNaN(Date.parse(val)), 'Must be valid ISO timestamp')
    .describe('ISO timestamp when captured'),
  anchor: z.string()
    .refine(validateEmoji, {
      message: 'Must be a single emoji (including compound emojis with modifiers, skin tones, and sequences)',
    })
    .describe('Emoji - visual/emotional anchor'),
  
  // The eight qualities that ARE the experience
  embodied: z.string().min(1).describe('Body-mind unity in this moment'),
  focus: z.string().min(1).describe("Attention's direction and quality"),
  mood: z.string().min(1).describe('Emotional atmosphere'),
  purpose: z.string().min(1).describe('Direction or drift'),
  space: z.string().min(1).describe('Where I am'),
  time: z.string().min(1).describe('Temporal orientation'),
  presence: z.string().min(1).describe('Social field'),
  
  who: z.array(z.string())
    .min(1, 'Who array cannot be empty')
    .refine(validateWhoArray, {
      message: 'Who array must include at least one AI identity (Claude, GPT-4, etc.)'
    })
    .describe('REQUIRED: Array, must include AI identity'),
  citation: z.string()
    .optional()
    .describe('Optional: Direct quotes from humans when available'),
});

/** Zod schema for Source - deprecated but kept for migration */
export const SourceSchema = z.object({
  id: z.string().min(1).describe('Unique identifier for this source'),
  source: z.string().min(1).describe('The experienceed source (text, audio transcript, etc.)'),
  emoji: z
    .string()
    .refine(validateEmoji, {
      message:
        'Must be a single emoji (including compound emojis with modifiers, skin tones, and sequences)',
    })
    .describe('Visual/memory anchor for this experience'),
  created: z.string().describe('When the experience was experienceed (auto-generated)'),
  who: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .describe('Who experienced this'),
  // experience array field removed - use experienceQualities only
  reflects: z
    .array(z.string())
    .optional()
    .describe('Array of experience IDs that this experience reflects on/connects to'),
});

/** Zod schema for StorageData */
export const StorageDataSchema = z.object({
  sources: z.array(SourceSchema).describe('Array of experienceed experiential sources'),
  embeddings: z
    .array(
      z.object({
        sourceId: z.string().describe('Source ID this embedding belongs to'),
        vector: z.array(z.number()).describe('Vector embedding for semantic search'),
        generated: z.string().describe('When the embedding was generated'),
      })
    )
    .optional()
    .describe('Array of embedding records'),
});

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates if a value is a valid quality type
 */
export function isValidQualityType(value: string): boolean {
  // Accept base quality types or dot notation variants
  const baseQuality = value.split('.')[0];
  return QUALITY_TYPES.includes(baseQuality as QualityType);
}

// Perspective and processing validation functions removed for streamlining

/**
 * Type guard to check if an object is a valid Experience
 */
export function isValidExperience(experience: unknown): experience is Experience {
  if (typeof experience !== 'object' || experience === null) return false;

  const exp = experience as Record<string, unknown>;

  return (
    typeof exp.id === 'string' &&
    exp.id.startsWith('exp_') &&
    typeof exp.created === 'string' &&
    !isNaN(Date.parse(exp.created)) &&
    typeof exp.anchor === 'string' &&
    validateEmoji(exp.anchor) &&
    typeof exp.embodied === 'string' &&
    exp.embodied.length > 0 &&
    typeof exp.focus === 'string' &&
    exp.focus.length > 0 &&
    typeof exp.mood === 'string' &&
    exp.mood.length > 0 &&
    typeof exp.purpose === 'string' &&
    exp.purpose.length > 0 &&
    typeof exp.space === 'string' &&
    exp.space.length > 0 &&
    typeof exp.time === 'string' &&
    exp.time.length > 0 &&
    typeof exp.presence === 'string' &&
    exp.presence.length > 0 &&
    Array.isArray(exp.who) &&
    exp.who.length > 0 &&
    exp.who.every((w: unknown) => typeof w === 'string') &&
    validateWhoArray(exp.who as string[]) &&
    (exp.citation === undefined || typeof exp.citation === 'string')
  );
}

/**
 * Type guard to check if an object is a valid Source
 * @deprecated Use isValidExperience instead
 */
export function isValidSource(source: unknown): source is Source {
  if (typeof source !== 'object' || source === null) return false;

  const src = source as Record<string, unknown>;

  return (
    typeof src.id === 'string' &&
    src.id.length > 0 &&
    typeof src.source === 'string' &&
    src.source.length > 0 &&
    typeof src.emoji === 'string' &&
    src.emoji.match(/^\p{Emoji}$/u) !== null &&
    typeof src.created === 'string' &&
    (src.experienceQualities === undefined ||
      (typeof src.experienceQualities === 'object' && src.experienceQualities !== null)) &&
    (src.reflects === undefined ||
      (Array.isArray(src.reflects) &&
        src.reflects.every((item: unknown) => typeof item === 'string')))
  );
}

/**
 * Validates an experience object using Zod schema
 */
export function validateExperience(experience: unknown): Experience {
  return ExperienceSchema.parse(experience);
}

/**
 * Validates a source object using Zod schema
 * @deprecated Use validateExperience instead
 */
export function validateSource(source: unknown): Source {
  return SourceSchema.parse(source);
}

/**
 * Validates storage data using Zod schema
 */
export function validateStorageData(data: unknown): StorageData {
  return StorageDataSchema.parse(data);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// generatePerspective function removed for streamlining

/**
 * Converts old experience array format to new qualities switchboard
 * @param experience - Array of quality strings
 * @returns Complete qualities switchboard
 */
export function experienceArrayToQualities(experience?: string[]): ExperienceQualities {
  // Initialize all qualities as false
  const qualities: ExperienceQualities = {
    embodied: false,
    focus: false,
    mood: false,
    purpose: false,
    space: false,
    time: false,
    presence: false,
  };

  if (!experience) return qualities;

  // Parse each quality string
  for (const tag of experience) {
    const [quality, subtype] = tag.split('.');
    if (quality in qualities) {
      // Set to subtype if provided, otherwise true
      const key = quality as keyof ExperienceQualities;
      if (subtype) {
        // We need to assign the subtype string
        (qualities as unknown as Record<string, string>)[key] = subtype;
      } else {
        // No subtype, so it's true
        (qualities as unknown as Record<string, boolean>)[key] = true;
      }
    }
  }

  return qualities;
}

/**
 * Converts new qualities switchboard to old experience array format
 * @param qualities - Complete qualities switchboard
 * @returns Array of quality strings
 */
// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Generates a unique experience ID with exp_ prefix
 */
export function generateExperienceId(): string {
  // Use nanoid-like approach with timestamp + random suffix
  const timestamp = Date.now().toString(36);
  const randomSuffix = Math.random().toString(36).substring(2, 7);
  return `exp_${timestamp}${randomSuffix}`;
}

/**
 * Creates a new Experience with all required fields
 * Note: This is primarily for testing - in production, experiences 
 * should be created with all qualities explicitly provided
 */
export function createExperience(
  qualities: {
    embodied: string;
    focus: string;
    mood: string;
    purpose: string;
    space: string;
    time: string;
    presence: string;
  },
  who: string[],
  anchor: string,
  citation?: string,
  id?: string
): Experience {
  // Validate that who array includes AI identity
  if (!validateWhoArray(who)) {
    throw new Error('Who array must include at least one AI identity (Claude, GPT-4, etc.)');
  }

  return {
    id: id || generateExperienceId(),
    created: new Date().toISOString(),
    anchor,
    ...qualities,
    who,
    ...(citation && { citation })
  };
}

/**
 * Creates a new Source with default values
 * @deprecated Use createExperience instead
 */
export function createSource(source: string, emoji: string, id?: string): Source {
  return {
    id: id || `src_${Date.now()}`,
    source,
    emoji,
    created: new Date().toISOString(),
    who: DEFAULTS.EXPERIENCER,
  };
}

/**
 * Creates a new SourceRecord with default values
 * @deprecated Use createExperience instead
 */
export function createSourceRecord(source: string, emoji: string, id?: string): SourceRecord {
  return {
    ...createSource(source, emoji, id),
  };
}
