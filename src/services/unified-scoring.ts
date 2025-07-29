/**
 * Unified scoring system for Bridge recall operations
 * Dynamically adapts weights based on query characteristics without explicit modes
 */

import type { SourceRecord, Experience } from '../core/types.js';
import { KNOWN_QUALITIES } from '../core/qualities.js';
import { qualityFilterService, type QualityFilter } from './quality-filter.js';

// Mapping from sentence patterns to old quality values
const sentenceToQualityMap: Record<string, Record<string, string>> = {
  embodied: {
    'mind processes': 'thinking',
    'analytically': 'thinking',
    'thoughts line up': 'thinking',
    'feeling this': 'sensing',
    'whole body': 'sensing',
    'body knows': 'sensing',
  },
  focus: {
    'zeroing in': 'narrow',
    'one specific thing': 'narrow',
    'laser focus': 'narrow',
    'taking in everything': 'broad',
    'wide awareness': 'broad',
    'peripheral': 'broad',
  },
  mood: {
    'curious': 'open',
    'receptive': 'open',
    'welcoming': 'open',
    'possibility': 'open',
    'shutting down': 'closed',
    'emotionally': 'closed',
    'closed off': 'closed',
    'withdrawn': 'closed',
  },
  purpose: {
    'pushing toward': 'goal',
    'specific outcome': 'goal',
    'achievement': 'goal',
    'exploring': 'wander',
    'without direction': 'wander',
    'drifting': 'wander',
  },
  space: {
    'present in this space': 'here',
    'fully here': 'here',
    'grounded': 'here',
    'mind is elsewhere': 'there',
    'somewhere else': 'there',
    'distant': 'there',
  },
  time: {
    'memories': 'past',
    'pulling backward': 'past',
    'remembering': 'past',
    'anticipating': 'future',
    'what comes next': 'future',
    'forward': 'future',
  },
  presence: {
    'navigating alone': 'individual',
    'by myself': 'individual',
    'solitary': 'individual',
    'shared experience': 'collective',
    'together': 'collective',
    'we': 'collective',
  },
};

// Helper to map sentence to old quality value
function mapSentenceToQuality(quality: string, sentence: string): string | null {
  const patterns = sentenceToQualityMap[quality];
  if (!patterns) return null;
  
  const lowerSentence = sentence.toLowerCase();
  for (const [pattern, value] of Object.entries(patterns)) {
    if (lowerSentence.includes(pattern.toLowerCase())) {
      return value;
    }
  }
  return null;
}

// Helper to extract quality list from flat Experience or old SourceRecord
function extractQualityList(record: SourceRecord | Experience): string[] {
  // Check if it's a new Experience format
  if ('anchor' in record && 'embodied' in record) {
    const exp = record as Experience;
    const qualities: string[] = [];
    
    // Process each quality
    const qualityFields = ['embodied', 'focus', 'mood', 'purpose', 'space', 'time', 'presence'] as const;
    for (const field of qualityFields) {
      const value = exp[field];
      if (value) {
        // Try to map to old format for backward compatibility
        const mapped = mapSentenceToQuality(field, value);
        if (mapped) {
          qualities.push(`${field}.${mapped}`);
        } else {
          // Just use the base quality name if no mapping found
          qualities.push(field);
        }
      }
    }
    return qualities;
  }
  
  // Fall back to old format
  const qualities = (record as SourceRecord).experienceQualities;
  if (!qualities) return [];
  return Object.entries(qualities)
    .filter(([_, value]) => value !== false)
    .map(([key, value]) => {
      if (value === true) return key;
      if (typeof value === 'string') {
        // Try to map sentence to old quality value
        const mappedValue = mapSentenceToQuality(key, value);
        if (mappedValue) {
          return `${key}.${mappedValue}`;
        }
        // Fallback: just return the base quality
        return key;
      }
      return `${key}.${value}`;
    });
}

export interface ScoringFactors {
  semantic: number;
  quality: number;
  exact: number;
  recency: number;
  density: number;
}

export interface ScoringWeights {
  semantic: number;
  quality: number;
  exact: number;
  recency: number;
  density: number;
  [key: string]: number; // Index signature for compatibility
}

export interface ScoredExperience {
  experience: SourceRecord;
  score: number;
  factors: ScoringFactors;
  weights: ScoringWeights;
}

/**
 * Main unified scoring function
 */
export function scoreExperience(
  experience: SourceRecord,
  query: string | string[],
  semanticSimilarity?: number
): { score: number; factors: ScoringFactors; weights: ScoringWeights } {
  // Always calculate all factors
  const factors: ScoringFactors = {
    semantic: semanticSimilarity ?? 0,
    quality: calculateQualityRelevance(query, experience),
    exact: calculateExactMatches(query, experience),
    recency: calculateRecencyScore(experience),
    density: calculateQualityDensity(experience),
  };

  // Dynamic weight calculation based on query characteristics
  const weights = calculateDynamicWeights(query, factors);

  // Single scoring formula
  const score =
    factors.semantic * weights.semantic +
    factors.quality * weights.quality +
    factors.exact * weights.exact +
    factors.recency * weights.recency +
    factors.density * weights.density;

  return { score: Math.min(score, 1.0), factors, weights };
}

/**
 * Calculate dynamic weights based on query characteristics
 */
export function calculateDynamicWeights(
  query: string | string[],
  factors: ScoringFactors
): ScoringWeights {
  const weights: ScoringWeights = {
    semantic: 0.5, // Base weight
    quality: 0.3, // Base weight
    exact: 0.1, // Base weight
    recency: 0.05, // Base weight
    density: 0.05, // Base weight
  };

  // Detect query characteristics
  const isQuality = isQueryQuality(query);
  const hasExactMatch = factors.exact > 0.8; // Strong exact match
  const qualityStrength = factors.quality;

  // Adjust weights based on query nature
  if (isQuality && qualityStrength > 0.5) {
    // Query matches known qualities strongly
    weights.quality = 0.6;
    weights.semantic = 0.3;
    weights.exact = 0.05;
  } else if (hasExactMatch) {
    // Boost exact matches when they occur
    weights.exact = 0.25;
    weights.semantic = 0.45;
    weights.quality = 0.2;
  }

  // Normalize to sum to 1.0
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  Object.keys(weights).forEach((key) => {
    weights[key as keyof ScoringWeights] /= sum;
  });

  return weights;
}

/**
 * Calculate quality relevance for both string and array queries
 * Matches query qualities against experience qualities
 */
export function calculateQualityRelevance(
  query: string | string[],
  experience: SourceRecord
): number {
  const queryQualities = extractQualities(query);
  if (queryQualities.length === 0) return 0;

  const experienceQualities = extractQualityList(experience);
  let relevance = 0;

  for (const qQual of queryQualities) {
    for (const eQual of experienceQualities) {
      if (qualitiesMatch(qQual, eQual)) {
        relevance += 1.0;
      } else if (qualitiesPartialMatch(qQual, eQual)) {
        relevance += 0.5;
      }
    }
  }

  return Math.min(relevance / queryQualities.length, 1.0);
}

/**
 * Calculate exact text matches (case-insensitive)
 * Excludes quality queries from exact matching
 */
export function calculateExactMatches(query: string | string[], experience: SourceRecord): number {
  const queryTerms = Array.isArray(query) ? query : [query];
  const sourceText = experience.source.toLowerCase();
  let exactMatches = 0;

  for (const q of queryTerms) {
    const term = q.toLowerCase().trim();
    if (term.length === 0) continue;

    // Skip quality queries
    if ((KNOWN_QUALITIES as readonly string[]).includes(q)) continue;

    // Check for exact word matches
    const words = sourceText.split(/\s+/);
    for (const word of words) {
      if (word === term) {
        exactMatches += 1.0;
        break;
      }
    }
  }

  return Math.min(exactMatches / queryTerms.length, 1.0);
}

/**
 * Calculate recency score (newer experiences get higher scores)
 * Uses exponential decay with 30-day half-life
 */
export function calculateRecencyScore(experience: SourceRecord): number {
  const now = new Date();
  const created = new Date(experience.created);
  const daysDiff = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);

  // Exponential decay with 30-day half-life
  const halfLife = 30;
  return Math.exp((-Math.log(2) * daysDiff) / halfLife);
}

/**
 * Calculate quality density (rewards richer experiences)
 */
export function calculateQualityDensity(experience: SourceRecord): number {
  const qualityCount = extractQualityList(experience).length;
  return Math.min(qualityCount / 5, 1.0);
}

/**
 * Extract quality terms from query
 */
export function extractQualities(query: string | string[]): string[] {
  const queryTerms = Array.isArray(query) ? query : [query];
  const qualities: string[] = [];

  for (const term of queryTerms) {
    const trimmed = term.trim();
    if (trimmed.length === 0) continue;

    // Check if term is a known quality
    if ((KNOWN_QUALITIES as readonly string[]).includes(trimmed)) {
      qualities.push(trimmed);
    }
  }

  return qualities;
}

/**
 * Check if query contains quality terms
 */
export function isQueryQuality(query: string | string[]): boolean {
  return extractQualities(query).length > 0;
}

/**
 * Check if query is purely quality-based (no semantic content)
 */
export function isQueryPurelyQuality(query: string | string[]): boolean {
  const queryTerms = Array.isArray(query) ? query : [query];
  const qualities = extractQualities(query);

  // Query is purely quality if all terms are qualities
  return qualities.length > 0 && qualities.length === queryTerms.length;
}

/**
 * Check if two qualities match exactly
 */
function qualitiesMatch(qual1: string, qual2: string): boolean {
  return qual1 === qual2;
}

/**
 * Check if qualities partially match (e.g., "embodied" matches "embodied.thinking")
 */
function qualitiesPartialMatch(qual1: string, qual2: string): boolean {
  return qual1.startsWith(qual2 + '.') || qual2.startsWith(qual1 + '.');
}

/**
 * Apply filters and scoring to experiences with enhanced quality filtering
 */
export function applyFiltersAndScore(
  experiences: SourceRecord[],
  query: string | string[],
  filters: {
    who?: string;
    qualities?: QualityFilter; // New sophisticated quality filtering
  },
  semanticScores: Map<string, number>
): ScoredExperience[] {
  let filtered = experiences;

  // Hard filters (binary)
  if (filters.who) {
    filtered = filtered.filter((exp) => exp.who === filters.who);
  }

  // Enhanced quality filtering with sophisticated filters
  if (filters.qualities) {
    try {
      // Parse and evaluate the quality filter
      const filterExpression = qualityFilterService.parseQualityFilter(filters.qualities);
      filtered = filtered.filter((exp) =>
        qualityFilterService.evaluateFilter(exp, filterExpression)
      );
    } catch (error) {
      // If quality filter evaluation fails, continue with unfiltered results
      // Error is silently handled to maintain MCP protocol compliance
    }
  } else {
    // Legacy quality filtering: For pure quality queries, only return experiences with matching qualities
    if (query && isQueryPurelyQuality(query)) {
      const queryQualities = extractQualities(query);
      filtered = filtered.filter((exp) => {
        const experienceQualities = extractQualityList(exp);

        if (Array.isArray(query)) {
          // For array queries, ALL qualities must match
          return queryQualities.every((qQual) =>
            experienceQualities.some(
              (eQual) => qualitiesMatch(qQual, eQual) || qualitiesPartialMatch(qQual, eQual)
            )
          );
        } else {
          // For single quality queries, at least one must match
          return queryQualities.some((qQual) =>
            experienceQualities.some(
              (eQual) => qualitiesMatch(qQual, eQual) || qualitiesPartialMatch(qQual, eQual)
            )
          );
        }
      });
    }
  }

  // Score remaining experiences
  return filtered
    .map((exp) => {
      const semanticSimilarity = semanticScores.get(exp.id);
      const { score, factors, weights } = scoreExperience(exp, query, semanticSimilarity);
      return {
        experience: exp,
        score,
        factors,
        weights,
      };
    })
    .sort((a, b) => b.score - a.score);
}
