/**
 * Unified scoring system for Bridge recall operations
 * Dynamically adapts weights based on query characteristics without explicit modes
 */

import type { SourceRecord } from '../core/types.js';
import { KNOWN_DIMENSIONS } from '../core/dimensions.js';

export interface ScoringFactors {
  semantic: number;
  dimensional: number;
  exact: number;
  recency: number;
  density: number;
}

export interface ScoringWeights {
  semantic: number;
  dimensional: number;
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
    dimensional: calculateDimensionalRelevance(query, experience),
    exact: calculateExactMatches(query, experience),
    recency: calculateRecencyScore(experience),
    density: calculateDimensionalDensity(experience)
  };
  
  // Dynamic weight calculation based on query characteristics
  const weights = calculateDynamicWeights(query, factors);
  
  // Single scoring formula
  const score = 
    factors.semantic * weights.semantic +
    factors.dimensional * weights.dimensional +
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
    semantic: 0.5,    // Base weight
    dimensional: 0.3, // Base weight
    exact: 0.1,       // Base weight
    recency: 0.05,    // Base weight
    density: 0.05     // Base weight
  };
  
  // Detect query characteristics
  const isDimensional = isQueryDimensional(query);
  const hasExactMatch = factors.exact > 0.8; // Strong exact match
  const dimensionalStrength = factors.dimensional;
  
  // Adjust weights based on query nature
  if (isDimensional && dimensionalStrength > 0.5) {
    // Query matches known dimensions strongly
    weights.dimensional = 0.6;
    weights.semantic = 0.3;
    weights.exact = 0.05;
  } else if (hasExactMatch) {
    // Boost exact matches when they occur
    weights.exact = 0.25;
    weights.semantic = 0.45;
    weights.dimensional = 0.2;
  }
  
  // Normalize to sum to 1.0
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  Object.keys(weights).forEach(key => {
    weights[key as keyof ScoringWeights] /= sum;
  });
  
  return weights;
}

/**
 * Calculate dimensional relevance for both string and array queries
 */
export function calculateDimensionalRelevance(
  query: string | string[],
  experience: SourceRecord
): number {
  const queryDimensions = extractDimensions(query);
  if (queryDimensions.length === 0) return 0;
  
  let relevance = 0;
  const experienceDimensions = experience.experience || [];
  
  for (const qDim of queryDimensions) {
    for (const eDim of experienceDimensions) {
      if (dimensionsMatch(qDim, eDim)) {
        relevance += 1.0;
      } else if (dimensionsPartialMatch(qDim, eDim)) {
        relevance += 0.5; // "embodied" matches "embodied.thinking"
      }
    }
  }
  
  return Math.min(relevance / queryDimensions.length, 1.0);
}

/**
 * Calculate exact text matches
 */
export function calculateExactMatches(
  query: string | string[],
  experience: SourceRecord
): number {
  const sourceLower = experience.source.toLowerCase();
  let totalScore = 0;
  let count = 0;
  
  const queries = Array.isArray(query) ? query : [query];
  
  for (const q of queries) {
    // Skip dimensional queries
    if ((KNOWN_DIMENSIONS as readonly string[]).includes(q)) continue;
    
    const queryLower = q.toLowerCase();
    count++;
    
    // Full phrase match
    if (sourceLower.includes(queryLower)) {
      totalScore += 1.0;
      continue;
    }
    
    // Check for word stem matches (e.g., "anxiety" matches "anxious")
    // Try multiple stem patterns
    const stems = [
      queryLower.replace(/y$/, 'i'),    // anxiety -> anxiet -> anxious
      queryLower.replace(/ty$/, 't'),   // anxiety -> anxiet
      queryLower.replace(/iety$/, 'ious'), // anxiety -> anxious
      queryLower.slice(0, -1),          // Remove last char
      queryLower.slice(0, -2)           // Remove last 2 chars
    ];
    
    let stemFound = false;
    for (const stem of stems) {
      if (stem.length > 3 && sourceLower.includes(stem)) {
        totalScore += 0.8;
        stemFound = true;
        break;
      }
    }
    if (stemFound) continue;
    
    // Partial word matches
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
    if (queryWords.length > 0) {
      const matchingWords = queryWords.filter(word => 
        sourceLower.includes(word)
      );
      totalScore += matchingWords.length / queryWords.length;
    }
  }
  
  return count > 0 ? totalScore / count : 0;
}

/**
 * Calculate recency score with exponential decay
 */
export function calculateRecencyScore(experience: SourceRecord): number {
  const now = new Date();
  const created = new Date(experience.created);
  const ageInDays = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
  return Math.exp(-ageInDays / 90); // 90-day half-life
}

/**
 * Calculate dimensional density (rewards richer experiences)
 */
export function calculateDimensionalDensity(experience: SourceRecord): number {
  const dimensionCount = experience.experience?.length || 0;
  return Math.min(dimensionCount / 5, 1.0);
}

/**
 * Extract known dimensions from query
 */
export function extractDimensions(query: string | string[]): string[] {
  if (Array.isArray(query)) {
    return query.filter(q => (KNOWN_DIMENSIONS as readonly string[]).includes(q));
  }
  
  if (typeof query === 'string') {
    // Check if the entire query is a dimension
    if ((KNOWN_DIMENSIONS as readonly string[]).includes(query)) return [query];
    
    // Extract dimensions from text
    const foundDimensions: string[] = [];
    for (const dim of KNOWN_DIMENSIONS) {
      if (query.includes(dim)) {
        foundDimensions.push(dim);
      } else {
        // Check for base dimension (e.g., "embodied" in query matches "embodied.thinking")
        const baseDim = dim.split('.')[0];
        if (query.includes(baseDim) && !foundDimensions.some(fd => fd.startsWith(baseDim))) {
          foundDimensions.push(baseDim);
        }
      }
    }
    
    return foundDimensions;
  }
  
  return [];
}

/**
 * Check if query is primarily dimensional
 */
export function isQueryDimensional(query: string | string[]): boolean {
  const dimensions = extractDimensions(query);
  if (Array.isArray(query)) return dimensions.length === query.length;
  if (typeof query === 'string') return dimensions.includes(query);
  return false;
}

/**
 * Check if query contains ONLY dimensional terms (no mixed text)
 */
export function isQueryPurelyDimensional(query: string | string[]): boolean {
  if (Array.isArray(query)) {
    // All elements must be dimensions
    return query.every(q => (KNOWN_DIMENSIONS as readonly string[]).includes(q));
  }
  if (typeof query === 'string') {
    // Single string must be a known dimension
    return (KNOWN_DIMENSIONS as readonly string[]).includes(query);
  }
  return false;
}

/**
 * Check if two dimensions match exactly
 */
function dimensionsMatch(dim1: string, dim2: string): boolean {
  return dim1 === dim2;
}

/**
 * Check if two dimensions partially match (base dimension matches)
 * e.g., "embodied" matches "embodied.thinking" but NOT "embodied.sensing"
 */
function dimensionsPartialMatch(dim1: string, dim2: string): boolean {
  // Only match if one is a prefix of the other
  // "embodied" matches "embodied.thinking" 
  // "embodied.thinking" does NOT match "embodied.sensing"
  return (dim1.startsWith(dim2 + '.') || dim2.startsWith(dim1 + '.'));
}

/**
 * Apply filters and scoring to experiences
 */
export function applyFiltersAndScore(
  experiences: SourceRecord[],
  query: string | string[],
  filters: {
    experiencer?: string;
    perspective?: string;
    processing?: string;
    reflects?: 'only';
  },
  semanticScores: Map<string, number>
): ScoredExperience[] {
  let filtered = experiences;
  
  // Hard filters (binary)
  // Note: reflects field doesn't exist in current SourceRecord type
  if (filters.experiencer) {
    filtered = filtered.filter(exp => exp.experiencer === filters.experiencer);
  }
  if (filters.perspective) {
    filtered = filtered.filter(exp => exp.perspective === filters.perspective);
  }
  if (filters.processing) {
    filtered = filtered.filter(exp => exp.processing === filters.processing);
  }
  
  // Dimensional filter: For pure dimensional queries, only return experiences with matching dimensions
  if (query && isQueryPurelyDimensional(query)) {
    const queryDimensions = extractDimensions(query);
    filtered = filtered.filter(exp => {
      const experienceDimensions = exp.experience || [];
      
      if (Array.isArray(query)) {
        // For array queries, ALL dimensions must match
        return queryDimensions.every(qDim => 
          experienceDimensions.some(eDim => 
            dimensionsMatch(qDim, eDim) || dimensionsPartialMatch(qDim, eDim)
          )
        );
      } else {
        // For single dimension queries, at least one must match
        return queryDimensions.some(qDim => 
          experienceDimensions.some(eDim => 
            dimensionsMatch(qDim, eDim) || dimensionsPartialMatch(qDim, eDim)
          )
        );
      }
    });
  }
  
  // Score remaining experiences
  return filtered
    .map(exp => {
      const semanticSimilarity = semanticScores.get(exp.id);
      const { score, factors, weights } = scoreExperience(exp, query, semanticSimilarity);
      return {
        experience: exp,
        score,
        factors,
        weights
      };
    })
    .sort((a, b) => b.score - a.score);
}