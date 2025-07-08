/**
 * MCP Tool Handlers for Bridge
 * 
 * This module provides the implementation of MCP tool handlers for Bridge,
 * including capture, release, search, and enrich operations.
 * 
 * @module mcp/handlers
 */

import { CaptureService } from '../services/capture.js';
import { ReleaseService } from '../services/release.js';
import { SearchService, type SearchInput, type SearchServiceResult } from '../services/search.js';
import { EnrichService } from '../services/enrich.js';
import type { SourceRecord, ExperientialQualities } from '../core/types.js';

// ============================================================================
// CONSTANTS
// ============================================================================

const CONTENT_SNIPPET_LENGTH = 200;
const RELEVANCE_PERCENT_PRECISION = 0;

// ============================================================================
// FORMATTING UTILITIES
// ============================================================================

/**
 * Formats experiential qualities as a readable bulleted list
 * 
 * @param qualities - The experiential qualities to format
 * @returns Formatted string representation of the qualities
 */
function formatExperientialQualities(qualities: ExperientialQualities): string {
  if (!qualities.qualities || qualities.qualities.length === 0) {
    return 'No experiential qualities analyzed';
  }
  
  const qualityLines = qualities.qualities.map(q => {
    const score = (q.prominence * 100).toFixed(RELEVANCE_PERCENT_PRECISION);
    return `• ${q.type} (${score}%): ${q.manifestation}`;
  });
  
  return qualityLines.join('\n');
}

/**
 * Formats ISO date as human-readable date
 * 
 * @param isoDate - ISO date string to format
 * @returns Human-readable date string
 */
function formatDate(isoDate: string): string {
  if (!isoDate) return 'Unknown date';
  
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return 'Invalid date';
    
    // Check if it's today, yesterday, or a specific date
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (dateOnly.getTime() === today.getTime()) {
      return 'Today';
    } else if (dateOnly.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  } catch {
    return 'Invalid date';
  }
}

/**
 * Formats metadata line for search results
 * 
 * @param source - The source record to format metadata for
 * @returns Formatted metadata string
 */
function formatMetadata(source: SourceRecord): string {
  const parts = [
    source.experiencer || 'Unknown',
    source.perspective || 'Unknown perspective',
    source.processing || 'Unknown processing'
  ];
  
  if (source.occurred) {
    parts.push(formatDate(source.occurred));
  }
  
  return parts.join(' | ');
}

/**
 * Formats content snippet (first 200 chars or full if short)
 * 
 * @param content - The content to format
 * @param includeFullContent - Whether to include full content
 * @returns Formatted content string
 */
function formatContent(content: string, includeFullContent?: boolean): string {
  if (!content) return 'No content';
  
  if (includeFullContent || content.length <= CONTENT_SNIPPET_LENGTH) {
    return content;
  }
  
  return content.substring(0, CONTENT_SNIPPET_LENGTH) + '...';
}

/**
 * Formats relevance breakdown for search results
 * 
 * @param breakdown - The relevance breakdown object
 * @returns Formatted relevance breakdown string
 */
function formatRelevanceBreakdown(breakdown: any): string {
  if (!breakdown) return 'No breakdown available';
  
  const parts = [];
  if (breakdown.text_match !== undefined) {
    parts.push(`Text match: ${(breakdown.text_match * 100).toFixed(RELEVANCE_PERCENT_PRECISION)}%`);
  }
  if (breakdown.vector_similarity !== undefined) {
    parts.push(`Vector similarity: ${(breakdown.vector_similarity * 100).toFixed(RELEVANCE_PERCENT_PRECISION)}%`);
  }
  if (breakdown.semantic_similarity !== undefined) {
    parts.push(`Semantic similarity: ${(breakdown.semantic_similarity * 100).toFixed(RELEVANCE_PERCENT_PRECISION)}%`);
  }
  if (breakdown.filter_relevance !== undefined) {
    parts.push(`Filters: ${(breakdown.filter_relevance * 100).toFixed(RELEVANCE_PERCENT_PRECISION)}%`);
  }
  
  return parts.join(' | ') || 'No relevance breakdown';
}

// ============================================================================
// MCP TOOL HANDLERS
// ============================================================================

/**
 * MCP Tool Handlers class
 * 
 * Provides handlers for all MCP tools including capture, release, search, and enrich.
 * Each handler formats the response in a user-friendly way for MCP clients.
 */
export class MCPToolHandlers {
  private captureService: CaptureService;
  private releaseService: ReleaseService;
  private searchService: SearchService;
  private enrichService: EnrichService;

  constructor() {
    this.captureService = new CaptureService();
    this.releaseService = new ReleaseService();
    this.searchService = new SearchService();
    this.enrichService = new EnrichService();
  }

  /**
   * Handles capture tool requests
   * 
   * Captures a new experiential source record and returns a formatted response
   * showing the captured data and any defaults that were applied.
   * 
   * @param args - The capture arguments
   * @returns Formatted capture result
   */
  async handleCapture(args: any) {
    const input = args as any;
    const result = await this.captureService.captureSource(input);
    
    const content = `✓ Captured experience for ${result.source.experiencer}
ID: ${result.source.id}
Occurred: ${formatDate(result.source.occurred || result.source.system_time)}

Content: ${formatContent(result.source.content)}

Experiential Analysis:
${formatExperientialQualities(result.source.experiential_qualities || { qualities: [], vector: { embodied: 0, attentional: 0, affective: 0, purposive: 0, spatial: 0, temporal: 0, intersubjective: 0 } })}

${result.defaultsUsed.length > 0 ? `Defaults used: ${result.defaultsUsed.join(', ')}` : ''}`;

    return {
      content: [{ type: 'text', text: content }]
    };
  }

  /**
   * Handles release tool requests
   * 
   * Releases (deletes) a source record by ID and returns a confirmation message.
   * 
   * @param args - The release arguments containing the record ID
   * @returns Formatted release result
   */
  async handleRelease(args: any) {
    const input = args as any;
    const result = await this.releaseService.releaseSource(input);
    
    return {
      content: [{ type: 'text', text: result.message }]
    };
  }

  /**
   * Handles search tool requests
   * 
   * Performs a search across all records and returns formatted results with
   * relevance scores and breakdowns.
   * 
   * @param args - The search arguments
   * @returns Formatted search results
   */
  async handleSearch(args: SearchInput) {
    const { results, stats } = await this.searchService.search(args);
    
    if (results.length === 0) {
      const filters = stats?.filters ? Object.entries(stats.filters)
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
        .join(', ') : 'none';
      
      return {
        content: [{
          type: 'text',
          text: `No results found for your search criteria.\n\nApplied filters: ${filters}`
        }]
      };
    }
    
    // Create a summary of the search
    const summary = `Found ${results.length} result(s)${stats?.total ? ` out of ${stats.total} total records` : ''}.`;
    
    // Format each result
    const resultContent = results.map((result: SearchServiceResult, index: number) => {
      const relevancePercent = (result.relevance_score * 100).toFixed(RELEVANCE_PERCENT_PRECISION);
      const metadata = result.metadata ? formatMetadata(result.metadata as SourceRecord) : 'Unknown metadata';
      
      let resultText = `Result ${index + 1} (Relevance: ${relevancePercent}%)
ID: ${result.id} | ${metadata}

${formatContent(result.snippet, args.includeFullContent)}

Relevance: ${formatRelevanceBreakdown(result.relevance_breakdown)}`;

      // Add qualities if available and includeContext is true
      if (args.includeContext && result.metadata?.experiential_qualities) {
        resultText += `\n\nQualities:\n${formatExperientialQualities(result.metadata.experiential_qualities as ExperientialQualities)}`;
      }

      return {
        type: 'text',
        text: resultText
      };
    });
    
    return {
      content: [
        { type: 'text', text: summary },
        ...resultContent
      ]
    };
  }

  /**
   * Handles enrich tool requests
   * 
   * Enriches an existing source record with updated fields and returns
   * a formatted response showing what was updated.
   * 
   * @param args - The enrich arguments
   * @returns Formatted enrich result
   */
  async handleEnrich(args: any) {
    const input = args as any;
    const result = await this.enrichService.enrichSource(input);
    
    let content = `✓ Enriched experience ${result.source.id}
Updated: ${result.updatedFields.join(', ')}`;

    if (result.embeddingsRegenerated) {
      content += '\nEmbeddings were regenerated';
    }

    // Show updated content if content was changed
    if (result.updatedFields.includes('content')) {
      content += `\n\nUpdated Content:\n${formatContent(result.source.content)}`;
    }

    // Show updated qualities if qualities were changed
    if (result.updatedFields.includes('experiential_qualities')) {
      content += `\n\nUpdated Experiential Analysis:\n${formatExperientialQualities(result.source.experiential_qualities || { qualities: [], vector: { embodied: 0, attentional: 0, affective: 0, purposive: 0, spatial: 0, temporal: 0, intersubjective: 0 } })}`;
    }
    
    return {
      content: [{ type: 'text', text: content }]
    };
  }
} 