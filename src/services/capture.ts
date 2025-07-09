/**
 * Capture service for Bridge experiential data.
 * Handles validation, vector generation, embedding, and storage of experiential sources.
 */

import { z } from 'zod';
import { generateId, saveSource } from '../core/storage.js';
import type { SourceRecord, ProcessingLevel, QualityVector } from '../core/types.js';
import { parseOccurredDate } from '../utils/validation.js';
import { embeddingService } from './embeddings.js';
import { getVectorStore } from './vector-store.js';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default values for capture fields */
export const CAPTURE_DEFAULTS = {
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
 * Zod schema for validating capture input.
 * Vector is optional since it can be generated from qualities.
 */
export const captureSchema = z.object({
  content: z.string().optional(),
  contentType: z.string().optional().default(CAPTURE_DEFAULTS.CONTENT_TYPE),
  perspective: z.enum(['I', 'we', 'you', 'they']).optional().default(CAPTURE_DEFAULTS.PERSPECTIVE as 'I' | 'we' | 'you' | 'they'),
  processing: z.enum(['during', 'right-after', 'long-after', 'crafted']).optional().default(CAPTURE_DEFAULTS.PROCESSING as 'during' | 'right-after' | 'long-after' | 'crafted'),
  occurred: z.string().optional(),
  experiencer: z.string().optional().default(CAPTURE_DEFAULTS.EXPERIENCER),
  crafted: z.boolean().optional(),
  experiential_qualities: z.object({
    qualities: z.array(z.object({
      type: z.enum(QUALITY_TYPES),
      prominence: z.number().min(0).max(1),
      manifestation: z.string(),
    })),
    vector: z.object({
      embodied: z.number().min(0).max(1),
      attentional: z.number().min(0).max(1),
      affective: z.number().min(0).max(1),
      purposive: z.number().min(0).max(1),
      spatial: z.number().min(0).max(1),
      temporal: z.number().min(0).max(1),
      intersubjective: z.number().min(0).max(1),
    }).optional(),
  }),
}).refine((data) => {
  if (!data.content) {
    throw new Error('Content must be provided');
  }
  return true;
}, {
  message: 'Content must be provided',
});

/**
 * Input type for capturing experiential data.
 */
export interface CaptureInput {
  content?: string;
  contentType?: string;
  perspective?: 'I' | 'we' | 'you' | 'they';
  processing?: 'during' | 'right-after' | 'long-after' | 'crafted';
  occurred?: string;
  experiencer?: string;
  crafted?: boolean;
  experiential_qualities: {
    qualities: Array<{
      type: typeof QUALITY_TYPES[number];
      prominence: number;
      manifestation: string;
    }>;
    vector?: QualityVector;
  };
}

/**
 * Result of a capture operation.
 */
export interface CaptureResult {
  source: SourceRecord;
  defaultsUsed: string[];
}

// ============================================================================
// QUALITY VECTOR GENERATION
// ============================================================================

/**
 * Generates a quality vector from an array of qualities.
 * @param qualities - Array of quality evidence
 * @param providedVector - Optional base vector to override
 * @returns Quality vector with all dimensions
 */
function generateQualityVector(
  qualities: Array<{ type: typeof QUALITY_TYPES[number]; prominence: number }>,
  providedVector?: QualityVector
): QualityVector {
  const vector: QualityVector = providedVector ? { ...providedVector } : {
    embodied: 0,
    attentional: 0,
    affective: 0,
    purposive: 0,
    spatial: 0,
    temporal: 0,
    intersubjective: 0,
  };
  for (const quality of qualities) {
    vector[quality.type] = quality.prominence;
  }
  return vector;
}

// ============================================================================
// CAPTURE SERVICE
// ============================================================================

/**
 * Service for capturing and storing experiential sources.
 */
export class CaptureService {
  /**
   * Captures a new experiential source, validates input, generates embeddings, and stores it.
   * @param input - Capture input data
   * @returns Capture result with source record and defaults used
   * @throws Error if validation fails or required fields are missing
   */
  async captureSource(input: CaptureInput): Promise<CaptureResult> {
    // Validate input using Zod schema first
    const validatedInput = captureSchema.parse(input);

    // Validate occurred field with chrono-node parsing
    let occurredDate: string | undefined;
    if (validatedInput.occurred) {
      try {
        occurredDate = await parseOccurredDate(validatedInput.occurred);
        if (!occurredDate || isNaN(Date.parse(occurredDate))) {
          throw new Error();
        }
      } catch {
        throw new Error('Invalid occurred date format. Example valid formats: "2024-01-15", "yesterday", "last week", "2024-01-01T10:00:00Z".');
      }
    }

    // Use validated input with defaults applied
    const perspective = validatedInput.perspective;
    const processing = validatedInput.processing;
    const experiencer = validatedInput.experiencer;

    // Process experiential qualities - generate vector if not provided
    let processedExperientialQualities: import('../core/types.js').ExperientialQualities;
    if (validatedInput.experiential_qualities.qualities) {
      const generatedVector = generateQualityVector(validatedInput.experiential_qualities.qualities, validatedInput.experiential_qualities.vector);
      processedExperientialQualities = {
        qualities: validatedInput.experiential_qualities.qualities,
        vector: generatedVector,
      };
    } else if (validatedInput.experiential_qualities.vector) {
      processedExperientialQualities = {
        qualities: [],
        vector: validatedInput.experiential_qualities.vector,
      };
    } else {
      throw new Error('Experiential qualities analysis is required. The AI assistant must analyze the content and provide quality scores. Example: { experiential_qualities: { qualities: [ { type: "embodied", prominence: 0.7, manifestation: "tense shoulders" }, ... ] } }');
    }

    // Generate embedding for content
    let contentEmbedding: number[] | undefined;
    try {
      contentEmbedding = await embeddingService.generateEmbedding(validatedInput.content!);
    } catch (error) {
      // Silently handle embedding generation errors in MCP context
    }

    const source = await saveSource({
      id: generateId('src'),
      content: validatedInput.content!,
      contentType: validatedInput.contentType,
      system_time: new Date().toISOString(),
      occurred: occurredDate || new Date().toISOString(),
      perspective,
      experiencer,
      processing: processing as ProcessingLevel,
      crafted: validatedInput.crafted,
      experiential_qualities: processedExperientialQualities,
      content_embedding: contentEmbedding,
    });

    // Store vector in vector store if embedding was generated
    if (contentEmbedding) {
      try {
        const vectorStore = getVectorStore();
        vectorStore.addVector(source.id, contentEmbedding);
      } catch (error) {
        // Silently handle vector storage errors in MCP context
      }
    }

    const defaultsUsed = this.getDefaultsUsed(input);
    return { source, defaultsUsed };
  }

  /**
   * Returns a list of which defaults were used for the capture input.
   * @param originalInput - Original input data
   * @returns Array of default field descriptions
   */
  private getDefaultsUsed(originalInput: CaptureInput): string[] {
    const defaultsUsed = [];
    if (!originalInput.perspective) defaultsUsed.push('perspective="I"');
    if (!originalInput.experiencer) defaultsUsed.push('experiencer="self"');
    if (!originalInput.processing) defaultsUsed.push('processing="during"');
    if (!originalInput.contentType) defaultsUsed.push('contentType="text"');
    return defaultsUsed;
  }
} 