/**
 * Formatter Utilities for Bridge
 *
 * This module provides formatting functions for search results and other
 * data structures, ensuring consistent output formatting across the application.
 */

import type { SearchResult } from '../core/search.js';
import { Messages, formatMessage, formatQualityList } from './messages.js';

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_TRUNCATE_LENGTH = 600;
const ELLIPSIS = '...';
const NO_SUMMARY_PLACEHOLDER = '[no summary]';

// ============================================================================
// TEXT FORMATTING FUNCTIONS
// ============================================================================

/**
 * Smart word-boundary truncation with ellipsis
 *
 * Truncates text at word boundaries to avoid cutting words in half.
 * If no word boundary is found within the limit, truncates at the limit.
 *
 * @param text - The text to truncate
 * @param maxLength - Maximum length before truncation (default: 120)
 * @returns Truncated text with ellipsis if needed
 */
export function smartTruncate(text: string, maxLength: number = DEFAULT_TRUNCATE_LENGTH): string {
  if (text.length <= maxLength) return text;

  // Find last space before maxLength
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > 0) {
    return truncated.slice(0, lastSpace) + ELLIPSIS;
  }
  return truncated + ELLIPSIS;
}

// ============================================================================
// SEARCH RESULT FORMATTERS
// ============================================================================

/**
 * Simple formatter for search results - consistent base format
 *
 * Provides a standardized format for search results that includes
 * the result type, ID, and a truncated summary.
 *
 * @param result - The search result to format
 * @param index - The index of the result (0-based)
 * @param showId - Whether to show the ID (default: false)
 * @returns Formatted search result string
 */
export function formatSearchResult(
  result: SearchResult,
  index: number,
  showId: boolean = false
): string {
  const label = String(result.type ?? '');
  let summary: string;

  if (typeof result.snippet === 'string') {
    summary = smartTruncate(result.snippet);
  } else if (typeof result.id === 'string' && showId) {
    summary = result.id;
  } else {
    summary = NO_SUMMARY_PLACEHOLDER;
  }

  const idPart = showId ? ` (ID: ${result.id})` : '';
  return `${index + 1}. [${label.toUpperCase()}]${idPart} ${summary}`;
}

/**
 * Enhanced formatter for detailed results
 *
 * Extends the base search result format with additional context
 * based on the record type, such as perspective and processing level.
 *
 * @param result - The search result to format
 * @param index - The index of the result (0-based)
 * @param showId - Whether to show the ID (default: false)
 * @returns Detailed formatted search result string
 */
export function formatDetailedSearchResult(
  result: SearchResult,
  index: number,
  showId: boolean = false
): string {
  const baseFormat = formatSearchResult(result, index, showId);

  // Additional context removed with perspective/processing fields
  return baseFormat;
}

/**
 * Structured formatter for JSON output
 *
 * Converts search results to a structured object format suitable
 * for JSON serialization or programmatic processing.
 *
 * @param result - The search result to format
 * @returns Structured object representation of the search result
 */
export function formatStructuredSearchResult(result: SearchResult): Record<string, unknown> {
  const base: Record<string, unknown> = {
    type: result.type,
    id: result.id,
    snippet: result.snippet,
    relevance: result.relevance,
  };

  // Add full record data when available
  if (result.source) base.source = result.source;

  return base;
}

// ============================================================================
// CONVERSATIONAL RESPONSE FORMATTERS
// ============================================================================

/**
 * Interface for experience operation results
 */
export interface ExperienceResult {
  source: {
    id: string;
    source: string;
    emoji: string;
    who?: string | string[];
    created: string;
    experienceQualities?: {
      embodied: string | false;
      focus: string | false;
      mood: string | false;
      purpose: string | false;
      space: string | false;
      time: string | false;
      presence: string | false;
    };
  };
  defaultsUsed?: string[];
}

/**
 * Interface for recall operation results
 */
export interface RecallResult {
  id: string;
  type: string;
  content?: string;
  snippet?: string;
  metadata?: {
    created: string;
    who?: string | string[];
    experience?: string[];
    emoji?: string;
    experienceQualities?: {
      embodied: string | false;
      focus: string | false;
      mood: string | false;
      purpose: string | false;
      space: string | false;
      time: string | false;
      presence: string | false;
    };
  };
  relevance_score?: number;
}

// ============================================================================
// NEW COMPREHENSIVE RESPONSE STRUCTURES (Prompt 2)
// ============================================================================

/**
 * Interface for recall search parameters (matching schema)
 */
export interface RecallSearchParams {
  // Exact ID lookup
  ids?: string | string[];

  // Semantic search (renamed from 'query')
  search?: string;

  // Grouping behavior (replacing 'as')
  group_by?: 'similarity' | 'who' | 'date' | 'qualities' | 'none';

  // Existing filters
  who?: string;
  qualities?: unknown; // QualityFilters type
  created?: string | { start: string; end: string };
  reflects?: 'only';
  reflected_by?: string | string[];

  // Individual quality dimensions
  embodied?: string;
  focus?: string;
  mood?: string;
  purpose?: string;
  space?: string;
  time?: string;
  presence?: string;

  // Display options
  limit?: number;
  offset?: number;
  sort?: 'relevance' | 'created';
}

/**
 * Response structure for flat (ungrouped) results
 */
export interface RecallResponse {
  results: RecallResult[];
  summary: {
    // Core counts
    totalMatches: number; // Total in database matching filters
    returnedCount: number; // Number in this response

    // Pagination info
    range?: {
      start: number; // 1-based index
      end: number; // 1-based index
    };

    // Search metadata
    searchType: 'ids' | 'semantic' | 'filters' | 'mixed';
    searchDescription: string; // Human-readable with ALL parameters

    // All active parameters
    activeFilters: RecallSearchParams;
  };
}

/**
 * Response structure for grouped results
 */
export interface GroupedRecallResponse {
  groups: Array<{
    key: string | Date | string[]; // QualitySignature represented as string[]
    label: string; // Human-readable group name
    count: number; // Experiences in this group
    experiences: RecallResult[];

    // For similarity groups
    commonQualities?: string[];
    themeSummary?: string;
  }>;
  summary: {
    // Grouping metadata
    groupType: 'similarity' | 'who' | 'date' | 'qualities';
    groupCount: number;
    totalExperiences: number;

    // Same as flat response
    searchType: 'ids' | 'semantic' | 'filters' | 'mixed';
    searchDescription: string;
    activeFilters: RecallSearchParams;
  };
}

/**
 * Union type for all recall responses
 */
export type ComprehensiveRecallResponse = RecallResponse | GroupedRecallResponse;

// ============================================================================
// COMPREHENSIVE FEEDBACK STRING GENERATOR (Prompt 3)
// ============================================================================

/**
 * Generate comprehensive search feedback from response summary
 *
 * @param summary - Response summary containing metadata and active filters
 * @returns Human-readable feedback string describing the search and results
 */
export function generateSearchFeedback(
  summary: RecallResponse['summary'] | GroupedRecallResponse['summary']
): string {
  let feedback = '';

  // 1. Base result count
  if ('groupType' in summary) {
    // Grouped response
    feedback = `Found ${summary.groupCount} ${summary.groupType} groups containing ${summary.totalExperiences} experiences`;
  } else {
    // Flat response
    feedback = `Found ${summary.totalMatches} experiences`;
  }

  // 2. Add search/ID context
  if (summary.activeFilters.ids) {
    const idCount = Array.isArray(summary.activeFilters.ids) ? summary.activeFilters.ids.length : 1;
    feedback +=
      idCount === 1
        ? ` for experience ID ${summary.activeFilters.ids}`
        : ` for ${idCount} specific experience IDs`;
  } else if (summary.activeFilters.search) {
    feedback += ` for '${summary.activeFilters.search}'`;
  } else if (hasNonSearchFilters(summary.activeFilters)) {
    feedback += ' matching filters';
  } else {
    // No filters at all
    feedback = feedback.replace('experiences', 'all experiences');
  }

  // 3. Add each active filter
  if (summary.activeFilters.who) {
    feedback += ` by ${summary.activeFilters.who}`;
  }


  if (summary.activeFilters.reflects === 'only') {
    feedback += ' (pattern realizations only)';
  }

  if (summary.activeFilters.reflected_by) {
    const count = Array.isArray(summary.activeFilters.reflected_by)
      ? summary.activeFilters.reflected_by.length
      : 1;
    feedback +=
      count === 1
        ? ` reflected by ${summary.activeFilters.reflected_by}`
        : ` reflected by ${count} experiences`;
  }

  if (summary.activeFilters.qualities) {
    feedback += ' with ' + formatQualityFilters(summary.activeFilters.qualities);
  }

  // Check for individual quality dimensions in activeFilters
  const qualityDimensions = [
    'embodied',
    'focus',
    'mood',
    'purpose',
    'space',
    'time',
    'presence',
  ] as const;
  for (const dimension of qualityDimensions) {
    const value = summary.activeFilters[dimension];
    if (value) {
      feedback += ` with ${dimension}: ${value}`;
    }
  }

  if (summary.activeFilters.created) {
    feedback += ' ' + formatDateFilter(summary.activeFilters.created);
  }

  // 4. Add sort if not default
  if (summary.activeFilters.sort === 'created') {
    feedback += ' sorted by creation date';
  }

  // 5. Add pagination/limit info
  if ('totalMatches' in summary && summary.totalMatches > summary.returnedCount) {
    if (summary.range) {
      feedback += ` (showing ${summary.range.start}-${summary.range.end})`;
    } else {
      feedback += ` (showing first ${summary.returnedCount})`;
    }
  }

  return feedback;
}

/**
 * Check if any filters besides ids/search are active
 *
 * @param filters - Active filters object
 * @returns True if non-search filters are present
 */
function hasNonSearchFilters(filters: RecallSearchParams): boolean {
  const searchKeys = ['ids', 'search'];
  const filterKeys = Object.keys(filters).filter((key) => !searchKeys.includes(key));
  return filterKeys.some((key) => filters[key as keyof RecallSearchParams] !== undefined);
}

/**
 * Convert quality filters to readable text
 *
 * @param qualities - Quality filters object
 * @returns Human-readable quality filter description
 */
function formatQualityFilters(qualities: unknown): string {
  if (!qualities || typeof qualities !== 'object') {
    return 'qualities';
  }

  const qualityParts: string[] = [];

  for (const [quality, filter] of Object.entries(qualities)) {
    if (typeof filter === 'string') {
      qualityParts.push(`${quality}.${filter}`);
    } else if (Array.isArray(filter)) {
      qualityParts.push(`${quality}.[${filter.join(' OR ')}]`);
    } else if (typeof filter === 'object' && filter !== null && 'present' in filter) {
      const presentFilter = filter as { present: boolean };
      qualityParts.push(`${presentFilter.present ? 'with' : 'without'} ${quality}`);
    } else {
      qualityParts.push(quality);
    }
  }

  return qualityParts.length > 0 ? qualityParts.join(', ') : 'qualities';
}

/**
 * Convert date filter to readable text
 *
 * @param dateFilter - Date filter (string or date range)
 * @returns Human-readable date filter description
 */
function formatDateFilter(dateFilter: string | { start: string; end: string }): string {
  if (typeof dateFilter === 'string') {
    return `from ${dateFilter}`;
  } else if (
    dateFilter &&
    typeof dateFilter === 'object' &&
    'start' in dateFilter &&
    'end' in dateFilter
  ) {
    return `from ${dateFilter.start} to ${dateFilter.end}`;
  }
  return 'with date filter';
}

/**
 * Format a experience response with natural language
 *
 * Transforms technical experience results into conversational responses
 * while preserving all technical data.
 *
 * @param result - The experience operation result
 * @param showId - Whether to show the ID (default: false)
 * @returns Natural language response string
 */
export function formatExperienceResponse(
  result: ExperienceResult,
  showId: boolean = false
): string {
  const emoji = result.source.emoji;
  const sourceText = result.source.source;
  
  // Start with emoji and source
  let response = `${emoji} ${sourceText}\n`;
  
  // Get quality details if available
  if (result.source.experienceQualities) {
    const qualityDetails = formatQualityDetails(result.source.experienceQualities);
    
    if (qualityDetails.length > 0) {
      response += '\nExperienced with:\n' + qualityDetails.join('\n');
    } else {
      response += Messages.experience.success;
    }
  } else {
    response += Messages.experience.success;
  }

  return [response, '', formatMetadata(result.source, showId)].join('\n');
}

/**
 * Format quality details showing full sentences
 * 
 * @param qualities - The experience qualities object
 * @returns Formatted quality details
 */
function formatQualityDetails(qualities: Record<string, string | false>): string[] {
  const details: string[] = [];
  
  for (const [quality, value] of Object.entries(qualities)) {
    if (value !== false && typeof value === 'string') {
      details.push(`• ${quality}: "${value}"`);
    }
  }
  
  return details;
}

/**
 * Format a batch experience response with natural language
 *
 * @param results - Array of experience operation results
 * @param showIds - Whether to show IDs (default: false)
 * @returns Natural language response string
 */
export function formatBatchExperienceResponse(
  results: ExperienceResult[],
  showIds: boolean = false
): string {
  const count = results.length;

  const output = [formatMessage(Messages.experience.batch, { count }), ''];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];

    output.push(`--- ${i + 1} ---`);

    const emoji = result.source.emoji;
    const sourceText = result.source.source;
    
    // Include the full source text
    output.push(`${emoji} ${sourceText}`);
    
    // Get quality details if available
    if (result.source.experienceQualities) {
      const qualityDetails = formatQualityDetails(result.source.experienceQualities);
      
      if (qualityDetails.length > 0) {
        output.push('\nExperienced with:');
        output.push(...qualityDetails);
      } else {
        output.push(Messages.experience.success);
      }
    } else {
      output.push(Messages.experience.success);
    }

    output.push('');
    output.push(formatMetadata(result.source, showIds));
    output.push('');
  }

  return output.join('\n');
}

/**
 * Format a recall response with natural language and metadata
 *
 * @param results - The recall results
 * @param showIds - Whether to show IDs (default: false)
 * @param total - Total number of results available (before pagination)
 * @param hasMore - Whether there are more results available
 * @param limit - Limit applied to results
 * @param offset - Offset applied to results
 * @param searchDescription - Human-readable description of the search
 * @returns Natural language response string with metadata
 */
export function formatRecallResponse(
  results: RecallResult[],
  showIds: boolean = false,
  total?: number,
  hasMore?: boolean,
  limit?: number,
  offset?: number,
  searchDescription?: string
): string {
  if (results.length === 0) {
    const description = searchDescription || 'your search';
    return `No experiences found for ${description}`;
  }

  // Show both total and returned count when they differ
  let countMessage: string;
  if (total !== undefined && total > results.length) {
    countMessage = `Found ${total} results for ${searchDescription || 'your search'} (showing ${results.length})`;
  } else {
    countMessage = `Found ${results.length} results for ${searchDescription || 'your search'}`;
  }

  const lines = [countMessage, ''];

  // Add metadata if available
  if (total !== undefined && total > results.length) {
    lines.push(`📊 Showing ${results.length} of ${total} total results`);
    if (hasMore) {
      lines.push('📄 More results available');
    }
    if (limit) {
      lines.push(`📏 Limited to ${limit} results`);
    }
    if (offset) {
      lines.push(`⏭️ Skipped ${offset} results`);
    }
    lines.push('');
  }

  lines.push(formatRecallResults(results, showIds));

  return lines.join('\n');
}

/**
 * Format a reconsider response with natural language
 *
 * @param result - The reconsider operation result
 * @param showId - Whether to show the ID (default: false)
 * @returns Natural language response string
 */
export function formatReconsiderResponse(
  result: ExperienceResult,
  showId: boolean = false
): string {
  let response = Messages.reconsider.success;
  
  // Get quality details if available
  if (result.source.experienceQualities) {
    const qualityDetails = formatQualityDetails(result.source.experienceQualities);
    
    if (qualityDetails.length > 0) {
      response = 'Experience reconsidered with updated qualities:\n' + qualityDetails.join('\n');
    }
  }

  return [response, '', formatMetadata(result.source, showId)].join('\n');
}

// ============================================================================
// HELPER FUNCTIONS FOR CONVERSATIONAL FORMATTING
// ============================================================================

/**
 * Format metadata in natural language
 */
function formatMetadata(source: Record<string, unknown>, showId: boolean = false): string {
  const lines = [];

  if (showId) {
    lines.push(`📝 ID: ${source.id as string}`);
  }

  // Add context if present
  if (source.context) {
    lines.push(`Context: ${source.context}`);
  }

  // Format who experienced it
  const who = source.who || 'me';
  const whoStr = Array.isArray(who) ? who.join(' & ') : (who as string);

  lines.push(
    formatMessage(Messages.experience.from, {
      experiencer: whoStr,
    }),
    formatMessage(Messages.experience.captured, {
      timeAgo: formatTimeAgo(source.created as string),
    })
  );

  return lines.join('\n');
}


/**
 * Format timestamp as human-readable time ago
 */
function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const time = new Date(timestamp);
  const diffMs = now.getTime() - time.getTime();

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) {
    return Messages.time.justNow;
  } else if (diffMinutes === 1) {
    return Messages.time.oneMinuteAgo;
  } else if (diffMinutes < 60) {
    return formatMessage(Messages.time.minutesAgo, { minutes: diffMinutes });
  } else if (diffHours === 1) {
    return Messages.time.oneHourAgo;
  } else if (diffHours < 24) {
    return formatMessage(Messages.time.hoursAgo, { hours: diffHours });
  } else if (diffDays === 1) {
    return Messages.time.yesterday;
  } else if (diffDays < 7) {
    return formatMessage(Messages.time.daysAgo, { days: diffDays });
  } else {
    return time.toLocaleDateString();
  }
}

/**
 * Format recall results in natural language
 */
function formatRecallResults(results: RecallResult[], showIds: boolean = false): string {
  const formattedResults = results.map((result, index) => {
    const metadata = result.metadata || {};

    // Get content (prefer snippet, fallback to content)
    const content = result.snippet || result.content || '';
    const displayContent = content.length > 600 ? content.substring(0, 600) + '...' : content;

    // Simple numbered format with emoji if available
    const emoji = (metadata as Record<string, unknown>).emoji as string | undefined;
    const lines = emoji
      ? [`${index + 1}. ${emoji} "${displayContent}"`]
      : [`${index + 1}. "${displayContent}"`];

    // Add full quality details if available
    if ((metadata as Record<string, unknown>).experienceQualities) {
      const qualityDetails = formatQualityDetails((metadata as Record<string, unknown>).experienceQualities as ExperienceQualities);
      if (qualityDetails.length > 0) {
        lines.push('   Qualities:');
        qualityDetails.forEach(detail => {
          lines.push('   ' + detail);
        });
      }
    } else if ((metadata as Record<string, unknown>).experience && ((metadata as Record<string, unknown>).experience as string[]).length > 0) {
      // Fallback to old format if needed
      lines.push(`   ${formatQualityList((metadata as Record<string, unknown>).experience as string[])}`);
    }

    // Add timing
    const timeAgo = formatTimeAgo(((metadata as Record<string, unknown>).created as string) || '');
    lines.push(`   ${timeAgo}`);

    // Add relevance score in test mode
    if (process.env.BRIDGE_DEBUG === 'true' && result.relevance_score !== undefined) {
      lines.push(`   Score: ${result.relevance_score.toFixed(3)}`);
    }

    if (showIds) {
      lines.push(`   ID: ${result.id}`);
    }

    return lines.join('\n');
  });

  return formattedResults.join('\n\n');
}
