// Core types for the Bridge system

export type Perspective = "I" | "we" | "you" | "they" | string;
export type ProcessingLevel = "during" | "right-after" | "long-after" | "crafted";
export type ContentType = "text" | "audio" | string;

export type QualityType = "embodied" | "attentional" | "affective" | "purposive" | "spatial" | "temporal" | "intersubjective";

export interface QualityEvidence {
  type: QualityType;
  prominence: number;     // 0.0-1.0 score
  manifestation: string;  // How it manifests in experience
}

export interface QualityVector {
  embodied: number;       // 0.0-1.0
  attentional: number;    // 0.0-1.0
  affective: number;      // 0.0-1.0
  purposive: number;      // 0.0-1.0
  spatial: number;        // 0.0-1.0
  temporal: number;       // 0.0-1.0
  intersubjective: number; // 0.0-1.0
}

export interface ExperientialQualities {
  qualities: QualityEvidence[];
  vector: QualityVector;
}

export interface Source {
  id: string; // Generated
  content: string; 
  contentType?: ContentType; // Default: "text"
  system_time: string; // Auto-generated ISO timestamp
  occurred?: string; // When it happened (chrono-node compatible)
  
  // Context
  perspective?: Perspective; // Default: "I"
  experiencer?: string; // Default: "self"
  processing?: ProcessingLevel; // Default: "during"
  crafted?: boolean; // as in blog = true, journal = false
  
  // Experiential analysis
  experiential_qualities?: ExperientialQualities;
  
  // Vector embeddings
  content_embedding?: number[]; // Text embedding for semantic search
}

// Storage record types
export type RecordType = "source";

export interface BaseRecord {
  type: RecordType;
  id: string;
}

export interface SourceRecord extends BaseRecord, Source {
  type: "source";
}

export type StorageRecord = SourceRecord; 