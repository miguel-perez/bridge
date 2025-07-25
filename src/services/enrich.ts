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
import { Source, ProcessingLevel, EmbeddingRecord } from '../core/types.js';
import { embeddingService } from './embeddings.js';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default values for enrichment fields */
export const ENRICH_DEFAULTS = {
  PERSPECTIVE: 'I',
  PROCESSING: 'during',
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
  perspective: z.string().optional().describe('Updated perspective'),
  who: z
    .union([
      z.string().describe('Single person who experienced this'),
      z.array(z.string()).describe('Multiple people who shared this experience'),
    ])
    .optional()
    .describe('Updated who experienced this'),
  processing: z.string().optional().describe('Updated processing level'),
  crafted: z.boolean().optional().describe('Updated crafted flag'),
  experience: z.array(z.string()).optional().describe('Updated experience analysis'),
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
  perspective?: string;
  who?: string | string[];
  processing?: ProcessingLevel;
  crafted?: boolean;
  experience?: string[];
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
    let processedExperience: string[] | undefined = undefined;
    if (input.experience) {
      processedExperience = input.experience;
    } else if (existingSource.experience) {
      processedExperience = existingSource.experience;
    }

    // Determine if we need to regenerate embeddings
    const shouldRegenerateEmbeddings =
      (input.source && input.source !== existingSource.source) ||
      (input.experience &&
        JSON.stringify(input.experience) !== JSON.stringify(existingSource.experience)) ||
      (input.context !== undefined && input.context !== existingSource.context);

    // Generate new embedding if needed
    let embedding: number[] | undefined;
    if (shouldRegenerateEmbeddings) {
      // Create the new embedding text format: "[source]" [prominent_qualities]
      const experience = processedExperience || existingSource.experience;
      const source = input.source || existingSource.source;

      if (experience) {
        const qualitiesText = experience.length > 0 ? `[${experience.join(', ')}]` : '[]';

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
      perspective: input.perspective ?? existingSource.perspective,
      who: input.who ?? existingSource.who,
      processing: input.processing ?? existingSource.processing,
      crafted: input.crafted ?? existingSource.crafted,
      experience: input.experience ?? existingSource.experience,
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
    if (original.perspective !== updated.perspective) fields.push('perspective');
    if (JSON.stringify(original.who) !== JSON.stringify(updated.who)) fields.push('who');
    if (original.processing !== updated.processing) fields.push('processing');
    if (original.crafted !== updated.crafted) fields.push('crafted');
    if (JSON.stringify(original.experience) !== JSON.stringify(updated.experience)) {
      fields.push('experience');
    }
    if (JSON.stringify(original.reflects) !== JSON.stringify(updated.reflects)) {
      fields.push('reflects');
    }
    return fields;
  }
}
