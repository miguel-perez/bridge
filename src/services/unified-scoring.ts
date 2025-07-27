/**
 * Unified scoring system for Bridge recall operations
 * Dynamically adapts weights based on query characteristics without explicit modes
 */

import type { SourceRecord, ExperienceQualities } from '../core/types.js';
import { KNOWN_QUALITIES } from '../core/qualities.js';
import { qualityFilterService, type QualityFilter } from './quality-filter.js';

// Helper to extract quality list from switchboard format
function extractQualityList(qualities?: ExperienceQualities | Record<string, string | boolean>): string[] {
  if (!qualities) return [];
  return Object.entries(qualities)
    .filter(([_, value]) => value !== false)
    .map(([key, value]) => {
      if (value === true) return key;
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

  const experienceQualities = extractQualityList(experience.experienceQualities);
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
  const qualityCount = extractQualityList(experience.experienceQualities).length;
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
    reflects?: 'only';
    reflected_by?: string | string[];
    qualities?: QualityFilter; // New sophisticated quality filtering
  },
  semanticScores: Map<string, number>
): ScoredExperience[] {
  let filtered = experiences;

  // Hard filters (binary)
  if (filters.who) {
    filtered = filtered.filter((exp) => exp.who === filters.who);
  }
  if (filters.reflects === 'only') {
    // Filter for pattern realizations only (experiences with reflects field)
    filtered = filtered.filter((exp) => exp.reflects !== undefined);
  }

  if (filters.reflected_by) {
    // Filter for experiences that are reflected by specific pattern realizations
    const reflectedByIds = Array.isArray(filters.reflected_by)
      ? filters.reflected_by
      : [filters.reflected_by];
    filtered = filtered.filter((exp) => {
      // Find pattern realizations that reflect on this experience
      return experiences.some(
        (patternExp: SourceRecord) =>
          patternExp.reflects &&
          patternExp.reflects.includes(exp.id) &&
          reflectedByIds.includes(patternExp.id)
      );
    });
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
        const experienceQualities = extractQualityList(exp.experienceQualities);

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
