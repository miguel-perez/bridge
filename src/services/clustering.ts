import { SourceRecord } from '../core/types.js';

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
      commonQualities: experiences[0].experience || [],
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
    const qualities = experience.experience || [];
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
  
  if (experiences.length === 1) {
    const commonQualities = getCommonQualities(experiences);
    
    if (commonQualities.length > 0) {
      return `${experiences.length} experience with ${commonQualities.join(', ')}`;
    }
    
    return `${experiences.length} experience`;
  }
  
  const commonQualities = getCommonQualities(experiences);
  const themes = extractCommonThemes(experiences);
  
  if (commonQualities.length > 0) {
    return `${experiences.length} experiences with ${commonQualities.join(', ')}`;
  }
  
  if (themes.length > 0) {
    return `${experiences.length} experiences about ${themes.join(', ')}`;
  }
  
  return `${experiences.length} experiences`;
}

/**
 * Finds qualities that are common across all experiences in a cluster
 */
function getCommonQualities(experiences: SourceRecord[]): string[] {
  if (experiences.length === 0) return [];
  
  const allQualities = experiences
    .map(exp => exp.experience || [])
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
function extractCommonThemes(experiences: SourceRecord[]): string[] {
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

 