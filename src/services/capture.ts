/**
 * Capture service for Bridge experiential data.
 * Handles validation, narrative embedding, and storage of experiential sources.
 */

import { z } from 'zod';
import { bridgeLogger } from '../utils/bridge-logger.js';
import { saveSource, saveEmbedding } from '../core/storage.js';
import { generateId } from '../core/storage.js';
import type { Source, EmbeddingRecord } from '../core/types.js';
import { QUALITY_TYPES } from '../core/types.js';
import { EmbeddingService } from './embeddings.js';
import { VectorStore } from './vector-store.js';
import { EnhancedEmbeddingService } from './enhanced-embedding.js';

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
      if (!process.env.BRIDGE_TEST_MODE) {
        bridgeLogger.warn(`Quality type "${quality.type}" at index ${index} was mapped to "${mappedType}". Valid types are: ${validTypes.join(', ')}`);
      }
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
 * Content is optional - if not provided, narrative will be used as content.
 */
export const captureSchema = z.object({
  content: z.string().optional(),
  perspective: z.enum(['I', 'we', 'you', 'they']).optional(),
  experiencer: z.string().optional(),
  processing: z.enum(['during', 'right-after', 'long-after', 'crafted']).optional(),
  crafted: z.boolean().optional(),
  
  // Experience analysis
  experience: z.object({
    qualities: z.array(z.object({
      type: z.enum(QUALITY_TYPES),
      prominence: z.number().min(0).max(1),
      manifestation: z.string()
    })),
    emoji: z.string().min(1, 'Emoji is required'),
    narrative: z.string().min(1, 'Narrative is required').max(200, 'Narrative too long')
  }).optional()
});

/**
 * Input type for capturing experiential data.
 */
export interface CaptureInput {
  content?: string;
  perspective?: string;
  experiencer?: string;
  processing?: string;
  crafted?: boolean;
  experience?: {
    qualities: Array<{ type: string; prominence: number; manifestation: string }>;
    emoji: string;
    narrative: string;
  };
}

/**
 * Result of a capture operation.
 */
export interface CaptureResult {
  source: Source;
  defaultsUsed: string[];
}

// ============================================================================
// CAPTURE SERVICE
// ============================================================================

/**
 * Service for capturing and storing experiential sources.
 */
export class CaptureService {
  private enhancedEmbeddingService: EnhancedEmbeddingService;

  constructor() {
    this.enhancedEmbeddingService = new EnhancedEmbeddingService();
  }
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
    
    // Validate input
    const validatedInput = captureSchema.parse(input);
    
    // Generate unique ID
    const id = await generateId();
    
    // Auto-generate created timestamp
    const created = new Date().toISOString();
    
    // Use narrative as content if content is not provided
    const content = validatedInput.content || validatedInput.experience?.narrative || 'Experience captured';
    
    // Create source record
    const sourceRecord: Source = {
      id,
      content,
      created,
      perspective: validatedInput.perspective || 'I',
      experiencer: validatedInput.experiencer || 'self',
      processing: validatedInput.processing || 'during',
      crafted: validatedInput.crafted || false,
      experience: validatedInput.experience || {
        qualities: [],
        emoji: '📝',
        narrative: 'Experience captured'
      }
    };
    
    // Save the source record
    const savedSource = await saveSource(sourceRecord);
    
    // Generate and save embedding
    try {
      const embeddingService = new EmbeddingService();
      await embeddingService.initialize();
      
      const enhancedService = new EnhancedEmbeddingService();
      const embedding = await enhancedService.generateEnhancedEmbedding(
        savedSource.experience?.emoji || '📝',
        savedSource.experience?.narrative || '',
        savedSource.content,
        savedSource.experience?.qualities || [],
        savedSource.created,
        savedSource.perspective,
        savedSource.experiencer,
        savedSource.processing
      );
      
      // Save embedding to storage
      const embeddingRecord: EmbeddingRecord = {
        sourceId: savedSource.id,
        vector: embedding,
        generated: new Date().toISOString()
      };
      
      await saveEmbedding(embeddingRecord);
      
      // Save to vector store for backward compatibility
      const vectorStore = new VectorStore();
      await vectorStore.initialize();
      await vectorStore.addVector(savedSource.id, embedding);
      await vectorStore.saveToDisk();
      
      const defaultsUsed = this.getDefaultsUsed(input);
      return { source: savedSource, defaultsUsed };
    } catch (error) {
      // Don't fail capture if embedding generation fails
      bridgeLogger.warn('Embedding generation failed:', error);
      const defaultsUsed = this.getDefaultsUsed(input);
      return { source: savedSource, defaultsUsed };
    }
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
    if (!originalInput.content) defaultsUsed.push('content="Experience captured"');
    return defaultsUsed;
  }
} 