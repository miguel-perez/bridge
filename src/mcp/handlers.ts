/**
 * MCP Tool Handlers for Bridge
 * 
 * This module coordinates all MCP tool handlers for Bridge, delegating to
 * individual handler classes for better organization and maintainability.
 * 
 * @module mcp/handlers
 */

import { ExperienceHandler } from './experience-handler.js';
import { RecallHandler } from './recall-handler.js';
import { ReconsiderHandler } from './reconsider-handler.js';
import { ReleaseHandler } from './release-handler.js';

import { 
  // type RememberInput,
  // type SearchInput,
  // type ReconsiderInput,
  // type ReleaseInput,
  // type ToolResult
} from './schemas.js';

/**
 * MCP Tool Handlers class
 * 
 * Coordinates all MCP tool handlers by delegating to individual handler classes.
 * Each handler formats the response in a user-friendly way for MCP clients.
 */
export class MCPToolHandlers {
  private experienceHandler: ExperienceHandler;
  private recallHandler: RecallHandler;
  private reconsiderHandler: ReconsiderHandler;
  private releaseHandler: ReleaseHandler;

  constructor() {
    this.experienceHandler = new ExperienceHandler();
    this.recallHandler = new RecallHandler();
    this.reconsiderHandler = new ReconsiderHandler();
    this.releaseHandler = new ReleaseHandler();
  }

  // Example handler mapping (update as needed):
  async handle(toolName: string, args: any): Promise<any> {
    switch (toolName) {
      case 'experience':
        return this.experienceHandler.handle(args);
      case 'recall':
        return this.recallHandler.handle(args);
      case 'reconsider':
        return this.reconsiderHandler.handle(args);
      case 'release':
        return this.releaseHandler.handle(args);

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }
}