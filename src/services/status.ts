import { statusMonitor } from '../core/status.js';
import { getSources } from '../core/storage.js';
import type { SourceRecord } from '../core/types.js';

export interface StatusResult {
  totalSources: number;
  processingStatus: string;
  processingErrors: string;
  recentSources: SourceRecord[];
}

export class StatusService {
  async getStatus(): Promise<StatusResult> {
    const report = await statusMonitor.generateStatusReport();
    const sources = await getSources();
    
    // Add recent sources section
    const now = Date.now();
    const recentSources = sources.filter(s => {
      const created = new Date(s.created).getTime();
      return now - created < 10 * 60 * 1000; // last 10 minutes
    });

    const processingStatus = `🤖 Processing Status:\n  • Auto-processing has been removed\n  • Use search to explore your experiences`;
    
    const processingErrors = report.processing_errors.length > 0 ? 
      `❌ Processing Errors:\n${report.processing_errors.map(e => 
        `  • ${e.type}: ${e.count} error(s), last: ${e.lastError}`
      ).join('\n')}` : 
      '✅ No processing errors';

    return {
      totalSources: sources.length,
      processingStatus,
      processingErrors,
      recentSources
    };
  }
} 