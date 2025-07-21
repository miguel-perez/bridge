# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## The Learning Loop

```text
VISION → OPPORTUNITIES → EXPERIMENTS → LEARNINGS → VISION
```

1. **Understand methodology**: Check LOOP.md
2. **Find opportunity**: Check OPPORTUNITIES.md
3. **Run experiment**: Add to EXPERIMENTS.md, design and run test
4. **Review learnings**: Check LEARNINGS.md for insights
5. **Update vision**: Refine based on learnings

## Commands

```bash
# Development
npm run dev                       # Start MCP server in watch mode
npm run build                     # Build TypeScript to dist/
npm run lint                      # Run ESLint on src/**/*.ts
npm run lint:fix                  # Auto-fix linting issues
npm run type-check                # Type check without building

# Testing
npm test                          # Run unit tests with Jest
npm run test:bridge               # Run all Bridge test scenarios in parallel
npm run test:bridge <scenario>    # Run specific scenario (autonomous-bridge, with-bridge, without-bridge)
npm run test:all                  # Run tests then learning loop
npm run loop                      # Run learning loop analysis on test results

# Build & Deploy
npm run build:all                 # Build and bundle for production
./build-dxt.sh                    # Build Desktop Extension (Unix)
.\build-dxt.ps1                   # Build Desktop Extension (Windows)
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
   - `recall.ts` - Semantic search with multiple strategies
   - `reconsider.ts` - Updates existing experiences
   - `release.ts` - Removes experiences
   - `embeddings.ts` - @xenova/transformers for semantic vectors
   - Services handle business logic and return structured results

3. **Storage** (`src/core/`)
   - `storage.ts` - JSON persistence to `~/.bridge/experiences.json`
   - `types.ts` - Core data structures (Source, Experience, etc.)
   - Experiences stored with embeddings for semantic search

4. **Testing Infrastructure** (`src/scripts/`)
   - `test-runner.ts` - Parallel test execution with three scenarios
   - `learning-loop.ts` - Opus 4 analyzes test results using sequential thinking
   - Tests save individually to prevent data loss

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

### Test Scenarios

- **autonomous-bridge**: Can AI use Bridge for self-awareness?
- **with-bridge**: Conversation with Bridge tools available
- **without-bridge**: Control test without tools

### Important Context

- Experiences have "quality signatures" - sparse arrays of prominent dimensions
- The learning loop updates documentation automatically based on test insights
- Tests run in parallel and save incrementally to handle timeouts
- Sequential thinking is simplified (no forced categorization) to prevent Opus timeouts

## External Documentation

### Core References
- **MCP TypeScript SDK**: https://raw.githubusercontent.com/modelcontextprotocol/typescript-sdk/refs/heads/main/README.md
- **MCP Introduction**: https://modelcontextprotocol.io/introduction
- **Anthropic Cookbook**: https://github.com/anthropics/anthropic-cookbook

### Desktop Extension (DXT)
- **DXT Documentation**: https://github.com/anthropics/dxt/blob/main/README.md
- **DXT Manifest Spec**: https://github.com/anthropics/dxt/blob/main/MANIFEST.md
- **DXT Examples**: https://github.com/anthropics/dxt/tree/main/examples

*See PHILOSOPHY.md for impact, LOOP.md for methodology, VISION.md for roadmap*