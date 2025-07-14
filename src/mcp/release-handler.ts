/**
 * MCP Release Tool Handler
 * 
 * Handles release tool requests for deleting experiential records.
 * Supports both single items and batch operations with optional reasons.
 * 
 * @module mcp/release-handler
 */

import { ReleaseService } from '../services/release.js';

export class ReleaseHandler {
  private releaseService: ReleaseService;

  constructor() {
    this.releaseService = new ReleaseService();
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
    // Support both old single-item format and new batch format
    const releases = args.releases || [{ source_id: args.source_id, reason: args.reason }];
    const results = [];
    
    for (const release of releases) {
      await this.releaseService.releaseSource({ id: release.source_id });
      
      const content = `✓ Released experience
ID: ${release.source_id}
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