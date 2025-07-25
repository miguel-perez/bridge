/**
 * Experience service for Bridge experiential data.
 * Handles validation, narrative embedding, and storage of experiential sources.
 */

import { z } from 'zod';
import { bridgeLogger } from '../utils/bridge-logger.js';
import { saveSource, saveEmbedding } from '../core/storage.js';
import { generateId } from '../core/storage.js';
import type { Source, EmbeddingRecord, Experience } from '../core/types.js';

import { embeddingServiceV2 } from './embeddings-v2.js';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default values for experience fields */
export const EXPERIENCE_DEFAULTS = {
  CONTENT_TYPE: 'text',
  PERSPECTIVE: 'I',
  PROCESSING: 'during',
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
  emoji: z.string().regex(/^\p{Emoji}$/u, 'Must be a single emoji'),
  perspective: z.enum(['I', 'we', 'you', 'they']).optional(),
  experiencer: z.string().optional(),
  processing: z.enum(['during', 'right-after', 'long-after']).optional(),
  crafted: z.boolean().optional(),

  // Experience analysis - simplified to just prominent qualities array
  experience: z.array(z.string()).optional(),

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
  perspective?: string;
  experiencer?: string;
  processing?: string;
  crafted?: boolean;
  experience?: string[];
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
    const source = validatedInput.source || 'Experience experienceed';

    // Create experience with prominent qualities
    let experience: Experience | undefined;
    if (validatedInput.experience) {
      if (validatedInput.experience.length > 0) {
        experience = validatedInput.experience;
      }
    }

    // Create source record
    const sourceRecord: Source = {
      id,
      source,
      emoji: validatedInput.emoji,
      created,
      perspective: validatedInput.perspective || 'I',
      experiencer: validatedInput.experiencer || 'self',
      processing: validatedInput.processing || 'during',
      crafted: validatedInput.crafted || false,
      experience,
      reflects: validatedInput.reflects,
      context: validatedInput.context,
    };

    // Save the source record
    const savedSource = await saveSource(sourceRecord);

    // Generate and save embedding
    try {
      await embeddingServiceV2.initialize();

      // Create simple embedding text with prominent qualities and context
      const qualitiesText =
        savedSource.experience && savedSource.experience.length > 0
          ? `[${savedSource.experience.join(', ')}]`
          : '[]';

      // Include context in embedding if present
      const contextPrefix = savedSource.context ? `Context: ${savedSource.context}. ` : '';
      const embeddingText = `${contextPrefix}"${savedSource.source}" ${qualitiesText}`;
      const embedding = await embeddingServiceV2.generateEmbedding(embeddingText);

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
      bridgeLogger.warn('Embedding generation failed:', error);
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
    if (!originalInput.perspective) defaultsUsed.push('perspective="I"');
    if (!originalInput.experiencer) defaultsUsed.push('experiencer="self"');
    if (!originalInput.processing) defaultsUsed.push('processing="during"');
    if (!originalInput.source) defaultsUsed.push('source="Experience experienceed"');
    return defaultsUsed;
  }
}
