/**
 * MCP Release Tool Handler
 *
 * Handles release tool requests for deleting experiential records.
 * Supports both single items and batch operations with optional reasons.
 */

import { deleteSource } from '../core/storage.js';

import { ReleaseInput, ToolResultSchema, type ToolResult } from './schemas.js';
import { incrementCallCount, getCallCount } from './call-counter.js';
import { getFlowStateMessage } from './flow-messages.js';

/**
 * Handles release requests from MCP clients
 * @remarks
 * Provides capability to permanently delete experiential records.
 * Supports both single and batch release operations with optional reasons.
 */
export class ReleaseHandler {
  /**
   * Initializes the ReleaseHandler
   * @remarks
   * No external dependencies required for release operations.
   */
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
   * @param stillThinking - Optional boolean indicating if more tool calls are expected
   * @returns Formatted release confirmation
   */
  async handle(args: ReleaseInput, stillThinking = false): Promise<ToolResult> {
    try {
      incrementCallCount();
      // Validate required fields - only accept array format
      if (!args.releases || args.releases.length === 0) {
        throw new Error('Releases array is required');
      }

      const releases = args.releases;
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
      const footer =
        releases.length > 1
          ? '\n\n💡 All records have been permanently removed from your experiential data.'
          : '\n\n💡 The record has been permanently removed from your experiential data.';

      // Build multi-content response
      const content: Array<{ type: 'text'; text: string }> = [
        {
          type: 'text' as const,
          text: summary + results.join('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n') + footer,
        },
      ];

      // Add contextual guidance
      const guidance = this.selectReleaseGuidance(releases);
      if (guidance) {
        content.push({
          type: 'text' as const,
          text: guidance,
        });
      }

      // Add flow state message if stillThinking was explicitly passed
      const callsSoFar = getCallCount();
      if (args.stillThinking !== undefined) {
        const flowMessage = getFlowStateMessage(stillThinking, callsSoFar);
        content.push({
          type: 'text' as const,
          text: flowMessage,
        });
      }

      const result = {
        content,
        stillThinking,
        callsSoFar,
      };

      ToolResultSchema.parse(result);
      return result;
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: error instanceof Error ? error.message : 'Unknown error',
          },
        ],
        stillThinking: false,
        callsSoFar: getCallCount(),
      };
    }
  }

  /**
   * Select appropriate guidance after release
   */
  private selectReleaseGuidance(releases: Array<{ id?: string; reason?: string }>): string | null {
    // Check if this was a venting release
    const hasVentingReason = releases.some(
      (r) =>
        r.reason?.toLowerCase().includes('vent') || r.reason?.toLowerCase().includes('temporary')
    );

    if (hasVentingReason) {
      return 'Memory space cleared for new experiences';
    }

    // Multiple releases suggest cleanup
    if (releases.length > 3) {
      return 'Focus returns to the present moment';
    }

    return null;
  }
}
