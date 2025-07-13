/**
 * MCP Tool Handlers for Bridge
 * 
 * This module provides the implementation of MCP tool handlers for Bridge,
 * including capture, release, search, and update operations.
 * 
 * @module mcp/handlers
 */

import { CaptureService } from '../services/capture.js';
import { ReleaseService } from '../services/release.js';
import { SearchService, type SearchInput, type SearchServiceResult } from '../services/search.js';
import { EnrichService } from '../services/enrich.js';
import type { SourceRecord, Experience } from '../core/types.js';

// ============================================================================
// CONSTANTS
// ============================================================================

const CONTENT_SNIPPET_LENGTH = 200;
const RELEVANCE_PERCENT_PRECISION = 0;

// ============================================================================
// FORMATTING UTILITIES
// ============================================================================

/**
 * Formats experience (qualities + emoji) as a readable bulleted list
 *
 * @param experience - The experience object to format
 * @returns Formatted string representation of the experience
 */
function formatExperience(experience: Experience | undefined): string {
  if (!experience || !experience.qualities || experience.qualities.length === 0) {
    return 'No experiential qualities analyzed';
  }
  const emoji = experience.emoji ? `${experience.emoji} ` : '';
  const qualityLines = experience.qualities.map(q => {
    const score = (q.prominence * 100).toFixed(RELEVANCE_PERCENT_PRECISION);
    return `• ${q.type} (${score}%): ${q.manifestation}`;
  });
  return `${emoji}\n${qualityLines.join('\n')}`;
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
 * Prefers narrative for display if available
 * 
 * @param content - The content to format
 * @param narrative - Optional narrative to prefer over content
 * @param includeFullContent - Whether to include full content
 * @returns Formatted content string
 */
function formatContent(content: string, narrative?: string, includeFullContent?: boolean): string {
  // Prefer narrative for display if available
  const displayText = narrative || content;
  
  if (!displayText) return 'No content';
  
  if (includeFullContent || displayText.length <= CONTENT_SNIPPET_LENGTH) {
    return displayText;
  }
  
  return displayText.substring(0, CONTENT_SNIPPET_LENGTH) + '...';
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
 * Provides handlers for all MCP tools including capture, release, search, and update.
 * Each handler formats the response in a user-friendly way for MCP clients.
 */
export class MCPToolHandlers {
  private captureService: CaptureService;
  private releaseService: ReleaseService;
  private searchService: SearchService;
  private updateService: EnrichService; // Keeping enrich service but calling it update

  constructor() {
    this.captureService = new CaptureService();
    this.releaseService = new ReleaseService();
    this.searchService = new SearchService();
    this.updateService = new EnrichService();
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
  async handleCapture(args: any): Promise<{ content: Array<{ type: string; text: string }> }> {
    // Support both old single-item format and new batch format
    const experiences = args.experiences || [args];
    const results = [];
    
    for (const experience of experiences) {
      const result = await this.captureService.captureSource(experience);
      const content = `✓ Captured experience for ${result.source.experiencer}
ID: ${result.source.id}
Occurred: ${formatDate(result.source.occurred || result.source.system_time)}

${result.source.experience?.narrative ? 'Narrative: ' : 'Content: '}${formatContent(result.source.content, result.source.experience?.narrative, true)}

Experience:\n${formatExperience(result.source.experience)}

${result.defaultsUsed.length > 0 ? `Defaults used: ${result.defaultsUsed.join(', ')}` : ''}`;
      results.push(content);
    }
    const summary = experiences.length > 1 ? `Captured ${experiences.length} experiences:\n\n` : '';
    return {
      content: [{ type: 'text', text: summary + results.join('\n\n---\n\n') }]
    };
  }

  /**
   * Handles release tool requests - supports both single items and batch operations
   * 
   * Releases (deletes) one or more source records by ID and returns a confirmation message.
   * 
   * @param args - The release arguments containing the record IDs
   * @returns Formatted release result
   */
  async handleRelease(args: any): Promise<{ content: Array<{ type: string; text: string }> }> {
    // Support both old single-item format and new batch format
    const releases = args.releases || [{ source_id: args.source_id, reason: args.reason }];
    const results = [];
    
    for (const release of releases) {
      await this.releaseService.releaseSource({ id: release.source_id });
      
      const content = `✓ Released experience
ID: ${release.source_id}
Reason: ${release.reason || 'No reason provided'}`;
      
      results.push(content);
    }

    const summary = releases.length > 1 ? `Released ${releases.length} experiences:\n\n` : '';
    const footer = releases.length > 1 ? '\n\nAll records have been permanently deleted from your experiential data.' : 
                   '\n\nThe record has been permanently deleted from your experiential data.';
    
    return {
      content: [{ type: 'text', text: summary + results.join('\n\n') + footer }]
    };
  }

  /**
   * Handles search tool requests - supports both single queries and batch operations
   * 
   * Performs one or more searches across all records and returns formatted results with
   * relevance scores and breakdowns.
   * 
   * @param args - The search arguments
   * @returns Formatted search results
   */
  async handleSearch(args: any): Promise<{ content: Array<{ type: string; text: string }> }> {
    // Support both old single-query format and new batch format
    const queries = args.queries || [args];
    const allResults = [];
    
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      const { results, stats } = await this.searchService.search(query as SearchInput);
      
      if (results.length === 0) {
        const filters = stats?.filters ? Object.entries(stats.filters)
          .filter(([, v]) => v !== undefined && v !== '')
          .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
          .join(', ') : 'none';
        
        allResults.push({
          type: 'text',
          text: `${queries.length > 1 ? `Query ${i + 1}: ` : ''}No results found for "${query.query}".\n\nApplied filters: ${filters}`
        });
        continue;
      }
      
      // Create a summary of the search
      const totalResults = stats?.total || results.length;
      const offset = query.offset || 0;
      const limit = query.limit || 10;
      const showingText = offset > 0 ? ` (showing ${offset + 1}-${Math.min(offset + limit, totalResults)} of ${totalResults})` : '';
      const summary = `${queries.length > 1 ? `Query ${i + 1}: ` : ''}Found ${results.length} result(s) for "${query.query}"${stats?.total ? ` out of ${stats.total} total records` : ''}${showingText}.`;
      
      // Format each result
      const resultContent = results.map((result: SearchServiceResult, index: number) => {
        const relevancePercent = (result.relevance_score * 100).toFixed(RELEVANCE_PERCENT_PRECISION);
        const metadata = result.metadata ? formatMetadata(result.metadata as SourceRecord) : 'Unknown metadata';
        
        let resultText = `Result ${index + 1} (Relevance: ${relevancePercent}%)
ID: ${result.id} | ${metadata}

${formatContent(result.snippet, result.metadata?.experience?.narrative, query.includeFullContent)}

Relevance: ${formatRelevanceBreakdown(result.relevance_breakdown)}`;

        // Add qualities if available and includeContext is true
        if (query.includeContext && result.metadata?.experience) {
          resultText += `\n\nQualities:\n${formatExperience(result.metadata.experience)}`;
        }

        return {
          type: 'text',
          text: resultText
        };
      });
      
      allResults.push(
        { type: 'text', text: summary },
        ...resultContent
      );
      
      // Add separator between queries if there are multiple
      if (i < queries.length - 1) {
        allResults.push({ type: 'text', text: '\n---\n' });
      }
    }
    
    return {
      content: allResults
    };
  }

  /**
   * Handles update tool requests - supports both single items and batch operations
   * 
   * Updates one or more existing source records with corrected fields and returns
   * a formatted response showing what was updated.
   * 
   * @param args - The update arguments
   * @returns Formatted update result
   */
  async handleUpdate(args: any): Promise<{ content: Array<{ type: string; text: string }> }> {
    // Support both old single-item format and new batch format
    const updates = args.updates || [args];
    const results = [];
    
    for (const update of updates) {
      // Map the tool input to the service input format
      const updateInput = {
        id: update.source_id,
        content: update.content,
        contentType: update.contentType,
        perspective: update.perspective,
        processing: update.processing,
        occurred: update.occurred,
        experiencer: update.experiencer,
        crafted: update.crafted,
        experience: update.experience,
        regenerate_embeddings: update.regenerate_embeddings
      };
      
      const result = await this.updateService.enrichSource(updateInput);
      
      let content = `✓ Updated experience ${result.source.id}`;
      
      if (result.updatedFields.length > 0) {
        content += `\nCorrected fields: ${result.updatedFields.join(', ')}`;
      } else {
        content += '\nNo fields needed correction';
      }

      if (result.embeddingsRegenerated) {
        content += '\nEmbeddings were regenerated';
      }

      // Show updated content if content was changed
      if (result.updatedFields.includes('content')) {
        content += `\n\nCorrected Content:\n${formatContent(result.source.content)}`;
      }

      // Show updated narrative if narrative was changed
      if (result.updatedFields.includes('experience') && result.source.experience?.narrative) {
        content += `\n\nCorrected Narrative:\n${formatContent(result.source.content, result.source.experience.narrative)}`;
      }

      // Show updated qualities if qualities were changed
      if (result.updatedFields.includes('experience')) {
        content += `\n\nCorrected Experience:\n${formatExperience(result.source.experience)}`;
      }
      
      results.push(content);
    }

    const summary = updates.length > 1 ? `Updated ${updates.length} experiences:\n\n` : '';
    
    return {
      content: [{ type: 'text', text: summary + results.join('\n\n---\n\n') }]
    };
  }
} 