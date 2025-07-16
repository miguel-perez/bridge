/**
 * MCP Tool Handlers for Bridge
 * 
 * This module coordinates all MCP tool handlers for Bridge, delegating to
 * individual handler classes for better organization and maintainability.
 * 
 * @module mcp/handlers
 */

import { CaptureHandler } from './capture-handler.js';
import { SearchHandler } from './search-handler.js';
import { UpdateHandler } from './update-handler.js';
import { ReleaseHandler } from './release-handler.js';
import { 
  type CaptureInput,
  type SearchInput,
  type UpdateInput,
  type ReleaseInput,
  type ToolResult
} from './schemas.js';

/**
 * MCP Tool Handlers class
 * 
 * Coordinates all MCP tool handlers by delegating to individual handler classes.
 * Each handler formats the response in a user-friendly way for MCP clients.
 */
export class MCPToolHandlers {
  private captureHandler: CaptureHandler;
  private searchHandler: SearchHandler;
  private updateHandler: UpdateHandler;
  private releaseHandler: ReleaseHandler;

  constructor() {
    this.captureHandler = new CaptureHandler();
    this.searchHandler = new SearchHandler();
    this.updateHandler = new UpdateHandler();
    this.releaseHandler = new ReleaseHandler();
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
  async handleCapture(args: CaptureInput): Promise<ToolResult> {
    return this.captureHandler.handle(args);
  }

  /**
   * Handles search tool requests - supports both single queries and batch operations
   * 
   * Performs multi-modal searches across all records with relevance scoring,
   * breakdowns, and formatted results including content snippets, metadata, and filtering.
   * 
   * @param args - The search arguments containing queries and filters
   * @returns Formatted search results
   */
  async handleSearch(args: SearchInput): Promise<ToolResult> {
    return this.searchHandler.handle(args);
  }

  /**
   * Handles update tool requests - supports both single items and batch operations
   * 
   * Updates existing source records with corrected fields and shows what was changed,
   * including content, narrative, experience qualities, and embedding regeneration.
   * 
   * @param args - The update arguments containing the correction data
   * @returns Formatted update result
   */
  async handleUpdate(args: UpdateInput): Promise<ToolResult> {
    return this.updateHandler.handle(args);
  }

  /**
   * Handles release tool requests - supports both single items and batch operations
   * 
   * Deletes one or more source records by ID and returns confirmation messages
   * with optional reasons for each release.
   * 
   * @param args - The release arguments containing the IDs and reasons
   * @returns Formatted release confirmation
   */
  async handleRelease(args: ReleaseInput): Promise<ToolResult> {
    return this.releaseHandler.handle(args);
  }
}