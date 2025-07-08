import { z } from 'zod';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { CaptureService, captureSchema } from '../services/capture.js';
import { ReleaseService, releaseSchema } from '../services/release.js';
import { SearchService, type SearchToolInput } from '../services/search.js';
import { StatusService } from '../services/status.js';
import { formatDetailedSearchResult, formatStructuredSearchResult } from '../utils/formatters.js';
import type { SearchResult } from '../core/search.js';

export class MCPToolHandlers {
  private captureService: CaptureService;
  private releaseService: ReleaseService;
  private searchService: SearchService;
  private statusService: StatusService;

  constructor() {
    this.captureService = new CaptureService();
    this.releaseService = new ReleaseService();
    this.searchService = new SearchService();
    this.statusService = new StatusService();
  }

  async handleCapture(args: any) {
    let input;
    try {
      input = captureSchema.parse(args);
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

    const result = await this.captureService.captureSource(input);
    const { source, defaultsUsed } = result;

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

  async handleRelease(args: any) {
    const input = releaseSchema.parse(args);
    const result = await this.releaseService.releaseSource(input);
    
    return {
      content: [
        {
          type: 'text',
          text: result.message
        }
      ]
    };
  }

  async handleSearch(args: any) {
    const input = args as SearchToolInput;
    const searchResult = await this.searchService.search(input);
    const { results } = searchResult;

    if (Array.isArray(results)) {
      if (results.length === 0) {
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
    if (Array.isArray(results)) {
      if (input.includeContext) {
        return {
          content: results.map((result: SearchResult) => ({
            type: 'text',
            text: JSON.stringify(formatStructuredSearchResult(result), null, 2)
          }))
        };
      } else {
        return {
          content: results.map((result: SearchResult, index: number) => ({
            type: 'text',
            text: formatDetailedSearchResult(result, index)
          }))
        };
      }
    } else {
      // Handle GroupedResults
      const groupedResults = results as any;
      if (input.includeContext) {
        return {
          content: groupedResults.groups.flatMap((group: any) => 
            group.items.map((result: SearchResult) => ({
              type: 'text',
              text: JSON.stringify(formatStructuredSearchResult(result), null, 2)
            }))
          )
        };
      } else {
        return {
          content: groupedResults.groups.flatMap((group: any, groupIndex: number) => 
            group.items.map((result: SearchResult, itemIndex: number) => ({
              type: 'text',
              text: formatDetailedSearchResult(result, groupIndex * 1000 + itemIndex)
            }))
          )
        };
      }
    }
  }

  async handleStatus() {
    const status = await this.statusService.getStatus();
    
    let recentSection = '';
    if (status.recentSources.length > 0) {
      recentSection += '\nRecently created sources (last 10 minutes):\n';
      for (const source of status.recentSources) {
        recentSection += `- "${source.content.substring(0, 50)}${source.content.length > 50 ? '...' : ''}" (ID: ${source.id}, created: ${source.created})\n`;
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: `📊 System Status Report\n\nTotal sources: ${status.totalSources}\n\n${status.processingStatus}\n\n${status.processingErrors}${recentSection}`
        }
      ]
    };
  }
} 