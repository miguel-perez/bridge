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

// ============================================================================
// TREE VIEW FORMATTERS
// ============================================================================

/**
 * Format the ecosystem tree view for empty queries
 */
export function formatEcosystemTree(
  patterns: any[],
  qualityPatterns: any[],
  totalExperiences: number,
  experienceMap?: Map<string, any>
): string {
  let output = '🌳 BRIDGE ECOSYSTEM\n';
  
  if (patterns.length === 0 && qualityPatterns.length === 0) {
    output += '│\n';
    output += '└─ 🌱 No patterns discovered yet\n';
    output += '   Start capturing experiences to see patterns emerge!\n';
    return output;
  }
  
  output += '│\n';
  
  // Show hierarchical patterns with sources
  const maxPatterns = 8;
  for (let i = 0; i < Math.min(patterns.length, maxPatterns); i++) {
    const pattern = patterns[i];
    const isLast = i === Math.min(patterns.length - 1, maxPatterns - 1) && qualityPatterns.length === 0;
    const connector = isLast ? '└─' : '├─';
    
    // Pattern header with emoji, name, count, and activity indicator
    const activityIndicator = pattern.metadata?.recency === 'active' ? '⚡' : pattern.metadata?.recency === 'recent' ? '🆕' : '✓';
    const coherencePercent = Math.round(pattern.coherence || 0);
    
    output += `${connector} ${pattern.name} (${pattern.experienceIds.length}) ${activityIndicator} [${coherencePercent}%]\n`;
    
    // Show actual experiences if we have the map
    if (experienceMap && pattern.experienceIds.length > 0) {
      const prefix = isLast ? '   ' : '│  ';
      const maxExamples = 2;
      
      for (let j = 0; j < Math.min(pattern.experienceIds.length, maxExamples); j++) {
        const expId = pattern.experienceIds[j];
        const exp = experienceMap.get(expId);
        
        if (exp) {
          const metadata = exp.metadata || {};
          const experience = metadata.experience || {};
          const emoji = experience.emoji || '📝';
          const content = exp.content || exp.snippet || '';
          const truncated = smartTruncate(content, 60);
          const timeAgo = formatTimeAgo(metadata.system_time || metadata.occurred || '');
          const experiencer = metadata.experiencer || 'Unknown';
          
          const expConnector = j === Math.min(pattern.experienceIds.length - 1, maxExamples - 1) ? '└─' : '├─';
          output += `${prefix}${expConnector} ${emoji} "${truncated}" - ${experiencer}, ${timeAgo}\n`;
        }
      }
      
      if (pattern.experienceIds.length > maxExamples) {
        output += `${prefix}└─ ... and ${pattern.experienceIds.length - maxExamples} more\n`;
      }
    }
    
    // Show sub-patterns if any
    if (pattern.children && pattern.children.length > 0) {
      const prefix = isLast ? '   ' : '│  ';
      output += `${prefix}└─ 📁 ${pattern.children.length} sub-pattern${pattern.children.length === 1 ? '' : 's'}`;
      
      // Show one sub-pattern example inline
      if (pattern.children.length > 0) {
        const subPattern = pattern.children[0];
        output += `: ${subPattern.name} (${subPattern.experienceIds.length})`;
        if (pattern.children.length > 1) {
          output += `, ...`;
        }
      }
      output += '\n';
    }
    
    if (i < Math.min(patterns.length - 1, maxPatterns - 1) || qualityPatterns.length > 0) {
      output += '│\n';
    }
  }
  
  if (patterns.length > maxPatterns) {
    output += '│\n';
    output += `├─ ... and ${patterns.length - maxPatterns} more patterns\n`;
  }
  
  // Show quality patterns if any
  if (qualityPatterns.length > 0) {
    output += '│\n';
    output += '├─ 🎯 QUALITY DIMENSIONS\n';
    
    for (let i = 0; i < Math.min(qualityPatterns.length, 3); i++) {
      const qPattern = qualityPatterns[i];
      const isLast = i === Math.min(qualityPatterns.length - 1, 2);
      const connector = isLast ? '└─' : '├─';
      
      output += `│  ${connector} ${qPattern.dimension}: ${qPattern.semantic_meaning} (${qPattern.experiences.length})\n`;
    }
  }
  
  // Footer with stats
  output += '│\n';
  output += `└─ 📊 ${totalExperiences} total experiences across ${patterns.length} patterns\n`;
  
  return output;
}

/**
 * Format time ago in human-readable format
 */
function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const time = new Date(timestamp);
  const diffMs = now.getTime() - time.getTime();
  
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMinutes < 60) {
    return diffMinutes <= 1 ? 'just now' : `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return diffHours === 1 ? '1h ago' : `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return diffDays === 1 ? 'yesterday' : `${diffDays}d ago`;
  } else {
    return time.toLocaleDateString();
  }
}



/**
 * Format search results with pattern context
 */
export function formatSearchResultsWithPatterns(
  results: any[],
  query: string,
  patterns: any[]
): string {
  let output = '';
  
  if (query.trim()) {
    output += `🔍 "${query}"\n`;
    output += `Found ${results.length} experience${results.length === 1 ? '' : 's'}\n\n`;
  } else {
    output += `📚 ${results.length} Recent Experience${results.length === 1 ? '' : 's'}\n\n`;
  }
  
  if (results.length === 0) {
    output += 'No results found.\n';
    return output;
  }
  
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const metadata = result.metadata || {};
    const experience = metadata.experience || {};
    
    // Get qualities for display
    const qualities = experience.qualities || [];
    const topQualities = qualities
      .filter((q: any) => q.prominence >= 70)
      .sort((a: any, b: any) => b.prominence - a.prominence)
      .slice(0, 2)
      .map((q: any) => `${q.type}: ${q.prominence}%`);
    
    // Format with emoji and narrative  
    const emoji = experience.emoji || '📝';
    const narrative = experience.narrative || '';
    
    // Main content - show narrative and content beautifully
    if (narrative) {
      output += `${emoji} ${narrative}\n\n`;
    }
    
    // Content (avoid duplication with narrative)
    const content = result.content || result.snippet || '';
    if (content && content !== narrative) {
      // Smart truncate if content is very long
      const displayContent = content.length > 300 ? smartTruncate(content, 300) : content;
      output += `${displayContent}\n\n`;
    }
    
    // Show pattern context if available
    const patternContext = findPatternContext(result.id, patterns);
    if (patternContext) {
      output += `📍 Pattern: ${patternContext.name}\n`;
    }
    
    // Show top qualities if available
    if (topQualities.length > 0) {
      output += `✨ Qualities: ${topQualities.join(', ')}\n`;
    }
    
    // Metadata line - more compact and readable
    const timeAgo = formatTimeAgo(metadata.system_time || metadata.occurred || '');
    const experiencer = metadata.experiencer || 'Unknown';
    const perspective = metadata.perspective || 'I';
    const processing = metadata.processing || 'during';
    
    output += `${result.id} • ${experiencer} • ${perspective} • ${processing} • ${timeAgo}\n`;
    
    if (i < results.length - 1) {
      output += '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
    }
  }
  
  return output;
}

/**
 * Find pattern context for a given experience ID
 */
function findPatternContext(experienceId: string, patterns: any[]): any | null {
  for (const pattern of patterns) {
    if (pattern.experiences.some((exp: any) => exp.id === experienceId)) {
      return pattern;
    }
    if (pattern.children) {
      const found = findPatternContext(experienceId, pattern.children);
      if (found) return found;
    }
  }
  return null;
} 