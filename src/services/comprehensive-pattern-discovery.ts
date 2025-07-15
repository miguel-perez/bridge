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
import { bridgeLogger } from '../utils/bridge-logger.js';

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
    
    if (!process.env.BRIDGE_TEST_MODE) {
      bridgeLogger.log('🌳 Starting comprehensive pattern discovery...\n');
    }
    
    // 1. Build hierarchical patterns using fixed clustering
    if (!process.env.BRIDGE_TEST_MODE) {
      bridgeLogger.log('📊 Building hierarchical patterns...');
    }
    const hierarchicalPatterns = await this.buildHierarchicalPatterns(
      experiences,
      hierarchical_threshold,
      min_cluster_size,
      max_hierarchy_depth
    );
    
    // 2. Perform single-dimensional quality analysis
    let qualityClusters: QualityCluster[] = [];
    if (quality_analysis) {
      if (!process.env.BRIDGE_TEST_MODE) {
        bridgeLogger.log('🎯 Analyzing quality dimensions...');
      }
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
    
    if (!process.env.BRIDGE_TEST_MODE) {
      bridgeLogger.log(`  Level ${currentLevel + 1}: Processing ${experiences.length} experiences`);
    }
    
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
    
    if (!process.env.BRIDGE_TEST_MODE) {
      bridgeLogger.log(`  Level ${currentLevel + 1}: Found ${patterns.length} patterns`);
    }
    
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
      if (!process.env.BRIDGE_TEST_MODE) {
        bridgeLogger.log(`  Analyzing ${dimension} dimension...`);
      }
      
      // Filter experiences with this quality prominently featured
      const relevantExperiences = experiences.filter(exp => {
        const quality = exp.experience?.qualities?.find(q => q.type === dimension);
        return quality && quality.prominence > 0.4; // Lower threshold for quality analysis
      });
      
      if (relevantExperiences.length < minSize) {
        if (!process.env.BRIDGE_TEST_MODE) {
          bridgeLogger.log(`    ${dimension}: Only ${relevantExperiences.length} experiences, skipping`);
        }
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
      
      if (!process.env.BRIDGE_TEST_MODE) {
        bridgeLogger.log(`    ${dimension}: Found ${clusterResult.patterns.length} clusters`);
      }
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
   * Generate semantic pattern name using natural language phrases
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
    
    // Extract natural phrases from experience content
    const naturalPhrases = this.extractNaturalPhrases(experiences);
    
    // If we have natural phrases, use them
    if (naturalPhrases.length > 0) {
      const phrase = naturalPhrases[0];
      return `${emojiPrefix}${phrase}`;
    }
    
    // Fallback to keyword-based natural phrases
    if (keywords.length > 0) {
      const naturalPhrase = this.generateNaturalPhrase(keywords, experiences);
      return `${emojiPrefix}${naturalPhrase}`;
    }
    
    // Final fallback
    return `${emojiPrefix}pattern-${level + 1}`;
  }
  
  /**
   * Extract natural phrases from experience content
   */
  private extractNaturalPhrases(experiences: SourceRecord[]): string[] {
    const phrases: string[] = [];
    
    for (const exp of experiences) {
      const content = exp.content.toLowerCase();
      const narrative = exp.experience?.narrative?.toLowerCase() || '';
      
      // Look for common natural phrases
      const naturalPatterns = [
        /we are (so )?(proud|excited|happy|grateful|amazed) (of|about|for|with) us/g,
        /i am (so )?(proud|excited|happy|grateful|amazed) (of|about|for|with)/g,
        /teaching .+ through .+/g,
        /learning .+ through .+/g,
        /feeling .+ about .+/g,
        /working (on|with|through) .+/g,
        /connection (with|between|creates) .+/g,
        /from .+ to .+/g,
        /did i just make .+/g,
        /this is (so|fucking|really) .+/g,
      ];
      
      for (const pattern of naturalPatterns) {
        const matches = [...(content.match(pattern) || []), ...(narrative.match(pattern) || [])];
        for (const match of matches) {
          // Clean up the match and convert to kebab-case
          const cleanMatch = match
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
          
          if (cleanMatch.length > 5) {
            phrases.push(cleanMatch);
          }
        }
      }
    }
    
    // Return most frequent phrases
    const phraseCounts = new Map<string, number>();
    phrases.forEach(phrase => {
      phraseCounts.set(phrase, (phraseCounts.get(phrase) || 0) + 1);
    });
    
    return Array.from(phraseCounts.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([phrase]) => phrase);
  }
  
  /**
   * Generate natural phrase from keywords
   */
  private generateNaturalPhrase(keywords: string[], experiences: SourceRecord[]): string {
    // Filter out common stop words and keep meaningful keywords
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
      'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
      'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that',
      'these', 'those', 'then', 'than', 'so', 'very', 'just', 'like',
      'really', 'actually', 'basically', 'literally', 'even', 'also'
    ]);
    
    // Extract meaningful keywords, prioritizing nouns and verbs
    const meaningfulKeywords = keywords
      .filter(k => k.length > 2 && !stopWords.has(k.toLowerCase()))
      .map(k => k.toLowerCase());
    
    // Analyze content for special recognizable patterns
    const allContent = experiences.map(e => (e.content + ' ' + (e.experience?.narrative || '')).toLowerCase()).join(' ');
    
    // Special case: Strong recurring phrases that should be preserved
    if (allContent.includes("i'm so proud of us") || allContent.includes("we are so proud")) {
      // But still use keyword combination: proud + us
      const proudKeywords = meaningfulKeywords.filter(k => ['proud', 'pride', 'us', 'achievement'].includes(k));
      if (proudKeywords.length >= 2) {
        return proudKeywords.join('-');
      }
    }
    
    // Prioritize keywords by relevance and frequency
    const keywordFrequency = new Map<string, number>();
    meaningfulKeywords.forEach(keyword => {
      keywordFrequency.set(keyword, (keywordFrequency.get(keyword) || 0) + 1);
    });
    
    // Sort by frequency and relevance
    const sortedKeywords = Array.from(keywordFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([keyword]) => keyword);
    
    // Take top 2-3 most meaningful keywords
    const topKeywords = sortedKeywords.slice(0, 3);
    
    // Special combinations that work well together
    const keywordSet = new Set(topKeywords);
    
    // Reorder for better readability
    let finalKeywords = topKeywords;
    
    // Put certain types of words first (subjects/actors)
    const subjects = ['captain', 'miguel', 'alicia', 'bridge', 'we', 'i'];
    const subjectKeyword = finalKeywords.find(k => subjects.includes(k));
    if (subjectKeyword) {
      finalKeywords = [subjectKeyword, ...finalKeywords.filter(k => k !== subjectKeyword)];
    }
    
    // Common meaningful combinations
    if (keywordSet.has('teaching') && keywordSet.has('simplification')) {
      return 'teaching-simplification';
    }
    if (keywordSet.has('work') && keywordSet.has('stress')) {
      return 'work-stress';
    }
    if (keywordSet.has('connection') && keywordSet.has('capability')) {
      return 'connection-capability';
    }
    if (keywordSet.has('morning') && keywordSet.has('routine')) {
      return 'morning-routine';
    }
    if (keywordSet.has('creative') && keywordSet.has('emergence')) {
      return 'creative-emergence';
    }
    if (keywordSet.has('distributed') && keywordSet.has('consciousness')) {
      return 'distributed-consciousness';
    }
    if (keywordSet.has('captain') && keywordSet.has('distributed')) {
      return 'captain-distributed';
    }
    
    // Return top 2-3 keywords combined
    if (finalKeywords.length >= 2) {
      return finalKeywords.slice(0, 3).join('-');
    }
    
    // Fallback to any available keywords
    if (meaningfulKeywords.length > 0) {
      return meaningfulKeywords.slice(0, 3).join('-');
    }
    
    // Final fallback
    return 'emerging-pattern';
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
    if (!process.env.BRIDGE_TEST_MODE) {
      bridgeLogger.log('\n🌟 COMPREHENSIVE PATTERN DISCOVERY RESULTS\n');
      
      // Statistics
      bridgeLogger.log('📊 OVERVIEW:');
      bridgeLogger.log(`Total experiences: ${result.statistics.total_experiences}`);
      bridgeLogger.log(`Hierarchical patterns: ${result.statistics.hierarchical_patterns_found}`);
      bridgeLogger.log(`Quality clusters: ${result.statistics.quality_clusters_found}`);
      bridgeLogger.log(`Outliers: ${result.statistics.outliers_count}`);
      bridgeLogger.log(`Max hierarchy depth: ${result.statistics.max_depth}`);
      bridgeLogger.log(`Average coherence: ${result.statistics.avg_coherence.toFixed(3)}\n`);
    }
    
    // Hierarchical patterns
    if (result.hierarchical_patterns.length > 0) {
      if (!process.env.BRIDGE_TEST_MODE) {
        bridgeLogger.log('🌳 HIERARCHICAL PATTERNS:');
        this.printPatternHierarchy(result.hierarchical_patterns, 0);
        bridgeLogger.log();
      }
    }
    
    // Quality clusters
    if (result.quality_clusters.length > 0) {
      if (!process.env.BRIDGE_TEST_MODE) {
        bridgeLogger.log('🎯 QUALITY DIMENSION CLUSTERS:');
        const byDimension = new Map<string, QualityCluster[]>();
        result.quality_clusters.forEach(cluster => {
          if (!byDimension.has(cluster.dimension)) {
            byDimension.set(cluster.dimension, []);
          }
          byDimension.get(cluster.dimension)!.push(cluster);
        });
        
        byDimension.forEach((clusters, dimension) => {
          bridgeLogger.log(`\n  ${dimension.toUpperCase()}:`);
          clusters.forEach(cluster => {
            bridgeLogger.log(`    ${cluster.semantic_meaning} (${cluster.size})`);
            bridgeLogger.log(`      Keywords: ${cluster.representative_keywords.slice(0, 5).join(', ')}`);
            bridgeLogger.log(`      Coherence: ${cluster.coherence.toFixed(3)}`);
          });
        });
        bridgeLogger.log();
      }
    }
  }
  
  private printPatternHierarchy(patterns: ComprehensivePattern[], indent: number): void {
    const indentStr = '  '.repeat(indent);
    
    patterns.forEach(pattern => {
      if (!process.env.BRIDGE_TEST_MODE) {
        bridgeLogger.log(`${indentStr}${pattern.name}`);
        bridgeLogger.log(`${indentStr}  Meaning: ${pattern.semantic_meaning}`);
        bridgeLogger.log(`${indentStr}  Coherence: ${pattern.coherence.toFixed(3)}, Keywords: ${pattern.keywords.slice(0, 3).join(', ')}`);
      }
      
      if (pattern.children.length > 0) {
        this.printPatternHierarchy(pattern.children, indent + 1);
      }
    });
  }
}