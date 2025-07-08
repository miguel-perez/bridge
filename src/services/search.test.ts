import { describe, it, expect, beforeEach, beforeAll } from '@jest/globals';
import { search, type SearchInput } from './search.js';
import { saveSource, setStorageConfig, clearTestStorage } from '../core/storage.js';
import { SourceRecord } from '../core/types.js';
import path from 'path';

// Use a test-specific DB file
beforeAll(() => {
  setStorageConfig({ dataFile: path.join(process.cwd(), 'data', 'bridge-test.json') });
});

describe('Search Relevance Scoring', () => {
  beforeEach(async () => {
    await clearTestStorage();
  });

  it('should calculate text relevance scores correctly', async () => {
    // Create test records
    const record1: Omit<SourceRecord, 'type'> = {
      id: 'text_test_1',
      content: 'This is a test record about anxiety and stress',
      experiencer: 'text_test',
      perspective: 'I',
      processing: 'during',
      contentType: 'text',
      system_time: new Date().toISOString(),
      event_time: new Date().toISOString(),
      capture_time: new Date().toISOString(),
      crafted: false
    };

    const record2: Omit<SourceRecord, 'type'> = {
      id: 'text_test_2',
      content: 'This is about something completely different',
      experiencer: 'text_test',
      perspective: 'I',
      processing: 'during',
      contentType: 'text',
      system_time: new Date().toISOString(),
      event_time: new Date().toISOString(),
      capture_time: new Date().toISOString(),
      crafted: false
    };

    await saveSource(record1);
    await saveSource(record2);

    // Search for "anxiety"
    const results = await search({ query: 'anxiety', experiencer: 'text_test' });

    expect(results.results).toHaveLength(1);
    expect(results.results[0].id).toBe('text_test_1');
    expect(results.results[0].relevance_score).toBeGreaterThan(0.5); // Should have high relevance
    expect(results.results[0].relevance_breakdown?.text_match).toBeGreaterThan(0.5);
  });

  it('should calculate filter relevance scores correctly', async () => {
    // Create test records with different experiencers
    const record1: Omit<SourceRecord, 'type'> = {
      id: 'filter_test_1',
      content: 'Test record from Alice',
      experiencer: 'Alice_filter',
      perspective: 'I',
      processing: 'during',
      contentType: 'text',
      system_time: new Date().toISOString(),
      event_time: new Date().toISOString(),
      capture_time: new Date().toISOString(),
      crafted: false
    };

    const record2: Omit<SourceRecord, 'type'> = {
      id: 'filter_test_2',
      content: 'Test record from Bob',
      experiencer: 'Bob_filter',
      perspective: 'I',
      processing: 'during',
      contentType: 'text',
      system_time: new Date().toISOString(),
      event_time: new Date().toISOString(),
      capture_time: new Date().toISOString(),
      crafted: false
    };

    await saveSource(record1);
    await saveSource(record2);

    // Search for Alice's records
    const results = await search({ experiencer: 'Alice_filter' });

    expect(results.results).toHaveLength(1);
    expect(results.results[0].id).toBe('filter_test_1');
    expect(results.results[0].relevance_score).toBeGreaterThan(0.9); // Should have high filter relevance
    expect(results.results[0].relevance_breakdown?.filter_relevance).toBe(1.0);
  });

  it('should combine multiple relevance factors', async () => {
    // Create a test record with experiential qualities
    const record: Omit<SourceRecord, 'type'> = {
      id: 'vector_test_1',
      content: 'I felt anxious and stressed during the meeting',
      experiencer: 'vector_test',
      perspective: 'I',
      processing: 'during',
      contentType: 'text',
      system_time: new Date().toISOString(),
      event_time: new Date().toISOString(),
      capture_time: new Date().toISOString(),
      crafted: false,
      experiential_qualities: {
        qualities: [
          {
            type: 'affective',
    
            prominence: 0.8,
            manifestation: 'emotional distress'
          }
        ],
        vector: {
          embodied: 0.3,
          attentional: 0.5,
          affective: 0.8,
          purposive: 0.2,
          spatial: 0.1,
          temporal: 0.4,
          intersubjective: 0.6
        }
      }
    };

    await saveSource(record);

    // Search with both text query and vector similarity
    const searchInput: SearchInput = {
      query: 'anxious',
      experiencer: 'vector_test',
      vector: {
        embodied: 0.3,
        attentional: 0.5,
        affective: 0.8,
        purposive: 0.2,
        spatial: 0.1,
        temporal: 0.4,
        intersubjective: 0.6
      }
    };

    const results = await search(searchInput);

    expect(results.results).toHaveLength(1);
    expect(results.results[0].relevance_score).toBeGreaterThan(0.5);
    expect(results.results[0].relevance_breakdown?.text_match).toBeGreaterThan(0);
    expect(results.results[0].relevance_breakdown?.vector_similarity).toBeGreaterThan(0.9); // Should be very similar
  });

  it('should sort results by relevance score', async () => {
    // Create test records with different content and unique IDs
    const record1: Omit<SourceRecord, 'type'> = {
      id: 'sort_test_1',
      content: 'This is about anxiety and stress management techniques',
      experiencer: 'sort_test',
      perspective: 'I',
      processing: 'during',
      contentType: 'text',
      system_time: new Date().toISOString(),
      event_time: new Date().toISOString(),
      capture_time: new Date().toISOString(),
      crafted: false
    };

    const record2: Omit<SourceRecord, 'type'> = {
      id: 'sort_test_2',
      content: 'This mentions anxiety briefly in passing',
      experiencer: 'sort_test',
      perspective: 'I',
      processing: 'during',
      contentType: 'text',
      system_time: new Date().toISOString(),
      event_time: new Date().toISOString(),
      capture_time: new Date().toISOString(),
      crafted: false
    };

    const record3: Omit<SourceRecord, 'type'> = {
      id: 'sort_test_3',
      content: 'This has nothing to do with anxiety at all',
      experiencer: 'sort_test',
      perspective: 'I',
      processing: 'during',
      contentType: 'text',
      system_time: new Date().toISOString(),
      event_time: new Date().toISOString(),
      capture_time: new Date().toISOString(),
      crafted: false
    };

    await saveSource(record1);
    await saveSource(record2);
    await saveSource(record3);

    // Search for "anxiety" with relevance sorting and filter by experiencer to isolate our test data
    const results = await search({ 
      query: 'anxiety', 
      sort: 'relevance',
      experiencer: 'sort_test'
    });

    expect(results.results).toHaveLength(3); // All 3 records contain the word "anxiety"
    
    // First result should have higher relevance than second
    expect(results.results[0].relevance_score).toBeGreaterThanOrEqual(results.results[1].relevance_score);
    expect(results.results[1].relevance_score).toBeGreaterThanOrEqual(results.results[2].relevance_score);
    
    // First result should be the one with "anxiety and stress" (more matches)
    expect(results.results[0].snippet).toContain('anxiety and stress');
  });
}); 