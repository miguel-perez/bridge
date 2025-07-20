# Bridge Operations Reference

This document provides detailed technical specifications for Bridge's MCP tool operations.

## Core Operations

### 1. `experience()` - Remember experiences

Captures meaningful moments with quality signatures for future reference.

**Signature**:
```typescript
experience(exp: ExperienceInput | ExperienceInput[]): Promise<ExperienceResult>
```

**Parameters**:
```typescript
interface ExperienceInput {
  source: string           // Raw experiential content
  experiencer: string      // Who had the experience ("Human", "Claude", etc.)
  experience?: string[]    // Quality signature - only prominent dimensions
  perspective?: string     // Grammatical perspective ("I", "we", "they")
  processing?: string      // When processed ("during", "right-after", "long-after")
  crafted?: boolean        // Whether content is refined vs raw
  reflects?: string[]      // IDs of experiences this reflects upon
}
```

**Example Usage**:
```typescript
// Single experience
await experience({
  source: "The code finally compiled after hours of debugging!",
  experiencer: "Human",
  experience: ["embodied.thinking", "mood.open", "time.past"],
  perspective: "I",
  processing: "during"
});

// Multiple experiences
await experience([
  {
    source: "Presentation was terrifying but we pulled it off",
    experiencer: "Human",
    experience: ["embodied.sensing", "purpose.goal", "presence.collective"]
  },
  {
    source: "Felt your nervousness transform into confidence when client smiled",
    experiencer: "Claude",
    experience: ["presence.collective", "embodied.sensing", "time.future"]
  }
]);
```

**Response Format**:
```
Experienced (mood.open, embodied.thinking, time.past)

From: Human
As: I
When: during conversation
Captured: just now
```

### 2. `recall()` - Search memories

Searches across all experiences using semantic similarity and quality signatures.

**Signature**:
```typescript
recall(params: RecallParams | RecallParams[]): Promise<RecallResult>
```

**Parameters**:
```typescript
interface RecallParams {
  query?: string                    // Semantic search query
  experiencer?: string              // Filter by who experienced
  experience?: string | string[]    // Filter by quality signatures
  limit?: number                    // Max results (default: 5)
  created?: string | DateRange      // Time filter
  sort?: "relevance" | "created"    // Sort order
  perspective?: string              // Filter by perspective
  processing?: string               // Filter by processing time
}
```

**Example Usage**:
```typescript
// Semantic search
await recall({ 
  query: "breakthrough moments",
  limit: 3 
});

// Quality signature search
await recall({ 
  experience: ["mood", "focus.narrow"],
  experiencer: "Human" 
});

// Time-based search
await recall({ 
  created: { start: "2024-01-01", end: "2024-01-31" },
  sort: "created" 
});
```

**Response Format**:
```
Found 3 experiences

1. "Finally understood the algorithm after drawing it out on paper..."
   embodied.thinking, mood.open, space.here
   2 days ago

2. "The moment when everything clicked and I saw the pattern..."
   focus.broad, mood.open, time.present
   1 week ago
```

### 3. `reconsider()` - Update experiences

Updates existing experiences when understanding evolves.

**Signature**:
```typescript
reconsider(update: ReconsiderInput | ReconsiderInput[]): Promise<ReconsiderResult>
```

**Parameters**:
```typescript
interface ReconsiderInput {
  id: string                  // Experience ID to update
  experience?: string[]       // Updated quality signature
  experiencer?: string        // Updated experiencer
  perspective?: string        // Updated perspective
  processing?: string         // Updated processing time
  crafted?: boolean          // Updated crafted status
  source?: string            // Updated source (rarely used)
}
```

**Example Usage**:
```typescript
// Update quality signature
await reconsider({
  id: "exp_123",
  experience: ["embodied.sensing", "mood.open", "presence.collective"]
});

// Batch updates
await reconsider([
  { id: "exp_123", processing: "long-after" },
  { id: "exp_124", experience: ["purpose.goal", "focus.narrow"] }
]);
```

### 4. `release()` - Remove experiences

Removes experiences that no longer serve the relationship.

**Signature**:
```typescript
release(params: ReleaseInput | ReleaseInput[]): Promise<ReleaseResult>
```

**Parameters**:
```typescript
interface ReleaseInput {
  id: string          // Experience ID to release
  reason?: string     // Optional reason for release
}
```

**Example Usage**:
```typescript
// Single release
await release({ 
  id: "exp_123",
  reason: "Test experience" 
});

// Batch release
await release([
  { id: "exp_123" },
  { id: "exp_124", reason: "Duplicate entry" }
]);
```

## Quality Signatures

### Dimension Reference

Each experience can include these quality dimensions when genuinely prominent:

1. **embodied** - How consciousness textures through physicality
   - `embodied.thinking` - Mental/cognitive space
   - `embodied.sensing` - Bodily sensation/emotion
   - `embodied` - Mixed thinking and sensing

2. **focus** - Direction and quality of awareness
   - `focus.narrow` - Single-pointed attention
   - `focus.broad` - Wide, inclusive awareness
   - `focus` - Shifting or balanced focus

3. **mood** - Emotional atmosphere
   - `mood.open` - Expansive, receptive
   - `mood.closed` - Contracted, defensive
   - `mood` - Transitional or mixed

4. **purpose** - Intentional direction
   - `purpose.goal` - Clear aim or objective
   - `purpose.wander` - Exploratory, curious
   - `purpose` - Mixed or uncertain

5. **space** - Spatial experience
   - `space.here` - Physically present
   - `space.there` - Mentally elsewhere
   - `space` - Distributed or transitional

6. **time** - Temporal orientation
   - `time.past` - Memory, history
   - `time.future` - Anticipation, planning
   - `time` - Present-focused or timeless

7. **presence** - Social dimension
   - `presence.individual` - Solitary experience
   - `presence.collective` - Shared, together
   - `presence` - Shifting social awareness

### Quality Selection Guidelines

- **Sparse Principle**: Only include genuinely prominent dimensions
- **Typical Range**: 1-3 qualities for simple experiences, up to 4-5 for complex
- **Mixed States**: Use base dimension when truly balanced/conflicted
- **Authenticity**: Let qualities emerge from the source text, don't force categories

## Advanced Features

### Pattern Recognition

While not directly exposed as MCP tools, Bridge uses these internally:

**Clustering Algorithm**:
- Groups experiences by shared quality signatures
- Uses Jaccard similarity (shared qualities / total unique qualities)
- No complex vector math - simple set operations

**Semantic Search**:
- 384-dimensional embeddings via Xenova transformers
- Cosine similarity for content matching
- Combined with quality signature filtering

### Reflection Experiences

Experiences can reflect on other experiences:

```typescript
await experience({
  source: "Looking back, I realize that breakthrough came from letting go of control",
  experiencer: "Human",
  experience: ["embodied.thinking", "time.past"],
  reflects: ["exp_123", "exp_124"]  // IDs of reflected experiences
});
```

This creates traceable chains of evolving understanding.

## Best Practices

### When to Capture
- Meaningful moments that shape the conversation
- Emotional transitions or breakthroughs
- Insights and realizations
- Shared experiences worth remembering

### When NOT to Capture
- Routine exchanges without experiential content
- Pure information transfer
- Mechanical responses
- Forced categorization of neutral content

### Quality Selection
1. Read the source text carefully
2. Notice which dimensions genuinely stand out
3. Don't force all dimensions to be present
4. Use mixed states when truly balanced
5. Let the text speak for itself

### Memory Hygiene
- Use `reconsider()` as understanding evolves
- `release()` test data and errors
- Keep memories relevant to the relationship
- Focus on quality over quantity

## Error Handling

All operations return structured results with error information:

```typescript
interface OperationResult {
  success: boolean
  data?: any
  error?: {
    code: string
    message: string
    details?: any
  }
}
```

Common error codes:
- `NOT_FOUND` - Experience ID doesn't exist
- `INVALID_INPUT` - Malformed parameters
- `STORAGE_ERROR` - Database issues
- `EMBEDDING_ERROR` - Semantic processing failed

## Performance Considerations

- **Batch Operations**: Use arrays for multiple operations
- **Semantic Search**: More expensive than quality filtering
- **Embedding Generation**: Happens asynchronously after capture
- **Storage**: JSON-based, suitable for thousands of experiences

---

*For integration examples and use cases, see EXPERIMENTS.md*
*For the broader vision and philosophy, see VISION.md*