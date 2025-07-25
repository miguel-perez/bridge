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
import { incrementCallCount, getCallCount } from './call-counter.js';
import { getFlowStateMessages } from './flow-messages.js';

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
   * @param stillThinking - Optional boolean indicating if more tool calls are expected
   * @returns Formatted reconsider result
   */
  async handle(args: ReconsiderInput, stillThinking = false): Promise<ToolResult> {
    try {
      incrementCallCount();
      const result = await this.handleRegularReconsider(args);

      // Add flow state messages if stillThinking was explicitly passed
      const callsSoFar = getCallCount();
      if (args.stillThinking !== undefined) {
        const flowMessages = getFlowStateMessages(stillThinking, callsSoFar);
        // Add each message as a separate content item to ensure a third response
        flowMessages.forEach((message) => {
          result.content.push({
            type: 'text',
            text: message,
          });
        });
      }

      // Add stillThinking and callsSoFar to the result
      const enhancedResult = {
        ...result,
        stillThinking,
        callsSoFar,
      };

      return enhancedResult;
    } catch (err) {
      return {
        isError: true,
        content: [{ type: 'text', text: 'Internal error: Output validation failed.' }],
        stillThinking: false,
        callsSoFar: getCallCount(),
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
      const results: ExperienceResult[] = [];
      for (const item of reconsider.reconsiderations) {
        const result = await this.reconsiderService.enrichSource({
          id: item.id,
          source: item.source,
          perspective: item.perspective,
          experiencer: item.experiencer,
          processing: item.processing,
          crafted: item.crafted,
          experience: item.experience || undefined,
          reflects: item.reflects,
          context: item.context,
        });
        results.push(result);
      }

      // Format response based on number of reconsiderations
      if (results.length === 1) {
        // Single reconsideration - use individual formatting
        const result = results[0];
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
        // Multiple reconsiderations - use batch formatting
        let output = `✅ ${results.length} experiences reconsidered and updated successfully!\n\n`;

        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          const source = result.source;

          output += `--- Experience ${i + 1} ---\n`;
          output += `🔄 Fields updated: content, experience\n`;
          output += `📝 ID: ${source.id}\n\n`;
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
