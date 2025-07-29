/**
 * Streamlined search service for Bridge.
 * Implements simple semantic search using concatenated qualities.
 */

import type { Experience } from '../core/types.js';
import { getAllRecords, getAllEmbeddings } from '../core/storage.js';
import { embeddingService } from './embeddings.js';
import { findSimilarByEmbedding } from './embedding-search.js';

export interface SearchInput {
  query: string;
  limit?: number;
}

export interface SearchResult {
  experiences: Experience[];
  totalFound: number;
}

/**
 * Converts a stored Source record to the new Experience format.
 * This is temporary during migration.
 */
function sourceToExperience(source: any): Experience | null {
  // Skip records without proper qualities
  if (!source.experienceQualities || typeof source.experienceQualities !== 'object') {
    return null;
  }

  const qualities = source.experienceQualities;
  
  // Skip if any required quality is missing or false
  const requiredQualities = ['embodied', 'focus', 'mood', 'purpose', 'space', 'time', 'presence'];
  for (const q of requiredQualities) {
    if (!qualities[q] || qualities[q] === false) {
      return null;
    }
  }

  // Ensure who array includes AI
  let who = source.who || [];
  if (!Array.isArray(who)) {
    who = [who];
  }
  // If no AI in who array, assume Claude was involved (for migration)
  if (!who.some((w: string) => ['Claude', 'GPT-4', 'GPT-3.5', 'Gemini', 'Assistant'].includes(w))) {
    who.push('Claude');
  }

  return {
    id: source.id,
    created: source.created,
    anchor: source.emoji,
    embodied: qualities.embodied,
    focus: qualities.focus,
    mood: qualities.mood,
    purpose: qualities.purpose,
    space: qualities.space,
    time: qualities.time,
    presence: qualities.presence,
    who,
    citation: source.source !== 'Experience experienced' ? source.source : undefined,
  };
}

/**
 * Builds searchable text from an experience.
 * Concatenates all qualities and citation for unified search.
 */
function buildSearchableText(experience: Experience): string {
  return [
    experience.embodied,
    experience.focus,
    experience.mood,
    experience.purpose,
    experience.space,
    experience.time,
    experience.presence,
    experience.citation || ''
  ].filter(Boolean).join(' ');
}

/**
 * Simple semantic search for experiences.
 * 
 * @param input - Search parameters
 * @returns Search results
 */
export async function searchExperiences(input: SearchInput): Promise<SearchResult> {
  const { query, limit = 25 } = input;

  try {
    // Initialize embedding service
    await embeddingService.initialize();

    // Generate embedding for the query
    const queryEmbedding = await embeddingService.generateEmbedding(query);

    // Find similar experiences by embedding
    const similarResults = await findSimilarByEmbedding(
      queryEmbedding,
      limit * 2 // Get more to account for filtering
    );

    // Get all records to convert and filter
    const allRecords = await getAllRecords();
    const recordMap = new Map(allRecords.map(r => [r.id, r]));

    // Convert results to experiences and filter out invalid ones
    const experiences: Experience[] = [];
    for (const result of similarResults) {
      const source = recordMap.get(result.sourceId);
      if (source) {
        const experience = sourceToExperience(source);
        if (experience) {
          experiences.push(experience);
          if (experiences.length >= limit) break;
        }
      }
    }

    return {
      experiences,
      totalFound: experiences.length,
    };
  } catch (error) {
    // If embeddings fail, fall back to returning recent experiences
    const allRecords = await getAllRecords();
    
    // Convert and filter to valid experiences
    const experiences: Experience[] = [];
    for (const record of allRecords.reverse()) { // Most recent first
      const experience = sourceToExperience(record);
      if (experience) {
        experiences.push(experience);
        if (experiences.length >= limit) break;
      }
    }

    return {
      experiences,
      totalFound: experiences.length,
    };
  }
}

/**
 * Simple recall function for the experience tool.
 * Performs basic semantic search with the provided query.
 */
export async function recall(query: string, limit: number = 25): Promise<Experience[]> {
  const result = await searchExperiences({ query, limit });
  return result.experiences;
}