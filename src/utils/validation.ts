/**
 * Validation Utilities for Bridge
 * 
 * This module provides validation functions for date parsing and other common
 * validation tasks used throughout the Bridge application.
 * 
 * @module utils/validation
 */

import { parseFlexibleDate, parseSingleDate, isValidDate } from './date-parser.js';

// ============================================================================
// DATE VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates flexible date input using centralized date parser
 * 
 * This function validates that a date string can be parsed by the chrono-node
 * parser. It returns true for undefined values (optional fields) and validates
 * actual date strings.
 * 
 * @param dateString - The date string to validate, or undefined for optional fields
 * @returns Promise that resolves to true if valid or undefined, false if invalid
 */
export async function validateFlexibleDate(dateString: string | undefined): Promise<boolean> {
  if (!dateString) return true; // Optional field
  return isValidDate(dateString);
}

/**
 * Validates and parses date input with centralized date parser
 * 
 * This function handles both single date strings and date range objects,
 * parsing them using the centralized date parser and returning standardized
 * ISO format dates.
 * 
 * @param dateInput - Single date string or date range object
 * @returns Promise that resolves to parsed date range in ISO format
 * @throws Error if date parsing fails
 */
export async function validateAndParseDate(dateInput: string | { start: string; end: string }): Promise<{ start: string; end: string }> {
  if (typeof dateInput === 'string') {
    // Parse single date with centralized date parser
    const parsedDate = parseSingleDate(dateInput);
    return { start: parsedDate, end: parsedDate };
  } else {
    // Parse date range with centralized date parser
    const dateRange = parseFlexibleDate(dateInput) as { start: string; end: string };
    return dateRange;
  }
}

/**
 * Parses occurred date with centralized date parser
 * 
 * This function is specifically for parsing the 'occurred' field from source
 * records, which represents when an experience actually happened (as opposed
 * to when it was recorded).
 * 
 * @param occurred - The occurred date string to parse, or undefined
 * @returns Promise that resolves to parsed ISO date string or undefined
 * @throws Error if date parsing fails
 */
export async function parseOccurredDate(occurred: string | undefined): Promise<string | undefined> {
  if (!occurred) return undefined;
  return parseSingleDate(occurred);
} 