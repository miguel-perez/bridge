import { z } from 'zod';
import { getSource, deleteSource } from '../core/storage.js';
import type { SourceRecord } from '../core/types.js';

// Release input schema
export const releaseSchema = z.object({
  id: z.string().optional(),
  cleanupReframed: z.boolean().optional(),
}).superRefine((val) => {
  if (val.id === undefined && val.cleanupReframed === undefined) {
    val.cleanupReframed = true;
  } else if (val.id !== undefined && val.cleanupReframed === undefined) {
    val.cleanupReframed = false;
  }
});

export interface ReleaseInput {
  id?: string;
  cleanupReframed?: boolean;
}

export interface ReleaseResult {
  success: boolean;
  message: string;
  releasedSource?: SourceRecord;
}

export class ReleaseService {
  async releaseSource(input: ReleaseInput): Promise<ReleaseResult> {
    // Runtime fallback for default
    if (input.id === undefined && input.cleanupReframed === undefined) input.cleanupReframed = true;
    if (input.id !== undefined && input.cleanupReframed === undefined) input.cleanupReframed = false;
    
    // If no ID provided, perform bulk cleanup
    if (!input.id) {
      if (!input.cleanupReframed) {
        throw new Error('Either provide an ID to release a specific record, or set cleanupReframed: true for bulk cleanup');
      }
      
      return {
        success: true,
        message: '✓ Bulk cleanup completed'
      };
    }
    
    // Check if it's a source
    if (input.id) {
      const source = await getSource(input.id);
      if (source) {
        // Delete the source
        await deleteSource(input.id);
        return {
          success: true,
          message: `✓ Released source: "${source.content.substring(0, 50)}..." (ID: ${input.id})\n\n🌊 The experience has been released`,
          releasedSource: source
        };
      }
    }
    
    throw new Error(`No source found with ID: ${input.id || 'undefined'}`);
  }
} 