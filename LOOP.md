VISION → OPPORTUNITIES → EXPERIMENTS → LEARNINGS → VISION

# The Bridge Learning Loop

We use a continuous learning loop to evolve from vision to reality:

1. **VISION.md** - Describes the ideal future state of Bridge
2. **OPPORTUNITIES.md** - Questions and assumptions to test
3. **EXPERIMENTS.md** - Small, fast tests to answer questions
4. **LEARNINGS.md** - Reusable insights that refine the vision

## How It Works

### 1. Vision Drives Questions
- Read VISION.md sections
- Identify assumptions and unknowns
- Frame as testable questions in OPPORTUNITIES.md
- Score by Impact × Certainty × Urgency

### 2. Questions Become Experiments
- Pick high-scoring opportunities (400+)
- Design smallest testable version
- Add to EXPERIMENTS.md with hypothesis
- Run with AI UX researcher observing

### 3. Experiments Generate Learnings
- AI UX researcher analyzes results
- Extracts reusable patterns
- Updates LEARNINGS.md automatically
- Tracks confidence levels

### 4. Learnings Update Vision
- Review insights that challenge assumptions
- Update VISION.md with new understanding
- Generate new opportunities
- Continue the cycle

# Bridge Opportunity Backlog

## How to Generate Opportunities from VISION.md

1. **Read a section** of VISION.md (e.g., understand() operation)
2. **Ask questions** about assumptions, risks, and unknowns:
   - "Will people actually...?"
   - "Does this work when...?"
   - "How do we know if...?"
   - "What happens when...?"
3. **Frame as testable questions** (not statements or tasks)
4. **Break down** complex questions into sub-questions using `→`

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

### Urgency (1-10): When does this opportunity expire?
- 10 = Now (e.g., blocker, decision needed)
- 7-9 = Next (e.g., before next minor release)
- 4-6 = Later (e.g., before major major release)
- 1-3 = Evergreen or never expires

## The 80/20 Prioritization Approach

1. **Sort by Score** (Impact × Certainty × Urgency)
2. **Look for natural breaks** in scores (e.g., 400+, 200-400, <200)
3. **Focus on top 20%** of opportunities that will likely generate 80% of learnings
4. **Balance the portfolio**:
   - Mix high-certainty validation with low-certainty exploration
   - Include both urgent fixes and long-term bets
   - Have 3-5 items "In Progress" maximum

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