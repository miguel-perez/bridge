import { RememberService } from '../services/remember.js';
import { ToolResult, ToolResultSchema } from './schemas.js';
import type { RememberInput } from './schemas.js';

export interface RememberResponse {
  success: boolean;
  source?: {
    id: string;
    content: string;
    created: string;
    perspective?: string;
    experiencer?: string;
    processing?: string;
    crafted?: boolean;
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
   * Handle regular remember
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
        const results = [];
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
        
        // Format batch response
        let output = `✅ ${results.length} experiences remembered successfully!\n\n`;
        
        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          const source = result.source;
          const experience = source.experience;
          
          output += `--- Experience ${i + 1} ---\n`;
          
          // Show source content
          const truncatedSource = source.source.length > 200 ? 
            source.source.substring(0, 200) + '...' : source.source;
          output += `📄 Source: ${truncatedSource}\n\n`;
          
          // Show prominent qualities
          if (experience && experience.length > 0) {
            output += `✨ Qualities: ${experience.join(', ')}\n\n`;
          }
          
          // Show metadata
          output += `📝 ID: ${source.id}\n`;
          output += `👤 Experiencer: ${source.experiencer || 'Unknown'}\n`;
          output += `👁️  Perspective: ${source.perspective || 'I'}\n`;
          output += `⏰ Processing: ${source.processing || 'during'}\n`;
          output += `🕐 Created: ${new Date(source.created).toLocaleString()}\n\n`;
        }
        
        output += `💡 You can recall these experiences or update them later using their IDs.`;
        
        return {
          content: [{
            type: 'text',
            text: output
          }]
        };
        
      } else {
        // Single remember
        const result = await this.rememberService.rememberSource({
          content: remember.source,
          perspective: remember.perspective,
          experiencer: remember.experiencer,
          processing: remember.processing,
          crafted: remember.crafted,
          experience: remember.experience || undefined
        });

        // Format the response with enhanced feedback
        let output = '✅ Experience remembered successfully!\n\n';
        
        const source = result.source;
        const experience = source.experience;
        
        // Show source content
        const truncatedSource = source.source.length > 200 ? 
          source.source.substring(0, 200) + '...' : source.source;
        output += `📄 Source: ${truncatedSource}\n\n`;
        
        // Show prominent qualities
        if (experience && experience.length > 0) {
          output += `✨ Qualities: ${experience.join(', ')}\n\n`;
        }
        
        // Show metadata in a clean format
        output += `📝 ID: ${source.id}\n`;
        output += `👤 Experiencer: ${source.experiencer || 'Unknown'}\n`;
        output += `👁️  Perspective: ${source.perspective || 'I'}\n`;
        output += `⏰ Processing: ${source.processing || 'during'}\n`;
        output += `🕐 Created: ${new Date(source.created).toLocaleString()}\n`;
        
        // Show defaults used if any
        if (result.defaultsUsed && result.defaultsUsed.length > 0) {
          output += `\n📋 Defaults applied: ${result.defaultsUsed.join(', ')}\n`;
        }
        
        // Add a helpful note for next steps
        output += `\n💡 You can recall this experience or update it later using the ID: ${source.id}`;

        return {
          content: [{
            type: 'text',
            text: output
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