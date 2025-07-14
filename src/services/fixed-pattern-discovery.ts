/**
 * Fixed Pattern Discovery - Resolving the overlap issue
 * 
 * Uses embedding-first hard clustering with proper thresholds,
 * avoiding the overly permissive soft clustering that caused every
 * experience to belong to 5 clusters.
 */

import { SourceRecord } from '../core/types.js';
import { EmbeddingService } from './embeddings.js';

export interface FixedPattern {
  id: string;
  name: string;
  experiences: SourceRecord[];
  centroid: number[];
  coherence: number;
  keywords: string[];
  created: Date;
}

export interface ClusteringResult {
  patterns: FixedPattern[];
  outliers: SourceRecord[];
  statistics: {
    total_experiences: number;
    patterns_found: number;
    outliers_count: number;
    average_pattern_size: number;
    average_coherence: number;
    clustering_time: number;
  };
}

export class FixedPatternDiscovery {
  private embeddingService: EmbeddingService;
  
  constructor() {
    this.embeddingService = new EmbeddingService();
  }
  
  /**
   * Discover patterns using hard clustering with proper thresholds
   */
  async discoverPatterns(
    experiences: SourceRecord[],
    options: {
      similarity_threshold?: number;
      min_cluster_size?: number;
      max_clusters?: number;
    } = {}
  ): Promise<ClusteringResult> {
    const startTime = Date.now();
    
    const {
      similarity_threshold = 0.7,  // Much stricter than 0.05!
      min_cluster_size = 3,
      max_clusters = 10
    } = options;
    
    console.log(`🔧 Fixed clustering: threshold=${similarity_threshold}, min_size=${min_cluster_size}`);
    
    // Filter experiences with valid embeddings
    const validExperiences = experiences.filter(exp => 
      exp.embedding && 
      exp.embedding.length === 384 && 
      exp.embedding.some(v => v !== 0)
    );
    
    if (validExperiences.length < min_cluster_size) {
      return this.emptyResult(validExperiences, Date.now() - startTime);
    }
    
    // Perform HARD clustering (each experience belongs to max 1 cluster)
    const clusters = await this.performHardClustering(
      validExperiences,
      similarity_threshold,
      min_cluster_size,
      max_clusters
    );
    
    // Convert clusters to patterns
    const patterns: FixedPattern[] = [];
    const outliers: SourceRecord[] = [];
    
    let patternId = 1;
    for (const cluster of clusters) {
      if (cluster.length >= min_cluster_size) {
        const pattern = await this.createPattern(cluster, `FP${patternId++}`);
        patterns.push(pattern);
      } else {
        outliers.push(...cluster);
      }
    }
    
    // Add standalone experiences as outliers
    const clusteredIds = new Set(patterns.flatMap(p => p.experiences.map(e => e.id)));
    validExperiences.forEach(exp => {
      if (!clusteredIds.has(exp.id)) {
        outliers.push(exp);
      }
    });
    
    const clusteringTime = Date.now() - startTime;
    
    return {
      patterns,
      outliers,
      statistics: {
        total_experiences: validExperiences.length,
        patterns_found: patterns.length,
        outliers_count: outliers.length,
        average_pattern_size: patterns.length > 0 ? patterns.reduce((sum, p) => sum + p.experiences.length, 0) / patterns.length : 0,
        average_coherence: patterns.length > 0 ? patterns.reduce((sum, p) => sum + p.coherence, 0) / patterns.length : 0,
        clustering_time: clusteringTime
      }
    };
  }
  
  /**
   * Hard clustering: each experience belongs to at most one cluster
   */
  private async performHardClustering(
    experiences: SourceRecord[],
    threshold: number,
    minSize: number,
    maxClusters: number
  ): Promise<SourceRecord[][]> {
    const clusters: SourceRecord[][] = [];
    const assigned = new Set<string>();
    
    console.log(`📊 Hard clustering ${experiences.length} experiences with threshold ${threshold}`);
    
    // Sort experiences by some criteria to get consistent clustering
    const sortedExperiences = [...experiences].sort((a, b) => 
      (a.system_time || '').localeCompare(b.system_time || '')
    );
    
    for (const seed of sortedExperiences) {
      if (assigned.has(seed.id) || clusters.length >= maxClusters) {
        continue;
      }
      
      // Start new cluster with this seed
      const cluster = [seed];
      assigned.add(seed.id);
      
      // Find similar unassigned experiences
      for (const candidate of sortedExperiences) {
        if (assigned.has(candidate.id)) continue;
        
        // Calculate similarity to ALL members of current cluster
        const similarities = cluster.map(member => 
          this.cosineSimilarity(candidate.embedding!, member.embedding!)
        );
        
        // Must be similar to ALL cluster members (strict requirement)
        const minSimilarity = Math.min(...similarities);
        
        if (minSimilarity >= threshold) {
          cluster.push(candidate);
          assigned.add(candidate.id);
          
          // Prevent clusters from getting too large
          if (cluster.length >= 20) break;
        }
      }
      
      // Only keep cluster if it has enough members
      if (cluster.length >= minSize) {
        clusters.push(cluster);
        console.log(`✅ Created cluster ${clusters.length} with ${cluster.length} experiences (min similarity: ${threshold})`);
      } else {
        // Remove assignments for rejected cluster
        cluster.forEach(exp => assigned.delete(exp.id));
      }
    }
    
    console.log(`🎯 Final result: ${clusters.length} clusters, ${assigned.size} assigned experiences`);
    
    return clusters;
  }
  
  /**
   * Create pattern from cluster
   */
  private async createPattern(cluster: SourceRecord[], id: string): Promise<FixedPattern> {
    const centroid = this.calculateCentroid(cluster.map(e => e.embedding!));
    const coherence = this.calculateCoherence(cluster);
    const keywords = this.extractKeywords(cluster);
    const name = this.generateName(keywords, cluster.length);
    
    return {
      id,
      name,
      experiences: cluster,
      centroid,
      coherence,
      keywords,
      created: new Date()
    };
  }
  
  /**
   * Calculate embedding centroid
   */
  private calculateCentroid(embeddings: number[][]): number[] {
    if (embeddings.length === 0) return new Array(384).fill(0);
    
    const centroid = new Array(384).fill(0);
    for (const embedding of embeddings) {
      for (let i = 0; i < 384; i++) {
        centroid[i] += embedding[i];
      }
    }
    
    return centroid.map(sum => sum / embeddings.length);
  }
  
  /**
   * Calculate cluster coherence as average pairwise similarity
   */
  private calculateCoherence(cluster: SourceRecord[]): number {
    if (cluster.length < 2) return 1;
    
    const embeddings = cluster.map(e => e.embedding!);
    let totalSimilarity = 0;
    let pairCount = 0;
    
    for (let i = 0; i < embeddings.length; i++) {
      for (let j = i + 1; j < embeddings.length; j++) {
        totalSimilarity += this.cosineSimilarity(embeddings[i], embeddings[j]);
        pairCount++;
      }
    }
    
    return pairCount > 0 ? totalSimilarity / pairCount : 0;
  }
  
  /**
   * Extract keywords from cluster narratives
   */
  private extractKeywords(cluster: SourceRecord[]): string[] {
    const allText = cluster.map(e => 
      `${e.experience?.narrative || ''} ${e.content || ''}`.toLowerCase()
    ).join(' ');
    
    // Simple keyword extraction
    const words = allText.split(/\s+/)
      .filter(w => w.length > 4)
      .filter(w => !['feeling', 'about', 'through', 'would', 'could', 'should'].includes(w));
    
    const frequency = new Map<string, number>();
    words.forEach(word => {
      const clean = word.replace(/[^a-z]/g, '');
      if (clean.length > 4) {
        frequency.set(clean, (frequency.get(clean) || 0) + 1);
      }
    });
    
    return Array.from(frequency.entries())
      .filter(([, count]) => count > 1)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);
  }
  
  /**
   * Generate pattern name
   */
  private generateName(keywords: string[], size: number): string {
    const topKeywords = keywords.slice(0, 3).join(' ');
    return topKeywords ? `${topKeywords} (${size})` : `Pattern ${size} experiences`;
  }
  
  /**
   * Cosine similarity
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    
    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (magnitudeA * magnitudeB);
  }
  
  /**
   * Create empty result
   */
  private emptyResult(experiences: SourceRecord[], duration: number): ClusteringResult {
    return {
      patterns: [],
      outliers: experiences,
      statistics: {
        total_experiences: experiences.length,
        patterns_found: 0,
        outliers_count: experiences.length,
        average_pattern_size: 0,
        average_coherence: 0,
        clustering_time: duration
      }
    };
  }
  
  /**
   * Print detailed results
   */
  printResults(result: ClusteringResult): void {
    console.log('\n🎯 FIXED PATTERN DISCOVERY RESULTS\n');
    
    console.log('📊 STATISTICS:');
    console.log(`Total experiences: ${result.statistics.total_experiences}`);
    console.log(`Patterns found: ${result.statistics.patterns_found}`);
    console.log(`Outliers: ${result.statistics.outliers_count}`);
    console.log(`Average pattern size: ${result.statistics.average_pattern_size.toFixed(1)}`);
    console.log(`Average coherence: ${result.statistics.average_coherence.toFixed(3)}`);
    console.log(`Clustering time: ${result.statistics.clustering_time}ms\n`);
    
    if (result.patterns.length > 0) {
      console.log('🔍 DISCOVERED PATTERNS:');
      result.patterns.forEach((pattern, i) => {
        console.log(`${i + 1}. ${pattern.name}`);
        console.log(`   ID: ${pattern.id}`);
        console.log(`   Size: ${pattern.experiences.length} experiences`);
        console.log(`   Coherence: ${pattern.coherence.toFixed(3)}`);
        console.log(`   Keywords: ${pattern.keywords.join(', ')}`);
        console.log(`   Sample: "${pattern.experiences[0].experience?.narrative || pattern.experiences[0].content?.slice(0, 80) || 'No content'}"`);
        console.log();
      });
    }
    
    if (result.outliers.length > 0) {
      console.log(`🔍 OUTLIERS (${result.outliers.length} experiences):`);
      console.log('   Experiences that didn\'t cluster with others');
      console.log(`   Sample: "${result.outliers[0].experience?.narrative || result.outliers[0].content?.slice(0, 80) || 'No content'}"`);
      console.log();
    }
    
    console.log('✅ KEY IMPROVEMENT:');
    console.log('   Each experience belongs to AT MOST one pattern (hard clustering)');
    console.log('   No more "every experience in 5 clusters" issue');
    console.log('   Clear pattern boundaries and meaningful groupings');
  }
}