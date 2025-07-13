/**
 * Capture service for Bridge experiential data.
 * Handles validation, narrative embedding, and storage of experiential sources.
 */

import { z } from 'zod';
import { generateId, saveSource } from '../core/storage.js';
import type { SourceRecord, ProcessingLevel } from '../core/types.js';
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
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates and normalizes quality types to ensure they match the enum
 * Provides helpful error messages for invalid types
 */
function validateQualityTypes(qualities: Array<{ type: string; prominence: number; manifestation: string }>): Array<{ type: typeof QUALITY_TYPES[number]; prominence: number; manifestation: string }> {
  const validTypes = QUALITY_TYPES as readonly string[];
  
  return qualities.map((quality, index) => {
    if (validTypes.includes(quality.type)) {
      return quality as { type: typeof QUALITY_TYPES[number]; prominence: number; manifestation: string };
    }
    
    // Map common invalid types to valid ones with helpful error message
    const typeMapping: Record<string, typeof QUALITY_TYPES[number]> = {
      'insight': 'attentional',
      'recognition': 'attentional', 
      'synthesis': 'attentional',
      'wisdom': 'attentional',
      'growth': 'purposive',
      'acceptance': 'affective',
      'connection': 'intersubjective',
      'collaboration': 'intersubjective',
      'validation': 'affective',
      'transformation': 'purposive',
      'integration': 'attentional',
      'emotional_resonance': 'affective',
      'vulnerability': 'affective',
      'gratitude': 'affective',
      'mentorship': 'intersubjective',
      'belonging': 'intersubjective',
      'empowerment': 'purposive',
      'reflection': 'attentional',
      'identity_realization': 'attentional',
      'self_reference': 'attentional',
      'temporal_awareness': 'temporal',
      'collective_consciousness': 'intersubjective',
      'innovation': 'purposive',
      'cultural_inclusion': 'intersubjective',
      'transparency': 'attentional',
      'pioneering': 'purposive',
      'care': 'affective',
      'adaptation': 'purposive',
      'adaptability': 'purposive',
      'problem-solving': 'purposive',
      'growth_mindset': 'attentional',
      'technical_achievement': 'purposive',
      'discovery': 'attentional'
    };
    
    const mappedType = typeMapping[quality.type];
    if (mappedType) {
      console.warn(`Quality type "${quality.type}" at index ${index} was mapped to "${mappedType}". Valid types are: ${validTypes.join(', ')}`);
      return {
        type: mappedType,
        prominence: quality.prominence,
        manifestation: quality.manifestation
      };
    }
    
    // If no mapping exists, throw a helpful error
    throw new Error(
      `Invalid quality type "${quality.type}" at index ${index}. ` +
      `Valid types are: ${validTypes.join(', ')}. ` +
      `Common mappings: insight→attentional, growth→purposive, connection→intersubjective, etc.`
    );
  });
}

// ============================================================================
// SCHEMA & TYPES
// ============================================================================

/**
 * Zod schema for validating capture input.
 * Narrative is required - a concise experiential summary in the experiencer's voice.
 */
export const captureSchema = z.object({
  content: z.string().optional(),
  contentType: z.string().optional().default(CAPTURE_DEFAULTS.CONTENT_TYPE),
  perspective: z.enum(['I', 'we', 'you', 'they']).optional().default(CAPTURE_DEFAULTS.PERSPECTIVE as 'I' | 'we' | 'you' | 'they'),
  processing: z.enum(['during', 'right-after', 'long-after', 'crafted']).optional().default(CAPTURE_DEFAULTS.PROCESSING as 'during' | 'right-after' | 'long-after' | 'crafted'),
  occurred: z.string().optional(),
  experiencer: z.string().optional().default(CAPTURE_DEFAULTS.EXPERIENCER),
  crafted: z.boolean().optional(),
  experience: z.object({
    qualities: z.array(z.object({
      type: z.enum(QUALITY_TYPES),
      prominence: z.number().min(0).max(1),
      manifestation: z.string(),
    })),
    emoji: z.string().min(1, 'Emoji is required'),
    narrative: z.string().min(1, 'Narrative is required').max(200, 'Narrative should be a concise experiential summary'),
  }),
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
  experience: {
    qualities: Array<{
      type: typeof QUALITY_TYPES[number];
      prominence: number;
      manifestation: string;
    }>;
    emoji: string;
    narrative: string; // Required - concise experiential summary in experiencer's voice
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
    // Pre-validate and normalize quality types before Zod validation
    if (input.experience?.qualities) {
      input.experience.qualities = validateQualityTypes(input.experience.qualities);
    }
    
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

    // Process experience - no vector generation needed
    const processedExperience: import('../core/types.js').Experience = {
      qualities: validatedInput.experience.qualities,
      emoji: validatedInput.experience.emoji,
      narrative: validatedInput.experience.narrative,
    };

    // Generate embedding from narrative (now required)
    let narrativeEmbedding: number[] | undefined;
    try {
      narrativeEmbedding = await embeddingService.generateEmbedding(validatedInput.experience.narrative);
    } catch (error) {
      // Silently handle embedding generation errors in MCP context
    }

    const source = await saveSource({
      id: await generateId('src'),
      content: validatedInput.content || validatedInput.experience.narrative,  // Use content if provided, otherwise use narrative
      contentType: validatedInput.contentType,
      system_time: new Date().toISOString(),
      occurred: occurredDate || new Date().toISOString(),
      perspective,
      experiencer,
      processing: processing as ProcessingLevel,
      crafted: validatedInput.crafted,
      experience: processedExperience,
      narrative_embedding: narrativeEmbedding,
    });

    // Store vector in vector store if embedding was generated
    if (narrativeEmbedding) {
      try {
        const vectorStore = getVectorStore();
        vectorStore.addVector(source.id, narrativeEmbedding);
        // Save vectors to disk immediately to ensure persistence
        await vectorStore.saveToDisk();
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