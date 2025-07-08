/**
 * Date Parser Utilities for Bridge
 * 
 * This module provides flexible date parsing using chrono-node, supporting
 * natural language date expressions and date ranges. All dates are returned
 * in ISO format for consistency.
 * 
 * @module utils/date-parser
 */

import { parseDate } from 'chrono-node';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Date range interface for start and end dates
 */
export interface DateRange {
  start: string; // ISO format
  end: string;   // ISO format
}

/**
 * Flexible date input type - can be a string or date range object
 */
export type FlexibleDateInput = string | DateRange;

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_DATE_ERROR_MESSAGE = 'Please provide a valid date or time expression (e.g., "yesterday", "last week", "2024-01-15").';

// ============================================================================
// CORE DATE PARSING FUNCTIONS
// ============================================================================

/**
 * Parse flexible date input using chrono-node
 * 
 * Handles both single dates and date ranges, returning dates in ISO format.
 * Supports natural language expressions like "yesterday", "last week", etc.
 * 
 * @param input - Date string or date range object
 * @returns Parsed date(s) in ISO format
 * @throws Error for invalid or unparseable dates
 */
export function parseFlexibleDate(input: FlexibleDateInput): string | DateRange {
  if (typeof input === 'string') {
    // Single date
    const parsedDate = parseDate(input);
    if (!parsedDate) {
      throw new Error(`Invalid date: '${input}'. ${DEFAULT_DATE_ERROR_MESSAGE}`);
    }
    return parsedDate.toISOString();
  } else {
    // Date range
    const startDate = input.start ? parseDate(input.start) : null;
    const endDate = input.end ? parseDate(input.end) : null;
    
    if (input.start && !startDate) {
      throw new Error(`Invalid start date: '${input.start}'. ${DEFAULT_DATE_ERROR_MESSAGE}`);
    }
    if (input.end && !endDate) {
      throw new Error(`Invalid end date: '${input.end}'. ${DEFAULT_DATE_ERROR_MESSAGE}`);
    }
    
    return {
      start: startDate?.toISOString() || '',
      end: endDate?.toISOString() || ''
    };
  }
}

/**
 * Parse a single date string using chrono-node
 * 
 * Converts natural language date expressions to ISO format dates.
 * 
 * @param dateString - Date string to parse
 * @returns Parsed date in ISO format
 * @throws Error for invalid or unparseable dates
 */
export function parseSingleDate(dateString: string): string {
  const parsedDate = parseDate(dateString);
  if (!parsedDate) {
    throw new Error(`Invalid date: '${dateString}'. ${DEFAULT_DATE_ERROR_MESSAGE}`);
  }
  return parsedDate.toISOString();
}

/**
 * Parse a date range object using chrono-node
 * 
 * Parses both start and end dates in a date range object, returning
 * them in ISO format.
 * 
 * @param dateRange - Date range object with start and end properties
 * @returns Parsed date range in ISO format
 * @throws Error for invalid or unparseable dates
 */
export function parseDateRange(dateRange: { start: string; end: string }): DateRange {
  const startDate = parseDate(dateRange.start);
  const endDate = parseDate(dateRange.end);
  
  if (!startDate) {
    throw new Error(`Invalid start date: '${dateRange.start}'. ${DEFAULT_DATE_ERROR_MESSAGE}`);
  }
  if (!endDate) {
    throw new Error(`Invalid end date: '${dateRange.end}'. ${DEFAULT_DATE_ERROR_MESSAGE}`);
  }
  
  return {
    start: startDate.toISOString(),
    end: endDate.toISOString()
  };
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate if a date string can be parsed by chrono-node
 * 
 * This function safely tests whether a date string can be parsed without
 * throwing an error. Useful for validation before attempting to parse.
 * 
 * @param dateString - Date string to validate
 * @returns True if the date can be parsed, false otherwise
 */
export function isValidDate(dateString: string): boolean {
  try {
    const parsedDate = parseDate(dateString);
    return parsedDate !== null;
  } catch {
    return false;
  }
} 