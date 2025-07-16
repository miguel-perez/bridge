/**
 * MCP Search Tool Handler
 * 
 * Implements basic Bridge Search API for source retrieval.
 * 
 * @module mcp/search-handler
 */

import { SearchService } from '../services/search.js';
import { withTimeout, DEFAULT_TIMEOUTS } from '../utils/timeout.js';
import { SearchInput, ToolResultSchema, type ToolResult } from './schemas.js';

export interface SearchResponse {
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
      experience?: {
        qualities: Array<{ type: string; prominence: number; manifestation: string }>;
        emoji: string;
        narrative: string;
      };
    };
    relevance_score: number;
    relevance_breakdown: any;
  }>;
  total?: number;
  error?: string;
}

export class SearchHandler {
  private searchService: SearchService;

  constructor() {
    this.searchService = new SearchService();
  }

  /**
   * Handles search requests
   * 
   * @param args - The search arguments containing queries and filters
   * @returns Formatted search results
   */
  async handle(args: SearchInput): Promise<ToolResult> {
    try {
      const result = await this.handleRegularSearch(args);
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
   * Handle regular search
   */
  private async handleRegularSearch(
    search: SearchInput
  ): Promise<ToolResult> {
    try {
      const query = search.query || '';
      const limit = search.limit || 10;
      
      // Perform search
      const { results } = await withTimeout(
        this.searchService.search({
          query,
          limit,
          // If query is provided, also use it for semantic search
          semantic_query: query,
          semantic_threshold: 0.7
        }),
        DEFAULT_TIMEOUTS.SEARCH,
        'Search operation'
      );
      
      // Format results with enhanced feedback
      let output = '';
      
      if (query.trim()) {
        output += `🔍 Search: "${query}"\n`;
        output += `📊 Found ${results.length} experience${results.length === 1 ? '' : 's'}\n\n`;
      } else {
        output += `📚 Recent Experiences (${results.length} total)\n\n`;
      }
      
      if (results.length === 0) {
        output += '❌ No experiences found matching your criteria.\n';
        output += '💡 Try a different search term or check your filters.\n';
      } else {
        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          const metadata = result.metadata || {};
          const experience = metadata.experience || {};
          
          // Get top qualities for display (sorted by prominence)
          const qualities = experience.qualities || [];
          const topQualities = qualities
            .sort((a: any, b: any) => b.prominence - a.prominence)
            .slice(0, 3)
            .map((q: any) => `${q.type}: ${Math.round(q.prominence * 100)}%`);
          
          // Format with emoji and narrative  
          const emoji = experience.emoji || '📝';
          const narrative = experience.narrative || '';
          
          // Main content - show narrative prominently
          if (narrative) {
            output += `${emoji} ${narrative}\n\n`;
          }
          
          // Show source content if different from narrative (truncated for readability)
          const content = result.content || result.snippet || '';
          if (content && content !== narrative) {
            const displayContent = content.length > 250 ? 
              content.substring(0, 250) + '...' : content;
            output += `📄 ${displayContent}\n\n`;
          }
          
          // Show top qualities if available
          if (topQualities.length > 0) {
            output += `✨ Qualities: ${topQualities.join(', ')}\n`;
          }
          
          // Metadata line - clean and informative
          const timeAgo = this.formatTimeAgo(metadata.created || '');
          const experiencer = metadata.experiencer || 'Unknown';
          const perspective = metadata.perspective || 'I';
          const processing = metadata.processing || 'during';
          
          output += `📝 ${result.id} • 👤 ${experiencer} • 👁️ ${perspective} • ⏰ ${processing} • 🕐 ${timeAgo}\n`;
          
          if (i < results.length - 1) {
            output += '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
          }
        }
        
        // Add helpful summary
        if (query.trim()) {
          output += `\n💡 Found ${results.length} experience${results.length === 1 ? '' : 's'} matching "${query}". Use the ID to update or release experiences.`;
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