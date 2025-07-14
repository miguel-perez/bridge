/**
 * Incremental Pattern Update Service
 * 
 * Efficiently updates patterns when new experiences are added or modified
 * without requiring full rediscovery of all patterns.
 */

import { ComprehensivePatternDiscovery } from './comprehensive-pattern-discovery.js';
import { SourceRecord } from '../core/types.js';
import { NavigablePattern, QualityPattern } from './pattern-manager.js';
// import { getVectorStore } from './vector-store.js';

export interface PatternUpdate {
  type: 'add' | 'modify' | 'remove' | 'merge' | 'split';
  patternId: string;
  affectedExperiences: string[];
  confidence: number;
}

export interface IncrementalUpdateResult {
  updatedPatterns: NavigablePattern[];
  updatedQualityPatterns: QualityPattern[];
  changes: PatternUpdate[];
  stats: {
    patternsAffected: number;
    experiencesProcessed: number;
    timeMs: number;
  };
}

export class IncrementalPatternUpdateService {
  private discoveryService: ComprehensivePatternDiscovery;
  private readonly SIMILARITY_THRESHOLD = 0.7;
  private readonly MIN_PATTERN_SIZE = 3;
  
  constructor() {
    this.discoveryService = new ComprehensivePatternDiscovery();
  }
  
  /**
   * Update patterns incrementally based on new/modified experiences
   */
  async updatePatterns(
    newExperiences: SourceRecord[],
    existingPatterns: NavigablePattern[],
    existingQualityPatterns: QualityPattern[],
    allExperiences: SourceRecord[]
  ): Promise<IncrementalUpdateResult> {
    const startTime = Date.now();
    const changes: PatternUpdate[] = [];
    
    // Clone patterns to avoid mutation
    let updatedPatterns = this.deepClonePatterns(existingPatterns);
    let updatedQualityPatterns = [...existingQualityPatterns];
    
    // Process each new experience
    for (const experience of newExperiences) {
      // Find most similar existing patterns
      const patternAssignments = await this.findBestPatternMatches(
        experience,
        updatedPatterns,
        allExperiences
      );
      
      // Update hierarchical patterns
      for (const assignment of patternAssignments) {
        this.addExperienceToPattern(
          assignment.pattern,
          experience
        );
        
        changes.push({
          type: 'add',
          patternId: assignment.pattern.id,
          affectedExperiences: [experience.id],
          confidence: assignment.similarity
        });
      }
      
      // Update quality patterns
      const qualityUpdates = await this.updateQualityPatterns(
        experience,
        updatedQualityPatterns,
        allExperiences
      );
      
      updatedQualityPatterns = qualityUpdates.patterns;
      changes.push(...qualityUpdates.changes);
    }
    
    // Check for pattern merges/splits
    const structuralChanges = await this.checkStructuralChanges(
      updatedPatterns,
      allExperiences
    );
    
    if (structuralChanges.length > 0) {
      updatedPatterns = await this.applyStructuralChanges(
        updatedPatterns,
        structuralChanges
      );
      changes.push(...structuralChanges);
    }
    
    // Recalculate pattern metadata
    this.updatePatternMetadata(updatedPatterns, allExperiences);
    
    return {
      updatedPatterns,
      updatedQualityPatterns,
      changes,
      stats: {
        patternsAffected: new Set(changes.map(c => c.patternId)).size,
        experiencesProcessed: newExperiences.length,
        timeMs: Date.now() - startTime
      }
    };
  }
  
  /**
   * Find best matching patterns for a new experience
   */
  private async findBestPatternMatches(
    experience: SourceRecord,
    patterns: NavigablePattern[],
    allExperiences: SourceRecord[]
  ): Promise<Array<{ pattern: NavigablePattern; similarity: number }>> {
    // Vector store not used directly in this method
    // const vectorStore = getVectorStore();
    const matches: Array<{ pattern: NavigablePattern; similarity: number }> = [];
    
    if (!experience.embedding) return matches;
    
    // Helper to process pattern hierarchy
    const processPattern = async (pattern: NavigablePattern, level: number = 0) => {
      // Get pattern centroid
      const patternExperiences = allExperiences.filter(e => 
        pattern.experienceIds.includes(e.id)
      );
      
      if (patternExperiences.length === 0) return;
      
      // Calculate similarity to pattern centroid
      const centroid = this.calculateCentroid(
        patternExperiences.map(e => e.embedding!).filter(e => e)
      );
      
      const similarity = this.cosineSimilarity(experience.embedding!, centroid);
      
      if (similarity >= this.SIMILARITY_THRESHOLD) {
        matches.push({ pattern, similarity });
        
        // Check children for better matches
        for (const child of pattern.children) {
          await processPattern(child, level + 1);
        }
      }
    };
    
    // Process all root patterns
    for (const pattern of patterns) {
      await processPattern(pattern);
    }
    
    // Sort by similarity and return top matches
    return matches
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3); // Limit to top 3 matches
  }
  
  /**
   * Update quality-specific patterns with new experience
   */
  private async updateQualityPatterns(
    experience: SourceRecord,
    qualityPatterns: QualityPattern[],
    allExperiences: SourceRecord[]
  ): Promise<{ patterns: QualityPattern[]; changes: PatternUpdate[] }> {
    const updatedPatterns = [...qualityPatterns];
    const changes: PatternUpdate[] = [];
    
    if (!experience.experience?.qualities) {
      return { patterns: updatedPatterns, changes };
    }
    
    // Get dominant qualities
    const dominantQualities = experience.experience.qualities
      .filter(q => q.prominence >= 0.6)
      .map(q => q.type);
    
    for (const quality of dominantQualities) {
      // Find existing patterns for this quality
      const qualitySpecificPatterns = updatedPatterns.filter(p => 
        p.dimension === quality
      );
      
      // Find best matching cluster
      let bestMatch: QualityPattern | null = null;
      let bestSimilarity = 0;
      
      for (const pattern of qualitySpecificPatterns) {
        const patternExperiences = allExperiences.filter(e => 
          pattern.experiences.includes(e.id)
        );
        
        if (patternExperiences.length === 0) continue;
        
        const centroid = this.calculateCentroid(
          patternExperiences.map(e => e.embedding!).filter(e => e)
        );
        
        const similarity = this.cosineSimilarity(
          experience.embedding!,
          centroid
        );
        
        if (similarity > bestSimilarity && similarity >= 0.6) {
          bestMatch = pattern;
          bestSimilarity = similarity;
        }
      }
      
      if (bestMatch) {
        // Add to existing pattern
        bestMatch.experiences.push(experience.id);
        bestMatch.size++;
        
        changes.push({
          type: 'add',
          patternId: `${bestMatch.dimension}-${bestMatch.cluster_name}`,
          affectedExperiences: [experience.id],
          confidence: bestSimilarity
        });
      } else {
        // Consider creating new pattern if we have enough similar experiences
        // (This would typically be done in a full rediscovery)
      }
    }
    
    return { patterns: updatedPatterns, changes };
  }
  
  /**
   * Check for potential pattern merges or splits
   */
  private async checkStructuralChanges(
    patterns: NavigablePattern[],
    allExperiences: SourceRecord[]
  ): Promise<PatternUpdate[]> {
    const changes: PatternUpdate[] = [];
    
    // Check each pattern for potential splits
    for (const pattern of patterns) {
      if (pattern.experienceIds.length < this.MIN_PATTERN_SIZE * 2) {
        continue; // Too small to split
      }
      
      // Calculate internal cohesion
      const cohesion = await this.calculatePatternCohesion(pattern, allExperiences);
      
      if (cohesion < 0.5) {
        // Pattern should potentially split
        changes.push({
          type: 'split',
          patternId: pattern.id,
          affectedExperiences: pattern.experienceIds,
          confidence: 1 - cohesion
        });
      }
    }
    
    // Check for potential merges between sibling patterns
    const checkSiblings = (siblingPatterns: NavigablePattern[]) => {
      for (let i = 0; i < siblingPatterns.length; i++) {
        for (let j = i + 1; j < siblingPatterns.length; j++) {
          const pattern1 = siblingPatterns[i];
          const pattern2 = siblingPatterns[j];
          
          const similarity = this.calculatePatternSimilarity(
            pattern1,
            pattern2,
            allExperiences
          );
          
          if (similarity > 0.8) {
            // Patterns should potentially merge
            changes.push({
              type: 'merge',
              patternId: pattern1.id,
              affectedExperiences: [
                ...pattern1.experienceIds,
                ...pattern2.experienceIds
              ],
              confidence: similarity
            });
          }
        }
      }
      
      // Recursively check children
      siblingPatterns.forEach(p => checkSiblings(p.children));
    };
    
    checkSiblings(patterns);
    
    return changes;
  }
  
  /**
   * Apply structural changes to pattern hierarchy
   */
  private async applyStructuralChanges(
    patterns: NavigablePattern[],
    changes: PatternUpdate[]
  ): Promise<NavigablePattern[]> {
    // For now, we'll trigger a full rediscovery if structural changes are needed
    // In a production system, this would handle merges/splits incrementally
    if (!process.env.BRIDGE_TEST_MODE) {
      console.log(`Structural changes detected: ${changes.length} changes. Full rediscovery recommended.`);
    }
    return patterns;
  }
  
  /**
   * Add experience to pattern and update metadata
   */
  private addExperienceToPattern(
    pattern: NavigablePattern,
    experience: SourceRecord
  ): void {
    if (!pattern.experienceIds.includes(experience.id)) {
      pattern.experienceIds.push(experience.id);
      
      // Update pattern metadata
      if (experience.experience?.emoji) {
        const emoji = experience.experience.emoji;
        const emojiIndex = pattern.metadata.emojis.findIndex(e => e === emoji);
        
        if (emojiIndex === -1 && pattern.metadata.emojis.length < 4) {
          pattern.metadata.emojis.push(emoji);
        }
      }
    }
  }
  
  /**
   * Update all pattern metadata after changes
   */
  private updatePatternMetadata(
    patterns: NavigablePattern[],
    allExperiences: SourceRecord[]
  ): void {
    const updatePattern = (pattern: NavigablePattern) => {
      const patternExperiences = allExperiences.filter(e => 
        pattern.experienceIds.includes(e.id)
      );
      
      // Recalculate coherence
      pattern.coherence = this.calculateAverageCoherence(patternExperiences);
      
      // Update qualities
      pattern.metadata.qualities = this.calculateQualities(patternExperiences);
      
      // Update recency
      pattern.metadata.recency = this.calculateRecency(patternExperiences);
      
      // Update themes/keywords
      pattern.metadata.themes = this.extractThemes(patternExperiences);
      
      // Recursively update children
      pattern.children.forEach(updatePattern);
    };
    
    patterns.forEach(updatePattern);
  }
  
  // ============================================================================
  // HELPER METHODS
  // ============================================================================
  
  private deepClonePatterns(patterns: NavigablePattern[]): NavigablePattern[] {
    return JSON.parse(JSON.stringify(patterns));
  }
  
  private calculateCentroid(embeddings: number[][]): number[] {
    if (embeddings.length === 0) return [];
    
    const dimensions = embeddings[0].length;
    const centroid = new Array(dimensions).fill(0);
    
    for (const embedding of embeddings) {
      for (let i = 0; i < dimensions; i++) {
        centroid[i] += embedding[i];
      }
    }
    
    for (let i = 0; i < dimensions; i++) {
      centroid[i] /= embeddings.length;
    }
    
    return centroid;
  }
  
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);
    
    if (normA === 0 || normB === 0) return 0;
    
    return dotProduct / (normA * normB);
  }
  
  private async calculatePatternCohesion(
    pattern: NavigablePattern,
    allExperiences: SourceRecord[]
  ): Promise<number> {
    const experiences = allExperiences.filter(e => 
      pattern.experienceIds.includes(e.id)
    );
    
    if (experiences.length < 2) return 1;
    
    const embeddings = experiences
      .map(e => e.embedding)
      .filter(e => e) as number[][];
    
    if (embeddings.length < 2) return 1;
    
    // Calculate average pairwise similarity
    let totalSimilarity = 0;
    let pairs = 0;
    
    for (let i = 0; i < embeddings.length; i++) {
      for (let j = i + 1; j < embeddings.length; j++) {
        totalSimilarity += this.cosineSimilarity(embeddings[i], embeddings[j]);
        pairs++;
      }
    }
    
    return pairs > 0 ? totalSimilarity / pairs : 1;
  }
  
  private calculatePatternSimilarity(
    pattern1: NavigablePattern,
    pattern2: NavigablePattern,
    allExperiences: SourceRecord[]
  ): number {
    const experiences1 = allExperiences.filter(e => 
      pattern1.experienceIds.includes(e.id)
    );
    const experiences2 = allExperiences.filter(e => 
      pattern2.experienceIds.includes(e.id)
    );
    
    const centroid1 = this.calculateCentroid(
      experiences1.map(e => e.embedding!).filter(e => e)
    );
    const centroid2 = this.calculateCentroid(
      experiences2.map(e => e.embedding!).filter(e => e)
    );
    
    return this.cosineSimilarity(centroid1, centroid2);
  }
  
  private calculateAverageCoherence(experiences: SourceRecord[]): number {
    if (experiences.length < 2) return 1;
    
    const embeddings = experiences
      .map(e => e.embedding)
      .filter(e => e) as number[][];
    
    const centroid = this.calculateCentroid(embeddings);
    
    let totalSimilarity = 0;
    for (const embedding of embeddings) {
      totalSimilarity += this.cosineSimilarity(embedding, centroid);
    }
    
    return totalSimilarity / embeddings.length;
  }
  
  private calculateQualities(experiences: SourceRecord[]): { [key: string]: number } {
    const qualities: { [key: string]: number } = {};
    const qualityNames = ['embodied', 'attentional', 'affective', 'purposive', 'spatial', 'temporal', 'intersubjective'];
    
    qualityNames.forEach(quality => {
      let total = 0;
      let count = 0;
      
      experiences.forEach(exp => {
        const q = exp.experience?.qualities?.find((q: any) => q.type === quality);
        if (q) {
          total += q.prominence;
          count++;
        }
      });
      
      qualities[quality] = count > 0 ? total / count : 0;
    });
    
    return qualities;
  }
  
  private calculateRecency(experiences: SourceRecord[]): 'active' | 'recent' | 'past' | 'dormant' {
    const now = Date.now();
    const times = experiences.map(e => 
      new Date(e.occurred || e.system_time).getTime()
    );
    
    if (times.length === 0) return 'dormant';
    
    const mostRecent = Math.max(...times);
    const daysSince = (now - mostRecent) / (1000 * 60 * 60 * 24);
    
    if (daysSince < 7) return 'active';
    if (daysSince < 30) return 'recent';
    if (daysSince < 90) return 'past';
    return 'dormant';
  }
  
  private extractThemes(experiences: SourceRecord[]): string[] {
    const texts = experiences.map(e => 
      (e.experience?.narrative || e.content || '').toLowerCase()
    );
    
    const allText = texts.join(' ');
    const words = allText.split(/\s+/).filter(w => w.length > 4);
    
    const freq = new Map<string, number>();
    words.forEach(w => freq.set(w, (freq.get(w) || 0) + 1));
    
    return Array.from(freq.entries())
      .filter(([, count]) => count > 1)
      .sort(([,a], [,b]) => b - a)
      .map(([word]) => word)
      .slice(0, 10);
  }
}