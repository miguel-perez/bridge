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
// CONVERSATIONAL RESPONSE FORMATTERS
// ============================================================================

/**
 * Interface for remember operation results
 */
export interface RememberResult {
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
  content: string;
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
 * Natural language templates for conversational responses
 */
const CONVERSATIONAL_TEMPLATES = {
  remember: {
    single: "I'll remember that moment with you - {summary}",
    batch: "I'll remember these {count} moments with you"
  },
  recall: {
    found: "I found {count} moments that might help with that...",
    none: "I don't see any moments that match that yet"
  },
  reconsider: {
    success: "I've updated that memory with you - {summary}",
    batch: "I've updated {count} memories with you"
  },
  release: {
    success: "I've released that memory with you",
    batch: "I've released {count} memories with you"
  }
};

/**
 * Format a remember response with natural language
 * 
 * Transforms technical remember results into conversational responses
 * while preserving all technical data.
 * 
 * @param result - The remember operation result
 * @returns Natural language response string
 */
export function formatRememberResponse(result: RememberResult): string {
  const summary = createNaturalSummary(result.source);
  
  // Make response more conversational and less mechanical
  const responses = [
    `I'll remember that moment with you - ${summary}`,
    `That's a meaningful experience to hold onto - ${summary}`,
    `I'm capturing that moment - ${summary}`,
    `That's worth remembering - ${summary}`,
    `I'll keep that with us - ${summary}`
  ];
  
  const response = responses[Math.floor(Math.random() * responses.length)];
  
  return [
    response,
    '',
    formatMetadata(result.source)
  ].join('\n');
}

/**
 * Format a batch remember response with natural language
 * 
 * @param results - Array of remember operation results
 * @returns Natural language response string
 */
export function formatBatchRememberResponse(results: RememberResult[]): string {
  const count = results.length;
  
  const output = [
    CONVERSATIONAL_TEMPLATES.remember.batch.replace('{count}', count.toString()),
    ''
  ];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const summary = createNaturalSummary(result.source);
    
    output.push(`--- Experience ${i + 1} ---`);
    output.push(`I'll remember that moment with you - ${summary}`);
    output.push('');
    output.push(formatMetadata(result.source));
    output.push('');
  }

  return output.join('\n');
}

/**
 * Format a recall response with natural language
 * 
 * @param results - Array of recall results
 * @returns Natural language response string
 */
export function formatRecallResponse(results: RecallResult[]): string {
  if (results.length === 0) {
    return CONVERSATIONAL_TEMPLATES.recall.none;
  }

  return [
    CONVERSATIONAL_TEMPLATES.recall.found.replace('{count}', results.length.toString()),
    '',
    formatRecallResults(results)
  ].join('\n');
}

/**
 * Format a reconsider response with natural language
 * 
 * @param result - The reconsider operation result
 * @returns Natural language response string
 */
export function formatReconsiderResponse(result: RememberResult): string {
  const summary = createNaturalSummary(result.source);
  
  return [
    CONVERSATIONAL_TEMPLATES.reconsider.success.replace('{summary}', summary),
    '',
    formatMetadata(result.source)
  ].join('\n');
}

/**
 * Format a release response with natural language
 * 
 * @param count - Number of memories released
 * @returns Natural language response string
 */
export function formatReleaseResponse(count: number = 1): string {
  return CONVERSATIONAL_TEMPLATES.release.success.replace('{count}', count.toString());
}

// ============================================================================
// HELPER FUNCTIONS FOR CONVERSATIONAL FORMATTING
// ============================================================================

/**
 * Create a natural summary from source content and experience qualities
 */
function createNaturalSummary(source: any): string {
  const content = source.source;
  const experience = source.experience || [];
  
  // Extract key details for natural summary
  return extractKeyDetails(content, experience);
}

/**
 * Extract key details from content and experience qualities
 */
function extractKeyDetails(content: string, experience: string[]): string {
  // Create natural summary
  if (experience.length > 0) {
    const qualityPhrases = formatQualities(experience);
    return `capturing ${qualityPhrases.join(', ')} aspects of the experience`;
  } else {
    return `the essence of what you shared`;
  }
}

/**
 * Format experience qualities into natural language
 */
function formatQualities(qualities: string[]): string[] {
  const qualityMap: Record<string, string> = {
    'emotion': 'emotional',
    'space': 'spatial',
    'body': 'embodied',
    'others': 'relational',
    'time': 'temporal',
    'focus': 'focused',
    'purpose': 'purposive'
  };

  return qualities.map(quality => qualityMap[quality] || quality);
}

/**
 * Format metadata in natural language
 */
function formatMetadata(source: any): string {
  return [
    `📝 ID: ${source.id}`,
    `👤 From: ${source.experiencer || 'first person'} `,
    `👁️ As: ${source.perspective || 'I'}`,
    `⏰ When: ${formatProcessing(source.processing)}`,
    `🕐 Captured: ${formatTimeAgo(source.created)}`
  ].join('\n');
}

/**
 * Format processing timing in natural language
 */
function formatProcessing(processing?: string): string {
  const processingMap: Record<string, string> = {
    'during': 'during our conversation',
    'after': 'after we finished talking',
    'before': 'before we started'
  };
  return processingMap[processing || 'during'] || processing || 'during our conversation';
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
  
  if (diffMinutes < 60) {
    return diffMinutes <= 1 ? 'just now' : `${diffMinutes} minutes ago`;
  } else if (diffHours < 24) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  } else if (diffDays < 7) {
    return diffDays === 1 ? 'yesterday' : `${diffDays} days ago`;
  } else {
    return time.toLocaleDateString();
  }
}

/**
 * Format recall results in natural language
 */
function formatRecallResults(results: RecallResult[]): string {
  const formattedResults = results.map((result) => {
    const metadata = result.metadata || {};
    const experience = (metadata as any).experience || [];
    
    // Get content (prefer snippet, fallback to content)
    const content = result.snippet || result.content || '';
    const displayContent = content.length > 200 ? 
      content.substring(0, 200) + '...' : content;
    
    // Format qualities if available
    const qualityPhrases = experience.length > 0 ? 
      `Key aspects: ${formatQualities(experience).join(', ')}` : '';
    
    // Format timing
    const timeAgo = formatTimeAgo((metadata as any).created || '');
    
    return [
      `"${displayContent}"`,
      qualityPhrases,
      `From ${timeAgo} • ID: ${result.id}`
    ].filter(Boolean).join('\n');
  });

  return formattedResults.join('\n\n---\n\n');
} 

// ============================================================================
// INTELLIGENT RESPONSE FORMATTING
// ============================================================================

/**
 * Interface for conversation context
 */
export interface ConversationContext {
  turnCount: number;
  recentToolCalls: string[];
  conversationTopic: string;
  userGoal: string;
}

/**
 * Determine if a remember response should be conversational or technical
 * 
 * @param context - Current conversation context
 * @param sourceContent - The content being remembered
 * @returns true if response should be conversational, false if technical
 */
export function shouldUseConversationalResponse(context: ConversationContext, sourceContent: string): boolean {
  // Don't use conversational responses for very short content
  if (sourceContent.length < 20) {
    return false;
  }
  
  // Don't use conversational responses if we've made too many tool calls recently
  const recentRememberCalls = context.recentToolCalls.filter(tool => tool === 'remember').length;
  if (recentRememberCalls > 3) {
    return false;
  }
  
  // Use conversational responses for meaningful experiences
  const meaningfulIndicators = [
    'felt', 'realized', 'noticed', 'discovered', 'experienced',
    'happened', 'went through', 'dealt with', 'faced', 'encountered'
  ];
  
  const hasMeaningfulContent = meaningfulIndicators.some(indicator => 
    sourceContent.toLowerCase().includes(indicator)
  );
  
  return hasMeaningfulContent;
}

/**
 * Format a remember response with intelligent context awareness
 * 
 * @param result - The remember operation result
 * @param context - Current conversation context
 * @returns Natural language response string or null if should be silent
 */
export function formatIntelligentRememberResponse(result: RememberResult, context: ConversationContext): string | null {
  const sourceContent = result.source.source;
  
  // Check if we should use conversational response
  if (!shouldUseConversationalResponse(context, sourceContent)) {
    // Return null to indicate this should be a silent operation
    return null;
  }
  
  // Use conversational response for meaningful experiences
  return formatRememberResponse(result);
}

/**
 * Format a recall response with intelligent context awareness
 * 
 * @param results - Array of recall results
 * @param context - Current conversation context
 * @returns Natural language response string
 */
export function formatIntelligentRecallResponse(results: RecallResult[]): string {
  // Always show recall results as they're user-requested
  return formatRecallResponse(results);
}

/**
 * Create a minimal remember acknowledgment for frequent operations
 * 
 * @param result - The remember operation result
 * @returns Minimal acknowledgment string
 */
export function formatMinimalRememberResponse(result: RememberResult): string {
  return `📝 Remembered: "${smartTruncate(result.source.source, 60)}"`;
}

// ============================================================================
// CONVERSATION FLOW HELPERS
// ============================================================================

/**
 * Analyze conversation flow to suggest tool usage patterns
 * 
 * @param context - Current conversation context
 * @returns Suggestions for tool usage
 */
export function analyzeConversationFlow(context: ConversationContext): {
  shouldRemember: boolean;
  shouldRecall: boolean;
  shouldBeSilent: boolean;
} {
  const recentRememberCalls = context.recentToolCalls.filter(tool => tool === 'remember').length;
  const recentRecallCalls = context.recentToolCalls.filter(tool => tool === 'recall').length;
  
  return {
    shouldRemember: recentRememberCalls < 2, // Limit remember calls
    shouldRecall: recentRecallCalls < 1, // Allow recall when needed
    shouldBeSilent: recentRememberCalls >= 3 // Be silent after too many remembers
  };
}

/**
 * Format a response based on conversation flow analysis
 * 
 * @param operation - The operation being performed
 * @param result - The operation result
 * @param context - Current conversation context
 * @returns Formatted response or null for silent operations
 */
export function formatFlowAwareResponse(
  operation: 'remember' | 'recall' | 'reconsider' | 'release',
  result: any,
  context: ConversationContext
): string | null {
  const flow = analyzeConversationFlow(context);
  
  switch (operation) {
    case 'remember':
      if (flow.shouldBeSilent) {
        return null; // Silent operation
      } else if (flow.shouldRemember) {
        return formatIntelligentRememberResponse(result, context);
      } else {
        return formatMinimalRememberResponse(result);
      }
      
    case 'recall':
      return formatIntelligentRecallResponse(result);
      
    case 'reconsider':
      return formatReconsiderResponse(result);
      
    case 'release':
      return formatReleaseResponse(1);
      
    default:
      return null;
  }
}

 