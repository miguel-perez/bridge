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

const DEFAULT_TRUNCATE_LENGTH = 120;
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
    experiencer?: string;
    perspective?: string;
    processing?: string;
    created: string;
    experience?: string[];
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
    perspective?: string;
    experiencer?: string;
    processing?: string;
    experience?: string[];
  };
  relevance_score: number;
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
  const qualities = result.source.experience || [];

  // Simple response based on whether we have qualities
  let response: string;
  if (qualities.length > 0) {
    response = formatMessage(Messages.experience.successWithQualities, {
      qualities: formatQualityList(qualities),
    });
  } else {
    response = Messages.experience.success;
  }

  return [response, '', formatMetadata(result.source, showId)].join('\n');
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
    const qualities = result.source.experience || [];

    output.push(`--- ${i + 1} ---`);

    if (qualities.length > 0) {
      output.push(
        formatMessage(Messages.experience.successWithQualities, {
          qualities: formatQualityList(qualities),
        })
      );
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
 * @returns Natural language response string with metadata
 */
export function formatRecallResponse(
  results: RecallResult[],
  showIds: boolean = false,
  total?: number,
  hasMore?: boolean,
  limit?: number,
  offset?: number
): string {
  if (results.length === 0) {
    return Messages.recall.none;
  }

  const lines = [formatMessage(Messages.recall.found, { count: results.length }), ''];

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
  const qualities = result.source.experience || [];

  let response: string;
  if (qualities.length > 0) {
    response = formatMessage(Messages.reconsider.successWithQualities, {
      qualities: formatQualityList(qualities),
    });
  } else {
    response = Messages.reconsider.success;
  }

  return [response, '', formatMetadata(result.source, showId)].join('\n');
}

/**
 * Format a release response with natural language
 *
 * @param count - Number of memories released
 * @returns Natural language response string
 */
export function formatReleaseResponse(count: number = 1): string {
  if (count === 1) {
    return Messages.release.success;
  } else {
    return formatMessage(Messages.release.batch, { count });
  }
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

  lines.push(
    formatMessage(Messages.experience.from, {
      experiencer: (source.experiencer as string) || 'me',
    }),
    formatMessage(Messages.experience.as, { perspective: (source.perspective as string) || 'I' }),
    formatMessage(Messages.experience.when, {
      processing: formatProcessing(source.processing as string),
    }),
    formatMessage(Messages.experience.captured, {
      timeAgo: formatTimeAgo(source.created as string),
    })
  );

  return lines.join('\n');
}

/**
 * Format processing timing in natural language
 */
function formatProcessing(processing?: string): string {
  switch (processing) {
    case 'during':
      return Messages.processing.during;
    case 'right-after':
      return Messages.processing.rightAfter;
    case 'long-after':
      return Messages.processing.longAfter;
    default:
      return Messages.processing.during;
  }
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
    const experience = ((metadata as Record<string, unknown>).experience as string[]) || [];

    // Get content (prefer snippet, fallback to content)
    const content = result.snippet || result.content || '';
    const displayContent = content.length > 150 ? content.substring(0, 150) + '...' : content;

    // Simple numbered format
    const lines = [`${index + 1}. "${displayContent}"`];

    // Add qualities if available
    if (experience.length > 0) {
      lines.push(`   ${formatQualityList(experience)}`);
    }

    // Add timing
    const timeAgo = formatTimeAgo(((metadata as Record<string, unknown>).created as string) || '');
    lines.push(`   ${timeAgo}`);

    if (showIds) {
      lines.push(`   ID: ${result.id}`);
    }

    return lines.join('\n');
  });

  return formattedResults.join('\n\n');
}
