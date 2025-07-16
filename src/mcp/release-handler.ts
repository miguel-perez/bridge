/**
 * MCP Release Tool Handler
 * 
 * Handles release tool requests for deleting experiential records.
 * Supports both single items and batch operations with optional reasons.
 * 
 * @module mcp/release-handler
 */

import { deleteSource } from '../core/storage.js';

import { ReleaseInput, ToolResultSchema, type ToolResult } from './schemas.js';

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
  async handle(args: ReleaseInput): Promise<ToolResult> {
    try {
      // Support both single-item format and batch format
      const releases = args.releases || [{ id: args.id, reason: args.reason }];
      const results = [];
      
      for (const release of releases) {
        // Validate required id field
        if (!release.id) {
          results.push('Error: ID is required for release operations');
          continue;
        }
        
        // Delete from storage
        await deleteSource(release.id);
        
        // Vector store removed - embeddings are deleted with the source
        
        const content = `🙏 Experience released with gratitude\n\n📝 ID: ${release.id}\n💭 Reason: ${release.reason || 'No reason provided'}\n🕐 Released: ${new Date().toLocaleString()}\n\nThank you for the insights this moment provided. Significance emerges through accumulation and connection rather than through permanent retention.`;
        
        results.push(content);
      }

      const summary = releases.length > 1 ? `🗑️  Released ${releases.length} experiences:\n\n` : '';
      const footer = releases.length > 1 ? '\n\n💡 All records have been permanently removed from your experiential data.' : 
                     '\n\n💡 The record has been permanently removed from your experiential data.';
      
      const result = {
        content: [{ type: 'text' as const, text: summary + results.join('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n') + footer }]
      };

      ToolResultSchema.parse(result);
      return result;
    } catch (error) {
      return {
        isError: true,
        content: [{
          type: 'text',
          text: error instanceof Error ? error.message : 'Unknown error'
        }]
      };
    }
  }
}