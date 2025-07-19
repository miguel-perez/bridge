import { ExperienceService } from '../services/experience.js';
import { RecallService } from '../services/recall.js';
import { ToolResult, ToolResultSchema } from './schemas.js';
import type { ExperienceInput } from './schemas.js';
import { 
  formatBatchExperienceResponse, 
  formatExperienceResponse,
  type ExperienceResult
} from '../utils/formatters.js';
import { Messages, formatMessage } from '../utils/messages.js';

export interface RememberResponse {
  success: boolean;
  source?: {
    id: string;
    content: string;
    created: string;
    perspective?: string;
    experiencer?: string;
    processing?: string;
    experience?: string[];
  };
  defaultsUsed?: string[];
  error?: string;
}

export class ExperienceHandler {
  private experienceService: ExperienceService;
  private recallService: RecallService;

  constructor() {
    this.experienceService = new ExperienceService();
    this.recallService = new RecallService();
  }

  /**
   * Handles remember requests
   * 
   * @param args - The remember arguments containing the experiential data
   * @returns Formatted remember result
   */
  async handle(args: ExperienceInput): Promise<ToolResult> {
    try {
      const result = await this.handleRegularRemember(args);
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
   * Handle regular remember with natural formatting
   */
  private async handleRegularRemember(
    remember: ExperienceInput
  ): Promise<ToolResult> {
    try {
      // Validate required fields - handle both single and batch remembers
      if (remember.remembers && remember.remembers.length > 0) {
        // Batch remember - validate each item in the array
        for (const item of remember.remembers) {
          if (!item.source) {
            throw new Error('Each remember item must have source content');
          }
        }
      } else if (!remember.source) {
        // Single remember - validate the main fields
        throw new Error('Source content is required');
      }

      // Handle batch remembers or single remember
      if (remember.remembers && remember.remembers.length > 0) {
        // Batch remember - process each item
        const results: ExperienceResult[] = [];
        for (const item of remember.remembers) {
          const result = await this.experienceService.rememberSource({
            content: item.source,
            perspective: item.perspective,
            experiencer: item.experiencer,
            processing: item.processing,
            crafted: item.crafted,
            experience: item.experience || undefined
          });
          results.push(result);
        }
        
        // Format batch response using conversational formatter
        const response = formatBatchExperienceResponse(results);
        
        return {
          content: [{
            type: 'text',
            text: response
          }]
        };
        
      } else {
        // Single remember with natural formatting
        const result = await this.experienceService.rememberSource({
          content: remember.source,
          perspective: remember.perspective,
          experiencer: remember.experiencer,
          processing: remember.processing,
          crafted: remember.crafted,
          experience: remember.experience || undefined
        });

        // Use natural conversational formatting
        let response = formatExperienceResponse(result);
        
        // Find similar experience if any
        const similarText = remember.source ? 
          await this.findSimilarExperience(remember.source, result.source.id) : 
          null;
        if (similarText) {
          response += '\n\n' + similarText;
        }
        
        return {
          content: [{
            type: 'text',
            text: response
          }]
        };
      }
      
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
   * Find a similar experience to show connection
   */
  private async findSimilarExperience(content: string, excludeId: string): Promise<string | null> {
    try {
      // Use semantic search to find similar experiences
      const { results } = await this.recallService.search({
        semantic_query: content,
        semantic_threshold: 0.8, // High threshold for relevant matches
        limit: 2 // Get 2 in case the first is the same one we just remembered
      });
      
      // Filter out the experience we just remembered and get the most similar
      const similar = results.find(r => r.id !== excludeId);
      
      if (similar && similar.relevance_score > 0.8) {
        // Format the similar experience reference
        const snippet = similar.snippet || similar.content || '';
        const truncated = snippet.length > 100 ? snippet.substring(0, 100) + '...' : snippet;
        
        return formatMessage(Messages.remember.similar, { content: truncated });
      }
      
      return null;
    } catch (error) {
      // Silently fail - similarity is nice to have but not critical
      return null;
    }
  }
} 