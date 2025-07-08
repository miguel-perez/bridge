/* eslint-env node */
// Test script to verify includeFullContent functionality
import { search } from './dist/services/search.js';

async function testIncludeFullContent() {
  console.log('Testing includeFullContent functionality...\n');

  // Test with default behavior (truncated snippets)
  console.log('1. Testing default behavior (truncated snippets):');
  const defaultResults = await search({ 
    query: 'test',
    limit: 1 
  });
  
  if (defaultResults.results.length > 0) {
    const snippet = defaultResults.results[0].snippet;
    console.log(`   Snippet length: ${snippet.length} characters`);
    console.log(`   Ends with "..."? ${snippet.endsWith('...')}`);
    console.log(`   Snippet preview: "${snippet.substring(0, 50)}..."`);
  }

  // Test with includeFullContent = true
  console.log('\n2. Testing with includeFullContent = true:');
  const fullContentResults = await search({ 
    query: 'test',
    limit: 1,
    includeFullContent: true
  });
  
  if (fullContentResults.results.length > 0) {
    const snippet = fullContentResults.results[0].snippet;
    console.log(`   Snippet length: ${snippet.length} characters`);
    console.log(`   Ends with "..."? ${snippet.endsWith('...')}`);
    console.log(`   Snippet preview: "${snippet.substring(0, 50)}..."`);
  }

  // Test with includeFullContent = false (explicit)
  console.log('\n3. Testing with includeFullContent = false (explicit):');
  const explicitTruncatedResults = await search({ 
    query: 'test',
    limit: 1,
    includeFullContent: false
  });
  
  if (explicitTruncatedResults.results.length > 0) {
    const snippet = explicitTruncatedResults.results[0].snippet;
    console.log(`   Snippet length: ${snippet.length} characters`);
    console.log(`   Ends with "..."? ${snippet.endsWith('...')}`);
    console.log(`   Snippet preview: "${snippet.substring(0, 50)}..."`);
  }

  console.log('\nTest completed!');
}

testIncludeFullContent().catch(console.error); 