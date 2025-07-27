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

/** A experienceed experiential moment */
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

  // Self-containment field
  /** Optional background context to make this experience self-contained and comprehensible */
  context?: string;
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

/** Zod schema for Source */
export const SourceSchema = z.object({
  id: z.string().min(1).describe('Unique identifier for this source'),
  source: z.string().min(1).describe('The experienceed source (text, audio transcript, etc.)'),
  emoji: z
    .string()
    .refine(
      (val) => {
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
      },
      {
        message:
          'Must be a single emoji (including compound emojis with modifiers, skin tones, and sequences)',
      }
    )
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
  context: z
    .string()
    .optional()
    .describe(
      'Optional background context to make this experience self-contained and comprehensible'
    ),
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
 * Type guard to check if an object is a valid Source
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
        src.reflects.every((item: unknown) => typeof item === 'string'))) &&
    (src.context === undefined || typeof src.context === 'string')
  );
}

/**
 * Validates a source object using Zod schema
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
 * Creates a new Source with default values
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
 */
export function createSourceRecord(source: string, emoji: string, id?: string): SourceRecord {
  return {
    ...createSource(source, emoji, id),
  };
}
