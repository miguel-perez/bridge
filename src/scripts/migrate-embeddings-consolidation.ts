#!/usr/bin/env tsx

/**
 * Migration script to consolidate embeddings storage.
 * 
 * This script:
 * 1. Extracts embeddings from individual sources in bridge.json
 * 2. Loads embeddings from bridge.vectors.json
 * 3. Consolidates them into a new embeddings array in bridge.json
 * 4. Removes embedding fields from individual sources
 * 5. Deletes the separate vectors file
 */

import { promises as fs } from 'fs';
import { join, dirname, resolve } from 'path';
import { bridgeLogger } from '../utils/bridge-logger.js';

interface OldSource {
  id: string;
  content: string;
  created: string;
  perspective?: string;
  experiencer?: string;
  processing?: string;
  crafted?: boolean;
  experience?: {
    qualities: Array<{ type: string; prominence: number; manifestation: string }>;
    emoji: string;
    narrative: string;
  };
  embedding?: number[];
}

interface VectorRecord {
  id: string;
  vector: number[];
  metadata?: Record<string, unknown>;
}

interface EmbeddingRecord {
  sourceId: string;
  vector: number[];
  generated: string;
}

interface StorageData {
  sources: OldSource[];
  embeddings?: EmbeddingRecord[];
}

class EmbeddingConsolidationMigration {
  private dataFile: string;
  private vectorsFile: string;
  private backupFile: string;

  constructor() {
    const configPath = process.env.BRIDGE_FILE_PATH || 'bridge.json';
    const dataFileDir = dirname(resolve(configPath));
    const dataFileName = configPath.split('/').pop()?.split('\\').pop() || 'bridge.json';
    const baseName = dataFileName.replace('.json', '');
    
    this.dataFile = resolve(configPath);
    this.vectorsFile = join(dataFileDir, `${baseName}.vectors.json`);
    this.backupFile = join(dataFileDir, `${baseName}.backup-${Date.now()}.json`);
  }

  async migrate(): Promise<void> {
    bridgeLogger.log('🚀 Starting embedding consolidation migration');
    bridgeLogger.log(`📁 Data file: ${this.dataFile}`);
    bridgeLogger.log(`📁 Vectors file: ${this.vectorsFile}`);

    // Step 1: Create backup
    await this.createBackup();

    // Step 2: Load current data
    const data = await this.loadData();
    bridgeLogger.log(`📊 Found ${data.sources.length} sources`);

    // Step 3: Extract embeddings from sources
    const sourceEmbeddings = this.extractSourceEmbeddings(data.sources);
    bridgeLogger.log(`📊 Found ${sourceEmbeddings.length} embeddings in sources`);

    // Step 4: Load embeddings from vectors file
    const vectorEmbeddings = await this.loadVectorEmbeddings();
    bridgeLogger.log(`📊 Found ${vectorEmbeddings.length} embeddings in vectors file`);

    // Step 5: Consolidate embeddings
    const consolidatedEmbeddings = this.consolidateEmbeddings(sourceEmbeddings, vectorEmbeddings);
    bridgeLogger.log(`📊 Consolidated ${consolidatedEmbeddings.length} embeddings`);

    // Step 6: Remove embedding fields from sources
    const cleanedSources = this.cleanSources(data.sources);
    bridgeLogger.log(`📊 Cleaned ${cleanedSources.length} sources`);

    // Step 7: Save consolidated data
    const newData: StorageData = {
      sources: cleanedSources,
      embeddings: consolidatedEmbeddings
    };
    await this.saveData(newData);

    // Step 8: Delete vectors file
    await this.deleteVectorsFile();

    bridgeLogger.log('✅ Embedding consolidation migration completed successfully');
  }

  private async createBackup(): Promise<void> {
    try {
      await fs.copyFile(this.dataFile, this.backupFile);
      bridgeLogger.log(`💾 Backup created: ${this.backupFile}`);
    } catch (error) {
      bridgeLogger.warn(`⚠️ Could not create backup: ${error}`);
    }
  }

  private async loadData(): Promise<StorageData> {
    try {
      const content = await fs.readFile(this.dataFile, 'utf8');
      const data = JSON.parse(content) as StorageData;
      
      if (!data.sources || !Array.isArray(data.sources)) {
        throw new Error('Invalid data structure: sources array not found');
      }

      return data;
    } catch (error) {
      throw new Error(`Failed to load data: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private extractSourceEmbeddings(sources: OldSource[]): EmbeddingRecord[] {
    const embeddings: EmbeddingRecord[] = [];

    for (const source of sources) {
      if (source.embedding && Array.isArray(source.embedding)) {
        embeddings.push({
          sourceId: source.id,
          vector: source.embedding,
          generated: source.created // Use created time as generated time
        });
      }
    }

    return embeddings;
  }

  private async loadVectorEmbeddings(): Promise<EmbeddingRecord[]> {
    try {
      const content = await fs.readFile(this.vectorsFile, 'utf8');
      const vectors = JSON.parse(content) as VectorRecord[];

      return vectors.map(vector => ({
        sourceId: vector.id,
        vector: vector.vector,
        generated: new Date().toISOString() // Use current time as generated time
      }));
    } catch (error) {
      if (error instanceof Error && error.message.includes('ENOENT')) {
        bridgeLogger.log('📁 Vectors file not found, skipping');
        return [];
      }
      bridgeLogger.warn(`⚠️ Could not load vectors file: ${error}`);
      return [];
    }
  }

  private consolidateEmbeddings(sourceEmbeddings: EmbeddingRecord[], vectorEmbeddings: EmbeddingRecord[]): EmbeddingRecord[] {
    const consolidated = new Map<string, EmbeddingRecord>();

    // Add source embeddings first
    for (const embedding of sourceEmbeddings) {
      consolidated.set(embedding.sourceId, embedding);
    }

    // Add vector embeddings (will overwrite if duplicate)
    for (const embedding of vectorEmbeddings) {
      consolidated.set(embedding.sourceId, embedding);
    }

    return Array.from(consolidated.values());
  }

  private cleanSources(sources: OldSource[]): OldSource[] {
    return sources.map(source => {
      const cleaned = { ...source };
      delete (cleaned as any).embedding;
      return cleaned;
    });
  }

  private async saveData(data: StorageData): Promise<void> {
    try {
      const jsonString = JSON.stringify(data, null, 2);
      await fs.writeFile(this.dataFile, jsonString, 'utf8');
      bridgeLogger.log('💾 Consolidated data saved');
    } catch (error) {
      throw new Error(`Failed to save data: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async deleteVectorsFile(): Promise<void> {
    try {
      await fs.unlink(this.vectorsFile);
      bridgeLogger.log('🗑️ Vectors file deleted');
    } catch (error) {
      if (error instanceof Error && error.message.includes('ENOENT')) {
        bridgeLogger.log('📁 Vectors file already deleted');
      } else {
        bridgeLogger.warn(`⚠️ Could not delete vectors file: ${error}`);
      }
    }
  }
}

async function main(): Promise<void> {
  const migration = new EmbeddingConsolidationMigration();
  
  try {
    await migration.migrate();
  } catch (error) {
    bridgeLogger.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
main(); 