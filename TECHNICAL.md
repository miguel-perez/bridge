# Bridge Technical Documentation

This document covers the technical details of Bridge's operations, with particular focus on the enhanced recall() functionality.

## Operations Overview

Bridge provides four core operations:

1. **experience()** - Captures meaningful moments with quality signatures
2. **recall()** - Searches, clusters, and sequences experiences
3. **reconsider()** - Updates experiences as understanding deepens
4. **release()** - Removes experiences that no longer serve

## Enhanced recall() Functionality

The recall() operation goes beyond simple search to provide sophisticated analysis through two distinct modes:

### Basic Usage

```javascript
// Simple semantic search
recall("breakthrough moments")

// Analyze single dimension
recall("purpose")

// Analyze dimension interactions
recall(["focus", "time"])

// Advanced analysis with options
recall("mood", { as: "sequence", timespan: "last week" })
```

### Parameters

- **query/dimensions**: What to analyze
  - String: Semantic search or single dimension analysis
  - Array: Multi-dimensional analysis
  - Empty: Analyze all experiences

- **options**: How to analyze (optional)
  - `as`: Analysis mode ("clusters", "sequence")
  - `filter`: Narrow the scope

## Planned Features (Not Yet Implemented)

### Future: Clusters Mode

*Status: Planned (See OPPORTUNITIES.md - Score: 378)*

Will group experiences by similarity to reveal patterns in different states.

### Future: Sequence Mode

*Status: Planned (See OPPORTUNITIES.md - Score: 240)*

Will analyze temporal transitions to reveal natural rhythms.

### Future: Pattern Realizations with reflects field

*Status: Highest Priority (See OPPORTUNITIES.md - Score: 560)*

Will enable capturing "aha" moments that link multiple experiences.

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