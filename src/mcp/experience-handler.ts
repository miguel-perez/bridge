import { RecallService, type RecallInput, type RecallServiceResult, type RecallServiceResponse } from '../services/search.js';
import { ExperienceService } from '../services/experience.js';
import { ExperienceInput, ToolResultSchema, type ToolResult } from './schemas.js';
import {
  formatExperienceResponse,
  formatBatchExperienceResponse,
  type ExperienceResult,
} from '../utils/formatters.js';
import { SEMANTIC_CONFIG } from '../core/config.js';

// Temporary config values until circular dependency is resolved
const RECALL_CONFIG = {
  DEFAULT_AUTO_RECALL_LIMIT: 20,
  RECENT_FLOW_LIMIT: 10,
  EMERGING_PATTERNS_LIMIT: 100,
  TEXT_TRUNCATION_LENGTH: 600,
};
import { incrementCallCount } from './call-counter.js';

/**
 * Interface for similar experience data
 */
interface SimilarExperience {
  id: string;
  snippet?: string;
  content?: string;
  relevance_score: number;
}

/**
 * Format similar experiences with improved readability
 *
 * @param similar - Array of similar experiences
 * @returns Formatted string or empty string if no experiences
 */
function formatSimilarExperiences(similar: SimilarExperience[]): string {
  if (similar.length === 0) return '';

  let output = '\nSimilar experiences found:\n';

  similar.forEach((exp, index) => {
    const snippet = exp.snippet || exp.content || '';

    // Use generous truncation for maximum information
    const truncated = snippet.length > RECALL_CONFIG.TEXT_TRUNCATION_LENGTH ? snippet.substring(0, RECALL_CONFIG.TEXT_TRUNCATION_LENGTH - 3) + '...' : snippet;

    const score = Math.round(exp.relevance_score * 100);

    // Format with clear separation and quotes around content
    output += `  ${index + 1}. "${truncated}"\n`;
    output += `     (${score}% match)`;

    // Add connection info if available (placeholder for future enhancement)
    // This could be enhanced to show actual connection counts
    output += ` • Connects to similar moments`;

    output += '\n';
  });

  return output;
}

/**
 * Handles experience capture requests from MCP clients
 * @remarks
 * Validates input using Zod schemas, delegates to ExperienceService for processing,
 * and returns user-friendly responses. Only accepts array format for experience capture.
 * Handles errors gracefully with appropriate error messages for MCP protocol compliance.
 *
 * @example
 * ```ts
 * // Single experience capture (still uses array format)
 * const result = await experienceHandler.handle({
 *   experiences: [{
 *     source: "I feel anxious about tomorrow's presentation",
 *     experience: ["embodied.sensing", "mood.closed"]
 *   }]
 * });
 * // Returns: "Experienced (embodied.sensing, mood.closed)"
 *
 * // Batch experience capture
 * const result = await experienceHandler.handle({
 *   experiences: [
 *     { source: "Feeling focused while coding", emoji: "🔍", experience: ["embodied.thinking"] },
 *     { source: "Anxiety about meeting", emoji: "😟", experience: ["mood.closed"] }
 *   ]
 * });
 * // Returns: "Experienced 2 moments..."
 * ```
 * @throws ValidationError When input validation fails
 * @throws ServiceError When underlying service operations fail
 * @see ExperienceService for core business logic
 * @see RecallService for similarity detection
 */
export class ExperienceHandler {
  private experienceService: ExperienceService;
  private recallService: RecallService;

  /**
   * Initializes the ExperienceHandler with required services
   * @remarks
   * Creates instances of ExperienceService for core business logic
   * and RecallService for similarity detection capabilities.
   */
  constructor() {
    this.experienceService = new ExperienceService();
    this.recallService = new RecallService();
  }

  /**
   * Processes experience capture requests with validation and formatting
   * @remarks
   * Main entry point for MCP experience tool. Validates input, processes the request,
   * and ensures output conforms to MCP protocol requirements. Handles both single
   * and batch experience capture modes. Now supports nextMoment parameter for flow tracking.
   * @param args - Experience input data from MCP client
   * @returns Formatted tool result compliant with MCP protocol
   * @throws ValidationError When required fields are missing
   * @throws ServiceError When experience processing fails
   */
  async handle(args: ExperienceInput): Promise<ToolResult> {
    try {
      incrementCallCount();
      const { result, capturedExperiences } = await this.handleRegularExperienceWithCapture(args);

      // Add nextMoment tracking if provided
      if (args.nextMoment && capturedExperiences.length > 0) {
        result.nextMoment = args.nextMoment;
      }

      ToolResultSchema.parse(result);
      return result;
    } catch (err) {
      return {
        isError: true,
        content: [{ type: 'text', text: 'Internal error: Output validation failed.' }],
      };
    }
  }

  /**
   * Processes experience capture with natural language formatting
   * @remarks
   * Handles the core logic for experience capture using array format only.
   * Validates required fields, processes through ExperienceService, and formats
   * responses for natural conversation flow. Includes similarity detection
   * for enhanced user experience.
   * @param experience - Experience input data to process
   * @returns Object containing formatted tool result and captured experiences
   * @throws Error When source content is missing
   * @throws ServiceError When experience processing fails
   */
  private async handleRegularExperienceWithCapture(experience: ExperienceInput): Promise<{
    result: ToolResult;
    capturedExperiences: ExperienceResult[];
  }> {
    try {
      // Validate required fields - only accept array format
      if (!experience.experiences || experience.experiences.length === 0) {
        throw new Error('Experiences array is required');
      }

      // Validate each item in the array
      for (const item of experience.experiences) {
        if (!item.source || typeof item.source !== 'string' || item.source.trim() === '') {
          throw new Error('Each experience item must have source content');
        }
        if (!item.emoji || typeof item.emoji !== 'string') {
          throw new Error('Each experience item must have an emoji');
        }
      }

      // Process experience items
      const results: ExperienceResult[] = [];
      for (const item of experience.experiences) {
        const result = await this.experienceService.rememberExperience({
          source: item.source,
          emoji: item.emoji,
          who: item.who,
          experience: item.experienceQualities || undefined,
          reflects: item.reflects,
          context: item.context,
        });
        results.push(result);
      }

      // Handle integrated recall if requested or if we should do automatic recall
      let recallResults = null;
      let targetStateResults = null;
      let recentFlowResults = null;
      let emergingPatterns = null;
      
      const shouldAutoRecall = !experience.recall && results.length > 0 && 
        (experience.experiences?.[0]?.source || experience.nextMoment);
      
      if (experience.recall || shouldAutoRecall) {
        const searchParams: RecallInput = {
          limit: experience.recall?.limit || RECALL_CONFIG.DEFAULT_AUTO_RECALL_LIMIT,
        };
        
        // For automatic recall, use the content as the search query
        if (shouldAutoRecall && !experience.recall) {
          searchParams.semantic_query = experience.experiences[0].source;
          // Note: We'll filter out the just-captured experience later
        }

        // ID lookup
        if (experience.recall?.ids) {
          searchParams.id = Array.isArray(experience.recall.ids)
            ? experience.recall.ids[0] // RecallInput takes single ID
            : experience.recall.ids;
        }
        // Semantic search
        if (experience.recall?.search) {
          searchParams.semantic_query = Array.isArray(experience.recall.search)
            ? experience.recall.search[0] // RecallInput takes single query
            : experience.recall.search;
        }
        // Quality filtering
        if (experience.recall?.qualities) {
          searchParams.qualities = experience.recall.qualities;
        }
        // Pagination
        if (experience.recall?.offset !== undefined) {
          searchParams.offset = experience.recall.offset;
        }
        // Filters
        if (experience.recall?.who) {
          searchParams.who = experience.recall.who;
        }
        // Pattern filters
        if (experience.recall?.reflects === 'only') {
          searchParams.reflects = 'only';
        }
        // Note: reflected_by is not in RecallInput interface
        // Date filtering
        if (experience.recall?.created) {
          searchParams.created = experience.recall.created;
        }
        // Sorting and grouping
        if (experience.recall?.sort) {
          searchParams.sort = experience.recall.sort;
        }
        if (experience.recall?.group_by) {
          searchParams.group_by = experience.recall.group_by;
        }

        recallResults = await this.recallService.search(searchParams);
        
        // Filter out the just-captured experiences from automatic recall
        if (shouldAutoRecall && results.length > 0) {
          const capturedIds = new Set(results.map(r => r.source.id));
          if (recallResults.results) {
            recallResults.results = recallResults.results.filter(r => !capturedIds.has(r.id));
          }
        }
      }
      
      // DUAL VIEW: Always get recent flow (last N chronological)
      const recentFlowParams: RecallInput = {
        limit: RECALL_CONFIG.RECENT_FLOW_LIMIT,
        sort: 'created'
      };
      recentFlowResults = await this.recallService.search(recentFlowParams);
      
      // DUAL VIEW: Always get emerging patterns (grouped by qualities)
      const patternsParams: RecallInput = {
        limit: RECALL_CONFIG.EMERGING_PATTERNS_LIMIT,
        group_by: 'qualities'
      };
      emergingPatterns = await this.recallService.search(patternsParams);
      
      // TARGET STATE SEARCH: If nextMoment specified, search for matching experiences
      if (experience.nextMoment) {
        // Convert nextMoment object to proper quality filter format
        const qualityFilter: Record<string, unknown> = {};
        
        for (const [quality, value] of Object.entries(experience.nextMoment)) {
          if (value !== false) {
            if (typeof value === 'string') {
              // For specific values (e.g., mood: 'open')
              qualityFilter[quality] = value;
            }
          }
        }
        
        const targetStateParams: RecallInput = {
          limit: 20,
          qualities: qualityFilter,
        };
        targetStateResults = await this.recallService.search(targetStateParams);
        
        // If no matching target state found, get recent experiences as fallback
        if (!targetStateResults || targetStateResults.results.length === 0) {
          targetStateResults = await this.recallService.search({
            limit: 10,
            sort: 'created'
          });
        }
      }

      // Format response based on number of experiences
      if (results.length === 1) {
        // Single experience - use individual formatting
        const result = results[0];
        const showId = process.env.BRIDGE_SHOW_IDS === 'true' || process.env.NODE_ENV === 'test';
        let response = formatExperienceResponse(result, showId);

        // Find similar experience if any (unless we already did recall)
        if (!recallResults) {
          const similarText = await this.findSimilarExperience(
            result.source.source,
            result.source.id
          );
          if (similarText) {
            response += '\n\n' + similarText;
          }
        }

        // Build multi-content response
        const content: Array<{ type: 'text'; text: string }> = [
          {
            type: 'text',
            text: response,
          },
        ];

        // DUAL VIEW: Always show recent flow and emerging patterns
        
        // 1. Recent Flow
        if (recentFlowResults && recentFlowResults.results.length > 0) {
          const recentText = this.formatRecallResults(recentFlowResults.results);
          content.push({
            type: 'text',
            text: `\n🕐 Recent Flow (last ${recentFlowResults.results.length} experiences):\n${recentText}`,
          });
        }
        
        // 2. Emerging Patterns
        if (emergingPatterns && emergingPatterns.clusters && emergingPatterns.clusters.length > 0) {
          const patternsText = this.formatGroupedResults(emergingPatterns.clusters, emergingPatterns.results);
          content.push({
            type: 'text',
            text: `\n🌊 Emerging Patterns (grouped by qualities):\n${patternsText}`,
          });
        }
        
        // 3. Related experiences (if explicit recall was requested)
        if (recallResults && experience.recall) {
          if (recallResults.clusters && recallResults.clusters.length > 0) {
            // Format grouped results
            const groupedText = this.formatGroupedResults(recallResults.clusters, recallResults.results);
            content.push({
              type: 'text',
              text: `\n🔍 Search results (grouped):\n${groupedText}`,
            });
          } else if (recallResults.results.length > 0) {
            // Format flat results
            const recallText = this.formatRecallResults(recallResults.results);
            content.push({
              type: 'text',
              text: `\n🔍 Search results:\n${recallText}`,
            });
          }
        }
        
        // 4. Target State Examples (if nextMoment specified)
        if (targetStateResults && targetStateResults.results.length > 0) {
          const targetText = this.formatRecallResults(targetStateResults.results);
          const hasQualityFilter = experience.nextMoment && 
            Object.entries(experience.nextMoment).some(([_, v]) => v !== false);
          const targetQualities = experience.nextMoment ? 
            Object.entries(experience.nextMoment)
              .filter(([_, v]) => v !== false)
              .map(([k, v]) => typeof v === 'string' ? `${k}: "${v}"` : k)
              .join(', ') : 'qualities';
          
          // Check what type of results we're showing
          const response = targetStateResults as RecallServiceResponse;
          const isPartialMatch = response.filters?.qualities === 'partial_match';
          const isFallback = hasQualityFilter && 
            (!response.filters || (!response.filters.qualities && !isPartialMatch));
          
          let headerText: string;
          if (isPartialMatch) {
            headerText = `🎯 Target state (partial matches for ${targetQualities}):`;
          } else if (isFallback) {
            headerText = `🎯 Target state (no matches for ${targetQualities}, showing recent):`;
          } else {
            headerText = `🎯 Target state examples (matching ${targetQualities}):`;
          }
            
          content.push({
            type: 'text',
            text: `\n${headerText}\n${targetText}`,
          });
        }

        // Add contextual guidance based on simple triggers
        const guidance = await this.selectGuidance(result, recallResults !== null || false);
        if (guidance) {
          content.push({
            type: 'text',
            text: guidance,
          });
        }

        // Add nextMoment if provided
        if (experience.nextMoment) {
          const nextMomentText = this.formatNextMoment(experience.nextMoment);
          content.push({
            type: 'text',
            text: nextMomentText,
          });
        }

        return { result: { content }, capturedExperiences: results };
      } else {
        // Multiple experiences - use batch formatting
        const showIds = process.env.BRIDGE_SHOW_IDS === 'true' || process.env.NODE_ENV === 'test';
        const response = formatBatchExperienceResponse(results, showIds);
        const content: Array<{ type: 'text'; text: string }> = [
          {
            type: 'text',
            text: response,
          },
        ];

        // DUAL VIEW: Always show recent flow and emerging patterns
        
        // 1. Recent Flow
        if (recentFlowResults && recentFlowResults.results.length > 0) {
          const recentText = this.formatRecallResults(recentFlowResults.results);
          content.push({
            type: 'text',
            text: `\n🕐 Recent Flow (last ${recentFlowResults.results.length} experiences):\n${recentText}`,
          });
        }
        
        // 2. Emerging Patterns
        if (emergingPatterns && emergingPatterns.clusters && emergingPatterns.clusters.length > 0) {
          const patternsText = this.formatGroupedResults(emergingPatterns.clusters, emergingPatterns.results);
          content.push({
            type: 'text',
            text: `\n🌊 Emerging Patterns (grouped by qualities):\n${patternsText}`,
          });
        }
        
        // 3. Related experiences (if explicit recall was requested)
        if (recallResults && experience.recall) {
          if (recallResults.clusters && recallResults.clusters.length > 0) {
            // Format grouped results
            const groupedText = this.formatGroupedResults(recallResults.clusters, recallResults.results);
            content.push({
              type: 'text',
              text: `\n🔍 Search results (grouped):\n${groupedText}`,
            });
          } else if (recallResults.results.length > 0) {
            // Format flat results
            const recallText = this.formatRecallResults(recallResults.results);
            content.push({
              type: 'text',
              text: `\n🔍 Search results:\n${recallText}`,
            });
          }
        }
        
        // 4. Target State Examples (if nextMoment specified)
        if (targetStateResults && targetStateResults.results.length > 0) {
          const targetText = this.formatRecallResults(targetStateResults.results);
          const hasQualityFilter = experience.nextMoment && 
            Object.entries(experience.nextMoment).some(([_, v]) => v !== false);
          const targetQualities = experience.nextMoment ? 
            Object.entries(experience.nextMoment)
              .filter(([_, v]) => v !== false)
              .map(([k, v]) => typeof v === 'string' ? `${k}: "${v}"` : k)
              .join(', ') : 'qualities';
          
          // Check what type of results we're showing
          const response = targetStateResults as RecallServiceResponse;
          const isPartialMatch = response.filters?.qualities === 'partial_match';
          const isFallback = hasQualityFilter && 
            (!response.filters || (!response.filters.qualities && !isPartialMatch));
          
          let headerText: string;
          if (isPartialMatch) {
            headerText = `🎯 Target state (partial matches for ${targetQualities}):`;
          } else if (isFallback) {
            headerText = `🎯 Target state (no matches for ${targetQualities}, showing recent):`;
          } else {
            headerText = `🎯 Target state examples (matching ${targetQualities}):`;
          }
            
          content.push({
            type: 'text',
            text: `\n${headerText}\n${targetText}`,
          });
        }

        // Add nextMoment if provided
        if (experience.nextMoment) {
          const nextMomentText = this.formatNextMoment(experience.nextMoment);
          content.push({
            type: 'text',
            text: nextMomentText,
          });
        }

        return { result: { content }, capturedExperiences: results };
      }
    } catch (error) {
      return {
        result: {
          isError: true,
          content: [
            {
              type: 'text',
              text: error instanceof Error ? error.message : 'Unknown error',
            },
          ],
        },
        capturedExperiences: [],
      };
    }
  }

  /**
   * Select appropriate guidance based on context
   */
  private async selectGuidance(
    result: ExperienceResult,
    hasSimilar: boolean
  ): Promise<string | null> {
    try {
      // Check if this is the first experience
      const { getAllRecords } = await import('../core/storage.js');
      const allRecords = await getAllRecords();
      const count = allRecords.length;

      if (count === 1) {
        // First experience ever
        return "Capturing meaningful moments. Share what's on your mind.";
      }

      // Check if we found similar experiences
      if (hasSimilar) {
        // Get similar count for more detailed guidance
        const similarResults = await this.recallService.search({
          semantic_query: result.source.source,
          semantic_threshold: SEMANTIC_CONFIG.SIMILARITY_DETECTION_THRESHOLD,
          limit: 10,
        });

        const similarCount = similarResults.results.filter(
          (r) =>
            r.id !== result.source.id &&
            r.relevance_score > SEMANTIC_CONFIG.SIMILARITY_DETECTION_THRESHOLD
        ).length;

        if (similarCount > 2) {
          return `Connects to ${similarCount} similar moments`;
        }
      }

      // Check if qualities suggest emotional content
      const qualities = result.source.experienceQualities;
      const hasEmotionalQualities = qualities && (
        qualities.mood !== false || 
        qualities.embodied !== false
      );

      if (hasEmotionalQualities) {
        const quality = qualities.mood !== false ? 
          `mood: "${qualities.mood}"` :
          qualities.embodied !== false ? 
            `embodied: "${qualities.embodied}"` :
            'experience';
        return `Captured as ${quality}`;
      }

      // No guidance needed for routine captures
      return null;
    } catch (error) {
      // Guidance is optional - don't let errors break the main flow
      return null;
    }
  }

  /**
   * Find similar experiences to show connections
   */
  private async findSimilarExperience(content: string, excludeId: string): Promise<string | null> {
    try {
      // Use semantic search to find similar experiences
      const { results } = await this.recallService.search({
        semantic_query: content,
        semantic_threshold: SEMANTIC_CONFIG.SIMILARITY_DETECTION_THRESHOLD,
        limit: 6, // Get 6 in case the first is the same one we just experienced
      });

      // Filter out the experience we just experienced and get up to 5 similar ones
      const similarExperiences = results
        .filter(
          (r) =>
            r.id !== excludeId && r.relevance_score > SEMANTIC_CONFIG.SIMILARITY_DETECTION_THRESHOLD
        )
        .slice(0, 5);

      if (similarExperiences.length === 0) {
        return null;
      }

      return formatSimilarExperiences(similarExperiences);
    } catch (error) {
      // Silently fail - similarity is nice to have but not critical
      return null;
    }
  }

  /**
   * Format grouped results for display
   */
  private formatGroupedResults(clusters: Array<{
    id: string;
    summary: string;
    experienceIds: string[];
    commonQualities: string[];
    size: number;
  }>, results?: RecallServiceResult[]): string {
    return clusters
      .map((cluster) => {
        let text = `\n📁 ${cluster.summary}`;
        
        // Add common qualities if present
        if (cluster.commonQualities && cluster.commonQualities.length > 0) {
          text += `\n   Common: ${cluster.commonQualities.join(', ')}`;
        }
        
        // If we have results, show actual experiences instead of just IDs
        if (results && results.length > 0) {
          // Find experiences that belong to this cluster
          const clusterExperiences = results.filter(r => 
            cluster.experienceIds.includes(r.id)
          ); // Show ALL experiences in cluster
          
          if (clusterExperiences.length > 0) {
            text += '\n';
            clusterExperiences.forEach((exp, idx) => {
              const snippet = exp.snippet || exp.content || '';
              const truncated = snippet.length > RECALL_CONFIG.TEXT_TRUNCATION_LENGTH ? snippet.substring(0, RECALL_CONFIG.TEXT_TRUNCATION_LENGTH - 3) + '...' : snippet;
              text += `\n   ${idx + 1}. "${truncated}"`;
              
              // Add metadata if available
              if (exp.metadata) {
                const metadata = exp.metadata as Record<string, unknown>;
                const qualitiesArray = metadata.experienceQualities ? 
                  Object.entries(metadata.experienceQualities)
                    .filter(([_, v]) => v !== false)
                    .map(([k, v]) => typeof v === 'string' ? `${k}: "${v}"` : k) : [];
                
                if (qualitiesArray.length > 0) {
                  text += `\n      (${qualitiesArray.join(', ')})`;
                }
                
                if (metadata.created) {
                  const timeAgo = this.formatTimeAgo(metadata.created as string);
                  text += `\n      ${timeAgo}`;
                }
              }
            });
            
            // Removed limit - show all experiences
          }
        } else {
          // Fallback to showing IDs if no results available
          if (cluster.experienceIds.length > 0) {
            const idsToShow = cluster.experienceIds.slice(0, 3);
            text += `\n   IDs: ${idsToShow.join(', ')}`;
            if (cluster.experienceIds.length > 3) {
              text += ` ... and ${cluster.experienceIds.length - 3} more`;
            }
          }
        }
        
        return text;
      })
      .join('\n');
  }

  /**
   * Format recall results for display
   */
  private formatRecallResults(results: RecallServiceResult[]): string {
    return results
      .map((result, idx) => {
        const snippet = result.snippet || result.content || '';
        const truncated = snippet.length > RECALL_CONFIG.TEXT_TRUNCATION_LENGTH ? snippet.substring(0, RECALL_CONFIG.TEXT_TRUNCATION_LENGTH - 3) + '...' : snippet;
        const metadata = result.metadata || {};
        const experienceQualities = metadata.experienceQualities || {};

        let text = `${idx + 1}. "${truncated}"`;
        // Convert qualities to array for display
        const qualitiesArray = Object.entries(experienceQualities)
          .filter(([_, v]) => v !== false)
          .map(([k, v]) => typeof v === 'string' ? `${k}: "${v}"` : k);
        if (qualitiesArray.length > 0) {
          text += `\n   (${qualitiesArray.join(', ')})`;
        }
        if (metadata.created) {
          const timeAgo = this.formatTimeAgo(metadata.created as string);
          text += `\n   ${timeAgo}`;
        }

        return text;
      })
      .join('\n\n');
  }

  /**
   * Format time ago helper
   */
  private formatTimeAgo(timestamp: string): string {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'just now';
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return time.toLocaleDateString();
  }

  /**
   * Format nextMoment declaration
   */
  private formatNextMoment(nextMoment: Record<string, string | boolean>): string {
    const qualities: string[] = [];
    
    for (const [quality, value] of Object.entries(nextMoment)) {
      if (value !== false) {
        if (value === true) {
          qualities.push(quality);
        } else {
          qualities.push(`${quality}.${value}`);
        }
      }
    }
    
    return `\n➡️ Next: ${qualities.length > 0 ? qualities.join(', ') : 'Open experiential state'}`;
  }
}
