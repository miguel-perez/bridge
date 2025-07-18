/**
 * MCP Recall Tool Handler
 * 
 * Implements basic Bridge Recall API for source retrieval.
 * 
 * @module mcp/recall-handler
 */

import { RecallService } from '../services/recall.js';
import { withTimeout, DEFAULT_TIMEOUTS } from '../utils/timeout.js';
import { SearchInput, ToolResultSchema, type ToolResult } from './schemas.js';

export interface RecallResponse {
  success: boolean;
  results?: Array<{
    id: string;
    type: string;
    content: string;
    snippet: string;
    metadata?: {
      created: string;
      perspective?: string;
      experiencer?: string;
      processing?: string;
      experience?: string[];
    };
    relevance_score: number;
    relevance_breakdown: any;
  }>;
  total?: number;
  error?: string;
}

export class RecallHandler {
  private recallService: RecallService;

  constructor() {
    this.recallService = new RecallService();
  }

  /**
   * Handles recall requests
   * 
   * @param args - The recall arguments containing queries and filters
   * @returns Formatted recall results
   */
  async handle(args: SearchInput): Promise<ToolResult> {
    try {
      const result = await this.handleRegularRecall(args);
      ToolResultSchema.parse(result);
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
   * Handle regular recall
   */
  private async handleRegularRecall(
    recall: SearchInput
  ): Promise<ToolResult> {
    try {
      const query = recall.query || '';
      const limit = recall.limit || 10;
      
      // Perform recall
      const { results } = await withTimeout(
        this.recallService.search({
          query,
          limit,
          // If query is provided, also use it for semantic recall
          semantic_query: query,
          semantic_threshold: 0.7
        }),
        DEFAULT_TIMEOUTS.SEARCH,
        'Recall operation'
      );
      
      // Format results with enhanced feedback
      let output = '';
      
      if (query.trim()) {
        output += `🔍 Recall: "${query}"\n`;
        output += `📊 Found ${results.length} experience${results.length === 1 ? '' : 's'}\n\n`;
      } else {
        output += `📚 Recent Experiences (${results.length} total)\n\n`;
      }
      
      if (results.length === 0) {
        output += '❌ No experiences found matching your criteria.\n';
        output += '💡 Try a different recall term or check your filters.\n';
      } else {
        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          const metadata = result.metadata || {};
          const experience = metadata.experience || [];
          
          // Get prominent qualities for display
          const topQualities = experience.slice(0, 3);
          
          // Show source content (truncated for readability)
          const content = result.content || result.snippet || '';
          if (content) {
            const displayContent = content.length > 200 ? 
              content.substring(0, 200) + '...' : content;
            output += `"${displayContent}"\n`;
          }
          
          // Show top qualities if available (simplified)
          if (topQualities.length > 0) {
            output += `Key aspects: ${topQualities.join(', ')}\n`;
          }
          
          // Simplified metadata line
          const timeAgo = this.formatTimeAgo(metadata.created || '');
          output += `From ${timeAgo} • ID: ${result.id}\n`;
          
          if (i < results.length - 1) {
            output += '\n---\n\n';
          }
        }
        
        // Add helpful summary
        if (query.trim()) {
          output += `\n💡 Found ${results.length} experience${results.length === 1 ? '' : 's'} that might help with your question.`;
        }
      }
      
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

  /**
   * Format time ago in human-readable format
   */
  private formatTimeAgo(timestamp: string): string {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 60) {
      return diffMinutes <= 1 ? 'just now' : `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return diffHours === 1 ? '1h ago' : `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return diffDays === 1 ? 'yesterday' : `${diffDays}d ago`;
    } else {
      return time.toLocaleDateString();
    }
  }
}