/**
 * Known qualities for Bridge quality signatures
 */

export const KNOWN_QUALITIES = [
  // Embodied
  'embodied',
  'embodied.thinking',
  'embodied.sensing',
  
  // Focus
  'focus',
  'focus.narrow',
  'focus.broad',
  
  // Mood
  'mood',
  'mood.open',
  'mood.closed',
  
  // Purpose
  'purpose',
  'purpose.goal',
  'purpose.wander',
  
  // Space
  'space',
  'space.here',
  'space.there',
  
  // Time
  'time',
  'time.past',
  'time.future',
  
  // Presence
  'presence',
  'presence.individual',
  'presence.collective'
] as const;

export type KnownQuality = typeof KNOWN_QUALITIES[number];

// Backward compatibility aliases (deprecated)
/** @deprecated Use KNOWN_QUALITIES instead */
export const KNOWN_DIMENSIONS = KNOWN_QUALITIES;

/** @deprecated Use KnownQuality instead */
export type KnownDimension = KnownQuality;