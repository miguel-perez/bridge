/**
 * Core types for the Bridge experiential data capture system.
 * Defines the data structures for capturing and analyzing human experience
 * through phenomenological dimensions and vector representations.
 */

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
  VECTOR_DIMENSION: 0.0
} as const;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** Perspective from which experience is captured */
export type Perspective = typeof PERSPECTIVES[number] | string;

/** When the processing occurred relative to the experience */
export type ProcessingLevel = typeof PROCESSING_LEVELS[number];

/** Type of content being captured */
export type ContentType = typeof CONTENT_TYPES[number] | string;

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
 * Vector representation of experiential qualities across all dimensions.
 * Each dimension is scored from 0.0 (absent) to 1.0 (dominant).
 */
export interface QualityVector {
  embodied: number;
  attentional: number;
  affective: number;
  purposive: number;
  spatial: number;
  temporal: number;
  intersubjective: number;
}

/**
 * Complete experiential analysis of captured data.
 * Combines specific quality evidence with vector representation.
 */
export interface ExperientialQualities {
  /** Specific evidence of experiential qualities */
  qualities: QualityEvidence[];
  /** Vector representation across all dimensions */
  vector: QualityVector;
}

/**
 * A captured experiential moment or reflection.
 * Represents the core unit of data in the Bridge system.
 */
export interface Source {
  /** Unique identifier for this source */
  id: string;
  /** The captured content (text, audio transcript, etc.) */
  content: string;
  /** Type of content being captured */
  contentType?: ContentType;
  /** System timestamp when captured (ISO format) */
  system_time: string;
  /** When the experience actually occurred (chrono-node compatible) */
  occurred?: string;
  
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
  /** Experiential analysis results */
  experiential_qualities?: ExperientialQualities;
  /** Vector embedding for semantic search */
  content_embedding?: number[];
}

// ============================================================================
// STORAGE TYPES
// ============================================================================

/** Valid record types in the storage system */
export type RecordType = "source";

/** Base interface for all storage records */
export interface BaseRecord {
  type: RecordType;
  id: string;
}

/** Storage record for experiential sources */
export interface SourceRecord extends BaseRecord, Source {
  type: "source";
}

/** Union type of all possible storage records */
export type StorageRecord = SourceRecord;

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
  return PERSPECTIVES.includes(value as any) || typeof value === 'string';
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
 * Validates a quality vector object.
 * @param vector - The vector to validate
 * @returns True if all dimensions are valid quality scores
 */
export function isValidQualityVector(vector: unknown): vector is QualityVector {
  if (!vector || typeof vector !== 'object') return false;
  
  const v = vector as QualityVector;
  return QUALITY_TYPES.every(type => 
    isValidQualityScore(v[type as keyof QualityVector] as number)
  );
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
    typeof s.content === 'string' && s.content.length > 0 &&
    typeof s.system_time === 'string' &&
    (s.contentType === undefined || typeof s.contentType === 'string') &&
    (s.occurred === undefined || typeof s.occurred === 'string') &&
    (s.perspective === undefined || isValidPerspective(s.perspective)) &&
    (s.experiencer === undefined || typeof s.experiencer === 'string') &&
    (s.processing === undefined || isValidProcessingLevel(s.processing)) &&
    (s.crafted === undefined || typeof s.crafted === 'boolean') &&
    (s.content_embedding === undefined || Array.isArray(s.content_embedding))
  );
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Creates a new quality vector with default values.
 * @returns A quality vector with all dimensions set to 0.0
 */
export function createQualityVector(): QualityVector {
  return {
    embodied: DEFAULTS.VECTOR_DIMENSION,
    attentional: DEFAULTS.VECTOR_DIMENSION,
    affective: DEFAULTS.VECTOR_DIMENSION,
    purposive: DEFAULTS.VECTOR_DIMENSION,
    spatial: DEFAULTS.VECTOR_DIMENSION,
    temporal: DEFAULTS.VECTOR_DIMENSION,
    intersubjective: DEFAULTS.VECTOR_DIMENSION
  };
}

/**
 * Creates a new source with default values.
 * @param content - The content to capture
 * @param id - Optional ID (will be generated if not provided)
 * @returns A new source with sensible defaults
 */
export function createSource(content: string, id?: string): Source {
  return {
    id: id || crypto.randomUUID(),
    content,
    contentType: DEFAULTS.CONTENT_TYPE,
    system_time: new Date().toISOString(),
    perspective: DEFAULTS.PERSPECTIVE,
    experiencer: DEFAULTS.EXPERIENCER,
    processing: DEFAULTS.PROCESSING,
    crafted: DEFAULTS.CRAFTED
  };
}

/**
 * Creates a new source record for storage.
 * @param content - The content to capture
 * @param id - Optional ID (will be generated if not provided)
 * @returns A new source record ready for storage
 */
export function createSourceRecord(content: string, id?: string): SourceRecord {
  return {
    ...createSource(content, id),
    type: 'source'
  };
} 