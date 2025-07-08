import { search } from '../services/search.js';
import { saveSource } from '../core/storage.js';
import { SourceRecord } from '../core/types.js';
import { setStorageConfig } from '../core/storage.js';
import path from 'path';

async function testSemanticSearch() {
  console.log('Testing semantic search with vector dimension handling...');
  
  // Use a test-specific DB file
  setStorageConfig({ dataFile: path.join(process.cwd(), 'data', 'semantic-test.json') });
  
  // Create some test records
  const testRecords: Omit<SourceRecord, 'type'>[] = [
    {
      id: 'semantic_test_1',
      content: 'I was deeply focused on solving the complex mathematical problem',
      experiencer: 'semantic_test',
      perspective: 'I',
      processing: 'during',
      contentType: 'text',
      system_time: new Date().toISOString(),
      occurred: new Date().toISOString(),
      crafted: false,
      experiential_qualities: {
        qualities: [
          {
            type: 'attentional',
    
            prominence: 0.8,
            manifestation: 'concentrated attention'
          }
        ],
        vector: {
          embodied: 0.2,
          attentional: 0.8,
          affective: 0.3,
          purposive: 0.7,
          spatial: 0.1,
          temporal: 0.4,
          intersubjective: 0.1
        }
      }
    },
    {
      id: 'semantic_test_2',
      content: 'I felt anxious and distracted during the meeting',
      experiencer: 'semantic_test',
      perspective: 'I',
      processing: 'during',
      contentType: 'text',
      system_time: new Date().toISOString(),
      occurred: new Date().toISOString(),
      crafted: false,
      experiential_qualities: {
        qualities: [
          {
            type: 'affective',
    
            prominence: 0.7,
            manifestation: 'emotional distress'
          }
        ],
        vector: {
          embodied: 0.3,
          attentional: 0.4,
          affective: 0.7,
          purposive: 0.2,
          spatial: 0.1,
          temporal: 0.3,
          intersubjective: 0.5
        }
      }
    }
  ];

  // Save test records
  for (const record of testRecords) {
    await saveSource(record);
    console.log(`Saved record: ${record.id}`);
  }

  // Test semantic search
  console.log('\nTesting semantic search...');
  try {
    const results = await search({
      semantic_query: 'focused attention and analytical thinking',
      experiencer: 'semantic_test'
    });

    console.log(`Found ${results.results.length} results:`);
    for (const result of results.results) {
      console.log(`- ${result.id}: ${result.snippet} (relevance: ${(result.relevance_score * 100).toFixed(1)}%)`);
      if (result.relevance_breakdown?.semantic_similarity) {
        console.log(`  Semantic similarity: ${(result.relevance_breakdown.semantic_similarity * 100).toFixed(1)}%`);
      }
    }
  } catch (error) {
    console.error('Semantic search failed:', error);
  }

  // Test vector similarity search
  console.log('\nTesting vector similarity search...');
  try {
    const results = await search({
      vector: {
        embodied: 0.2,
        attentional: 0.8,
        affective: 0.3,
        purposive: 0.7,
        spatial: 0.1,
        temporal: 0.4,
        intersubjective: 0.1
      },
      experiencer: 'semantic_test'
    });

    console.log(`Found ${results.results.length} results:`);
    for (const result of results.results) {
      console.log(`- ${result.id}: ${result.snippet} (relevance: ${(result.relevance_score * 100).toFixed(1)}%)`);
      if (result.relevance_breakdown?.vector_similarity) {
        console.log(`  Vector similarity: ${(result.relevance_breakdown.vector_similarity * 100).toFixed(1)}%`);
      }
    }
  } catch (error) {
    console.error('Vector similarity search failed:', error);
  }

  console.log('\nTest completed!');
}

testSemanticSearch().catch(console.error); 