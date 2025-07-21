import { z } from 'zod';
import { getSource, deleteSource } from '../core/storage.js';
import type { SourceRecord } from '../core/types.js';

// Release input schema
export const releaseSchema = z.object({
  id: z.string(),
});

export interface ReleaseInput {
  id: string;
}

export interface ReleaseResult {
  success: boolean;
  message: string;
  releasedSource?: SourceRecord;
}

/**
 * Service for releasing (deleting) experiential records
 * @remarks
 * Provides capability to permanently remove experiences from storage.
 * Handles both source and embedding cleanup.
 */
export class ReleaseService {
  /**
   * Releases (deletes) a source record by ID
   * @remarks
   * Permanently removes the experience from storage and returns confirmation.
   * @param input - Release input containing the source ID
   * @returns Release result with success status and confirmation message
   * @throws Error When source is not found
   */
  async releaseSource(input: ReleaseInput): Promise<ReleaseResult> {
    // Check if it's a source
    const source = await getSource(input.id);
    if (source) {
      // Delete the source
      await deleteSource(input.id);
      return {
        success: true,
        message: `✓ Released source: "${source.source.substring(0, 50)}..." (ID: ${input.id})\n\n🌊 The experience has been released`,
        releasedSource: { ...source, type: 'source' }
      };
    }
    
    throw new Error(`No source found with ID: ${input.id}`);
  }
} 