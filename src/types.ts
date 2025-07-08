// Core types for the Bridge system

export type Perspective = "I" | "we" | "you" | "they" | string;
export type ProcessingLevel = "during" | "right-after" | "long-after" | "crafted";
export type ContentType = "text" | "voice" | "image" | "link" | string;

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
  reflects_on?: string[]; // IDs of sources this record reflects on
  
  // File reference (for non-text content)
  file?: string; // Path to file, validated against MCP roots
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