/**
 * Enrich service for Bridge experiential data.
 * Handles partial updates and embedding regeneration for experiential sources.
 */

import { z } from 'zod';
import { getSource, saveSource, deleteSource, saveEmbedding, deleteEmbedding } from '../core/storage.js';
import { Source, Experience, ProcessingLevel, EmbeddingRecord } from '../core/types.js';
import { embeddingService } from './embeddings.js';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default values for enrichment fields */
export const ENRICH_DEFAULTS = {
  PERSPECTIVE: 'I',
  PROCESSING: 'during',
  EXPERIENCER: 'self',
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
  content: z.string().optional().describe('Updated content'),
  perspective: z.string().optional().describe('Updated perspective'),
  experiencer: z.string().optional().describe('Updated experiencer'),
  processing: z.string().optional().describe('Updated processing level'),
  crafted: z.boolean().optional().describe('Updated crafted flag'),
  experience: z.array(z.string()).optional().describe('Updated experience analysis')
});

/**
 * Input type for enriching experiential data.
 */
export interface EnrichInput {
  id: string;
  content?: string;
  perspective?: string;
  experiencer?: string;
  processing?: ProcessingLevel;
  crafted?: boolean;
  experience?: string[];
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
    let processedExperience: Experience | undefined = undefined;
    if (input.experience) {
      processedExperience = input.experience;
    } else if (existingSource.experience) {
      processedExperience = existingSource.experience;
    }

    // Determine if we need to regenerate embeddings
    const shouldRegenerateEmbeddings = 
      (input.content && input.content !== existingSource.source) ||
      (input.experience && 
       JSON.stringify(input.experience) !== 
       JSON.stringify(existingSource.experience));

    // Generate new embedding if needed
    let embedding: number[] | undefined;
    if (shouldRegenerateEmbeddings) {
      // Create the new embedding text format: "[content]" [prominent_qualities]
      const experience = processedExperience || existingSource.experience;
      const content = input.content || existingSource.source;
      
      if (experience) {
        const qualitiesText = experience.length > 0 
          ? `[${experience.join(', ')}]`
          : '[]';
        
        const embeddingText = `"${content}" ${qualitiesText}`;
        
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
      source: input.content ?? existingSource.source,
      perspective: input.perspective ?? existingSource.perspective,
      experiencer: input.experiencer ?? existingSource.experiencer,
      processing: input.processing ?? existingSource.processing,
      crafted: input.crafted ?? existingSource.crafted,
      experience: input.experience ?? existingSource.experience
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
          generated: new Date().toISOString()
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
    if (original.source !== updated.source) fields.push('content');
    if (original.perspective !== updated.perspective) fields.push('perspective');
    if (original.experiencer !== updated.experiencer) fields.push('experiencer');
    if (original.processing !== updated.processing) fields.push('processing');
    if (original.crafted !== updated.crafted) fields.push('crafted');
    if (JSON.stringify(original.experience) !== 
        JSON.stringify(updated.experience)) {
      fields.push('experience');
    }
    return fields;
  }
} 