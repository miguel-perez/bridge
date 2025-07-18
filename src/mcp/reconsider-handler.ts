/**
 * MCP Reconsider Tool Handler
 * 
 * Handles reconsider tool requests for correcting or updating existing experiences.
 * Supports partial updates to any field including content, experience analysis, metadata,
 * and experiential qualities. Useful for refining how we remember shared moments.
 * 
 * @module mcp/reconsider-handler
 */

import { EnrichService } from '../services/enrich.js';
import { withTimeout, DEFAULT_TIMEOUTS } from '../utils/timeout.js';
import { ReconsiderInput, type ToolResult } from './schemas.js';

export class ReconsiderHandler {
  private reconsiderService: EnrichService; // Keeping enrich service but calling it reconsider

  constructor() {
    this.reconsiderService = new EnrichService();
  }

  /**
   * Handles reconsider tool requests - supports both single items and batch operations
   * 
   * Updates existing source records with corrected fields and shows what was changed,
   * including regenerating embeddings if content was modified.
   * 
   * @param args - The reconsider arguments containing the correction data
   * @returns Formatted reconsider result
   */
  async handle(args: ReconsiderInput): Promise<ToolResult> {
    try {
      const reconsiderations = args.reconsiderations || [args];
      const results = [];

      for (const reconsideration of reconsiderations) {
        if (!reconsideration.id) {
          results.push('Error: ID is required for reconsider operations');
          continue;
        }

        const reconsiderInput = {
          id: reconsideration.id,
          content: reconsideration.source,
          perspective: reconsideration.perspective,
          processing: reconsideration.processing,
          experiencer: reconsideration.experiencer,
          crafted: reconsideration.crafted,
          experience: reconsideration.experience,
          regenerate_embeddings: (reconsideration as any).regenerate_embeddings
        };

        const result = await withTimeout(
          this.reconsiderService.enrichSource(reconsiderInput),
          DEFAULT_TIMEOUTS.UPDATE,
          'Reconsider operation'
        );

        // Enhanced feedback for reconsider operations
        let content = `✅ Experience reconsidered and updated successfully!\n\n`;
        
        // Show what was updated
        if (result.updatedFields.length > 0) {
          content += `🔄 Fields updated: ${result.updatedFields.join(', ')}\n`;
        }
        
        // Show metadata
        content += `📝 ID: ${result.source.id}\n`;
        if (result.source.experiencer) {
          content += `👤 Experiencer: ${result.source.experiencer}\n`;
        }
        if (result.source.perspective) {
          content += `👁️  Perspective: ${result.source.perspective}\n`;
        }
        if (result.source.processing) {
          content += `⏰ Processing: ${result.source.processing}\n`;
        }
        content += `🕐 Updated: ${new Date().toLocaleString()}\n`;
        
        // Show updated content if content was changed
        if (result.updatedFields.includes('content') && result.source.source) {
          const truncatedSource = result.source.source.length > 200 ? 
            result.source.source.substring(0, 200) + '...' : result.source.source;
          content += `\n📄 Updated Source: ${truncatedSource}`;
        }
        
        // Show updated experience qualities if they were changed
        if (result.updatedFields.includes('experience') && result.source.experience && result.source.experience.length > 0) {
          content += `\n✨ Updated Qualities: ${result.source.experience.join(', ')}`;
        }
        
        // Show embedding regeneration if it happened
        if (result.updatedFields.includes('embeddings')) {
          content += `\n🔄 Embeddings regenerated`;
        }
        
        results.push(content);
      }

      // Return batch result or single result
      const output = results.length === 1 ? results[0] : results.join('\n\n---\n\n');
      
      return {
        content: [{
          type: 'text',
          text: output
        }]
      };
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