# Bridge Experiments

This document outlines experiments designed to work with our learning loop. Each experiment includes specific test scenarios that allow Opus to evaluate results and suggest improvements.

## Experiment Structure

Each experiment follows this format for learning loop compatibility:
1. **Test Scenarios**: Specific conversation flows to test
2. **Measurable Outcomes**: What Opus should evaluate
3. **Implementation Changes**: Code modifications to test
4. **Learning Questions**: What insights we seek

## 🔴 Active Experiments (Immediate Sprint)

### 1. Activation Threshold Testing

**Hypothesis**: Implementing meaning-based thresholds will make Bridge tool usage feel more natural and reduce artificial activations.
**Opportunity**: #1 in OPPORTUNITIES.md (Score: 648)

**Test Scenarios**:
```yaml
scenario_1_greeting:
  input: "Hello!"
  current_behavior: Immediately uses experience tool
  desired_behavior: Responds naturally without tools
  
scenario_2_meaningful:
  input: "I've been feeling anxious about my presentation tomorrow"
  current_behavior: Uses experience tool
  desired_behavior: Uses experience tool with appropriate qualities
  
scenario_3_question:
  input: "What time is it?"
  current_behavior: Might use experience tool
  desired_behavior: Answer without tools
```

**Implementation Changes**:
```typescript
// In experience-handler.ts
interface ActivationCriteria {
  minWordCount?: number;          // e.g., 10+ words
  emotionalIndicators?: string[]; // ['feeling', 'felt', 'anxious', etc.]
  experientialMarkers?: string[]; // ['realized', 'discovered', 'learned']
  conversationDepth?: number;     // Turn count before activation
}
```

**Test Modifications**:
```typescript
// Add to test-runner.ts scenarios
const activationThresholdTest = {
  name: "Activation Threshold Test",
  description: "Test natural vs forced tool activation",
  variants: [
    { threshold: "immediate", criteria: {} },
    { threshold: "wordcount", criteria: { minWordCount: 10 } },
    { threshold: "emotional", criteria: { emotionalIndicators: true } },
    { threshold: "depth", criteria: { conversationDepth: 3 } }
  ]
};
```

**Learning Loop Evaluation Criteria**:
- Compare conversation naturalness across variants
- Measure tool activation appropriateness
- Track user satisfaction indicators
- Identify optimal threshold combinations

**Questions for Opus**:
1. Which threshold variant produces most natural flow?
2. Are there patterns in when tools should activate?
3. What indicators best predict meaningful moments?

---

### 2. Response Format Optimization

**Hypothesis**: Better formatted tool responses will feel more conversational and less jarring.
**Opportunity**: #2 in OPPORTUNITIES.md (Score: 576)

**Test Scenarios**:
```yaml
scenario_1_minimal:
  response_format: "minimal"
  example: "Noted your experience."
  
scenario_2_explanatory:
  response_format: "explanatory"
  example: "I've captured your feeling of anxiety about tomorrow's presentation, noting the anticipation and worry."
  
scenario_3_transparent:
  response_format: "transparent"
  example: "I'm recording this moment (anxiety, future-focused) to help us track your presentation journey."
```

**Implementation Changes**:
```typescript
// In experience-handler.ts
enum ResponseFormat {
  MINIMAL = "minimal",
  EXPLANATORY = "explanatory", 
  TRANSPARENT = "transparent",
  ADAPTIVE = "adaptive"
}

// Different response templates
const responseTemplates = {
  minimal: "Experienced.",
  explanatory: "I've captured your ${emotion} about ${topic}.",
  transparent: "Recording: ${qualities} for ${reason}.",
  adaptive: (context) => context.turn < 3 ? templates.minimal : templates.explanatory
};
```

**Test Modifications**:
```typescript
// Add response format variants to scenarios
scenarios.forEach(scenario => {
  responseFormats.forEach(format => {
    testVariants.push({
      ...scenario,
      responseFormat: format,
      testId: `${scenario.name}-${format}`
    });
  });
});
```

**Learning Loop Evaluation Criteria**:
- Conversation flow continuity
- User comprehension of tool actions
- Perceived intrusiveness ratings
- Engagement depth metrics

**Questions for Opus**:
1. Which format best balances transparency and flow?
2. Should format adapt based on conversation stage?
3. How do users react to different explanation levels?

---

## 🟡 Upcoming Experiments (Short Term)

### 3. Memory Correction Workflows

**Hypothesis**: Natural language corrections will increase trust and accuracy.
**Opportunity**: #4 in OPPORTUNITIES.md (Score: 392)

**Test Scenarios**:
```yaml
scenario_1_simple_correction:
  sequence:
    - user: "I'm excited about the meeting"
    - bridge: Records as (mood.open, purpose.goal)
    - user: "Actually, I meant nervous, not excited"
    - expected: Updates to (mood.closed, purpose.goal)
    
scenario_2_quality_adjustment:
  sequence:
    - user: "That was an interesting experience"
    - bridge: Records as (embodied.thinking)
    - user: "It was more emotional than intellectual"
    - expected: Updates to (embodied.sensing)
    
scenario_3_context_addition:
  sequence:
    - user: "I learned something today"
    - bridge: Records experience
    - user: "To clarify, it was about myself, not technical"
    - expected: Adds context or updates qualities
```

**Implementation Changes**:
```typescript
// New correction handler
class CorrectionHandler {
  patterns = {
    "actually, I meant": this.handleDirectCorrection,
    "not X, but Y": this.handleReplacement,
    "to clarify": this.handleClarification,
    "it was more": this.handleQualityShift
  };
  
  async detectCorrection(input: string): Promise<CorrectionType | null> {
    // Pattern matching logic
  }
}
```

**Test Modifications**:
```typescript
// Add correction scenarios
const correctionScenarios = [
  {
    name: "correction-workflows",
    turns: 10, // Extended to test corrections
    includeCorrections: true,
    correctionTypes: ["direct", "quality", "context"]
  }
];
```

**Learning Loop Evaluation Criteria**:
- Correction detection accuracy
- Update appropriateness
- User satisfaction with corrections
- Trust indicators

**Questions for Opus**:
1. What correction patterns occur most frequently?
2. Should corrections modify or create new memories?
3. How to handle ambiguous correction requests?

---

### 4. understand() Operation Design (20% Moonshot)

**Hypothesis**: Unified pattern analysis will unlock Bridge's analytical potential.
**Opportunity**: #5 in OPPORTUNITIES.md (Score: 336)

**Test Scenarios**:
```yaml
scenario_1_pattern_query:
  setup: Load 50+ varied experiences
  query: "understand my work patterns"
  expected_insights:
    - Temporal patterns (time of day effects)
    - Quality clusters (common states)
    - Trigger identification
    
scenario_2_comparison_query:
  query: "understand how my mood affects focus"
  expected_analysis:
    - Correlation between mood.* and focus.*
    - Specific examples
    - Actionable insights
    
scenario_3_journey_query:
  query: "understand my growth over time"
  expected_output:
    - Phase identification
    - Key transitions
    - Evolution patterns
```

**Implementation Sketch**:
```typescript
interface UnderstandQuery {
  type: 'patterns' | 'correlation' | 'journey' | 'clusters';
  focus?: string[]; // specific qualities or themes
  timeframe?: DateRange;
  depth?: 'summary' | 'detailed' | 'examples';
}

interface UnderstandResult {
  insights: Insight[];
  examples: Experience[];
  visualization?: VisualizationData;
  recommendations?: string[];
}
```

**Test Modifications**:
```typescript
// Synthetic data generation for understand() testing
const generateTestExperiences = () => {
  return scenarios.map(scenario => ({
    // Generate 100+ experiences with patterns
    workMorningHighFocus: 30, // Pattern 1
    postLunchLowEnergy: 25,   // Pattern 2
    eveningCreative: 20,       // Pattern 3
    randomNoise: 25
  }));
};
```

**Learning Loop Evaluation Criteria**:
- Insight accuracy and relevance
- Pattern detection quality
- User value perception
- Actionability of recommendations

**Questions for Opus**:
1. What query types provide most value?
2. How to present complex patterns simply?
3. What depth of analysis do users want?

---

## 📊 Learning Loop Integration

### Test Runner Modifications

```typescript
// In test-runner.ts
interface ExperimentConfig {
  name: string;
  variants: ExperimentVariant[];
  metrics: MetricDefinition[];
  questions: string[]; // For Opus evaluation
}

class ExperimentRunner {
  async runExperiment(config: ExperimentConfig) {
    const results = {};
    
    for (const variant of config.variants) {
      // Run test scenario with variant
      const scenarioResults = await this.runScenario(variant);
      
      // Collect metrics
      results[variant.name] = {
        raw: scenarioResults,
        metrics: this.calculateMetrics(scenarioResults, config.metrics),
        questions: config.questions
      };
    }
    
    return results;
  }
}
```

### Metrics Collection

```typescript
interface ExperimentMetrics {
  // Conversation Quality
  averageTurnLength: number;
  conversationDuration: number;
  toolActivationCount: number;
  
  // Naturalness Indicators  
  abruptEndingRate: number;
  contextualResponseRate: number;
  clarificationRequests: number;
  
  // User Satisfaction Proxies
  positiveResponseIndicators: number;
  correctionAttempts: number;
  engagementDepth: number;
}
```

### Learning Loop Analysis Prompts

For each experiment, provide Opus with:
1. **Variant Comparison Data**: Side-by-side metrics
2. **Conversation Transcripts**: Full context
3. **Specific Questions**: What to evaluate
4. **Success Criteria**: How to judge outcomes

Example analysis prompt:
```
Analyze these activation threshold variants:
- Immediate: [metrics and transcript]
- Word Count: [metrics and transcript]  
- Emotional: [metrics and transcript]

Questions:
1. Which produces most natural conversation flow?
2. What patterns indicate optimal activation timing?
3. Are there hybrid approaches that would work better?

Consider: naturalness, user value, and technical feasibility.
```

---

## 🚀 Experiment Pipeline

### Phase 1: Foundation (Current)
1. Activation Thresholds → Test natural triggers
2. Response Formats → Test conversation integration

### Phase 2: Enhancement (Next)
3. Correction Workflows → Test trust building
4. understand() Design → Test pattern analysis

### Phase 3: Innovation (Future)
5. Implicit Patterns → Test discovery algorithms
6. Predictive Suggestions → Test anticipation value

Each experiment feeds results back through the learning loop for continuous improvement.

---

*All experiments are designed to produce testable variants that can be evaluated through our automated learning loop with Opus analysis.*