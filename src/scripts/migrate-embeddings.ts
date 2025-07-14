#!/usr/bin/env tsx
/**
 * Migration script to update existing embeddings to enhanced format
 * 
 * This script:
 * 1. Loads all existing sources from bridge.json
 * 2. Generates new enhanced embeddings for each source
 * 3. Updates the embeddings in bridge.json
 * 4. Rebuilds the vector store with new embeddings
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { EnhancedEmbeddingService } from '../services/enhanced-embedding.js';
import { VectorStore } from '../services/vector-store.js';
import { SourceRecord } from '../core/types.js';

// Progress bar helper
function showProgress(current: number, total: number, startTime: number) {
  const percent = Math.round((current / total) * 100);
  const elapsed = Date.now() - startTime;
  const rate = current / (elapsed / 1000);
  const remaining = (total - current) / rate;
  
  const barLength = 40;
  const filled = Math.round((current / total) * barLength);
  const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
  
  process.stdout.write(`\r[${bar}] ${percent}% | ${current}/${total} | ${rate.toFixed(1)}/s | ${formatTime(remaining)} remaining`);
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${minutes}m ${secs}s`;
}

async function migrateEmbeddings() {
  console.log('🔄 Enhanced Embeddings Migration Tool\n');
  
  // Load configuration
  const bridgeFile = process.env.BRIDGE_FILE_PATH || join(process.cwd(), 'bridge.json');
  const vectorsFile = join(process.cwd(), 'data', 'vectors.json');
  
  if (!existsSync(bridgeFile)) {
    console.error('❌ Error: bridge.json not found at', bridgeFile);
    process.exit(1);
  }
  
  // Load existing data
  console.log('📂 Loading existing data...');
  const data = JSON.parse(readFileSync(bridgeFile, 'utf-8'));
  const sources: SourceRecord[] = data.sources || [];
  
  if (sources.length === 0) {
    console.log('✅ No sources to migrate');
    return;
  }
  
  console.log(`📊 Found ${sources.length} sources to migrate\n`);
  
  // Show comparison of old vs new format
  const enhancedService = new EnhancedEmbeddingService();
  if (sources.length > 0) {
    console.log('📝 Example format comparison:');
    const example = enhancedService.compareFormats(sources[0]);
    console.log('\nOld format:');
    console.log(example.old_format.slice(0, 150) + '...');
    console.log('\nNew format:');
    console.log(example.new_format.slice(0, 150) + '...');
    console.log('\nImprovements:');
    example.improvements.forEach(imp => console.log(`  ✨ ${imp}`));
    console.log();
  }
  
  // Ask for confirmation
  console.log('⚠️  This will update all embeddings in your bridge.json file.');
  console.log('   A backup will be created at bridge.json.backup\n');
  console.log('Press Enter to continue or Ctrl+C to cancel...');
  
  await new Promise(resolve => {
    process.stdin.once('data', resolve);
  });
  
  // Create backup
  console.log('\n💾 Creating backup...');
  writeFileSync(bridgeFile + '.backup', JSON.stringify(data, null, 2));
  console.log('✅ Backup saved to', bridgeFile + '.backup');
  
  // Generate new embeddings
  console.log('\n🔄 Generating enhanced embeddings...\n');
  
  const startTime = Date.now();
  const results = await enhancedService.batchUpdateEmbeddings(
    sources,
    (completed, total) => showProgress(completed, total, startTime)
  );
  
  console.log('\n\n✅ Generated embeddings for', results.length, 'sources');
  
  // Update sources with new embeddings
  const updatedSources = sources.map(source => {
    const result = results.find(r => r.id === source.id);
    if (result) {
      return {
        ...source,
        embedding: result.embedding
      };
    }
    return source;
  });
  
  // Save updated data
  console.log('\n💾 Saving updated data...');
  const updatedData = {
    ...data,
    sources: updatedSources
  };
  writeFileSync(bridgeFile, JSON.stringify(updatedData, null, 2));
  console.log('✅ Updated bridge.json');
  
  // Rebuild vector store
  console.log('\n🔄 Rebuilding vector store...');
  const vectorStore = new VectorStore(vectorsFile);
  
  // Clear existing vectors
  vectorStore.clear();
  
  // Add all vectors with new embeddings
  const vectorData = updatedSources
    .filter(source => source.embedding && source.embedding.length === 384)
    .map(source => ({
      id: source.id,
      vector: source.embedding!
    }));
  
  const addResult = vectorStore.addVectors(vectorData);
  console.log(`✅ Added ${addResult.added} vectors (${addResult.rejected} rejected)`);
  
  // Save vector store
  await vectorStore.saveToDisk();
  console.log('✅ Saved vector store to', vectorsFile);
  
  // Validate
  const validation = await vectorStore.validateVectors();
  console.log(`\n✅ Validation: ${validation.valid} valid, ${validation.invalid} invalid vectors`);
  
  if (validation.invalid > 0) {
    console.log('\n⚠️  Some vectors are invalid. Details:');
    validation.details.forEach((detail: any) => {
      console.log(`  - ${detail.id || detail}: ${detail.issue || 'Invalid vector'}`);
    });
  }
  
  // Summary
  const endTime = Date.now();
  const totalTime = (endTime - startTime) / 1000;
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ MIGRATION COMPLETE');
  console.log('='.repeat(60));
  console.log(`📊 Migrated ${results.length} embeddings in ${totalTime.toFixed(1)}s`);
  console.log(`⚡ Average: ${(results.length / totalTime).toFixed(1)} embeddings/second`);
  console.log('\n🎯 Next steps:');
  console.log('  1. Test the system to ensure everything works correctly');
  console.log('  2. Delete the backup file once confirmed: rm', bridgeFile + '.backup');
  console.log('  3. Run pattern discovery to see improved results');
}

// Run migration
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateEmbeddings().catch(error => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
}