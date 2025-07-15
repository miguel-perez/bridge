import { CaptureService } from '../services/capture.js';

export interface CaptureRequestParams {
  source?: string;
  perspective?: string;
  experiencer?: string;
  processing?: string;
  crafted?: boolean;
  experience?: {
    qualities?: Array<{ type: string; prominence: number; manifestation: string }>;
    emoji: string;
    narrative: string;
  };
}

export interface CaptureResponse {
  success: boolean;
  source?: {
    id: string;
    content: string;
    created: string;
    perspective?: string;
    experiencer?: string;
    processing?: string;
    crafted?: boolean;
    experience?: {
      qualities: Array<{ type: string; prominence: number; manifestation: string }>;
      emoji: string;
      narrative: string;
    };
  };
  defaultsUsed?: string[];
  error?: string;
}

export class CaptureHandler {
  private captureService: CaptureService;

  constructor() {
    this.captureService = new CaptureService();
  }

  /**
   * Handles capture requests
   * 
   * @param args - The capture arguments containing the experiential data
   * @returns Formatted capture result
   */
  async handle(args: any): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      // Handle null/undefined args for empty capture
      if (!args || Object.keys(args).length === 0) {
        args = { captures: [{ source: '' }] };
      }
      
      // Support both old single-capture format and new batch format
      const captures = args.captures || [args];
      
      // Handle regular captures
      const allResults = [];
      
      for (let i = 0; i < captures.length; i++) {
        const capture = captures[i];
        
        // Ensure source property exists
        if (capture && typeof capture === 'object' && !('source' in capture)) {
          capture.source = '';
        }
        
        // Handle regular capture
        const result = await this.handleRegularCapture(capture);
        allResults.push(...result.content);
        
        // Add separator between captures if there are multiple
        if (i < captures.length - 1) {
          allResults.push({ type: 'text', text: '\n---\n\n' });
        }
      }
      
      return { content: allResults };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [{
          type: 'text',
          text: errorMessage
        }]
      };
    }
  }

  /**
   * Handle regular capture
   */
  private async handleRegularCapture(
    capture: any
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      // Validate required fields
      if (!capture.source && !capture.experience?.narrative) {
        throw new Error('Either source or experience.narrative is required');
      }

      // Capture the experience
      const result = await this.captureService.captureSource({
        content: capture.source,
        perspective: capture.perspective,
        experiencer: capture.experiencer,
        processing: capture.processing,
        crafted: capture.crafted,
        experience: capture.experience ? {
          qualities: capture.experience.qualities || [],
          emoji: capture.experience.emoji,
          narrative: capture.experience.narrative
        } : undefined
      });

      // Format the response
      let output = '✅ Experience captured successfully!\n\n';
      
      const source = result.source;
      const experience = source.experience;
      
      // Show emoji and narrative
      if (experience?.emoji) {
        output += `${experience.emoji} ${experience.narrative || ''}\n\n`;
      }
      
      // Show content if different from narrative
      if (source.content && source.content !== experience?.narrative) {
        output += `${source.content}\n\n`;
      }
      
      // Show qualities if available
      if (experience?.qualities && experience.qualities.length > 0) {
        const qualitiesText = experience.qualities
          .map(q => `${q.type}: ${q.prominence}%`)
          .join(', ');
        output += `✨ Qualities: ${qualitiesText}\n\n`;
      }
      
      // Show metadata
      output += `📝 ID: ${source.id}\n`;
      output += `👤 Experiencer: ${source.experiencer || 'Unknown'}\n`;
      output += `👁️  Perspective: ${source.perspective || 'I'}\n`;
      output += `⏰ Processing: ${source.processing || 'during'}\n`;
      output += `🕐 Created: ${source.created}\n`;
      
      if (result.defaultsUsed && result.defaultsUsed.length > 0) {
        output += `\n📋 Defaults used: ${result.defaultsUsed.join(', ')}\n`;
      }

      return {
        content: [{
          type: 'text',
          text: output
        }]
      };
      
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: error instanceof Error ? error.message : 'Unknown error'
        }]
      };
    }
  }
} 