/**
 * Quality-Aware Keyword Extraction Service
 * 
 * Combines multiple approaches to extract quality-specific keywords
 * that avoid generic overlapping terms like "captain" and "design"
 */

import { SourceRecord } from '../core/types.js';

export class QualityAwareKeywordExtractor {
  // Common words to filter out
  private readonly COMMON_WORDS = new Set([
    'captain', 'captains', 'design', 'bridge', 'through', 'about', 
    'would', 'could', 'should', 'really', 'where', 'which', 'their', 
    'there', 'these', 'those', 'feeling', 'being', 'having', 'doing',
    'with', 'from', 'that', 'this', 'what', 'when', 'very', 'much'
  ]);
  
  // Quality-specific indicator words
  private readonly QUALITY_INDICATORS: Record<string, Set<string>> = {
    spatial: new Set(['location', 'space', 'environment', 'visual', 'mapping', 'structure', 'layout', 'position', 'distance', 'navigation']),
    temporal: new Set(['time', 'moment', 'future', 'past', 'present', 'sequence', 'duration', 'timing', 'rhythm', 'schedule']),
    affective: new Set(['emotion', 'mood', 'feeling', 'joy', 'sadness', 'excitement', 'calm', 'tension', 'warmth', 'satisfaction']),
    purposive: new Set(['goal', 'intention', 'purpose', 'drive', 'motivation', 'desire', 'objective', 'mission', 'aim', 'target']),
    attentional: new Set(['focus', 'awareness', 'attention', 'notice', 'observe', 'concentrate', 'mindful', 'conscious', 'alert', 'perception']),
    embodied: new Set(['body', 'physical', 'sensation', 'movement', 'energy', 'tension', 'relaxation', 'breath', 'posture', 'gesture']),
    intersubjective: new Set(['together', 'relationship', 'connection', 'interaction', 'communication', 'understanding', 'empathy', 'collaboration', 'dialogue', 'social'])
  };
  
  /**
   * Extract quality-aware keywords using hybrid approach
   */
  extractKeywords(
    clusterExperiences: SourceRecord[],
    allExperiences: SourceRecord[],
    dimension: string,
    maxKeywords: number = 10
  ): string[] {
    // 1. Get manifestation-based keywords
    const manifestationKeywords = this.extractManifestationKeywords(clusterExperiences, dimension);
    
    // 2. Get TF-IDF distinctive keywords
    const tfidfKeywords = this.extractTFIDFKeywords(clusterExperiences, allExperiences, dimension);
    
    // 3. Get quality-indicator keywords
    const indicatorKeywords = this.extractQualityIndicators(clusterExperiences, dimension);
    
    // 4. Combine with weighted scoring
    const keywordScores = new Map<string, number>();
    
    // Manifestation keywords get highest weight (most specific)
    manifestationKeywords.forEach((keyword, index) => {
      const score = (manifestationKeywords.length - index) * 3;
      keywordScores.set(keyword, (keywordScores.get(keyword) || 0) + score);
    });
    
    // TF-IDF keywords get medium weight (distinctive)
    tfidfKeywords.forEach((keyword, index) => {
      const score = (tfidfKeywords.length - index) * 2;
      keywordScores.set(keyword, (keywordScores.get(keyword) || 0) + score);
    });
    
    // Quality indicators get bonus points
    indicatorKeywords.forEach(keyword => {
      keywordScores.set(keyword, (keywordScores.get(keyword) || 0) + 5);
    });
    
    // Sort by combined score and filter
    return Array.from(keywordScores.entries())
      .filter(([keyword]) => !this.COMMON_WORDS.has(keyword))
      .sort(([,a], [,b]) => b - a)
      .map(([keyword]) => keyword)
      .slice(0, maxKeywords);
  }
  
  /**
   * Extract keywords from quality manifestations
   */
  private extractManifestationKeywords(
    experiences: SourceRecord[],
    dimension: string
  ): string[] {
    const manifestations = experiences
      .map(exp => exp.experience?.qualities?.find(q => q.type === dimension)?.manifestation)
      .filter(m => m);
    
    if (manifestations.length === 0) return [];
    
    const allText = manifestations.join(' ').toLowerCase();
    
    // Extract both single words and meaningful phrases
    const tokens = this.extractTokensAndPhrases(allText);
    
    // Count frequency
    const freq = new Map<string, number>();
    tokens.forEach(token => {
      if (!this.COMMON_WORDS.has(token) && token.length > 3) {
        freq.set(token, (freq.get(token) || 0) + 1);
      }
    });
    
    return Array.from(freq.entries())
      .filter(([, count]) => count > 1)
      .sort(([,a], [,b]) => b - a)
      .map(([phrase]) => phrase)
      .slice(0, 20);
  }
  
  /**
   * Extract TF-IDF keywords distinctive to this cluster
   */
  private extractTFIDFKeywords(
    targetExperiences: SourceRecord[],
    allExperiences: SourceRecord[],
    dimension: string
  ): string[] {
    // Get text from target cluster (including manifestations)
    const targetTexts = targetExperiences.map(e => {
      const manifestation = e.experience?.qualities?.find(q => q.type === dimension)?.manifestation || '';
      return `${e.experience?.narrative || ''} ${manifestation}`;
    });
    const targetText = targetTexts.join(' ').toLowerCase();
    
    // Get text from other experiences
    const otherExperiences = allExperiences.filter(e => !targetExperiences.includes(e));
    const otherText = otherExperiences
      .map(e => e.experience?.narrative || '')
      .join(' ')
      .toLowerCase();
    
    // Calculate term frequencies
    const targetTokens = this.extractTokensAndPhrases(targetText);
    const otherTokens = this.extractTokensAndPhrases(otherText);
    
    const targetFreq = new Map<string, number>();
    targetTokens.forEach(t => targetFreq.set(t, (targetFreq.get(t) || 0) + 1));
    
    const otherFreq = new Map<string, number>();
    otherTokens.forEach(t => otherFreq.set(t, (otherFreq.get(t) || 0) + 1));
    
    // Calculate TF-IDF scores
    const tfidfScores = new Map<string, number>();
    targetFreq.forEach((count, token) => {
      if (this.COMMON_WORDS.has(token) || token.length <= 3) return;
      
      const tf = count / targetTokens.length;
      const df = (otherFreq.get(token) || 0) / Math.max(1, otherTokens.length);
      const idf = df > 0 ? Math.log(1 / (df + 0.01)) : 3;
      tfidfScores.set(token, tf * idf);
    });
    
    return Array.from(tfidfScores.entries())
      .sort(([,a], [,b]) => b - a)
      .map(([token]) => token)
      .slice(0, 20);
  }
  
  /**
   * Extract quality-specific indicator keywords
   */
  private extractQualityIndicators(
    experiences: SourceRecord[],
    dimension: string
  ): string[] {
    const indicators = this.QUALITY_INDICATORS[dimension] || new Set();
    const found: string[] = [];
    
    const allText = experiences
      .map(e => {
        const manifestation = e.experience?.qualities?.find(q => q.type === dimension)?.manifestation || '';
        return `${e.experience?.narrative || ''} ${e.content || ''} ${manifestation}`;
      })
      .join(' ')
      .toLowerCase();
    
    indicators.forEach(indicator => {
      if (allText.includes(indicator)) {
        found.push(indicator);
      }
    });
    
    return found;
  }
  
  /**
   * Extract tokens and meaningful phrases
   */
  private extractTokensAndPhrases(text: string): string[] {
    const words = text.split(/\s+/).map(w => w.replace(/[^a-z0-9]/g, '')).filter(w => w);
    const tokens: string[] = [];
    
    // Add single words
    words.forEach(word => {
      if (word.length > 3) tokens.push(word);
    });
    
    // Add 2-word phrases
    for (let i = 0; i < words.length - 1; i++) {
      if (words[i].length > 2 && words[i + 1].length > 2) {
        const phrase = `${words[i]} ${words[i + 1]}`;
        if (!this.isCommonPhrase(phrase)) {
          tokens.push(phrase);
        }
      }
    }
    
    return tokens;
  }
  
  /**
   * Check if phrase is too common
   */
  private isCommonPhrase(phrase: string): boolean {
    const commonPhrases = [
      'with the', 'in the', 'of the', 'and the', 'to the',
      'from the', 'on the', 'at the', 'for the', 'by the'
    ];
    return commonPhrases.includes(phrase);
  }
}