/**
 * Streamlined search service for Bridge.
 * Implements simple semantic search using concatenated qualities.
 */

import type { Experience, AIIdentity } from '../core/types.js';
import { getAllRecords } from '../core/storage.js';
import { embeddingService } from './embeddings.js';
import { findSimilarByEmbedding } from './embedding-search.js';
import { AI_IDENTITIES, isValidExperience } from '../core/types.js';

export interface SearchInput {
  query: string;
  limit?: number;
}

export interface SearchResult {
  experiences: Experience[];
  totalFound: number;
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
      const experience = recordMap.get(result.sourceId);
      if (experience) {
        // First check if it's mostly valid but missing AI
        if (experience && typeof experience === 'object' && 
            'who' in experience && Array.isArray(experience.who) && experience.who.length > 0) {
          // Fix who array if missing AI
          const hasAI = experience.who.some(w => AI_IDENTITIES.includes(w as AIIdentity));
          if (!hasAI) {
            experience.who = [...experience.who, 'Claude'];
          }
        }
        
        if (isValidExperience(experience)) {
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
    // If embeddings fail, fall back to text search and filter
    const allRecords = await getAllRecords();
    
    // Filter to valid experiences and perform text search
    const experiences: Experience[] = [];
    const queryLower = query.toLowerCase();
    
    for (const record of allRecords.reverse()) {
      // First check if it's mostly valid but missing AI
      if (record && typeof record === 'object' && 
          'who' in record && Array.isArray(record.who) && record.who.length > 0) {
        // Fix who array if missing AI
        const hasAI = record.who.some(w => AI_IDENTITIES.includes(w as AIIdentity));
        if (!hasAI) {
          record.who = [...record.who, 'Claude'];
        }
      }
      
      if (isValidExperience(record)) {
        // Check if experience matches query in any quality
        const searchableText = [
          record.embodied,
          record.focus,
          record.mood,
          record.purpose,
          record.space,
          record.time,
          record.presence,
          record.citation || ''
        ].join(' ').toLowerCase();
        
        if (searchableText.includes(queryLower)) {
          experiences.push(record);
          if (experiences.length >= limit) break;
        }
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