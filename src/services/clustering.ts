import { SourceRecord } from '../core/types.js';

export interface ExperienceCluster {
  id: string;
  summary: string;
  experienceIds: string[];
  commonDimensions: string[];
  size: number;
  semanticSimilarity?: number;
}

/**
 * Clusters experiences based on dimensional similarity and semantic content
 * Uses a hybrid approach: dimensional exact matches first, then semantic similarity
 */
export async function clusterExperiences(experiences: SourceRecord[]): Promise<ExperienceCluster[]> {
  if (experiences.length === 0) {
    return [];
  }

  if (experiences.length === 1) {
    const experience = experiences[0];
    return [{
      id: `cluster-${experience.id}`,
      summary: generateClusterSummary([experience]),
      experienceIds: [experience.id],
      commonDimensions: experience.experience || [],
      size: 1
    }];
  }

  // Step 1: Cluster by dimensional similarity (exact matches)
  const dimensionalClusters = clusterByDimensions(experiences);
  
  // Step 2: For clusters with multiple experiences, refine by semantic similarity
  const refinedClusters = await refineClustersBySemanticSimilarity(dimensionalClusters);
  
  // Step 3: Generate final cluster summaries
  return refinedClusters.map(cluster => ({
    ...cluster,
    summary: generateClusterSummary(experiences.filter(exp => cluster.experienceIds.includes(exp.id)))
  }));
}

/**
 * Groups experiences by exact dimensional signature matches
 */
function clusterByDimensions(experiences: SourceRecord[]): ExperienceCluster[] {
  const dimensionGroups = new Map<string, string[]>();
  
  experiences.forEach(experience => {
    const dimensions = experience.experience || [];
    const dimensionKey = dimensions.sort().join('|');
    
    if (!dimensionGroups.has(dimensionKey)) {
      dimensionGroups.set(dimensionKey, []);
    }
    dimensionGroups.get(dimensionKey)!.push(experience.id);
  });
  
  return Array.from(dimensionGroups.entries()).map(([dimensionKey, experienceIds]) => ({
    id: `cluster-${dimensionKey.slice(0, 8)}`,
    summary: '', // Will be generated later
    experienceIds,
    commonDimensions: dimensionKey.split('|'),
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
  // This can be enhanced later with actual semantic clustering
  return [cluster];
}

/**
 * Generates a meaningful summary for a cluster of experiences
 */
function generateClusterSummary(experiences: SourceRecord[]): string {
  if (experiences.length === 0) {
    return 'Empty cluster';
  }
  
  if (experiences.length === 1) {
    const experience = experiences[0];
    return `Single experience: ${experience.source.substring(0, 100)}${experience.source.length > 100 ? '...' : ''}`;
  }
  
  // Analyze common patterns
  const commonDimensions = getCommonDimensions(experiences);
  const commonThemes = extractCommonThemes(experiences);
  
  if (commonThemes.length > 0) {
    return `${experiences.length} experiences about ${commonThemes.join(', ')}`;
  }
  
  if (commonDimensions.length > 0) {
    return `${experiences.length} experiences with ${commonDimensions.join(', ')}`;
  }
  
  return `${experiences.length} similar experiences`;
}

/**
 * Finds dimensions that are common across all experiences in a cluster
 */
function getCommonDimensions(experiences: SourceRecord[]): string[] {
  if (experiences.length === 0) return [];
  
  const allDimensions = experiences
    .map(exp => exp.experience || [])
    .filter(dims => dims.length > 0);
  
  if (allDimensions.length === 0) return [];
  
  // Find dimensions that appear in all experiences
  const firstDimensions = new Set(allDimensions[0]);
  
  for (let i = 1; i < allDimensions.length; i++) {
    const currentDimensions = new Set(allDimensions[i]);
    for (const dim of firstDimensions) {
      if (!currentDimensions.has(dim)) {
        firstDimensions.delete(dim);
      }
    }
  }
  
  return Array.from(firstDimensions);
}

/**
 * Extracts common themes from experience sources
 */
function extractCommonThemes(experiences: SourceRecord[]): string[] {
  const themes: string[] = [];
  
  // Simple keyword extraction
  const keywords = ['anxiety', 'anxious', 'excited', 'focused', 'overwhelmed', 'stuck', 'energized'];
  
  const sourceText = experiences.map(exp => exp.source.toLowerCase()).join(' ');
  
  for (const keyword of keywords) {
    if (sourceText.includes(keyword)) {
      themes.push(keyword);
    }
  }
  
  return themes.slice(0, 3); // Limit to top 3 themes
}

 