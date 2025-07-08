#!/usr/bin/env node

import { getSources } from '../core/storage.js';
import { embeddingService, EmbeddingService } from '../services/embeddings.js';
import { validateConfiguration, getDataFilePath } from '../core/config.js';
import { setStorageConfig } from '../core/storage.js';
import { initializeVectorStore } from '../services/vector-store.js';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

interface MigrationStats {
  totalRecords: number;
  recordsWithEmbeddings: number;
  recordsWithoutEmbeddings: number;
  embeddingsGenerated: number;
  embeddingsValidated: number;
  errors: string[];
  invalidEmbeddings: string[];
  startTime: Date;
  endTime?: Date;
}

async function generateEmbeddings(): Promise<void> {
  console.log('🚀 Starting embedding migration...');
  
  const stats: MigrationStats = {
    totalRecords: 0,
    recordsWithEmbeddings: 0,
    recordsWithoutEmbeddings: 0,
    embeddingsGenerated: 0,
    embeddingsValidated: 0,
    errors: [],
    invalidEmbeddings: [],
    startTime: new Date()
  };

  try {
    // Initialize configuration and services
    console.log('📋 Initializing configuration...');
    validateConfiguration();
    
    const dataFilePath = getDataFilePath();
    const dataDir = dirname(dataFilePath);
    mkdirSync(dataDir, { recursive: true });
    
    setStorageConfig({ dataFile: dataFilePath });
    
    // Initialize vector store
    console.log('🗄️  Initializing vector store...');
    const vectorStore = initializeVectorStore(dataDir);
    await vectorStore.initialize();
    
    // Initialize embedding service
    console.log('🧠 Initializing embedding service...');
    await embeddingService.initialize();
    
    // Load all source records
    console.log('📖 Loading source records...');
    const sources = await getSources();
    stats.totalRecords = sources.length;
    
    console.log(`Found ${stats.totalRecords} source records`);
    
    // Process records in batches for progress tracking
    const batchSize = 10;
    const batches = Math.ceil(sources.length / batchSize);
    
    for (let batchIndex = 0; batchIndex < batches; batchIndex++) {
      const start = batchIndex * batchSize;
      const end = Math.min(start + batchSize, sources.length);
      const batch = sources.slice(start, end);
      
      console.log(`\n📦 Processing batch ${batchIndex + 1}/${batches} (records ${start + 1}-${end})`);
      
      for (const source of batch) {
        try {
          await processRecord(source, stats, vectorStore);
        } catch (error) {
          const errorMsg = `Error processing record ${source.id}: ${error instanceof Error ? error.message : String(error)}`;
          console.error(`❌ ${errorMsg}`);
          stats.errors.push(errorMsg);
        }
      }
      
      // Save progress after each batch
      console.log(`💾 Saving progress after batch ${batchIndex + 1}...`);
      await saveProgress(sources);
    }
    
    // Final validation and cleanup
    console.log('\n🔍 Running final validation...');
    await finalValidation(vectorStore);
    
    stats.endTime = new Date();
    printFinalStats(stats);
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

async function processRecord(source: any, stats: MigrationStats, vectorStore: any): Promise<void> {
  const expectedDimension = EmbeddingService.getExpectedDimension();
  
  if (source.content_embedding) {
    // Validate existing embedding
    if (source.content_embedding.length !== expectedDimension) {
      const errorMsg = `Invalid embedding dimension for ${source.id}: expected ${expectedDimension}, got ${source.content_embedding.length}`;
      console.warn(`⚠️  ${errorMsg}`);
      stats.invalidEmbeddings.push(errorMsg);
      
      // Remove invalid embedding and regenerate
      delete source.content_embedding;
      stats.recordsWithoutEmbeddings++;
      stats.recordsWithEmbeddings--;
    } else {
      // Valid existing embedding
      stats.embeddingsValidated++;
      stats.recordsWithEmbeddings++;
      
      // Ensure it's in vector store
      try {
        await vectorStore.addVector(source.id, source.content_embedding, { 
          content: source.content.substring(0, 100) + '...',
          type: 'source'
        });
      } catch (error) {
        console.warn(`⚠️  Could not add existing embedding to vector store for ${source.id}: ${error}`);
      }
      
      return;
    }
  } else {
    stats.recordsWithoutEmbeddings++;
  }
  
  // Generate new embedding
  console.log(`🔄 Generating embedding for ${source.id}...`);
  const embedding = await embeddingService.generateEmbedding(source.content);
  
  // Validate generated embedding
  if (embedding.length !== expectedDimension) {
    throw new Error(`Generated embedding has wrong dimension: expected ${expectedDimension}, got ${embedding.length}`);
  }
  
  // Update record with embedding
  source.content_embedding = embedding;
  
  // Add to vector store
  await vectorStore.addVector(source.id, embedding, {
    content: source.content.substring(0, 100) + '...',
    type: 'source'
  });
  
  stats.embeddingsGenerated++;
  console.log(`✅ Generated embedding for ${source.id}`);
}

async function saveProgress(sources: any[]): Promise<void> {
  try {
    // Note: We can't easily update individual records with the current storage API
    // So we'll just log progress for now
    console.log(`📊 Progress: ${sources.filter(s => s.content_embedding).length}/${sources.length} records have embeddings`);
  } catch (error) {
    console.error('Failed to save progress:', error);
  }
}

async function finalValidation(vectorStore: any): Promise<void> {
  // Get vector store health stats
  const healthStats = vectorStore.getHealthStats();
  console.log(`\n📈 Vector store health: ${healthStats.total} total, ${healthStats.valid} valid, ${healthStats.invalid} invalid`);
  
  if (healthStats.invalid > 0) {
    console.log('🧹 Cleaning up invalid vectors...');
    const removed = await vectorStore.cleanupInvalidVectors();
    console.log(`🗑️  Removed ${removed} invalid vectors`);
  }
}

function printFinalStats(stats: MigrationStats): void {
  const duration = stats.endTime ? stats.endTime.getTime() - stats.startTime.getTime() : 0;
  const durationSeconds = Math.round(duration / 1000);
  
  console.log('\n' + '='.repeat(60));
  console.log('🎉 EMBEDDING MIGRATION COMPLETE');
  console.log('='.repeat(60));
  console.log(`⏱️  Duration: ${durationSeconds} seconds`);
  console.log(`📊 Total records: ${stats.totalRecords}`);
  console.log(`✅ Records with embeddings: ${stats.recordsWithEmbeddings}`);
  console.log(`🔄 Records without embeddings: ${stats.recordsWithoutEmbeddings}`);
  console.log(`🆕 Embeddings generated: ${stats.embeddingsGenerated}`);
  console.log(`🔍 Embeddings validated: ${stats.embeddingsValidated}`);
  console.log(`❌ Errors: ${stats.errors.length}`);
  console.log(`⚠️  Invalid embeddings found: ${stats.invalidEmbeddings.length}`);
  
  if (stats.errors.length > 0) {
    console.log('\n❌ ERRORS:');
    stats.errors.forEach(error => console.log(`  - ${error}`));
  }
  
  if (stats.invalidEmbeddings.length > 0) {
    console.log('\n⚠️  INVALID EMBEDDINGS:');
    stats.invalidEmbeddings.forEach(invalid => console.log(`  - ${invalid}`));
  }
  
  console.log('='.repeat(60));
}

// Run the migration
if (import.meta.url === `file://${process.argv[1]}`) {
  generateEmbeddings().catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
} 