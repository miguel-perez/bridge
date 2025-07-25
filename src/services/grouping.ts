import { SourceRecord } from '../core/types.js';

export interface GroupedResult {
  key: string | Date | string[];
  label: string;
  count: number;
  experiences: SourceRecord[];
  commonQualities?: string[];
  themeSummary?: string;
}

/**
 * Groups experiences by experiencer
 */
export function groupByExperiencer(experiences: SourceRecord[]): GroupedResult[] {
  const groups = new Map<string, SourceRecord[]>();

  experiences.forEach((experience) => {
    const experiencer = experience.experiencer || 'Unknown';
    if (!groups.has(experiencer)) {
      groups.set(experiencer, []);
    }
    groups.get(experiencer)!.push(experience);
  });

  return Array.from(groups.entries())
    .map(([experiencer, expList]) => ({
      key: experiencer,
      label: experiencer,
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
      label: formatDateLabel(dateKey),
      count: expList.length,
      experiences: expList,
    }))
    .sort((a, b) => (a.key as Date).getTime() - (b.key as Date).getTime()); // Sort chronologically
}

/**
 * Groups experiences by complete quality signature
 */
export function groupByQualitySignature(experiences: SourceRecord[]): GroupedResult[] {
  const groups = new Map<string, SourceRecord[]>();

  experiences.forEach((experience) => {
    const qualities = experience.experience || [];
    const qualityKey = qualities.sort().join('|');

    if (!groups.has(qualityKey)) {
      groups.set(qualityKey, []);
    }
    groups.get(qualityKey)!.push(experience);
  });

  return Array.from(groups.entries())
    .map(([qualityKey, expList]) => ({
      key: qualityKey.split('|'),
      label: formatQualityLabel(qualityKey.split('|')),
      count: expList.length,
      experiences: expList,
      commonQualities: qualityKey.split('|'),
    }))
    .sort((a, b) => b.count - a.count); // Sort by count descending
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
      label: formatPerspectiveLabel(perspective),
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
 * Formats a date key into a human-readable label
 */
function formatDateLabel(dateKey: string): string {
  const date = new Date(dateKey);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (dateKey === today.toISOString().split('T')[0]) {
    return 'Today';
  } else if (dateKey === yesterday.toISOString().split('T')[0]) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}

/**
 * Formats quality array into a human-readable label
 */
function formatQualityLabel(qualities: string[]): string {
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
