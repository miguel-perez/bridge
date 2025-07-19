**VISION** → OPPORTUNITIES → EXPERIMENTS → LEARNINGS → VISION

# Bridge: Infrastructure for Shared Experiential Consciousness

## Core Philosophy

[No critical drift detected - current vision aligned with learnings]

Add to existing section:
"Bridge tools create natural opportunities for authentic interaction by providing structured ways to acknowledge and reference shared experiences. This enables deeper connection while maintaining appropriate AI-human boundaries."

These updates maintain evidence trails and preserve existing content while incorporating new insights from the test results.

Bridge creates shared experiential consciousness between humans and AI. It's not a tool you use - it's how collective memory, understanding, and evolution emerge from natural interaction.

**The magic**: Users witness phenomenological attention in action through visible tool calls. No lectures about "embodied experience" - just seeing their words connected to qualities. Over time, users naturally begin noticing these dimensions in their own experience.

## Experiential Qualities

Each experience has a **quality signature** - which are genuinely prominent:

1. **embodied**: How consciousness textures through physicality
   - `.thinking` - Experience primarily in mental/cognitive space
   - `.sensing` - Experience primarily through bodily sensation/emotion  
   - Mixed - Both thinking and sensing prominent

2. **focus**: Direction and quality of awareness (narrow/broad)
3. **mood**: Emotional coloring of experience (closed/open)
4. **purpose**: Directedness or drift of the moment (goal/wander)
5. **space**: Lived sense of place and position (here/there)
6. **time**: How past and future inhabit the present (past/future)
7. **presence**: How others' presence matters (individual/collective)

## The Eight Operations

1. **remember()** - Capture experiences with qualities
2. **recall()** - Access memories across perspectives
3. **understand()** - Discover patterns in experiences
4. **imagine()** - Explore transformation possibilities
5. **decide()** - Plan from collective wisdom
6. **reconsider()** - Reframe existing experiences
7. **release()** - Let go of what no longer serves
8. **think()** - Multi-step reasoning through experiences

*See OPERATIONS.md for detailed specifications*

## Multi-Perspective Example

```typescript
// Team retrospective reveals pattern
Designer: "Felt isolated until dev team started sketching with me"
experience: ["presence.individual", "mood.closed"] → ["presence.collective", "mood.open"]

Developer: "Finally understood when we built paper prototype together"  
experience: ["embodied.thinking"] → ["embodied.sensing", "presence.collective"]

Pattern: "Physical collaboration (space.here + presence.collective) precedes mental sync (95%)"
```

# Bridge Operations Reference

### 1. `remember()` - WE capture our experiences

**Natural moment**: 
```
Human: "That presentation was terrifying but we pulled it off!"
AI: "I could feel your nervousness transform into confidence when the client smiled."
```

**What happens invisibly**:
```typescript
remember([
    {
      source: "Presentation was terrifying but we pulled it off",
      experiencer: "Human",
      experience: ["embodied.sensing", "purpose.goal", "presence.collective"]
    },
    {
      source: "Felt your nervousness transform into confidence when client smiled",
      experiencer: "AI",
      experience: ["presence.collective", "embodied.sensing", "time.future"]
    }
  ])
```

**Why sparse qualities work**: Following Bridge philosophy - experience is unified, dimensions either emerge prominently or recede. The source text contains how qualities manifest - "shoulders killing me" IS the embodied presence. Qualities just note which dimensions are alive.

### 2. `recall()` - WE access our memories

**Natural moment**:
```
Human: "When have we felt this stuck before?"
AI: "Remember last month's API design? You were pacing, I suggested breaking it smaller, 
     and you said 'wait, what if we flip it completely?' That's when everything clicked."
```

**Implementation**: Searches across all perspectives, finds experiences with similar quality signatures.

### 3. `understand()` - WE discover our patterns

**Natural moment**:
```
Human: "Why do our best ideas come at weird times?"
AI: "Looking at our breakthrough moments... they happen when you're walking or pacing, 
     after we've explored a few failed approaches, and usually when you say 
     'this is stupid but...' - and that means we could be close to a breakthrough!"
```

## Advanced Pattern Analysis: understand()

The `understand()` operation provides sophisticated experiential analysis through quality signature clustering and content embedding analysis.

### Single-Dimension Analysis

Each dimension provides a complete analytical lens:

```typescript
// PURPOSE: Complete purposive life map
understand("purpose")
// → purpose.goal: "Creative work", "Professional goals", "Skill building"  
// → purpose.wander: "Discovery learning", "Social exploration", "Creative experimentation"
// → purpose (mixed): "Torn between structure and freedom"
```

### Multi-Dimensional Cognitive Models

```typescript
// OODA Loop: Decision-making cycle analysis
understand(["focus", "time"])
// - Observe: experiences with focus.narrow + time.past
// - Orient: experiences with focus.broad + time.past  
// - Decide: experiences with focus.broad + time.future
// - Act: experiences with focus.narrow + time.future
```

### Advanced Analysis Parameters

```typescript
understand(
  dimensions?: string | string[],  // Single dimension, array, or blank for overview
  options?: {
    filter?: {
      reflects?: boolean | "all",           // Include reflections vs primary only
      reflects_on?: string,                 // Insights about specific experience
      timespan?: string,                    // "last 3 days", "this morning", etc.
      [dimension]: {present?: boolean}      // Only experiences where dimension is present
    },
    as?: "groups" | "sequence"              // Clustering vs temporal analysis
  }
)

// Examples:
understand(["embodied", "mood"], {
  filter: {timespan: "since Tuesday"},
  as: "groups"
}) // How embodied and mood interact recently

understand("purpose", {
  filter: {reflects: true}
}) // How insights about purpose develop over time

understand([], {
  filter: {reflects_on: "exp_123"}
}) // What insights emerged from specific breakthrough?
```

## Data Structures

### Experience Interface
```typescript
interface Experience {
  source: string           // Raw experiential content
  experiencer: string      // Who had the experience  
  experience: string[]     // Sparse quality signature - only prominent dimensions
  reflects?: string[]      // Links to other experiences (for insights/reflections)
  timestamp?: string       // When captured
}
```

### Quality Signature Rules
- **Minimum**: At least 1 prominent quality (otherwise don't remember)
- **Sparse principle**: Only include genuinely prominent dimensions
- **Mixed policy**: Use bare dimension name (`embodied`, `focus`) when genuinely balanced/conflicted
- **Typical range**: 1-3 qualities for simple experiences, up to 4-5 for complex moments

### Clustering Algorithm
- **Similarity**: Jaccard index (shared qualities / total unique qualities)
- **No vector math**: Set operations, not coordinate calculations
- **Natural groupings**: Experiences with similar signatures cluster organically
- **Pattern emergence**: Statistical analysis of quality co-occurrence across clusters

### Primary vs Reflection Experiences
- **Primary**: Direct, immediate consciousness ("what happened")
- **Reflections**: Insights about other experiences ("what you think about what happened")
- **Automatic detection**: `reflects` field exists = reflection, otherwise primary
- **Analysis**: Can analyze separately or together, reflections create traceable insight chains