#!/usr/bin/env node

/**
 * Reset Qdrant Collection
 *
 * This script deletes and recreates the Qdrant collection
 * to ensure it has the correct dimensions.
 */

import { config } from 'dotenv';
import { QdrantVectorStore } from '../services/vector-stores/index.js';

// Load environment variables
config();

async function resetQdrant(): Promise<void> {
  console.log('🔄 Resetting Qdrant Collection\n');

  const qdrant = new QdrantVectorStore();

  try {
    // Check if available
    const available = await qdrant.isAvailable();
    if (!available) {
      console.log('❌ Qdrant is not available');
      console.log(`   URL: ${process.env.QDRANT_URL}`);
      return;
    }

    console.log('✅ Connected to Qdrant');
    console.log(`   URL: ${process.env.QDRANT_URL}`);
    console.log(`   Collection: ${process.env.QDRANT_COLLECTION || 'bridge_experiences'}\n`);

    // Initialize to ensure we have the collection name
    await qdrant.initialize();

    console.log('🗑️  Deleting existing collection...');
    try {
      await qdrant.deleteCollection();
      console.log('✅ Collection deleted');
    } catch (e) {
      console.log('ℹ️  Collection might not exist, continuing...');
    }

    console.log('\n✨ Qdrant collection reset complete!');
    console.log('   The collection will be created with the correct dimensions');
    console.log('   when the first vector is stored.');
  } catch (error) {
    console.error('\n❌ Reset failed:', error);
    process.exit(1);
  }
}

// Run the reset
resetQdrant().catch(console.error);
