# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Check quality
npm run quality-check
```

## Architecture

### Core Flow

Bridge is an MCP (Model Context Protocol) server that enables shared experiential memory between humans and AI. The architecture follows a service-oriented pattern:

```text
MCP Client (Claude) → MCP Server → Tool Handlers → Services → Storage
                                                              ↓
                                                         Embeddings
```

### Key Components

1. **MCP Layer** (`src/mcp/`)
   - `server.ts` - MCP protocol implementation, routes tool calls
   - `handlers.ts` - Coordinates tool handlers
   - `*-handler.ts` - Individual tool implementations (experience, recall, etc.)
   - Tool handlers validate input and delegate to services

2. **Services** (`src/services/`)
   - `experience.ts` - Remembers experiences with quality signatures
   - `recall.ts` - Semantic search and quality filtering
   - `unified-scoring.ts` - Dynamic scoring system for recall
   - `reconsider.ts` - Updates existing experiences
   - `release.ts` - Removes experiences
   - `embeddings.ts` - @xenova/transformers for semantic vectors
   - `clustering.ts` - Groups similar experiences
   - Services handle business logic and return structured results

3. **Storage** (`src/core/`)
   - `storage.ts` - JSON persistence to `~/.bridge/experiences.json`
   - `types.ts` - Core data structures (Source, Experience, etc.)
   - `config.ts` - Centralized configuration and thresholds
   - `dimensions.ts` - Known quality definitions
   - Experiences stored with embeddings for semantic search

4. **Testing Infrastructure** (`src/scripts/`)
   - `test-runner.ts` - Parallel test execution with three scenarios
   - `learning-loop.ts` - Opus 4 analyzes test results using sequential thinking
   - Unit tests co-located with source files (\*.test.ts)

### Data Flow Example

```typescript
// 1. Claude calls experience tool (array format required)
experience({
  experiences: [
    {
      source: 'I feel anxious',
      experience: ['embodied.sensing', 'mood.closed'],
    },
  ],
});

// 2. MCP server routes to ExperienceHandler
// 3. Handler validates and calls ExperienceService
// 4. Service creates Source record, generates embedding
// 5. Storage saves to JSON, returns result
// 6. Handler formats user-friendly response
// 7. Claude receives: "Experienced (embodied.sensing, mood.closed)"
```

### API Format

**IMPORTANT**: All Bridge tools now require array inputs, even for single operations:

```typescript
// Experience (always use experiences array)
experience({
  experiences: [{ source: 'text', experience: ['mood.open'] }],
});

// Recall (always use searches array)
recall({
  searches: [{ query: 'keyword', limit: 5 }],
});

// Reconsider (always use reconsiderations array)
reconsider({
  reconsiderations: [{ id: 'exp_123', source: 'updated text' }],
});

// Release (always use releases array)
release({
  releases: [{ id: 'exp_123', reason: 'no longer needed' }],
});
```

## Quality Dimensions

Bridge uses seven quality pairs to capture experiential moments:

- **embodied** - How consciousness textures through body/mind
  - `.thinking` - Mental processing, analysis
  - `.sensing` - Body awareness, emotions
- **focus** - Attentional quality
  - `.narrow` - Single-task concentration
  - `.broad` - Multi-task awareness
- **mood** - Emotional atmosphere
  - `.open` - Expansive, curious
  - `.closed` - Contracted, defensive
- **purpose** - Directional momentum
  - `.goal` - Clear direction
  - `.wander` - Exploration
- **space** - Spatial awareness
  - `.here` - Present location
  - `.there` - Elsewhere
- **time** - Temporal orientation
  - `.past` - Historical
  - `.future` - Anticipatory
- **presence** - Social quality
  - `.individual` - Solitary
  - `.collective` - Shared

Use dot notation when quality clearly fits a subtype. Use base quality when mixed or unclear.

## Key Commands

### Development

```bash
npm run dev              # Watch mode with tsx
npm run build            # TypeScript compilation
npm run build:all        # Build + bundle
npm start                # Run bundled server
```

### Testing

```bash
npm test                 # Run unit tests with coverage
npm run test:bridge      # Run integration tests
npm run test:all         # All tests + learning loop
npm run loop             # Run learning loop analysis

# Run a single test file
npm test -- src/services/recall.test.ts
```

### Quality Checks

```bash
npm run lint             # ESLint check
npm run lint:fix         # ESLint auto-fix
npm run type-check       # TypeScript checking
npm run quality-check    # Combined checks
npm run quality-check:full # Full quality suite
```

### Build & Deploy

```bash
npm run bundle           # Create single bundle.js
npm run quality-monitor  # Run quality monitoring
```

## Development Process

Bridge follows a continuous learning loop: **VISION → OPPORTUNITIES → EXPERIMENTS → LEARNINGS → VISION**

See **LOOP.md** for the complete development workflow and methodology.

### Quality Standards

- **Test Coverage**: Currently 85.27% line coverage
- **Pre-commit**: Runs lint:fix and type-check
- **Pre-push**: Runs full quality-check:full
- **Emergency bypass**: `git push --no-verify` (use sparingly)

### Learning Loop Analysis

```bash
npm run loop -- --concise    # Concise recommendations
npm run loop -- --verbose    # Detailed analysis
npm run loop -- --raw        # Include raw data
```

The learning loop:

1. Runs three test scenarios in parallel
2. Uses Opus 4 with sequential thinking
3. Analyzes patterns across scenarios
4. Provides actionable recommendations

### Bridge Integration Tests

The test runner now includes:

- **Rate limiting**: Configurable delays to prevent API overload
- **Streamlined scenarios**: DRY test sets that reduce redundancy
- **Scenario groups**: Predefined test suites (minimal, standard, comprehensive)

Configure test execution:

```bash
# Use standard scenarios (default)
npm run test:bridge

# Use minimal scenarios (fewer API calls)
TEST_MINIMAL=true npm run test:bridge

# Run specific scenario groups
npm run test:bridge standard   # Core + quality + recall tests
npm run test:bridge minimal    # Just basic tests
npm run test:bridge smoke      # Quick smoke test

# Configure rate limits (in .env)
TEST_SCENARIO_DELAY=5000      # Between scenarios (default: 5s)
TEST_API_CALL_DELAY=1000      # After API calls (default: 1s)
TEST_TURN_DELAY=2000          # Between turns (default: 2s)
```

## API Usage Examples

### Experience

```typescript
// Human experience
experience({
  source: 'Finally got the tests passing!',
  experience: ['embodied.thinking', 'mood.open', 'purpose.goal'],
});

// Claude's experience
experience({
  source: 'I notice we keep circling back to this pattern',
  experience: ['embodied.thinking', 'presence.collective'],
  experiencer: 'Claude',
});
```

### Recall

```typescript
// Semantic search
recall({ query: 'frustration debugging' });

// Quality filtering
recall({
  qualities: {
    mood: 'closed',
    purpose: ['goal', 'wander'], // OR logic
  },
});

// Pattern realizations only
recall({ reflects: 'only' });

// Clustering mode
recall({ query: 'learning', as: 'clusters' });
```

### Reconsider

```typescript
// Update qualities
reconsider({
  id: 'exp_123',
  experience: ['embodied.sensing', 'mood.open'],
});

// Add pattern realization
reconsider({
  id: 'exp_456',
  reflects: ['exp_123', 'exp_234'],
});
```

### Release

```typescript
release({
  id: 'exp_789',
  reason: 'Test data during development',
});
```

## Current Implementation Status

**What Works Today:**

- Semantic search using transformer embeddings (all-MiniLM-L6-v2)
- Quality filtering and queries
- Unified scoring system
- Four core operations: experience(), recall(), reconsider(), release()
- Pattern realizations with `reflects` field
- Clustering analysis

**Next Priorities (from OPPORTUNITIES.md):**

1. Extensible recall (Score: 270) - Technical foundation for future features
2. Natural language quality parsing (Score: 189) - Better UX
3. Batch operations (Score: 162) - Performance optimization

## External Documentation

### Core References

- **MCP TypeScript SDK**: https://raw.githubusercontent.com/modelcontextprotocol/typescript-sdk/refs/heads/main/README.md
- **MCP Introduction**: https://modelcontextprotocol.io/introduction
- **Anthropic Cookbook**: https://github.com/anthropics/anthropic-cookbook

### Desktop Extension (DXT)

- **DXT Documentation**: https://github.com/anthropics/dxt/blob/main/README.md
- **DXT Manifest Spec**: https://github.com/anthropics/dxt/blob/main/MANIFEST.md
- **DXT Examples**: https://github.com/anthropics/dxt/tree/main/examples

## Key Documentation

- **LOOP.md** - Development methodology and commands
- **README.md** - Current API reference (what works today)
- **VISION.md** - Conceptual vision and future direction
- **OPPORTUNITIES.md** - Prioritized feature roadmap
- **EXPERIMENTS.md** - Active tests and hypotheses
- **LEARNINGS.md** - Validated insights from usage
- **PHILOSOPHY.md** - Theoretical foundations
