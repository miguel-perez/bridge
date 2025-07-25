#!/usr/bin/env node

/**
 * Test All Providers and Stores
 *
 * This script tests each provider and store combination
 * to show what's available and working.
 */

import { config } from 'dotenv';
import { ProviderFactory } from '../services/embedding-providers/index.js';
import { QdrantVectorStore } from '../services/vector-stores/index.js';

// Load environment variables
config();

async function testProviders(): Promise<void> {
  console.log('🧪 Testing All Providers and Stores\n');

  console.log('📊 Provider Availability:');
  const availability = await ProviderFactory.checkAvailability();

  for (const [provider, available] of Object.entries(availability)) {
    console.log(`   ${provider}: ${available ? '✅ Available' : '❌ Not available'}`);

    if (available) {
      try {
        const instance = await ProviderFactory.createProvider(
          provider as keyof typeof availability
        );
        await instance.initialize();
        console.log(`      Dimensions: ${instance.getDimensions()}`);
        console.log(`      Name: ${instance.getName()}`);
      } catch (e) {
        console.log(`      Error: ${e instanceof Error ? e.message : e}`);
      }
    }
  }

  // Test Qdrant
  console.log('\n🗄️  Vector Store Availability:');

  // JSON Store (always available)
  console.log('   JSONVectorStore: ✅ Always available');

  // Qdrant Store
  const qdrant = new QdrantVectorStore();
  const qdrantAvailable = await qdrant.isAvailable();
  console.log(`   QdrantVectorStore: ${qdrantAvailable ? '✅ Available' : '❌ Not available'}`);

  if (!qdrantAvailable && process.env.QDRANT_URL) {
    console.log(`      URL: ${process.env.QDRANT_URL}`);
    console.log('      💡 Start Qdrant with: docker run -p 6333:6333 qdrant/qdrant');
  }

  // Show current configuration
  console.log('\n⚙️  Current Configuration:');
  console.log(`   Provider: ${process.env.BRIDGE_EMBEDDING_PROVIDER || 'none (default)'}`);
  console.log(`   Store: ${qdrantAvailable ? 'Qdrant' : 'JSON'} (auto-selected)`);

  // Test actual embedding generation with current provider
  console.log('\n🚀 Testing Current Setup:');
  try {
    const provider = await ProviderFactory.createFromEnvironment();
    console.log(`   Active Provider: ${provider.getName()}`);

    const testText = 'Testing embeddings with the current configuration';
    const embedding = await provider.generateEmbedding(testText);
    console.log(`   ✅ Generated ${embedding.length}-dimensional embedding`);

    // Show sample values
    const nonZero = embedding.filter((v) => v !== 0).length;
    console.log(
      `   📊 Non-zero values: ${nonZero}/${embedding.length} (${((nonZero / embedding.length) * 100).toFixed(1)}%)`
    );

    if (nonZero === 0) {
      console.log('   ⚠️  All zeros - using quality-only search (no semantic embeddings)');
    }
  } catch (e) {
    console.log(`   ❌ Error: ${e instanceof Error ? e.message : e}`);
  }

  console.log('\n✨ Provider test completed!');
}

// Run the test
testProviders().catch(console.error);
