/**
 * Stop Words Utility for Bridge
 * 
 * Centralized stop word management using the stopwords library
 * for consistent filtering across the application.
 */

// @ts-expect-error - stopwords library doesn't have TypeScript definitions
import stopwords from 'stopwords';

// ============================================================================
// STOP WORDS SETUP
// ============================================================================

// Get English stop words from the library and cast to proper type
const ENGLISH_STOP_WORDS = new Set(stopwords.english as string[]);

// Bridge-specific additional stop words
const BRIDGE_ADDITIONAL_STOP_WORDS = new Set([
  'really', 'actually', 'basically', 'literally', 'even', 'also',
  'just', 'like', 'very', 'so', 'then', 'than', 'this', 'that',
  'these', 'those', 'while', 'when', 'where', 'why', 'how',
  'what', 'which', 'who', 'whom', 'whose', 'would', 'could',
  'should', 'may', 'might', 'must', 'can', 'will', 'shall'
]);

// Combine library stop words with Bridge-specific ones
export const STOP_WORDS = new Set([
  ...ENGLISH_STOP_WORDS,
  ...BRIDGE_ADDITIONAL_STOP_WORDS
]);

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if a word is a stop word
 */
export function isStopWord(word: string): boolean {
  return STOP_WORDS.has(word.toLowerCase());
}

/**
 * Filter out stop words from an array of words
 */
export function filterStopWords(words: string[]): string[] {
  return words.filter(word => !isStopWord(word));
}

/**
 * Extract meaningful words from text, filtering out stop words
 */
export function extractMeaningfulWords(text: string): string[] {
  if (!text) return [];
  
  return text.toLowerCase()
    .split(/\s+/)
    .map(word => word.replace(/[^a-z]/g, ''))
    .filter(word => word.length > 2 && !isStopWord(word));
}

/**
 * Get stop words for a specific language (if needed in the future)
 */
export function getStopWords(language: string = 'en'): Set<string> {
  switch (language) {
    case 'en':
      return ENGLISH_STOP_WORDS as Set<string>;
    default:
      return ENGLISH_STOP_WORDS as Set<string>; // Default to English
  }
} 