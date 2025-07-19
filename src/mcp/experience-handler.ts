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

export interface ExperienceResponse {
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
   * Handles experience requests
   * 
   * @param args - The experience arguments containing the experiential data
   * @returns Formatted experience result
   */
  async handle(args: ExperienceInput): Promise<ToolResult> {
    try {
      const result = await this.handleRegularExperience(args);
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
   * Handle regular experience with natural formatting
   */
  private async handleRegularExperience(
    experience: ExperienceInput
  ): Promise<ToolResult> {
    try {
      // Validate required fields - handle both single and batch experiences
      if (experience.experiences && experience.experiences.length > 0) {
        // Batch experience - validate each item in the array
        for (const item of experience.experiences) {
          if (!item.source) {
            throw new Error('Each experience item must have source content');
          }
        }
      } else if (!experience.source) {
        // Single experience - validate the main fields
        throw new Error('Source content is required');
      }

      // Handle batch experiences or single experience
      if (experience.experiences && experience.experiences.length > 0) {
        // Batch experience - process each item
        const results: ExperienceResult[] = [];
        for (const item of experience.experiences) {
          const result = await this.experienceService.captureExperience({
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
        // Single experience with natural formatting
        const result = await this.experienceService.captureExperience({
          content: experience.source,
          perspective: experience.perspective,
          experiencer: experience.experiencer,
          processing: experience.processing,
          crafted: experience.crafted,
          experience: experience.experience || undefined
        });

        // Use natural conversational formatting
        let response = formatExperienceResponse(result);
        
        // Find similar experience if any
        const similarText = experience.source ? 
          await this.findSimilarExperience(experience.source, result.source.id) : 
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
        limit: 2 // Get 2 in case the first is the same one we just experienceed
      });
      
      // Filter out the experience we just experienceed and get the most similar
      const similar = results.find(r => r.id !== excludeId);
      
      if (similar && similar.relevance_score > 0.8) {
        // Format the similar experience reference
        const snippet = similar.snippet || similar.content || '';
        const truncated = snippet.length > 100 ? snippet.substring(0, 100) + '...' : snippet;
        
        return formatMessage(Messages.experience.similar, { content: truncated });
      }
      
      return null;
    } catch (error) {
      // Silently fail - similarity is nice to have but not critical
      return null;
    }
  }
} 