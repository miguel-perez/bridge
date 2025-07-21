/**
 * Core types for the Bridge experiential data experience system.
 * Defines the data structures for capturing and analyzing human experience
 * through simplified quality arrays.
 */

import { z } from 'zod';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Valid perspective values for experiential data */
export const PERSPECTIVES = ['I', 'we', 'you', 'they'] as const;

/** Valid processing levels for experiential data */
export const PROCESSING_LEVELS = ['during', 'right-after', 'long-after'] as const;

/** Valid content types for experiential data */
export const CONTENT_TYPES = ['text', 'audio'] as const;

/** Valid experiential quality types - simplified names from README */
export const QUALITY_TYPES = [
  'embodied', 'focus', 'mood', 'purpose',
  'space', 'time', 'presence'
] as const;

/** Default values for experiential data */
export const DEFAULTS = {
  PERSPECTIVE: 'I' as const,
  EXPERIENCER: 'self',
  PROCESSING: 'during' as const,
  CONTENT_TYPE: 'text' as const,
  CRAFTED: false,
} as const;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** Perspective from which experience is experienceed */
export type Perspective = typeof PERSPECTIVES[number] | string;

/** When the processing occurred relative to the experience */
export type ProcessingLevel = typeof PROCESSING_LEVELS[number];

/** Experiential quality types */
export type QualityType = typeof QUALITY_TYPES[number];

/**
 * Complete experiential analysis of experienceed data.
 * Array of qualities that emerge prominently in this moment.
 */
export type Experience = string[];

/** A experienceed experiential moment */
export interface Source {
  /** Unique identifier for this source */
  id: string;
  /** The experienceed source (text, audio transcript, etc.) */
  source: string;
  /** When the experience was experienceed (auto-generated) */
  created: string;
  
  // Context fields
  /** Perspective from which experience is experienceed */
  perspective?: Perspective;
  /** Who experienced this (default: "self") */
  experiencer?: string;
  /** When processing occurred relative to experience */
  processing?: ProcessingLevel;
  /** Whether this is crafted content (blog) vs raw experience (journal) */
  crafted?: boolean;
  
  // Analysis fields
  /** Experience analysis results (prominent qualities) */
  experience?: Experience;
  
  // Pattern realization fields
  /** Array of experience IDs that this experience reflects on/connects to */
  reflects?: string[];
}

/**
 * Embedding record for semantic search
 */
export interface EmbeddingRecord {
  /** Source ID this embedding belongs to */
  sourceId: string;
  /** Vector embedding for semantic search */
  vector: number[];
  /** When the embedding was generated */
  generated: string;
}

// ============================================================================
// STORAGE TYPES
// ============================================================================

/** Storage data structure */
export interface StorageData {
  sources: Source[];
  embeddings?: EmbeddingRecord[];
}

/** Valid record types in the storage system */
export type RecordType = "source";

/** Base interface for all storage records */
export interface BaseRecord {
  type: RecordType;
  id: string;
}

/** Storage record for experiential sources */
export interface SourceRecord extends Source {
  // Note: type field removed from data model but kept in interface for compatibility
  type?: "source";
}

/** Union type of all possible storage records */
export type StorageRecord = SourceRecord;

// ============================================================================
// ZOD SCHEMAS FOR INTERNAL DATA MODELS
// ============================================================================

/** Zod schema for Experience */
export const ExperienceSchema = z.array(z.string().refine(val => {
  // Accept base quality types or dot notation variants
  const baseQuality = val.split('.')[0];
return QUALITY_TYPES.includes(baseQuality as QualityType);
}, {
  message: 'Invalid quality type'
})).describe('Array of qualities that emerge prominently in this moment');

/** Zod schema for Source */
export const SourceSchema = z.object({
  id: z.string().min(1).describe('Unique identifier for this source'),
  source: z.string().min(1).describe('The experienceed source (text, audio transcript, etc.)'),
  created: z.string().describe('When the experience was experienceed (auto-generated)'),
  perspective: z.string().optional().describe('Perspective from which experience is experienceed'),
  experiencer: z.string().optional().describe('Who experienced this'),
  processing: z.enum(PROCESSING_LEVELS).optional().describe('When processing occurred relative to experience'),
  crafted: z.boolean().optional().describe('Whether this is crafted content vs raw experience'),
  experience: ExperienceSchema.optional().describe('Experience analysis results'),
  reflects: z.array(z.string()).optional().describe('Array of experience IDs that this experience reflects on/connects to')
});

/** Zod schema for StorageData */
export const StorageDataSchema = z.object({
  sources: z.array(SourceSchema).describe('Array of experienceed experiential sources'),
  embeddings: z.array(z.object({
    sourceId: z.string().describe('Source ID this embedding belongs to'),
    vector: z.array(z.number()).describe('Vector embedding for semantic search'),
    generated: z.string().describe('When the embedding was generated')
  })).optional().describe('Array of embedding records')
});

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates if a value is a valid quality type
 */
export function isValidQualityType(value: string): boolean {
  // Accept base quality types or dot notation variants
  const baseQuality = value.split('.')[0];
return QUALITY_TYPES.includes(baseQuality as QualityType);
}

/**
 * Validates if a value is a valid perspective
 */
export function isValidPerspective(value: string): value is Perspective {
  return PERSPECTIVES.includes(value as typeof PERSPECTIVES[number]) || (typeof value === 'string' && value.length > 0);
}

/**
 * Validates if a value is a valid processing level
 */
export function isValidProcessingLevel(value: string): value is ProcessingLevel {
  return PROCESSING_LEVELS.includes(value as ProcessingLevel);
}

/**
 * Type guard to check if an object is a valid Source
 */
export function isValidSource(source: unknown): source is Source {
  if (typeof source !== 'object' || source === null) return false;
  
  const src = source as Record<string, unknown>;
  
  return typeof src.id === 'string' && src.id.length > 0 &&
    typeof src.source === 'string' && src.source.length > 0 &&
    typeof src.created === 'string' &&
    (src.experience === undefined || (
      Array.isArray(src.experience) && 
      src.experience.length >= 0
    )) &&
    (src.perspective === undefined || (typeof src.perspective === 'string' && isValidPerspective(src.perspective))) &&
    (src.processing === undefined || (typeof src.processing === 'string' && isValidProcessingLevel(src.processing))) &&
    (src.reflects === undefined || (
      Array.isArray(src.reflects) && 
      src.reflects.every((item: unknown) => typeof item === 'string')
    ));
}

/**
 * Validates a source object using Zod schema
 */
export function validateSource(source: unknown): Source {
  return SourceSchema.parse(source);
}

/**
 * Validates an experience object using Zod schema
 */
export function validateExperience(experience: unknown): Experience {
  return ExperienceSchema.parse(experience);
}

/**
 * Validates storage data using Zod schema
 */
export function validateStorageData(data: unknown): StorageData {
  return StorageDataSchema.parse(data);
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Creates a new Source with default values
 */
export function createSource(source: string, id?: string): Source {
  return {
    id: id || `src_${Date.now()}`,
    source,
    created: new Date().toISOString(),
    perspective: DEFAULTS.PERSPECTIVE,
    experiencer: DEFAULTS.EXPERIENCER,
    processing: DEFAULTS.PROCESSING,
    crafted: DEFAULTS.CRAFTED
  };
}

/**
 * Creates a new SourceRecord with default values
 */
export function createSourceRecord(source: string, id?: string): SourceRecord {
  return {
    ...createSource(source, id),
    type: 'source'
  };
} 