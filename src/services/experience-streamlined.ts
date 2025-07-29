/**
 * Streamlined Experience service for Bridge.
 * Handles the new flat Experience structure where qualities ARE the experience.
 */

import { z } from 'zod';
import { saveSource, saveEmbedding } from '../core/storage.js';
import type { Experience, EmbeddingRecord } from '../core/types.js';
import { generateExperienceId, AI_IDENTITIES } from '../core/types.js';
import { embeddingService } from './embeddings.js';

// ============================================================================
// SCHEMA & TYPES
// ============================================================================

// Helper for emoji validation
const validateEmoji = (val: string) => {
  if (!val || val.length === 0) return false;

  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
    const segments = Array.from(segmenter.segment(val));
    if (segments.length !== 1) return false;
    const segment = segments[0].segment;
    return /\p{Emoji}/u.test(segment);
  }

  const comprehensiveEmojiRegex =
    /^(?:\p{Emoji}(?:\p{Emoji_Modifier}|\uFE0F|\u200D(?:\p{Emoji}(?:\p{Emoji_Modifier}|\uFE0F)?))*)+$/u;

  const trimmed = val.trim();
  if (trimmed !== val) return false;
  if (/\s/.test(val)) return false;

  return comprehensiveEmojiRegex.test(val);
};

/**
 * Zod schema for validating experience input - NEW FLAT STRUCTURE.
 */
export const experienceSchema = z.object({
  // The eight qualities that ARE the experience
  embodied: z.string().min(1),
  focus: z.string().min(1),
  mood: z.string().min(1),
  purpose: z.string().min(1),
  space: z.string().min(1),
  time: z.string().min(1),
  presence: z.string().min(1),
  
  anchor: z.string().refine(validateEmoji, {
    message: 'Must be a single emoji',
  }),
  
  who: z
    .array(z.string())
    .min(1, 'Who array cannot be empty')
    .refine((who) => who.some(w => AI_IDENTITIES.includes(w as any)), {
      message: 'Who array must include at least one AI identity (Claude, GPT-4, etc.)'
    }),
    
  citation: z.string().optional(),
});

/**
 * Input type for capturing experiential data - NEW FLAT STRUCTURE.
 */
export type ExperienceInput = z.infer<typeof experienceSchema>;

/**
 * Result of an experience capture operation.
 */
export interface ExperienceResult {
  experience: Experience;
  embedding?: boolean; // Whether embedding was generated
}

// ============================================================================
// EXPERIENCE SERVICE
// ============================================================================

/**
 * Service for capturing and storing experiences.
 */
export class ExperienceService {
  /**
   * Captures a new experience, validates input, generates embeddings, and stores it.
   * @param input - Experience input data
   * @returns Experience result
   * @throws Error if validation fails
   */
  async captureExperience(input: ExperienceInput): Promise<ExperienceResult> {
    // Validate input
    const validatedInput = experienceSchema.parse(input);

    // Generate unique ID with exp_ prefix
    const id = generateExperienceId();

    // Auto-generate created timestamp
    const created = new Date().toISOString();

    // Create experience record
    const experience: Experience = {
      id,
      created,
      ...validatedInput,
    };

    // Save the experience record
    // Note: During migration, we'll need to adapt this to work with existing storage
    await this.saveExperience(experience);

    // Generate and save embedding
    let embeddingGenerated = false;
    try {
      await embeddingService.initialize();

      // Create unified embedding text - all qualities concatenated
      const embeddingText = [
        experience.embodied,
        experience.focus,
        experience.mood,
        experience.purpose,
        experience.space,
        experience.time,
        experience.presence,
        experience.citation || ''
      ].filter(Boolean).join(' ');

      const embedding = await embeddingService.generateEmbedding(embeddingText);

      // Save embedding to storage
      const embeddingRecord: EmbeddingRecord = {
        sourceId: experience.id,
        vector: embedding,
        generated: new Date().toISOString(),
      };

      await saveEmbedding(embeddingRecord);
      embeddingGenerated = true;
    } catch (error) {
      // Don't fail experience capture if embedding generation fails
      // Just continue without embedding
    }

    return { 
      experience,
      embedding: embeddingGenerated
    };
  }

  /**
   * Saves an experience to storage.
   * During migration, this will adapt to existing storage format.
   * @param experience - Experience to save
   */
  private async saveExperience(experience: Experience): Promise<void> {
    // During migration, we need to save as Source format for backward compatibility
    // This will be updated once storage is migrated
    const sourceFormat = {
      id: experience.id,
      source: experience.citation || 'Experience captured', // Temporary mapping
      emoji: experience.anchor,
      created: experience.created,
      who: experience.who,
      experienceQualities: {
        embodied: experience.embodied,
        focus: experience.focus,
        mood: experience.mood,
        purpose: experience.purpose,
        space: experience.space,
        time: experience.time,
        presence: experience.presence,
      }
    };
    
    await saveSource(sourceFormat);
  }

  /**
   * Builds searchable text from an experience.
   * Used for both search and recall features.
   * @param experience - Experience to convert to searchable text
   * @returns Concatenated searchable text
   */
  buildSearchableText(experience: Experience): string {
    return [
      experience.embodied,
      experience.focus,
      experience.mood,
      experience.purpose,
      experience.space,
      experience.time,
      experience.presence,
      experience.citation || ''
    ].filter(Boolean).join(' ');
  }
}

// Export singleton instance
export const experienceService = new ExperienceService();