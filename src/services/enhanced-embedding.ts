/**
 * Enhanced Embedding Service
 * 
 * Generates rich embeddings that include phenomenological qualities, temporal context,
 * and experiential metadata for better semantic understanding.
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
    created: string,
    perspective: string,
    experiencer: string,
    processing: string
  ): string {
    // Format created timestamp for embedding
    const createdFormatted = this.formatTemporalContext(created);
    
    // Format qualities with prominence and manifestations
    const qualitiesFormatted = this.formatQualities(qualities);
    
    // Format context information
    const contextInfo = this.formatContext(perspective, experiencer, processing);
    
    // Enhanced embedding format:
    // [emoji] [narrative] "[content]" [qualities_with_prominence] [context] [created]
    const embeddingText = [
      emoji,
      narrative,
      `"${content}"`,
      qualitiesFormatted,
      contextInfo,
      createdFormatted,
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
    created: string,
    perspective: string = 'I',
    experiencer: string = 'Unknown',
    processing: string = 'during'
  ): Promise<number[]> {
    const embeddingText = this.createEmbeddingText(
      emoji, narrative, content, qualities, created, perspective, experiencer, processing
    );
    
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
    const created = source.created;
    const perspective = source.perspective || 'I';
    const experiencer = source.experiencer || 'Unknown';
    const processing = source.processing || 'during';
    
    return await this.generateEnhancedEmbedding(
      emoji, narrative, content, qualities, created, perspective, experiencer, processing
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
            source.created,
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
        // Continue with next source if embedding fails
      }
    }
    
    return results;
  }
  
  /**
   * Format temporal context for embedding based on when experience was created
   */
  private formatTemporalContext(created: string): string {
    try {
      const createdDate = new Date(created);
      
      // Time of day when experience was created
      const hour = createdDate.getHours();
      let timeOfDay: string;
      if (hour < 6) timeOfDay = 'early_morning';
      else if (hour < 12) timeOfDay = 'morning';
      else if (hour < 17) timeOfDay = 'afternoon';
      else if (hour < 21) timeOfDay = 'evening';
      else timeOfDay = 'night';
      
      // Day of week when experience was created
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayOfWeek = dayNames[createdDate.getDay()];
      
      // Calculate relative timing from created date to now
      const now = new Date();
      const diffMs = now.getTime() - createdDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      let relativeTiming: string;
      if (diffDays < 1) relativeTiming = 'today';
      else if (diffDays === 1) relativeTiming = 'yesterday';
      else if (diffDays < 7) relativeTiming = 'this_week';
      else if (diffDays < 30) relativeTiming = 'this_month';
      else if (diffDays < 90) relativeTiming = 'recent_past';
      else relativeTiming = 'distant_past';
      
      // Include season context
      const month = createdDate.getMonth();
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
}