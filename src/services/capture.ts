import { z } from 'zod';
import { generateId, saveSource } from '../core/storage.js';
import type { SourceRecord, ProcessingLevel, QualityVector } from '../core/types.js';
import { parseOccurredDate } from '../utils/validation.js';
import { embeddingService } from './embeddings.js';
import { getVectorStore } from './vector-store.js';

// Capture input schema - make vector optional since we can generate it from qualities
export const captureSchema = z.object({
  content: z.string().optional(), // Make content optional to allow file auto-read
  contentType: z.string().optional().default('text'),
  perspective: z.enum(['I', 'we', 'you', 'they']),
  processing: z.enum(['during', 'right-after', 'long-after', 'crafted']),
  occurred: z.string().optional(), // When it happened (chrono-node compatible)
  experiencer: z.string(),
  crafted: z.boolean().optional(),
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
    }).optional(),
  }).optional(),
}).refine((data) => {
  // Ensure content is provided
  if (!data.content) {
    throw new Error('Content must be provided');
  }
  return true;
}, {
  message: 'Content must be provided'
});

export interface CaptureInput {
  content?: string;
  contentType?: string;
  perspective: 'I' | 'we' | 'you' | 'they';
  processing: 'during' | 'right-after' | 'long-after' | 'crafted';
  occurred?: string; // When it happened (chrono-node compatible)
  experiencer: string;
  crafted?: boolean;
  experiential_qualities?: {
    qualities: Array<{
      type: 'embodied' | 'attentional' | 'affective' | 'purposive' | 'spatial' | 'temporal' | 'intersubjective';
      prominence: number;
      manifestation: string;
    }>;
    vector?: QualityVector;
  };
}

export interface CaptureResult {
  source: SourceRecord;
  defaultsUsed: string[];
}

// Generate experiential quality vector from qualities array
function generateQualityVector(qualities: Array<{
  type: 'embodied' | 'attentional' | 'affective' | 'purposive' | 'spatial' | 'temporal' | 'intersubjective';
  prominence: number;
}>, providedVector?: QualityVector): QualityVector {
  // Start with provided vector or all zeros
  const vector: QualityVector = providedVector ? { ...providedVector } : {
    embodied: 0,
    attentional: 0,
    affective: 0,
    purposive: 0,
    spatial: 0,
    temporal: 0,
    intersubjective: 0
  };

  // Override only the dimensions that appear in the qualities array
  for (const quality of qualities) {
    vector[quality.type] = quality.prominence;
  }

  return vector;
}

export class CaptureService {
  async captureSource(input: CaptureInput): Promise<CaptureResult> {
    // Validate occurred field with chrono-node parsing
    let occurredDate: string | undefined;
    if (input.occurred) {
      occurredDate = await parseOccurredDate(input.occurred);
    }



    // Create source record for non-file captures
    if (!input.content) {
      throw new Error('Content is required when no file is provided');
    }
    
    // Process experiential qualities - generate vector if not provided
    let processedExperientialQualities: import('../core/types.js').ExperientialQualities | undefined = undefined;
    if (input.experiential_qualities?.qualities) {
      // Generate vector from qualities, using provided vector as base if available
      const generatedVector = generateQualityVector(input.experiential_qualities.qualities, input.experiential_qualities.vector);
      processedExperientialQualities = {
        qualities: input.experiential_qualities.qualities,
        vector: generatedVector
      };
    } else if (input.experiential_qualities?.vector) {
      // Handle case where only vector is provided without qualities array
      processedExperientialQualities = {
        qualities: [],
        vector: input.experiential_qualities.vector
      };
    }
    // If no experiential qualities provided, processedExperientialQualities remains undefined
    
    // Generate embedding for content
    let contentEmbedding: number[] | undefined;
    try {
      contentEmbedding = await embeddingService.generateEmbedding(input.content);
    } catch (error) {
      console.warn('Failed to generate embedding for content:', error);
      // Continue without embedding - it's optional
    }
    
    const source = await saveSource({
      id: generateId('src'),
      content: input.content,
      contentType: input.contentType || 'text',
      system_time: new Date().toISOString(),
      occurred: occurredDate || new Date().toISOString(),
      perspective: input.perspective,
      experiencer: input.experiencer,
      processing: input.processing as ProcessingLevel,
      crafted: input.crafted,
      experiential_qualities: processedExperientialQualities,
      content_embedding: contentEmbedding,
    });

    // Store vector in vector store if embedding was generated
    if (contentEmbedding) {
      try {
        await getVectorStore().addVector(source.id, contentEmbedding, {
          content: input.content.substring(0, 100), // Store first 100 chars as metadata
          contentType: input.contentType || 'text',
          experiencer: input.experiencer,
          perspective: input.perspective,
        });
      } catch (error) {
        console.warn('Failed to store vector:', error);
        // Continue without vector storage - it's optional
      }
    }

    const defaultsUsed = this.getDefaultsUsed(input);
    return { source, defaultsUsed };
  }

  private getDefaultsUsed(input: CaptureInput): string[] {
    const defaultsUsed = [];
    if (!input.perspective) defaultsUsed.push('perspective="I"');
    if (!input.experiencer) defaultsUsed.push('experiencer="self"');
    if (!input.processing) defaultsUsed.push('processing="during"');
    return defaultsUsed;
  }
} 