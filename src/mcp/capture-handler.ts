/**
 * MCP Capture Tool Handler
 * 
 * Handles capture tool requests for creating experiential moments.
 * Supports both single items and batch operations.
 * 
 * @module mcp/capture-handler
 */

import { CaptureService } from '../services/capture.js';
import { withTimeout, DEFAULT_TIMEOUTS, TimeoutError } from '../utils/timeout.js';
import { formatDate, formatContent, formatExperience } from './handler-utils.js';

export class CaptureHandler {
  private captureService: CaptureService;

  constructor() {
    this.captureService = new CaptureService();
  }

  /**
   * Handles capture tool requests - supports both single items and batch operations
   * 
   * Captures one or more experiential moments and returns a formatted response
   * showing the captured data with experiential analysis.
   * 
   * @param args - The capture arguments containing the experiential data
   * @returns Formatted capture result
   */
  async handle(args: any): Promise<{ content: Array<{ type: string; text: string }> }> {
    // Support both old single-item format and new batch format
    const captures = args.captures || [args];
    const results = [];
    
    for (const capture of captures) {
      try {
        const result = await withTimeout(
          this.captureService.captureSource(capture),
          DEFAULT_TIMEOUTS.CAPTURE,
          'Capture operation'
        );
        const content = `✓ Captured experience for ${result.source.experiencer}
ID: ${result.source.id}
Occurred: ${formatDate(result.source.occurred || result.source.system_time)}

${result.source.experience?.narrative ? 'Narrative: ' : 'Content: '}${formatContent(result.source.content, result.source.experience?.narrative, true)}

Experience:\n${formatExperience(result.source.experience)}

${result.defaultsUsed.length > 0 ? `Defaults used: ${result.defaultsUsed.join(', ')}` : ''}`;
        results.push(content);
      } catch (error) {
        if (error instanceof TimeoutError) {
          throw error; // Re-throw timeout errors to be handled by MCP
        }
        throw error; // Re-throw other errors
      }
    }
    const summary = captures.length > 1 ? `Captured ${captures.length} experiences:\n\n` : '';
    return {
      content: [{ type: 'text', text: summary + results.join('\n\n---\n\n') }]
    };
  }
}