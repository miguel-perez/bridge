/**
 * Known dimensions for Bridge quality signatures
 */

export const KNOWN_DIMENSIONS = [
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

export type KnownDimension = typeof KNOWN_DIMENSIONS[number];