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
import { formatRecallResponse, type RecallResult } from '../utils/formatters.js';

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
      
      // Special handling for "recent" queries
      const isRecentQuery = query.toLowerCase() === 'recent' || 
                           query.toLowerCase() === 'last' ||
                           query.toLowerCase() === 'latest';
      
      // Perform recall
      const { results } = await withTimeout(
        this.recallService.search({
          query: isRecentQuery ? '' : query, // Empty query for recent to get all
          limit: isRecentQuery ? Math.min(limit, 5) : limit, // Show fewer for recent
          // If query is provided, also use it for semantic recall
          semantic_query: isRecentQuery ? '' : query,
          semantic_threshold: 0.7,
          // Pass through all filters from the input
          experiencer: recall.experiencer,
          perspective: recall.perspective,
          processing: recall.processing,
          created: recall.created,
          sort: isRecentQuery ? 'created' : recall.sort // Force sort by created for recent
        }),
        DEFAULT_TIMEOUTS.SEARCH,
        'Recall operation'
      );
      
      // Convert results to RecallResult format for formatter
      const recallResults: RecallResult[] = results.map(result => ({
        id: result.id,
        content: result.content || '',
        snippet: result.snippet,
        metadata: result.metadata ? {
          created: result.metadata.created || new Date().toISOString(),
          perspective: result.metadata.perspective,
          experiencer: result.metadata.experiencer,
          processing: result.metadata.processing,
          experience: result.metadata.experience
        } : undefined,
        relevance_score: result.relevance_score
      }));
      
      // Always show IDs for better UX - users need them for modifications
      const showIds = true;
      
      // Format results using conversational formatter
      const response = formatRecallResponse(recallResults, showIds);
      
      // Build multi-content response
      const content: Array<{ type: 'text', text: string }> = [{
        type: 'text',
        text: response
      }];
      
      // Add contextual guidance
      const guidance = this.selectRecallGuidance(query, recallResults);
      if (guidance) {
        content.push({
          type: 'text',
          text: guidance
        });
      }
      
      return { content };
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
   * Select appropriate guidance for recall results
   */
  private selectRecallGuidance(
    query: string, 
    results: RecallResult[]
  ): string | null {
    // No results - provide helpful guidance based on query type
    if (results.length === 0) {
      // Long queries often fail - suggest keywords
      if (query.length > 30) {
        return "Long phrases rarely match exactly. Try key words like: anxiety, presentation, nervous";
      }
      // Very short queries might be too broad
      if (query.length < 3) {
        return "Try more specific terms or 'recall recent' for latest experiences";
      }
      // Default guidance with examples
      return "No matches found. Try:\n• Different keywords (mood, feeling, thought)\n• Broader terms (anxious → anxiety)\n• 'recall recent' for latest";
    }
    
    // Single result - suggest actions
    if (results.length === 1) {
      return "To modify: use 'reconsider' with the ID\nTo remove: use 'release' with the ID";
    }
    
    // Check if this is a "recall last" query
    if (query.toLowerCase().includes('last') || query.toLowerCase().includes('recent')) {
      return "Recent experiences shown with IDs for easy modification";
    }
    
    // Many results suggest patterns
    if (results.length > 5) {
      return "Multiple patterns found. Consider refining search or analyzing themes";
    }
    
    // 2-5 results with emotional content
    if (results.length <= 5) {
      const hasEmotionalContent = results.some(r => 
        r.metadata?.experience?.some(q => 
          q.includes('mood') || q.includes('embodied')
        )
      );
      
      if (hasEmotionalContent) {
        return "Emotional experiences captured. Use IDs to update or connect insights";
      }
    }
    
    // Default for small result sets
    return "Use the IDs above to reconsider or release specific experiences";
  }
}