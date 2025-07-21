# Bridge

Bridge is an MCP (Model Context Protocol) server that enables shared experiential memory between humans and AI. It
captures meaningful moments with quality signatures, enabling pattern recognition and collaborative wisdom building.

## Overview

Bridge creates a persistent memory layer for AI interactions, allowing both humans and AI to:
- Capture experiences with dimensional qualities
- Recall past experiences through semantic search
- Discover patterns across accumulated experiences
- Build collaborative understanding over time

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/bridge.git
cd bridge

# Install dependencies
npm install

# Build the project
npm run build
```

## Quick Start

### As MCP Server

```bash
# Start the MCP server
npm start
```

### As Desktop Extension

See [DXT-README.md](./DXT-README.md) for Claude Desktop integration.

## Core Operations

### 1. Experience
Capture meaningful moments with quality signatures:
```javascript
experience("Just had a breakthrough with the algorithm", {
  experience: ["embodied.thinking", "mood.open", "purpose.goal"]
})
```

### 2. Recall
Search experiences with semantic, dimensional, and temporal scoring:
```javascript
// Semantic search
recall("breakthrough moments")

// Dimensional filtering
recall("mood.closed")  // Exact matches only

// Recent experiences
recall("recent")
```

### 3. Reconsider
Update experiences as understanding deepens:
```javascript
reconsider(experienceId, {
  experience: ["embodied.thinking", "mood.open", "focus.narrow"]
})
```

### 4. Release
Remove experiences that no longer serve:
```javascript
release(experienceId, "Test data cleanup")
```

## Quality Dimensions

Bridge uses seven dimensional pairs to capture experience qualities:

- **embodied**: thinking/sensing
- **focus**: narrow/broad  
- **mood**: open/closed
- **purpose**: goal/wander
- **space**: here/there
- **time**: past/future
- **presence**: individual/collective

## Development

Bridge maintains high code quality with comprehensive test coverage:
- **85.27%** line coverage (exceeds 80% target)
- **74.54%** branch coverage (exceeds 65% target)
- **88.1%** function coverage
- 100% coverage on all critical handler files

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run Bridge integration tests
npm run test:bridge

# Run the learning loop
npm run loop

# Lint and type check
npm run lint
npm run type-check
```

## Documentation

- [PHILOSOPHY.md](./PHILOSOPHY.md) - Core vision and principles
- [TECHNICAL.md](./TECHNICAL.md) - Implementation details
- [EXPERIMENTS.md](./EXPERIMENTS.md) - Active and completed experiments
- [LEARNINGS.md](./LEARNINGS.md) - Validated insights from usage
- [OPPORTUNITIES.md](./OPPORTUNITIES.md) - Prioritized feature roadmap
- [CLAUDE.md](./CLAUDE.md) - Claude Code development guide

## License

MIT License - see [LICENSE.md](./LICENSE.md)

## Contributing

Bridge uses a vision-driven development cycle. See [LOOP.md](./LOOP.md) for our methodology.

1. Check [OPPORTUNITIES.md](./OPPORTUNITIES.md) for prioritized features
2. Design experiments in [EXPERIMENTS.md](./EXPERIMENTS.md)
3. Run tests and capture learnings
4. Update documentation based on insights

## Current Status

- ✅ Core operations (experience, recall, reconsider, release)
- ✅ Semantic search with embeddings
- ✅ Dimensional filtering
- ✅ Unified scoring system
- ✅ Learning loop with recommendations
- 🚧 Pattern recognition (see OPPORTUNITIES.md)
- 🚧 Clustering analysis
- 🚧 Sequence analysis