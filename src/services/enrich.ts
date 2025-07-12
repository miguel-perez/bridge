/**
 * Enrich service for Bridge experiential data.
 * Handles partial updates, narrative updates, and embedding regeneration for experiential sources.
 */

import { z } from 'zod';
import { getSource, saveSource, deleteSource } from '../core/storage.js';
import type { SourceRecord, ProcessingLevel } from '../core/types.js';
import { parseOccurredDate } from '../utils/validation.js';
import { embeddingService } from './embeddings.js';
import { getVectorStore } from './vector-store.js';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default values for enrichment fields */
export const ENRICH_DEFAULTS = {
  CONTENT_TYPE: 'text',
  PERSPECTIVE: 'I',
  PROCESSING: 'during',
  EXPERIENCER: 'self',
};

/** Valid quality types */
export const QUALITY_TYPES = [
  'embodied', 'attentional', 'affective', 'purposive',
  'spatial', 'temporal', 'intersubjective',
] as const;

// ============================================================================
// SCHEMA & TYPES
// ============================================================================

/**
 * Zod schema for validating enrich input.
 * Allows partial updates to existing captures.
 */
export const enrichSchema = z.object({
  id: z.string().describe('The ID of the source to enrich'),
  content: z.string().optional().describe('Updated content text'),
  narrative: z.string().optional().describe('Updated narrative text'),
  contentType: z.string().optional().describe('Updated content type'),
  perspective: z.enum(['I', 'we', 'you', 'they']).optional().describe('Updated perspective'),
  processing: z.enum(['during', 'right-after', 'long-after', 'crafted']).optional().describe('Updated processing level'),
  occurred: z.string().optional().describe('Updated occurred time (chrono-node compatible)'),
  experiencer: z.string().optional().describe('Updated experiencer'),
  crafted: z.boolean().optional().describe('Updated crafted flag'),
  experiential_qualities: z.object({
    qualities: z.array(z.object({
      type: z.enum(QUALITY_TYPES),
      prominence: z.number().min(0).max(1),
      manifestation: z.string(),
    })),
  }).optional().describe('Updated experiential qualities'),
  regenerate_embeddings: z.boolean().optional().default(false).describe('Whether to regenerate content embeddings'),
});

/**
 * Input type for enriching experiential data.
 */
export interface EnrichInput {
  id: string;
  content?: string;
  narrative?: string;
  contentType?: string;
  perspective?: 'I' | 'we' | 'you' | 'they';
  processing?: 'during' | 'right-after' | 'long-after' | 'crafted';
  occurred?: string;
  experiencer?: string;
  crafted?: boolean;
  experiential_qualities?: {
    qualities: Array<{
      type: typeof QUALITY_TYPES[number];
      prominence: number;
      manifestation: string;
    }>;
  };
  regenerate_embeddings?: boolean;
}

/**
 * Result of an enrich operation.
 */
export interface EnrichResult {
  source: SourceRecord;
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

    // Validate and parse occurred field with chrono-node
    let occurredDate: string | undefined;
    if (input.occurred) {
      try {
        occurredDate = await parseOccurredDate(input.occurred);
      } catch {
        throw new Error('Invalid occurred date format. Example valid formats: "2024-01-15", "yesterday", "last week", "2024-01-01T10:00:00Z".');
      }
    }

    // Process experiential qualities - no vector generation needed
    let processedExperientialQualities: import('../core/types.js').ExperientialQualities | undefined = undefined;
    if (input.experiential_qualities?.qualities) {
      processedExperientialQualities = {
        qualities: input.experiential_qualities.qualities,
      };
    }

    // Determine if we need to regenerate embeddings
    const shouldRegenerateEmbeddings = input.regenerate_embeddings || 
      (input.content && input.content !== existingSource.content) ||
      (input.narrative && input.narrative !== existingSource.narrative);

    // Generate new embedding if needed
    let contentEmbedding: number[] | undefined = existingSource.content_embedding;
    if (shouldRegenerateEmbeddings) {
      const textToEmbed = input.narrative || existingSource.narrative || 
                         input.content || existingSource.content;
      try {
        contentEmbedding = await embeddingService.generateEmbedding(textToEmbed);
      } catch (error) {
        // Silently handle embedding generation errors in MCP context
      }
    }

    // Create updated source record
    const updatedSource: Omit<SourceRecord, 'type'> = {
      ...existingSource,
      content: input.content ?? existingSource.content,
      narrative: input.narrative ?? existingSource.narrative,
      contentType: input.contentType ?? existingSource.contentType,
      perspective: input.perspective ?? existingSource.perspective,
      experiencer: input.experiencer ?? existingSource.experiencer,
      processing: (input.processing ?? existingSource.processing) as ProcessingLevel,
      occurred: occurredDate ?? existingSource.occurred,
      crafted: input.crafted ?? existingSource.crafted,
      experiential_qualities: processedExperientialQualities ?? existingSource.experiential_qualities,
      content_embedding: contentEmbedding,
    };

    // Delete the old record and save the new one
    await deleteSource(input.id);
    const source = await saveSource(updatedSource);

    // Update vector store if embeddings were regenerated
    if (shouldRegenerateEmbeddings && contentEmbedding) {
      try {
        await getVectorStore().removeVector(input.id);
        await getVectorStore().addVector(source.id, contentEmbedding);
      } catch (error) {
        // Silently handle vector store update errors in MCP context
      }
    }

    // Track what was updated
    const updatedFields = this.getUpdatedFields(existingSource, updatedSource);
    
    return { 
      source, 
      updatedFields,
      embeddingsRegenerated: shouldRegenerateEmbeddings || false,
    };
  }

  /**
   * Returns a list of which fields were updated in the enrichment.
   * @param original - Original source record
   * @param updated - Updated source record (without type field)
   * @returns Array of updated field names
   */
  private getUpdatedFields(original: SourceRecord, updated: Omit<SourceRecord, 'type'>): string[] {
    const fields: string[] = [];
    if (original.content !== updated.content) fields.push('content');
    if (original.narrative !== updated.narrative) fields.push('narrative');
    if (original.contentType !== updated.contentType) fields.push('contentType');
    if (original.perspective !== updated.perspective) fields.push('perspective');
    if (original.experiencer !== updated.experiencer) fields.push('experiencer');
    if (original.processing !== updated.processing) fields.push('processing');
    if (original.occurred !== updated.occurred) fields.push('occurred');
    if (original.crafted !== updated.crafted) fields.push('crafted');
    if (JSON.stringify(original.experiential_qualities) !== JSON.stringify(updated.experiential_qualities)) {
      fields.push('experiential_qualities');
    }
    if (JSON.stringify(original.content_embedding) !== JSON.stringify(updated.content_embedding)) {
      fields.push('content_embedding');
    }
    return fields;
  }
} 