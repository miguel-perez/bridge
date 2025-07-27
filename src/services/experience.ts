/**
 * Experience service for Bridge experiential data.
 * Handles validation, narrative embedding, and storage of experiential sources.
 */

import { z } from 'zod';
import { saveSource, saveEmbedding } from '../core/storage.js';
import { generateId } from '../core/storage.js';
import type { Source, EmbeddingRecord, ExperienceQualities } from '../core/types.js';
import { embeddingService } from './embeddings.js';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default values for experience fields */
export const EXPERIENCE_DEFAULTS = {
  CONTENT_TYPE: 'text',
  EXPERIENCER: 'self',
};

// ============================================================================
// SCHEMA & TYPES
// ============================================================================

/**
 * Zod schema for validating experience input.
 * Source is optional - if not provided, a default will be used.
 */
export const experienceSchema = z.object({
  source: z.string().optional(),
  emoji: z.string().refine(
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
  ),
  who: z.union([z.string(), z.array(z.string())]).optional(),

  // Experience analysis - can be array or complete qualities object
  experience: z
    .union([
      z.array(z.string()),
      z.object({
        embodied: z.union([
          z.literal(false),
          z.string().min(1),
        ]),
        focus: z.union([
          z.literal(false),
          z.string().min(1),
        ]),
        mood: z.union([
          z.literal(false),
          z.string().min(1),
        ]),
        purpose: z.union([
          z.literal(false),
          z.string().min(1),
        ]),
        space: z.union([
          z.literal(false),
          z.string().min(1),
        ]),
        time: z.union([
          z.literal(false),
          z.string().min(1),
        ]),
        presence: z.union([
          z.literal(false),
          z.string().min(1),
        ]),
      }),
    ])
    .optional(),

  // Pattern realizations - experiences that reflect on other experiences
  reflects: z.array(z.string()).optional(),

  // Optional context for self-containment
  context: z.string().optional(),
});

/**
 * Input type for experienceing experiential data.
 */
export interface ExperienceInput {
  source?: string;
  emoji: string;
  who?: string | string[];
  experience?: ExperienceQualities;
  reflects?: string[];
  context?: string;
}

/**
 * Result of a experience operation.
 */
export interface ExperienceResult {
  source: Source;
  defaultsUsed: string[];
}

// ============================================================================
// EXPERIENCE SERVICE
// ============================================================================

/**
 * Service for experienceing and storing experiential sources.
 */
export class ExperienceService {
  // private enhancedEmbeddingService: EnhancedEmbeddingService;

  /**
   * Initializes the ExperienceService
   * @remarks
   * Sets up the service for experience capture and storage operations.
   */
  constructor() {
    // this.enhancedEmbeddingService = new EnhancedEmbeddingService();
  }

  /**
   * Experiences a new experiential source, validates input, generates embeddings, and stores it.
   * @param input - Experience input data
   * @returns Experience result with source record and defaults used
   * @throws Error if validation fails or required fields are missing
   */
  async rememberExperience(input: ExperienceInput): Promise<ExperienceResult> {
    // Validate input
    const validatedInput = experienceSchema.parse(input);

    // Generate unique ID
    const id = await generateId();

    // Auto-generate created timestamp
    const created = new Date().toISOString();

    // Use source or default
    const source = validatedInput.source || 'Experience experienced';

    // Handle who field
    const who = validatedInput.who || 'self';

    // Handle experience qualities - only accept switchboard format
    let experienceQualities: ExperienceQualities | undefined;

    if (validatedInput.experience) {
      if (Array.isArray(validatedInput.experience)) {
        // Array format is no longer supported
        throw new Error('Array format for experience is deprecated. Please use the switchboard format with all 7 qualities specified.');
      }
      
      // Switchboard format - the only accepted format
      experienceQualities = validatedInput.experience;
      
    }

    // Create source record with both old and new fields for migration period
    const sourceRecord: Source = {
      id,
      source,
      emoji: validatedInput.emoji,
      created,
      who,
      experienceQualities,
      reflects: validatedInput.reflects,
      context: validatedInput.context,
    };

    // Save the source record
    const savedSource = await saveSource(sourceRecord);

    // Generate and save embedding
    try {
      await embeddingService.initialize();

      // Create simple embedding text with prominent qualities and context
      const qualitiesArray = savedSource.experienceQualities 
        ? Object.entries(savedSource.experienceQualities)
            .filter(([_, v]) => v !== false)
            .map(([k, v]) => `${k}: "${v}"`)
        : [];
      const qualitiesText = qualitiesArray.length > 0
        ? `[${qualitiesArray.join(', ')}]`
        : '[]';

      // Include context in embedding if present
      const contextPrefix = savedSource.context ? `Context: ${savedSource.context}. ` : '';
      const embeddingText = `${contextPrefix}"${savedSource.source}" ${qualitiesText}`;
      const embedding = await embeddingService.generateEmbedding(embeddingText);

      // Save embedding to storage
      const embeddingRecord: EmbeddingRecord = {
        sourceId: savedSource.id,
        vector: embedding,
        generated: new Date().toISOString(),
      };

      await saveEmbedding(embeddingRecord);

      const defaultsUsed = this.getDefaultsUsed(input);
      return { source: savedSource, defaultsUsed };
    } catch (error) {
      // Don't fail experience if embedding generation fails
      // Embedding generation failed - continue without embedding
      const defaultsUsed = this.getDefaultsUsed(input);
      return { source: savedSource, defaultsUsed };
    }
  }

  /**
   * Returns a list of which defaults were used for the experience input.
   * @param originalInput - Original input data
   * @returns Array of default field descriptions
   */
  private getDefaultsUsed(originalInput: ExperienceInput): string[] {
    const defaultsUsed = [];
    if (!originalInput.who) defaultsUsed.push('who="self"');
    if (!originalInput.source) defaultsUsed.push('source="Experience experienced"');
    return defaultsUsed;
  }
}
