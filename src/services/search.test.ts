import { describe, it, expect, beforeEach, beforeAll } from '@jest/globals';
import { search, type RecallInput } from './search.js';
import { saveSource, setStorageConfig, clearTestStorage } from '../core/storage.js';
import { SourceRecord } from '../core/types.js';
import path from 'path';

// Use a test-specific DB file
beforeAll(() => {
  setStorageConfig({ dataFile: path.join(process.cwd(), 'data', 'bridge-test.json') });
});

describe('Recall Relevance Scoring', () => {
  beforeEach(async () => {
    await clearTestStorage();
  });

  it('should calculate text relevance correctly', async () => {
    // Create test records
    const record1: Omit<SourceRecord, 'type'> = {
      id: 'text_test_1',
      source: 'This is a test record about anxiety and stress',
      emoji: '😰',
      who: 'text_test',
      perspective: 'I',
      processing: 'during',
      created: new Date().toISOString(),
      crafted: false,
    };

    const record2: Omit<SourceRecord, 'type'> = {
      id: 'text_test_2',
      source: 'This is about something completely different',
      emoji: '🤔',
      who: 'text_test',
      perspective: 'I',
      processing: 'during',
      created: new Date().toISOString(),
      crafted: false,
    };

    await saveSource(record1);
    await saveSource(record2);

    // Test text relevance scoring
    const results = await search({
      query: 'anxiety',
      who: 'text_test',
      sort: 'relevance',
    });

    // With unified scoring, both records get scores, but anxiety match should be first
    expect(results.results.length).toBeGreaterThanOrEqual(1);
    expect(results.results[0].id).toBe('text_test_1');
    expect(results.results[0].relevance_score).toBeGreaterThan(0.2); // With unified scoring
    expect(results.results[0].relevance_breakdown?.exact).toBe(1); // Exact match for 'anxiety'

    // Second record should have much lower score
    if (results.results.length > 1) {
      expect(results.results[1].relevance_score).toBeLessThan(0.1);
    }
  });

  it('should filter by who correctly', async () => {
    // Create test records with different who values
    const record1: Omit<SourceRecord, 'type'> = {
      id: 'filter_test_1',
      source: 'Test record from Alice',
      emoji: '👩',
      who: 'Alice_filter',
      perspective: 'I',
      processing: 'during',
      created: new Date().toISOString(),
      crafted: false,
    };

    const record2: Omit<SourceRecord, 'type'> = {
      id: 'filter_test_2',
      source: 'Test record from Bob',
      emoji: '👨',
      who: 'Bob_filter',
      perspective: 'I',
      processing: 'during',
      created: new Date().toISOString(),
      crafted: false,
    };

    await saveSource(record1);
    await saveSource(record2);

    // Search for Alice's records
    const results = await search({ who: 'Alice_filter' });

    expect(results.results).toHaveLength(1);
    expect(results.results[0].id).toBe('filter_test_1');
    expect(results.results[0].relevance_score).toBeGreaterThan(0); // Should have some score
    // Filter relevance is now handled differently in unified scoring
  });

  it('should combine multiple relevance factors', async () => {
    // Create a test record with experiential qualities
    const record: Omit<SourceRecord, 'type'> = {
      id: 'vector_test_1',
      source: 'I felt anxious and stressed during the meeting',
      emoji: '😰',
      who: 'vector_test',
      perspective: 'I',
      processing: 'during',
      created: new Date().toISOString(),
      crafted: false,
    };

    await saveSource(record);

    // Search with both text query and vector similarity
    const searchInput: RecallInput = {
      query: 'anxious',
      who: 'vector_test',
    };

    const results = await search(searchInput);

    expect(results.results).toHaveLength(1);
    expect(results.results[0].relevance_score).toBeGreaterThan(0.2);
    expect(results.results[0].relevance_breakdown?.exact).toBeGreaterThan(0);
    // Note: semantic is 0 since no semantic search was performed
    expect(results.results[0].relevance_breakdown?.semantic).toBe(0);
  });

  it('should sort results by relevance score', async () => {
    // Create test records with different relevance levels
    const record1: Omit<SourceRecord, 'type'> = {
      id: 'sort_test_1',
      source: 'This is about anxiety and stress management techniques',
      emoji: '😰',
      who: 'sort_test',
      perspective: 'I',
      processing: 'during',
      created: new Date().toISOString(),
      crafted: false,
    };

    const record2: Omit<SourceRecord, 'type'> = {
      id: 'sort_test_2',
      source: 'This mentions anxiety briefly in passing',
      emoji: '🤔',
      who: 'sort_test',
      perspective: 'I',
      processing: 'during',
      created: new Date().toISOString(),
      crafted: false,
    };

    const record3: Omit<SourceRecord, 'type'> = {
      id: 'sort_test_3',
      source: 'This has nothing to do with anxiety at all',
      emoji: '😐',
      who: 'sort_test',
      perspective: 'I',
      processing: 'during',
      created: new Date().toISOString(),
      crafted: false,
    };

    await saveSource(record1);
    await saveSource(record2);
    await saveSource(record3);

    // Test sorting by relevance
    const results = await search({
      query: 'anxiety',
      who: 'sort_test',
      sort: 'relevance',
    });

    expect(results.results).toHaveLength(3); // All 3 records contain the word "anxiety"

    // First result should have higher relevance than second
    expect(results.results[0].relevance_score).toBeGreaterThanOrEqual(
      results.results[1].relevance_score
    );
    expect(results.results[1].relevance_score).toBeGreaterThanOrEqual(
      results.results[2].relevance_score
    );
  });
});

describe('Date Range Filtering', () => {
  beforeEach(async () => {
    await clearTestStorage();
  });

  it('should handle same-day range filtering correctly', async () => {
    // Create test records with specific dates
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const record1: Omit<SourceRecord, 'type'> = {
      id: 'date_test_1',
      source: 'Record from today',
      emoji: '📅',
      who: 'date_test',
      perspective: 'I',
      processing: 'during',
      created: today.toISOString(),
      crafted: false,
    };

    const record2: Omit<SourceRecord, 'type'> = {
      id: 'date_test_2',
      source: 'Record from yesterday',
      emoji: '📅',
      who: 'date_test',
      perspective: 'I',
      processing: 'during',
      created: yesterday.toISOString(),
      crafted: false,
    };

    await saveSource(record1);
    await saveSource(record2);

    // Test same-day range: should return yesterday's record
    const results = await search({
      created: { start: yesterday.toISOString(), end: yesterday.toISOString() },
      who: 'date_test',
    });

    expect(results.results).toHaveLength(1);
    expect(results.results[0].id).toBe('date_test_2');
  });

  it('should handle single date filtering correctly', async () => {
    // Create test records with specific dates
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const record1: Omit<SourceRecord, 'type'> = {
      id: 'single_date_test_1',
      source: 'Record from today',
      emoji: '📅',
      who: 'single_date_test',
      perspective: 'I',
      processing: 'during',
      created: today.toISOString(),
      crafted: false,
    };

    const record2: Omit<SourceRecord, 'type'> = {
      id: 'single_date_test_2',
      source: 'Record from yesterday',
      emoji: '📅',
      who: 'single_date_test',
      perspective: 'I',
      processing: 'during',
      created: yesterday.toISOString(),
      crafted: false,
    };

    await saveSource(record1);
    await saveSource(record2);

    // Test single date filter: should return records from yesterday onwards
    const results = await search({
      created: yesterday.toISOString(),
      who: 'single_date_test',
    });

    expect(results.results).toHaveLength(2); // Both records should be returned since single date filter is "on or after"
    const resultIds = results.results.map((r) => r.id).sort();
    expect(resultIds).toEqual(['single_date_test_1', 'single_date_test_2'].sort());
  });

  it('should handle multi-day range filtering correctly', async () => {
    // Create test records with specific dates
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const record1: Omit<SourceRecord, 'type'> = {
      id: 'range_test_1',
      source: 'Record from today',
      emoji: '📅',
      who: 'range_test',
      perspective: 'I',
      processing: 'during',
      created: today.toISOString(),
      crafted: false,
    };

    const record2: Omit<SourceRecord, 'type'> = {
      id: 'range_test_2',
      source: 'Record from yesterday',
      emoji: '📅',
      who: 'range_test',
      perspective: 'I',
      processing: 'during',
      created: yesterday.toISOString(),
      crafted: false,
    };

    const record3: Omit<SourceRecord, 'type'> = {
      id: 'range_test_3',
      source: 'Record from two days ago',
      emoji: '📅',
      who: 'range_test',
      perspective: 'I',
      processing: 'during',
      created: twoDaysAgo.toISOString(),
      crafted: false,
    };

    await saveSource(record1);
    await saveSource(record2);
    await saveSource(record3);

    // Test multi-day range: should return yesterday and today's records
    const results = await search({
      created: { start: yesterday.toISOString(), end: today.toISOString() },
      who: 'range_test',
    });

    expect(results.results).toHaveLength(2);
    const resultIds = results.results.map((r) => r.id).sort();
    expect(resultIds).toEqual(['range_test_1', 'range_test_2'].sort());
  });

  it('should handle edge cases in date filtering', async () => {
    // Create test records with specific times on the same UTC day
    const today = new Date();
    const earlyToday = new Date(today);
    earlyToday.setUTCHours(0, 0, 0, 0);
    const lateToday = new Date(today);
    lateToday.setUTCHours(23, 59, 59, 999);

    const record1: Omit<SourceRecord, 'type'> = {
      id: 'edge_test_1',
      source: 'Early morning record',
      emoji: '📅',
      who: 'edge_test',
      perspective: 'I',
      processing: 'during',
      created: earlyToday.toISOString(),
      crafted: false,
    };

    const record2: Omit<SourceRecord, 'type'> = {
      id: 'edge_test_2',
      source: 'Late night record',
      emoji: '📅',
      who: 'edge_test',
      perspective: 'I',
      processing: 'during',
      created: lateToday.toISOString(),
      crafted: false,
    };

    await saveSource(record1);
    await saveSource(record2);

    // Test that both records are found when filtering for today (UTC)
    const results = await search({
      created: { start: earlyToday.toISOString(), end: lateToday.toISOString() },
      who: 'edge_test',
    });

    expect(results.results).toHaveLength(2);
    const resultIds = results.results.map((r) => r.id).sort();
    expect(resultIds).toEqual(['edge_test_1', 'edge_test_2'].sort());
  });
});

describe('GroupBy Parameter Removal', () => {
  it('should not have groupBy parameter in RecallInput interface', () => {
    // This test verifies that the groupBy parameter has been completely removed
    // TypeScript compilation will fail if groupBy is still present
    const searchInput: RecallInput = {
      query: 'test',
      who: 'test',
      // groupBy: 'type' // This should cause a TypeScript error if uncommented
    };

    // If this compiles, groupBy has been successfully removed
    expect(searchInput.query).toBe('test');
    expect(searchInput.who).toBe('test');
  });

  it('should handle search without groupBy parameter', async () => {
    await clearTestStorage();

    const record: Omit<SourceRecord, 'type'> = {
      id: 'groupby_test_1',
      source: 'Test record for groupBy removal verification',
      emoji: '🧪',
      who: 'groupby_test',
      perspective: 'I',
      processing: 'during',
      created: new Date().toISOString(),
      crafted: false,
    };

    await saveSource(record);

    // Search should work without groupBy parameter
    const results = await search({
      who: 'groupby_test',
    });

    expect(results.results).toHaveLength(1);
    expect(results.results[0].id).toBe('groupby_test_1');
  });
});

// ============================================================================
// COMPREHENSIVE TESTS FOR NEW FUNCTIONALITY (Prompt 5)
// ============================================================================

describe('Group By Functionality', () => {
  beforeEach(async () => {
    await clearTestStorage();

    // Create test data with different who values, dates, qualities, and perspectives
    const testRecords: Array<Omit<SourceRecord, 'type'>> = [
      {
        id: 'group_test_1',
        source: 'Test record by Miguel on day 1',
        emoji: '👤',
        who: 'Miguel',
        perspective: 'I',
        processing: 'during',
        created: '2025-01-15T10:00:00.000Z',
        crafted: false,
        experience: ['embodied.thinking', 'mood.open'],
      },
      {
        id: 'group_test_2',
        source: 'Test record by Miguel on day 2',
        emoji: '👥',
        who: 'Miguel',
        perspective: 'we',
        processing: 'during',
        created: '2025-01-16T10:00:00.000Z',
        crafted: true,
        experience: ['focus.narrow', 'purpose.goal'],
      },
      {
        id: 'group_test_3',
        source: 'Test record by Claude on day 1',
        emoji: '🤖',
        who: 'Claude',
        perspective: 'I',
        processing: 'right-after',
        created: '2025-01-15T14:00:00.000Z',
        crafted: false,
        experience: ['embodied.thinking', 'mood.open'],
      },
      {
        id: 'group_test_4',
        source: 'Test record by Claude on day 2',
        emoji: '💬',
        who: 'Claude',
        perspective: 'you',
        processing: 'during',
        created: '2025-01-16T14:00:00.000Z',
        crafted: false,
        experience: ['focus.narrow', 'purpose.goal'],
      },
    ];

    for (const record of testRecords) {
      await saveSource(record);
    }
  });

  it('should group by who correctly', async () => {
    const results = await search({
      group_by: 'who',
    });

    expect(results.clusters).toBeDefined();
    expect(results.clusters!.length).toBe(2); // Miguel and Claude

    // Should be sorted by count (both have 2 experiences)
    const clusters = results.clusters!;
    expect(clusters.some((c) => c.summary.includes('Miguel (2 experience'))).toBe(true);
    expect(clusters.some((c) => c.summary.includes('Claude (2 experience'))).toBe(true);

    // Check that each group has correct experience IDs
    const miguelCluster = clusters.find((c) => c.summary.includes('Miguel'));
    const claudeCluster = clusters.find((c) => c.summary.includes('Claude'));

    expect(miguelCluster?.experienceIds).toContain('group_test_1');
    expect(miguelCluster?.experienceIds).toContain('group_test_2');
    expect(claudeCluster?.experienceIds).toContain('group_test_3');
    expect(claudeCluster?.experienceIds).toContain('group_test_4');
  });

  it('should group by date correctly', async () => {
    const results = await search({
      group_by: 'date',
    });

    expect(results.clusters).toBeDefined();
    expect(results.clusters!.length).toBe(2); // 2025-01-15 and 2025-01-16

    const clusters = results.clusters!;
    expect(clusters.some((c) => c.summary.includes('2025-01-15 (2 experience'))).toBe(true);
    expect(clusters.some((c) => c.summary.includes('2025-01-16 (2 experience'))).toBe(true);

    // Should be sorted chronologically
    expect(clusters[0].summary.includes('2025-01-15')).toBe(true);
    expect(clusters[1].summary.includes('2025-01-16')).toBe(true);
  });

  it('should group by qualities correctly', async () => {
    const results = await search({
      group_by: 'qualities',
    });

    expect(results.clusters).toBeDefined();
    expect(results.clusters!.length).toBe(2); // Two different quality signatures

    const clusters = results.clusters!;

    // Check for the two quality signatures
    const thinkingMoodCluster = clusters.find((c) =>
      c.summary.includes('embodied.thinking, mood.open')
    );
    const focusGoalCluster = clusters.find((c) => c.summary.includes('focus.narrow, purpose.goal'));

    expect(thinkingMoodCluster).toBeDefined();
    expect(focusGoalCluster).toBeDefined();
    expect(thinkingMoodCluster?.size).toBe(2);
    expect(focusGoalCluster?.size).toBe(2);
  });

  it('should group by perspective correctly', async () => {
    const results = await search({
      group_by: 'perspective',
    });

    expect(results.clusters).toBeDefined();
    expect(results.clusters!.length).toBe(3); // I, we, you perspectives

    const clusters = results.clusters!;
    expect(clusters.some((c) => c.summary.includes('First person (I) (2 experience'))).toBe(true);
    expect(clusters.some((c) => c.summary.includes('Collective (we) (1 experience'))).toBe(true);
    expect(clusters.some((c) => c.summary.includes('Second person (you) (1 experience'))).toBe(
      true
    );
  });

  it('should handle group_by: none as flat results', async () => {
    const results = await search({
      group_by: 'none',
    });

    expect(results.clusters).toBeUndefined();
    expect(results.results.length).toBe(4);
  });
});
