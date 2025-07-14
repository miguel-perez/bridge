/**
 * Enhanced Embedding Service
 * 
 * Creates richer embedding text that includes emoji, narrative, content, 
 * quality types with prominence, and temporal context for better pattern discovery.
 */

import { SourceRecord } from '../core/types.js';
import { EmbeddingService } from './embeddings.js';

export class EnhancedEmbeddingService {
  private embeddingService: EmbeddingService;
  
  constructor() {
    this.embeddingService = new EmbeddingService();
  }
  
  /**
   * Generate enhanced embedding text with all experiential components
   */
  createEmbeddingText(
    emoji: string,
    narrative: string,
    content: string,
    qualities: Array<{ type: string; prominence: number; manifestation?: string }>,
    occurred: string,
    perspective: string,
    experiencer: string,
    processing: string
  ): string {
    // Format occurred timestamp for embedding
    const occurredFormatted = this.formatTemporalContext(occurred);
    
    // Format qualities with prominence and manifestations
    const qualitiesFormatted = this.formatQualities(qualities);
    
    // Format context information
    const contextInfo = this.formatContext(perspective, experiencer, processing);
    
    // Enhanced embedding format:
    // [emoji] [narrative] "[content]" [temporal_context] [qualities_with_prominence] [context]
    const embeddingText = [
      emoji,
      narrative,
      `"${content}"`,
      occurredFormatted,
      qualitiesFormatted,
      contextInfo
    ].filter(part => part && part.trim()).join(' ');
    
    return embeddingText;
  }
  
  /**
   * Generate embedding from enhanced text
   */
  async generateEnhancedEmbedding(
    emoji: string,
    narrative: string,
    content: string,
    qualities: Array<{ type: string; prominence: number; manifestation?: string }>,
    occurred: string,
    perspective: string = 'I',
    experiencer: string = 'Unknown',
    processing: string = 'during'
  ): Promise<number[]> {
    const embeddingText = this.createEmbeddingText(
      emoji, narrative, content, qualities, occurred, perspective, experiencer, processing
    );
    
    if (!process.env.BRIDGE_TEST_MODE) {
      console.log(`🔤 Enhanced embedding text: ${embeddingText.slice(0, 200)}...`);
    }
    
    await this.embeddingService.initialize();
    return await this.embeddingService.generateEmbedding(embeddingText);
  }
  
  /**
   * Update existing source with enhanced embedding
   */
  async updateSourceEmbedding(source: SourceRecord): Promise<number[]> {
    const emoji = source.experience?.emoji || '💭';
    const narrative = source.experience?.narrative || 'Experience recorded';
    const content = source.content || narrative;
    const qualities = source.experience?.qualities || [];
    const occurred = source.occurred || source.system_time;
    const perspective = source.perspective || 'I';
    const experiencer = source.experiencer || 'Unknown';
    const processing = source.processing || 'during';
    
    return await this.generateEnhancedEmbedding(
      emoji, narrative, content, qualities, occurred, perspective, experiencer, processing
    );
  }
  
  /**
   * Batch update embeddings for existing sources
   */
  async batchUpdateEmbeddings(
    sources: SourceRecord[],
    onProgress?: (completed: number, total: number) => void
  ): Promise<Array<{ id: string; embedding: number[]; embeddingText: string }>> {
    const results: Array<{ id: string; embedding: number[]; embeddingText: string }> = [];
    
    for (let i = 0; i < sources.length; i++) {
      const source = sources[i];
      
      try {
        const embeddingText = this.createEmbeddingText(
          source.experience?.emoji || '💭',
          source.experience?.narrative || 'Experience recorded',
          source.content || source.experience?.narrative || '',
          source.experience?.qualities || [],
          source.occurred || source.system_time,
          source.perspective || 'I',
          source.experiencer || 'Unknown',
          source.processing || 'during'
        );
        
        const embedding = await this.embeddingService.generateEmbedding(embeddingText);
        
        results.push({
          id: source.id,
          embedding,
          embeddingText
        });
        
        if (onProgress) {
          onProgress(i + 1, sources.length);
        }
        
      } catch (error) {
        if (!process.env.BRIDGE_TEST_MODE) {
          console.warn(`Failed to generate embedding for ${source.id}:`, error);
        }
      }
    }
    
    return results;
  }
  
  // ============================================================================
  // PRIVATE FORMATTING METHODS
  // ============================================================================
  
  /**
   * Format temporal context for embedding based on when experience occurred
   */
  private formatTemporalContext(occurred: string): string {
    try {
      const occurredDate = new Date(occurred);
      
      // Time of day when experience occurred
      const hour = occurredDate.getHours();
      let timeOfDay: string;
      if (hour < 6) timeOfDay = 'early_morning';
      else if (hour < 12) timeOfDay = 'morning';
      else if (hour < 17) timeOfDay = 'afternoon';
      else if (hour < 21) timeOfDay = 'evening';
      else timeOfDay = 'night';
      
      // Day of week when experience occurred
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayOfWeek = dayNames[occurredDate.getDay()];
      
      // Calculate relative timing from occurred date to now (for search context)
      const now = new Date();
      const diffMs = now.getTime() - occurredDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      let relativeTiming: string;
      if (diffDays < 1) relativeTiming = 'today';
      else if (diffDays === 1) relativeTiming = 'yesterday';
      else if (diffDays < 7) relativeTiming = 'this_week';
      else if (diffDays < 30) relativeTiming = 'this_month';
      else if (diffDays < 90) relativeTiming = 'recent_past';
      else relativeTiming = 'distant_past';
      
      // Also include season context for longer-term patterns
      const month = occurredDate.getMonth();
      let season: string;
      if (month >= 2 && month <= 4) season = 'spring';
      else if (month >= 5 && month <= 7) season = 'summer';
      else if (month >= 8 && month <= 10) season = 'fall';
      else season = 'winter';
      
      return `[${timeOfDay}_${dayOfWeek}_${relativeTiming}_${season}]`;
      
    } catch (error) {
      return '[temporal_context_unknown]';
    }
  }
  
  /**
   * Format qualities with prominence and manifestations
   */
  private formatQualities(qualities: Array<{ type: string; prominence: number; manifestation?: string }>): string {
    if (qualities.length === 0) return '{no_qualities}';
    
    const formattedQualities = qualities.map(q => {
      const prominenceLevel = this.getProminenceLevel(q.prominence);
      
      // Include manifestation keywords if available
      const manifestationKeywords = q.manifestation 
        ? this.extractManifestationKeywords(q.manifestation)
        : [];
      
      const qualityText = manifestationKeywords.length > 0
        ? `${q.type}(${prominenceLevel}:${manifestationKeywords.join(',')})`
        : `${q.type}(${prominenceLevel})`;
      
      return qualityText;
    });
    
    return `{${formattedQualities.join(' ')}}`;
  }
  
  /**
   * Format context information
   */
  private formatContext(perspective: string, experiencer: string, processing: string): string {
    return `[${perspective}_perspective_${experiencer.toLowerCase().replace(/\s+/g, '_')}_${processing}]`;
  }
  
  /**
   * Get prominence level description
   */
  private getProminenceLevel(prominence: number): string {
    if (prominence >= 0.8) return 'dominant';
    if (prominence >= 0.6) return 'strong';
    if (prominence >= 0.4) return 'moderate';
    if (prominence >= 0.2) return 'subtle';
    return 'minimal';
  }
  
  /**
   * Extract key words from quality manifestation
   */
  private extractManifestationKeywords(manifestation: string): string[] {
    const keywords = manifestation
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['the', 'and', 'for', 'with', 'that', 'this', 'from'].includes(word))
      .slice(0, 3); // Max 3 keywords
    
    return keywords;
  }
  
  /**
   * Compare old vs new embedding format
   */
  compareFormats(source: SourceRecord): {
    old_format: string;
    new_format: string;
    improvements: string[];
  } {
    // Current format
    const qualitiesText = source.experience?.qualities?.length 
      ? `{${source.experience.qualities.map(q => q.type).join(', ')}}`
      : '{}';
    
    const oldFormat = `${source.experience?.emoji || ''} ${source.experience?.narrative || ''} "${source.content || ''}" ${qualitiesText}`;
    
    // Enhanced format
    const newFormat = this.createEmbeddingText(
      source.experience?.emoji || '💭',
      source.experience?.narrative || 'Experience recorded',
      source.content || source.experience?.narrative || '',
      source.experience?.qualities || [],
      source.occurred || source.system_time,
      source.perspective || 'I',
      source.experiencer || 'Unknown',
      source.processing || 'during'
    );
    
    const improvements = [
      'Added temporal context (time of day, day of week, relative timing)',
      'Added quality prominence levels (dominant, strong, moderate, subtle, minimal)',
      'Added quality manifestation keywords for richer description',
      'Added experiencer and perspective context',
      'Added processing timing context'
    ];
    
    return {
      old_format: oldFormat,
      new_format: newFormat,
      improvements
    };
  }
}