import { z } from 'zod';
import { getSource, saveSource, deleteSource } from '../core/storage.js';
import type { SourceRecord, ProcessingLevel, QualityVector } from '../core/types.js';
import { validateFlexibleDate } from '../utils/validation.js';
import { embeddingService } from './embeddings.js';
import { vectorStore } from './vector-store.js';

// Enrich input schema - allows partial updates to existing captures
export const enrichSchema = z.object({
  id: z.string().describe('The ID of the source to enrich'),
  content: z.string().optional().describe('Updated content text'),
  contentType: z.string().optional().describe('Updated content type'),
  perspective: z.enum(['I', 'we', 'you', 'they']).optional().describe('Updated perspective'),
  processing: z.enum(['during', 'right-after', 'long-after', 'crafted']).optional().describe('Updated processing level'),
  event_time: z.string().optional().describe('Updated event time'),
  capture_time: z.string().optional().describe('Updated capture time'),
  experiencer: z.string().optional().describe('Updated experiencer'),
  crafted: z.boolean().optional().describe('Updated crafted flag'),
  experiential_qualities: z.object({
    qualities: z.array(z.object({
      type: z.enum(['embodied', 'attentional', 'affective', 'purposive', 'spatial', 'temporal', 'intersubjective']),
    
      prominence: z.number().min(0).max(1),
      manifestation: z.string()
    })),
    vector: z.object({
      embodied: z.number().min(0).max(1),
      attentional: z.number().min(0).max(1),
      affective: z.number().min(0).max(1),
      purposive: z.number().min(0).max(1),
      spatial: z.number().min(0).max(1),
      temporal: z.number().min(0).max(1),
      intersubjective: z.number().min(0).max(1)
    }).optional()
  }).optional().describe('Updated experiential qualities'),
  regenerate_embeddings: z.boolean().optional().default(false).describe('Whether to regenerate content embeddings')
});

export interface EnrichInput {
  id: string;
  content?: string;
  contentType?: string;
  perspective?: 'I' | 'we' | 'you' | 'they';
  processing?: 'during' | 'right-after' | 'long-after' | 'crafted';
  event_time?: string;
  capture_time?: string;
  experiencer?: string;
  crafted?: boolean;
  experiential_qualities?: {
    qualities: Array<{
      type: 'embodied' | 'attentional' | 'affective' | 'purposive' | 'spatial' | 'temporal' | 'intersubjective';
    
      prominence: number;
      manifestation: string;
    }>;
    vector?: {
      embodied: number;
      attentional: number;
      affective: number;
      purposive: number;
      spatial: number;
      temporal: number;
      intersubjective: number;
    };
  };
  regenerate_embeddings?: boolean;
}

export interface EnrichResult {
  source: SourceRecord;
  updatedFields: string[];
  embeddingsRegenerated: boolean;
}

// Generate experiential quality vector from qualities array
function generateQualityVector(qualities: Array<{
  type: 'embodied' | 'attentional' | 'affective' | 'purposive' | 'spatial' | 'temporal' | 'intersubjective';
  prominence: number;
}>): QualityVector {
  const vector: QualityVector = {
    embodied: 0,
    attentional: 0,
    affective: 0,
    purposive: 0,
    spatial: 0,
    temporal: 0,
    intersubjective: 0
  };

  // Set values based on provided qualities
  for (const quality of qualities) {
    vector[quality.type] = quality.prominence;
  }

  return vector;
}

export class EnrichService {
  async enrichSource(input: EnrichInput): Promise<EnrichResult> {
    // Get the existing source
    const existingSource = await getSource(input.id);
    if (!existingSource) {
      throw new Error(`Source with ID '${input.id}' not found`);
    }

    // Validate date fields if provided
    if (input.event_time && !(await validateFlexibleDate(input.event_time))) {
      throw new Error(`Invalid date format for 'event_time': ${input.event_time}. Use natural language like 'yesterday', 'last week', '2024-01-15', or ISO 8601 format.`);
    }

    // Process experiential qualities - generate vector if not provided
    let processedExperientialQualities: import('../core/types.js').ExperientialQualities | undefined = undefined;
    if (input.experiential_qualities?.qualities) {
      if (!input.experiential_qualities.vector) {
        // Generate vector from qualities
        const generatedVector = generateQualityVector(input.experiential_qualities.qualities);
        processedExperientialQualities = {
          qualities: input.experiential_qualities.qualities,
          vector: generatedVector
        };
      } else {
        // Vector is provided, use as-is but ensure proper typing
        processedExperientialQualities = {
          qualities: input.experiential_qualities.qualities,
          vector: input.experiential_qualities.vector
        } as import('../core/types.js').ExperientialQualities;
      }
    }

    // Determine if we need to regenerate embeddings
    const shouldRegenerateEmbeddings = input.regenerate_embeddings || 
      (input.content && input.content !== existingSource.content);

    // Generate new embedding if needed
    let contentEmbedding: number[] | undefined = existingSource.content_embedding;
    if (shouldRegenerateEmbeddings && input.content) {
      try {
        contentEmbedding = await embeddingService.generateEmbedding(input.content);
      } catch (error) {
        console.warn('Failed to generate embedding for updated content:', error);
        // Keep existing embedding if generation fails
      }
    }

    // Create updated source record
    const updatedSource: Omit<SourceRecord, 'type'> = {
      ...existingSource,
      content: input.content ?? existingSource.content,
      contentType: input.contentType ?? existingSource.contentType,
      perspective: input.perspective ?? existingSource.perspective,
      experiencer: input.experiencer ?? existingSource.experiencer,
      processing: (input.processing ?? existingSource.processing) as ProcessingLevel,
      event_time: input.event_time ?? existingSource.event_time,
      capture_time: input.capture_time ?? existingSource.capture_time,
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
        // Remove old vector
        await vectorStore.removeVector(input.id);
        // Add new vector
        await vectorStore.addVector(source.id, contentEmbedding, {
          content: input.content?.substring(0, 100) ?? existingSource.content.substring(0, 100),
          contentType: input.contentType ?? existingSource.contentType,
          experiencer: input.experiencer ?? existingSource.experiencer,
          perspective: input.perspective ?? existingSource.perspective,
        });
      } catch (error) {
        console.warn('Failed to update vector store:', error);
        // Continue without vector storage update - it's optional
      }
    }

    // Track what was updated
    const updatedFields = this.getUpdatedFields(existingSource, updatedSource);
    
    return { 
      source, 
      updatedFields,
      embeddingsRegenerated: shouldRegenerateEmbeddings || false
    };
  }

  private getUpdatedFields(original: SourceRecord, updated: Omit<SourceRecord, 'type'>): string[] {
    const fields: string[] = [];
    
    if (original.content !== updated.content) fields.push('content');
    if (original.contentType !== updated.contentType) fields.push('contentType');
    if (original.perspective !== updated.perspective) fields.push('perspective');
    if (original.experiencer !== updated.experiencer) fields.push('experiencer');
    if (original.processing !== updated.processing) fields.push('processing');
    if (original.event_time !== updated.event_time) fields.push('event_time');
    if (original.capture_time !== updated.capture_time) fields.push('capture_time');
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