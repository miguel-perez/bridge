VISION → OPPORTUNITIES → EXPERIMENTS → LEARNINGS → VISION

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
- Read VISION.md and TECHNICAL.md
- Identify gaps between vision and current implementation
- Frame as "How Might We" (HMW) questions in OPPORTUNITIES.md
- Score by Impact × Certainty × Urgency
- Highest priority: Pattern realizations (Score: 560)

### 2. Opportunities Become Experiments
- Pick high-scoring opportunities (400+ or strategic importance)
- Design specific test scenarios
- Add to EXPERIMENTS.md with measurable outcomes
- Run tests using `npm run test:bridge`

### 3. Experiments Generate Learnings
- Run learning loop with `npm run loop`
- Opus 4 analyzes test results using sequential thinking
- Extracts patterns and insights
- Updates LEARNINGS.md with evidence trails
- Documents architecture insights and behavioral patterns

### 4. Learnings Inform Development
- Review insights that reveal implementation gaps
- Update TECHNICAL.md with current capabilities
- Generate new opportunities from gaps
- Implement high-priority features
- Continue the cycle

## Working with Bridge Code

### Development Workflow
1. **Check current state**: Read TECHNICAL.md for what's actually implemented
2. **Find next priority**: Check OPPORTUNITIES.md for scored features
3. **Run tests**: Use `npm test` for unit tests, `npm run test:bridge` for scenarios
4. **Analyze results**: Run `npm run loop` for learning loop analysis
5. **Update docs**: Keep TECHNICAL.md current with implementation

### Key Commands
```bash
# Development
npm run dev                       # Start MCP server in watch mode
npm run build                     # Build TypeScript to dist/
npm run lint                      # Run ESLint
npm run lint:fix                  # Auto-fix linting issues
npm run type-check                # Type check without building

# Testing
npm test                          # Run unit tests with Jest
npm run test:bridge               # Run all Bridge test scenarios
npm run test:bridge <scenario>    # Run specific scenario
npm run test:all                  # Run tests then learning loop
npm run loop                      # Run learning loop analysis

# Build & Deploy
npm run build:all                 # Build and bundle for production
./build-dxt.sh                    # Build Desktop Extension (Unix)
.\build-dxt.ps1                   # Build Desktop Extension (Windows)
```

### Test Scenarios
- **autonomous-bridge**: Can AI use Bridge for self-awareness?
- **with-bridge**: Conversation with Bridge tools available
- **without-bridge**: Control test without tools

## How to Generate Opportunities from Gaps

1. **Compare** VISION.md features with TECHNICAL.md implementation
2. **Identify gaps** between vision and current state
3. **Frame as HMW questions**:
   - "HMW enable Bridge to reveal patterns through clustering?"
   - "HMW capture pattern realizations as linkable experiences?"
   - "HMW track temporal sequences to reveal rhythms?"
4. **Include implementation notes** for each opportunity

## How to Score Opportunities

### Impact (1-10): Would the answer change our approach?
- 10 = Would completely reshape our direction
- 7-9 = Would significantly alter our approach
- 4-6 = Would refine implementation details
- 1-3 = Nice to know but won't change much

### Certainty (1-10): How likely are we to get a useful answer?
- 10 = Guaranteed to learn
- 7-9 = Very likely to learn
- 4-6 = Might learn something
- 1-3 = Moonshot - might learn nothing OR everything

### Urgency (1-10): Timing pressure
- 9-10 = Critical blocker - preventing core functionality
- 7-8 = High priority - actively limiting experience
- 5-6 = Medium priority - important but not blocking
- 3-4 = Low priority - would be nice eventually
- 1-2 = Future consideration

## Current Development Priorities

1. **Pattern Realizations** (Score: 560) - Essential for collaborative wisdom
2. **Clustering** (Score: 378) - Core to revealing insights
3. **Dimension Filtering** (Score: 280) - Sophisticated queries
4. **Extensible Recall** (Score: 270) - Technical foundation
5. **Sequence Analysis** (Score: 240) - Temporal patterns
6. **Natural Language Time** (Score: 216) - Convenience feature

### Prioritization Strategy
- Use barbell approach: Mix high-certainty quick wins with high-impact experiments
- Focus on features that enable collaborative wisdom building
- Maintain backward compatibility while extending capabilities

## Documentation Structure

### Core Learning Loop (4 files)
- **VISION.md** - What we're building
- **OPPORTUNITIES.md** - Questions to test
- **EXPERIMENTS.md** - Active tests and progress
- **LEARNINGS.md** - Validated insights

Each document has one clear purpose and can be read in under 2 minutes.

### Evidence Traceability

The enhanced loop creates clear evidence trails:
- Each learning links to specific experiments and test files
- Confidence levels (Low/Medium/High) based on sample size
- Raw data references (e.g., "4/5 users in test-2025-07-18.json")
- Experiment status tracking (complete, in-progress, pending)

## Autonomous Updates

Run `npm run loop` to have Opus analyze all documents and automatically update them:
- **Direct Updates**: Modifies LEARNINGS.md, EXPERIMENTS.md, OPPORTUNITIES.md, and VISION.md directly
- **Evidence Trails**: Each learning links to specific test results and experiments
- **Smart Updates**: Preserves existing content, only adds new insights
- **Test Integration**: Reads JSON test results directly from test-results/scenarios/
- **Progression Tracking**: Records each loop run in test-results/progression-tracking.json

### What Gets Updated

- **LEARNINGS.md**: New insights with evidence and confidence levels
- **EXPERIMENTS.md**: Status updates for completed experiments
- **OPPORTUNITIES.md**: New questions based on test insights
- **VISION.md**: Only for critical drift (rare, clearly marked)

### File Creation

If any core files don't exist, the loop creates them with proper headers.