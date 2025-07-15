/**
 * MCP Search Tool Handler
 * 
 * Implements basic Bridge Search API for source retrieval.
 * 
 * @module mcp/search-handler
 */

import { SearchService, type SearchInput } from '../services/search.js';
import { withTimeout, DEFAULT_TIMEOUTS } from '../utils/timeout.js';

export interface SearchRequestParams {
  query?: string;
  limit?: number;
  offset?: number;
  experiencer?: string;
  perspective?: string;
  processing?: string;
  created?: string | { start: string; end: string };
  sort?: 'relevance' | 'created';
}

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
  async handle(args: any): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      // Handle null/undefined args for empty search
      if (!args || Object.keys(args).length === 0) {
        args = { searches: [{ query: '' }] };
      }
      
      // Support both old single-query format and new batch format
      const searches = args.searches || [args];
      
      // Handle regular searches
      const allResults = [];
      
      for (let i = 0; i < searches.length; i++) {
        const search = searches[i];
        
        // Ensure query property exists
        if (search && typeof search === 'object' && !('query' in search)) {
          search.query = '';
        }
        
        // Handle regular search
        const result = await this.handleRegularSearch(search);
        allResults.push(...result.content);
        
        // Add separator between searches if there are multiple
        if (i < searches.length - 1) {
          allResults.push({ type: 'text', text: '\n---\n\n' });
        }
      }
      
      return { content: allResults };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [{
          type: 'text',
          text: `Error in search: ${errorMessage}`
        }]
      };
    }
  }

  /**
   * Handle regular search
   */
  private async handleRegularSearch(
    search: any
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    const query = search.query || '';
    const limit = search.limit || search.examples || 10;
    
    // Perform search
    const { results } = await withTimeout(
      this.searchService.search({
        query,
        limit
      } as SearchInput),
      DEFAULT_TIMEOUTS.SEARCH,
      'Search operation'
    );
    
    // Format results
    let output = '';
    
    if (query.trim()) {
      output += `🔍 "${query}"\n`;
      output += `Found ${results.length} experience${results.length === 1 ? '' : 's'}\n\n`;
    } else {
      output += `📚 ${results.length} Recent Experience${results.length === 1 ? '' : 's'}\n\n`;
    }
    
    if (results.length === 0) {
      output += 'No results found.\n';
    } else {
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const metadata = result.metadata || {};
        const experience = metadata.experience || {};
        
        // Get qualities for display
        const qualities = experience.qualities || [];
        const topQualities = qualities
          .filter((q: any) => q.prominence >= 70)
          .sort((a: any, b: any) => b.prominence - a.prominence)
          .slice(0, 2)
          .map((q: any) => `${q.type}: ${q.prominence}%`);
        
        // Format with emoji and narrative  
        const emoji = experience.emoji || '📝';
        const narrative = experience.narrative || '';
        
        // Main content - show narrative and content beautifully
        if (narrative) {
          output += `${emoji} ${narrative}\n\n`;
        }
        
        // Content (avoid duplication with narrative)
        const content = result.content || result.snippet || '';
        if (content && content !== narrative) {
          // Smart truncate if content is very long
          const displayContent = content.length > 300 ? content.substring(0, 300) + '...' : content;
          output += `${displayContent}\n\n`;
        }
        
        // Show top qualities if available
        if (topQualities.length > 0) {
          output += `✨ Qualities: ${topQualities.join(', ')}\n`;
        }
        
        // Metadata line - more compact and readable
        const timeAgo = this.formatTimeAgo(metadata.created || '');
        const experiencer = metadata.experiencer || 'Unknown';
        const perspective = metadata.perspective || 'I';
        const processing = metadata.processing || 'during';
        
        output += `${result.id} • ${experiencer} • ${perspective} • ${processing} • ${timeAgo}\n`;
        
        if (i < results.length - 1) {
          output += '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
        }
      }
    }
    
    return {
      content: [{
        type: 'text',
        text: output
      }]
    };
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