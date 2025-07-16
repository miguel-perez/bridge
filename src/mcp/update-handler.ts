/**
 * MCP Update Tool Handler
 * 
 * Handles update tool requests for correcting or updating existing experiences.
 * Supports partial updates to any field including content, experience analysis, metadata,
 * and can regenerate embeddings when needed.
 * 
 * @module mcp/update-handler
 */

import { EnrichService } from '../services/enrich.js';
import { withTimeout, DEFAULT_TIMEOUTS } from '../utils/timeout.js';

import { UpdateInput, ToolResultSchema, type ToolResult } from './schemas.js';

export class UpdateHandler {
  private updateService: EnrichService; // Keeping enrich service but calling it update

  constructor() {
    this.updateService = new EnrichService();
  }

  /**
   * Handles update tool requests - supports both single items and batch operations
   * 
   * Updates existing source records with corrected fields and shows what was changed,
   * including content, narrative, experience qualities, and embedding regeneration.
   * 
   * @param args - The update arguments containing the correction data
   * @returns Formatted update result
   */
  async handle(args: UpdateInput): Promise<ToolResult> {
    try {
      // Support both old single-item format and new batch format
      const updates = args.updates || [args];
      const results = [];
      
      for (const update of updates) {
        // Validate required id field
        if (!update.id) {
          results.push('Error: ID is required for update operations');
          continue;
        }
        
        // Map the tool input to the service input format
        const updateInput = {
          id: update.id,
          content: update.source,
          perspective: update.perspective,
          processing: update.processing,
          experiencer: update.experiencer,
          crafted: update.crafted,
          experience: update.experience,
          regenerate_embeddings: (update as any).regenerate_embeddings
        };
        
        const result = await withTimeout(
          this.updateService.enrichSource(updateInput),
          DEFAULT_TIMEOUTS.UPDATE,
          'Update operation'
        );
        
        // Enhanced feedback for update operations
        let content = `✅ Experience updated successfully!\n\n`;
        
        const experience = result.source.experience;
        if (experience?.emoji) {
          content += `${experience.emoji} ${experience.narrative || ''}\n\n`;
        }
        
        // Show what was updated
        if (result.updatedFields.length > 0) {
          content += `🔄 Fields updated: ${result.updatedFields.join(', ')}\n`;
        } else {
          content += `ℹ️  No changes were needed\n`;
        }

        if (result.embeddingsRegenerated) {
          content += `🔄 Embeddings regenerated\n`;
        }

        // Show metadata
        content += `📝 ID: ${result.source.id}\n`;
        content += `👤 Experiencer: ${result.source.experiencer || 'Unknown'}\n`;
        content += `👁️  Perspective: ${result.source.perspective || 'I'}\n`;
        content += `⏰ Processing: ${result.source.processing || 'during'}\n`;
        content += `🕐 Updated: ${new Date().toLocaleString()}\n`;

        // Show updated content if content was changed
        if (result.updatedFields.includes('content') && result.source.source) {
          const truncatedSource = result.source.source.length > 200 ? 
            result.source.source.substring(0, 200) + '...' : result.source.source;
          content += `\n📄 Updated Source: ${truncatedSource}`;
        }

        // Show updated qualities if qualities were changed
        if (result.updatedFields.includes('experience') && experience?.qualities) {
          const topQualities = experience.qualities
            .sort((a: any, b: any) => b.prominence - a.prominence)
            .slice(0, 3)
            .map((q: any) => `${q.type}: ${Math.round(q.prominence * 100)}%`)
            .join(', ');
          content += `\n✨ Updated Qualities: ${topQualities}`;
        }
        
        results.push(content);
      }

      const summary = updates.length > 1 ? `Updated ${updates.length} experiences:\n\n` : '';
      const finalResult = {
        content: [{ type: 'text' as const, text: summary + results.join('\n\n---\n\n') }]
      };
      
      ToolResultSchema.parse(finalResult);
      return finalResult;
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