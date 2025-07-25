import { BaseVectorStore } from './base-store.js';
import { SearchResult } from '../embedding-providers/types.js';
import { bridgeLogger } from '../../utils/bridge-logger.js';

interface QdrantPoint {
  id: string | number;
  vector: number[];
  payload: Record<string, any>;
}

interface PointIdMapping {
  bridgeId: string;
  qdrantId: string;
}

interface QdrantSearchResult {
  id: string | number;
  score: number;
  payload?: Record<string, any>;
}

/**
 * Qdrant vector store implementation
 * @remarks
 * Provides high-performance vector search using Qdrant database.
 * Supports both local and cloud deployments.
 */
export class QdrantVectorStore extends BaseVectorStore {
  private url: string;
  private apiKey?: string;
  private collectionName: string;
  private dimensions?: number;
  protected initialized = false;

  constructor(config: {
    url?: string;
    apiKey?: string;
    collectionName?: string;
  } = {}) {
    super();
    this.url = config.url || process.env.QDRANT_URL || 'http://localhost:6333';
    this.apiKey = config.apiKey || process.env.QDRANT_API_KEY;
    this.collectionName = config.collectionName || 'bridge_experiences';
  }

  getName(): string {
    return `QdrantVectorStore-${this.collectionName}`;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Check if collection exists
      const collectionsResponse = await this.request('/collections');
      const collections = collectionsResponse.result?.collections || [];
      
      const collectionExists = collections.some(
        (col: any) => col.name === this.collectionName
      );

      if (!collectionExists) {
        // Don't create collection yet - wait until we know the vector dimensions
        bridgeLogger.log(`Qdrant collection '${this.collectionName}' will be created on first use`);
      } else {
        // Get collection info to determine dimensions
        const collectionInfo = await this.request(`/collections/${this.collectionName}`);
        this.dimensions = collectionInfo.result?.config?.params?.vectors?.size;
      }

      this.initialized = true;
      bridgeLogger.log(`Qdrant collection '${this.collectionName}' ready`);
    } catch (error) {
      throw new Error(
        `Failed to initialize Qdrant: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async createCollection(dimensions?: number): Promise<void> {
    // Use provided dimensions or default to 384 (for compatibility)
    const vectorSize = dimensions || this.dimensions || 384;
    
    const config = {
      vectors: {
        size: vectorSize,
        distance: 'Cosine',
      },
    };

    await this.request(`/collections/${this.collectionName}`, 'PUT', config);
    this.dimensions = vectorSize;
  }

  async upsert(id: string, vector: number[], metadata: Record<string, any>): Promise<void> {
    this.validateId(id);
    this.validateVector(vector);

    if (!this.initialized) {
      await this.initialize();
    }

    // If collection doesn't have dimensions set, create it with vector dimensions
    if (!this.dimensions && vector.length > 0) {
      await this.createCollection(vector.length);
    }

    // Generate a UUID v4 for Qdrant while storing the original Bridge ID in payload
    const qdrantId = this.generateUUID();

    const point: QdrantPoint = {
      id: qdrantId,
      vector,
      payload: {
        ...metadata,
        bridgeId: id,  // Store original Bridge ID
        updated: new Date().toISOString(),
      },
    };

    await this.request(`/collections/${this.collectionName}/points`, 'PUT', {
      points: [point],
    });
  }

  async search(
    vector: number[],
    options?: { filter?: Record<string, any>; limit?: number }
  ): Promise<SearchResult[]> {
    this.validateVector(vector);

    if (!this.initialized) {
      await this.initialize();
    }

    // Ensure collection exists with correct dimensions
    if (!this.dimensions) {
      await this.createCollection(vector.length);
    }

    const searchParams: any = {
      vector,
      limit: options?.limit || 10,
      with_payload: true,
    };

    // Convert simple filter to Qdrant filter format
    if (options?.filter) {
      searchParams.filter = this.convertFilter(options.filter);
    }

    const response = await this.request(
      `/collections/${this.collectionName}/points/search`,
      'POST',
      searchParams
    );

    return (response.result || []).map((result: QdrantSearchResult) => ({
      id: result.payload?.bridgeId || String(result.id),  // Return original Bridge ID
      score: result.score,
      metadata: result.payload || {},
    }));
  }

  async delete(id: string): Promise<void> {
    this.validateId(id);

    if (!this.initialized) {
      await this.initialize();
    }

    // First, search for the point with the Bridge ID
    const searchResult = await this.request(
      `/collections/${this.collectionName}/points/scroll`,
      'POST',
      {
        filter: {
          must: [
            {
              key: 'bridgeId',
              match: { value: id }
            }
          ]
        },
        limit: 1
      }
    );

    if (searchResult.result?.points?.length > 0) {
      const qdrantId = searchResult.result.points[0].id;
      await this.request(`/collections/${this.collectionName}/points/delete`, 'POST', {
        points: [qdrantId],
      });
    }
  }

  async deleteCollection(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    await this.request(`/collections/${this.collectionName}`, 'DELETE');
    this.initialized = false;
  }

  private convertFilter(filter: Record<string, any>): any {
    // Convert simple key-value filter to Qdrant filter format
    const conditions: any[] = [];

    for (const [key, value] of Object.entries(filter)) {
      if (value === null || value === undefined) continue;

      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        conditions.push({
          key,
          match: { value },
        });
      } else if (Array.isArray(value)) {
        // Handle array values as "any of"
        conditions.push({
          key,
          match: { any: value },
        });
      }
    }

    return conditions.length > 0 ? { must: conditions } : undefined;
  }

  private async request(
    path: string,
    method: string = 'GET',
    body?: any
  ): Promise<any> {
    const url = `${this.url}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['api-key'] = this.apiKey;
    }

    const options: RequestInit = {
      method,
      headers,
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        `Qdrant request failed: ${response.status} ${response.statusText} - ${
          data.status?.error || data.error || 'Unknown error'
        }`
      );
    }

    return data;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await this.request('/');
      return response.title === 'qdrant - vector search engine';
    } catch {
      return false;
    }
  }

  /**
   * Generate a UUID v4 for Qdrant compatibility
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}