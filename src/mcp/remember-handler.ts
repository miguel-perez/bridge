import { RememberService } from '../services/remember.js';
import { ToolResult, ToolResultSchema } from './schemas.js';
import type { RememberInput } from './schemas.js';
import { 
  formatBatchRememberResponse, 
  formatRememberResponse,
  type RememberResult
} from '../utils/formatters.js';

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

export class RememberHandler {
  private rememberService: RememberService;

  constructor() {
    this.rememberService = new RememberService();
  }

  /**
   * Handles remember requests
   * 
   * @param args - The remember arguments containing the experiential data
   * @returns Formatted remember result
   */
  async handle(args: RememberInput): Promise<ToolResult> {
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
    remember: RememberInput
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
        const results: RememberResult[] = [];
        for (const item of remember.remembers) {
          const result = await this.rememberService.rememberSource({
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
        const response = formatBatchRememberResponse(results);
        
        return {
          content: [{
            type: 'text',
            text: response
          }]
        };
        
      } else {
        // Single remember with natural formatting
        const result = await this.rememberService.rememberSource({
          content: remember.source,
          perspective: remember.perspective,
          experiencer: remember.experiencer,
          processing: remember.processing,
          crafted: remember.crafted,
          experience: remember.experience || undefined
        });

        // Use natural conversational formatting
        const response = formatRememberResponse(result);
        
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
} 