/**
 * MCP Tool Handlers for Bridge
 *
 * This module coordinates all MCP tool handlers for Bridge, delegating to
 * individual handler classes for better organization and maintainability.
 */

import { ExperienceHandler } from './experience-handler.js';
import { ReconsiderHandler } from './reconsider-handler.js';
import type { ExperienceInput, ReconsiderInput } from './schemas.js';

/**
 * MCP Tool Handlers class
 *
 * Coordinates all MCP tool handlers by delegating to individual handler classes.
 * Each handler formats the response in a user-friendly way for MCP clients.
 */
export class MCPToolHandlers {
  private experienceHandler: ExperienceHandler;
  private reconsiderHandler: ReconsiderHandler;

  /**
   * Initializes all MCP tool handlers
   * @remarks
   * Creates instances of all individual handlers for coordinated tool processing.
   */
  constructor() {
    this.experienceHandler = new ExperienceHandler();
    this.reconsiderHandler = new ReconsiderHandler();
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
    // Handle null or undefined args
    if (!args) {
      args = {};
    }

    switch (toolName) {
      case 'experience':
        return this.experienceHandler.handle(args as ExperienceInput);
      case 'reconsider':
        return this.reconsiderHandler.handle(args as ReconsiderInput);

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }
}
