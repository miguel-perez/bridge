/**
 * MCP Reconsider Tool Handler
 *
 * Handles reconsider tool requests for correcting or updating existing experiences.
 * Supports partial updates to any field including content, experience analysis, metadata,
 * and experiential qualities. Useful for refining how we remember shared moments.
 */

import { EnrichService } from '../services/enrich.js';
import { ReconsiderInput, type ToolResult } from './schemas.js';
import { formatReconsiderResponse, type ExperienceResult } from '../utils/formatters.js';
import { incrementCallCount } from './call-counter.js';

/**
 * Handles reconsider requests from MCP clients
 * @remarks
 * Provides capability to update and refine existing experiences.
 * Supports both single and batch reconsideration operations.
 */
export class ReconsiderHandler {
  private reconsiderService: EnrichService; // Keeping enrich service but calling it reconsider

  /**
   * Initializes the ReconsiderHandler with required services
   * @remarks
   * Creates instance of EnrichService for experience update capabilities.
   */
  constructor() {
    this.reconsiderService = new EnrichService();
  }

  /**
   * Handles reconsider requests
   *
   * @param args - The reconsider arguments containing updates to existing experiences
   * @returns Formatted reconsider result
   */
  async handle(args: ReconsiderInput): Promise<ToolResult> {
    try {
      incrementCallCount();
      const result = await this.handleRegularReconsider(args);
      return result;
    } catch (err) {
      return {
        isError: true,
        content: [{ type: 'text', text: 'Internal error: Output validation failed.' }],
      };
    }
  }

  /**
   * Processes reconsider requests for updating existing experiences
   * @remarks
   * Handles reconsideration operations using array format only.
   * Validates required fields and processes updates through EnrichService.
   * @param reconsider - Reconsider input containing ID and update data
   * @returns Formatted reconsider results with update confirmation
   */
  private async handleRegularReconsider(reconsider: ReconsiderInput): Promise<ToolResult> {
    try {
      // Validate required fields - only accept array format
      if (!reconsider.reconsiderations || reconsider.reconsiderations.length === 0) {
        throw new Error('Reconsiderations array is required');
      }

      // Validate each item in the array
      for (const item of reconsider.reconsiderations) {
        if (!item.id) {
          throw new Error('Each reconsideration item must have an ID');
        }
      }

      // Process reconsideration items
      const updateResults: ExperienceResult[] = [];
      const releaseResults: { id: string; reason?: string }[] = [];

      for (const item of reconsider.reconsiderations) {
        if (item.release) {
          // Handle release mode
          const { deleteSource } = await import('../core/storage.js');
          await deleteSource(item.id);
          releaseResults.push({ id: item.id, reason: item.releaseReason });
        } else {
          // Handle update mode
          // Convert experience to array format if needed
          let experienceArray: string[] | undefined;
          if (item.experience) {
            const { qualitiesToExperienceArray } = await import('../core/types.js');
            experienceArray = qualitiesToExperienceArray(item.experience);
          }

          const result = await this.reconsiderService.enrichSource({
            id: item.id,
            source: item.source,
            perspective: item.perspective,
            who: item.who,
            processing: item.processing,
            crafted: item.crafted,
            experience: experienceArray,
            reflects: item.reflects,
            context: item.context,
          });
          updateResults.push(result);
        }
      }

      // Format response based on operations performed
      const totalOperations = updateResults.length + releaseResults.length;

      if (totalOperations === 1) {
        // Single operation
        if (updateResults.length === 1) {
          // Single update
          const result = updateResults[0];
          const response = formatReconsiderResponse(result);

          // Build multi-content response
          const content: Array<{ type: 'text'; text: string }> = [
            {
              type: 'text',
              text: response,
            },
          ];

          // Add guidance for next steps
          const guidance = this.selectReconsiderGuidance(result);
          if (guidance) {
            content.push({
              type: 'text',
              text: guidance,
            });
          }

          return { content };
        } else {
          // Single release
          const release = releaseResults[0];
          const content = `🙏 Experience released with gratitude\n\n📝 ID: ${release.id}\n💭 Reason: ${release.reason || 'No reason provided'}\n🕐 Released: ${new Date().toLocaleString()}\n\nThank you for the insights this moment provided.`;

          return {
            content: [
              {
                type: 'text',
                text: content,
              },
            ],
          };
        }
      } else {
        // Multiple operations - batch formatting
        let output = '';

        if (updateResults.length > 0) {
          output += `✅ ${updateResults.length} experiences updated successfully!\n\n`;
          for (let i = 0; i < updateResults.length; i++) {
            const result = updateResults[i];
            output += `📝 Updated: ${result.source.id}\n`;
          }
        }

        if (releaseResults.length > 0) {
          if (output) output += '\n';
          output += `🙏 ${releaseResults.length} experiences released with gratitude\n\n`;
          for (const release of releaseResults) {
            output += `📝 Released: ${release.id}${release.reason ? ` (${release.reason})` : ''}\n`;
          }
        }

        return {
          content: [
            {
              type: 'text',
              text: output,
            },
          ],
        };
      }
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: error instanceof Error ? error.message : 'Unknown error',
          },
        ],
      };
    }
  }

  /**
   * Select appropriate guidance after reconsideration
   */
  private selectReconsiderGuidance(result: ExperienceResult): string | null {
    // Check what was updated
    const hasQualityUpdate = result.source.experience && result.source.experience.length > 0;

    if (hasQualityUpdate) {
      return 'Updated. See connections with recall';
    }

    return null;
  }
}
