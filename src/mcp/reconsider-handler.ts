/**
 * Streamlined Reconsider Handler for Bridge MCP
 * Handles updates to existing experiences in the new flat structure
 */

import { getAllRecords, saveSource } from '../core/storage.js';
import { saveEmbedding } from '../core/storage.js';
import { embeddingService } from '../services/embeddings.js';
import type { ReconsiderInput, ToolResult } from './schemas.js';
import type { EmbeddingRecord } from '../core/types.js';
import { ToolResultSchema } from './schemas.js';
import { incrementCallCount } from './call-counter.js';

/**
 * Handler for the streamlined reconsider tool
 */
export class ReconsiderHandler {
  /**
   * Processes reconsider requests
   * @param args - Reconsider input data from MCP client
   * @returns Formatted tool result compliant with MCP protocol
   */
  async handle(args: ReconsiderInput): Promise<ToolResult> {
    try {
      incrementCallCount();
      
      // Validate input
      if (!args.reconsiderations || args.reconsiderations.length === 0) {
        throw new Error('Reconsiderations array is required');
      }
      
      const results: string[] = [];
      
      for (const item of args.reconsiderations) {
        if (!item.id) {
          throw new Error('Each reconsideration must have an ID');
        }
        
        // Handle release mode
        if ('release' in item && item.release) {
          const releaseResult = await this.releaseExperience(item.id, item.releaseReason);
          results.push(releaseResult);
          continue;
        }
        
        // Update the experience
        const updateResult = await this.updateExperience(item);
        results.push(updateResult);
      }
      
      // Format response
      const responseText = this.formatResponse(results);
      
      const toolResult: ToolResult = {
        isError: false,
        content: [{
          type: 'text',
          text: responseText
        }]
      };
      
      // Validate output
      ToolResultSchema.parse(toolResult);
      return toolResult;
      
    } catch (error) {
      return {
        isError: true,
        content: [{
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
        }]
      };
    }
  }
  
  /**
   * Release (delete) an experience
   */
  private async releaseExperience(id: string, reason?: string): Promise<string> {
    const { deleteSource } = await import('../core/storage.js');
    
    try {
      await deleteSource(id);
      
      let message = `🙏 Experience released with gratitude\n   ID: ${id}`;
      if (reason) {
        message += `\n   Reason: ${reason}`;
      }
      message += '\n   🌱 Space created for new growth';
      
      return message;
    } catch (error) {
      return `❌ Failed to release experience: ${id}`;
    }
  }
  
  /**
   * Update an existing experience
   */
  private async updateExperience(update: any): Promise<string> {
    // Get the existing record
    const records = await getAllRecords();
    const existing = records.find(r => r.id === update.id);
    
    if (!existing) {
      return `❌ Experience not found: ${update.id}`;
    }
    
    // During migration, we work with Source format
    const updated = { ...existing };
    const changedFields: string[] = [];
    
    // Handle who update
    if (update.who) {
      updated.who = update.who;
      changedFields.push('who');
    }
    
    // Handle source/citation update
    if (update.source) {
      updated.source = update.source;
      changedFields.push('citation');
    }
    
    // Handle quality updates
    if (update.experienceQualities) {
      // Merge qualities
      updated.experienceQualities = {
        ...existing.experienceQualities,
        ...update.experienceQualities
      };
      
      // Track which qualities changed
      const qualityKeys = Object.keys(update.experienceQualities);
      changedFields.push(...qualityKeys.map(k => `quality.${k}`));
      
      // Regenerate embedding if qualities changed
      try {
        await embeddingService.initialize();
        
        // Build embedding text from all qualities
        const qualities = updated.experienceQualities || {};
        const embeddingText = Object.entries(qualities)
          .filter(([_, v]) => v && v !== false)
          .map(([_, v]) => v)
          .join(' ');
          
        if (embeddingText) {
          const embedding = await embeddingService.generateEmbedding(embeddingText);
          
          const embeddingRecord: EmbeddingRecord = {
            sourceId: updated.id,
            vector: embedding,
            generated: new Date().toISOString(),
          };
          
          await saveEmbedding(embeddingRecord);
          changedFields.push('embedding');
        }
      } catch (error) {
        // Continue without embedding
      }
    }
    
    // Save the updated record
    await saveSource(updated);
    
    if (changedFields.length === 0) {
      return `✅ No changes needed for: ${update.id}`;
    }
    
    return `✅ Updated ${update.id}\n   Changed: ${changedFields.join(', ')}`;
  }
  
  /**
   * Format the response for reconsiderations
   */
  private formatResponse(results: string[]): string {
    if (results.length === 1) {
      return results[0];
    }
    
    let output = `Processed ${results.length} reconsiderations:\n\n`;
    results.forEach(result => {
      output += result + '\n';
    });
    
    return output.trim();
  }
}

// Export singleton instance
export const reconsiderHandler = new ReconsiderHandler();