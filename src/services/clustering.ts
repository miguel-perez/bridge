import { SourceRecord, Experience } from '../core/types.js';

// Map from sentence patterns to old quality values for backward compatibility
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
      if (typeof value === 'string' && value.includes(' ')) {
        // It's a sentence, try to map it
        const mapped = mapSentenceToQuality(key, value);
        if (mapped) {
          return `${key}.${mapped}`;
        }
        return key;
      }
      return `${key}.${value}`;
    });
}
export interface ExperienceCluster {
  id: string;
  summary: string;
  experienceIds: string[];
  commonQualities: string[];
  size: number;
  semanticSimilarity?: number;
}

/**
 * Clusters experiences based on quality similarity and semantic content
 * Uses a hybrid approach: quality exact matches first, then semantic similarity
 */
export async function clusterExperiences(experiences: SourceRecord[]): Promise<ExperienceCluster[]> {
  if (experiences.length === 0) {
    return [];
  }

  if (experiences.length === 1) {
    return [{
      id: `cluster-${experiences[0].id}`,
      summary: generateClusterSummary(experiences),
      experienceIds: [experiences[0].id],
      commonQualities: extractQualityList(experiences[0]),
      size: 1
    }];
  }

  // Step 1: Cluster by quality similarity (exact matches)
  const qualityClusters = clusterByQualities(experiences);
  
  // Step 2: For clusters with multiple experiences, refine by semantic similarity
  const refinedClusters = await refineClustersBySemanticSimilarity(qualityClusters);
  
  // Step 3: Generate final cluster summaries
  return refinedClusters.map(cluster => ({
    ...cluster,
    summary: generateClusterSummary(experiences.filter(exp => cluster.experienceIds.includes(exp.id)))
  }));
}

/**
 * Groups experiences by exact quality signature matches
 */
function clusterByQualities(experiences: SourceRecord[]): ExperienceCluster[] {
  const qualityGroups = new Map<string, string[]>();
  
  experiences.forEach(experience => {
    const qualities = extractQualityList(experience);
    const qualityKey = qualities.sort().join('|');
    
    if (!qualityGroups.has(qualityKey)) {
      qualityGroups.set(qualityKey, []);
    }
    qualityGroups.get(qualityKey)!.push(experience.id);
  });
  
  return Array.from(qualityGroups.entries()).map(([qualityKey, experienceIds]) => ({
    id: `cluster-${qualityKey.slice(0, 8)}`,
    summary: '', // Will be generated later
    experienceIds,
    commonQualities: qualityKey.split('|'),
    size: experienceIds.length
  }));
}

/**
 * Refines clusters by semantic similarity using embeddings
 */
async function refineClustersBySemanticSimilarity(clusters: ExperienceCluster[]): Promise<ExperienceCluster[]> {
  const refinedClusters: ExperienceCluster[] = [];
  
  for (const cluster of clusters) {
    if (cluster.size <= 1) {
      // Single experience clusters don't need refinement
      refinedClusters.push(cluster);
      continue;
    }
    
    // For multi-experience clusters, check if they should be split by semantic similarity
    const subClusters = await splitClusterBySemanticSimilarity(cluster);
    refinedClusters.push(...subClusters);
  }
  
  return refinedClusters;
}

/**
 * Splits a cluster into sub-clusters based on semantic similarity
 */
async function splitClusterBySemanticSimilarity(cluster: ExperienceCluster): Promise<ExperienceCluster[]> {
  // This is a simplified implementation
  // In a full implementation, you would:
  // 1. Get embeddings for all experiences in the cluster
  // 2. Use DBSCAN or similar algorithm to group by semantic similarity
  // 3. Create sub-clusters based on similarity thresholds
  
  // For now, return the original cluster
  return [cluster];
}

/**
 * Generates a summary for a cluster of experiences
 */
function generateClusterSummary(experiences: SourceRecord[]): string {
  if (experiences.length === 0) return '';
  
  // Extract qualities from all experiences
  const allQualityLists = experiences
    .map(exp => extractQualityList(exp))
    .filter(qualities => qualities.length > 0);
  
  if (allQualityLists.length === 0) {
    return `${experiences.length} experience${experiences.length === 1 ? '' : 's'} (no qualities)`;
  }
  
  // Find dominant quality pattern
  const qualityCounts = new Map<string, number>();
  allQualityLists.forEach(qualities => {
    qualities.forEach(quality => {
      qualityCounts.set(quality, (qualityCounts.get(quality) || 0) + 1);
    });
  });
  
  // Sort by frequency
  const sortedQualities = Array.from(qualityCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([quality]) => quality);
  
  // Find the most dominant quality using priority
  const priorityOrder = ['purpose', 'mood', 'focus', 'embodied', 'presence', 'space', 'time'];
  let dominantQuality = sortedQualities[0];
  
  for (const priority of priorityOrder) {
    const found = sortedQualities.find(q => q.startsWith(priority));
    if (found) {
      dominantQuality = found;
      break;
    }
  }
  
  const commonQualities = getCommonQualities(experiences);
  
  if (commonQualities.length > 0) {
    return `${experiences.length} experiences with ${commonQualities.join(', ')}`;
  } else if (dominantQuality) {
    const dominantCount = qualityCounts.get(dominantQuality) || 0;
    const percentage = Math.round((dominantCount / experiences.length) * 100);
    return `${experiences.length} experiences (${percentage}% ${dominantQuality})`;
  }
  
  return `${experiences.length} experiences`;
}

/**
 * Finds qualities that are common across all experiences in a cluster
 */
function getCommonQualities(experiences: SourceRecord[]): string[] {
  if (experiences.length === 0) return [];
  
  const allQualities = experiences
    .map(exp => extractQualityList(exp))
    .filter(qualities => qualities.length > 0);
  
  if (allQualities.length === 0) return [];
  
  // Find qualities that appear in all experiences
  const firstQualities = new Set(allQualities[0]);
  
  for (let i = 1; i < allQualities.length; i++) {
    const currentQualities = new Set(allQualities[i]);
    for (const qual of firstQualities) {
      if (!currentQualities.has(qual)) {
        firstQualities.delete(qual);
      }
    }
  }
  
  return Array.from(firstQualities);
}

/**
 * Extracts common themes from experience sources
 */
function _extractCommonThemes(experiences: SourceRecord[]): string[] {
  // This is a simplified implementation
  // In a full implementation, you would:
  // 1. Extract keywords from experience sources
  // 2. Use NLP techniques to identify common themes
  // 3. Return the most frequent themes
  
  const themes: string[] = [];
  
  // Simple keyword extraction
  const allText = experiences.map(exp => exp.source.toLowerCase()).join(' ');
  const words = allText.split(/\s+/).filter(word => word.length > 3);
  
  // Count word frequencies
  const wordCounts = new Map<string, number>();
  words.forEach(word => {
    wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
  });
  
  // Find words that appear in multiple experiences
  const threshold = Math.max(2, experiences.length / 2);
  for (const [word, count] of wordCounts.entries()) {
    if (count >= threshold) {
      themes.push(word);
    }
  }
  
  return themes.slice(0, 3); // Return top 3 themes
}

 