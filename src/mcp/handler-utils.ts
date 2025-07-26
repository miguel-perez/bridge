/**
 * Shared utilities for MCP tool handlers
 *
 * This module provides common formatting and utility functions used across
 * all MCP tool handlers for consistent response formatting.
 */

import type { SourceRecord } from '../core/types.js';

// ============================================================================
// CONSTANTS
// ============================================================================

export const CONTENT_SNIPPET_LENGTH = 200;
export const RELEVANCE_PERCENT_PRECISION = 0;

// ============================================================================
// FORMATTING UTILITIES
// ============================================================================

/**
 * Formats experience (qualities + emoji) as a readable bulleted list
 *
 * @param experience - The experience array to format
 * @returns Formatted string representation of the experience
 */
export function formatExperience(experience: string[] | undefined): string {
  if (!experience || experience.length === 0) {
    return 'No experiential qualities analyzed';
  }
  const qualityLines = experience.map((q: string) => {
    return `• ${q}`;
  });
  return `${qualityLines.join('\n')}`;
}

/**
 * Formats ISO date as human-readable date with time information for recent events
 *
 * @param isoDate - ISO date string to format
 * @returns Human-readable date string
 */
export function formatDate(isoDate: string): string {
  if (!isoDate) return 'Unknown date';

  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return 'Invalid date';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // For very recent times, show relative time
    if (diffMinutes < 1) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    }

    // For dates within a week, show day name
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (dateOnly.getTime() === today.getTime()) {
      const timeStr = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      return `Today at ${timeStr}`;
    } else if (dateOnly.getTime() === yesterday.getTime()) {
      const timeStr = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      return `Yesterday at ${timeStr}`;
    } else if (diffDays < 7) {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
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
export function formatMetadata(source: SourceRecord): string {
  const who = source.who || 'Unknown';
  // Handle both string and array of who
  const whoStr = Array.isArray(who) ? who.join(' & ') : who;

  const parts = [
    whoStr,
    source.perspective || 'Unknown perspective',
    source.processing || 'Unknown processing',
  ];

  if (source.created) {
    parts.push(formatDate(source.created));
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
export function formatContent(
  content: string,
  narrative?: string,
  includeFullContent?: boolean
): string {
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
interface RelevanceBreakdown {
  text_match?: number;
  vector_similarity?: number;
  semantic_similarity?: number;
  filter_relevance?: number;
}

/**
 * Formats relevance breakdown for search results
 * @remarks
 * Converts relevance scores to percentage format for display.
 * Handles missing or null breakdown data gracefully.
 * @param breakdown - The relevance breakdown object
 * @returns Formatted relevance breakdown string
 */
export function formatRelevanceBreakdown(breakdown: RelevanceBreakdown | null | undefined): string {
  if (!breakdown) return 'No breakdown available';

  const parts = [];
  if (breakdown.text_match !== undefined) {
    parts.push(`Text match: ${(breakdown.text_match * 100).toFixed(RELEVANCE_PERCENT_PRECISION)}%`);
  }
  if (breakdown.vector_similarity !== undefined) {
    parts.push(
      `Vector similarity: ${(breakdown.vector_similarity * 100).toFixed(RELEVANCE_PERCENT_PRECISION)}%`
    );
  }
  if (breakdown.semantic_similarity !== undefined) {
    parts.push(
      `Semantic similarity: ${(breakdown.semantic_similarity * 100).toFixed(RELEVANCE_PERCENT_PRECISION)}%`
    );
  }
  if (breakdown.filter_relevance !== undefined) {
    parts.push(
      `Filters: ${(breakdown.filter_relevance * 100).toFixed(RELEVANCE_PERCENT_PRECISION)}%`
    );
  }

  return parts.join(' | ') || 'No relevance breakdown';
}

/**
 * Formats a single source record for display
 *
 * @param source - The source record to format
 * @returns Formatted string representation of the source
 */
export function formatSource(source: SourceRecord): string {
  const parts: string[] = [];

  // Basic info
  parts.push(`ID: ${source.id}`);
  parts.push(`Content: ${source.source}`);

  // Context fields
  if (source.perspective) parts.push(`Perspective: ${source.perspective}`);
  if (source.who) {
    const whoStr = Array.isArray(source.who) ? source.who.join(' & ') : source.who;
    parts.push(`Who: ${whoStr}`);
  }
  if (source.processing) parts.push(`Processing: ${source.processing}`);
  if (source.crafted !== undefined) parts.push(`Crafted: ${source.crafted}`);

  // Timestamps
  if (source.created) {
    parts.push(formatDate(source.created));
  }

  // Experience analysis
  if (source.experience) {
    parts.push(formatExperience(source.experience));
  }

  return parts.join('\n');
}
