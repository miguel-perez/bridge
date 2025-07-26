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

- Read VISION.md and README.md
- Identify gaps between vision and current implementation
- Frame as "How Might We" (HMW) questions in OPPORTUNITIES.md
- Score using methodology in OPPORTUNITIES.md (Impact × Certainty × Urgency)
- Current highest priority: Clustering (Score: 378)

### 2. Opportunities Become Experiments

- Pick high-scoring opportunities (400+ or strategic importance)
- Design specific test scenarios
- Add to EXPERIMENTS.md with measurable outcomes
- Run tests using `npm test`

### 3. Experiments Generate Learnings

- Run unit tests with `npm test` to validate functionality
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
3. **Run tests**: Use `npm test` for unit tests and coverage
4. **Analyze results**: Review test coverage and performance metrics
5. **Review results**: Check test output and error details
6. **Update docs**: Keep README.md current with implementation

**Current Quality Status**: See **README.md** for current test coverage metrics (77.12% lines, 64.68% branches)

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
npm run test:all                  # Run all tests
npm run quality-check:full        # Run comprehensive quality checks
```

# Quality Gates

npm run quality-check # Quick quality check (pre-commit level)
npm run quality-check:full # Full quality check (pre-push level)

# Build & Deploy

npm run build:all # Build and bundle for production
./build-dxt.sh # Build Desktop Extension (Unix)
.\build-dxt.ps1 # Build Desktop Extension (Windows)

````

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
````

**Quality Standards**:

- 80%+ test coverage
- Zero ESLint errors
- Zero TypeScript errors
- All tests passing

### Test Coverage

Bridge uses comprehensive unit tests to validate functionality:

- **Handler Tests**: Validate MCP tool handlers and error handling
- **Service Tests**: Test business logic and data processing
- **Schema Tests**: Validate input/output schemas and type safety
- **Integration Tests**: Test end-to-end workflows and edge cases

**Note**: Tests include comprehensive coverage reporting and performance metrics.

### Streamlined Bridge Design

Bridge has been transformed from CRUD-like operations to conscious memory work:

- **Experience Tool**: Now includes integrated recall functionality and nextMoment tracking
- **Reconsider Tool**: Now supports both update and release modes
- **Flow State Management**: Tracks experiential journeys and generates auto-reflections
- **Quality Signatures**: Complete switchboard with 7 dimensions for capturing experiential moments

## How to Generate Opportunities from Gaps

1. **Compare** VISION.md features with README.md implementation
2. **Identify gaps** between vision and current state
3. **Frame as HMW questions**:
   - "HMW enable Bridge to reveal patterns through clustering?"
   - "HMW capture pattern realizations as linkable experiences?"
   - "HMW track temporal sequences to reveal rhythms?"
4. **Include implementation notes** for each opportunity

## How to Score Opportunities

See **OPPORTUNITIES.md** for the complete scoring methodology (Impact × Certainty × Urgency).

### Prioritization Strategy

- Use barbell approach: Mix high-certainty quick wins with high-impact experiments
- Focus on features that enable collaborative wisdom building
- Maintain backward compatibility while extending capabilities
- Prioritize experiential reasoning chains with nextMoment tracking
- Enhance tools with integrated functionality (e.g., recall within experience)

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
