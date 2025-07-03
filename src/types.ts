// Core types for the Framed Moments system

export type Perspective = "I" | "we" | "you" | "they" | string;
export type ProcessingLevel = "during" | "right-after" | "long-after" | "crafted";
export type ContentType = "text" | "voice" | "image" | "link" | string;
export type QualityType = "embodied" | "attentional" | "emotional" | "purposive" | "spatial" | "temporal" | "relational";

export type FramePattern = 
  | "moment-of-recognition"    // A clear focal point of understanding
  | "sustained-attention"      // When duration itself is primary
  | "crossing-threshold"       // The lived experience of transition
  | "peripheral-awareness"     // Multiple streams held simultaneously  
  | "directed-momentum"        // Experience dominated by direction
  | "holding-opposites"        // When contradictions refuse to resolve
  | string;                    // Open for other patterns

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
  related?: string[]; // Relationships to other sources
  
  // File reference (for non-text content)
  file?: string; // Path to file, validated against MCP roots
  ai?: { suggestion: string }; // Optional AI suggestions/analysis
}

export interface Moment {
  id: string; // Generated
  
  // Core frame data
  emoji: string;
  summary: string; // 5-7 word narrative
  narrative?: string; // Full first-person experiential description
  pattern?: FramePattern; // Optional pattern type
  
  // Experiential dimensions - include whichever are present
  qualities?: Array<{
    type: QualityType;
    manifestation: string; // Rich description of how this quality appears
  }>;
  
  // Source tracking
  sources: Array<{
    sourceId: string;
    start?: number; // Character positions for fragments
    end?: number;
  }>;
  
  // Timestamps  
  created: string; // When moment was framed
  when?: string; // When experience happened
  ai?: { suggestion: string }; // Optional AI suggestions/analysis
}

export interface Synthesis {
  id: string; // Generated
  emoji: string;
  summary: string; // 5-7 word summary
  narrative?: string; // Optional overarching narrative
  synthesizedMomentIds: string[]; // The moments contained within
  pattern: string; // Default: "synthesis"
  created: string; // When synthesis was created
}

// Storage record types
export type RecordType = "source" | "moment" | "synthesis";

export interface BaseRecord {
  type: RecordType;
  id: string;
  version?: number; // Version number, 1 for original, incremented for each update
  previousVersion?: string | null; // Previous record's ID, null for original
}

export interface SourceRecord extends BaseRecord, Source {
  type: "source";
}

export interface MomentRecord extends BaseRecord, Moment {
  type: "moment";
}

export interface SynthesisRecord extends BaseRecord, Synthesis {
  type: "synthesis";
}

export type StorageRecord = SourceRecord | MomentRecord | SynthesisRecord; 