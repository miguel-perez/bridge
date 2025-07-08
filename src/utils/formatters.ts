/**
 * Formatter Utilities for Bridge
 * 
 * This module provides formatting functions for search results and other
 * data structures, ensuring consistent output formatting across the application.
 * 
 * @module utils/formatters
 */

import type { SearchResult } from '../core/search.js';

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
 * @returns Formatted search result string
 */
export function formatSearchResult(result: SearchResult, index: number): string {
  const label = String(result.type ?? '');
  let summary: string;
  
  if (typeof result.snippet === 'string') {
    summary = smartTruncate(result.snippet);
  } else if (typeof result.id === 'string') {
    summary = result.id;
  } else {
    summary = NO_SUMMARY_PLACEHOLDER;
  }
  
  // Always include the ID in the output
  return `${index + 1}. [${label.toUpperCase()}] (ID: ${result.id}) ${summary}`;
}

/**
 * Enhanced formatter for detailed results
 * 
 * Extends the base search result format with additional context
 * based on the record type, such as perspective and processing level.
 * 
 * @param result - The search result to format
 * @param index - The index of the result (0-based)
 * @returns Detailed formatted search result string
 */
export function formatDetailedSearchResult(result: SearchResult, index: number): string {
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

/**
 * Structured formatter for JSON output
 * 
 * Converts search results to a structured object format suitable
 * for JSON serialization or programmatic processing.
 * 
 * @param result - The search result to format
 * @returns Structured object representation of the search result
 */
export function formatStructuredSearchResult(result: SearchResult): any {
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