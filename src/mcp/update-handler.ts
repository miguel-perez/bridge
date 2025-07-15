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
import { formatContent, formatExperience } from './handler-utils.js';
import { patternManager } from '../services/pattern-manager.js';

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
  async handle(args: any): Promise<{ content: Array<{ type: string; text: string }> }> {
    // Support both old single-item format and new batch format
    const updates = args.updates || [args];
    const results = [];
    
    for (const update of updates) {
      // Map the tool input to the service input format
      const updateInput = {
        id: update.source_id,
        content: update.content,
        contentType: update.contentType,
        perspective: update.perspective,
        processing: update.processing,
        occurred: update.occurred,
        experiencer: update.experiencer,
        crafted: update.crafted,
        experience: update.experience,
        regenerate_embeddings: update.regenerate_embeddings
      };
      
      const result = await withTimeout(
        this.updateService.enrichSource(updateInput),
        DEFAULT_TIMEOUTS.UPDATE,
        'Update operation'
      );
      
      let content = `✓ Updated experience ${result.source.id}`;
      
      if (result.updatedFields.length > 0) {
        content += `\nCorrected fields: ${result.updatedFields.join(', ')}`;
      } else {
        content += '\nNo fields needed correction';
      }

      if (result.embeddingsRegenerated) {
        content += '\nEmbeddings were regenerated';
      }

      // Show updated content if content was changed
      if (result.updatedFields.includes('content')) {
        content += `\n\nCorrected Content:\n${formatContent(result.source.content)}`;
      }

      // Show updated narrative if narrative was changed
      if (result.updatedFields.includes('experience') && result.source.experience?.narrative) {
        content += `\n\nCorrected Narrative:\n${formatContent(result.source.content, result.source.experience.narrative)}`;
      }

      // Show updated qualities if qualities were changed
      if (result.updatedFields.includes('experience')) {
        content += `\n\nCorrected Experience:\n${formatExperience(result.source.experience)}`;
      }
      
      // Trigger pattern discovery update
      try {
        await patternManager.onUpdate(result.source.id);
      } catch (error) {
        // Don't fail update if pattern update fails
      }
      
      results.push(content);
    }

    const summary = updates.length > 1 ? `Updated ${updates.length} experiences:\n\n` : '';
    
    return {
      content: [{ type: 'text', text: summary + results.join('\n\n---\n\n') }]
    };
  }
}