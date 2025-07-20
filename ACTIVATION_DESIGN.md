# Bridge Activation Design

## Problem Statement

Current Bridge tools activate immediately on any input, which feels artificial. We need natural activation while respecting MCP constraints:
- Can't control system prompts (user-configured)
- Can't implement complex NLP in Bridge (deterministic tool)
- Must work within MCP's request/response pattern

## Solution: Smart Response Architecture

### Core Principles

1. **Tool Descriptions Guide Behavior**
   - Clear, detailed descriptions help AI decide when to use tools
   - Examples in descriptions show appropriate contexts
   - Parameter descriptions clarify expectations

2. **Multi-Content Responses**
   - Return both the tool result AND guidance
   - Second content item can provide context/next steps
   - Enables teaching through usage

3. **i18n-Inspired Structure**
   - Key: Value pairs for responses
   - Translatable, deterministic messages
   - No string concatenation or complex logic

## Guidance Workflow Design

### Design Principles
1. **Information over instruction** - State what happened, suggest what's possible
2. **Natural discovery** - Users learn by doing, not by being told
3. **Simple triggers** - Deterministic conditions we can reliably detect
4. **Translatable templates** - Short Key: Value pairs, no concatenation

### Guidance Moments

#### 1. Welcome (First Experience)
```typescript
trigger: isFirstExperience === true
guidance: "Capturing meaningful moments. Share what's on your mind."
```

#### 2. Pattern Awareness
```typescript
trigger: similarCount > 2
guidance: "Connects to {count} similar moments"
// Optional follow-up if user seems engaged
followup: "Try 'recall {topic}' to explore"
```

#### 3. Correction Education
```typescript
// In experience response when capturing qualities
trigger: hasEmotionalQualities === true  
guidance: "Captured as {quality}"

// In recall response showing recent
trigger: showingRecentExperiences === true
guidance: "To update: reconsider with ID"
```

#### 4. Natural Tool Chaining
```typescript
// After experience with patterns
afterExperienceWithPatterns: "Similar moments exist"

// After recall with multiple results  
afterRecallMultiple: "Patterns emerging"

// After successful reconsider
afterReconsider: "Updated. See connections with recall"
```

### What We DON'T Do

- No "smart" detection of user intent
- No analysis of conversation "depth" 
- No keyword matching for corrections
- No complex state machines
- No forced workflows

### Implementation Strategy

## 1. Enhanced Tool Descriptions

```typescript
// experience tool description
{
  name: "experience",
  title: "Capture Experiential Moment",
  description: `Capture meaningful experiential moments when:
    - Emotions or feelings are expressed (feeling anxious, excited, frustrated)
    - Realizations or insights occur (I just realized, I discovered)
    - Significant experiences are shared (breakthrough, struggle, triumph)
    - NOT for: greetings, factual questions, routine exchanges
    
    Examples of good uses:
    - "I'm feeling overwhelmed by this project" → captures emotional state
    - "I finally understood the algorithm!" → captures breakthrough moment
    - "This reminds me of my childhood" → captures meaningful connection
    
    Examples to avoid:
    - "Hello!" → Too simple, no experiential content
    - "What time is it?" → Factual query, not experiential
    - "Thanks" → Social nicety, not meaningful moment`,
  inputSchema: {
    // ... existing schema
  }
}
```

## 2. Smart Response Patterns

```typescript
// Response structure
interface BridgeResponse {
  content: [
    // Primary response - the actual tool result
    {
      type: "text",
      text: string // The experience capture confirmation
    },
    // Optional guidance - contextual help
    {
      type: "text", 
      text: string // Next steps, suggestions, or context
    }?
  ]
}
```

### Response Templates (i18n style)

```typescript
const responses = {
  // Primary responses
  experience: {
    captured: "Experienced ({qualities})",
    details: "From: {experiencer}\nAs: {perspective}\nWhen: {processing}",
    similar: "Similar: {excerpt}..."
  },
  
  // Guidance responses - minimal and informative
  guidance: {
    // First use
    welcome: "Capturing meaningful moments. Share what's on your mind.",
    
    // Pattern awareness
    patterns: "Connects to {count} similar moments",
    patternExplore: "Try 'recall {topic}' to explore",
    
    // Correction education
    capturedAs: "Captured as {quality}",
    updateHint: "To update: reconsider with ID",
    
    // Natural chaining
    similarExist: "Similar moments exist",
    patternsEmerging: "Patterns emerging",
    seeConnections: "Updated. See connections with recall"
  }
}
```

## 3. Context-Aware Responses

```typescript
// In experience-handler.ts
async handle(params: ExperienceInput): Promise<BridgeResponse> {
  const result = await this.experienceService.create(params);
  const content = [];
  
  // Primary response
  content.push({
    type: "text",
    text: formatExperienceResponse(result)
  });
  
  // Contextual guidance based on state
  const guidance = await this.selectGuidance(params, result);
  if (guidance) {
    content.push({
      type: "text", 
      text: guidance
    });
  }
  
  return { content };
}

private async selectGuidance(
  params: ExperienceInput, 
  result: ExperienceResult
): Promise<string | null> {
  // Simple, deterministic rules
  const experienceCount = await this.storage.count();
  
  if (experienceCount === 1) {
    return responses.guidance.firstExperience;
  }
  
  if (hasEmotionalQualities(params.experience)) {
    return responses.guidance.afterEmotional
      .replace("{emotion}", getEmotionType(params.experience));
  }
  
  if (result.similar && result.similar.length > 2) {
    return responses.guidance.patternDetected
      .replace("{count}", result.similar.length)
      .replace("{topic}", extractTopic(params.source));
  }
  
  // No guidance needed for routine captures
  return null;
}
```

## 4. Correction Workflows via Responses

Instead of complex NLP correction detection:

```typescript
// recall tool can handle corrections
{
  name: "recall",
  description: `Search memories OR correct recent captures:
    - "recall anxiety" → search for anxiety-related memories
    - "recall last" → show most recent experience for review
    - After recall, use reconsider to update if needed`
}

// Response includes correction hints
recallResponse.content.push({
  type: "text",
  text: "To update this memory: reconsider with new qualities or corrections"
});
```

## 5. Tool Chaining Through Guidance

```typescript
// After experience capture
if (shouldSuggestRecall(result)) {
  content.push({
    type: "text",
    text: "This connects to past experiences. Try 'recall {topic}' to see patterns."
  });
}

// After recall
if (hasMultipleResults(results)) {
  content.push({
    type: "text",
    text: "Found {count} related memories. Use 'understand patterns' when ready to analyze connections."
  });
}
```

## Benefits of This Approach

1. **MCP Native**: Works within protocol constraints
2. **Deterministic**: No complex NLP, just smart templates
3. **Educational**: Teaches users through responses
4. **Translatable**: i18n-ready structure
5. **Extensible**: Easy to add new guidance patterns

## Test Structure

### Baseline
Current Bridge without guidance
- Measure: Activation rates, correction attempts, exploration depth
- Control for comparison

### Enhanced
Bridge with guidance templates  
- Same measurements plus:
  - Guidance acknowledgment rate
  - Successful correction completion
  - Pattern exploration rate
  - Tool chaining success

### Key Metrics
1. **Activation Accuracy**
   - Appropriate activations / total opportunities
   - False positive rate (greetings, questions)

2. **Guidance Effectiveness**
   - Users who follow guidance / total guidance shown
   - Natural correction flow adoption

3. **Learning Curve**
   - Time to first successful correction
   - Independent tool chaining over time

## Next Steps

1. Update tool descriptions with detailed guidance
2. Implement multi-content response structure
3. Create response template system
4. Test with learning loop
5. Iterate based on results