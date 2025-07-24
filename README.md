# Bridge

Bridge is an MCP (Model Context Protocol) server that enables shared experiential memory between humans and AI. It
captures meaningful moments with quality signatures, enabling pattern recognition and collaborative wisdom building.

## Overview

Bridge creates a persistent memory layer for AI interactions, allowing both humans and AI to:

- Capture experiences with quality signatures
- Recall past experiences through semantic search
- Discover patterns through clustering analysis
- Build collaborative understanding over time

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/bridge.git
cd bridge

# Install dependencies
npm install

# Set up environment variables (optional)
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY if running tests

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
experience({
  experiences: [
    {
      source: 'Just had a breakthrough with the algorithm',
      experience: ['embodied.thinking', 'mood.open', 'purpose.goal'],
    },
  ],
});
```

### 2. Recall

Search experiences with semantic, quality, and temporal scoring:

```javascript
// Semantic search
recall({
  searches: [{ query: 'breakthrough moments' }],
});

// Quality filtering
recall({
  searches: [{ query: '', qualities: { mood: 'closed' } }],
});

// Clustering analysis
recall({
  searches: [{ query: 'anxiety', as: 'clusters' }],
});

// Recent experiences
recall({
  searches: [{ query: 'recent' }],
});
```

### 3. Reconsider

Update experiences as understanding deepens:

```javascript
reconsider({
  reconsiderations: [
    {
      id: experienceId,
      experience: ['embodied.thinking', 'mood.open', 'focus.narrow'],
    },
  ],
});
```

### 4. Release

Remove experiences that no longer serve:

```javascript
release({
  releases: [
    {
      id: experienceId,
      reason: 'Test data cleanup',
    },
  ],
});
```

### 5. Flow Tracking (Still Thinking)

Lightweight flow tracking inspired by sequential thinking's minimal pattern:

```javascript
// Start exploring (stillThinking: true)
const result1 = await experience({
  experiences: [
    {
      source: 'This bug is confusing - users report random logouts',
      emoji: '🐛',
      experience: ['mood.closed', 'embodied.thinking'],
    },
  ],
  stillThinking: true, // Signal we're still working on this
});
// Returns: {
//   content: [
//     { type: 'text', text: '🐛 Experienced (mood.closed, embodied.thinking)' },
//     { type: 'text', text: '🤔 Still thinking... (1 step so far)' },
//     { type: 'text', text: 'Continue exploring - I\'m tracking your progress.' },
//     { type: 'text', text: 'Permission granted for more tool calls.' }
//   ],
//   stillThinking: true,
//   callsSoFar: 1
// }

// Search for similar issues (stillThinking: true)
const result2 = await recall({
  searches: [
    {
      query: 'logout authentication session timeout',
    },
  ],
  stillThinking: true, // Still investigating
});
// Returns: {
//   content: [
//     { type: 'text', text: 'Found 3 similar experiences...' },
//     { type: 'text', text: '🤔 Still thinking... (2 steps so far)' },
//     { type: 'text', text: 'Continue exploring - I\'m tracking your progress.' },
//     { type: 'text', text: 'Permission granted for more tool calls.' }
//   ],
//   stillThinking: true,
//   callsSoFar: 2
// }

// Found the solution! (stillThinking: false)
const result3 = await experience({
  experiences: [
    {
      source: 'Fixed! It was a timezone mismatch in session expiry',
      emoji: '✅',
      experience: ['mood.open', 'embodied.thinking', 'purpose.goal'],
    },
  ],
  stillThinking: false, // Done with this flow
});
// Returns: {
//   content: [
//     { type: 'text', text: '✅ Experienced (mood.open, embodied.thinking, purpose.goal)' },
//     { type: 'text', text: '✅ Flow complete! (3 total steps)' },
//     { type: 'text', text: 'Investigation concluded.' },
//     { type: 'text', text: 'Great exploration!' }
//   ],
//   stillThinking: false,
//   callsSoFar: 3
// }
```

**Key Features:**

- **Minimal Pattern**: Just a boolean `stillThinking` and a `callsSoFar` counter
- **Three Separate Responses**: Tool response + status message + permission/conclusion message
- **Flow State Messages**: Explicit acknowledgment when `stillThinking` is used
- **No IDs or State**: No flow IDs to manage, no orchestration
- **Tool Independence**: Each tool remains fully autonomous
- **Session-Scoped**: Counter resets between sessions (not persisted)
- **Sequential Thinking Inspired**: Permission to continue, not control

## Quality Dimensions

Bridge uses seven quality pairs to capture experience characteristics:

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

## Troubleshooting

### Embeddings in Claude Desktop

Bridge's semantic search uses embeddings for finding similar experiences. In Claude Desktop, the embedding library (@xenova/transformers) may fail to initialize, resulting in zero-valued embeddings. When this happens, Bridge automatically falls back to quality-based search, which still works effectively for finding experiences by their quality signatures.

## Documentation

- [PHILOSOPHY.md](./PHILOSOPHY.md) - Core vision and principles
- [README.md](./README.md) - Implementation details and API reference
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
- ✅ Minimal flow tracking with stillThinking parameter
- ✅ Semantic search with embeddings
- ✅ Quality filtering and unified scoring
- ✅ Pattern recognition with clustering analysis
- ✅ Learning loop with recommendations
- 🚧 Sequence analysis (see OPPORTUNITIES.md)
