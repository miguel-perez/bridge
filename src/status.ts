// Remove top-level storage imports to fix module load order
// import { getSources } from './storage.js';

export interface ProcessingError {
  type: string;
  count: number;
  lastError: string;
  lastOccurrence: string;
}

export interface StatusReport {
  sources_count: number;
  processing_errors: Array<{
    type: string;
    count: number;
    lastError: string;
  }>;
}

export class StatusMonitor {
  private errors: ProcessingError[] = [];

  async generateStatusReport(): Promise<StatusReport> {
    // Dynamic imports to fix module load order
    const { getSources } = await import('./storage.js');
    const sources = await getSources();
    return {
      sources_count: sources.length,
      processing_errors: this.errors.map(e => ({
        type: e.type,
        count: e.count,
        lastError: e.lastError,
      })),
    };
  }

  recordError(type: string, error: string): void {
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