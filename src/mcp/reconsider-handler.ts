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
      const result = await this.handleRegularReconsider(args);
      return result;
    } catch (err) {
      return {
        isError: true,
        content: [
          { type: 'text', text: 'Internal error: Output validation failed.' }
        ]
      };
    }
  }

  /**
   * Processes reconsider requests for updating existing experiences
   * @remarks
   * Handles both single and batch reconsideration operations.
   * Validates required fields and processes updates through EnrichService.
   * @param reconsider - Reconsider input containing ID and update data
   * @returns Formatted reconsider results with update confirmation
   */
  private async handleRegularReconsider(
    reconsider: ReconsiderInput
  ): Promise<ToolResult> {
    try {
      // Validate required fields - handle both single and batch reconsiderations
      if (reconsider.reconsiderations && reconsider.reconsiderations.length > 0) {
        // Batch reconsider - validate each item in the array
        for (const item of reconsider.reconsiderations) {
          if (!item.id) {
            throw new Error('Each reconsideration item must have an ID');
          }
        }
      } else if (!reconsider.id) {
        // Single reconsider - validate the main fields
        throw new Error('ID is required for reconsideration');
      }

      // Handle batch reconsiderations or single reconsideration
      if (reconsider.reconsiderations && reconsider.reconsiderations.length > 0) {
        // Batch reconsider - process each item
        const results: ExperienceResult[] = [];
        for (const item of reconsider.reconsiderations) {
          const result = await this.reconsiderService.enrichSource({
            id: item.id,
            source: item.source,
            perspective: item.perspective,
            experiencer: item.experiencer,
            processing: item.processing,
            crafted: item.crafted,
            experience: item.experience || undefined
          });
          results.push(result);
        }
        
        // Format batch response
        let output = `✅ ${results.length} experiences reconsidered and updated successfully!\n\n`;
        
        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          const source = result.source;
          
          output += `--- Experience ${i + 1} ---\n`;
          output += `🔄 Fields updated: content, experience\n`;
          output += `📝 ID: ${source.id}\n\n`;
        }
        
        return {
          content: [{
            type: 'text',
            text: output
          }]
        };
        
      } else {
        // Single reconsideration
        const result = await this.reconsiderService.enrichSource({
          id: reconsider.id!,
          source: reconsider.source,
          perspective: reconsider.perspective,
          experiencer: reconsider.experiencer,
          processing: reconsider.processing,
          crafted: reconsider.crafted,
          experience: reconsider.experience || undefined
        });

        // Format response using conversational formatter
        const response = formatReconsiderResponse(result);

        // Build multi-content response
        const content: Array<{ type: 'text', text: string }> = [{
          type: 'text',
          text: response
        }];
        
        // Add guidance for next steps
        const guidance = this.selectReconsiderGuidance(result);
        if (guidance) {
          content.push({
            type: 'text',
            text: guidance
          });
        }

        return { content };
      }
      
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
  
  /**
   * Select appropriate guidance after reconsideration
   */
  private selectReconsiderGuidance(result: ExperienceResult): string | null {
    // Check what was updated
    const hasQualityUpdate = result.source.experience && result.source.experience.length > 0;
    
    if (hasQualityUpdate) {
      return "Updated. See connections with recall";
    }
    
    return null;
  }
}