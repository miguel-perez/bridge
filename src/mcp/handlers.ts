import { CaptureService } from '../services/capture.js';
import { ReleaseService } from '../services/release.js';
import { SearchService, type SearchInput, type SearchServiceResult } from '../services/search.js';
// import { StatusService } from '../services/status.js';

// Utility to strip content_embedding from Source/SourceRecord(s)
function stripEmbeddings<T extends object>(obj: T): T {
  if (Array.isArray(obj)) {
    return obj.map(stripEmbeddings) as any;
  } else if (obj && typeof obj === 'object' && obj !== null) {
    // Omit content_embedding
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { content_embedding, ...rest } = obj as any;
    // Recursively strip from nested objects (e.g., recentSources)
    for (const key in rest) {
      if (Object.prototype.hasOwnProperty.call(rest, key)) {
        rest[key] = stripEmbeddings(rest[key]);
      }
    }
    return rest as T;
  }
  return obj;
}

export class MCPToolHandlers {
  private captureService: CaptureService;
  private releaseService: ReleaseService;
  private searchService: SearchService;
  // private statusService: StatusService;

  constructor() {
    this.captureService = new CaptureService();
    this.releaseService = new ReleaseService();
    this.searchService = new SearchService();
    // this.statusService = new StatusService();
  }

  // Capture handler
  async handleCapture(args: any) {
    const input = args as any;
    const result = await this.captureService.captureSource(input);
    // Strip embeddings from the returned source
    return {
      content: [{
        type: 'text',
        text: `Captured source with ID: ${result.source.id}`
      }],
      source: stripEmbeddings(result.source)
    };
  }

  // Release handler
  async handleRelease(args: any) {
    const input = args as any;
    const result = await this.releaseService.releaseSource(input);
    // Strip embeddings from the released source if present
    return {
      content: [{
        type: 'text',
        text: result.message
      }],
      releasedSource: result.releasedSource ? stripEmbeddings(result.releasedSource) : undefined
    };
  }

  // Search handler
  async handleSearch(args: SearchInput) {
    const { results, stats } = await this.searchService.search(args);
    
    if (results.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No results found for your search criteria.\n\nApplied filters: ${JSON.stringify(stats?.filters || {}, null, 2)}`
        }]
      };
    }
    
    // Create a summary of the search
    const summary = `Found ${results.length} result(s)${stats?.total ? ` out of ${stats.total} total records` : ''}.\n\nApplied filters: ${JSON.stringify(stats?.filters || {}, null, 2)}`;
    
    // Format results with relevance scores, strip embeddings from each result
    const resultContent = results.map((result: SearchServiceResult, index: number) => {
      const relevanceInfo = `Relevance Score: ${(result.relevance_score * 100).toFixed(1)}%`;
      const breakdownInfo = result.relevance_breakdown ? 
        `\nBreakdown: ${JSON.stringify(result.relevance_breakdown, null, 2)}` : '';
      
      return {
        type: 'text',
        text: `Result ${index + 1} (${relevanceInfo}):\n${JSON.stringify(stripEmbeddings(result), null, 2)}${breakdownInfo}`
      };
    });
    
    return {
      content: [
        { type: 'text', text: summary },
        ...resultContent
      ]
    };
  }

  // Status handler REMOVED
} 