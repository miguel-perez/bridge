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

  // Map old format to example sentences for testing
  const sentenceMap: Record<string, string> = {
    'embodied.thinking': 'my mind processes this analytically',
    'embodied.sensing': 'feeling this in my whole body',
    'focus.narrow': 'zeroing in on one specific thing',
    'focus.broad': 'taking in everything at once',
    'mood.open': 'feeling curious and receptive',
    'mood.closed': 'shutting down emotionally',
    'purpose.goal': 'pushing toward a specific outcome',
    'purpose.wander': 'exploring without direction',
    'space.here': 'fully present in this space',
    'space.there': 'my mind is elsewhere',
    'time.past': 'memories pulling me backward',
    'time.future': 'anticipating what comes next',
    'presence.individual': 'navigating this alone',
    'presence.collective': 'feeling our shared experience',
  };

  for (const quality of qualities) {
    if (quality.includes('.')) {
      const [base, value] = quality.split('.');
      const fullKey = `${base}.${value}`;
      if (sentenceMap[fullKey] && base in switchboard) {
        const key = base as keyof ExperienceQualities;
        switchboard[key] = sentenceMap[fullKey];
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