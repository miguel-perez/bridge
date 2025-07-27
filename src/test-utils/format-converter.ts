/**
 * Helper to convert old array format to new switchboard format for tests
 */

import type { ExperienceQualities } from '../core/types.js';

/**
 * Converts array format quality strings to switchboard format
 * @param qualities - Array of quality strings (e.g., ['embodied.thinking', 'mood.open'])
 * @returns ExperienceQualities object in switchboard format
 */
export function convertArrayToSwitchboard(qualities: string[]): ExperienceQualities {
  const switchboard: ExperienceQualities = {
    embodied: false,
    focus: false,
    mood: false,
    purpose: false,
    space: false,
    time: false,
    presence: false,
  };

  for (const quality of qualities) {
    if (quality.includes('.')) {
      const [base, value] = quality.split('.');
      // With the new sentence-based schema, we can't convert from the old format
      // This function is deprecated and should not be used
      // Return false for all qualities since we can't do proper conversion
    }
  }

  return switchboard;
}

/**
 * Convert human format (2-4 qualities) to switchboard
 */
export function humanQualities(...qualities: string[]): ExperienceQualities {
  if (qualities.length < 2 || qualities.length > 4) {
    throw new Error('Humans should capture 2-4 qualities');
  }
  return convertArrayToSwitchboard(qualities);
}

/**
 * Convert AI format (all 7 qualities) to switchboard
 */
export function aiQualities(
  embodied: string | false,
  focus: string | false,
  mood: string | false,
  purpose: string | false,
  space: string | false,
  time: string | false,
  presence: string | false
): ExperienceQualities {
  return {
    embodied,
    focus,
    mood,
    purpose,
    space,
    time,
    presence,
  };
}