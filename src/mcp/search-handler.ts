/**
 * MCP Search Tool Handler
 * 
 * Handles search tool requests for finding and exploring captured experiences.
 * Supports multiple queries with filtering by experiencer, perspective, processing level, and date ranges.
 * 
 * @module mcp/search-handler
 */

import { SearchService, type SearchInput, type SearchServiceResult } from '../services/search.js';
import { withTimeout, DEFAULT_TIMEOUTS } from '../utils/timeout.js';
import { formatMetadata, formatContent, formatRelevanceBreakdown, RELEVANCE_PERCENT_PRECISION } from './handler-utils.js';
import type { SourceRecord } from '../core/types.js';

export class SearchHandler {
  private searchService: SearchService;

  constructor() {
    this.searchService = new SearchService();
  }

  /**
   * Handles search tool requests - supports both single queries and batch operations
   * 
   * Performs multi-modal searches across all records with relevance scoring,
   * breakdowns, and formatted results including content snippets, metadata, and filtering.
   * 
   * @param args - The search arguments containing queries and filters
   * @returns Formatted search results
   */
  async handle(args: any): Promise<{ content: Array<{ type: string; text: string }> }> {
    // Handle null/undefined args for empty search
    if (!args || Object.keys(args).length === 0) {
      args = { searches: [{ query: '' }] };
    }
    
    // Support both old single-query format and new batch format
    const searches = args.searches || [args];
    const allResults = [];
    
    for (let i = 0; i < searches.length; i++) {
      const search = searches[i];
      // Ensure query property exists (set to empty string if not provided)
      if (search && typeof search === 'object' && !('query' in search)) {
        search.query = '';
      }
      
      const { results, stats } = await withTimeout(
        this.searchService.search(search as SearchInput),
        DEFAULT_TIMEOUTS.SEARCH,
        'Search operation'
      );
      
      if (results.length === 0) {
        const filters = stats?.filters ? Object.entries(stats.filters)
          .filter(([, v]) => v !== undefined && v !== '')
          .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
          .join(', ') : 'none';
        
        allResults.push({
          type: 'text',
          text: `${searches.length > 1 ? `Search ${i + 1}: ` : ''}No results found for "${search.query || ''}".\n\nApplied filters: ${filters}`
        });
        continue;
      }
      
      // Create a summary of the search
      const totalResults = stats?.total || results.length;
      const offset = search.offset || 0;
      const limit = search.limit || 10;
      const showingText = offset > 0 ? ` (showing ${offset + 1}-${Math.min(offset + limit, totalResults)} of ${totalResults})` : '';
      const summary = `${searches.length > 1 ? `Search ${i + 1}: ` : ''}Found ${results.length} result(s) for "${search.query || ''}"${stats?.total ? ` out of ${stats.total} total records` : ''}${showingText}.`;
      
      // Format each result
      const resultContent = results.map((result: SearchServiceResult, index: number) => {
        const relevancePercent = (result.relevance_score * 100).toFixed(RELEVANCE_PERCENT_PRECISION);
        const metadata = result.metadata ? formatMetadata(result.metadata as SourceRecord) : 'Unknown metadata';
        
        // Get emoji and narrative
        const emoji = result.metadata?.experience?.emoji || '';
        const narrative = result.metadata?.experience?.narrative || '';
        const emojiAndNarrative = emoji ? `${emoji} ${narrative}` : narrative;
        
        // Use full content if available, otherwise use snippet
        const displayContent = result.content || result.snippet;
        
        const resultText = `Result ${index + 1} (Relevance: ${relevancePercent}%)
${emojiAndNarrative ? emojiAndNarrative + '\n' : ''}
${formatContent(displayContent, undefined, search.includeFullContent)}

ID: ${result.id} | ${metadata}
Relevance: ${formatRelevanceBreakdown(result.relevance_breakdown)}`;

        return {
          type: 'text',
          text: resultText
        };
      });
      
      allResults.push(
        { type: 'text', text: summary },
        ...resultContent
      );
      
      // Add separator between searches if there are multiple
      if (i < searches.length - 1) {
        allResults.push({ type: 'text', text: '\n---\n' });
      }
    }
    
    return {
      content: allResults
    };
  }
}