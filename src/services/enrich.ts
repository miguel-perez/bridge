/**
 * Enrich service for Bridge experiential data.
 * Handles partial updates and embedding regeneration for experiential sources.
 */

import { z } from 'zod';
import {
  getSource,
  saveSource,
  deleteSource,
  saveEmbedding,
  deleteEmbedding,
} from '../core/storage.js';
import { Source, EmbeddingRecord, ExperienceQualities } from '../core/types.js';
import { embeddingService } from './embeddings.js';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default values for enrichment fields */
export const ENRICH_DEFAULTS = {
  WHO: 'Human',
};

// ============================================================================
// SCHEMA & TYPES
// ============================================================================

/**
 * Zod schema for validating enrich input.
 * Allows partial updates to existing experiences.
 */
export const enrichSchema = z.object({
  id: z.string().describe('ID of the source to enrich'),
  source: z.string().optional().describe('Updated source text'),
  who: z
    .union([
      z.string().describe('Single person who experienced this'),
      z.array(z.string()).describe('Multiple people who shared this experience'),
    ])
    .optional()
    .describe('Updated who experienced this'),
  experience: z.object({
    embodied: z.union([z.literal(false), z.literal(true), z.literal('thinking'), z.literal('sensing')]),
    focus: z.union([z.literal(false), z.literal(true), z.literal('narrow'), z.literal('broad')]),
    mood: z.union([z.literal(false), z.literal(true), z.literal('open'), z.literal('closed')]),
    purpose: z.union([z.literal(false), z.literal(true), z.literal('goal'), z.literal('wander')]),
    space: z.union([z.literal(false), z.literal(true), z.literal('here'), z.literal('there')]),
    time: z.union([z.literal(false), z.literal(true), z.literal('past'), z.literal('future')]),
    presence: z.union([z.literal(false), z.literal(true), z.literal('individual'), z.literal('collective')])
  }).optional().describe('Updated experience analysis'),
  reflects: z
    .array(z.string())
    .optional()
    .describe('Array of experience IDs that this experience reflects on'),
  context: z.string().optional().describe('Updated context for self-containment'),
});

/**
 * Input type for enriching experiential data.
 */
export interface EnrichInput {
  id: string;
  source?: string;
  who?: string | string[];
  experienceQualities?: ExperienceQualities;
  reflects?: string[];
  context?: string;
}

/**
 * Result of an enrich operation.
 */
export interface EnrichResult {
  source: Source;
  updatedFields: string[];
  embeddingsRegenerated: boolean;
}

// ============================================================================
// ENRICH SERVICE
// ============================================================================

/**
 * Service for enriching and updating experiential sources.
 */
export class EnrichService {
  /**
   * Enriches an existing experiential source, validates input, updates embeddings, and stores it.
   * @param input - Enrich input data
   * @returns Enrich result with updated source record and fields
   * @throws Error if validation fails or source is not found
   */
  async enrichSource(input: EnrichInput): Promise<EnrichResult> {
    // Get the existing source
    const existingSource = await getSource(input.id);
    if (!existingSource) {
      throw new Error(`Source with ID '${input.id}' not found`);
    }

    // Process experience - use input or existing
    let processedQualities: ExperienceQualities | undefined = undefined;
    if (input.experienceQualities) {
      processedQualities = input.experienceQualities;
    } else if (existingSource.experienceQualities) {
      processedQualities = existingSource.experienceQualities;
    }

    // Determine if we need to regenerate embeddings
    const shouldRegenerateEmbeddings =
      (input.source && input.source !== existingSource.source) ||
      (input.experienceQualities &&
        JSON.stringify(input.experienceQualities) !== JSON.stringify(existingSource.experienceQualities)) ||
      (input.context !== undefined && input.context !== existingSource.context);

    // Generate new embedding if needed
    let embedding: number[] | undefined;
    if (shouldRegenerateEmbeddings) {
      // Create the new embedding text format: "[source]" [prominent_qualities]
      const experience = processedQualities || existingSource.experienceQualities;
      const source = input.source || existingSource.source;

      if (experience) {
        const qualitiesArray = Object.entries(experience)
          .filter(([_, v]) => v !== false)
          .map(([k, v]) => v === true ? k : `${k}.${v}`);
        const qualitiesText = qualitiesArray.length > 0 ? `[${qualitiesArray.join(', ')}]` : '[]';

        // Include context in embedding if present
        const context = input.context ?? existingSource.context;
        const contextPrefix = context ? `Context: ${context}. ` : '';
        const embeddingText = `${contextPrefix}"${source}" ${qualitiesText}`;

        try {
          embedding = await embeddingService.generateEmbedding(embeddingText);
        } catch (error) {
          // Silently handle embedding generation errors in MCP context
        }
      }
    }

    // Create updated source
    const updatedSource = {
      ...existingSource,
      source: input.source ?? existingSource.source,
      who: input.who ?? existingSource.who,
      experienceQualities: input.experienceQualities ?? existingSource.experienceQualities,
      reflects: input.reflects ?? existingSource.reflects,
      context: input.context ?? existingSource.context,
    };

    // Delete the old record and save the new one
    await deleteSource(input.id);
    const source = await saveSource(updatedSource);

    // Update embeddings if regenerated
    if (shouldRegenerateEmbeddings && embedding) {
      try {
        // Delete old embedding
        await deleteEmbedding(input.id);

        // Save new embedding
        const embeddingRecord: EmbeddingRecord = {
          sourceId: source.id,
          vector: embedding,
          generated: new Date().toISOString(),
        };
        await saveEmbedding(embeddingRecord);
      } catch (error) {
        // Silently handle embedding update errors in MCP context
      }
    }

    // Track what was updated
    const updatedFields = this.getUpdatedFields(existingSource, source);

    return {
      source,
      updatedFields,
      embeddingsRegenerated: shouldRegenerateEmbeddings || false,
    };
  }

  /**
   * Returns a list of which fields were updated in the enrichment.
   * @param original - Original source record
   * @param updated - Updated source
   * @returns Array of updated field names
   */
  private getUpdatedFields(original: Source, updated: Source): string[] {
    const fields: string[] = [];
    if (original.source !== updated.source) fields.push('source');
    if (JSON.stringify(original.who) !== JSON.stringify(updated.who)) fields.push('who');
    if (JSON.stringify(original.experienceQualities) !== JSON.stringify(updated.experienceQualities)) {
      fields.push('experience');
    }
    if (JSON.stringify(original.reflects) !== JSON.stringify(updated.reflects)) {
      fields.push('reflects');
    }
    return fields;
  }
}
