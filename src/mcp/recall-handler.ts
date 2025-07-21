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
      
      // Perform recall
      const { results } = await withTimeout(
        this.recallService.search({
          query,
          limit,
          // If query is provided, also use it for semantic recall
          semantic_query: query,
          semantic_threshold: 0.7,
          // Pass through all filters from the input
          experiencer: recall.experiencer,
          perspective: recall.perspective,
          processing: recall.processing,
          created: recall.created,
          sort: recall.sort
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
      
      // Show IDs only if explicitly requested
      const showIds = recall.show_ids || false;
      
      // Format results using conversational formatter
      const response = formatRecallResponse(recallResults, showIds);
      
      // Build multi-content response
      const content: Array<{ type: 'text', text: string }> = [{
        type: 'text',
        text: response
      }];
      
      // Add contextual guidance
      const guidance = this.selectRecallGuidance(query, recallResults, showIds);
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
    results: RecallResult[], 
    showIds: boolean
  ): string | null {
    // No results - suggest different search
    if (results.length === 0) {
      return "Try different search terms or use 'recall recent' to see latest experiences";
    }
    
    // Check if this is a "recall last" query
    if (query.toLowerCase().includes('last') || query.toLowerCase().includes('recent')) {
      if (showIds) {
        return "To update: reconsider with ID";
      }
    }
    
    // Many results suggest patterns
    if (results.length > 3) {
      return "Patterns emerging";
    }
    
    // Check if results might need correction
    // (This is a simple heuristic - could be improved)
    const hasEmotionalContent = results.some(r => 
      r.metadata?.experience?.some(q => 
        q.includes('mood') || q.includes('embodied.sensing')
      )
    );
    
    if (hasEmotionalContent && showIds) {
      return "To update any of these: reconsider with ID";
    }
    
    return null;
  }
}