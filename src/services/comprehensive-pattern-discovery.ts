/**
 * Comprehensive Pattern Discovery Service
 * 
 * Combines the best of all approaches:
 * 1. Fixed embedding format with absolute temporal context
 * 2. Hierarchical pattern navigation (recursive)
 * 3. Single-dimensional quality analysis with semantic clustering
 * 4. Hard clustering to avoid overlap issues
 */

import { SourceRecord } from '../core/types.js';
import { FixedPatternDiscovery } from './fixed-pattern-discovery.js';
import { QualityAwareKeywordExtractor } from './quality-aware-keywords.js';

// ============================================================================
// ENHANCED INTERFACES
// ============================================================================

export interface ComprehensivePattern {
  id: string;
  name: string;
  level: number;
  experiences: SourceRecord[];
  centroid: number[];
  coherence: number;
  keywords: string[];
  children: ComprehensivePattern[];
  parent_id?: string;
  created: Date;
  semantic_meaning: string; // What this pattern represents
}

export interface QualityCluster {
  dimension: 'embodied' | 'attentional' | 'affective' | 'purposive' | 'spatial' | 'temporal' | 'intersubjective';
  cluster_name: string;
  semantic_meaning: string; // places, times, goals, mental models, moods, people, etc.
  experiences: SourceRecord[];
  representative_keywords: string[];
  coherence: number;
  size: number;
}

export interface ComprehensiveResult {
  hierarchical_patterns: ComprehensivePattern[];
  quality_clusters: QualityCluster[];
  outliers: SourceRecord[];
  statistics: {
    total_experiences: number;
    hierarchical_patterns_found: number;
    quality_clusters_found: number;
    outliers_count: number;
    max_depth: number;
    avg_coherence: number;
  };
}

// ============================================================================
// COMPREHENSIVE PATTERN DISCOVERY SERVICE
// ============================================================================

export class ComprehensivePatternDiscovery {
  private fixedDiscovery: FixedPatternDiscovery;
  private keywordExtractor: QualityAwareKeywordExtractor;
  
  constructor() {
    this.fixedDiscovery = new FixedPatternDiscovery();
    this.keywordExtractor = new QualityAwareKeywordExtractor();
  }
  
  /**
   * Discover patterns using all approaches: hierarchical + single-dimensional
   */
  async discoverAllPatterns(
    experiences: SourceRecord[],
    options: {
      hierarchical_threshold?: number;
      min_cluster_size?: number;
      max_hierarchy_depth?: number;
      quality_analysis?: boolean;
    } = {}
  ): Promise<ComprehensiveResult> {
    const {
      hierarchical_threshold = 0.6,
      min_cluster_size = 3,
      max_hierarchy_depth = 3,
      quality_analysis = true
    } = options;
    
    console.log('🌳 Starting comprehensive pattern discovery...\n');
    
    // 1. Build hierarchical patterns using fixed clustering
    console.log('📊 Building hierarchical patterns...');
    const hierarchicalPatterns = await this.buildHierarchicalPatterns(
      experiences,
      hierarchical_threshold,
      min_cluster_size,
      max_hierarchy_depth
    );
    
    // 2. Perform single-dimensional quality analysis
    let qualityClusters: QualityCluster[] = [];
    if (quality_analysis) {
      console.log('🎯 Analyzing quality dimensions...');
      qualityClusters = await this.analyzeQualityDimensions(experiences, min_cluster_size);
    }
    
    // 3. Identify outliers (experiences not in any pattern)
    const hierarchicalExperienceIds = new Set(
      hierarchicalPatterns.flatMap(p => this.getAllExperienceIds(p))
    );
    const qualityExperienceIds = new Set(
      qualityClusters.flatMap(c => c.experiences.map(e => e.id))
    );
    
    const outliers = experiences.filter(exp => 
      !hierarchicalExperienceIds.has(exp.id) && !qualityExperienceIds.has(exp.id)
    );
    
    // 4. Calculate statistics
    const statistics = {
      total_experiences: experiences.length,
      hierarchical_patterns_found: this.countTotalPatterns(hierarchicalPatterns),
      quality_clusters_found: qualityClusters.length,
      outliers_count: outliers.length,
      max_depth: this.findMaxDepth(hierarchicalPatterns),
      avg_coherence: this.calculateAverageCoherence([...hierarchicalPatterns, ...qualityClusters])
    };
    
    return {
      hierarchical_patterns: hierarchicalPatterns,
      quality_clusters: qualityClusters,
      outliers,
      statistics
    };
  }
  
  /**
   * Build hierarchical patterns recursively using fixed clustering
   */
  private async buildHierarchicalPatterns(
    experiences: SourceRecord[],
    threshold: number,
    minSize: number,
    maxDepth: number,
    currentLevel: number = 0,
    parentId?: string
  ): Promise<ComprehensivePattern[]> {
    if (currentLevel >= maxDepth || experiences.length < minSize * 2) {
      return [];
    }
    
    console.log(`  Level ${currentLevel + 1}: Processing ${experiences.length} experiences`);
    
    // Use fixed clustering to get clean patterns at this level
    const clusterResult = await this.fixedDiscovery.discoverPatterns(experiences, {
      similarity_threshold: threshold + (currentLevel * 0.05), // Slightly stricter each level
      min_cluster_size: minSize,
      max_clusters: 8
    });
    
    const patterns: ComprehensivePattern[] = [];
    
    // Convert each cluster to a comprehensive pattern
    for (let i = 0; i < clusterResult.patterns.length; i++) {
      const cluster = clusterResult.patterns[i];
      
      const patternId = parentId 
        ? `${parentId}.${i + 1}`
        : `L${currentLevel + 1}-${i + 1}`;
      
      // Recursively build children
      const children = await this.buildHierarchicalPatterns(
        cluster.experiences,
        threshold,
        Math.max(2, minSize - 1), // Smaller clusters allowed at deeper levels
        maxDepth,
        currentLevel + 1,
        patternId
      );
      
      const pattern: ComprehensivePattern = {
        id: patternId,
        name: this.generateSemanticName(cluster.experiences, cluster.keywords, currentLevel),
        level: currentLevel + 1,
        experiences: cluster.experiences,
        centroid: cluster.centroid,
        coherence: cluster.coherence,
        keywords: cluster.keywords,
        children,
        parent_id: parentId,
        created: new Date(),
        semantic_meaning: this.generateSemanticMeaning(cluster.experiences, cluster.keywords, currentLevel)
      };
      
      patterns.push(pattern);
    }
    
    console.log(`  Level ${currentLevel + 1}: Found ${patterns.length} patterns`);
    
    return patterns;
  }
  
  /**
   * Analyze quality dimensions with semantic clustering
   */
  private async analyzeQualityDimensions(
    experiences: SourceRecord[],
    minSize: number
  ): Promise<QualityCluster[]> {
    const dimensions = ['embodied', 'attentional', 'affective', 'purposive', 'spatial', 'temporal', 'intersubjective'] as const;
    const qualityClusters: QualityCluster[] = [];
    
    for (const dimension of dimensions) {
      console.log(`  Analyzing ${dimension} dimension...`);
      
      // Filter experiences with this quality prominently featured
      const relevantExperiences = experiences.filter(exp => {
        const quality = exp.experience?.qualities?.find(q => q.type === dimension);
        return quality && quality.prominence > 0.4; // Lower threshold for quality analysis
      });
      
      if (relevantExperiences.length < minSize) {
        console.log(`    ${dimension}: Only ${relevantExperiences.length} experiences, skipping`);
        continue;
      }
      
      // Cluster within this dimension using embeddings
      const clusterResult = await this.fixedDiscovery.discoverPatterns(relevantExperiences, {
        similarity_threshold: 0.5, // More permissive for quality clustering
        min_cluster_size: minSize,
        max_clusters: 5
      });
      
      // Convert each cluster to quality cluster with semantic meaning
      clusterResult.patterns.forEach((pattern, i) => {
        // Use quality-aware keyword extraction instead of generic keywords
        const qualityKeywords = this.keywordExtractor.extractKeywords(
          pattern.experiences,
          experiences, // all experiences for TF-IDF comparison
          dimension,
          10 // max keywords
        );
        
        const semanticMeaning = this.getQualitySemanticMeaning(dimension, qualityKeywords);
        
        qualityClusters.push({
          dimension,
          cluster_name: `${dimension}_${i + 1}`,
          semantic_meaning: semanticMeaning,
          experiences: pattern.experiences,
          representative_keywords: qualityKeywords,
          coherence: pattern.coherence,
          size: pattern.experiences.length
        });
      });
      
      console.log(`    ${dimension}: Found ${clusterResult.patterns.length} clusters`);
    }
    
    return qualityClusters;
  }
  
  /**
   * Generate semantic meaning for quality clusters
   */
  private getQualitySemanticMeaning(
    dimension: string,
    keywords: string[]
  ): string {
    const templates: Record<string, string[]> = {
      embodied: ['Physical states', 'Bodily sensations', 'Energy levels', 'Movement patterns'],
      attentional: ['Mental models', 'Focus patterns', 'Awareness styles', 'Cognitive approaches'],
      affective: ['Emotional states', 'Feeling patterns', 'Mood clusters', 'Emotional responses'],
      purposive: ['Goal orientations', 'Intention patterns', 'Purpose clusters', 'Motivation types'],
      spatial: ['Environmental contexts', 'Location patterns', 'Spatial relationships', 'Place associations'],
      temporal: ['Time patterns', 'Temporal rhythms', 'Timing clusters', 'Chronological contexts'],
      intersubjective: ['Relationship patterns', 'Social contexts', 'Interpersonal dynamics', 'Collaborative modes']
    };
    
    const baseTemplates = templates[dimension] || ['Experience clusters'];
    
    // Try to infer specific meaning from keywords
    if (keywords.some(k => ['morning', 'afternoon', 'evening'].includes(k))) {
      return 'Time-of-day patterns';
    }
    if (keywords.some(k => ['work', 'office', 'meeting'].includes(k))) {
      return 'Work context patterns';
    }
    if (keywords.some(k => ['learning', 'discovery', 'insight'].includes(k))) {
      return 'Learning experience patterns';
    }
    if (keywords.some(k => ['focus', 'attention', 'concentrate'].includes(k))) {
      return 'Attention management patterns';
    }
    
    // Fallback to template
    return baseTemplates[Math.floor(Math.random() * baseTemplates.length)];
  }
  
  /**
   * Generate semantic pattern name
   */
  private generateSemanticName(
    experiences: SourceRecord[],
    keywords: string[],
    level: number
  ): string {
    // Get emoji representation
    const emojis = experiences
      .map(e => e.experience?.emoji)
      .filter(emoji => emoji)
      .slice(0, 3);
    
    const emojiPrefix = emojis.length > 0 ? emojis.join('') + ' ' : '';
    
    // Create semantic name based on keywords and content
    if (keywords.length > 0) {
      const topKeywords = keywords.slice(0, 2).join(' & ');
      return `${emojiPrefix}${topKeywords} (${experiences.length})`;
    }
    
    // Fallback
    return `${emojiPrefix}Pattern L${level + 1} (${experiences.length})`;
  }
  
  /**
   * Generate semantic meaning description
   */
  private generateSemanticMeaning(
    experiences: SourceRecord[],
    keywords: string[],
    level: number
  ): string {
    const levelDescriptions = [
      'Broad experiential themes',
      'Specific pattern clusters',
      'Detailed sub-patterns',
      'Fine-grained variations'
    ];
    
    const baseDescription = levelDescriptions[level] || 'Pattern cluster';
    
    if (keywords.length > 0) {
      return `${baseDescription} around ${keywords.slice(0, 3).join(', ')}`;
    }
    
    return baseDescription;
  }
  
  // ============================================================================
  // UTILITY METHODS
  // ============================================================================
  
  private getAllExperienceIds(pattern: ComprehensivePattern): string[] {
    const ids = pattern.experiences.map(e => e.id);
    pattern.children.forEach(child => {
      ids.push(...this.getAllExperienceIds(child));
    });
    return ids;
  }
  
  private countTotalPatterns(patterns: ComprehensivePattern[]): number {
    return patterns.reduce((count, pattern) => 
      count + 1 + this.countTotalPatterns(pattern.children), 0
    );
  }
  
  private findMaxDepth(patterns: ComprehensivePattern[]): number {
    if (patterns.length === 0) return 0;
    return Math.max(...patterns.map(p => 
      1 + this.findMaxDepth(p.children)
    ));
  }
  
  private calculateAverageCoherence(items: Array<{ coherence: number }>): number {
    if (items.length === 0) return 0;
    return items.reduce((sum, item) => sum + item.coherence, 0) / items.length;
  }
  
  /**
   * Print comprehensive results
   */
  printResults(result: ComprehensiveResult): void {
    console.log('\n🌟 COMPREHENSIVE PATTERN DISCOVERY RESULTS\n');
    
    // Statistics
    console.log('📊 OVERVIEW:');
    console.log(`Total experiences: ${result.statistics.total_experiences}`);
    console.log(`Hierarchical patterns: ${result.statistics.hierarchical_patterns_found}`);
    console.log(`Quality clusters: ${result.statistics.quality_clusters_found}`);
    console.log(`Outliers: ${result.statistics.outliers_count}`);
    console.log(`Max hierarchy depth: ${result.statistics.max_depth}`);
    console.log(`Average coherence: ${result.statistics.avg_coherence.toFixed(3)}\n`);
    
    // Hierarchical patterns
    if (result.hierarchical_patterns.length > 0) {
      console.log('🌳 HIERARCHICAL PATTERNS:');
      this.printPatternHierarchy(result.hierarchical_patterns, 0);
      console.log();
    }
    
    // Quality clusters
    if (result.quality_clusters.length > 0) {
      console.log('🎯 QUALITY DIMENSION CLUSTERS:');
      const byDimension = new Map<string, QualityCluster[]>();
      result.quality_clusters.forEach(cluster => {
        if (!byDimension.has(cluster.dimension)) {
          byDimension.set(cluster.dimension, []);
        }
        byDimension.get(cluster.dimension)!.push(cluster);
      });
      
      byDimension.forEach((clusters, dimension) => {
        console.log(`\n  ${dimension.toUpperCase()}:`);
        clusters.forEach(cluster => {
          console.log(`    ${cluster.semantic_meaning} (${cluster.size})`);
          console.log(`      Keywords: ${cluster.representative_keywords.slice(0, 5).join(', ')}`);
          console.log(`      Coherence: ${cluster.coherence.toFixed(3)}`);
        });
      });
      console.log();
    }
  }
  
  private printPatternHierarchy(patterns: ComprehensivePattern[], indent: number): void {
    const indentStr = '  '.repeat(indent);
    
    patterns.forEach(pattern => {
      console.log(`${indentStr}${pattern.name}`);
      console.log(`${indentStr}  Meaning: ${pattern.semantic_meaning}`);
      console.log(`${indentStr}  Coherence: ${pattern.coherence.toFixed(3)}, Keywords: ${pattern.keywords.slice(0, 3).join(', ')}`);
      
      if (pattern.children.length > 0) {
        this.printPatternHierarchy(pattern.children, indent + 1);
      }
    });
  }
}