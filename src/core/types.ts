/**
 * Core types for the Bridge experiential data capture system.
 * Defines the data structures for capturing and analyzing human experience
 * through phenomenological dimensions and narrative generation.
 */

import { z } from 'zod';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Valid perspective values for experiential data */
export const PERSPECTIVES = ['I', 'we', 'you', 'they'] as const;

/** Valid processing levels for experiential data */
export const PROCESSING_LEVELS = ['during', 'right-after', 'long-after', 'crafted'] as const;

/** Valid content types for experiential data */
export const CONTENT_TYPES = ['text', 'audio'] as const;

/** Valid experiential quality types */
export const QUALITY_TYPES = [
  'embodied', 'attentional', 'affective', 'purposive', 
  'spatial', 'temporal', 'intersubjective'
] as const;

/** Default values for experiential data */
export const DEFAULTS = {
  PERSPECTIVE: 'I' as const,
  EXPERIENCER: 'self',
  PROCESSING: 'during' as const,
  CONTENT_TYPE: 'text' as const,
  CRAFTED: false,
  QUALITY_PROMINENCE: 0.5,
} as const;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** Perspective from which experience is captured */
export type Perspective = typeof PERSPECTIVES[number] | string;

/** When the processing occurred relative to the experience */
export type ProcessingLevel = typeof PROCESSING_LEVELS[number];

/** Experiential quality dimensions */
export type QualityType = typeof QUALITY_TYPES[number];

/**
 * Evidence of a specific experiential quality in the captured data.
 * Includes prominence scoring and manifestation description.
 */
export interface QualityEvidence {
  /** The type of experiential quality */
  type: QualityType;
  /** Prominence score from 0.0 (absent) to 1.0 (dominant) */
  prominence: number;
  /** Description of how this quality manifests in the experience */
  manifestation: string;
}

/**
 * Complete experiential analysis of captured data, plus emoji and narrative.
 * Contains specific quality evidence, emoji summary, and narrative description.
 */
export interface Experience {
  /** Specific evidence of experiential qualities */
  qualities: QualityEvidence[];
  /** Emoji representing the experience (required) */
  emoji: string;
  /** Concise experiential summary in the experiencer's voice (required) */
  narrative: string;
}

/** A captured experiential moment */
export interface Source {
  /** Unique identifier for this source */
  id: string;
  /** The captured source (text, audio transcript, etc.) */
  source: string;
  /** When the experience was captured (auto-generated) */
  created: string;
  
  // Context fields
  /** Perspective from which experience is captured */
  perspective?: Perspective;
  /** Who experienced this (default: "self") */
  experiencer?: string;
  /** When processing occurred relative to experience */
  processing?: ProcessingLevel;
  /** Whether this is crafted content (blog) vs raw capture (journal) */
  crafted?: boolean;
  
  // Analysis fields
  /** Experience analysis results (qualities + emoji + narrative) */
  experience?: Experience;
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

/** Zod schema for QualityEvidence */
export const QualityEvidenceSchema = z.object({
  type: z.enum(QUALITY_TYPES).describe('The type of experiential quality'),
  prominence: z.number().min(0).max(1).describe('Prominence score from 0.0 (absent) to 1.0 (dominant)'),
  manifestation: z.string().describe('Description of how this quality manifests in the experience')
});

/** Zod schema for Experience */
export const ExperienceSchema = z.object({
  qualities: z.array(QualityEvidenceSchema).describe('Specific evidence of experiential qualities'),
  emoji: z.string().describe('Emoji representing the experience'),
  narrative: z.string().max(200).describe('Concise experiential summary in the experiencer\'s voice')
});

/** Zod schema for Source */
export const SourceSchema = z.object({
  id: z.string().min(1).describe('Unique identifier for this source'),
  source: z.string().min(1).describe('The captured source (text, audio transcript, etc.)'),
  created: z.string().describe('When the experience was captured (auto-generated)'),
  perspective: z.union([
    z.enum(PERSPECTIVES),
    z.string().min(1)
  ]).optional().describe('Perspective from which experience is captured'),
  experiencer: z.string().optional().describe('Who experienced this (default: "self")'),
  processing: z.enum(PROCESSING_LEVELS).optional().describe('When processing occurred relative to experience'),
  crafted: z.boolean().optional().describe('Whether this is crafted content (blog) vs raw capture (journal)'),
  experience: ExperienceSchema.optional().describe('Experience analysis results (qualities + emoji + narrative)')
});

/** Zod schema for EmbeddingRecord */
export const EmbeddingRecordSchema = z.object({
  sourceId: z.string().describe('Source ID this embedding belongs to'),
  vector: z.array(z.number()).describe('Vector embedding for semantic search'),
  generated: z.string().describe('When the embedding was generated')
});

/** Zod schema for StorageData */
export const StorageDataSchema = z.object({
  sources: z.array(SourceSchema).describe('Array of captured experiential sources'),
  embeddings: z.array(EmbeddingRecordSchema).optional().describe('Array of embedding records for semantic search')
});

/** Zod schema for SourceRecord */
export const SourceRecordSchema = SourceSchema.extend({
  type: z.literal('source').optional().describe('Record type identifier')
});

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates that a number is within the valid range for quality scores.
 * @param value - The value to validate
 * @returns True if the value is between 0.0 and 1.0
 */
export function isValidQualityScore(value: number): boolean {
  return typeof value === 'number' && value >= 0.0 && value <= 1.0;
}

/**
 * Validates that a string is a valid quality type.
 * @param value - The value to validate
 * @returns True if the value is a valid quality type
 */
export function isValidQualityType(value: string): value is QualityType {
  return QUALITY_TYPES.includes(value as QualityType);
}

/**
 * Validates that a string is a valid perspective.
 * @param value - The value to validate
 * @returns True if the value is a valid perspective
 */
export function isValidPerspective(value: string): value is Perspective {
  return PERSPECTIVES.includes(value as any) || (typeof value === 'string' && value.length > 0);
}

/**
 * Validates that a string is a valid processing level.
 * @param value - The value to validate
 * @returns True if the value is a valid processing level
 */
export function isValidProcessingLevel(value: string): value is ProcessingLevel {
  return PROCESSING_LEVELS.includes(value as ProcessingLevel);
}

/**
 * Validates a source object.
 * @param source - The source to validate
 * @returns True if the source has required fields and valid values
 */
export function isValidSource(source: unknown): source is Source {
  if (!source || typeof source !== 'object') return false;
  
  const s = source as Source;
  return (
    typeof s.id === 'string' && s.id.length > 0 &&
    typeof s.source === 'string' && s.source.length > 0 &&
    typeof s.created === 'string' &&
    (s.experience === undefined || (
      typeof s.experience.narrative === 'string' && s.experience.narrative.length > 0 && s.experience.narrative.length <= 200
    )) &&
    (s.perspective === undefined || isValidPerspective(s.perspective)) &&
    (s.experiencer === undefined || typeof s.experiencer === 'string') &&
    (s.processing === undefined || isValidProcessingLevel(s.processing)) &&
    (s.crafted === undefined || typeof s.crafted === 'boolean')
  );
}

// ============================================================================
// ZOD-BASED VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates a source object using Zod schema.
 * @param source - The source to validate
 * @returns Validation result with success status and parsed data or errors
 */
export function validateSource(source: unknown) {
  return SourceSchema.safeParse(source);
}

/**
 * Validates an experience object using Zod schema.
 * @param experience - The experience to validate
 * @returns Validation result with success status and parsed data or errors
 */
export function validateExperience(experience: unknown) {
  return ExperienceSchema.safeParse(experience);
}

/**
 * Validates a quality evidence object using Zod schema.
 * @param quality - The quality evidence to validate
 * @returns Validation result with success status and parsed data or errors
 */
export function validateQualityEvidence(quality: unknown) {
  return QualityEvidenceSchema.safeParse(quality);
}

/**
 * Validates storage data using Zod schema.
 * @param data - The storage data to validate
 * @returns Validation result with success status and parsed data or errors
 */
export function validateStorageData(data: unknown) {
  return StorageDataSchema.safeParse(data);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Creates a new source with default values.
 * @param source - The source to capture
 * @param id - Optional ID (auto-generated if not provided)
 * @returns A new source object
 */
export function createSource(source: string, id?: string): Source {
  return {
    id: id || `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    source,
    created: new Date().toISOString(),
    perspective: DEFAULTS.PERSPECTIVE,
    experiencer: DEFAULTS.EXPERIENCER,
    processing: DEFAULTS.PROCESSING,
    crafted: DEFAULTS.CRAFTED
  };
}

/**
 * Creates a new source record with default values.
 * @param source - The source to capture
 * @param id - Optional ID (auto-generated if not provided)
 * @returns A new source record object
 */
export function createSourceRecord(source: string, id?: string): SourceRecord {
  return {
    ...createSource(source, id),
    type: 'source'
  };
} 