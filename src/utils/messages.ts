/**
 * i18n-friendly message templates for Bridge
 * 
 * Uses simple key-value structure for easy translation.
 * Avoids complex string interpolation patterns.
 */

export const Messages = {
  // Experience operation messages
  experience: {
    success: 'Experienceed',
    successWithQualities: 'Experienceed ({qualities})',
    batch: 'Experienceed {count} experiences',
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
  
  // Quality dimensions - full labels preserved
  qualities: {
    'embodied': 'embodied',
    'embodied.thinking': 'embodied.thinking',
    'embodied.sensing': 'embodied.sensing',
    'focus': 'focus',
    'focus.narrow': 'focus.narrow',
    'focus.broad': 'focus.broad',
    'mood': 'mood',
    'mood.open': 'mood.open',
    'mood.closed': 'mood.closed',
    'purpose': 'purpose',
    'purpose.goal': 'purpose.goal',
    'purpose.wander': 'purpose.wander',
    'space': 'space',
    'space.here': 'space.here',
    'space.there': 'space.there',
    'time': 'time',
    'time.past': 'time.past',
    'time.future': 'time.future',
    'presence': 'presence',
    'presence.individual': 'presence.individual',
    'presence.collective': 'presence.collective'
  } as Record<string, string>
};

/**
 * Simple template replacement function
 * @param template - Template string with \{key\} placeholders
 * @param values - Object with replacement values
 * @returns String with placeholders replaced
 */
export function formatMessage(template: string, values: Record<string, unknown>): string {
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