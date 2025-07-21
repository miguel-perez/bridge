# Bridge Technical Documentation

This document covers the technical details of Bridge's operations, clearly distinguishing between current capabilities
and planned features.

## Current Operations (Implemented)

Bridge provides four core operations:

1. **experience()** - Captures meaningful moments with quality signatures
2. **recall()** - Searches experiences with semantic, dimensional, and temporal scoring
3. **reconsider()** - Updates experiences as understanding deepens
4. **release()** - Removes experiences that no longer serve

## Current recall() Functionality

The recall() operation provides sophisticated search capabilities:

### What's Working Now

```javascript
// Simple semantic search
recall("breakthrough moments")

// Pure dimensional query (exact matches only)
recall("mood.closed")

// Array dimensional query (requires ALL dimensions)
recall(["embodied.thinking", "mood.open"])

// Mixed queries (semantic + dimensional)
recall("stuck", { dimensions: ["mood.closed"] })

// Time-based filtering
recall("recent")  // or "last"

// Filtering by experiencer
recall("", { experiencer: "Human" })

// Pattern realization queries
recall("", { filter: { reflects: "only" } })  // Find all pattern realizations
recall("", { filter: { reflected_by: "exp-123" } })  // Find experiences reflected by specific insight
recall("", { filter: { reflects: ["exp-123", "exp-456"] } })  // Find insights reflecting on specific experiences

### Current Parameters

- **query**: Search query (string)
  - Text for semantic search
  - Dimension name for exact dimension matching
  - Array of dimensions for multi-dimensional filtering
  - "recent" or "last" for latest experiences

- **options**: Optional filters
  - `experiencer`: Filter by who experienced it
  - `limit`: Maximum results to return
  - `offset`: For pagination
  - `filter`: Advanced filtering options
    - `reflects`: "only" to find pattern realizations, or array of experience IDs
    - `reflected_by`: Experience ID to find experiences reflected by that insight

## Planned Features (Not Yet Implemented)

### Future: Advanced Analysis Modes

*Status: Planned - These features appear in documentation but are NOT functional*

Will group experiences by similarity to reveal patterns in different states.

### Future: Sequence Mode

*Status: Planned (See OPPORTUNITIES.md - Score: 240)*

Will analyze temporal transitions to reveal natural rhythms.

### Pattern Realizations with reflects field

*Status: Implemented (See EXP-005 in EXPERIMENTS.md)*

Enables capturing "aha" moments that link multiple experiences through the `reflects` field.

```javascript
// Create a pattern realization that reflects on multiple experiences
experience({
  source: "I notice I always feel anxious before things that end up going well",
  experience: ["mood.closed", "embodied.sensing"],
  reflects: ["exp-123", "exp-456"]  // Links to specific experiences
})

// Find all pattern realizations
recall("", { filter: { reflects: "only" } })

// Find experiences reflected by a specific insight
recall("", { filter: { reflected_by: "exp-789" } })

// Find insights that reflect on specific experiences
recall("", { filter: { reflects: ["exp-123"] } })
```

## Current Search Capabilities

### Semantic Search

Bridge uses transformer-based embeddings (all-MiniLM-L6-v2) for semantic similarity:

```javascript
// Find experiences similar in meaning
recall("feeling anxious about presentation")
// Finds semantically related experiences even without exact word matches
```

### Dimensional Filtering

Query by specific quality dimensions:

```javascript
// Single dimension - finds all mood.closed experiences
recall("mood.closed")

// Multiple dimensions - must have ALL specified dimensions
recall(["embodied.sensing", "mood.closed"])

// Base dimension matches subtypes
recall("embodied")  // Matches embodied.thinking AND embodied.sensing
```

## Current Filtering Options

### Filter by Experiencer
```javascript
recall("purpose", {
  experiencer: "Human"
})
```

### Filter by Perspective
```javascript
recall("", {
  perspective: "we"  // Find collective experiences
})
```

### Filter by Processing Time
```javascript
recall("insight", {
  processing: "long-after"  // Find retrospective insights
})
```

### Special Queries
```javascript
// Get recent experiences
recall("recent")  // or recall("last")

// Get all experiences (with optional filters)
recall("", { experiencer: "Claude" })
```

## Real-World Examples (Current Implementation)

### Finding Experiences by Mood
```javascript
const anxiousStates = await recall("mood.closed", {
  experiencer: "Human",
  limit: 10
});
// Returns experiences where mood.closed was prominent
```

### Semantic Search for Themes
```javascript
const breakthroughs = await recall("breakthrough moment finally solved", {
  sort: "relevance"
});
// Uses semantic embeddings to find conceptually similar experiences
```

### Multi-dimensional Query
```javascript
const focusedAnxiety = await recall(["focus.narrow", "mood.closed"]);
// Finds experiences that have BOTH dimensions
```

## Technical Foundation

The current recall() implementation uses:
- **Semantic embeddings** (@xenova/transformers, all-MiniLM-L6-v2 model)
- **Unified scoring** combining semantic similarity, text matching, and dimensional relevance
- **Dimensional filtering** for precise quality-based queries

## Integration with Other Operations

Bridge's operations work together as a complete system:

1. **experience()** captures moments
2. **recall()** searches and retrieves those moments
3. **reconsider()** updates understanding as it deepens
4. **release()** lets go of experiences that no longer serve

This creates a living system where memory doesn't just accumulate—it crystallizes into wisdom.