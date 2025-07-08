import { parseDate } from 'chrono-node';

export interface DateRange {
  start: string; // ISO format
  end: string;   // ISO format
}

export type FlexibleDateInput = string | DateRange;

/**
 * Parse flexible date input using chrono-node
 * Handles both single dates and date ranges
 * Returns dates in ISO format
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
      throw new Error(`Invalid date: '${input}'. Please provide a valid date or time expression (e.g., 'yesterday', 'last week', '2024-01-15').`);
    }
    return parsedDate.toISOString();
  } else {
    // Date range
    const startDate = input.start ? parseDate(input.start) : null;
    const endDate = input.end ? parseDate(input.end) : null;
    
    if (input.start && !startDate) {
      throw new Error(`Invalid start date: '${input.start}'. Please provide a valid date or time expression.`);
    }
    if (input.end && !endDate) {
      throw new Error(`Invalid end date: '${input.end}'. Please provide a valid date or time expression.`);
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
 * @param dateString - Date string to parse
 * @returns Parsed date in ISO format
 * @throws Error for invalid or unparseable dates
 */
export function parseSingleDate(dateString: string): string {
  const parsedDate = parseDate(dateString);
  if (!parsedDate) {
    throw new Error(`Invalid date: '${dateString}'. Please provide a valid date or time expression (e.g., 'yesterday', 'last week', '2024-01-15').`);
  }
  return parsedDate.toISOString();
}

/**
 * Parse a date range object using chrono-node
 * 
 * @param dateRange - Date range object with start and end properties
 * @returns Parsed date range in ISO format
 * @throws Error for invalid or unparseable dates
 */
export function parseDateRange(dateRange: { start: string; end: string }): DateRange {
  const startDate = parseDate(dateRange.start);
  const endDate = parseDate(dateRange.end);
  
  if (!startDate) {
    throw new Error(`Invalid start date: '${dateRange.start}'. Please provide a valid date or time expression.`);
  }
  if (!endDate) {
    throw new Error(`Invalid end date: '${dateRange.end}'. Please provide a valid date or time expression.`);
  }
  
  return {
    start: startDate.toISOString(),
    end: endDate.toISOString()
  };
}

/**
 * Validate if a date string can be parsed by chrono-node
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