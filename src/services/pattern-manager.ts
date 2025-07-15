/**
 * Pattern Manager Service
 * 
 * Manages automatic pattern discovery, caching, and incremental updates.
 * Patterns are discovered automatically on data mutations and cached for performance.
 */

import { ComprehensivePatternDiscovery } from './comprehensive-pattern-discovery.js';
import { IncrementalPatternUpdateService } from './incremental-pattern-updates.js';
import { PatternEvolutionService } from './pattern-evolution.js';
import { SourceRecord } from '../core/types.js';
import { getAllRecords, updateSource } from '../core/storage.js';
import { readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { getDataFilePath } from '../core/config.js';

// ============================================================================
// INTERFACES
// ============================================================================

export interface PatternCache {
  patterns: NavigablePattern[];
  qualityPatterns: QualityPattern[];
  lastUpdated: string;
  version: number;
  stats: {
    totalExperiences: number;
    totalPatterns: number;
    totalQualityPatterns: number;
    maxDepth: number;
  };
}

export interface NavigablePattern {
  id: string;
  name: string;
  level: number;
  experienceIds: string[];
  coherence: number;
  children: NavigablePattern[];
  metadata: {
    emojis: string[];
    themes: string[];
    qualities: { [key: string]: number };
    recency: 'active' | 'recent' | 'past' | 'dormant';
    semantic_meaning?: string;
  };
}

export interface QualityPattern {
  dimension: string;
  cluster_name: string;
  semantic_meaning: string;
  experiences: string[]; // Just IDs for caching
  keywords: string[];
  coherence: number;
  size: number;
}

// ============================================================================
// PATTERN MANAGER
// ============================================================================

export class PatternManager {
  private discoveryService: ComprehensivePatternDiscovery;
  private incrementalService: IncrementalPatternUpdateService;
  private evolutionService: PatternEvolutionService;
  private cache: PatternCache | null = null;
  private pendingUpdates: Set<string> = new Set();
  private updateTimer: NodeJS.Timeout | null = null;
  private readonly UPDATE_DELAY = 5000; // 5 seconds debounce
  private readonly BATCH_THRESHOLD = 10; // Force update after 10 changes
  
  constructor() {
    this.discoveryService = new ComprehensivePatternDiscovery();
    this.incrementalService = new IncrementalPatternUpdateService();
    this.evolutionService = new PatternEvolutionService();
  }
  
  /**
   * Initialize pattern manager and load cached patterns
   */
  async initialize(): Promise<void> {
    // Try to load cached patterns
    await this.loadCache();
    
    // Initialize evolution service with existing cache
    if (this.cache) {
      await this.evolutionService.initialize(this.cache);
    }
    
    // If no cache or cache is old, trigger full discovery
    if (!this.cache || this.isCacheStale()) {
      await this.fullPatternDiscovery();
    }
  }
  
  /**
   * Get current pattern hierarchy
   */
  async getPatterns(): Promise<NavigablePattern[]> {
    if (!this.cache || this.isCacheStale()) {
      await this.fullPatternDiscovery();
    }
    return this.cache?.patterns || [];
  }
  
  /**
   * Get quality-specific patterns
   */
  async getQualityPatterns(dimension?: string): Promise<QualityPattern[]> {
    if (!this.cache || this.isCacheStale()) {
      await this.fullPatternDiscovery();
    }
    
    const patterns = this.cache?.qualityPatterns || [];
    if (dimension) {
      return patterns.filter(p => p.dimension === dimension);
    }
    return patterns;
  }
  
  /**
   * Handle new capture - schedule pattern update
   */
  async onCapture(sourceId: string): Promise<void> {
    this.pendingUpdates.add(sourceId);
    this.scheduleUpdate();
  }
  
  /**
   * Handle update - schedule pattern update
   */
  async onUpdate(sourceId: string): Promise<void> {
    this.pendingUpdates.add(sourceId);
    this.scheduleUpdate();
  }
  
  /**
   * Handle deletion - immediate pattern update
   */
  async onDelete(sourceId: string): Promise<void> {
    // Remove from pending if it was there
    this.pendingUpdates.delete(sourceId);
    
    // Remove from cached patterns immediately
    if (this.cache) {
      this.removeFromPatterns(sourceId, this.cache.patterns);
      await this.saveCache();
    }
  }
  
  /**
   * Browse patterns - get pattern by ID or root patterns
   */
  async browse(patternId?: string, depth: number = 1): Promise<NavigablePattern | NavigablePattern[]> {
    const patterns = await this.getPatterns();
    
    if (!patternId) {
      // Return root patterns
      return this.getPatternsByDepth(patterns, depth);
    }
    
    // Find specific pattern
    const pattern = this.findPatternById(patterns, patternId);
    if (!pattern) {
      throw new Error(`Pattern ${patternId} not found`);
    }
    
    // Return pattern with limited depth
    return this.limitPatternDepth(pattern, depth);
  }
  
  /**
   * Force refresh pattern discovery
   */
  async refreshPatterns(): Promise<void> {
    await this.fullPatternDiscovery();
  }
  
  /**
   * Get pattern evolution data
   */
  getPatternEvolution(patternId: string) {
    return this.evolutionService.getPatternEvolution(patternId);
  }
  
  /**
   * Get evolution events
   */
  getEvolutionEvents(patternId?: string, eventType?: string, days?: number) {
    return this.evolutionService.getEvolutionEvents(patternId, eventType as any, days);
  }
  
  /**
   * Get ecosystem evolution statistics
   */
  getEcosystemStats() {
    return this.evolutionService.getEcosystemStats();
  }
  
  /**
   * Predict pattern future
   */
  predictPatternFuture(patternId: string) {
    return this.evolutionService.predictPatternFuture(patternId);
  }
  
  /**
   * Get pattern statistics
   */
  async getStatistics(): Promise<{
    totalPatterns: number;
    totalExperiences: number;
    totalQualityPatterns: number;
    maxDepth: number;
    lastUpdated: string;
    patternsByLevel: { [level: number]: number };
    patternsByRecency: { [recency: string]: number };
    evolution?: any;
  }> {
    const patterns = await this.getPatterns();
    
    // Count patterns by level
    const patternsByLevel: { [level: number]: number } = {};
    const patternsByRecency: { [recency: string]: number } = {};
    
    const countPatterns = (patternList: NavigablePattern[]) => {
      patternList.forEach(p => {
        patternsByLevel[p.level] = (patternsByLevel[p.level] || 0) + 1;
        patternsByRecency[p.metadata.recency] = (patternsByRecency[p.metadata.recency] || 0) + 1;
        countPatterns(p.children);
      });
    };
    
    countPatterns(patterns);
    
    return {
      totalPatterns: this.cache?.stats.totalPatterns || 0,
      totalExperiences: this.cache?.stats.totalExperiences || 0,
      totalQualityPatterns: this.cache?.stats.totalQualityPatterns || 0,
      maxDepth: this.cache?.stats.maxDepth || 0,
      lastUpdated: this.cache?.lastUpdated || new Date().toISOString(),
      patternsByLevel,
      patternsByRecency,
      evolution: this.evolutionService.getEcosystemStats()
    };
  }
  
  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================
  
  private scheduleUpdate(): void {
    // Clear existing timer
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
    }
    
    // Force update if we have too many pending changes
    if (this.pendingUpdates.size >= this.BATCH_THRESHOLD) {
      this.performIncrementalUpdate();
      return;
    }
    
    // Otherwise debounce
    this.updateTimer = setTimeout(() => {
      this.performIncrementalUpdate();
    }, this.UPDATE_DELAY);
  }
  
  private async performIncrementalUpdate(): Promise<void> {
    if (this.pendingUpdates.size === 0) return;
    
    const updateIds = Array.from(this.pendingUpdates);
    this.pendingUpdates.clear();
    
    try {
      // Get all records
      const allRecords = await getAllRecords();
      
      // Get the specific updated records
      const updatedRecords = allRecords.filter(r => updateIds.includes(r.id));
      
      if (!this.cache) {
        // No cache exists, do full discovery
        await this.fullPatternDiscovery();
        return;
      }
      
      // Filter to records with embeddings
      const withEmbeddings = updatedRecords.filter(r => 
        r.embedding && r.embedding.length === 384 && r.embedding.some(v => v !== 0)
      );
      
      if (withEmbeddings.length === 0) return;
      
      if (!process.env.BRIDGE_TEST_MODE) {
        console.log(`Performing incremental pattern update for ${withEmbeddings.length} experiences...`);
      }
      
      // Use incremental update service
      const updateResult = await this.incrementalService.updatePatterns(
        withEmbeddings,
        this.cache.patterns,
        this.cache.qualityPatterns,
        allRecords.filter(r => r.embedding && r.embedding.length === 384)
      );
      
      // Check if structural changes require full rediscovery
      const structuralChanges = updateResult.changes.filter(c => 
        c.type === 'merge' || c.type === 'split'
      );
      
      if (structuralChanges.length > 0) {
        if (!process.env.BRIDGE_TEST_MODE) {
          console.log(`Structural changes detected (${structuralChanges.length}). Performing full rediscovery...`);
        }
        await this.fullPatternDiscovery();
        return;
      }
      
      // Update cache with incremental changes
      this.cache.patterns = updateResult.updatedPatterns;
      this.cache.qualityPatterns = updateResult.updatedQualityPatterns;
      this.cache.lastUpdated = new Date().toISOString();
      
      // Update stats
      this.cache.stats.totalPatterns = this.countPatterns(this.cache.patterns);
      
      // Track evolution
      await this.evolutionService.processUpdates(
        updateResult.changes,
        updateResult.updatedPatterns
      );
      
      // Save updated cache
      await this.saveCache();
      
      // Add pattern tags to updated records
      await this.updateSourceTags(updatedRecords);
      
      if (!process.env.BRIDGE_TEST_MODE) {
        console.log(`Incremental update completed: ${updateResult.stats.patternsAffected} patterns affected in ${updateResult.stats.timeMs}ms`);
      }
      
    } catch (error) {
      console.error('Error in incremental pattern update:', error);
      // Fallback to full rediscovery on error
      await this.fullPatternDiscovery();
    }
  }
  
  private async fullPatternDiscovery(): Promise<void> {
    try {
      // Get all records
      const allRecords = await getAllRecords();
      
      // Filter to records with embeddings
      const withEmbeddings = allRecords.filter(r => 
        r.embedding && r.embedding.length === 384 && r.embedding.some(v => v !== 0)
      );
      
      // Use comprehensive pattern discovery
      const result = await this.discoveryService.discoverAllPatterns(withEmbeddings, {
        hierarchical_threshold: 0.6,
        min_cluster_size: 3,
        max_hierarchy_depth: 3,
        quality_analysis: true
      });
      
      // Convert comprehensive patterns to navigable format
      const patterns = this.convertToNavigablePatterns(result.hierarchical_patterns);
      
      // Convert quality clusters to cached format
      const qualityPatterns = result.quality_clusters.map(cluster => ({
        dimension: cluster.dimension,
        cluster_name: cluster.cluster_name,
        semantic_meaning: cluster.semantic_meaning,
        experiences: cluster.experiences.map(e => e.id),
        keywords: cluster.representative_keywords,
        coherence: cluster.coherence,
        size: cluster.size
      }));
      
      // Update cache
      this.cache = {
        patterns,
        qualityPatterns,
        lastUpdated: new Date().toISOString(),
        version: 2,
        stats: {
          totalExperiences: withEmbeddings.length,
          totalPatterns: result.statistics.hierarchical_patterns_found,
          totalQualityPatterns: result.statistics.quality_clusters_found,
          maxDepth: result.statistics.max_depth
        }
      };
      
      // Save cache
      await this.saveCache();
      
      // Update all source tags
      await this.updateSourceTags(withEmbeddings);
      
    } catch (error) {
      console.error('Error in full pattern discovery:', error);
    }
  }
  
  private convertToNavigablePatterns(comprehensivePatterns: any[]): NavigablePattern[] {
    return comprehensivePatterns.map(pattern => this.convertSinglePattern(pattern));
  }
  
  private convertSinglePattern(pattern: any): NavigablePattern {
    // Extract emojis from experiences
    const emojiMap = new Map<string, number>();
    pattern.experiences.forEach((exp: SourceRecord) => {
      const emoji = exp.experience?.emoji;
      if (emoji) emojiMap.set(emoji, (emojiMap.get(emoji) || 0) + 1);
    });
    const emojis = Array.from(emojiMap.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 4)
      .map(([emoji]) => emoji);
    
    // Calculate qualities
    const qualities = this.calculateQualities(pattern.experiences);
    
    // Calculate recency
    const recency = this.calculateRecency(pattern.experiences);
    
    return {
      id: pattern.id,
      name: pattern.name,
      level: pattern.level,
      experienceIds: pattern.experiences.map((e: SourceRecord) => e.id),
      coherence: pattern.coherence,
      children: pattern.children.map((child: any) => this.convertSinglePattern(child)),
      metadata: {
        emojis,
        themes: pattern.keywords || [],
        qualities,
        recency,
        semantic_meaning: pattern.semantic_meaning
      }
    };
  }
  
  /* Removed old pattern hierarchy method - now using ComprehensivePatternDiscovery */
  
  private generatePatternMetadata(experiences: SourceRecord[]): NavigablePattern['metadata'] {
    // Collect emojis
    const emojiMap = new Map<string, number>();
    experiences.forEach(exp => {
      const emoji = exp.experience?.emoji;
      if (emoji) emojiMap.set(emoji, (emojiMap.get(emoji) || 0) + 1);
    });
    const emojis = Array.from(emojiMap.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 4)
      .map(([emoji]) => emoji);
    
    // Extract themes
    const texts = experiences.map(e => 
      (e.experience?.narrative || e.content || '').toLowerCase()
    );
    const themes = this.extractThemes(texts.join(' '));
    
    // Calculate qualities
    const qualities = this.calculateQualities(experiences);
    
    // Calculate recency
    const recency = this.calculateRecency(experiences);
    
    return { emojis, themes, qualities, recency };
  }
  
  private generatePatternName(experiences: SourceRecord[], themes: string[]): string {
    // Get emoji signature
    const emojiMap = new Map<string, number>();
    experiences.forEach(exp => {
      const emoji = exp.experience?.emoji;
      if (emoji) emojiMap.set(emoji, (emojiMap.get(emoji) || 0) + 1);
    });
    const emojis = Array.from(emojiMap.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 2)
      .map(([emoji]) => emoji)
      .join('');
    
    // Extract natural phrases from experience content
    const naturalPhrases = this.extractNaturalPhrases(experiences);
    
    // If we have natural phrases, use them
    if (naturalPhrases.length > 0) {
      const phrase = naturalPhrases[0];
      return `${emojis}${emojis ? ' ' : ''}${phrase}`;
    }
    
    // Fallback to theme-based natural phrases
    if (themes.length > 0) {
      const naturalPhrase = this.generateNaturalPhrase(themes);
      return `${emojis}${emojis ? ' ' : ''}${naturalPhrase}`;
    }
    
    // Final fallback
    return `${emojis}${emojis ? ' ' : ''}experiential-pattern`;
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
   * Generate natural phrase from themes using meaningful keyword combinations
   */
  private generateNaturalPhrase(themes: string[]): string {
    // Filter out common stop words
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
      'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
      'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that',
      'these', 'those', 'then', 'than', 'so', 'very', 'just', 'like',
      'really', 'actually', 'basically', 'literally', 'even', 'also'
    ]);
    
    // Extract meaningful keywords
    const meaningfulKeywords = themes
      .filter(t => t.length > 2 && !stopWords.has(t.toLowerCase()))
      .map(t => t.toLowerCase());
    
    // Prioritize by creating a set for lookup
    const keywordSet = new Set(meaningfulKeywords);
    
    // Common meaningful combinations (order matters for readability)
    if (keywordSet.has('proud') && keywordSet.has('us')) {
      return 'proud-us';
    }
    if (keywordSet.has('teaching') && keywordSet.has('simplification')) {
      return 'teaching-simplification';
    }
    if (keywordSet.has('connection') && keywordSet.has('capability')) {
      return 'connection-capability';
    }
    if (keywordSet.has('work') && keywordSet.has('stress')) {
      return 'work-stress';
    }
    if (keywordSet.has('morning') && keywordSet.has('routine')) {
      return 'morning-routine';
    }
    if (keywordSet.has('creative') && keywordSet.has('emergence')) {
      return 'creative-emergence';
    }
    if (keywordSet.has('relationship') && keywordSet.has('insights')) {
      return 'relationship-insights';
    }
    if (keywordSet.has('distributed') && keywordSet.has('consciousness')) {
      return 'distributed-consciousness';
    }
    if (keywordSet.has('captain') && keywordSet.has('distributed')) {
      return 'captain-distributed';
    }
    if (keywordSet.has('bridge') && keywordSet.has('phenomenological')) {
      return 'bridge-phenomenological';
    }
    if (keywordSet.has('infrastructure') && keywordSet.has('story')) {
      return 'infrastructure-story';
    }
    if (keywordSet.has('temporal') && keywordSet.has('flow')) {
      return 'temporal-flow';
    }
    
    // Put certain types of words first for better readability
    const subjects = ['captain', 'miguel', 'alicia', 'bridge', 'we', 'i'];
    let finalKeywords = meaningfulKeywords;
    const subjectKeyword = finalKeywords.find(k => subjects.includes(k));
    if (subjectKeyword) {
      finalKeywords = [subjectKeyword, ...finalKeywords.filter(k => k !== subjectKeyword)];
    }
    
    // Return top 2-3 meaningful keywords
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
  
  private extractThemes(text: string): string[] {
    const commonWords = ['through', 'about', 'around', 'feeling', 'really', 'would', 
                         'could', 'should', 'doing', 'being', 'having', 'where', 
                         'which', 'their', 'there', 'these', 'those'];
    
    const words = text.split(/\s+/).filter(w => 
      w.length > 4 && !commonWords.includes(w)
    );
    
    const freq = new Map<string, number>();
    words.forEach(w => freq.set(w, (freq.get(w) || 0) + 1));
    
    return Array.from(freq.entries())
      .filter(([, count]) => count > 1)
      .sort(([,a], [,b]) => b - a)
      .map(([word]) => word)
      .slice(0, 10);
  }
  
  private calculateQualities(experiences: SourceRecord[]): { [key: string]: number } {
    const qualities: { [key: string]: number } = {};
    const qualityNames = ['embodied', 'attentional', 'affective', 'purposive', 'spatial', 'temporal', 'intersubjective'];
    
    qualityNames.forEach(quality => {
      let total = 0;
      experiences.forEach(exp => {
        const q = exp.experience?.qualities?.find((q: any) => q.type === quality);
        total += q?.prominence || 0;
      });
      qualities[quality] = total / experiences.length;
    });
    
    return qualities;
  }
  
  private calculateRecency(experiences: SourceRecord[]): 'active' | 'recent' | 'past' | 'dormant' {
    const now = Date.now();
    const times = experiences.map(e => 
      new Date(e.occurred || e.system_time).getTime()
    );
    const mostRecent = Math.max(...times);
    const daysSince = (now - mostRecent) / (1000 * 60 * 60 * 24);
    
    if (daysSince < 7) return 'active';
    if (daysSince < 30) return 'recent';
    if (daysSince < 90) return 'past';
    return 'dormant';
  }
  
  private async updateSourceTags(sources: SourceRecord[]): Promise<void> {
    for (const source of sources) {
      const patterns = this.findPatternsContaining(source.id, this.cache?.patterns || []);
      
      if (patterns.length > 0) {
        // Generate tags from patterns
        const patternTags = patterns.map(p => p.name);
        const patternIds = patterns.map(p => p.id);
        const maxConfidence = Math.max(...patterns.map(p => p.coherence));
        
        // Update source with pattern information
        const updatedSource: SourceRecord = {
          ...source,
          pattern_tags: patternTags,
          pattern_ids: patternIds,
          pattern_confidence: maxConfidence
        };
        
        await updateSource(updatedSource);
      }
    }
  }
  
  private findPatternsContaining(experienceId: string, patterns: NavigablePattern[]): NavigablePattern[] {
    const found: NavigablePattern[] = [];
    
    for (const pattern of patterns) {
      if (pattern.experienceIds.includes(experienceId)) {
        found.push(pattern);
      }
      
      // Check children
      found.push(...this.findPatternsContaining(experienceId, pattern.children));
    }
    
    return found;
  }
  
  private removeFromPatterns(experienceId: string, patterns: NavigablePattern[]): void {
    for (const pattern of patterns) {
      pattern.experienceIds = pattern.experienceIds.filter(id => id !== experienceId);
      this.removeFromPatterns(experienceId, pattern.children);
    }
  }
  
  private findPatternById(patterns: NavigablePattern[], id: string): NavigablePattern | null {
    for (const pattern of patterns) {
      if (pattern.id === id) return pattern;
      
      const found = this.findPatternById(pattern.children, id);
      if (found) return found;
    }
    
    return null;
  }
  
  private getPatternsByDepth(patterns: NavigablePattern[], maxDepth: number): NavigablePattern[] {
    if (maxDepth === 0) return [];
    
    return patterns.map(p => ({
      ...p,
      children: this.getPatternsByDepth(p.children, maxDepth - 1)
    }));
  }
  
  private limitPatternDepth(pattern: NavigablePattern, maxDepth: number): NavigablePattern {
    if (maxDepth === 0) {
      return { ...pattern, children: [] };
    }
    
    return {
      ...pattern,
      children: pattern.children.map(c => this.limitPatternDepth(c, maxDepth - 1))
    };
  }
  
  private countPatterns(patterns: NavigablePattern[]): number {
    return patterns.reduce((count, p) => count + 1 + this.countPatterns(p.children), 0);
  }
  
  private findMaxDepth(patterns: NavigablePattern[], currentDepth: number = 0): number {
    if (patterns.length === 0) return currentDepth;
    
    return Math.max(...patterns.map(p => this.findMaxDepth(p.children, currentDepth + 1)));
  }
  
  private isCacheStale(): boolean {
    if (!this.cache) return true;
    
    const cacheAge = Date.now() - new Date(this.cache.lastUpdated).getTime();
    const MAX_CACHE_AGE = 24 * 60 * 60 * 1000; // 24 hours
    
    return cacheAge > MAX_CACHE_AGE;
  }
  
  private getCachePath(): string {
    const dataPath = getDataFilePath();
    const dataDir = dirname(dataPath);
    return join(dataDir, 'pattern-cache.json');
  }
  
  private async loadCache(): Promise<void> {
    try {
      const cachePath = this.getCachePath();
      const cacheData = await readFile(cachePath, 'utf-8');
      this.cache = JSON.parse(cacheData);
      
      // Validate cache structure
      if (!this.cache || !Array.isArray(this.cache.patterns)) {
        this.cache = null;
      }
    } catch (error) {
      // Cache doesn't exist or is invalid
      this.cache = null;
    }
  }
  
  private async saveCache(): Promise<void> {
    if (!this.cache) return;
    
    try {
      const cachePath = this.getCachePath();
      const cacheData = JSON.stringify(this.cache, null, 2);
      await writeFile(cachePath, cacheData, 'utf-8');
    } catch (error) {
      console.error('Failed to save pattern cache:', error);
    }
  }
}

// Export singleton
export const patternManager = new PatternManager();