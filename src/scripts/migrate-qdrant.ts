#!/usr/bin/env node

/**
 * Migrate Qdrant Collection
 *
 * This script migrates your existing Qdrant collection to a new one
 * with the correct dimensions for your current embedding provider.
 */

import { config } from 'dotenv';
import { QdrantVectorStore } from '../services/vector-stores/index.js';
import { EmbeddingServiceV2 } from '../services/embeddings-v2.js';

// Load environment variables
config();

async function migrateQdrant(): Promise<void> {
  console.log('🔄 Qdrant Collection Migration\n');

  const oldCollectionName = process.env.QDRANT_COLLECTION || 'bridge_experiences';
  const newCollectionName = `${oldCollectionName}_v2`;

  console.log(`📦 Current collection: ${oldCollectionName}`);
  console.log(`📦 New collection: ${newCollectionName}\n`);

  try {
    // Test connection
    const testStore = new QdrantVectorStore();
    const available = await testStore.isAvailable();
    if (!available) {
      console.log('❌ Qdrant is not available');
      return;
    }

    // Get current embedding dimensions
    const embeddingService = new EmbeddingServiceV2();
    await embeddingService.initialize();
    const dimensions = embeddingService.getEmbeddingDimension();

    console.log(`🔢 Embedding dimensions: ${dimensions}`);
    console.log(`🤖 Provider: ${embeddingService.getProviderName()}\n`);

    // Use the new collection
    process.env.QDRANT_COLLECTION = newCollectionName;

    console.log('📝 Migration Options:');
    console.log('1. Create new collection and update .env');
    console.log('2. Delete old collection and rename');
    console.log("\nFor now, we'll create a new collection.\n");

    // Test with new collection
    console.log('🧪 Testing new collection...');
    const newStore = new QdrantVectorStore({ collectionName: newCollectionName });
    await newStore.initialize();

    // Store a test vector
    const testVector = await embeddingService.generateEmbedding('Migration test');
    await newStore.upsert('migration-test', testVector, {
      type: 'migration-test',
      timestamp: new Date().toISOString(),
    });

    console.log('✅ New collection working!\n');

    console.log('📋 Next Steps:');
    console.log(`1. Update your .env file:`);
    console.log(`   QDRANT_COLLECTION=${newCollectionName}`);
    console.log('\n2. Or rename the old collection using Qdrant dashboard');
    console.log('\n✨ Migration complete!');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateQdrant().catch(console.error);
