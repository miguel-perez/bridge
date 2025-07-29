/**
 * Streamlined Experience Handler for Bridge MCP
 * Handles the new flat Experience structure
 */

import { experienceService } from '../services/experience.js';
import { recall } from '../services/search.js';
import type { ExperienceInput, ToolResult } from './schemas.js';
import { ToolResultSchema } from './schemas.js';
import { incrementCallCount } from './call-counter.js';

/**
 * Handler for the streamlined experience tool
 */
export class ExperienceHandler {
  /**
   * Processes experience capture requests
   * @param args - Experience input data from MCP client
   * @returns Formatted tool result compliant with MCP protocol
   */
  async handle(args: ExperienceInput): Promise<ToolResult> {
    try {
      incrementCallCount();
      
      let recallText = '';
      
      // Handle recall if requested
      if (args.recall) {
        try {
          const { query, limit = 25 } = args.recall;
          const pastExperiences = await recall(query, limit);
          
          if (pastExperiences.length > 0) {
            recallText = this.formatRecallResults(pastExperiences, query);
          } else {
            recallText = `\n🔍 No past experiences found for: "${query}"\n`;
          }
        } catch (error) {
          // Don't fail the whole operation if recall fails
          recallText = '\n⚠️ Recall unavailable at the moment\n';
        }
      }
      
      // Process new experiences
      const results = [];
      for (const exp of args.experiences) {
        const result = await experienceService.captureExperience(exp);
        results.push(result);
      }
      
      // Format response
      const responseText = this.formatResponse(results, recallText);
      
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
   * Format recall results for display
   */
  private formatRecallResults(experiences: any[], query: string): string {
    let output = `\n🔍 Found ${experiences.length} past experiences for: "${query}"\n\n`;
    
    experiences.slice(0, 5).forEach((exp, i) => {
      // Build a brief summary from qualities
      const summary = this.buildExperienceSummary(exp);
      output += `${i + 1}. ${exp.anchor} ${summary}\n`;
      output += `   Who: ${exp.who.join(', ')} | ${this.formatTimeAgo(exp.created)}\n`;
      if (exp.citation) {
        output += `   "${exp.citation}"\n`;
      }
      output += '\n';
    });
    
    if (experiences.length > 5) {
      output += `... and ${experiences.length - 5} more\n\n`;
    }
    
    return output;
  }
  
  /**
   * Build a brief summary from experience qualities
   */
  private buildExperienceSummary(exp: any): string {
    // Pick most informative qualities for summary
    const parts = [];
    
    if (exp.mood) {
      parts.push(exp.mood);
    }
    if (exp.purpose) {
      parts.push(`| ${exp.purpose}`);
    }
    if (exp.space && exp.space !== exp.time) {
      parts.push(`| ${exp.space}`);
    }
    
    return parts.join(' ');
  }
  
  /**
   * Format timestamp as relative time
   */
  private formatTimeAgo(timestamp: string): string {
    const now = new Date();
    const then = new Date(timestamp);
    const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return then.toLocaleDateString();
  }
  
  /**
   * Format the response for captured experiences
   */
  private formatResponse(results: any[], recallText: string): string {
    let output = '';
    
    // Add recall results if any
    if (recallText) {
      output += recallText;
    }
    
    // Format captured experiences
    if (results.length === 1) {
      const result = results[0];
      const exp = result.experience;
      
      output += `${exp.anchor} Experience Captured\n\n`;
      output += `Who: ${exp.who.join(', ')}\n`;
      
      // Show a few key qualities
      output += `\nQualities:\n`;
      output += `• ${exp.embodied}\n`;
      output += `• ${exp.mood}\n`;
      output += `• ${exp.purpose}\n`;
      
      if (exp.citation) {
        output += `\nCitation: "${exp.citation}"\n`;
      }
      
      if (result.embedding) {
        output += '\n✓ Embedding generated for semantic search\n';
      }
    } else {
      // Multiple experiences
      output += `✅ Captured ${results.length} experiences:\n\n`;
      
      results.forEach((result, i) => {
        const exp = result.experience;
        output += `${i + 1}. ${exp.anchor} ${exp.who.join(', ')}: `;
        output += `${this.buildExperienceSummary(exp)}\n`;
      });
      
      const withEmbeddings = results.filter(r => r.embedding).length;
      if (withEmbeddings > 0) {
        output += `\n✓ ${withEmbeddings} embeddings generated\n`;
      }
    }
    
    return output;
  }
}

// Export singleton instance
export const experienceHandler = new ExperienceHandler();