**Learning Loop:** VISION → OPPORTUNITIES → EXPERIMENTS → LEARNINGS → VISION

# The Bridge Learning Loop

**Document Purpose**: This explains Bridge's development methodology - how we systematically evolve from vision to implementation through experimentation and learning. This is our process for continuous improvement.

**For Contributors**: Follow this loop when proposing new features or improvements.

We use a continuous learning loop to evolve from vision to reality:

1. **VISION.md** - Describes the ideal future state of Bridge
2. **OPPORTUNITIES.md** - Prioritized roadmap of features not yet implemented
3. **EXPERIMENTS.md** - Active and completed tests on Bridge functionality
4. **LEARNINGS.md** - Validated insights from experiments and real-world usage

## How It Works

### 1. Vision Drives Opportunities

- Read VISION.md and README.md
- Identify gaps between vision and current implementation
- Frame as "How Might We" (HMW) questions in OPPORTUNITIES.md
- Score using methodology in OPPORTUNITIES.md (Impact × Certainty × Urgency)
- Current highest priority: Progressive Vector Enhancement (Score: 432)

### 2. Opportunities Become Experiments

- Pick high-scoring opportunities (400+ or strategic importance)
- Design specific test scenarios
- Add to EXPERIMENTS.md with measurable outcomes
- Run tests using `npm test`

### 3. Experiments Generate Learnings

- Run unit tests with `npm test` to validate functionality
- Run integration tests with `npm run test:integration` for end-to-end validation
- Run simulation tests with `npm run test:simulation` for experiential validation
- Review test coverage and performance metrics
- Analyze implementation gaps and areas for improvement

### 4. Learnings Inform Development

- Review insights that reveal implementation gaps
- Update README.md with current capabilities
- Generate new opportunities from gaps
- Implement high-priority features
- Continue the cycle

## Working with Bridge Code

### Development Workflow

1. **Check current state**: Read README.md for what's actually implemented
2. **Find next priority**: Check OPPORTUNITIES.md for scored features
3. **Run tests**:
   - `npm test` for unit tests and coverage
   - `npm run test:integration` for MCP protocol tests
   - `npm run test:simulation` for experiential validation (requires OPENAI_API_KEY)
   - `npm run test:all` for unit + integration tests
   - `npm run test:complete` for all tests including simulations
4. **Analyze results**: Review test coverage and performance metrics
5. **Review results**: Check test output and error details
6. **Update docs**: Keep README.md current with implementation

**Current Quality Status**: See **README.md** for current test coverage metrics (66.55% lines, 55% branches, 544 unit tests)

### Key Commands

```bash
# Development
npm run dev                       # Start MCP server in watch mode
npm run build                     # Build TypeScript to dist/
npm run lint                      # Run ESLint
npm run lint:fix                  # Auto-fix linting issues
npm run type-check                # Type check without building

# Testing
npm test                          # Run unit tests with Jest (544 tests)
npm run test:integration          # Run integration tests with real MCP
npm run test:simulation           # Run simulation tests with LLM (1 test)
npm run test:all                  # Run unit + integration tests
npm run test:complete             # Run all tests including simulations
npm run test:bridge               # Run Bridge scenario tests
npm run loop                      # Run learning loop analysis
npm run quality-check:full        # Run comprehensive quality checks

# Quality Gates
npm run quality-check             # Quick quality check (pre-commit level)
npm run quality-check:full        # Full quality check (pre-push level)

# Build & Deploy
npm run build:all                 # Build and bundle for production
npm run dxt:build                 # Build Desktop Extension (macOS/Linux)
npm run dxt:build:windows         # Build Desktop Extension (Windows)
```

### Quality Gates

Bridge uses automated quality gates to maintain high code quality:

**Pre-commit Hook** (runs on `git commit`):

- TypeScript type checking
- ESLint validation
- Markdown linting
- Build verification
- Unit tests
- Quick integration test

**Pre-push Hook** (runs on `git push`):

- All pre-commit checks
- Unit tests with coverage
- All integration tests
- Learning loop analysis

**Emergency Bypass** (use sparingly):

```bash
SKIP_PRE_COMMIT=true git commit  # Bypass pre-commit
SKIP_PRE_PUSH=true git push      # Bypass pre-push
```

**Quality Standards**:

- 80%+ test coverage (currently 81.64% line, 88.95% function)
- Zero ESLint errors
- Zero TypeScript errors
- All 769 tests passing (705 unit + 63 integration + 1 simulation)
- All 15 completed experiments proven by tests

### Test Coverage

Bridge uses a three-layer testing pyramid:

```
┌─────────────────────────────────────┐
│      Simulation Tests (1)           │ <- Experiential validation
├─────────────────────────────────────┤
│    Integration Tests (63)           │ <- Protocol validation  
├─────────────────────────────────────┤
│      Unit Tests (705)               │ <- Component validation
└─────────────────────────────────────┘
```

- **Unit Tests** (705 tests): Validate individual components
  - Handler Tests: MCP tool handlers and error handling
  - Service Tests: Business logic and data processing
  - Schema Tests: Input/output schemas and type safety
  
- **Integration Tests** (63 tests): Real MCP client/server communication
  - End-to-end workflows and user journeys
  - Performance and stress testing
  - Error handling and edge cases
  - All completed experiments validation
  
- **Simulation Tests** (1 test): LLM-powered experiential validation
  - Extended cognition model (human 2-4 qualities, AI 7 qualities)
  - Complementary awareness and pattern emergence
  - Natural conversational flow with Bridge integration
  - Evaluated by GPT-4 for experiential quality

**Note**: Tests include comprehensive coverage reporting and performance metrics.

### Streamlined Bridge Design

Bridge has been transformed from CRUD-like operations to conscious memory work with just two integrated tools:

#### **experience()**
A unified tool for both capture and exploration:
- **Capture**: Document new experiences with full quality signatures
- **Recall**: Search memories with sophisticated filtering, sorting, and grouping
- **Journey Tracking**: Use nextMoment to declare experiential states in reasoning chains
- **Batch Operations**: Capture multiple perspectives in one call
- **Pattern Discovery**: Find clusters, sequences, and connections

Example with integrated recall:
```javascript
experience({
  experiences: [{
    source: "Feeling stuck on this design problem",
    experienceQualities: {
      embodied: "my mind keeps circling the same ideas",
      mood: "frustrated with the lack of progress",
      focus: "narrowing in on what's blocking me",
      purpose: false,
      space: false,
      time: false,
      presence: false
    }
  }],
  recall: {
    query: "design stuck blocked",
    limit: 5
  }
})
```

#### **reconsider()**
Transform and evolve captured experiences:
- **Update Mode**: Revise any aspect as understanding deepens
- **Release Mode**: Gracefully remove experiences that no longer serve
- **Pattern Connections**: Add reflects arrays to link insights
- **Batch Processing**: Update multiple experiences at once

Example with release mode:
```javascript
reconsider({
  reconsiderations: [{
    id: "exp_123",
    release: true,
    releaseReason: "This anxiety pattern no longer defines me"
  }]
})
```

### Quality Signatures

All seven experiential dimensions use free-text sentences in the experiencer's voice:

- **embodied**: "my mind races through possibilities" or "feeling it in my bones"
- **focus**: "zeroing in on this detail" or "taking in the whole scene"  
- **mood**: "open to whatever emerges" or "shutting down, need space"
- **purpose**: "pushing toward the deadline" or "wandering through ideas"
- **space**: "right here in this moment" or "my mind is back home"
- **time**: "remembering when we first met" or "worried about tomorrow"
- **presence**: "feeling alone in this" or "we're all in this together"

Use `false` for qualities not prominently present in the experience.

## How to Generate Opportunities from Gaps

1. **Compare** VISION.md features with README.md implementation
2. **Identify gaps** between vision and current state
3. **Frame as HMW questions**:
   - "HMW enable natural language quality parsing?"
   - "HMW support temporal pattern analysis?"
   - "HMW create extensible recall strategies?"
4. **Include implementation notes** for each opportunity

## How to Score Opportunities

See **OPPORTUNITIES.md** for the complete scoring methodology (Impact × Certainty × Urgency).

### Prioritization Strategy

- Use barbell approach: Mix high-certainty quick wins with high-impact experiments
- Focus on features that enable collaborative wisdom building
- Maintain backward compatibility while extending capabilities
- Prioritize experiential reasoning chains with nextMoment tracking
- Enhance tools with integrated functionality