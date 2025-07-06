// Remove top-level storage imports to fix module load order
// import { getSources, getMoments, getScenes } from './storage.js';
import { getConfig } from './config.js';

export interface ProcessingError {
  type: 'framing' | 'weaving';
  count: number;
  lastError: string;
  lastOccurrence: string;
}

export interface StatusReport {
  unframed_sources_count: number;
  unweaved_moments_count: number;
  reframed_moments_count: number;
  reframed_scenes_count: number;
  auto_weave_threshold: number;
  auto_framing_enabled: boolean;
  auto_weaving_enabled: boolean;
  processing_errors: Array<{
    type: string;
    count: number;
    lastError: string;
  }>;
}

export class StatusMonitor {
  private errors: ProcessingError[] = [];

  async generateStatusReport(): Promise<StatusReport> {
    const config = getConfig();
    
    // Dynamic imports to fix module load order
    const { getSources, getMoments, getScenes } = await import('./storage.js');
    
    // Get all records
    const sources = await getSources();
    const moments = await getMoments();
    const scenes = await getScenes();

    // Filter out reframed moments and scenes (consistent with search behavior)
    const activeMoments = moments.filter(m => !(m as any).reframedBy);
    const activeScenes = scenes.filter(s => !(s as any).reframedBy);

    // Count unframed sources (sources not referenced by any active moment)
    const framedSourceIds = new Set<string>();
    activeMoments.forEach(moment => {
      moment.sources.forEach(source => {
        framedSourceIds.add(source.sourceId);
      });
    });
    const unframedSources = sources.filter(source => !framedSourceIds.has(source.id));

    // Count unweaved moments (active moments not part of any active scene)
    const weavedMomentIds = new Set<string>();
    activeScenes.forEach(scene => {
      scene.momentIds.forEach(momentId => {
        weavedMomentIds.add(momentId);
      });
    });
    const unweavedMoments = activeMoments.filter(moment => !weavedMomentIds.has(moment.id));

    return {
      unframed_sources_count: unframedSources.length,
      unweaved_moments_count: unweavedMoments.length,
      reframed_moments_count: moments.filter(m => (m as any).reframedBy).length,
      reframed_scenes_count: scenes.filter(s => (s as any).reframedBy).length,
      auto_weave_threshold: config.openai.autoWeave.threshold,
      processing_errors: this.errors.map(e => ({
        type: e.type,
        count: e.count,
        lastError: e.lastError,
      })),
      auto_framing_enabled: config.openai.autoFrame.enabled,
      auto_weaving_enabled: config.openai.autoWeave.enabled,
    };
  }

  recordError(type: 'framing' | 'weaving', error: string): void {
    const now = new Date().toISOString();
    const existingError = this.errors.find(e => e.type === type);
    
    if (existingError) {
      existingError.count += 1;
      existingError.lastError = error;
      existingError.lastOccurrence = now;
    } else {
      this.errors.push({
        type,
        count: 1,
        lastError: error,
        lastOccurrence: now,
      });
    }
  }

  clearErrors(): void {
    this.errors = [];
  }

  getErrors(): ProcessingError[] {
    return [...this.errors];
  }
}

// Global status monitor instance
export const statusMonitor = new StatusMonitor(); 