/**
 * Quality Filter Service
 *
 * Provides sophisticated quality filtering capabilities for Bridge experiences.
 * Supports boolean logic, presence/absence filtering, and complex expressions.
 */

import { SourceRecord, Experience } from '../core/types.js';
import { KNOWN_QUALITIES, KnownQuality } from '../core/qualities.js';

// Core filter types
export interface QualityFilter {
  // Presence/Absence filtering
  embodied?: { present: boolean } | string | string[];
  focus?: { present: boolean } | string | string[];
  mood?: { present: boolean } | string | string[];
  purpose?: { present: boolean } | string | string[];
  space?: { present: boolean } | string | string[];
  time?: { present: boolean } | string | string[];
  presence?: { present: boolean } | string | string[];

  // Complex boolean expressions
  $and?: QualityFilter[];
  $or?: QualityFilter[];
  $not?: QualityFilter;
}

// Internal filter expression types
export type FilterExpression =
  | PresenceFilter
  | ValueFilter
  | AndExpression
  | OrExpression
  | NotExpression;

/** Filter for presence or absence of a quality */
export interface PresenceFilter {
  type: 'presence';
  quality: string;
  present: boolean;
}

/** Filter for specific quality values */
export interface ValueFilter {
  type: 'value';
  quality: string;
  values: string[];
  operator: 'exact' | 'contains';
}

export interface AndExpression {
  type: 'and';
  filters: FilterExpression[];
}

export interface OrExpression {
  type: 'or';
  filters: FilterExpression[];
}

export interface NotExpression {
  type: 'not';
  filter: FilterExpression;
}

// Error types
/**
 * Custom error class for quality filter operations
 */
export class QualityFilterError extends Error {
  /**
   * Creates a quality filter error with a specific code
   */
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = 'QualityFilterError';
  }
}

/**
 *
 */
export class QualityFilterService {
  private hasQuality(record: SourceRecord | Experience, quality: string): boolean {
    const [base, subtype] = quality.split('.');
    
    // Check if it's a new Experience format
    if ('anchor' in record && 'embodied' in record) {
      const exp = record as Experience;
      const value = exp[base as keyof Experience];
      if (!value || typeof value !== 'string') return false;
      
      if (subtype) {
        // Map sentence to old quality value
        const patterns = this.getQualityPatterns(base, subtype);
        return patterns.some(pattern => 
          value.toLowerCase().includes(pattern.toLowerCase())
        );
      }
      return true; // Has the quality
    }
    
    // Fall back to old format
    const qualities = (record as SourceRecord).experienceQualities;
    if (!qualities) return false;
    const value = qualities[base as keyof typeof qualities];
    // Check for false or falsy values
    if (value === false || value === undefined || value === null) return false;
    
    // At this point, value is a string (not false)
    if (subtype) {
      if (value.includes(' ')) {
        // It's a sentence, check if it contains the pattern
        const patterns = this.getQualityPatterns(base, subtype);
        return patterns.some(pattern => 
          value.toLowerCase().includes(pattern.toLowerCase())
        );
      }
      return value === subtype;
    }
    return true; // Has the quality
  }
  
  private getQualityPatterns(quality: string, value: string): string[] {
    const mappings: Record<string, Record<string, string[]>> = {
      embodied: {
        thinking: ['mind processes', 'analytically', 'thoughts line up', 'thinking'],
        sensing: ['feeling this', 'whole body', 'body knows', 'sensing', 'feeling'],
      },
      focus: {
        narrow: ['zeroing in', 'one specific thing', 'laser focus', 'narrow'],
        broad: ['taking in everything', 'wide awareness', 'peripheral', 'broad'],
      },
      mood: {
        open: ['curious', 'receptive', 'welcoming', 'possibility', 'open'],
        closed: ['shutting down', 'emotionally', 'closed off', 'withdrawn', 'closed'],
      },
      purpose: {
        goal: ['pushing toward', 'specific outcome', 'achievement', 'goal'],
        wander: ['exploring', 'without direction', 'drifting', 'wander'],
      },
      space: {
        here: ['present in this space', 'fully here', 'grounded', 'here'],
        there: ['mind is elsewhere', 'somewhere else', 'distant', 'there'],
      },
      time: {
        past: ['memories', 'pulling backward', 'remembering', 'past'],
        future: ['anticipating', 'what comes next', 'forward', 'future'],
      },
      presence: {
        individual: ['navigating alone', 'by myself', 'solitary', 'individual'],
        collective: ['shared experience', 'together', 'we', 'collective'],
      },
    };
    return mappings[quality]?.[value] || [value];
  }

  /**
   * Parse a quality filter into an internal expression tree
   */
  parseQualityFilter(filter: QualityFilter): FilterExpression {
    if (!filter || Object.keys(filter).length === 0) {
      throw new QualityFilterError('Empty filter provided', 'EMPTY_FILTER');
    }

    // Handle boolean expressions first
    if (filter.$and) {
      return {
        type: 'and',
        filters: filter.$and.map((f) => this.parseQualityFilter(f)),
      };
    }

    if (filter.$or) {
      return {
        type: 'or',
        filters: filter.$or.map((f) => this.parseQualityFilter(f)),
      };
    }

    if (filter.$not) {
      return {
        type: 'not',
        filter: this.parseQualityFilter(filter.$not),
      };
    }

    // Handle individual quality filters
    const qualityFilters: FilterExpression[] = [];

    for (const [quality, value] of Object.entries(filter)) {
      if (quality.startsWith('$')) continue; // Skip boolean operators

      if (typeof value === 'object' && value !== null && 'present' in value) {
        // Presence/absence filter
        qualityFilters.push({
          type: 'presence',
          quality,
          present: (value as { present: boolean }).present,
        });
      } else if (typeof value === 'string') {
        // Single value filter
        qualityFilters.push({
          type: 'value',
          quality,
          values: [value],
          operator: 'exact',
        });
      } else if (Array.isArray(value)) {
        // Multiple values (OR logic within quality)
        qualityFilters.push({
          type: 'value',
          quality,
          values: value,
          operator: 'exact',
        });
      } else {
        throw new QualityFilterError(
          `Invalid filter value for quality '${quality}': ${JSON.stringify(value)}`,
          'INVALID_FILTER_VALUE'
        );
      }
    }

    // If we have multiple quality filters, combine with AND
    if (qualityFilters.length === 1) {
      return qualityFilters[0];
    } else if (qualityFilters.length > 1) {
      return {
        type: 'and',
        filters: qualityFilters,
      };
    }

    throw new QualityFilterError('No valid filters found', 'NO_VALID_FILTERS');
  }

  /**
   * Evaluate a filter expression against an experience
   */
  evaluateFilter(experience: SourceRecord | Experience, filter: FilterExpression): boolean {
    try {
      return this.evaluateBooleanExpression(filter, experience);
    } catch (error) {
      if (error instanceof QualityFilterError) {
        throw error;
      }
      throw new QualityFilterError(
        `Error evaluating filter: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'EVALUATION_ERROR'
      );
    }
  }

  /**
   * Evaluate a boolean expression against an experience
   */
  private evaluateBooleanExpression(
    expression: FilterExpression,
    experience: SourceRecord | Experience
  ): boolean {
    switch (expression.type) {
      case 'presence':
        return this.evaluatePresenceFilter(expression, experience);

      case 'value':
        return this.evaluateValueFilter(expression, experience);

      case 'and':
        return expression.filters.every((filter) =>
          this.evaluateBooleanExpression(filter, experience)
        );

      case 'or':
        return expression.filters.some((filter) =>
          this.evaluateBooleanExpression(filter, experience)
        );

      case 'not':
        return !this.evaluateBooleanExpression(expression.filter, experience);

      default:
        throw new QualityFilterError(
          `Unknown expression type: ${(expression as FilterExpression).type}`,
          'UNKNOWN_EXPRESSION_TYPE'
        );
    }
  }

  /**
   * Evaluate a presence/absence filter
   */
  private evaluatePresenceFilter(filter: PresenceFilter, experience: SourceRecord | Experience): boolean {
    // Check if it's a new Experience format
    if ('anchor' in experience && 'embodied' in experience) {
      const exp = experience as Experience;
      const value = exp[filter.quality as keyof Experience];
      const hasQuality = value !== undefined && value !== null && value !== '';
      return filter.present ? hasQuality : !hasQuality;
    }
    
    // Fall back to old format
    const qualities = (experience as SourceRecord).experienceQualities || {};
    const qualityValue = qualities[filter.quality as keyof typeof qualities];
    const hasQuality = qualityValue !== false && qualityValue !== undefined;

    return filter.present ? hasQuality : !hasQuality;
  }

  /**
   * Map old quality values to sentence patterns for backward compatibility
   */
  private mapQualityValueToSentence(quality: string, value: string): string[] {
    // Map old format to sentence patterns
    const mappings: Record<string, Record<string, string[]>> = {
      embodied: {
        thinking: ['mind processes', 'analytically', 'thoughts line up', 'thinking'],
        sensing: ['feeling this', 'whole body', 'body knows', 'sensing', 'feeling'],
        tension: ['tension'],
      },
      focus: {
        narrow: ['zeroing in', 'one specific thing', 'laser focus', 'narrow'],
        broad: ['taking in everything', 'wide awareness', 'peripheral', 'broad'],
      },
      mood: {
        open: ['curious', 'receptive', 'welcoming', 'possibility', 'open'],
        closed: ['shutting down', 'emotionally', 'closed off', 'withdrawn', 'closed'],
        anxious: ['anxious'],
      },
      purpose: {
        goal: ['pushing toward', 'specific outcome', 'achievement', 'goal'],
        wander: ['exploring', 'without direction', 'drifting', 'wander'],
      },
      space: {
        here: ['present in this space', 'fully here', 'grounded', 'here'],
        there: ['mind is elsewhere', 'somewhere else', 'distant', 'there'],
      },
      time: {
        past: ['memories', 'pulling backward', 'remembering', 'past'],
        future: ['anticipating', 'what comes next', 'forward', 'future'],
      },
      presence: {
        individual: ['navigating alone', 'by myself', 'solitary', 'individual'],
        collective: ['shared experience', 'together', 'we', 'collective'],
      },
    };

    return mappings[quality]?.[value] || [value];
  }

  /**
   * Evaluate a value filter
   */
  private evaluateValueFilter(filter: ValueFilter, experience: SourceRecord | Experience): boolean {
    // Check if it's a new Experience format
    if ('anchor' in experience && 'embodied' in experience) {
      const exp = experience as Experience;
      const qualityValue = exp[filter.quality as keyof Experience];
      
      if (typeof qualityValue !== 'string') return false;
      
      // Check if any of the filter values match
      return filter.values.some((filterValue: string) => {
        const patterns = this.mapQualityValueToSentence(filter.quality, filterValue);
        return patterns.some(pattern => 
          qualityValue.toLowerCase().includes(pattern.toLowerCase())
        );
      });
    }
    
    // Fall back to old format
    const qualities = (experience as SourceRecord).experienceQualities;
    if (!qualities) return false;

    // Check if any of the filter values match the experience quality
    return filter.values.some((filterValue: string) => {
      const qualityKey = filter.quality as keyof typeof qualities;
      const qualityValue = qualities[qualityKey];
      
      // With sentence-based qualities, we need more sophisticated matching
      if (typeof qualityValue === 'string') {
        // Get patterns for the old format value
        const patterns = this.mapQualityValueToSentence(filter.quality, filterValue);
        
        // Check if any pattern matches the quality sentence
        return patterns.some(pattern => 
          qualityValue.toLowerCase().includes(pattern.toLowerCase())
        );
      }
      
      return qualityValue === false && filterValue === 'false';
    });
  }

  /**
   * Validate a quality filter structure
   */
  validateFilter(filter: QualityFilter): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      // Try to parse the filter - this will catch most structural issues
      this.parseQualityFilter(filter);
    } catch (error) {
      if (error instanceof QualityFilterError) {
        errors.push(error.message);
      } else {
        errors.push('Unknown validation error');
      }
    }

    // Additional validation checks
    this.validateFilterStructure(filter, errors);

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate filter structure recursively
   */
  private validateFilterStructure(
    filter: QualityFilter,
    errors: string[],
    path: string = ''
  ): void {
    for (const [key, value] of Object.entries(filter)) {
      const currentPath = path ? `${path}.${key}` : key;

      if (key.startsWith('$')) {
        // Boolean operators
        if (!['$and', '$or', '$not'].includes(key)) {
          errors.push(`Unknown boolean operator: ${key} at ${currentPath}`);
        }

        if (key === '$not') {
          if (typeof value === 'object' && value !== null) {
            this.validateFilterStructure(value as QualityFilter, errors, currentPath);
          } else {
            errors.push(`$not must contain a filter object at ${currentPath}`);
          }
        } else if (key === '$and' || key === '$or') {
          if (Array.isArray(value)) {
            if (value.length === 0) {
              errors.push(`${key} must contain at least one filter at ${currentPath}`);
            }
            value.forEach((item, index) => {
              if (typeof item === 'object' && item !== null) {
                this.validateFilterStructure(
                  item as QualityFilter,
                  errors,
                  `${currentPath}[${index}]`
                );
              } else {
                errors.push(`${key}[${index}] must be a filter object at ${currentPath}`);
              }
            });
          } else {
            errors.push(`${key} must be an array at ${currentPath}`);
          }
        }
      } else {
        // Quality filters
        if (!KNOWN_QUALITIES.includes(key as KnownQuality)) {
          errors.push(`Unknown quality: ${key} at ${currentPath}`);
        }

        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          // Presence/absence filter
          if ('present' in value) {
            if (typeof (value as { present: boolean }).present !== 'boolean') {
              errors.push(`present must be a boolean at ${currentPath}`);
            }
          } else {
            errors.push(`Invalid filter value at ${currentPath}`);
          }
        } else if (typeof value === 'string') {
          // Single value - validate it's a valid quality value
          this.validateQualityValue(key, value, errors, currentPath);
        } else if (Array.isArray(value)) {
          // Multiple values
          if (value.length === 0) {
            errors.push(`Empty array not allowed at ${currentPath}`);
          }
          value.forEach((item, index) => {
            if (typeof item !== 'string') {
              errors.push(`Array item must be string at ${currentPath}[${index}]`);
            } else {
              this.validateQualityValue(key, item, errors, `${currentPath}[${index}]`);
            }
          });
        } else {
          errors.push(`Invalid filter value type at ${currentPath}`);
        }
      }
    }
  }

  /**
   * Validate a quality value
   */
  private validateQualityValue(
    quality: string,
    value: string,
    errors: string[],
    path: string
  ): void {
    // This is a simplified validation - in a real implementation,
    // you might want to validate against a more specific schema
    if (!value || typeof value !== 'string') {
      errors.push(`Invalid quality value at ${path}`);
    }
  }

  /**
   * Get a human-readable description of a filter
   */
  describeFilter(filter: QualityFilter): string {
    try {
      const expression = this.parseQualityFilter(filter);
      return this.describeExpression(expression);
    } catch (error) {
      return 'Invalid filter';
    }
  }

  /**
   * Get a human-readable description of an expression
   */
  private describeExpression(expression: FilterExpression): string {
    switch (expression.type) {
      case 'presence':
        return `${expression.quality} ${expression.present ? 'present' : 'absent'}`;

      case 'value':
        if (expression.values.length === 1) {
          return `${expression.quality}.${expression.values[0]}`;
        } else {
          return `${expression.quality} (${expression.values.join(' OR ')})`;
        }

      case 'and':
        return `(${expression.filters.map((f) => this.describeExpression(f)).join(' AND ')})`;

      case 'or':
        return `(${expression.filters.map((f) => this.describeExpression(f)).join(' OR ')})`;

      case 'not':
        return `NOT (${this.describeExpression(expression.filter)})`;

      default:
        return 'Unknown expression';
    }
  }
}

// Export a singleton instance
export const qualityFilterService = new QualityFilterService();
