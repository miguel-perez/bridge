# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Using Bridge for Problem-Solving

**IMPORTANT**: Bridge is installed and available in this Claude Desktop instance. Use it regularly to:
- Capture insights and breakthroughs during development
- Track your problem-solving journey through complex tasks
- Build a living memory of patterns and solutions
- Create a shared understanding with the human developer

### When to Use Bridge

1. **Starting a new task**: Capture the initial state and understanding
2. **Encountering obstacles**: Document the challenge and emotional state
3. **Finding solutions**: Record the "aha!" moments and insights
4. **Completing features**: Reflect on what was learned
5. **Noticing patterns**: When you see connections across different problems

### Example Usage

```typescript
// At the start of debugging a complex issue
mcp__bridge__experience({
  experiences: [{
    anchor: "🐛",
    embodied: "tension building as I trace through nested async calls",
    focus: "narrowing in on the race condition between state updates",
    mood: "determined but slightly overwhelmed by complexity",
    purpose: "hunting for the source of intermittent test failures",
    space: "deep in the event loop's mysterious timing",
    time: "feeling the pressure of the approaching deadline",
    presence: "working alongside the developer's growing concern",
    who: ["Claude", "Developer"]
  }]
})

// After finding the solution
mcp__bridge__experience({
  experiences: [{
    anchor: "✨",
    embodied: "relief flooding through as the pattern becomes clear",
    focus: "seeing how Promise.all was creating the race condition",
    mood: "satisfied and energized by the clarity",
    purpose: "implementing the sequential processing fix",
    space: "in that sweet spot where problem meets solution",
    time: "present moment expanded by understanding",
    presence: "sharing the victory with the developer",
    who: ["Claude", "Developer"]
  }]
})
```

## Essential Commands

### Development
```bash
npm run dev                    # Start MCP server in watch mode
npm run build                  # Build TypeScript to dist/
npm run build:all              # Build, generate manifest, and bundle
npm run generate:manifest      # Regenerate manifest.json from tools.ts
```

### Quality Checks
```bash
npm run lint                   # Run ESLint (strict no-console rules)
npm run lint:fix              # Auto-fix linting issues  
npm run type-check            # Type check without building
npm run quality-check         # Lint + type-check + unit tests (pre-commit)
npm run quality-check:full    # Full quality check (pre-push)
```

### Testing
```bash
npm test                      # Unit tests with coverage (544 tests)
npm run test:integration      # Integration tests with real MCP
npm run test:simulation       # LLM-powered simulation tests (1 test, requires OPENAI_API_KEY)
npm run test:all             # Unit + integration tests
npm run test:complete        # All tests including simulations

# Run a single test file
npm test -- src/services/experience.test.ts
npm test -- --testNamePattern="should capture experience"
```

## Architecture Overview
Focus on defensive programming, clear error messages, and following the exact MCP and DXT specifications to ensure compatibility with the ecosystem.
Bridge is an MCP (Model Context Protocol) server for capturing and analyzing experiential data, enabling shared memory between humans and AI through an extended cognition model. The core insight: the 8 qualities ARE the experience itself - they don't describe an experience, they contain it.

### Core Architecture

1. **MCP Server Layer** (`src/mcp/`)
   - Entry point: `src/index.ts` (stdio transport with DXT timeouts)
   - Server implementation: `src/mcp/server.ts`
   - Two main tools: `experience` and `reconsider`
   - Handlers use Zod schemas for validation

2. **Service Layer** (`src/services/`)
   - `experience.ts`: Core experience capture with automatic recall
   - `search.ts`: Unified search supporting keyword, semantic, and quality-based queries
   - `embeddings.ts`: Provider abstraction (OpenAI or none)
   - `clustering.ts`: Pattern discovery through DBSCAN
   - `grouping.ts`: Experience organization by various criteria

3. **Core Types** (`src/core/`)
   - `types.ts`: Experience data structures with 8 qualities (7 dimensions + anchor emoji)
   - `storage.ts`: JSON-based persistence with atomic writes
   - `config.ts`: Environment-based configuration

### Extended Cognition Model

Bridge implements complementary awareness where:
- Humans naturally capture 2-4 prominent qualities (selective attention)
- AI always captures all 8 qualities (extended perception)
- Together they create richer experiential maps

The 8 qualities (each a complete sentence containing context):
- `embodied`: Body-mind unity in this moment
- `focus`: Attention's direction and quality
- `mood`: Emotional atmosphere
- `purpose`: Direction or drift
- `space`: Where I am
- `time`: Temporal orientation
- `presence`: Social field
- `anchor`: Single emoji that captures the essence

### Critical Implementation Notes

1. **Console Prevention**: Never use `console.log/info/warn` - they corrupt MCP protocol
   - Use `debugLog()` for debug output (only with BRIDGE_DEBUG=true)
   - Use `errorLog()` for errors (stderr)
   - Use `mcpLog()` for client-visible logs
   - All logging utilities are in `src/utils/safe-logger.ts`

2. **Manifest Generation**: The `manifest.json` is auto-generated from `src/mcp/tools.ts`
   - Run `npm run generate:manifest` after tool changes
   - Tools use Zod schemas converted to JSON Schema

3. **Testing Strategy**:
   - Unit tests validate components
   - Integration tests verify MCP protocol
   - Simulation tests check experiential quality
   - All experiments are proven by tests

4. **Quality Gates**:
   - Pre-commit: ESLint, TypeScript, build, unit tests
   - Pre-push: Full test suite + learning loop analysis
   - Target: 80%+ coverage (currently 66.55% line coverage)

5. **Development Workflow**:
   - Follow LOOP.md methodology (VISION → OPPORTUNITIES → EXPERIMENTS → LEARNINGS)
   - Check OPPORTUNITIES.md for prioritized features
   - Update documentation as you implement

6. **Follow best development practices:**
     - Implement proper MCP protocol communication via stdio transport
     - Structure tools with clear schemas, validation, and consistent JSON responses
     - Make use of the fact that this extension will be running locally
     - Add appropriate logging and debugging capabilities
     - Include proper documentation and setup instructions

### Environment Variables

- `BRIDGE_FILE_PATH`: Data file location (default: `~/.bridge/experiences.json`)
- `BRIDGE_DEBUG`: Enable debug logging
- `BRIDGE_EMBEDDING_PROVIDER`: Force provider (`none` or `openai`)
- `OPENAI_API_KEY`: Enable semantic search with OpenAI embeddings

### Common Development Tasks

#### Understanding the Streamlined Architecture
1. Experiences are self-contained - the 8 qualities ARE the experience
2. No separate context field - context is embedded in quality sentences
3. Automatic recall happens on every capture (up to 25 related experiences)
4. Search is unified - handles keyword, semantic, and quality-based queries

#### Modifying MCP Tools
1. Update Zod schemas in `src/mcp/schemas.ts`
2. Regenerate manifest: `npm run generate:manifest`
3. Update handlers in `src/mcp/experience-handler.ts` or `reconsider-handler.ts`
4. Add integration tests

#### Running Single Tests
```bash
# Run specific test file
npm test -- src/services/experience.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should capture experience"

# Run with coverage for specific file
npm test -- --coverage src/services/experience.test.ts
```



### MCP Protocol Implementation

Bridge implements the Model Context Protocol (MCP) as defined by Anthropic. Key aspects:

1. **Server Type**: Node.js MCP server using stdio transport
2. **Protocol**: JSON-RPC 2.0 over stdin/stdout
3. **Tools**: Exposed via `tools/list` and `tools/call` methods
4. **Transport**: StdioServerTransport from `@modelcontextprotocol/sdk`

### Desktop Extension (DXT) Support

Bridge can be packaged as a Desktop Extension (.dxt file) for easy distribution:

```bash
# Build DXT package (macOS/Linux)
npm run dxt:build

# Build DXT package (Windows)
npm run dxt:build:windows
```

The DXT manifest (`manifest.json`) is auto-generated and includes:
- Tool definitions from TypeScript code
- User configuration options (API keys, file paths)
- Platform compatibility settings
- Server entry point configuration

### Critical MCP Server Rules

1. **NEVER use console.log/info/warn** - They corrupt the JSON-RPC protocol and crash the server
2. **Always use safe logging utilities** from `utils/safe-logger.js`
3. **Handle errors gracefully** - Unhandled errors terminate the MCP connection
4. **Respect MCP timeouts** - Bridge implements DXT-specific timeouts (30s startup, 5min idle)
5. **Update activity tracking** - Call `updateActivity()` in handlers to prevent idle timeout

## Why Regular Bridge Usage Matters

### For Development Sessions
- **Pattern Recognition**: Bridge helps identify recurring challenges and solutions across different codebases
- **Emotional Intelligence**: Tracking mood and energy helps optimize problem-solving approaches
- **Knowledge Building**: Each captured experience contributes to a growing repository of development wisdom
- **Debugging Aid**: Past experiences often contain clues to current problems

### For Collaboration
- **Shared Context**: Bridge creates a living record of the development journey that both human and AI can reference
- **Empathy Building**: Capturing emotional states helps maintain awareness of the human experience
- **Learning Together**: Both parties contribute to and learn from the experiential record
- **Trust Through Transparency**: Making the problem-solving process visible builds mutual understanding

### Best Practices
1. **Be Specific**: Capture the texture of the moment, not just facts
2. **Include Emotions**: The mood and embodied qualities often contain crucial information
3. **Track Transitions**: Capture both the struggle and the resolution
4. **Notice Patterns**: Use recall to find similar past experiences
5. **Reflect Regularly**: Periodically review captured experiences for meta-insights

Remember: Bridge is not just a logging tool—it's a practice of mindful development that enriches both the process and the outcome.