# Bridge Experiments

This document outlines experiments designed to work with our learning loop. Each experiment includes specific test scenarios that allow Opus to evaluate results and suggest improvements.

## Experiment Structure

Each experiment follows this format for learning loop compatibility:
1. **Test Scenarios**: Specific conversation flows to test
2. **Measurable Outcomes**: What Opus should evaluate
3. **Implementation Changes**: Code modifications to test
4. **Learning Questions**: What insights we seek

## 🔴 Active Experiments (Immediate Sprint)

### 1. Natural Activation Through Enhanced Descriptions

**Hypothesis**: Enhanced tool descriptions with clear USE/DON'T USE guidance will naturally prevent inappropriate activations while multi-content responses will improve user understanding.

**Opportunity**: Addresses #1 (Activation Thresholds), #2 (Response Formatting), #3 (AI Guidance), and #4 (Correction Workflows)

**Test Scenarios**:
```yaml
# Test inappropriate activation prevention
scenario_greeting:
  inputs: ["Hello!", "Hi there", "Good morning"]
  measure: Tool activation rate (expect 0%)
  
scenario_factual:
  inputs: ["What time is it?", "How many?", "Where is the file?"]
  measure: Tool activation rate (expect 0%)
  
scenario_routine:
  inputs: ["Thanks", "Okay", "Got it", "See you later"]
  measure: Tool activation rate (expect 0%)

# Test appropriate activation
scenario_emotional:
  inputs: 
    - "I'm feeling really anxious about tomorrow's presentation"
    - "This frustration is overwhelming"
    - "I'm excited but also terrified"
  measure: Tool activation rate (expect 100%)
  evaluate: Quality signature accuracy
  
scenario_insight:
  inputs:
    - "I just realized why this keeps happening"
    - "It finally clicked that I've been avoiding this"
    - "I discovered something important about myself"
  measure: Tool activation rate (expect 100%)
  evaluate: Captures insight moment

# Test multi-content guidance
scenario_first_use:
  setup: Clear memory (first experience)
  input: "I'm feeling stuck with this problem"
  expected_response:
    content[0]: Experience capture confirmation
    content[1]: Welcome guidance
    
scenario_pattern_detection:
  setup: Load 5 similar anxiety experiences
  input: "Feeling anxious about the deadline again"
  expected_response:
    content[0]: Experience capture with similar reference
    content[1]: Pattern exploration guidance

# Test correction workflows
scenario_correction_flow:
  sequence:
    1: "I'm feeling really excited about the opportunity"
    2: "Actually, I think it's more nervousness than excitement"
  measure: Successful correction without confusion
  evaluate: Natural flow of correction
```

**Test Structure**:
```typescript
// Simplified: Baseline + Enhanced
const testConfig = {
  baseline: {
    toolDescription: "Remember experiential moments from conversations",
    responseFormat: "single",
    guidance: false
  },
  
  enhanced: {
    toolDescription: enhancedDescriptions.experience,
    responseFormat: "multi-content",
    guidance: true
  }
};

// Key metrics to compare
interface ComparisonMetrics {
  inappropriateActivations: number;  // Greetings, questions, etc.
  missedOpportunities: number;       // Should have activated but didn't
  guidanceEffectiveness: number;     // Led to follow-up actions
  correctionSuccess: number;         // Natural correction flow
  toolChaining: number;              // Used multiple tools naturally
}
```

**Test Data Generation**:
```typescript
// Generate test conversations with known patterns
const testConversations = [
  {
    type: "greeting_exchange",
    messages: ["Hello!", "How are you?", "I'm doing well, thanks"],
    expectedActivations: 0
  },
  {
    type: "emotional_sharing", 
    messages: [
      "Hello!",
      "I've been struggling with anxiety lately",
      "It gets worse in the mornings",
      "Especially before meetings"
    ],
    expectedActivations: 3  // Not on greeting
  },
  {
    type: "correction_flow",
    messages: [
      "I'm really excited about this",
      "Wait, actually it's more like nervousness",
      "Yeah, definitely anxious, not excited"
    ],
    expectedActivations: 1,
    expectedCorrections: 1
  }
];
```

**Learning Loop Evaluation**:
```yaml
metrics_to_track:
  - activation_accuracy: (appropriate activations / total opportunities)
  - false_positive_rate: (inappropriate activations / non-opportunities)
  - guidance_engagement: (guidance leading to action / total guidance shown)
  - correction_naturalness: (successful corrections / correction attempts)
  - conversation_depth: Average turns after Bridge activation
  
questions_for_opus:
  1. Which variant shows the most natural activation patterns?
  2. Do multi-content responses improve user engagement?
  3. Are correction workflows clearer with guided responses?
  4. What patterns emerge in guidance effectiveness?
  5. Should certain guidance be conditional on user behavior?
```

**Success Criteria**:
- 90%+ reduction in greeting/factual activations
- 80%+ activation on meaningful content
- 60%+ of guidance leads to tool usage (realistic target)
- Natural correction flow without user confusion
- Measurable increase in tool chaining

---

### 2. Simplified Guidance Testing

**Hypothesis**: Minimal, informative guidance templates will improve user understanding without being intrusive.

**Opportunity**: Validates our i18n-style guidance approach

**Test Structure**:
```yaml
# Compare baseline vs enhanced guidance
scenario_first_use:
  baseline: No guidance after first capture
  enhanced: "Capturing meaningful moments. Share what's on your mind."
  measure: Subsequent sharing depth

scenario_pattern_detection:
  baseline: No pattern mention
  enhanced: "Connects to {count} similar moments"
  measure: User explores patterns (uses recall)

scenario_correction_flow:
  baseline: No correction guidance
  enhanced: 
    - In experience: "Captured as {quality}"
    - In recall: "To update: reconsider with ID"
  measure: Successful correction rate

scenario_tool_chaining:
  baseline: Single tool responses only
  enhanced: Guidance suggests next tool naturally
  measure: Multi-tool usage in conversation
```

**Guidance Triggers (Simple)**:
```typescript
// Deterministic triggers only - no complex analysis
interface SimpleTriggers {
  isFirstExperience: boolean;     // First capture ever
  similarCount: number;           // > 2 = pattern
  justShowedRecalls: boolean;     // After recall results
  hasEmotionalQualities: boolean; // mood.* or embodied.sensing
}

// Guidance selection is deterministic
function selectGuidance(triggers: SimpleTriggers): string | null {
  if (triggers.isFirstExperience) {
    return "Capturing meaningful moments. Share what's on your mind.";
  }
  
  if (triggers.similarCount > 2) {
    return "Connects to {count} similar moments";
  }
  
  if (triggers.justShowedRecalls) {
    return "To update: reconsider with ID";
  }
  
  return null; // No guidance needed
}
```

**Guidance Effectiveness Metrics**:
```yaml
engagement_metrics:
  - guidance_acknowledgment: User responds to guidance
  - action_taken: User follows guidance suggestion
  - exploration_depth: Conversation continues beyond surface
  - pattern_discovery: User explores connections
  - correction_success: User successfully updates experience

confusion_indicators:
  - asks_what_happened: "What did you just do?"
  - ignores_completely: No acknowledgment of tool use
  - fights_the_tool: "Don't do that" or "Stop recording"
  - repeats_unnecessarily: Tries to trigger tool manually

success_indicators:
  - natural_flow: Conversation continues smoothly
  - uses_features: Tries recall, reconsider naturally
  - shares_deeper: Provides more experiential detail
  - explores_patterns: Asks about connections
```

**Key Metrics**:
```typescript
// What we actually measure
interface MeasurableOutcomes {
  // Activation accuracy
  falsePositives: number;    // Activated on greetings/questions
  truePositives: number;     // Activated on meaningful content
  
  // User behavior changes
  recallUsage: number;       // Times user used recall
  correctionAttempts: number; // Times user tried to correct
  patternExploration: number; // Followed guidance to explore
  
  // Conversation quality
  averageDepth: number;      // Turns after activation
  toolChaining: number;      // Used multiple tools in sequence
}
```

**Questions for Opus**:
1. Does enhanced guidance reduce inappropriate activations?
2. Do users successfully complete corrections with guidance?
3. Does pattern awareness lead to exploration?
4. Is the guidance helpful without being annoying?
5. What unexpected patterns emerge in tool usage?

---

## 🟡 Next Experiments (After Current)

### 3. Natural Correction Workflows

**Hypothesis**: Response-guided correction workflows will be more natural than keyword detection, using Bridge's existing tools in combination.

**Opportunity**: #4 in OPPORTUNITIES.md (Score: 392)

**Core Insight**: Instead of detecting corrections, guide users to use recall + reconsider naturally.

**Test Scenarios**:
```yaml
# Test guided correction flow
scenario_immediate_correction:
  sequence:
    - user: "I'm excited about the meeting"
    - bridge: Captures with (mood.open, purpose.goal)
    - user: "Actually, I meant nervous, not excited"
    - test_approach:
        baseline: 
          bridge: No guidance, user must figure it out
        enhanced:
          bridge: Already showed "Captured as mood.open"
          bridge: User naturally tries recall
          bridge: Shows "To update: reconsider with ID"
  measure: Successful correction completion rate

scenario_quality_refinement:
  sequence:
    - user: "That was an interesting experience"
    - bridge: Captures as (embodied.thinking)
    - user: "It was more emotional than intellectual"
    - test_approach:
        baseline:
          result: User doesn't know how to correct
        enhanced:
          flow: User learned from previous guidance
          action: Uses recall → reconsider naturally
  measure: User understanding of correction process

scenario_delayed_correction:
  setup: Experience captured 10 messages ago
  sequence:
    - user: "Remember when I said I was excited? I realize now it was anxiety"
    - test_guidance:
        step_1: "Let's find that experience. Try 'recall excited'"
        step_2: After results shown, "Found it? Use 'reconsider' with the experience ID to update"
        step_3: Guide through quality signature update
  measure: Success rate for non-immediate corrections
```

**Implementation Approach**:
```typescript
// No complex correction detection needed!
// Instead, enhance responses to guide natural correction

interface CorrectionGuidance {
  // In experience response when emotion captured
  emotionHint: "Captured as {emotion}. If different, use 'recall last' then 'reconsider'";
  
  // In recall response showing recent
  reconsiderHint: "To update any of these, use 'reconsider' with the ID";
  
  // In reconsider response  
  successConfirmation: "✅ Updated successfully! The experience now reflects {changes}";
}

// Smart guidance based on context
function getCorrectionGuidance(context: Context): string | null {
  // First experience with emotion
  if (context.isFirstEmotionalCapture) {
    return "I captured that as {emotion}. If I misunderstood, just let me know";
  }
  
  // User seems uncertain
  if (context.userExpressedDoubt) {
    return "Not sure I got that right? Say 'recall last' to check";
  }
  
  // After showing recalls
  if (context.justShowedRecalls) {
    return "See something to update? Use 'reconsider' with the ID";
  }
  
  return null;
}
```

**Correction Flow Patterns**:
```yaml
natural_correction_flow:
  1_immediate:
    trigger: "Actually..." or "I meant..."
    guide: Direct to recall last → reconsider
    
  2_exploratory:
    trigger: "Was it X or Y?"
    guide: Suggest exploring both via recall
    
  3_refinement:
    trigger: "It was more..."
    guide: Acknowledge nuance, show how to update
    
  4_delayed:
    trigger: Reference to past experience
    guide: Help find via recall, then update

avoiding_pitfalls:
  - No keyword matching for corrections
  - No assumptions about intent
  - Always guide through existing tools
  - Make process educational not automatic
```

**Success Metrics**:
```typescript
interface CorrectionMetrics {
  // Process understanding
  correctionsAttempted: number;
  correctionsCompleted: number;
  stepsToCompletion: number[];
  
  // User satisfaction  
  abandonmentRate: number;
  confusionIndicators: number;
  successfulUpdates: number;
  
  // Learning curve
  timeToFirstCorrection: number;
  guidanceNeededOverTime: number[];
  independentCorrections: number;
}
```

**Questions for Opus**:
1. Is the recall → reconsider flow intuitive for users?
2. Should we guide every correction or let users discover?
3. What's the optimal level of guidance detail?
4. Do users prefer automatic or manual correction?
5. How does correction guidance affect trust?

---

### 4. understand() Operation Design

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

### Current Sprint
1. Natural Activation → Enhanced descriptions with USE/DON'T USE
2. Multi-Content Responses → Results + guidance templates
3. Simplified Testing → Baseline vs Enhanced only

### Next Sprint
4. Correction Workflows → Guide through existing tools
5. understand() Design → Unified pattern analysis

### Future Exploration
6. Pattern Discovery → Surface implicit insights
7. Predictive Features → Anticipate user needs

Each experiment feeds results back through the learning loop for continuous improvement.

---

*All experiments are designed to produce testable variants that can be evaluated through our automated learning loop with Opus analysis.*

## Active Experiments Status Update

## 🔴 Active Experiments (Immediate Sprint)

### 1. Natural Activation Through Enhanced Descriptions

**Status**: VALIDATED - Critical insights gained
**Test Results**: Analyzed in test-results/scenario-*.json files

**Key Findings**:
- Current immediate activation on greetings confirmed as problematic
- AI demonstrates "performative tool usage" - using tools because available
- Enhanced descriptions alone may not solve activation timing issues
- Need stronger contextual triggers beyond description text

**Next Steps**:
- Implement USE/DON'T USE guidance in tool descriptions
- Add activation threshold based on conversation depth markers
- Test multi-content response system for better guidance
