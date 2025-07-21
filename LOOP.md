VISION → OPPORTUNITIES → EXPERIMENTS → LEARNINGS → VISION

# The Bridge Learning Loop

**Document Purpose**: This explains Bridge's development methodology - how we systematically evolve from vision to
implementation through experimentation and learning. This is our process for continuous improvement.

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
- Score using methodology in OPPORTUNITIES.md (Impact × Certainty × Urgency)
- Current highest priority: Clustering (Score: 378)

### 2. Opportunities Become Experiments
- Pick high-scoring opportunities (400+ or strategic importance)
- Design specific test scenarios
- Add to EXPERIMENTS.md with measurable outcomes
- Run tests using `npm run test:bridge`

### 3. Experiments Generate Learnings
- Run learning loop with `npm run loop`
- Analyzes git history, test results, and documentation
- Generates prioritized recommendations
- Provides evidence trails for each recommendation
- Suggests updates to documentation files

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
4. **Analyze results**: Run `npm run loop` for recommendation-based analysis
5. **Apply recommendations**: Review and implement suggested changes
6. **Update docs**: Keep TECHNICAL.md current with implementation

**Current Quality Status**: See **README.md** for current test coverage metrics (85.27% lines, 74.54% branches)

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
npm run test:bridge               # Run all Bridge test scenarios (sequential by default)
npm run test:bridge -- --parallel # Run all Bridge test scenarios in parallel
npm run test:bridge:experience    # Test experience tool capture
npm run test:bridge:recall        # Test recall search patterns
npm run test:bridge:reconsider    # Test reconsider evolution
npm run test:bridge:release       # Test release cleanup
npm run test:bridge:dimensional   # Test dimensional queries
npm run test:all                  # Run tests then learning loop
npm run loop                      # Run learning loop analysis

# Build & Deploy
npm run build:all                 # Build and bundle for production
./build-dxt.sh                    # Build Desktop Extension (Unix)
.\build-dxt.ps1                   # Build Desktop Extension (Windows)
```

### Test Scenarios

Bridge tests run sequentially by default to avoid resource contention. Each scenario focuses on specific tools:

- **experience-capture**: Tests experience tool with various emotional states
- **recall-queries**: Tests recall with text, dimensional, and mixed queries  
- **reconsider-evolution**: Tests reconsider as understanding deepens
- **release-cleanup**: Tests selective removal of experiences
- **dimensional-focus**: Deep dive into dimensional filtering patterns

All test results are saved to the `loop/` directory for analysis.

**Note**: Tests include automatic retry logic for transient failures (timeouts, rate limits).

## How to Generate Opportunities from Gaps

1. **Compare** VISION.md features with TECHNICAL.md implementation
2. **Identify gaps** between vision and current state
3. **Frame as HMW questions**:
   - "HMW enable Bridge to reveal patterns through clustering?"
   - "HMW capture pattern realizations as linkable experiences?"
   - "HMW track temporal sequences to reveal rhythms?"
4. **Include implementation notes** for each opportunity

## How to Score Opportunities

See **OPPORTUNITIES.md** for the complete scoring methodology (Impact × Certainty × Urgency).

## Current Development Priorities

1. **Clustering** (Score: 378) - Core to revealing insights through automatic grouping
2. **Dimension Filtering** (Score: 280) - Sophisticated queries by dimension presence/absence
3. **Extensible Recall** (Score: 270) - Technical foundation for future features
4. **Sequence Analysis** (Score: 240) - Temporal patterns and transitions
5. **Natural Language Time** (Score: 216) - Convenience feature for intuitive querying
6. **Code Quality Monitoring** (Score: 336) - Maintain high test coverage and quality

**Note**: Pattern Realizations (EXP-005) completed successfully, enabling collaborative wisdom building with `reflects` field.

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

## Learning Loop Analysis

Run `npm run loop` to analyze your project and generate recommendations:

### What It Analyzes
- **Git History**: Recent commits, development velocity, focus areas
- **Test Results**: Unit tests with coverage, Bridge integration tests
- **Documentation**: All markdown files for gaps and inconsistencies
- **Experiments**: Active experiments that may need completion
- **Patterns**: Bug fix rates, test coverage, documentation lag
- **Previous Runs**: Compares with last run to detect changes

### Automatic Test Execution
The learning loop will automatically run tests when:
- No test results exist in the `loop/` directory
- New commits have been made since the last run
- Uncommitted changes are detected in the repository
- Coverage data is older than 24 hours

### What You Get
- **Prioritized Recommendations**: Sorted by critical/high/medium/low priority
- **Evidence-Based**: Each recommendation includes specific evidence
- **Actionable**: Clear suggestions for what to change
- **Confidence Levels**: How certain the analysis is (0-100%)
- **Reports**: Both JSON and Markdown formats in loop/

### CLI Options
```bash
npm run loop                    # Full analysis (default: 30 days)
npm run loop -- -d 7           # Analyze last 7 days only
npm run loop -- -f markdown    # Output markdown only
npm run loop -- --verbose      # Show detailed progress
npm run loop -- --help         # Show all options
```

### Example Recommendations
- Complete experiments that appear finished
- Add tests for areas with high bug fix rates
- Update documentation that's lagging behind features
- Run Bridge tests if results are missing
- Improve test coverage in frequently changed files

The loop provides recommendations, not automatic updates, giving you control over what changes to apply.