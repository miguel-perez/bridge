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

export class ReleaseService {
  async releaseSource(input: ReleaseInput): Promise<ReleaseResult> {
    // Check if it's a source
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
    
    throw new Error(`No source found with ID: ${input.id}`);
  }
} 