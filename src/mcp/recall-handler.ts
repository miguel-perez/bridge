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
          semantic_threshold: 0.7
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
      
      return {
        content: [{
          type: 'text',
          text: response
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
}