import { getSources, saveSource } from '../core/storage.js';
import { embeddingService } from '../services/embeddings.js';
import { getVectorStore } from '../services/vector-store.js';
import type { SourceRecord } from '../core/types.js';

export interface MigrationStats {
  total: number;
  processed: number;
  skipped: number;
  failed: number;
  errors: string[];
}

export async function migrateExistingRecords(): Promise<MigrationStats> {
  const stats: MigrationStats = {
    total: 0,
    processed: 0,
    skipped: 0,
    failed: 0,
    errors: []
  };

  try {
    // Initialize services
    await embeddingService.initialize();
    await getVectorStore().initialize();

    // Get all existing sources
    const sources = await getSources();
    stats.total = sources.length;

    console.log(`Found ${sources.length} sources to process`);

    for (const source of sources) {
      try {
        // Skip if already has embedding
        if (source.content_embedding) {
          stats.skipped++;
          continue;
        }

        // Generate embedding
        const embedding = await embeddingService.generateEmbedding(source.content);
        
        // Update source with embedding
        const updatedSource: SourceRecord = {
          ...source,
          content_embedding: embedding
        };

        // Save updated source
        await saveSource(updatedSource);

        // Add to vector store
        await getVectorStore().addVector(source.id, embedding);

        stats.processed++;
        
        if (stats.processed % 10 === 0) {
          console.log(`Processed ${stats.processed}/${stats.total} sources`);
        }

      } catch (error) {
        stats.failed++;
        const errorMsg = `Failed to process source ${source.id}: ${error instanceof Error ? error.message : String(error)}`;
        stats.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    console.log(`Migration completed: ${stats.processed} processed, ${stats.skipped} skipped, ${stats.failed} failed`);
    return stats;

  } catch (error) {
    const errorMsg = `Migration failed: ${error instanceof Error ? error.message : String(error)}`;
    stats.errors.push(errorMsg);
    console.error(errorMsg);
    return stats;
  }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateExistingRecords()
    .then(stats => {
      console.log('Migration stats:', stats);
      process.exit(stats.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
} 