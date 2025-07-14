/**
 * Pattern Evolution Tracking Service
 * 
 * Tracks how patterns change over time, detecting lifecycle stages,
 * stability trends, and evolutionary pressures.
 */

import { NavigablePattern, PatternCache } from './pattern-manager.js';
// import { PatternUpdate } from './incremental-pattern-updates.js';

// Temporary interface until incremental updates are refactored
export interface PatternUpdate {
  type: 'add' | 'modify' | 'remove' | 'merge' | 'split';
  patternId: string;
  affectedExperiences: string[];
  confidence: number;
}

// ============================================================================
// INTERFACES
// ============================================================================

export interface PatternEvolution {
  patternId: string;
  lifecycle: PatternLifecycle;
  history: PatternSnapshot[];
  trends: PatternTrends;
  stability: PatternStability;
  lastEvolution: Date;
}

export interface PatternLifecycle {
  stage: 'emerging' | 'growing' | 'mature' | 'stable' | 'declining' | 'dormant';
  age: number; // days since first discovery
  stageTransitions: Array<{
    from: string;
    to: string;
    timestamp: Date;
    trigger: string;
  }>;
  expectedLifespan?: number; // predicted days until dormancy
}

export interface PatternSnapshot {
  timestamp: Date;
  coherence: number;
  experienceCount: number;
  qualitySignature: { [key: string]: number };
  metadata: {
    emojis: string[];
    themes: string[];
    recency: string;
  };
  triggers: string[]; // what caused this snapshot
}

export interface PatternTrends {
  coherence: TrendData;
  growth: TrendData;
  quality_evolution: { [quality: string]: TrendData };
  thematic_drift: number; // 0-1, how much themes have changed
  emoji_stability: number; // 0-1, how stable emoji representation is
}

export interface TrendData {
  direction: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  magnitude: number; // 0-1, strength of trend
  velocity: number; // rate of change per day
  confidence: number; // 0-1, confidence in trend detection
}

export interface PatternStability {
  overall: number; // 0-1, overall stability score
  coherence_stability: number;
  membership_stability: number; // how often experiences join/leave
  temporal_stability: number; // consistency of timing patterns
  thematic_stability: number; // consistency of themes
  prediction: {
    likely_stable: boolean;
    risk_factors: string[];
    recommendations: string[];
  };
}

export interface EvolutionEvent {
  type: 'birth' | 'growth' | 'merge' | 'split' | 'decline' | 'revival' | 'death';
  patternId: string;
  timestamp: Date;
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  description: string;
  metadata: any;
}

// ============================================================================
// PATTERN EVOLUTION TRACKING SERVICE
// ============================================================================

export class PatternEvolutionService {
  private evolutions: Map<string, PatternEvolution> = new Map();
  private events: EvolutionEvent[] = [];
  private readonly MAX_HISTORY_LENGTH = 50;
  private readonly STABILITY_WINDOW_DAYS = 14;
  
  /**
   * Initialize evolution tracking from existing cache
   */
  async initialize(cache: PatternCache): Promise<void> {
    // Initialize evolution tracking for existing patterns
    for (const pattern of cache.patterns) {
      await this.initializePatternEvolution(pattern);
    }
  }
  
  /**
   * Process pattern updates and track evolution
   */
  async processUpdates(
    updates: PatternUpdate[],
    currentPatterns: NavigablePattern[]
  ): Promise<EvolutionEvent[]> {
    const newEvents: EvolutionEvent[] = [];
    
    for (const update of updates) {
      const pattern = currentPatterns.find(p => p.id === update.patternId);
      if (!pattern) continue;
      
      // Update pattern evolution
      const evolution = await this.updatePatternEvolution(pattern, update);
      
      // Detect and record events
      const events = await this.detectEvolutionEvents(evolution);
      newEvents.push(...events);
      
      // Update lifecycle stage if needed
      await this.updateLifecycleStage(evolution, pattern);
    }
    
    // Store events
    this.events.push(...newEvents);
    
    // Prune old events (keep last 1000)
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }
    
    return newEvents;
  }
  
  /**
   * Get evolution data for a specific pattern
   */
  getPatternEvolution(patternId: string): PatternEvolution | null {
    return this.evolutions.get(patternId) || null;
  }
  
  /**
   * Get all evolution events
   */
  getEvolutionEvents(
    patternId?: string,
    eventType?: EvolutionEvent['type'],
    days?: number
  ): EvolutionEvent[] {
    let filtered = this.events;
    
    if (patternId) {
      filtered = filtered.filter(e => e.patternId === patternId);
    }
    
    if (eventType) {
      filtered = filtered.filter(e => e.type === eventType);
    }
    
    if (days) {
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(e => e.timestamp >= cutoff);
    }
    
    return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }
  
  /**
   * Get ecosystem-wide evolution statistics
   */
  getEcosystemStats(): {
    totalPatterns: number;
    activePatterns: number;
    patternsInDecline: number;
    averageAge: number;
    lifeCycleDistribution: { [stage: string]: number };
    stabilityDistribution: { [range: string]: number };
    recentEvents: EvolutionEvent[];
  } {
    const evolutions = Array.from(this.evolutions.values());
    
    const lifeCycleDistribution: { [stage: string]: number } = {};
    const stabilityDistribution = { 'high': 0, 'medium': 0, 'low': 0 };
    
    let totalAge = 0;
    let activeCount = 0;
    let decliningCount = 0;
    
    evolutions.forEach(evolution => {
      // Lifecycle distribution
      const stage = evolution.lifecycle.stage;
      lifeCycleDistribution[stage] = (lifeCycleDistribution[stage] || 0) + 1;
      
      // Age accumulation
      totalAge += evolution.lifecycle.age;
      
      // Active/declining counts
      if (['emerging', 'growing', 'mature', 'stable'].includes(stage)) {
        activeCount++;
      }
      if (stage === 'declining') {
        decliningCount++;
      }
      
      // Stability distribution
      const stability = evolution.stability.overall;
      if (stability > 0.7) stabilityDistribution.high++;
      else if (stability > 0.4) stabilityDistribution.medium++;
      else stabilityDistribution.low++;
    });
    
    return {
      totalPatterns: evolutions.length,
      activePatterns: activeCount,
      patternsInDecline: decliningCount,
      averageAge: evolutions.length > 0 ? totalAge / evolutions.length : 0,
      lifeCycleDistribution,
      stabilityDistribution,
      recentEvents: this.getEvolutionEvents(undefined, undefined, 7)
    };
  }
  
  /**
   * Predict pattern future based on evolution history
   */
  predictPatternFuture(patternId: string): {
    likelyStage: string;
    timeToTransition: number; // days
    riskFactors: string[];
    recommendations: string[];
    confidence: number;
  } | null {
    const evolution = this.evolutions.get(patternId);
    if (!evolution) return null;
    
    // Analyze trends to predict future
    const trends = evolution.trends;
    const currentStage = evolution.lifecycle.stage;
    
    let likelyStage = currentStage;
    let timeToTransition = 30; // default
    const riskFactors: string[] = [];
    const recommendations: string[] = [];
    
    // Predict based on coherence trend
    if (trends.coherence.direction === 'decreasing' && trends.coherence.magnitude > 0.3) {
      if (currentStage === 'stable') likelyStage = 'declining';
      if (currentStage === 'mature') likelyStage = 'declining';
      riskFactors.push('declining coherence');
      recommendations.push('Review pattern membership for outliers');
    }
    
    // Predict based on growth trend
    if (trends.growth.direction === 'decreasing' && currentStage === 'growing') {
      likelyStage = 'mature';
      timeToTransition = Math.max(7, 30 / trends.growth.velocity);
    }
    
    // Predict based on stability
    if (evolution.stability.overall < 0.3) {
      riskFactors.push('low stability');
      recommendations.push('Consider pattern restructuring');
    }
    
    // Calculate confidence based on trend confidence and history length
    const historyLength = evolution.history.length;
    const trendConfidence = (trends.coherence.confidence + trends.growth.confidence) / 2;
    const confidence = Math.min(trendConfidence * (historyLength / 20), 1);
    
    return {
      likelyStage,
      timeToTransition,
      riskFactors,
      recommendations,
      confidence
    };
  }
  
  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================
  
  /**
   * Initialize evolution tracking for a pattern
   */
  private async initializePatternEvolution(pattern: NavigablePattern): Promise<void> {
    const now = new Date();
    
    const evolution: PatternEvolution = {
      patternId: pattern.id,
      lifecycle: {
        stage: this.determineInitialStage(pattern),
        age: 0, // Will be updated if we have historical data
        stageTransitions: [],
        expectedLifespan: undefined
      },
      history: [{
        timestamp: now,
        coherence: pattern.coherence,
        experienceCount: pattern.experienceIds.length,
        qualitySignature: { ...pattern.metadata.qualities },
        metadata: {
          emojis: [...pattern.metadata.emojis],
          themes: [...pattern.metadata.themes],
          recency: pattern.metadata.recency
        },
        triggers: ['initialization']
      }],
      trends: this.initializeTrends(),
      stability: this.calculateInitialStability(pattern),
      lastEvolution: now
    };
    
    this.evolutions.set(pattern.id, evolution);
  }
  
  /**
   * Update pattern evolution with new data
   */
  private async updatePatternEvolution(
    pattern: NavigablePattern,
    update: PatternUpdate
  ): Promise<PatternEvolution> {
    let evolution = this.evolutions.get(pattern.id);
    
    if (!evolution) {
      await this.initializePatternEvolution(pattern);
      evolution = this.evolutions.get(pattern.id)!;
    }
    
    // Create new snapshot
    const snapshot: PatternSnapshot = {
      timestamp: new Date(),
      coherence: pattern.coherence,
      experienceCount: pattern.experienceIds.length,
      qualitySignature: { ...pattern.metadata.qualities },
      metadata: {
        emojis: [...pattern.metadata.emojis],
        themes: [...pattern.metadata.themes],
        recency: pattern.metadata.recency
      },
      triggers: [update.type]
    };
    
    // Add snapshot to history
    evolution.history.push(snapshot);
    
    // Prune history if too long
    if (evolution.history.length > this.MAX_HISTORY_LENGTH) {
      evolution.history = evolution.history.slice(-this.MAX_HISTORY_LENGTH);
    }
    
    // Update trends
    evolution.trends = this.calculateTrends(evolution.history);
    
    // Update stability
    evolution.stability = this.calculateStability(evolution.history);
    
    // Update age
    const firstSnapshot = evolution.history[0];
    evolution.lifecycle.age = Math.floor(
      (snapshot.timestamp.getTime() - firstSnapshot.timestamp.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    evolution.lastEvolution = snapshot.timestamp;
    
    return evolution;
  }
  
  /**
   * Detect evolution events from pattern changes
   */
  private async detectEvolutionEvents(
    evolution: PatternEvolution
  ): Promise<EvolutionEvent[]> {
    const events: EvolutionEvent[] = [];
    const history = evolution.history;
    
    if (history.length < 2) return events;
    
    const current = history[history.length - 1];
    const previous = history[history.length - 2];
    
    // Detect significant coherence changes
    const coherenceChange = current.coherence - previous.coherence;
    if (Math.abs(coherenceChange) > 0.2) {
      events.push({
        type: coherenceChange > 0 ? 'growth' : 'decline',
        patternId: evolution.patternId,
        timestamp: current.timestamp,
        severity: Math.abs(coherenceChange) > 0.4 ? 'major' : 'moderate',
        description: `Coherence ${coherenceChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(coherenceChange).toFixed(2)}`,
        metadata: { coherenceChange, previousCoherence: previous.coherence }
      });
    }
    
    // Detect significant size changes
    const sizeChange = current.experienceCount - previous.experienceCount;
    if (sizeChange > 5 || (sizeChange > 0 && current.experienceCount < 10)) {
      events.push({
        type: 'growth',
        patternId: evolution.patternId,
        timestamp: current.timestamp,
        severity: sizeChange > 10 ? 'major' : 'moderate',
        description: `Pattern grew by ${sizeChange} experiences`,
        metadata: { sizeChange, previousSize: previous.experienceCount }
      });
    }
    
    // Detect thematic drift
    const themesChanged = current.metadata.themes.filter(t => 
      !previous.metadata.themes.includes(t)
    ).length;
    if (themesChanged > 2) {
      events.push({
        type: 'growth', // Could be growth or evolution
        patternId: evolution.patternId,
        timestamp: current.timestamp,
        severity: 'minor',
        description: `Thematic evolution: ${themesChanged} new themes`,
        metadata: { newThemes: themesChanged }
      });
    }
    
    return events;
  }
  
  /**
   * Update lifecycle stage based on evolution data
   */
  private async updateLifecycleStage(
    evolution: PatternEvolution,
    pattern: NavigablePattern
  ): Promise<void> {
    const currentStage = evolution.lifecycle.stage;
    const newStage = this.determineLifecycleStage(evolution, pattern);
    
    if (newStage !== currentStage) {
      // Record stage transition
      evolution.lifecycle.stageTransitions.push({
        from: currentStage,
        to: newStage,
        timestamp: new Date(),
        trigger: 'automatic_detection'
      });
      
      evolution.lifecycle.stage = newStage;
      
      // Create transition event
      this.events.push({
        type: this.getEventTypeForTransition(currentStage, newStage),
        patternId: evolution.patternId,
        timestamp: new Date(),
        severity: 'moderate',
        description: `Pattern transitioned from ${currentStage} to ${newStage}`,
        metadata: { from: currentStage, to: newStage }
      });
    }
  }
  
  /**
   * Determine initial lifecycle stage for a pattern
   */
  private determineInitialStage(pattern: NavigablePattern): PatternLifecycle['stage'] {
    const experienceCount = pattern.experienceIds.length;
    const coherence = pattern.coherence;
    
    if (experienceCount < 3) return 'emerging';
    if (experienceCount < 8 && coherence > 0.6) return 'growing';
    if (experienceCount >= 8 && coherence > 0.7) return 'mature';
    if (coherence > 0.6) return 'stable';
    if (coherence > 0.3) return 'declining';
    return 'dormant';
  }
  
  /**
   * Determine lifecycle stage based on evolution history
   */
  private determineLifecycleStage(
    evolution: PatternEvolution,
    pattern: NavigablePattern
  ): PatternLifecycle['stage'] {
    const experienceCount = pattern.experienceIds.length;
    const coherence = pattern.coherence;
    const age = evolution.lifecycle.age;
    const trends = evolution.trends;
    
    // Consider growth trend
    const isGrowing = trends.growth.direction === 'increasing' && trends.growth.magnitude > 0.3;
    const isDeclining = trends.coherence.direction === 'decreasing' && trends.coherence.magnitude > 0.3;
    
    if (experienceCount < 3) return 'emerging';
    if (isGrowing && experienceCount < 15) return 'growing';
    if (isDeclining) return 'declining';
    if (coherence < 0.3) return 'dormant';
    if (age > 30 && coherence > 0.7) return 'stable';
    if (coherence > 0.6) return 'mature';
    
    return 'stable';
  }
  
  /**
   * Initialize trends for new pattern
   */
  private initializeTrends(): PatternTrends {
    const neutralTrend: TrendData = {
      direction: 'stable',
      magnitude: 0,
      velocity: 0,
      confidence: 0
    };
    
    return {
      coherence: { ...neutralTrend },
      growth: { ...neutralTrend },
      quality_evolution: {},
      thematic_drift: 0,
      emoji_stability: 1
    };
  }
  
  /**
   * Calculate trends from history
   */
  private calculateTrends(history: PatternSnapshot[]): PatternTrends {
    if (history.length < 3) return this.initializeTrends();
    
    // Calculate coherence trend
    const coherenceValues = history.slice(-10).map(h => h.coherence);
    const coherenceTrend = this.calculateTrendFromValues(coherenceValues);
    
    // Calculate growth trend
    const sizeValues = history.slice(-10).map(h => h.experienceCount);
    const growthTrend = this.calculateTrendFromValues(sizeValues);
    
    // Calculate thematic drift
    const recentThemes = history.slice(-3).flatMap(h => h.metadata.themes);
    const oldThemes = history.slice(0, 3).flatMap(h => h.metadata.themes);
    const thematicDrift = this.calculateThematicDrift(oldThemes, recentThemes);
    
    // Calculate emoji stability
    const recentEmojis = history.slice(-5).flatMap(h => h.metadata.emojis);
    const emojiStability = this.calculateEmojiStability(recentEmojis);
    
    return {
      coherence: coherenceTrend,
      growth: growthTrend,
      quality_evolution: {},
      thematic_drift: thematicDrift,
      emoji_stability: emojiStability
    };
  }
  
  /**
   * Calculate trend from numeric values
   */
  private calculateTrendFromValues(values: number[]): TrendData {
    if (values.length < 3) {
      return { direction: 'stable', magnitude: 0, velocity: 0, confidence: 0 };
    }
    
    // Simple linear regression
    const n = values.length;
    const xSum = (n * (n - 1)) / 2; // 0 + 1 + 2 + ... + (n-1)
    const ySum = values.reduce((sum, val) => sum + val, 0);
    const xySum = values.reduce((sum, val, i) => sum + val * i, 0);
    const xxSum = (n * (n - 1) * (2 * n - 1)) / 6; // 0^2 + 1^2 + 2^2 + ... + (n-1)^2
    
    const slope = (n * xySum - xSum * ySum) / (n * xxSum - xSum * xSum);
    const intercept = (ySum - slope * xSum) / n;
    
    // Calculate R-squared for confidence
    const yMean = ySum / n;
    const ssRes = values.reduce((sum, val, i) => {
      const predicted = intercept + slope * i;
      return sum + Math.pow(val - predicted, 2);
    }, 0);
    const ssTot = values.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0);
    const rSquared = ssTot > 0 ? 1 - (ssRes / ssTot) : 0;
    
    // Determine direction and magnitude
    const direction = Math.abs(slope) < 0.01 ? 'stable' : slope > 0 ? 'increasing' : 'decreasing';
    const magnitude = Math.min(Math.abs(slope) * 10, 1); // Scale to 0-1
    const velocity = slope; // Rate of change per time unit
    
    return {
      direction: direction as TrendData['direction'],
      magnitude,
      velocity,
      confidence: Math.max(0, rSquared)
    };
  }
  
  /**
   * Calculate stability from history
   */
  private calculateStability(history: PatternSnapshot[]): PatternStability {
    if (history.length < 3) {
      return {
        overall: 0.5,
        coherence_stability: 0.5,
        membership_stability: 0.5,
        temporal_stability: 0.5,
        thematic_stability: 0.5,
        prediction: {
          likely_stable: false,
          risk_factors: ['insufficient_history'],
          recommendations: ['collect_more_data']
        }
      };
    }
    
    // Calculate component stabilities
    const coherenceStability = this.calculateCoherenceStability(history);
    const membershipStability = this.calculateMembershipStability(history);
    const temporalStability = 0.7; // Placeholder
    const thematicStability = this.calculateThematicStability(history);
    
    const overall = (coherenceStability + membershipStability + temporalStability + thematicStability) / 4;
    
    // Generate predictions
    const riskFactors: string[] = [];
    const recommendations: string[] = [];
    
    if (coherenceStability < 0.5) riskFactors.push('coherence_volatility');
    if (membershipStability < 0.5) riskFactors.push('membership_churn');
    if (thematicStability < 0.5) riskFactors.push('thematic_drift');
    
    if (overall < 0.4) recommendations.push('review_pattern_definition');
    if (coherenceStability < 0.3) recommendations.push('strengthen_cohesion');
    
    return {
      overall,
      coherence_stability: coherenceStability,
      membership_stability: membershipStability,
      temporal_stability: temporalStability,
      thematic_stability: thematicStability,
      prediction: {
        likely_stable: overall > 0.6,
        risk_factors: riskFactors,
        recommendations: recommendations
      }
    };
  }
  
  /**
   * Calculate initial stability estimate
   */
  private calculateInitialStability(pattern: NavigablePattern): PatternStability {
    const coherence = pattern.coherence;
    const size = pattern.experienceIds.length;
    
    // Initial stability based on coherence and size
    const baseStability = coherence * 0.7 + Math.min(size / 10, 1) * 0.3;
    
    return {
      overall: baseStability,
      coherence_stability: coherence,
      membership_stability: baseStability,
      temporal_stability: baseStability,
      thematic_stability: baseStability,
      prediction: {
        likely_stable: baseStability > 0.6,
        risk_factors: [],
        recommendations: []
      }
    };
  }
  
  // ============================================================================
  // UTILITY METHODS
  // ============================================================================
  
  private calculateCoherenceStability(history: PatternSnapshot[]): number {
    const coherenceValues = history.map(h => h.coherence);
    const mean = coherenceValues.reduce((sum, val) => sum + val, 0) / coherenceValues.length;
    const variance = coherenceValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / coherenceValues.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Lower standard deviation = higher stability
    return Math.max(0, 1 - (standardDeviation * 2));
  }
  
  private calculateMembershipStability(history: PatternSnapshot[]): number {
    const sizeDifferences = [];
    for (let i = 1; i < history.length; i++) {
      sizeDifferences.push(Math.abs(history[i].experienceCount - history[i - 1].experienceCount));
    }
    
    if (sizeDifferences.length === 0) return 1;
    
    const avgChange = sizeDifferences.reduce((sum, val) => sum + val, 0) / sizeDifferences.length;
    
    // Lower average change = higher stability
    return Math.max(0, 1 - (avgChange / 5));
  }
  
  private calculateThematicStability(history: PatternSnapshot[]): number {
    if (history.length < 2) return 1;
    
    const firstThemes = new Set(history[0].metadata.themes);
    const lastThemes = new Set(history[history.length - 1].metadata.themes);
    
    const intersection = new Set([...firstThemes].filter(x => lastThemes.has(x)));
    const union = new Set([...firstThemes, ...lastThemes]);
    
    // Jaccard similarity
    return union.size > 0 ? intersection.size / union.size : 1;
  }
  
  private calculateThematicDrift(oldThemes: string[], newThemes: string[]): number {
    if (oldThemes.length === 0 && newThemes.length === 0) return 0;
    if (oldThemes.length === 0 || newThemes.length === 0) return 1;
    
    const oldSet = new Set(oldThemes);
    const newSet = new Set(newThemes);
    const intersection = new Set([...oldSet].filter(x => newSet.has(x)));
    const union = new Set([...oldSet, ...newSet]);
    
    // 1 - Jaccard similarity = drift
    return 1 - (intersection.size / union.size);
  }
  
  private calculateEmojiStability(emojis: string[]): number {
    if (emojis.length === 0) return 1;
    
    const emojiCounts = new Map<string, number>();
    emojis.forEach(emoji => {
      emojiCounts.set(emoji, (emojiCounts.get(emoji) || 0) + 1);
    });
    
    const mostCommon = Math.max(...emojiCounts.values());
    const total = emojis.length;
    
    // Higher concentration of most common emoji = higher stability
    return mostCommon / total;
  }
  
  private getEventTypeForTransition(from: string, to: string): EvolutionEvent['type'] {
    if (from === 'emerging' && to === 'growing') return 'growth';
    if (from === 'growing' && to === 'mature') return 'growth';
    if (from === 'mature' && to === 'stable') return 'growth';
    if (to === 'declining') return 'decline';
    if (to === 'dormant') return 'death';
    if (from === 'dormant' && to !== 'dormant') return 'revival';
    return 'growth';
  }
}