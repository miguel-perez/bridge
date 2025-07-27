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
      // Type-safe assignment with proper subtype handling
      if (base === 'embodied' && (value === 'thinking' || value === 'sensing')) {
        switchboard.embodied = value;
      } else if (base === 'focus' && (value === 'narrow' || value === 'broad')) {
        switchboard.focus = value;
      } else if (base === 'mood' && (value === 'open' || value === 'closed')) {
        switchboard.mood = value;
      } else if (base === 'purpose' && (value === 'goal' || value === 'wander')) {
        switchboard.purpose = value;
      } else if (base === 'space' && (value === 'here' || value === 'there')) {
        switchboard.space = value;
      } else if (base === 'time' && (value === 'past' || value === 'future')) {
        switchboard.time = value;
      } else if (base === 'presence' && (value === 'individual' || value === 'collective')) {
        switchboard.presence = value;
      }
    } else {
      // For base qualities without subtype, set to true
      if (quality in switchboard) {
        (switchboard as unknown as Record<string, unknown>)[quality] = true;
      }
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
  embodied: false | true | 'thinking' | 'sensing',
  focus: false | true | 'narrow' | 'broad',
  mood: false | true | 'open' | 'closed',
  purpose: false | true | 'goal' | 'wander',
  space: false | true | 'here' | 'there',
  time: false | true | 'past' | 'future',
  presence: false | true | 'individual' | 'collective'
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