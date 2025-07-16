import { CaptureService } from '../services/capture.js';
import { CaptureInput, ToolResultSchema, type ToolResult } from './schemas.js';

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
  async handle(args: CaptureInput): Promise<ToolResult> {
    try {
      const result = await this.handleRegularCapture(args);
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
   * Handle regular capture
   */
  private async handleRegularCapture(
    capture: CaptureInput
  ): Promise<ToolResult> {
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

      // Format the response with enhanced feedback
      let output = '✅ Experience captured successfully!\n\n';
      
      const source = result.source;
      const experience = source.experience;
      
      // Show emoji and narrative prominently
      if (experience?.emoji) {
        output += `${experience.emoji} ${experience.narrative || ''}\n\n`;
      }
      
      // Show source content if different from narrative (for transparency)
      if (source.source && source.source !== experience?.narrative) {
        const truncatedSource = source.source.length > 200 ? 
          source.source.substring(0, 200) + '...' : source.source;
        output += `📄 Source: ${truncatedSource}\n\n`;
      }
      
      // Show qualities with better formatting
      if (experience?.qualities && experience.qualities.length > 0) {
        const topQualities = experience.qualities
          .sort((a: any, b: any) => b.prominence - a.prominence)
          .slice(0, 3)
          .map((q: { type: string; prominence: number }) => `${q.type}: ${Math.round(q.prominence * 100)}%`)
          .join(', ');
        output += `✨ Qualities: ${topQualities}\n\n`;
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
      output += `\n💡 You can search for this experience or update it later using the ID: ${source.id}`;

      return {
        content: [{
          type: 'text',
          text: output
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