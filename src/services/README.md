# Search Service

The search service provides comprehensive search functionality for experiential data with built-in debugging capabilities.

## Features

- **Text Search**: Full-text search across record content
- **Vector Similarity Search**: Search using experiential quality vectors
- **Semantic Search**: Search using content embeddings
- **Filtering**: Multiple filter types (type, experiencer, perspective, etc.)
- **Debugging**: Comprehensive debugging and logging capabilities

## Debug Mode

The search service includes extensive debugging features that can be enabled via environment variables:

### Environment Variables

- `BRIDGE_SEARCH_DEBUG=true` - Enable search debugging
- `BRIDGE_DEBUG=true` - Enable general debugging (includes search)

### Debug Information

When debug mode is enabled, search results include a `debug` object with:

```typescript
{
  search_started: string;           // ISO timestamp when search started
  total_records: number;           // Total records in storage
  filtered_records: number;        // Final number of results
  vector_search_performed: boolean; // Whether vector search was used
  semantic_search_performed: boolean; // Whether semantic search was used
  vector_store_stats?: {           // Vector store health information
    total_vectors: number;
    valid_vectors: number;
    invalid_vectors: number;
  };
  query_embedding_dimension?: number; // Dimension of generated embeddings
  similarity_scores?: Array<{      // Top similarity scores
    id: string;
    score: number;
    type: 'vector' | 'semantic';
  }>;
  filter_breakdown?: {             // Records filtered by each filter type
    type_filter?: number;
    experiencer_filter?: number;
    perspective_filter?: number;
    processing_filter?: number;
    contentType_filter?: number;
    crafted_filter?: number;
    temporal_filter?: number;
    qualities_filter?: number;
    vector_threshold_filter?: number;
    semantic_threshold_filter?: number;
  };
  no_results_reason?: string;      // Explanation if no results found
  errors?: Array<{                 // Any errors encountered
    context: string;
    message: string;
    details?: any;
  }>;
}
```

### Debug Logging

Debug mode provides detailed console logging including:

- Search start with query and filter information
- Record counts at each filtering stage
- Vector store statistics and health
- Query embedding generation details
- Similarity scores for top matches
- Filter application results
- Error details with context

### No Results Analysis

When no results are found, the debug system provides potential reasons:

- Vector store empty
- Threshold too high
- Dimension mismatch
- Text query too restrictive
- All records filtered out
- Unknown reasons

## Usage Examples

### Basic Search with Debug

```typescript
import { search } from './services/search.js';

// Enable debug mode
process.env.BRIDGE_SEARCH_DEBUG = 'true';

const result = await search({
  query: 'experience',
  limit: 10
});

if (result.debug) {
  console.log('Debug info:', result.debug);
}
```

### Semantic Search Debug

```typescript
const result = await search({
  semantic_query: 'emotional experience',
  semantic_threshold: 0.7,
  limit: 5
});

// Debug info will include:
// - Query embedding dimension
// - Vector store stats
// - Similarity scores
// - Filter breakdown
```

### Testing Debug Features

Run the debug test script:

```bash
npm run test:debug
```

This will demonstrate all debugging features with sample searches.

## Error Handling

The search service uses MCP-compliant error messaging:

- Errors are logged with context and details
- Debug mode includes error information in results
- Graceful fallbacks when semantic search fails
- Detailed error messages for troubleshooting

## Performance Considerations

- Debug mode adds minimal overhead when disabled
- Logging is conditional on debug environment variables
- Debug information is only included in results when enabled
- Vector store health checks are performed efficiently 