/**
 * Remember service for Bridge experiential data.
 * Handles validation, narrative embedding, and storage of experiential sources.
 */

import { z } from 'zod';
import { bridgeLogger } from '../utils/bridge-logger.js';
import { saveSource, saveEmbedding } from '../core/storage.js';
import { generateId } from '../core/storage.js';
import type { Source, EmbeddingRecord, Experience } from '../core/types.js';

import { EmbeddingService } from './embeddings.js';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default values for remember fields */
export const REMEMBER_DEFAULTS = {
  CONTENT_TYPE: 'text',
  PERSPECTIVE: 'I',
  PROCESSING: 'during',
  EXPERIENCER: 'self',
};

// ============================================================================
// SCHEMA & TYPES
// ============================================================================

/**
 * Zod schema for validating remember input.
 * Content is optional - if not provided, a default will be used.
 */
export const rememberSchema = z.object({
  content: z.string().optional(),
  perspective: z.enum(['I', 'we', 'you', 'they']).optional(),
  experiencer: z.string().optional(),
  processing: z.enum(['during', 'right-after', 'long-after']).optional(),
  crafted: z.boolean().optional(),
  
  // Experience analysis - simplified to just prominent qualities array
  experience: z.array(z.string()).optional()
});

/**
 * Input type for remembering experiential data.
 */
export interface RememberInput {
  content?: string;
  perspective?: string;
  experiencer?: string;
  processing?: string;
  crafted?: boolean;
  experience?: string[];
}

/**
 * Result of a remember operation.
 */
export interface RememberResult {
  source: Source;
  defaultsUsed: string[];
}

// ============================================================================
// REMEMBER SERVICE
// ============================================================================

/**
 * Service for remembering and storing experiential sources.
 */
export class RememberService {
  // private enhancedEmbeddingService: EnhancedEmbeddingService;

  constructor() {
    // this.enhancedEmbeddingService = new EnhancedEmbeddingService();
  }

  /**
   * Remembers a new experiential source, validates input, generates embeddings, and stores it.
   * @param input - Remember input data
   * @returns Remember result with source record and defaults used
   * @throws Error if validation fails or required fields are missing
   */
  async rememberSource(input: RememberInput): Promise<RememberResult> {
    // Validate input
    const validatedInput = rememberSchema.parse(input);
    
    // Generate unique ID
    const id = await generateId();
    
    // Auto-generate created timestamp
    const created = new Date().toISOString();
    
    // Use content or default
    const source = validatedInput.content || 'Experience remembered';
    
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
      created,
      perspective: validatedInput.perspective || 'I',
      experiencer: validatedInput.experiencer || 'self',
      processing: validatedInput.processing || 'during',
      crafted: validatedInput.crafted || false,
      experience
    };
    
    // Save the source record
    const savedSource = await saveSource(sourceRecord);
    
    // Generate and save embedding
    try {
      const embeddingService = new EmbeddingService();
      await embeddingService.initialize();
      
      // Create simple embedding text with prominent qualities
      const qualitiesText = savedSource.experience && savedSource.experience.length > 0 
        ? `[${savedSource.experience.join(', ')}]`
        : '[]';
      
      const embeddingText = `"${savedSource.source}" ${qualitiesText}`;
      const embedding = await embeddingService.generateEmbedding(embeddingText);
      
      // Save embedding to storage
      const embeddingRecord: EmbeddingRecord = {
        sourceId: savedSource.id,
        vector: embedding,
        generated: new Date().toISOString()
      };
      
      await saveEmbedding(embeddingRecord);
      
      const defaultsUsed = this.getDefaultsUsed(input);
      return { source: savedSource, defaultsUsed };
    } catch (error) {
      // Don't fail remember if embedding generation fails
      bridgeLogger.warn('Embedding generation failed:', error);
      const defaultsUsed = this.getDefaultsUsed(input);
      return { source: savedSource, defaultsUsed };
    }
  }

  /**
   * Returns a list of which defaults were used for the remember input.
   * @param originalInput - Original input data
   * @returns Array of default field descriptions
   */
  private getDefaultsUsed(originalInput: RememberInput): string[] {
    const defaultsUsed = [];
    if (!originalInput.perspective) defaultsUsed.push('perspective="I"');
    if (!originalInput.experiencer) defaultsUsed.push('experiencer="self"');
    if (!originalInput.processing) defaultsUsed.push('processing="during"');
    if (!originalInput.content) defaultsUsed.push('content="Experience remembered"');
    return defaultsUsed;
  }
} 