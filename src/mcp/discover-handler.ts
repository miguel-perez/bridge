/**
 * Enhanced Discover Tool Handler
 * 
 * Provides comprehensive pattern discovery with multiple entry points:
 * - Overview dashboard
 * - Quality dimension exploration
 * - Hierarchical pattern navigation
 * - Temporal and relationship discovery
 */

import { patternManager } from '../services/pattern-manager.js';
import { NavigablePattern, QualityPattern } from '../services/pattern-manager.js';

export interface DiscoverArgs {
  // Batch support
  discoveries?: SingleDiscovery[];  // Array of discovery operations
  
  // Single discovery properties (for backward compatibility)
  pattern?: string;        // Navigate to specific pattern ID
  dimension?: string;      // Explore quality dimension
  overview?: boolean;      // Show comprehensive overview (default)
  dimensions?: boolean;    // List all dimensions
  
  // Filtering
  when?: string;          // Temporal filter: "this_week", "morning", etc.
  recent?: boolean;       // Show recently active patterns
  emerging?: boolean;     // Show newly forming patterns
  outliers?: boolean;     // Show experiences not in patterns
  
  // Analysis
  insights?: boolean;     // Show pattern insights/evolution
  correlations?: boolean; // Show cross-dimensional correlations
  timeline?: boolean;     // Show temporal evolution
  connections?: string;   // Show related patterns
  similar_to?: string;    // Find similar patterns
  
  // Utilities
  refresh?: boolean;      // Force pattern refresh
  stats?: boolean;        // Show statistics
  depth?: number;         // Navigation depth (default 1)
}

export interface SingleDiscovery {
  // Navigation modes
  pattern?: string;        // Navigate to specific pattern ID
  dimension?: string;      // Explore quality dimension
  overview?: boolean;      // Show comprehensive overview (default)
  dimensions?: boolean;    // List all dimensions
  
  // Filtering
  when?: string;          // Temporal filter: "this_week", "morning", etc.
  recent?: boolean;       // Show recently active patterns
  emerging?: boolean;     // Show newly forming patterns
  outliers?: boolean;     // Show experiences not in patterns
  
  // Analysis
  insights?: boolean;     // Show pattern insights/evolution
  correlations?: boolean; // Show cross-dimensional correlations
  timeline?: boolean;     // Show temporal evolution
  connections?: string;   // Show related patterns
  similar_to?: string;    // Find similar patterns
  
  // Utilities
  refresh?: boolean;      // Force pattern refresh
  stats?: boolean;        // Show statistics
  depth?: number;         // Navigation depth (default 1)
}

export class DiscoverHandler {
  
  async handle(args: DiscoverArgs): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      // Initialize if needed
      await patternManager.initialize();
      
      // Support batch operations
      if (args.discoveries && args.discoveries.length > 0) {
        return this.handleBatchDiscoveries(args.discoveries);
      }
      
      // Single discovery (backward compatibility)
      return this.handleSingleDiscovery(args);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [{
          type: 'text',
          text: `Error in pattern discovery: ${errorMessage}`
        }]
      };
    }
  }

  private async handleBatchDiscoveries(discoveries: SingleDiscovery[]): Promise<{ content: Array<{ type: string; text: string }> }> {
    const allResults = [];
    
    for (let i = 0; i < discoveries.length; i++) {
      const discovery = discoveries[i];
      const result = await this.handleSingleDiscovery(discovery);
      
      // Add a header for each discovery if there are multiple
      if (discoveries.length > 1) {
        allResults.push({
          type: 'text',
          text: `🔍 Discovery ${i + 1}:`
        });
      }
      
      allResults.push(...result.content);
      
      // Add separator between discoveries if there are multiple
      if (i < discoveries.length - 1) {
        allResults.push({ type: 'text', text: '\n---\n' });
      }
    }
    
    return { content: allResults };
  }

  private async handleSingleDiscovery(args: SingleDiscovery): Promise<{ content: Array<{ type: string; text: string }> }> {
    // Handle refresh
    if (args.refresh) {
      await patternManager.refreshPatterns();
      return {
        content: [{
          type: 'text',
          text: '✨ Pattern discovery refreshed!\n\nAll patterns have been re-analyzed using enhanced discovery with quality-aware keywords.'
        }]
      };
    }
    
    // Handle statistics
    if (args.stats) {
      return this.formatStatistics();
    }
    
    // Handle dimension exploration
    if (args.dimension) {
      return this.formatDimensionView(args.dimension, args);
    }
    
    // Handle all dimensions list
    if (args.dimensions) {
      return this.formatAllDimensions();
    }
    
    // Handle specific pattern navigation
    if (args.pattern) {
      return this.formatPatternView(args.pattern, args);
    }
    
    // Handle temporal filtering
    if (args.when) {
      return this.formatTemporalView(args.when);
    }
    
    // Handle recent/emerging patterns
    if (args.recent || args.emerging) {
      return this.formatActivePatterns();
    }
    
    // Default: Overview dashboard
    return this.formatOverview();
  }
  
  private async formatOverview(): Promise<{ content: Array<{ type: string; text: string }> }> {
    const patterns = await patternManager.getPatterns();
    const stats = await patternManager.getStatistics();
    const qualityPatterns = await patternManager.getQualityPatterns();
    
    let output = '🌟 EXPERIENTIAL LANDSCAPE\n\n';
    output += `📊 Overview: ${stats.totalExperiences} experiences → ${stats.totalPatterns} patterns + ${stats.totalQualityPatterns} quality clusters\n\n`;
    
    // Thematic patterns section
    output += '🌳 THEMATIC PATTERNS (What you think about)\n';
    
    if (patterns.length === 0) {
      output += '├─ No patterns discovered yet. Patterns emerge as you capture experiences.\n';
    } else {
      // Show top 3-5 patterns
      const topPatterns = patterns.slice(0, 5);
      topPatterns.forEach((pattern, index) => {
        const isLast = index === topPatterns.length - 1;
        const prefix = isLast ? '└─' : '├─';
        const emoji = pattern.metadata.emojis.join('');
        const recencyIcon = pattern.metadata.recency === 'active' ? ' ⚡' : 
                           pattern.metadata.recency === 'recent' ? ' ✓' : '';
        
        output += `${prefix} ${emoji} ${pattern.name}${recencyIcon} (${pattern.experienceIds.length} experiences)\n`;
        output += `│  Keywords: ${pattern.metadata.themes.slice(0, 3).join(', ')}\n`;
        output += `│  → Explore: discover(pattern="${pattern.id}")\n`;
        if (!isLast) output += '│\n';
      });
      
      if (patterns.length > 5) {
        output += `\n   ...and ${patterns.length - 5} more patterns`;
      }
    }
    
    output += '\n\n';
    
    // Quality dimensions section
    output += '🎯 QUALITY DIMENSIONS (How you experience)\n';
    const dimensions = ['embodied', 'attentional', 'affective', 'purposive', 'spatial', 'temporal', 'intersubjective'];
    const dimensionInfo: Record<string, { icon: string; desc: string }> = {
      embodied: { icon: '🏃', desc: 'Physical states, movement, sensations' },
      attentional: { icon: '🎯', desc: 'Focus patterns, awareness styles' },
      affective: { icon: '💖', desc: 'Emotional landscapes, moods' },
      purposive: { icon: '🎪', desc: 'Goals, intentions, motivations' },
      spatial: { icon: '🏠', desc: 'Places, environments, mental spaces' },
      temporal: { icon: '⏰', desc: 'Time patterns, rhythms, sequences' },
      intersubjective: { icon: '👥', desc: 'Relationships, connections, dialogue' }
    };
    
    dimensions.slice(0, 4).forEach((dim, index) => {
      const dimPatterns = qualityPatterns.filter(p => p.dimension === dim);
      const info = dimensionInfo[dim];
      const prefix = index === 3 ? '└─' : '├─';
      
      output += `${prefix} ${info.icon} ${dim.charAt(0).toUpperCase() + dim.slice(1)} - ${info.desc}\n`;
      
      if (dimPatterns.length > 0) {
        const keywords = [...new Set(dimPatterns.flatMap(p => p.keywords.slice(0, 2)))].slice(0, 4);
        output += `│  ${dimPatterns.length} clusters including: "${keywords.join('", "')}"\n`;
      }
      
      output += `│  → Explore: discover(dimension="${dim}")\n`;
      if (index < 3) output += '│\n';
    });
    
    output += `\n└─ [More dimensions...] → discover(dimensions=true)\n\n`;
    
    // Recent activity
    const activeCount = Object.entries(stats.patternsByRecency || {})
      .filter(([recency]) => recency === 'active')
      .reduce((sum, [, count]) => sum + count, 0);
    
    output += '⏰ RECENT ACTIVITY\n';
    output += `• Active patterns (last 7 days): ${activeCount}\n`;
    
    if (patterns.length > 0) {
      const mostExplored = patterns.sort((a, b) => b.experienceIds.length - a.experienceIds.length)[0];
      output += `• Most explored: "${mostExplored.name}"\n`;
    }
    
    // Suggestions
    output += '\n💡 TRY:\n';
    output += '• discover(recent=true) for newest patterns\n';
    output += '• discover(dimension="spatial") for place-based patterns\n';
    output += '• discover(when="morning") for morning experiences\n';
    
    return {
      content: [{
        type: 'text',
        text: output
      }]
    };
  }
  
  private async formatDimensionView(dimension: string, args: DiscoverArgs): Promise<{ content: Array<{ type: string; text: string }> }> {
    const qualityPatterns = await patternManager.getQualityPatterns(dimension);
    const dimensionInfo: Record<string, { icon: string; title: string }> = {
      embodied: { icon: '🏃', title: 'EMBODIED DIMENSION - Physical states and sensations' },
      attentional: { icon: '🎯', title: 'ATTENTIONAL DIMENSION - Focus and awareness patterns' },
      affective: { icon: '💖', title: 'AFFECTIVE DIMENSION - Emotional landscapes' },
      purposive: { icon: '🎪', title: 'PURPOSIVE DIMENSION - Goals and intentions' },
      spatial: { icon: '🏠', title: 'SPATIAL DIMENSION - Places and spaces' },
      temporal: { icon: '⏰', title: 'TEMPORAL DIMENSION - Time patterns and rhythms' },
      intersubjective: { icon: '👥', title: 'INTERSUBJECTIVE DIMENSION - Relationships and connections' }
    };
    
    const info = dimensionInfo[dimension] || { icon: '🔍', title: dimension.toUpperCase() };
    
    let output = `${info.icon} ${info.title}\n\n`;
    
    if (qualityPatterns.length === 0) {
      output += 'No distinct patterns found in this dimension yet.\n';
      output += 'Patterns emerge as experiences with strong qualities in this dimension accumulate.\n';
    } else {
      output += `Found ${qualityPatterns.length} distinct ${dimension} patterns:\n\n`;
      
      qualityPatterns.forEach((pattern, index) => {
        output += `📍 ${pattern.semantic_meaning.toUpperCase()} (${pattern.size} experiences)\n`;
        output += `   Keywords: ${pattern.keywords.slice(0, 5).join(', ')}\n`;
        output += `   Context: ${this.getPatternContext(pattern)}\n`;
        
        // Show sample if available
        if (pattern.experiences.length > 0) {
          output += `   → Search: "${pattern.keywords[0]} ${pattern.keywords[1] || ''}"\n`;
        }
        
        if (index < qualityPatterns.length - 1) {
          output += '\n';
        }
      });
    }
    
    // Cross-dimensional insights
    if (args.correlations && qualityPatterns.length > 0) {
      output += '\n\n💡 CROSS-DIMENSIONAL INSIGHTS:\n';
      output += this.getCorrelationInsights(dimension);
    }
    
    output += '\n\n→ Compare: discover(dimension="';
    const nextDim = dimension === 'spatial' ? 'temporal' : 
                   dimension === 'temporal' ? 'affective' : 'spatial';
    output += `${nextDim}") for ${nextDim} patterns\n`;
    output += '→ Return: discover() for overview';
    
    return {
      content: [{
        type: 'text',
        text: output
      }]
    };
  }
  
  private async formatPatternView(patternId: string, args: DiscoverArgs): Promise<{ content: Array<{ type: string; text: string }> }> {
    const patterns = await patternManager.getPatterns();
    const pattern = this.findPattern(patterns, patternId);
    
    if (!pattern) {
      return {
        content: [{
          type: 'text',
          text: `Pattern "${patternId}" not found. Use discover() to see available patterns.`
        }]
      };
    }
    
    const emoji = pattern.metadata.emojis.join('');
    let output = `${emoji} ${pattern.name.toUpperCase()} PATTERN\n\n`;
    
    // Pattern health
    output += `📊 Pattern Health: ${Math.round(pattern.coherence * 100)}% coherence`;
    if (pattern.metadata.recency === 'active') {
      output += ', actively growing\n';
    } else if (pattern.metadata.recency === 'recent') {
      output += ', recently active\n';
    } else {
      output += ', stable\n';
    }
    
    // Semantic meaning
    if (pattern.metadata.semantic_meaning) {
      output += `📖 Meaning: ${pattern.metadata.semantic_meaning}\n`;
    }
    
    output += '\n';
    
    // Experiences
    output += `🌟 EXPERIENCES (${pattern.experienceIds.length} total)\n`;
    if (pattern.experienceIds.length > 0) {
      const sampleIds = pattern.experienceIds.slice(0, 4);
      sampleIds.forEach(id => {
        output += `├─ ${id}\n`;
      });
      if (pattern.experienceIds.length > 4) {
        output += `└─ ...and ${pattern.experienceIds.length - 4} more\n`;
      }
    }
    
    output += '\n';
    
    // Quality signature
    const significantQualities = Object.entries(pattern.metadata.qualities)
      .filter(([, value]) => value > 0.3)
      .sort(([,a], [,b]) => b - a);
    
    if (significantQualities.length > 0) {
      output += '🔍 QUALITY SIGNATURE\n';
      significantQualities.forEach(([quality, value]) => {
        const percent = Math.round(value * 100);
        const bar = '█'.repeat(Math.floor(percent / 10)) + '░'.repeat(10 - Math.floor(percent / 10));
        const desc = this.getQualityDescription(quality, value);
        output += `• ${quality.charAt(0).toUpperCase() + quality.slice(1)}: ${bar} ${percent}% - ${desc}\n`;
      });
      output += '\n';
    }
    
    // Evolution insights
    if (args.insights) {
      const evolution = patternManager.getPatternEvolution(patternId);
      if (evolution) {
        output += '📈 EVOLUTION INSIGHTS\n';
        output += `• Lifecycle stage: ${evolution.lifecycle.stage}\n`;
        output += `• Age: ${evolution.lifecycle.age} days\n`;
        if (evolution.trends.growth.velocity !== 0) {
          output += `• Growth: ${evolution.trends.growth.velocity > 0 ? '+' : ''}${Math.round(evolution.trends.growth.velocity * 100)}% per day\n`;
        }
      }
    }
    
    // Navigation
    output += '🎯 EXPLORE FURTHER:\n';
    if (pattern.children.length > 0) {
      output += `→ Sub-patterns: ${pattern.children.map(c => `discover(pattern="${c.id}")`).join(', ')}\n`;
    }
    output += `→ Similar: discover(similar_to="${patternId}")\n`;
    output += `→ Timeline: discover(pattern="${patternId}", timeline=true)\n`;
    output += `→ Search experiences: search("${pattern.metadata.themes[0] || ''}")`;
    
    return {
      content: [{
        type: 'text',
        text: output
      }]
    };
  }
  
  private async formatAllDimensions(): Promise<{ content: Array<{ type: string; text: string }> }> {
    let output = '🎯 ALL QUALITY DIMENSIONS\n\n';
    
    const dimensions = [
      { name: 'embodied', icon: '🏃', desc: 'Physical sensations, body awareness, movement, energy levels' },
      { name: 'attentional', icon: '🎯', desc: 'Focus patterns, awareness styles, concentration, mindfulness' },
      { name: 'affective', icon: '💖', desc: 'Emotions, moods, feelings, emotional responses' },
      { name: 'purposive', icon: '🎪', desc: 'Goals, intentions, motivations, desires, drives' },
      { name: 'spatial', icon: '🏠', desc: 'Physical and mental spaces, environments, locations' },
      { name: 'temporal', icon: '⏰', desc: 'Time perception, sequences, rhythms, durations' },
      { name: 'intersubjective', icon: '👥', desc: 'Relationships, social dynamics, connections, dialogue' }
    ];
    
    for (const dim of dimensions) {
      const patterns = await patternManager.getQualityPatterns(dim.name);
      output += `${dim.icon} ${dim.name.toUpperCase()}\n`;
      output += `   ${dim.desc}\n`;
      output += `   Patterns: ${patterns.length} clusters discovered\n`;
      output += `   → Explore: discover(dimension="${dim.name}")\n\n`;
    }
    
    output += '💡 TIP: Each dimension reveals different aspects of your experiential patterns.\n';
    output += 'Explore dimensions that resonate with your current interests or questions.';
    
    return {
      content: [{
        type: 'text',
        text: output
      }]
    };
  }
  
  private async formatStatistics(): Promise<{ content: Array<{ type: string; text: string }> }> {
    const stats = await patternManager.getStatistics();
    
    let output = '📊 PATTERN DISCOVERY STATISTICS\n\n';
    
    output += 'OVERVIEW\n';
    output += `• Total Experiences: ${stats.totalExperiences}\n`;
    output += `• Hierarchical Patterns: ${stats.totalPatterns}\n`;
    output += `• Quality Clusters: ${stats.totalQualityPatterns || 0}\n`;
    output += `• Maximum Depth: ${stats.maxDepth} levels\n`;
    output += `• Last Updated: ${new Date(stats.lastUpdated).toLocaleString()}\n\n`;
    
    output += 'PATTERN DISTRIBUTION\n';
    Object.entries(stats.patternsByLevel).forEach(([level, count]) => {
      output += `• Level ${level}: ${count} patterns\n`;
    });
    
    output += '\nPATTERN ACTIVITY\n';
    Object.entries(stats.patternsByRecency).forEach(([recency, count]) => {
      const icon = recency === 'active' ? '⚡' : 
                   recency === 'recent' ? '✓' : 
                   recency === 'past' ? '○' : '◌';
      output += `${icon} ${recency}: ${count} patterns\n`;
    });
    
    if (stats.evolution) {
      output += '\nECOSYSTEM HEALTH\n';
      output += `• Total Events: ${stats.evolution.totalEvents || 0}\n`;
      output += `• Active Patterns: ${stats.evolution.activePatterns || 0}\n`;
    }
    
    return {
      content: [{
        type: 'text',
        text: output
      }]
    };
  }
  
  // Helper methods
  private findPattern(patterns: NavigablePattern[], id: string): NavigablePattern | null {
    for (const pattern of patterns) {
      if (pattern.id === id) return pattern;
      const found = this.findPattern(pattern.children, id);
      if (found) return found;
    }
    return null;
  }
  
  private getPatternContext(pattern: QualityPattern): string {
    // Generate contextual description based on keywords
    const { keywords, dimension } = pattern;
    
    if (dimension === 'spatial' && keywords.some(k => k.includes('mental') || k.includes('abstract'))) {
      return 'Abstract spatial reasoning and conceptual mapping';
    }
    if (dimension === 'temporal' && keywords.some(k => k.includes('future') || k.includes('planning'))) {
      return 'Future-oriented thinking and planning patterns';
    }
    if (dimension === 'affective' && keywords.some(k => k.includes('joy') || k.includes('excitement'))) {
      return 'Positive emotional experiences and celebrations';
    }
    
    // Default context based on dimension
    const contexts: Record<string, string> = {
      spatial: 'Spatial awareness and environmental patterns',
      temporal: 'Time-based patterns and sequences',
      affective: 'Emotional patterns and mood states',
      purposive: 'Goal-oriented patterns and intentions',
      attentional: 'Focus and awareness patterns',
      embodied: 'Physical and somatic experiences',
      intersubjective: 'Social and relational patterns'
    };
    
    return contexts[dimension] || 'Experiential patterns';
  }
  
  private getQualityDescription(quality: string, value: number): string {
    const level = value > 0.8 ? 'Dominant' :
                  value > 0.6 ? 'Strong' :
                  value > 0.4 ? 'Moderate' : 'Present';
    
    const descriptions: Record<string, string> = {
      attentional: `${level} focus and awareness`,
      purposive: `${level} goal orientation`,
      affective: `${level} emotional presence`,
      spatial: `${level} spatial awareness`,
      temporal: `${level} time consciousness`,
      embodied: `${level} physical awareness`,
      intersubjective: `${level} relational focus`
    };
    
    return descriptions[quality] || `${level} presence`;
  }
  
  private getCorrelationInsights(dimension: string): string {
    // Provide insights about common correlations
    const correlations: Record<string, string[]> = {
      spatial: [
        '• Often co-occurs with high attentional focus',
        '• Strong correlation with purposive clarity in navigation contexts',
        '• Links to embodied awareness in movement experiences'
      ],
      temporal: [
        '• Frequently paired with purposive planning',
        '• Correlates with affective anticipation or nostalgia',
        '• Often includes attentional rhythm awareness'
      ],
      affective: [
        '• Strong link to intersubjective experiences',
        '• Often triggers embodied sensations',
        '• Can influence temporal perception (time flying/dragging)'
      ],
      purposive: [
        '• Drives attentional focus patterns',
        '• Shapes temporal planning horizons',
        '• Influences affective motivation states'
      ]
    };
    
    return (correlations[dimension] || ['• Patterns still emerging']).join('\n');
  }
  
  private async formatTemporalView(when: string): Promise<{ content: Array<{ type: string; text: string }> }> {
    // TODO: Implement temporal filtering
    return {
      content: [{
        type: 'text',
        text: `Temporal filtering for "${when}" coming soon.\n\nThis will show experiences and patterns from specific time contexts.`
      }]
    };
  }
  
  private async formatActivePatterns(): Promise<{ content: Array<{ type: string; text: string }> }> {
    // TODO: Implement recent/emerging pattern views
    return {
      content: [{
        type: 'text',
        text: 'Recent and emerging pattern views coming soon.\n\nThis will highlight newly forming patterns and recent activity.'
      }]
    };
  }
}

// Export singleton instance
export const discoverHandler = new DiscoverHandler();