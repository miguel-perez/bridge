/**
 * Tests for Embedding Search Service
 */

import { findSimilarByEmbedding, getSourcesByIds } from './embedding-search.js';
import * as storage from '../core/storage.js';
import type { Source, EmbeddingRecord } from '../core/types.js';

// Mock storage functions
jest.mock('../core/storage.js');

describe('Embedding Search Service', () => {
  let mockGetAllEmbeddings: jest.MockedFunction<typeof storage.getAllEmbeddings>;
  let mockGetAllRecords: jest.MockedFunction<typeof storage.getAllRecords>;

  // Helper function to create mock embedding records
  const createMockEmbedding = (sourceId: string, vector: number[]): EmbeddingRecord => ({
    sourceId,
    vector,
    generated: new Date().toISOString()
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockGetAllEmbeddings = storage.getAllEmbeddings as jest.MockedFunction<typeof storage.getAllEmbeddings>;
    mockGetAllRecords = storage.getAllRecords as jest.MockedFunction<typeof storage.getAllRecords>;
  });

  describe('cosineSimilarity', () => {
    // Since cosineSimilarity is not exported, we test it through findSimilarByEmbedding
    it('should calculate correct similarity through findSimilarByEmbedding', async () => {
      const queryEmbedding = [1, 0, 0];
      const mockEmbeddings = [
        createMockEmbedding('id1', [1, 0, 0]), // Perfect match
        createMockEmbedding('id2', [0, 1, 0]), // Orthogonal
        createMockEmbedding('id3', [0.707, 0.707, 0]), // 45 degrees
      ];

      mockGetAllEmbeddings.mockResolvedValue(mockEmbeddings);

      const results = await findSimilarByEmbedding(queryEmbedding);

      expect(results).toHaveLength(3);
      expect(results[0]).toEqual({ sourceId: 'id1', similarity: 1 });
      expect(results[1].sourceId).toBe('id3');
      expect(results[1].similarity).toBeCloseTo(0.707, 3);
      expect(results[2]).toEqual({ sourceId: 'id2', similarity: 0 });
    });

    it('should handle zero vectors correctly', async () => {
      const queryEmbedding = [0, 0, 0];
      const mockEmbeddings = [
        createMockEmbedding('id1', [1, 0, 0]),
        createMockEmbedding('id2', [0, 0, 0]), // Zero vector
      ];

      mockGetAllEmbeddings.mockResolvedValue(mockEmbeddings);

      const results = await findSimilarByEmbedding(queryEmbedding);

      // Zero vector similarity should be 0
      expect(results).toHaveLength(2);
      expect(results.every(r => r.similarity === 0)).toBe(true);
    });
  });

  describe('findSimilarByEmbedding', () => {
    it('should return empty array when no embeddings exist', async () => {
      mockGetAllEmbeddings.mockResolvedValue([]);

      const results = await findSimilarByEmbedding([1, 0, 0]);

      expect(results).toEqual([]);
    });

    it('should return empty array when embeddings is null', async () => {
      mockGetAllEmbeddings.mockResolvedValue(null as unknown as EmbeddingRecord[]);

      const results = await findSimilarByEmbedding([1, 0, 0]);

      expect(results).toEqual([]);
    });

    it('should skip embeddings with missing vectors', async () => {
      const mockEmbeddings = [
        createMockEmbedding('id1', [1, 0, 0]),
        { sourceId: 'id2', generated: new Date().toISOString() } as EmbeddingRecord, // Missing vector
        { sourceId: 'id3', vector: null as unknown as number[], generated: new Date().toISOString() } as EmbeddingRecord, // Null vector
      ];

      mockGetAllEmbeddings.mockResolvedValue(mockEmbeddings);

      const results = await findSimilarByEmbedding([1, 0, 0]);

      expect(results).toHaveLength(1);
      expect(results[0].sourceId).toBe('id1');
    });

    it('should skip embeddings with dimension mismatch', async () => {
      const queryEmbedding = [1, 0, 0]; // 3D
      const mockEmbeddings = [
        { sourceId: 'id1', vector: [1, 0, 0] }, // Correct dimension
        { sourceId: 'id2', vector: [1, 0] }, // 2D - mismatch
        { sourceId: 'id3', vector: [1, 0, 0, 0] }, // 4D - mismatch
      ];

      mockGetAllEmbeddings.mockResolvedValue(mockEmbeddings);

      const results = await findSimilarByEmbedding(queryEmbedding);

      expect(results).toHaveLength(1);
      expect(results[0].sourceId).toBe('id1');
    });

    it('should apply threshold correctly', async () => {
      const mockEmbeddings = [
        { sourceId: 'id1', vector: [1, 0, 0] }, // similarity = 1
        { sourceId: 'id2', vector: [0.8, 0.6, 0] }, // similarity ≈ 0.8
        { sourceId: 'id3', vector: [0.6, 0.8, 0] }, // similarity ≈ 0.6
        { sourceId: 'id4', vector: [0, 1, 0] }, // similarity = 0
      ];

      mockGetAllEmbeddings.mockResolvedValue(mockEmbeddings);

      const results = await findSimilarByEmbedding([1, 0, 0], 50, 0.7);

      expect(results).toHaveLength(2);
      expect(results[0].sourceId).toBe('id1');
      expect(results[1].sourceId).toBe('id2');
    });

    it('should apply limit correctly', async () => {
      const mockEmbeddings = Array.from({ length: 10 }, (_, i) => ({
        sourceId: `id${i}`,
        vector: [1, 0, 0],
      }));

      mockGetAllEmbeddings.mockResolvedValue(mockEmbeddings);

      const results = await findSimilarByEmbedding([1, 0, 0], 3);

      expect(results).toHaveLength(3);
    });

    it('should sort by similarity descending', async () => {
      const mockEmbeddings = [
        { sourceId: 'low', vector: [0.6, 0.8, 0] }, // Lower similarity
        { sourceId: 'high', vector: [1, 0, 0] }, // Highest similarity
        { sourceId: 'medium', vector: [0.8, 0.6, 0] }, // Medium similarity
      ];

      mockGetAllEmbeddings.mockResolvedValue(mockEmbeddings);

      const results = await findSimilarByEmbedding([1, 0, 0]);

      expect(results[0].sourceId).toBe('high');
      expect(results[1].sourceId).toBe('medium');
      expect(results[2].sourceId).toBe('low');
      expect(results[0].similarity).toBeGreaterThan(results[1].similarity);
      expect(results[1].similarity).toBeGreaterThan(results[2].similarity);
    });

    it('should handle errors gracefully', async () => {
      const mockEmbeddings = [
        { sourceId: 'id1', vector: [1, 0, 0] },
        { sourceId: 'id2', vector: [NaN, 0, 0] }, // Invalid vector
        { sourceId: 'id3', vector: [0.5, 0.5, 0.5] },
      ];

      mockGetAllEmbeddings.mockResolvedValue(mockEmbeddings);

      const results = await findSimilarByEmbedding([1, 0, 0]);

      // Should skip the invalid vector
      expect(results).toHaveLength(2);
      expect(results.map(r => r.sourceId)).toEqual(['id1', 'id3']);
    });

    it('should use default parameters', async () => {
      const mockEmbeddings = Array.from({ length: 100 }, (_, i) => ({
        sourceId: `id${i}`,
        vector: [1 - i * 0.01, i * 0.01, 0], // Gradually decreasing similarity
      }));

      mockGetAllEmbeddings.mockResolvedValue(mockEmbeddings);

      const results = await findSimilarByEmbedding([1, 0, 0]);

      // Default limit is 50
      expect(results).toHaveLength(50);
      // Default threshold is 0.0 - all should be included up to limit
      expect(results[0].sourceId).toBe('id0');
      expect(results[49].sourceId).toBe('id49');
    });
  });

  describe('getSourcesByIds', () => {
    const mockSources: Source[] = [
      {
        id: 'id1',
        source: 'Source 1',
        created: '2025-01-01T00:00:00Z',
        experiencer: 'User1',
        experience: ['mood.open']
      },
      {
        id: 'id2',
        source: 'Source 2',
        created: '2025-01-02T00:00:00Z',
        experiencer: 'User2',
        experience: ['mood.closed']
      },
      {
        id: 'id3',
        source: 'Source 3',
        created: '2025-01-03T00:00:00Z',
        experiencer: 'User3',
        experience: ['embodied.thinking']
      }
    ];

    it('should return sources matching given IDs', async () => {
      mockGetAllRecords.mockResolvedValue(mockSources);

      const results = await getSourcesByIds(['id1', 'id3']);

      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('id1');
      expect(results[1].id).toBe('id3');
    });

    it('should return empty array for non-existent IDs', async () => {
      mockGetAllRecords.mockResolvedValue(mockSources);

      const results = await getSourcesByIds(['nonexistent1', 'nonexistent2']);

      expect(results).toEqual([]);
    });

    it('should handle empty ID array', async () => {
      mockGetAllRecords.mockResolvedValue(mockSources);

      const results = await getSourcesByIds([]);

      expect(results).toEqual([]);
    });

    it('should handle duplicate IDs in input', async () => {
      mockGetAllRecords.mockResolvedValue(mockSources);

      const results = await getSourcesByIds(['id1', 'id1', 'id2']);

      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('id1');
      expect(results[1].id).toBe('id2');
    });

    it('should preserve order from storage', async () => {
      mockGetAllRecords.mockResolvedValue(mockSources);

      const results = await getSourcesByIds(['id3', 'id1', 'id2']);

      // Order should match storage order, not input order
      expect(results[0].id).toBe('id1');
      expect(results[1].id).toBe('id2');
      expect(results[2].id).toBe('id3');
    });

    it('should handle mixed valid and invalid IDs', async () => {
      mockGetAllRecords.mockResolvedValue(mockSources);

      const results = await getSourcesByIds(['id1', 'invalid', 'id3']);

      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('id1');
      expect(results[1].id).toBe('id3');
    });
  });
});