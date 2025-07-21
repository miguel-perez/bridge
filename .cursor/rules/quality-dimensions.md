---
description: Quality Dimensions and Experiential Patterns for Bridge
---

# Quality Dimensions

## Seven Dimensional Pairs

Bridge uses seven dimensional pairs to capture the quality of experiential moments:

### 1. Embodied
- **thinking**: Mental processing, analysis, reasoning
- **sensing**: Physical sensations, bodily awareness, intuition

### 2. Focus
- **narrow**: Concentrated attention, specific focus
- **broad**: Wide awareness, peripheral attention

### 3. Mood
- **open**: Receptive, curious, accepting
- **closed**: Defensive, resistant, protective

### 4. Purpose
- **goal**: Directed, intentional, outcome-focused
- **wander**: Exploratory, meandering, process-focused

### 5. Space
- **here**: Present, immediate, local
- **there**: Distant, abstract, remote

### 6. Time
- **past**: Reflective, memory-based, historical
- **future**: Anticipatory, planning, forward-looking

### 7. Presence
- **individual**: Solo, personal, self-focused
- **collective**: Shared, group, other-focused

## Usage Patterns

### Basic Experience Capture
```typescript
experience({
  source: "I feel anxious about the presentation tomorrow",
  experience: ["embodied.sensing", "mood.closed", "time.future"]
})
```

### Pattern Realizations
```typescript
experience({
  source: "I notice I always feel anxious before things that end up going well",
  experience: ["mood.closed", "time.future"],
  reflects: ["exp-123", "exp-456"]  // Links to specific experiences
})
```

### Dimensional Queries
```typescript
// Find all anxious experiences
recall("", { filter: { experience: ["mood.closed"] } })

// Find breakthrough moments
recall("", { filter: { experience: ["mood.open", "embodied.thinking"] } })

// Find pattern realizations
recall("", { filter: { reflects: "only" } })
```

## Common Dimensional Combinations

### Anxiety Patterns
```typescript
["embodied.sensing", "mood.closed", "time.future"]
["focus.narrow", "mood.closed", "purpose.goal"]
```

### Breakthrough Moments
```typescript
["embodied.thinking", "mood.open", "focus.broad"]
["purpose.wander", "mood.open", "time.past"]
```

### Flow States
```typescript
["embodied.thinking", "focus.narrow", "purpose.goal"]
["mood.open", "space.here", "time.past"]
```

### Reflection States
```typescript
["time.past", "purpose.wander", "focus.broad"]
["embodied.thinking", "mood.open", "presence.individual"]
```

## Validation Rules

### Dimension Format
- Must follow `category.quality` pattern
- Category must be one of: embodied, focus, mood, purpose, space, time, presence
- Quality must be valid for the category
- Case sensitive, lowercase

### Valid Combinations
```typescript
// Valid
["mood.open", "embodied.thinking", "time.future"]
["focus.narrow", "purpose.goal"]

// Invalid
["mood.open", "invalid.category"]  // Unknown category
["mood.OPEN"]                      // Wrong case
["mood"]                           // Missing quality
```

## Semantic Meanings

### Embodied Dimensions
- **thinking**: Cognitive processing, mental work, analysis
- **sensing**: Physical awareness, gut feelings, bodily intuition

### Focus Dimensions
- **narrow**: Laser focus, concentrated attention, specific task
- **broad**: Wide awareness, peripheral attention, general scanning

### Mood Dimensions
- **open**: Receptive, curious, accepting of new information
- **closed**: Defensive, resistant, protective of current state

### Purpose Dimensions
- **goal**: Directed toward specific outcome, intentional action
- **wander**: Exploratory, meandering, process-oriented

### Space Dimensions
- **here**: Present location, immediate environment, local context
- **there**: Distant location, abstract space, remote context

### Time Dimensions
- **past**: Reflecting on previous experiences, memory-based
- **future**: Anticipating what's coming, planning ahead

### Presence Dimensions
- **individual**: Solo experience, personal perspective, self-focused
- **collective**: Shared experience, group perspective, other-focused

## Pattern Recognition

### Temporal Patterns
- **Past → Future**: Planning, anticipation
- **Future → Past**: Reflection, learning
- **Past → Present**: Integration, application

### Mood Transitions
- **Closed → Open**: Breakthrough, insight
- **Open → Closed**: Protection, defense
- **Closed → Closed**: Stuck patterns

### Focus Shifts
- **Narrow → Broad**: Expanding awareness
- **Broad → Narrow**: Concentrating attention
- **Narrow → Narrow**: Sustained focus

## Quality Signatures

### Definition
Quality signatures are sparse arrays of the most prominent dimensions in an experiential moment. They capture the essence of the experience without being exhaustive.

### Selection Criteria
- **Prominence**: Most noticeable qualities
- **Relevance**: Most important for understanding
- **Sparsity**: 2-4 dimensions typically sufficient
- **Accuracy**: Must reflect actual experience

### Examples
```typescript
// Anxiety before presentation
["mood.closed", "time.future", "embodied.sensing"]

// Creative breakthrough
["mood.open", "embodied.thinking", "purpose.wander"]

// Deep reflection
["time.past", "focus.broad", "presence.individual"]
```

## Integration with MCP Tools

### Experience Tool
```typescript
experience({
  source: "I feel anxious about the presentation",
  experience: ["mood.closed", "time.future", "embodied.sensing"]
})
```

### Recall Tool
```typescript
// Semantic search with dimensional filtering
recall("anxiety patterns", { 
  filter: { 
    experience: ["mood.closed"],
    reflects: "only"  // Pattern realizations only
  }
})
```

### Reconsider Tool
```typescript
reconsider("exp-123", {
  experience: ["mood.open", "embodied.thinking"]  // Updated understanding
})
``` 