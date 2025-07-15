/**
 * MCP Search Tool Handler - Unified API v2
 * 
 * Implements the unified Bridge Search API that combines pattern discovery with source retrieval.
 * Returns beautiful formatted text by default, with tree view for empty queries.
 * 
 * @module mcp/search-handler
 */

import { SearchService, type SearchInput } from '../services/search.js';
import { patternManager } from '../services/pattern-manager.js';
import { withTimeout, DEFAULT_TIMEOUTS } from '../utils/timeout.js';
import { formatEcosystemTree, formatSearchResultsWithPatterns } from '../utils/formatters.js';

export class SearchHandler {
  private searchService: SearchService;

  constructor() {
    this.searchService = new SearchService();
  }

  /**
   * Handles unified search requests - combines pattern discovery with source retrieval
   * 
   * For empty queries: Returns ecosystem tree view with patterns and sources
   * For text queries: Returns formatted search results with pattern context
   * For pattern-aware queries: Searches within specific patterns
   * 
   * @param args - The search arguments containing queries and filters
   * @returns Formatted search results or ecosystem tree
   */
  async handle(args: any): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      // Handle null/undefined args for empty search
      if (!args || Object.keys(args).length === 0) {
        args = { searches: [{ query: '' }] };
      }
      
      // Support both old single-query format and new batch format
      const searches = args.searches || [args];
      
      // If single search and empty query, return ecosystem tree
      if (searches.length === 1 && (!searches[0].query || searches[0].query.trim() === '')) {
        return this.handleEcosystemTree();
      }
      
      // Handle regular searches
      const allResults = [];
      
      for (let i = 0; i < searches.length; i++) {
        const search = searches[i];
        
        // Ensure query property exists
        if (search && typeof search === 'object' && !('query' in search)) {
          search.query = '';
        }
        
        // Check if this is a pattern-aware search
        if (search.in || search.pattern) {
          const result = await this.handlePatternSearch(search, i, searches.length);
          allResults.push(...result.content);
        } else {
          const result = await this.handleRegularSearch(search, i, searches.length);
          allResults.push(...result.content);
        }
        
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
   * Handle ecosystem tree view for empty queries
   */
  private async handleEcosystemTree(): Promise<{ content: Array<{ type: string; text: string }> }> {
    // Initialize pattern manager
    await patternManager.initialize();
    
    // Get patterns
    const patterns = await patternManager.getPatterns();
    const qualityPatterns = await patternManager.getQualityPatterns();
    
    // Get all experiences for mapping
    const { results: allExperiences } = await withTimeout(
      this.searchService.search({ 
        query: '', 
        limit: 1000,
        includeContext: true,
        includeFullContent: true 
      } as SearchInput),
      DEFAULT_TIMEOUTS.SEARCH,
      'Search operation'
    );
    
    // Create ID to experience map
    const experienceMap = new Map<string, any>();
    allExperiences.forEach(exp => {
      experienceMap.set(exp.id, exp);
    });
    
    // Format as tree view with experiences
    const treeOutput = formatEcosystemTree(patterns, qualityPatterns, allExperiences.length, experienceMap);
    
    return {
      content: [{
        type: 'text',
        text: treeOutput
      }]
    };
  }

  /**
   * Handle pattern-aware search
   */
  private async handlePatternSearch(
    search: any, 
    index: number, 
    totalSearches: number
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    // Get pattern by ID or name
    const patterns = await patternManager.getPatterns();
    const patternId = search.in || search.pattern;
    const targetPattern = patterns.find(p => p.id === patternId || p.name === patternId);
    
    if (!targetPattern) {
      return {
        content: [{
          type: 'text',
          text: `${totalSearches > 1 ? `Search ${index + 1}: ` : ''}Pattern "${patternId}" not found.`
        }]
      };
    }
    
    // Search within pattern experiences
    const patternExperienceIds = targetPattern.experienceIds;
    const searchQuery = search.about || search.query || '';
    
    // Filter results to only include experiences from this pattern
    const { results } = await withTimeout(
      this.searchService.search({
        query: searchQuery,
        limit: search.examples || search.limit || 10,
        includeContext: true,
        includeFullContent: true
      } as SearchInput),
      DEFAULT_TIMEOUTS.SEARCH,
      'Search operation'
    );
    
    // Filter to pattern experiences
    const patternResults = results.filter(r => patternExperienceIds.includes(r.id));
    
    // Format with pattern context
    let output = `${totalSearches > 1 ? `Search ${index + 1}: ` : ''}`;
    output += `🔍 Pattern: ${targetPattern.name}\n`;
    output += `📊 ${targetPattern.experienceIds.length} experiences | Coherence: ${Math.round(targetPattern.coherence || 0)}%\n\n`;
    
    if (searchQuery.trim()) {
      output += `Searching for "${searchQuery}" within pattern:\n\n`;
    }
    
    if (patternResults.length === 0) {
      output += 'No matching experiences found in this pattern.\n';
    } else {
      output += formatSearchResultsWithPatterns(patternResults, searchQuery, [targetPattern]);
    }
    
    return {
      content: [{
        type: 'text',
        text: output
      }]
    };
  }

  /**
   * Handle regular search with beautiful formatting
   */
  private async handleRegularSearch(
    search: any, 
    index: number, 
    totalSearches: number
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    // Handle quality dimension search
    if (search.dimension) {
      return this.handleQualityDimensionSearch(search, index, totalSearches);
    }
    
    // Build search input with new API parameters
    const searchInput: SearchInput = {
      query: search.query || '',
      limit: search.limit || 10,
      offset: search.offset || 0,
      sort: search.sort || 'occurred',
      includeContext: search.includeContext ?? true,
      includeFullContent: search.includeFullContent ?? true,
      ...search
    };
    
    // Handle natural language parameters
    if (search.experiencer) {
      searchInput.experiencer = search.experiencer;
    }
    if (search.perspective) {
      searchInput.perspective = search.perspective;
    }
    if (search.processing) {
      searchInput.processing = search.processing;
    }
    
    // Handle temporal filters
    if (search.when) {
      // Convert natural language time to date range
      searchInput.occurred = search.when;
    }
    if (search.recent) {
      // Last 7 days
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      searchInput.occurred = {
        start: weekAgo.toISOString(),
        end: new Date().toISOString()
      };
    }
    if (search.today) {
      // Today only
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(endOfDay.getDate() + 1);
      searchInput.occurred = {
        start: startOfDay.toISOString(),
        end: endOfDay.toISOString()
      };
    }
    
    // Handle legacy filters
    if (search.filters) {
      Object.assign(searchInput, search.filters);
    }
    
    const { results, stats } = await withTimeout(
      this.searchService.search(searchInput),
      DEFAULT_TIMEOUTS.SEARCH,
      'Search operation'
    );
    
    if (results.length === 0) {
      const filters = stats?.filters ? Object.entries(stats.filters)
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
        .join(', ') : 'none';
      
      return {
        content: [{
          type: 'text',
          text: `${totalSearches > 1 ? `Search ${index + 1}: ` : ''}No results found for "${search.query || ''}".\n\nApplied filters: ${filters}`
        }]
      };
    }
    
    // Get patterns for context
    await patternManager.initialize();
    const patterns = await patternManager.getPatterns();
    
    // Check if results are strongly associated with a pattern
    const patternMatches = this.findPatternMatches(results, patterns);
    
    // Format results with pattern context
    let output = '';
    if (totalSearches > 1) {
      output += `Search ${index + 1}: `;
    }
    
    // If strong pattern match, show pattern context first
    if (patternMatches.length > 0 && search.show !== 'sources_only') {
      output += this.formatPatternContext(patternMatches, results.length);
    }
    
    const formattedResults = formatSearchResultsWithPatterns(results, search.query || '', patterns);
    output += formattedResults;
    
    return {
      content: [{
        type: 'text',
        text: output
      }]
    };
  }
  
  /**
   * Handle quality dimension search
   */
  private async handleQualityDimensionSearch(
    search: any, 
    index: number, 
    totalSearches: number
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    const dimension = search.dimension;
    const threshold = search.threshold || 70;
    const examples = search.examples || 5;
    
    // Get quality patterns for this dimension
    const qualityPatterns = await patternManager.getQualityPatterns(dimension);
    
    let output = `${totalSearches > 1 ? `Search ${index + 1}: ` : ''}`;
    output += `🎯 ${dimension.toUpperCase()} DIMENSION\n`;
    output += `Threshold: ${threshold}% prominence\n\n`;
    
    if (qualityPatterns.length === 0) {
      output += `No distinct patterns found in ${dimension} dimension yet.\n`;
      output += 'Patterns emerge as experiences with strong qualities in this dimension accumulate.\n';
      return {
        content: [{
          type: 'text',
          text: output
        }]
      };
    }
    
    output += `Found ${qualityPatterns.length} distinct ${dimension} patterns:\n\n`;
    
    for (let i = 0; i < qualityPatterns.length; i++) {
      const pattern = qualityPatterns[i];
      output += `📍 ${pattern.semantic_meaning.toUpperCase()}\n`;
      output += `   Keywords: ${pattern.keywords.slice(0, 5).join(', ')}\n`;
      output += `   ${pattern.experiences.length} experiences | Coherence: ${Math.round(pattern.coherence)}%\n`;
      
      // Show sample experience IDs (we don't have full experience objects in quality patterns)
      if (pattern.experiences.length > 0 && examples > 0) {
        const sampleIds = pattern.experiences.slice(0, examples);
        output += `   • ${sampleIds.length} sample experiences: ${sampleIds.join(', ')}\n`;
      }
      
      if (i < qualityPatterns.length - 1) {
        output += '\n';
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
   * Find patterns that match the search results
   */
  private findPatternMatches(results: any[], patterns: any[]): any[] {
    const resultIds = new Set(results.map(r => r.id));
    const matchingPatterns: any[] = [];
    
    for (const pattern of patterns) {
      const matchCount = pattern.experienceIds.filter((id: string) => resultIds.has(id)).length;
      if (matchCount >= 2 || matchCount >= pattern.experienceIds.length * 0.5) {
        matchingPatterns.push({ pattern, matchCount });
      }
    }
    
    // Sort by match count
    return matchingPatterns.sort((a, b) => b.matchCount - a.matchCount);
  }
  
  /**
   * Format pattern context header
   */
  private formatPatternContext(patternMatches: any[], totalResults: number): string {
    if (patternMatches.length === 0) return '';
    
    let output = '🎯 PATTERN CONTEXT\n';
    
    // Show top matching pattern
    const topMatch = patternMatches[0];
    const pattern = topMatch.pattern;
    
    output += `└─ ${pattern.name} (${topMatch.matchCount}/${totalResults} results)\n`;
    output += `   ${Math.round(pattern.coherence || 0)}% coherence | ${pattern.experienceIds.length} total experiences\n\n`;
    
    return output;
  }
}