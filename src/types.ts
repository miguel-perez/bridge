// Core types for the Framed Moments system

export type Perspective = "I" | "we" | "you" | "they" | string;
export type ProcessingLevel = "during" | "right-after" | "long-after" | "crafted";
export type ContentType = "text" | "voice" | "image" | "link" | string;
export enum QualityType {
  Embodied = 'embodied',
  Attentional = 'attentional',
  Emotional = 'emotional',
  Purposive = 'purposive',
  Spatial = 'spatial',
  Temporal = 'temporal',
  Relational = 'relational',
}

export enum ShotType {
  MomentOfRecognition = 'moment-of-recognition',
  SustainedAttention = 'sustained-attention',
  CrossingThreshold = 'crossing-threshold',
  PeripheralAwareness = 'peripheral-awareness',
  DirectedMomentum = 'directed-momentum',
  HoldingOpposites = 'holding-opposites',
}

export interface Source {
  id: string; // Generated
  content: string; 
  contentType: ContentType; // Default: "text"
  created: string; // ISO timestamp
  when?: string; // When it happened (defaults to created)
  
  // Context
  perspective?: Perspective; // Default: "I"
  experiencer?: string; // Default: "self"
  processing?: ProcessingLevel; // Default: "during"
  reflects_on?: string[]; // IDs of sources this record reflects on (formerly 'related')
  
  // File reference (for non-text content)
  file?: string; // Path to file, validated against MCP roots
}

export interface Moment {
  id: string; // Generated
  
  // Core frame data
  emoji: string;
  summary: string; // 5-7 word narrative
  narrative?: string; // Full first-person experiential description
  shot?: ShotType; // Optional shot type
  
  // Experiential dimensions - include whichever are present
  qualities?: Array<{
    type: QualityType;
    manifestation: string; // Rich description of how this quality appears
  }>;
  
  // Source tracking
  sources: Array<{
    sourceId: string;
    start?: number; // Character positions for selected source text
    end?: number;
  }>;
  
  // Timestamps  
  created: string; // When moment was framed
  when?: string; // When experience happened
}

// Storage record types
export type RecordType = "source" | "moment" | "scene";

export interface BaseRecord {
  type: RecordType;
  id: string;
}

export interface SourceRecord extends BaseRecord, Source {
  type: "source";
}

export interface MomentRecord extends BaseRecord, Moment {
  type: "moment";
  lastModified?: string;
  experiencer?: string;
  reframedBy?: string; // ID of the new moment that reframed this one
}

export interface SceneRecord extends BaseRecord {
  type: "scene";
  emoji: string;
  summary: string;
  narrative?: string;
  momentIds: string[];
  shot: ShotType;
  created: string;
  when?: string; // When the scene happened (inherited from moments or manually set)
  experiencer?: string;
  reframedBy?: string; // ID of the new scene that reframed this one
}

export type StorageRecord = SourceRecord | MomentRecord | SceneRecord; 