import { parseFlexibleDate, parseSingleDate, isValidDate } from './date-parser.js';

// Helper function for flexible date validation using centralized date parser
export async function validateFlexibleDate(dateString: string | undefined): Promise<boolean> {
  if (!dateString) return true; // Optional field
  return isValidDate(dateString);
}

// Helper function to validate and parse date with centralized date parser
export async function validateAndParseDate(dateInput: string | { start: string; end: string }): Promise<{ start: string; end: string }> {
  if (typeof dateInput === 'string') {
    // Parse with centralized date parser
    const parsedDate = parseSingleDate(dateInput);
    return { start: parsedDate, end: parsedDate };
  } else {
    // Parse date range with centralized date parser
    const dateRange = parseFlexibleDate(dateInput) as { start: string; end: string };
    return dateRange;
  }
}

// Helper function to parse occurred date with centralized date parser
export async function parseOccurredDate(occurred: string | undefined): Promise<string | undefined> {
  if (!occurred) return undefined;
  return parseSingleDate(occurred);
} 