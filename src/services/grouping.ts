import { SourceRecord, ExperienceQualities } from '../core/types.js';

// Helper to extract quality list from switchboard format
function extractQualityList(qualities?: ExperienceQualities | Record<string, string | boolean>): string[] {
  if (!qualities) return [];
  return Object.entries(qualities)
    .filter(([_, value]) => value !== false)
    .map(([key, value]) => {
      if (value === true) return key;
      return `${key}.${value}`;
    });
}

export interface GroupedResult {
  key: string | Date | string[];
  label: string;
  count: number;
  experiences: SourceRecord[];
  commonQualities?: string[];
  themeSummary?: string;
}

/**
 * Groups experiences by who experienced them
 */
export function groupByWho(experiences: SourceRecord[]): GroupedResult[] {
  const groups = new Map<string, SourceRecord[]>();

  experiences.forEach((experience) => {
    const who = experience.who || 'Unknown';
    // Handle both string and array of who
    const whoKey = Array.isArray(who) ? who.join(' & ') : who;
    if (!groups.has(whoKey)) {
      groups.set(whoKey, []);
    }
    groups.get(whoKey)!.push(experience);
  });

  return Array.from(groups.entries())
    .map(([who, expList]) => ({
      key: who,
      label: `${who} (${expList.length} experience${expList.length === 1 ? '' : 's'})`,
      count: expList.length,
      experiences: expList,
    }))
    .sort((a, b) => b.count - a.count); // Sort by count descending
}

/**
 * Groups experiences by date (YYYY-MM-DD)
 */
export function groupByDate(experiences: SourceRecord[]): GroupedResult[] {
  const groups = new Map<string, SourceRecord[]>();

  experiences.forEach((experience) => {
    const date = new Date(experience.created);
    const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD format

    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(experience);
  });

  return Array.from(groups.entries())
    .map(([dateKey, expList]) => ({
      key: new Date(dateKey),
      label: `${dateKey} (${expList.length} experience${expList.length === 1 ? '' : 's'})`,
      count: expList.length,
      experiences: expList,
    }))
    .sort((a, b) => (a.key as Date).getTime() - (b.key as Date).getTime()); // Sort chronologically
}

/**
 * Groups experiences by complete quality signature
 */
export function groupByQualitySignature(experiences: SourceRecord[]): GroupedResult[] {
  // Use smart grouping for better pattern recognition
  return groupByDominantQualities(experiences);
}

/**
 * Groups experiences by dominant qualities instead of exact signatures
 * This creates hierarchical patterns like:
 * - purpose.goal (25 experiences)
 * - + focus.narrow (18)
 * - + focus.broad (7)
 */
export function groupByDominantQualities(experiences: SourceRecord[]): GroupedResult[] {
  const primaryGroups = new Map<string, SourceRecord[]>();
  const subGroups = new Map<string, Map<string, SourceRecord[]>>();

  // Step 1: Group by most dominant quality
  experiences.forEach((experience) => {
    const qualities = extractQualityList(experience.experienceQualities);
    if (qualities.length === 0) {
      const key = 'no-qualities';
      if (!primaryGroups.has(key)) {
        primaryGroups.set(key, []);
      }
      primaryGroups.get(key)!.push(experience);
      return;
    }

    // Find the dominant quality (prioritize purpose > mood > focus > embodied > others)
    const dominantQuality = findDominantQuality(qualities);
    
    if (!primaryGroups.has(dominantQuality)) {
      primaryGroups.set(dominantQuality, []);
      subGroups.set(dominantQuality, new Map());
    }
    primaryGroups.get(dominantQuality)!.push(experience);

    // Track secondary qualities for sub-grouping
    const secondaryQualities = qualities.filter(q => q !== dominantQuality);
    if (secondaryQualities.length > 0) {
      const secondaryKey = secondaryQualities.join('+');
      const subMap = subGroups.get(dominantQuality)!;
      if (!subMap.has(secondaryKey)) {
        subMap.set(secondaryKey, []);
      }
      subMap.get(secondaryKey)!.push(experience);
    }
  });

  // Step 2: Create hierarchical groups
  const results: GroupedResult[] = [];
  
  Array.from(primaryGroups.entries())
    .sort((a, b) => b[1].length - a[1].length) // Sort by count
    .forEach(([primaryQuality, experiences]) => {
      // Add primary group
      results.push({
        key: [primaryQuality],
        label: `📁 ${primaryQuality} (${experiences.length} experiences)`,
        count: experiences.length,
        experiences: experiences,
        commonQualities: [primaryQuality],
      });

      // Add sub-groups if they exist and are significant
      const subMap = subGroups.get(primaryQuality);
      if (subMap && subMap.size > 0) {
        // Only show sub-groups with at least 2 experiences
        Array.from(subMap.entries())
          .filter(([_, exps]) => exps.length >= 2)
          .sort((a, b) => b[1].length - a[1].length)
          .slice(0, 5) // Limit to top 5 sub-groups
          .forEach(([secondaryQualities, subExperiences]) => {
            const allQualities = [primaryQuality, ...secondaryQualities.split('+')];
            results.push({
              key: allQualities,
              label: `  📂 + ${secondaryQualities} (${subExperiences.length})`,
              count: subExperiences.length,
              experiences: subExperiences,
              commonQualities: allQualities,
            });
          });
      }
    });

  return results;
}

/**
 * Finds the most dominant quality from a list
 * Prioritizes: purpose \> mood \> focus \> embodied \> others
 */
function findDominantQuality(qualities: string[]): string {
  const priorityOrder = ['purpose', 'mood', 'focus', 'embodied', 'presence', 'space', 'time'];
  
  for (const priority of priorityOrder) {
    const found = qualities.find(q => q.startsWith(priority));
    if (found) return found;
  }
  
  // Return first quality if no priority match
  return qualities[0];
}

/**
 * Groups experiences by perspective
 */
export function groupByPerspective(experiences: SourceRecord[]): GroupedResult[] {
  const groups = new Map<string, SourceRecord[]>();

  experiences.forEach((experience) => {
    const perspective = experience.perspective || 'Unknown';
    if (!groups.has(perspective)) {
      groups.set(perspective, []);
    }
    groups.get(perspective)!.push(experience);
  });

  return Array.from(groups.entries())
    .map(([perspective, expList]) => ({
      key: perspective,
      label: `${formatPerspectiveLabel(perspective)} (${expList.length} experience${expList.length === 1 ? '' : 's'})`,
      count: expList.length,
      experiences: expList,
    }))
    .sort((a, b) => b.count - a.count); // Sort by count descending
}

/**
 * Groups experiences by similarity (clustering)
 */
export async function groupBySimilarity(experiences: SourceRecord[]): Promise<GroupedResult[]> {
  // Import clustering function
  const { clusterExperiences } = await import('./clustering.js');

  const clusters = await clusterExperiences(experiences);

  return clusters.map((cluster) => ({
    key: cluster.id,
    label: cluster.summary,
    count: cluster.size,
    experiences: experiences.filter((exp) => cluster.experienceIds.includes(exp.id)),
    commonQualities: cluster.commonQualities,
    themeSummary: cluster.summary,
  }));
}

/**
 * Formats quality array into a human-readable label
 */
function _formatQualityLabel(qualities: string[]): string {
  if (qualities.length === 0) return 'No qualities';
  if (qualities.length === 1) return qualities[0];

  return `${qualities.length} qualities: ${qualities.join(', ')}`;
}

/**
 * Formats perspective into a human-readable label
 */
function formatPerspectiveLabel(perspective: string): string {
  const labels: Record<string, string> = {
    I: 'First person (I)',
    we: 'Collective (we)',
    you: 'Second person (you)',
    they: 'Third person (they)',
    Unknown: 'Unknown perspective',
  };

  return labels[perspective] || perspective;
}
