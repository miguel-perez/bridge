/**
 * MCP Tool Handlers for Bridge
 * 
 * This module coordinates all MCP tool handlers for Bridge, delegating to
 * individual handler classes for better organization and maintainability.
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

  /**
   * Initializes all MCP tool handlers
   * @remarks
   * Creates instances of all individual handlers for coordinated tool processing.
   */
  constructor() {
    this.experienceHandler = new ExperienceHandler();
    this.recallHandler = new RecallHandler();
    this.reconsiderHandler = new ReconsiderHandler();
    this.releaseHandler = new ReleaseHandler();
  }

  /**
   * Routes tool requests to appropriate handlers
   * @remarks
   * Main entry point for all MCP tool operations. Routes requests based on tool name
   * to the appropriate handler for processing.
   * @param toolName - Name of the tool to execute
   * @param args - Arguments for the tool operation
   * @returns Tool result from the appropriate handler
   * @throws Error When tool name is not recognized
   */
  async handle(toolName: string, args: Record<string, unknown>): Promise<Record<string, unknown>> {
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