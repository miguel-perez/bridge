#!/usr/bin/env node

/**
 * Test Vector Enhancement with Real Providers
 * 
 * This script tests the progressive vector enhancement architecture
 * with actual API keys and services.
 */

import { config } from 'dotenv';
import { EmbeddingServiceV2 } from '../services/embeddings-v2.js';
import { bridgeLogger } from '../utils/bridge-logger.js';

// Load environment variables
config();

async function testVectorEnhancement() {
  console.log('🚀 Testing Vector Enhancement Architecture\n');

  // Create service instance
  const embeddingService = new EmbeddingServiceV2();

  try {
    // Initialize service
    console.log('📊 Initializing embedding service...');
    await embeddingService.initialize();
    
    console.log(`✅ Provider: ${embeddingService.getProviderName()}`);
    console.log(`✅ Store: ${embeddingService.getStoreName()}`);
    console.log(`✅ Dimensions: ${embeddingService.getEmbeddingDimension()}\n`);

    // Test embedding generation
    console.log('🧪 Testing embedding generation...');
    const testText = 'I feel excited about testing the new vector enhancement architecture';
    const embedding = await embeddingService.generateEmbedding(testText);
    
    console.log(`✅ Generated embedding with ${embedding.length} dimensions`);
    console.log(`   First 5 values: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]\n`);

    // Test vector storage
    console.log('💾 Testing vector storage...');
    await embeddingService.storeVector(
      'test-exp-001',
      testText,
      {
        experiencer: 'Test User',
        qualities: ['mood.open', 'embodied.sensing'],
        timestamp: new Date().toISOString()
      }
    );
    console.log('✅ Vector stored successfully\n');

    // Test vector search
    console.log('🔍 Testing vector search...');
    const searchQuery = 'feeling enthusiastic about new features';
    const results = await embeddingService.search(searchQuery, { limit: 5 });
    
    console.log(`✅ Found ${results.length} results`);
    results.forEach((result, i) => {
      console.log(`   ${i + 1}. Score: ${result.score.toFixed(4)} - ID: ${result.id}`);
    });

    // Check provider availability
    console.log('\n🔧 Checking all provider availability...');
    const availability = await embeddingService.checkProviderAvailability();
    
    Object.entries(availability).forEach(([provider, available]) => {
      console.log(`   ${provider}: ${available ? '✅ Available' : '❌ Not available'}`);
    });

    // Show configuration
    console.log('\n📋 Current Configuration:');
    console.log(`   BRIDGE_EMBEDDING_PROVIDER: ${process.env.BRIDGE_EMBEDDING_PROVIDER || 'none'}`);
    console.log(`   VOYAGE_API_KEY: ${process.env.VOYAGE_API_KEY ? '✅ Set' : '❌ Not set'}`);
    console.log(`   OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Not set'}`);
    console.log(`   QDRANT_URL: ${process.env.QDRANT_URL || 'Not set'}`);
    console.log(`   QDRANT_COLLECTION: ${process.env.QDRANT_COLLECTION || 'bridge_experiences'}`);

    console.log('\n✨ Vector enhancement test completed successfully!');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testVectorEnhancement().catch(console.error);