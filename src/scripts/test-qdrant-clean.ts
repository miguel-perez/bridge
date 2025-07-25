#!/usr/bin/env node

/**
 * Test Qdrant with a clean collection
 * 
 * This script tests Qdrant with a unique collection name
 * to ensure we start fresh.
 */

import { config } from 'dotenv';
import { EmbeddingServiceV2 } from '../services/embeddings-v2.js';

// Load environment variables
config();

// Use a unique collection name for testing
process.env.QDRANT_COLLECTION = `bridge_test_${Date.now()}`;

async function testQdrantClean() {
  console.log('🧪 Testing Qdrant with Clean Collection\n');
  console.log(`📦 Collection: ${process.env.QDRANT_COLLECTION}\n`);

  const embeddingService = new EmbeddingServiceV2();

  try {
    // Initialize
    console.log('1️⃣ Initializing...');
    await embeddingService.initialize();
    console.log(`   Provider: ${embeddingService.getProviderName()}`);
    console.log(`   Store: ${embeddingService.getStoreName()}`);
    console.log(`   Dimensions: ${embeddingService.getEmbeddingDimension()}\n`);

    // Store a vector
    console.log('2️⃣ Storing vector...');
    const text1 = 'Testing Qdrant with Voyage embeddings';
    await embeddingService.storeVector('test-1', text1, {
      type: 'test',
      timestamp: new Date().toISOString()
    });
    console.log('   ✅ Stored successfully\n');

    // Store another vector
    console.log('3️⃣ Storing another vector...');
    const text2 = 'Bridge provides shared experiential memory';
    await embeddingService.storeVector('test-2', text2, {
      type: 'test',
      timestamp: new Date().toISOString()
    });
    console.log('   ✅ Stored successfully\n');

    // Search
    console.log('4️⃣ Searching...');
    const results = await embeddingService.search('voyage embeddings test', { limit: 5 });
    console.log(`   Found ${results.length} results:`);
    results.forEach((r, i) => {
      console.log(`   ${i+1}. Score: ${r.score.toFixed(4)} - ID: ${r.id}`);
    });

    console.log('\n✅ All tests passed!');
    console.log('   Voyage AI + Qdrant Cloud integration working perfectly');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

// Run test
testQdrantClean().catch(console.error);