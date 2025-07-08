#!/usr/bin/env node

import { search } from '../services/search.js';

async function testDebugSearch() {
  console.log('Testing search debugging features...\n');
  
  // Enable debug mode
  process.env.BRIDGE_SEARCH_DEBUG = 'true';
  
  try {
    // Test 1: Basic search with debug info
    console.log('=== Test 1: Basic search ===');
    const result1 = await search({
      query: 'test',
      limit: 5
    });
    
    console.log(`Results: ${result1.results.length}`);
    if (result1.debug) {
      console.log('Debug info:');
      console.log(`- Total records: ${result1.debug.total_records}`);
      console.log(`- Filtered records: ${result1.debug.filtered_records}`);
      console.log(`- Vector search performed: ${result1.debug.vector_search_performed}`);
      console.log(`- Semantic search performed: ${result1.debug.semantic_search_performed}`);
      if (result1.debug.filter_breakdown) {
        console.log('- Filter breakdown:', result1.debug.filter_breakdown);
      }
    }
    
    // Test 2: Semantic search with debug info
    console.log('\n=== Test 2: Semantic search ===');
    const result2 = await search({
      semantic_query: 'experience',
      semantic_threshold: 0.5,
      limit: 3
    });
    
    console.log(`Results: ${result2.results.length}`);
    if (result2.debug) {
      console.log('Debug info:');
      console.log(`- Query embedding dimension: ${result2.debug.query_embedding_dimension}`);
      if (result2.debug.vector_store_stats) {
        console.log('- Vector store stats:', result2.debug.vector_store_stats);
      }
      if (result2.debug.similarity_scores) {
        console.log('- Top similarity scores:', result2.debug.similarity_scores.slice(0, 3));
      }
    }
    
    // Test 3: No results search to test error reporting
    console.log('\n=== Test 3: No results search ===');
    const result3 = await search({
      query: 'nonexistentquerythatwontmatchanything',
      semantic_query: 'nonexistent',
      semantic_threshold: 0.99,
      limit: 5
    });
    
    console.log(`Results: ${result3.results.length}`);
    if (result3.debug) {
      console.log('Debug info:');
      console.log(`- No results reason: ${result3.debug.no_results_reason}`);
      if (result3.debug.errors && result3.debug.errors.length > 0) {
        console.log('- Errors:', result3.debug.errors);
      }
    }
    
    console.log('\n=== Debug test completed ===');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testDebugSearch().catch(console.error); 