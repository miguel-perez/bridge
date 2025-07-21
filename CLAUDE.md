# CLAUDE.md

**Document Purpose**: This file provides guidance to Claude Code (claude.ai/code) when working with code in this
repository. It contains practical commands, architecture overview, and development context needed for day-to-day coding
tasks.

**For Developers**: Use this as your quick reference for commands, architecture, and testing approaches.

## Development Process

Bridge follows a continuous learning loop: **VISION → OPPORTUNITIES → EXPERIMENTS → LEARNINGS → VISION**

See **LOOP.md** for the complete development workflow, commands, and methodology.

## Architecture

### Core Flow

Bridge is an MCP (Model Context Protocol) server that enables shared experiential memory between humans and AI. The
architecture follows a service-oriented pattern:

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
   - `recall.ts` - Semantic search and dimensional filtering
   - `unified-scoring.ts` - Dynamic scoring system for recall
   - `reconsider.ts` - Updates existing experiences
   - `release.ts` - Removes experiences
   - `embeddings.ts` - @xenova/transformers for semantic vectors
   - Services handle business logic and return structured results

3. **Storage** (`src/core/`)
   - `storage.ts` - JSON persistence to `~/.bridge/experiences.json`
   - `types.ts` - Core data structures (Source, Experience, etc.)
   - `config.ts` - Centralized configuration and thresholds
   - `dimensions.ts` - Known dimension definitions
   - Experiences stored with embeddings for semantic search

4. **Testing Infrastructure** (`src/scripts/`)
   - `test-runner.ts` - Parallel test execution with three scenarios
   - `learning-loop.ts` - Opus 4 analyzes test results using sequential thinking
   - Unit tests co-located with source files (*.test.ts)

### Data Flow Example

```typescript
// 1. Claude calls experience tool
experience({ source: "I feel anxious", experience: ["embodied.sensing", "mood.closed"] })

// 2. MCP server routes to ExperienceHandler
// 3. Handler validates and calls ExperienceService
// 4. Service creates Source record, generates embedding
// 5. Storage saves to JSON, returns result
// 6. Handler formats user-friendly response
// 7. Claude receives: "Experienced (embodied.sensing, mood.closed)"
```

### Current Implementation Status

**What Works Today:**
- Semantic search using transformer embeddings (all-MiniLM-L6-v2)
- Dimensional filtering and queries
- Unified scoring system
- Four core operations: experience(), recall(), reconsider(), release()

**Next Priorities (from OPPORTUNITIES.md):**
1. Pattern realizations with reflects field (Score: 560)
2. Clustering mode (Score: 378)
3. Advanced filtering options (Score: 280)

**Key Context:**
- Experiences have "quality signatures" - sparse arrays of prominent dimensions
- Tests run in parallel with three scenarios
- Sequential thinking works reliably with Opus 4
- See TECHNICAL.md for current API reference

## External Documentation

### Core References
- **MCP TypeScript SDK**:
https://raw.githubusercontent.com/modelcontextprotocol/typescript-sdk/refs/heads/main/README.md
- **MCP Introduction**: https://modelcontextprotocol.io/introduction
- **Anthropic Cookbook**: https://github.com/anthropics/anthropic-cookbook

### Desktop Extension (DXT)
- **DXT Documentation**: https://github.com/anthropics/dxt/blob/main/README.md
- **DXT Manifest Spec**: https://github.com/anthropics/dxt/blob/main/MANIFEST.md
- **DXT Examples**: https://github.com/anthropics/dxt/tree/main/examples

## Key Documentation

- **LOOP.md** - Development methodology and commands
- **TECHNICAL.md** - Current API reference (what works today)
- **VISION.md** - Conceptual vision and future direction
- **OPPORTUNITIES.md** - Prioritized feature roadmap
- **EXPERIMENTS.md** - Active tests and hypotheses
- **LEARNINGS.md** - Validated insights from usage
- **PHILOSOPHY.md** - Theoretical foundations