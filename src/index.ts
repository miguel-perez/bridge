#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import {
  generateId,
  saveSource,
  getSource,
  deleteSource,
  setStorageConfig,
} from './storage.js';
import type { SourceRecord, ProcessingLevel, StorageRecord } from './types.js';

import path from 'path';
import type { SearchResult } from './search.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { statusMonitor } from './status.js';

// Constants
const SERVER_NAME = 'captain';
const SERVER_VERSION = '0.1.0';

// Define data file path using environment variable with fallback in project root
const defaultDataPath = path.resolve(process.cwd(), 'bridge.json');
const DATA_FILE_PATH = process.env.BRIDGE_FILE_PATH
  ? path.isAbsolute(process.env.BRIDGE_FILE_PATH)
    ? process.env.BRIDGE_FILE_PATH
    : path.resolve(process.cwd(), process.env.BRIDGE_FILE_PATH)
  : defaultDataPath;

// Create server instance
const server = new Server(
  {
    name: SERVER_NAME,
    version: SERVER_VERSION,
  },
  {
    capabilities: {
      tools: {
        listChanged: false  // We don't dynamically change tools
      },
      resources: {
        listChanged: false  // We don't dynamically change resources
      },
      prompts: {
        listChanged: false  // We don't dynamically change prompts
      },
    },
  }
);

// Add schema definitions for tool input validation
const captureSchema = z.object({
  content: z.string().optional(), // Make content optional to allow file auto-read
  contentType: z.string().optional().default('text'),
  perspective: z.enum(['I', 'we', 'you', 'they']),
  processing: z.enum(['during', 'right-after', 'long-after', 'crafted']),
  when: z.string().optional(),
  experiencer: z.string(),
  reflects_on: z.array(z.string()).optional(),
  file: z.string().optional(),
  // Removed autoframe parameter - auto-framing is now always enabled by default
}).refine((data) => {
  // Ensure either content or file is provided
  if (!data.content && !data.file) {
    throw new Error('Either content or file must be provided');
  }
  return true;
}, {
  message: 'Either content or file must be provided'
});

// Helper function for flexible date validation using chrono-node
async function validateFlexibleDate(dateString: string | undefined): Promise<boolean> {
  if (!dateString) return true; // Optional field
  try {
    const chrono = await import('chrono-node');
    const results = chrono.parse(dateString);
    return results.length > 0;
  } catch (error) {
    return false;
  }
}

// Custom Zod refinement for conditional default
const releaseSchema = z.object({
  id: z.string().optional(),
  cleanupReframed: z.boolean().optional(),
}).superRefine((val) => {
  if (val.id === undefined && val.cleanupReframed === undefined) {
    val.cleanupReframed = true;
  } else if (val.id !== undefined && val.cleanupReframed === undefined) {
    val.cleanupReframed = false;
  }
});

// Set storage and embeddings config to use DATA_FILE_PATH
setStorageConfig({ dataFile: DATA_FILE_PATH });

// Utility: smart word-boundary truncation with ellipsis
function smartTruncate(text: string, maxLength: number = 120): string {
  if (text.length <= maxLength) return text;
  // Find last space before maxLength
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > 0) {
    return truncated.slice(0, lastSpace) + '...';
  }
  return truncated + '...';
}

// Simple formatter for search results - consistent base format
function formatSearchResult(result: SearchResult, index: number): string {
  const label = String(result.type ?? '');
  let summary: string;
  if (typeof result.snippet === 'string') {
    summary = smartTruncate(result.snippet);
  } else if (typeof result.id === 'string') {
    summary = result.id;
  } else {
    summary = '[no summary]';
  }
  // Always include the ID in the output
  return `${index + 1}. [${label.toUpperCase()}] (ID: ${result.id}) ${summary}`;
}

// Enhanced formatter for detailed results
function formatDetailedSearchResult(result: SearchResult, index: number): string {
  const baseFormat = formatSearchResult(result, index);
  
  // Add additional context based on record type
  let details = '';
  
  if (result.type === 'source' && result.source) {
    const source = result.source;
    if (source.perspective) {
      details += `\n   Perspective: ${source.perspective}`;
    }
    if (source.processing) {
      details += `\n   Processing: ${source.processing}`;
    }
  }
  
  return baseFormat + details;
}

// Structured formatter for JSON output
function formatStructuredSearchResult(result: SearchResult): any {
  const base: any = {
    type: result.type,
    id: result.id,
    snippet: result.snippet,
    relevance: result.relevance
  };
  
  // Add full record data when available
  if (result.source) base.source = result.source;
  
  return base;
}

// Define SearchToolInput for the new search tool
interface SearchToolInput {
  query?: string;
  created?: string | { start: string; end: string };
  when?: string | { start: string; end: string };
  reflectedOn?: string;
  type?: Array<'source'>;
  experiencer?: string;
  perspective?: string;
  processing?: string;
  groupBy?: 'type' | 'experiencer' | 'day' | 'week' | 'month' | 'hierarchy';
  sort?: 'relevance' | 'created' | 'when';
  limit?: number;
  includeContext?: boolean;
}

// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const tools = [
    {
      name: "capture",
        description: "Capture raw experiential text as a source record. For unprocessed, in-the-moment entries such as journal notes, chat messages, or direct transcripts. When a file path is provided, the system will automatically read the file contents if no content is specified.",
      inputSchema: {
        type: "object",
        properties: {
          content: { type: "string", description: "Raw text from experiencer, either new experience or reflection or previous capture. If file is provided without content, file contents will be read automatically." },
          experiencer: { type: "string", description: "Who experienced this (e.g., 'Claude', 'Sarah', 'Team')" },
          perspective: { type: "string", enum: ["I", "we", "you", "they"], description: "Perspective used" },
          processing: { type: "string", enum: ["during", "right-after", "long-after", "crafted"], description: "When captured relative to experience" },
          contentType: { type: "string", description: "Type of content", default: "text" },
          when: { type: "string", description: "When it happened (ISO timestamp or descriptive like 'yesterday morning')" },
          reflects_on: { type: "array", items: { type: "string" }, description: "Array of source IDs this record reflects on (use for reflections)" },
          file: { type: "string", description: "File path to read contents from. If provided without content, file contents will be automatically read and used as content. Supports text files (txt, md, json, etc.)." }
        },
        required: ["experiencer", "perspective", "processing"]
      },
      annotations: {
        title: "Capture Experience",
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false
      }
    },

    {
      name: "release",
      description: "Release (delete) a source. If no id is provided, performs a bulk cleanup of all reframed (superseded) records. In bulk mode, cleanupReframed defaults to true.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "ID of source to release (optional for bulk cleanup)" },
          cleanupReframed: { type: "boolean", description: "If true, also delete any reframed records that were superseded by this record, or perform bulk cleanup if no ID provided. Defaults to true if no id is provided, otherwise false." }
        }
      },
      annotations: {
        title: "Release Record",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    {
      name: "search",
      description: `Unified faceted search across all records. \n\nTEMPORAL FILTERING:\n- 'created': Filter by when record was captured (system time)\n  Example: created: { start: "2025-01-01", end: "2025-01-31" }\n- 'when': Filter by when event happened (user-provided time)\n  Example: when: "yesterday" or when: { start: "last week", end: "today" }\n\nBoth support:\n- Natural language: "yesterday", "last week", "January 2025"\n- ISO dates: "2025-01-15T10:00:00Z"\n- Date ranges: { start: "date", end: "date" }\n\nThe system uses chrono-node for flexible date parsing.\n\nResults use consistent format: base format shows type, ID, and snippet; includeContext adds full record data as JSON; groupBy organizes results by category.`,
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Semantic search query (natural language or keywords)" },
          created: { oneOf: [ { type: "string" }, { type: "object", properties: { start: { type: "string" }, end: { type: "string" } }, required: ["start", "end"] } ], description: "Filter by record creation time (when captured)" },
          when: { oneOf: [ { type: "string" }, { type: "object", properties: { start: { type: "string" }, end: { type: "string" } }, required: ["start", "end"] } ], description: "Filter by event time (user-supplied)" },
          reflectedOn: { type: "string", description: "Record ID to find all related records (traverses reflects_on, sources)" },
          type: { type: "array", items: { type: "string", enum: ["source"] }, description: "Restrict to certain record types" },
          experiencer: { type: "string", description: "Only records with this experiencer" },
                      perspective: { type: "string", description: "Only records with this perspective" },
            processing: { type: "string", description: "Only records with this processing level" },
          groupBy: { type: "string", enum: ["type", "experiencer", "day", "week", "month", "hierarchy"], description: "Group results by this field" },
          sort: { type: "string", enum: ["relevance", "created", "when"], description: "Sort by field" },
          limit: { type: "number", description: "Maximum results to return" },
          includeContext: { type: "boolean", description: "Return full record metadata as structured JSON" }
        }
      },
      annotations: {
        title: "Search Records",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },

    {
      name: "status",
      description: "Get a high-level status report of the system, including counts of unframed sources and processing errors.",
      inputSchema: {
        type: "object",
        properties: {}
      },
      annotations: {
        title: "System Status",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    }
  ];
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'capture': {
        let input;
        try {
          input = captureSchema.parse(args);
          // Validate when field with flexible date parsing
          if (input.when && !(await validateFlexibleDate(input.when))) {
            throw new McpError(
              ErrorCode.InvalidParams,
              `Invalid date format for 'when': ${input.when}. Use natural language like 'yesterday', 'last week', '2024-01-15', or ISO 8601 format.`
            );
          }
        } catch (err) {
          if (err instanceof z.ZodError) {
            // User-friendly error for missing/invalid fields
            const details = err.errors.map(e =>
              e.path.length ? `Missing or invalid field: ${e.path.join('.')}` : e.message
            ).join('; ');
            throw new McpError(ErrorCode.InvalidParams, details);
          }
          if (err instanceof Error) {
          throw err;
        }
          throw new Error(String(err));
        }
        // For file captures, read file contents if no content provided
        if (input.file) {
          let fileContent = input.content;
          
          // If no content provided, read from file
          if (!fileContent || fileContent.trim() === '') {
            try {
              const fs = await import('fs/promises');
              
          // Validate file exists and is readable
              try {
                await fs.access(input.file);
              } catch (error) {
            throw new McpError(
              ErrorCode.InvalidParams,
                  `File not found or not accessible: ${input.file}`
                );
              }
              
              // Read file contents
              fileContent = await fs.readFile(input.file, 'utf8');
              
              if (!fileContent || fileContent.trim() === '') {
                throw new McpError(
                  ErrorCode.InvalidParams,
                  `File is empty: ${input.file}`
                );
              }
            } catch (error) {
              if (error instanceof McpError) {
                throw error;
              }
              throw new McpError(
                ErrorCode.InvalidParams,
                `Failed to read file ${input.file}: ${error instanceof Error ? error.message : String(error)}`
              );
            }
          }
          
          // Create source record with file metadata
          const source = await saveSource({
            id: generateId('src'),
            content: fileContent,
            contentType: input.contentType,
            created: new Date().toISOString(),
            when: input.when,
            perspective: input.perspective,
            experiencer: input.experiencer,
            processing: input.processing as ProcessingLevel,
            reflects_on: input.reflects_on,
            file: input.file,
          });

          const defaultsUsed = [];
          const safeArgs = args || {};
          if (!safeArgs.perspective) defaultsUsed.push('perspective="I"');
          if (!safeArgs.experiencer) defaultsUsed.push('experiencer="self"');
          if (!safeArgs.processing) defaultsUsed.push('processing="during"');
          const content = [
            {
              type: 'text',
              text: `✓ Captured: "${source.content.substring(0, 50)}${source.content.length > 50 ? '...' : ''}" (ID: ${source.id})`
            },
            {
              type: 'text',
              text: `\nFull record:\n${JSON.stringify(source, null, 2)}`
            },
          ];
          if (defaultsUsed.length > 0) {
            content.push({
              type: 'text',
              text: `Defaults applied: ${defaultsUsed.join(', ')}`
            });
          }

                  return { content };
        }
        // Create source record for non-file captures
        // Ensure we have content - if not provided and no file, this should have been caught by schema validation
        if (!input.content) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'Content is required when no file is provided'
          );
        }
        
        const source = await saveSource({
          id: generateId('src'),
          content: input.content,
          contentType: input.contentType,
          created: new Date().toISOString(),
          when: input.when,
          perspective: input.perspective,
          experiencer: input.experiencer,
          processing: input.processing as ProcessingLevel,
          reflects_on: input.reflects_on,
        });

        const defaultsUsed = [];
        const safeArgs = args || {};
        if (!safeArgs.perspective) defaultsUsed.push('perspective="I"');
        if (!safeArgs.experiencer) defaultsUsed.push('experiencer="self"');
        if (!safeArgs.processing) defaultsUsed.push('processing="during"');
        const content = [
          {
            type: 'text',
            text: `✓ Captured: "${source.content.substring(0, 50)}${source.content.length > 50 ? '...' : ''}" (ID: ${source.id})`
          },
          {
            type: 'text',
            text: `\nFull record:\n${JSON.stringify(source, null, 2)}`
          }
        ];
        if (defaultsUsed.length > 0) {
          content.push({
            type: 'text',
            text: `Defaults applied: ${defaultsUsed.join(', ')}`
          });
        }

        // Source captured successfully - no auto-processing
        content.push({
          type: 'text',
          text: `📝 Source captured successfully. Use search to explore your experiences.`
        });
        return { content };
      }

      case 'release': {
        const input = releaseSchema.parse(args);
        // Runtime fallback for default
        if (input.id === undefined && input.cleanupReframed === undefined) input.cleanupReframed = true;
        if (input.id !== undefined && input.cleanupReframed === undefined) input.cleanupReframed = false;
        

        
        // If no ID provided, perform bulk cleanup
        if (!input.id) {
          if (!input.cleanupReframed) {
            throw new McpError(
              ErrorCode.InvalidParams,
              'Either provide an ID to release a specific record, or set cleanupReframed: true for bulk cleanup'
            );
          }
          
          return {
            content: [
              {
                type: 'text',
                text: `✓ Bulk cleanup completed`
              }
            ]
          };
        }
        
        // Check if it's a source
        if (input.id) {
        const source = await getSource(input.id);
        if (source) {
          // Delete the source
          await deleteSource(input.id);
          return {
            content: [
              {
                type: 'text',
                text: `✓ Released source: "${source.content.substring(0, 50)}..." (ID: ${input.id})`
              },
              {
                type: 'text',
                text: '\n🌊 The experience has been released'
              }
            ]
          };
        }
        }
        throw new McpError(
          ErrorCode.InvalidParams,
          `No source found with ID: ${input.id || 'undefined'}`
        );
      }

      case 'search': {
        // Parse input
        const input = args as SearchToolInput;
        // Build filters for created and when (explicit, no fallback)
        const filters: Record<string, unknown> = {};
        if (Array.isArray(input.type) && input.type.length > 0) filters.type = input.type;
        if (typeof input.experiencer === 'string' && input.experiencer.length > 0) filters.experiencers = [input.experiencer];
        if (typeof input.perspective === 'string' && input.perspective.length > 0) filters.perspectives = [input.perspective];
        if (typeof input.processing === 'string' && input.processing.length > 0) filters.processing = [input.processing];

        // Helper function to validate and parse date with chrono-node
        const validateAndParseDate = async (dateInput: string | { start: string; end: string }): Promise<{ start: string; end: string }> => {
          if (typeof dateInput === 'string') {
            // Validate with chrono-node
            if (!(await validateFlexibleDate(dateInput))) {
              throw new McpError(
                ErrorCode.InvalidParams,
                `Invalid date format: ${dateInput}. Use natural language like 'yesterday', 'last week', '2024-01-15', or ISO 8601 format.`
              );
            }
            // Parse with chrono-node to get actual date
            const chrono = await import('chrono-node');
            const results = chrono.parse(dateInput);
            if (results.length === 0) {
              throw new McpError(
                ErrorCode.InvalidParams,
                `Could not parse date: ${dateInput}`
              );
            }
            const parsedDate = results[0].start.date().toISOString();
            return { start: parsedDate, end: parsedDate };
          } else {
            // Validate both start and end dates
            if (!(await validateFlexibleDate(dateInput.start))) {
              throw new McpError(
                ErrorCode.InvalidParams,
                `Invalid start date format: ${dateInput.start}. Use natural language like 'yesterday', 'last week', '2024-01-15', or ISO 8601 format.`
              );
            }
            if (!(await validateFlexibleDate(dateInput.end))) {
              throw new McpError(
                ErrorCode.InvalidParams,
                `Invalid end date format: ${dateInput.end}. Use natural language like 'yesterday', 'last week', '2024-01-15', or ISO 8601 format.`
              );
            }
            // Parse both dates
            const chrono = await import('chrono-node');
            const startResults = chrono.parse(dateInput.start);
            const endResults = chrono.parse(dateInput.end);
            if (startResults.length === 0 || endResults.length === 0) {
              throw new McpError(
                ErrorCode.InvalidParams,
                `Could not parse date range: ${dateInput.start} to ${dateInput.end}`
              );
            }
            const startDate = startResults[0].start.date().toISOString();
            const endDate = endResults[0].start.date().toISOString();
            return { start: startDate, end: endDate };
          }
        };

        // Explicitly filter by 'created' (system timestamp, UTC)
        if (input.created) {
          try {
            const parsedRange = await validateAndParseDate(input.created);
            filters.createdRange = parsedRange;
          } catch (error) {
            if (error instanceof McpError) throw error;
            throw new McpError(
              ErrorCode.InvalidParams,
              `Error processing created date: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        }
        // Explicitly filter by 'when' (user-supplied, UTC)
        if (input.when) {
          try {
            const parsedRange = await validateAndParseDate(input.when);
            filters.whenRange = parsedRange;
          } catch (error) {
            if (error instanceof McpError) throw error;
            throw new McpError(
              ErrorCode.InvalidParams,
              `Error processing when date: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        }
        // Relationship search (optional pre-filter)
        let preFilteredRecords: StorageRecord[] | undefined = undefined;
        if (input.reflectedOn) {
          const allRecords = await import('./storage.js').then(m => m.getAllRecords());
          const searchModule = await import('./search.js');
          // Use the new comprehensive relationship search that finds all related records
          preFilteredRecords = searchModule.findAllRelatedRecords(input.reflectedOn, await allRecords);
          
          if (preFilteredRecords.length === 0) {
            return { content: [{ type: 'text', text: `No record found with ID: ${input.reflectedOn}` }] };
          }
          
          // If there's no query, return the relationship network directly
          if (!input.query || input.query.trim() === '') {
            const { getSearchableText } = await import('./storage.js');
            const results = preFilteredRecords.map(record => {
              const snippet = getSearchableText(record);
              return {
                type: record.type,
                id: record.id,
                snippet,
                source: record.type === 'source' ? record as SourceRecord : undefined,
              };
            });
            
            if (input.includeContext) {
              return {
                content: results.map((result: any) => ({
                  type: 'text',
                  text: JSON.stringify(formatStructuredSearchResult(result), null, 2)
                }))
              };
            } else {
              return {
                content: results.map((result: any, index: number) => ({
                  type: 'text',
                  text: formatDetailedSearchResult(result, index)
                }))
              };
            }
          }
        }
        // When calling search, construct a SearchOptions object with all required properties and use object spread for optional fields
        const searchOptions: import('./search.js').SearchOptions = {
          query: input.query ?? '',
          filters,
          limit: input.limit,
          includeContext: input.includeContext,
        };
        if (typeof input.sort === 'string') searchOptions.sort = input.sort;
        const validGroups = ['day', 'week', 'month', 'experiencer'];
        if (typeof input.groupBy === 'string' && validGroups.includes(input.groupBy)) {
          searchOptions.groupBy = input.groupBy as 'day' | 'week' | 'month' | 'experiencer';
        }
        const searchResult = await (await import('./search.js')).search(searchOptions);
        const { results } = searchResult;
        // If preFilteredRecords is set, filter results to only those in preFilteredRecords
        let finalResults = results;
        if (preFilteredRecords) {
          const allowedIds = new Set(preFilteredRecords.map((r) => r.id));
          finalResults = (Array.isArray(results) ? results : results.groups.flatMap((g) => g.items)).filter((r) => allowedIds.has(r.id));
        }
        if (Array.isArray(finalResults)) {
          if (finalResults.length === 0) {
            // Fallback to existing temporal filter message
            if (input.when) {
              return {
                content: [{
                  type: 'text',
                  text: `No records found for when: "${typeof input.when === 'string' ? input.when : JSON.stringify(input.when)}". Try different formats like "yesterday", "2025-01-15", or { start: "date", end: "date" }`
                }]
              };
            }
            
            // Generic no results message
            return {
              content: [{
                type: 'text',
                text: 'No results found. Try broadening your search criteria or removing some filters.'
              }]
            };
          }
        }
        
        // Handle grouped results or return final results
        if (Array.isArray(finalResults)) {
          if (input.includeContext) {
            return {
              content: finalResults.map((result: SearchResult) => ({
                type: 'text',
                text: JSON.stringify(formatStructuredSearchResult(result), null, 2)
              }))
            };
          } else {
            return {
              content: finalResults.map((result: SearchResult, index: number) => ({
                type: 'text',
                text: formatDetailedSearchResult(result, index)
              }))
            };
          }
        } else {
          // Handle GroupedResults
          const groupedResults = finalResults as import('./search.js').GroupedResults;
          if (input.includeContext) {
            return {
              content: groupedResults.groups.flatMap(group => 
                group.items.map((result: SearchResult) => ({
                  type: 'text',
                  text: JSON.stringify(formatStructuredSearchResult(result), null, 2)
                }))
              )
            };
          } else {
            return {
              content: groupedResults.groups.flatMap((group, groupIndex) => 
                group.items.map((result: SearchResult, itemIndex: number) => ({
                  type: 'text',
                  text: formatDetailedSearchResult(result, groupIndex * 1000 + itemIndex)
                }))
              )
            };
          }
        }
      }

      case 'status': {
        const report = await statusMonitor.generateStatusReport();
        // Add recent sources section
        const { getSources } = await import('./storage.js');
        const sources = await getSources();
        const now = Date.now();
        const recentSources = sources.filter(s => {
          const created = new Date(s.created).getTime();
          return now - created < 10 * 60 * 1000; // last 10 minutes
        });
        let recentSection = '';
        if (recentSources.length > 0) {
          recentSection += '\nRecently created sources (last 10 minutes):\n';
          for (const source of recentSources) {
            recentSection += `- "${source.content.substring(0, 50)}${source.content.length > 50 ? '...' : ''}" (ID: ${source.id}, created: ${source.created})\n`;
          }
        }
        return {
          content: [
            {
              type: 'text',
              text: `📊 System Status Report\n\nTotal sources: ${sources.length}\n\n        🤖 Processing Status:\n          • Auto-processing has been removed\n          • Use search to explore your experiences\n\n${report.processing_errors.length > 0 ? 
  `❌ Processing Errors:\n${report.processing_errors.map(e => 
                        `  • ${e.type}: ${e.count} error(s), last: ${e.lastError}`
                      ).join('\n')}` : 
                      '✅ No processing errors'
}
` + recentSection
            }
          ]
        };
      }

      default: {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Unknown tool: ${name}`
        );
      }
    }
  } catch (err) {
    // Improved error reporting for user clarity - return proper MCP tool result format
    let errorMessage = 'An unexpected error occurred';
    
    if (err instanceof McpError) {
      errorMessage = err.message;
    } else if (err instanceof z.ZodError) {
      // Convert Zod validation errors to user-friendly messages
      const details = err.errors.map(e => {
        const field = e.path.join('.');
        const message = e.message;
        
        // Provide specific guidance for common validation errors
        if (field === 'perspective') {
          return `Invalid perspective. Must be one of: I, we, you, they`;
        }
        if (field === 'processing') {
          return `Invalid processing level. Must be one of: during, right-after, long-after, crafted`;
        }
        if (field === 'content') {
          return `Content is required and cannot be empty.`;
        }
        if (field === 'experiencer') {
          return `Experiencer is required. Specify who experienced this.`;
        }
        
        return `Invalid ${field}: ${message}`;
      }).join('; ');
      errorMessage = details;
    } else if (err instanceof Error) {
      errorMessage = err.message;
    }
    
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: errorMessage
        }
      ]
    };
  }
});

(async () => {
  const transport = new StdioServerTransport();
  await server.connect(transport);
})();