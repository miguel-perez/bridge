// Helper function for flexible date validation using chrono-node
export async function validateFlexibleDate(dateString: string | undefined): Promise<boolean> {
  if (!dateString) return true; // Optional field
  try {
    const chrono = await import('chrono-node');
    const results = chrono.parse(dateString);
    return results.length > 0;
  } catch (error) {
    return false;
  }
}

// Helper function to validate and parse date with chrono-node
export async function validateAndParseDate(dateInput: string | { start: string; end: string }): Promise<{ start: string; end: string }> {
  if (typeof dateInput === 'string') {
    // Validate with chrono-node
    if (!(await validateFlexibleDate(dateInput))) {
      throw new Error(`Invalid date format: ${dateInput}. Use natural language like 'yesterday', 'last week', '2024-01-15', or ISO 8601 format.`);
    }
    // Parse with chrono-node to get actual date
    const chrono = await import('chrono-node');
    const results = chrono.parse(dateInput);
    if (results.length === 0) {
      throw new Error(`Could not parse date: ${dateInput}`);
    }
    const parsedDate = results[0].start.date().toISOString();
    return { start: parsedDate, end: parsedDate };
  } else {
    // Validate both start and end dates
    if (!(await validateFlexibleDate(dateInput.start))) {
      throw new Error(`Invalid start date format: ${dateInput.start}. Use natural language like 'yesterday', 'last week', '2024-01-15', or ISO 8601 format.`);
    }
    if (!(await validateFlexibleDate(dateInput.end))) {
      throw new Error(`Invalid end date format: ${dateInput.end}. Use natural language like 'yesterday', 'last week', '2024-01-15', or ISO 8601 format.`);
    }
    // Parse both dates
    const chrono = await import('chrono-node');
    const startResults = chrono.parse(dateInput.start);
    const endResults = chrono.parse(dateInput.end);
    if (startResults.length === 0 || endResults.length === 0) {
      throw new Error(`Could not parse date range: ${dateInput.start} to ${dateInput.end}`);
    }
    const startDate = startResults[0].start.date().toISOString();
    const endDate = endResults[0].start.date().toISOString();
    return { start: startDate, end: endDate };
  }
}

// New helper function to parse occurred date with chrono-node
export async function parseOccurredDate(occurred: string | undefined): Promise<string | undefined> {
  if (!occurred) return undefined;
  
  const chrono = await import('chrono-node');
  const results = chrono.parse(occurred);
  
  if (results.length === 0) {
    throw new Error(`Invalid occurred date: ${occurred}. Use natural language like 'yesterday', 'last week', '2024-01-15', or ISO 8601 format.`);
  }
  
  return results[0].start.date().toISOString();
} 