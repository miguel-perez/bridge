/**
 * i18n-friendly message templates for Bridge
 * 
 * Uses simple key-value structure for easy translation.
 * Avoids complex string interpolation patterns.
 */

export const Messages = {
  // Remember operation messages
  remember: {
    success: 'Remembered',
    successWithQualities: 'Remembered ({qualities})',
    batch: 'Remembered {count} experiences',
    similar: 'Similar: {content}',
    from: 'From: {experiencer}',
    as: 'As: {perspective}',
    when: 'When: {processing}',
    captured: 'Captured: {timeAgo}'
  },
  
  // Recall operation messages
  recall: {
    found: 'Found {count} experiences',
    none: 'No experiences found',
    from: 'From {timeAgo}',
    qualities: 'Qualities: {qualities}'
  },
  
  // Reconsider operation messages
  reconsider: {
    success: 'Updated',
    successWithQualities: 'Updated ({qualities})',
    batch: 'Updated {count} experiences'
  },
  
  // Release operation messages
  release: {
    success: 'Released',
    batch: 'Released {count} experiences'
  },
  
  // Time formatting
  time: {
    justNow: 'just now',
    minutesAgo: '{minutes} minutes ago',
    oneMinuteAgo: '1 minute ago',
    hoursAgo: '{hours} hours ago',
    oneHourAgo: '1 hour ago',
    yesterday: 'yesterday',
    daysAgo: '{days} days ago'
  },
  
  // Processing timing
  processing: {
    during: 'during conversation',
    rightAfter: 'right after',
    longAfter: 'long after'
  },
  
  // Quality dimensions - simplified names
  qualities: {
    'embodied': 'embodied',
    'embodied.thinking': 'thinking',
    'embodied.sensing': 'sensing',
    'focus': 'focus',
    'focus.narrow': 'narrow focus',
    'focus.broad': 'broad focus',
    'mood': 'mood',
    'mood.open': 'open',
    'mood.closed': 'closed',
    'purpose': 'purpose',
    'purpose.goal': 'goal-directed',
    'purpose.wander': 'wandering',
    'space': 'space',
    'space.here': 'here',
    'space.there': 'there',
    'time': 'time',
    'time.past': 'past',
    'time.future': 'future',
    'presence': 'presence',
    'presence.individual': 'individual',
    'presence.collective': 'collective'
  }
};

/**
 * Simple template replacement function
 * @param template - Template string with {key} placeholders
 * @param values - Object with replacement values
 * @returns String with placeholders replaced
 */
export function formatMessage(template: string, values: Record<string, any>): string {
  return template.replace(/{(\w+)}/g, (match, key) => {
    return values[key] !== undefined ? String(values[key]) : match;
  });
}

/**
 * Format a list of qualities into a simple string
 * @param qualities - Array of quality strings
 * @returns Formatted string
 */
export function formatQualityList(qualities: string[]): string {
  return qualities
    .map(q => Messages.qualities[q] || q)
    .join(', ');
}