# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the Bridge codebase.

## 🚀 Quick Start

```bash
npm install              # Install dependencies
npm run dev              # Run in development mode
npm test                 # Run tests
npm run quality-check    # Check code quality
```

## 🏗️ Architecture Overview

Bridge is an MCP (Model Context Protocol) server enabling shared experiential memory between humans and AI.

```text
MCP Client (Claude) → MCP Server → Tool Handlers → Services → Storage
                                                              ↓
                                                         Embeddings
```

### Core Components

| Component     | Path            | Purpose                                  |
| ------------- | --------------- | ---------------------------------------- |
| **MCP Layer** | `src/mcp/`      | Protocol implementation and tool routing |
| **Services**  | `src/services/` | Business logic and processing            |
| **Storage**   | `src/core/`     | Data persistence and types               |
| **Testing**   | `src/scripts/`  | Test infrastructure                      |

## 🛠️ API Reference

### Experience Tool

**Always use array format, even for single operations:**

```typescript
// Basic experience
experience({
  experiences: [
    {
      source: 'Finally got the tests passing!',
      emoji: '✅',
      experience: ['embodied.thinking', 'mood.open', 'purpose.goal'],
      context: 'After debugging the race condition', // Optional
    },
  ],
});

// With integrated recall (search)
experience({
  experiences: [
    {
      source: 'This bug is frustrating',
      emoji: '🐛',
      experience: ['mood.closed', 'embodied.thinking'],
    },
  ],
  recall: {
    query: 'authentication bugs',
    limit: 3,
  },
});

// With reasoning chain (nextMoment)
experience({
  experiences: [
    {
      source: 'I see a pattern emerging',
      emoji: '💡',
      who: 'Claude',
      experience: ['embodied.thinking', 'purpose.wander'],
    },
  ],
  nextMoment: {
    embodied: 'thinking',
    focus: 'narrow',
    mood: 'open',
    purpose: 'goal',
    space: 'here',
    time: false,
    presence: 'collective',
  },
});
```

### Reconsider Tool

```typescript
// Update experience
reconsider({
  reconsiderations: [
    {
      id: 'exp_123',
      experience: ['embodied.sensing', 'mood.open'],
    },
  ],
});

// Add pattern realization
reconsider({
  reconsiderations: [
    {
      id: 'exp_456',
      reflects: ['exp_123', 'exp_234'],
    },
  ],
});

// Release experience (integrated)
reconsider({
  reconsiderations: [
    {
      id: 'exp_789',
      release: true,
      releaseReason: 'Temporary emotional venting',
    },
  ],
});
```

## 🎯 Quality Dimensions

Bridge captures experiential moments through seven quality pairs:

| Quality      | Subtypes                     | Description                                  |
| ------------ | ---------------------------- | -------------------------------------------- |
| **embodied** | `.thinking`, `.sensing`      | How consciousness textures through body/mind |
| **focus**    | `.narrow`, `.broad`          | Attentional quality                          |
| **mood**     | `.open`, `.closed`           | Emotional atmosphere                         |
| **purpose**  | `.goal`, `.wander`           | Directional momentum                         |
| **space**    | `.here`, `.there`            | Spatial awareness                            |
| **time**     | `.past`, `.future`           | Temporal orientation                         |
| **presence** | `.individual`, `.collective` | Social quality                               |

Use dot notation for clear subtypes, base quality when mixed/unclear.

## 📋 Development Commands

### Core Development

```bash
npm run dev              # Watch mode
npm run build            # TypeScript compilation
npm run build:all        # Build + bundle
npm start                # Run bundled server
```

### Testing

```bash
npm test                 # Unit tests with coverage
npm run test:integration # Integration tests (real MCP client/server)
npm run test:all         # All tests (unit + integration)
npm run test:bridge      # Bridge scenario tests
npm run loop             # Learning loop analysis

# Test a specific file
npm test -- src/services/recall.test.ts

# Run integration tests for specific area
npm run test:integration -- --testPathPattern="experience"
```

### Quality Checks

```bash
npm run lint             # ESLint check
npm run lint:fix         # ESLint auto-fix
npm run type-check       # TypeScript checking
npm run quality-check    # Combined checks
npm run quality-check:full # Full quality suite
```

## 🔄 Development Process

Bridge follows: **VISION → OPPORTUNITIES → EXPERIMENTS → LEARNINGS → VISION**

See **LOOP.md** for complete methodology.

### Quality Standards

- **Test Coverage**: 81.64% line coverage, 88.95% function coverage
- **Unit Tests**: 705 tests across all modules
- **Integration Tests**: 63 tests with real MCP communication
- **Pre-commit**: Runs `lint:fix` and `type-check`
- **Pre-push**: Runs full `quality-check:full`

### Integration Tests

Bridge includes comprehensive integration tests that use real MCP client/server communication:

```bash
# Run integration tests
npm run test:integration

# Run specific integration test
npm run test:integration -- --testNamePattern="should handle pattern reflection"

# Configure test delays (in .env)
TEST_SCENARIO_DELAY=5000      # Between scenarios
TEST_API_CALL_DELAY=1000      # After API calls
TEST_TURN_DELAY=2000          # Between turns
```

Integration tests cover:

- Experience capture and recall
- Pattern realizations (reflects)
- Quality filtering and search
- Error handling and edge cases
- Performance and concurrent operations
- All completed experiments from EXPERIMENTS.md

## 💡 Usage Patterns

### Search via Experience Tool

```typescript
// Semantic search
experience({
  experiences: [
    {
      source: 'searching for debugging patterns',
      emoji: '🔍',
      experience: ['purpose.goal'],
    },
  ],
  recall: { query: 'debugging patterns' },
});

// Quality filtering
experience({
  experiences: [
    {
      source: 'finding closed mood moments',
      emoji: '🔍',
      experience: ['purpose.goal'],
    },
  ],
  recall: {
    qualities: {
      mood: 'closed',
      purpose: ['goal', 'wander'], // OR logic
    },
  },
});
```

### Reasoning Chains Example

```typescript
// 1. Start chain
await experience({
  experiences: [
    {
      source: 'Users report slow page loads',
      who: 'Human',
      emoji: '🐌',
      experience: ['mood.closed', 'purpose.goal'],
    },
  ],
  nextMoment: {
    /* qualities for next exploration */
  },
});

// 2. Continue with recall
await experience({
  experiences: [
    {
      source: 'Checking for similar issues',
      who: 'Claude',
      emoji: '🔍',
      experience: ['embodied.thinking'],
    },
  ],
  recall: { query: 'performance database' },
});

// 3. Complete chain
await experience({
  experiences: [
    {
      source: 'Found it! Connection pool too small',
      who: ['Human', 'Claude'],
      emoji: '💡',
      experience: ['mood.open', 'presence.collective'],
    },
  ],
});
// Auto-generates reflection on the journey
```

## 📚 Key Files

### Documentation

- **README.md** - User-facing API reference
- **LOOP.md** - Development methodology
- **VISION.md** - Conceptual foundations
- **OPPORTUNITIES.md** - Feature roadmap
- **EXPERIMENTS.md** - Active experiments
- **LEARNINGS.md** - Validated insights

### Code Structure

- `src/mcp/` - MCP protocol layer
- `src/services/` - Business logic
- `src/core/` - Core types and storage
- `src/utils/` - Utilities

## 🔗 External References

### MCP Documentation

- [MCP TypeScript SDK](https://raw.githubusercontent.com/modelcontextprotocol/typescript-sdk/refs/heads/main/README.md)
- [MCP Introduction](https://modelcontextprotocol.io/introduction)
- [Anthropic Cookbook](https://github.com/anthropics/anthropic-cookbook)

### Desktop Extension (DXT)

- [DXT Documentation](https://github.com/anthropics/dxt/blob/main/README.md)
- [DXT Manifest Spec](https://github.com/anthropics/dxt/blob/main/MANIFEST.md)
- [DXT Examples](https://github.com/anthropics/dxt/tree/main/examples)

## ⚡ Current Status

### ✅ Working Features

- Semantic search with embeddings (all-MiniLM-L6-v2)
- Quality filtering and queries
- Unified scoring system
- Experience tool with integrated recall
- Reconsider tool with integrated release
- Pattern realizations (`reflects` field)
- Reasoning chains with `nextMoment`
- Auto-reflection generation
- Clustering analysis

### 🚧 Next Priorities

1. Natural language quality parsing
2. Batch operations for performance
3. Enhanced pattern recognition

---

_For implementation details, see the inline comments in the codebase._
