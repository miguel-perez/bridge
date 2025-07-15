/**
 * MCP Release Tool Handler
 * 
 * Handles release tool requests for deleting experiential records.
 * Supports both single items and batch operations with optional reasons.
 * 
 * @module mcp/release-handler
 */

import { bridgeLogger } from '../utils/bridge-logger.js';
import { deleteSource } from '../core/storage.js';
import { VectorStore } from '../services/vector-store.js';

export class ReleaseHandler {
  constructor() {
    // No dependencies needed
  }

  /**
   * Handles release tool requests - supports both single items and batch operations
   * 
   * Deletes one or more source records by ID and returns confirmation messages
   * with optional reasons for each release.
   * 
   * @param args - The release arguments containing the IDs and reasons
   * @returns Formatted release confirmation
   */
  async handle(args: any): Promise<{ content: Array<{ type: string; text: string }> }> {
    // Support both single-item format and batch format
    const releases = args.releases || [{ id: args.id, reason: args.reason }];
    const results = [];
    
    for (const release of releases) {
      // Delete from storage
      await deleteSource(release.id);
      
      // Remove from vector store
      try {
        const vectorStore = new VectorStore();
        await vectorStore.initialize();
        await vectorStore.removeVector(release.id);
        await vectorStore.saveToDisk();
      } catch (error) {
        // Don't fail release if vector store update fails
        bridgeLogger.warn('Vector store update failed:', error);
      }
      
      const content = `✓ Released experience
ID: ${release.id}
Reason: ${release.reason || 'No reason provided'}`;
      
      results.push(content);
    }

    const summary = releases.length > 1 ? `Released ${releases.length} experiences:\n\n` : '';
    const footer = releases.length > 1 ? '\n\nAll records have been permanently deleted from your experiential data.' : 
                   '\n\nThe record has been permanently deleted from your experiential data.';
    
    return {
      content: [{ type: 'text', text: summary + results.join('\n\n') + footer }]
    };
  }
}