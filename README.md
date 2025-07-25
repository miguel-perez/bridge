# Bridge

Bridge is an MCP (Model Context Protocol) server that enables shared experiential memory between humans and AI. It
captures meaningful moments with quality signatures, enabling pattern recognition and collaborative wisdom building.

## Overview

Bridge creates a persistent memory layer for AI interactions, allowing both humans and AI to:

- Capture experiences with quality signatures
- Recall past experiences through semantic search
- Discover patterns through clustering analysis
- Build collaborative understanding over time

**New**: Configure embedding providers directly in Claude Desktop! Choose from:
- Zero-config quality search (default)
- Cloud embeddings (Voyage AI, OpenAI) for enhanced semantic search
- Local embeddings (TensorFlow.js) for offline use
- Qdrant vector database for million+ scale deployments

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

### As Desktop Extension (Recommended)

1. Install Bridge in Claude Desktop (see [DXT-README.md](./DXT-README.md))
2. Configure your preferred embedding provider in Claude Desktop settings:
   - **None**: Works out of the box, no configuration needed
   - **Cloud**: Add your Voyage AI or OpenAI API key for better search
   - **Local**: Choose TensorFlow for offline embeddings
3. Start using Bridge commands in your conversations!

### As MCP Server

```bash
# Start the MCP server
npm start
```

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

Bridge now supports multiple embedding providers that work seamlessly in Claude Desktop:

- **Cloud Providers (Voyage AI, OpenAI)**: Work perfectly in Claude Desktop with just an API key
- **Local Provider (TensorFlow.js)**: Downloads models locally, no API key needed
- **Default (None)**: Quality-based search works without any configuration

The previous issue with @xenova/transformers has been resolved through the progressive vector enhancement architecture. You can now choose the embedding provider that best fits your needs through the Claude Desktop settings.

## Architecture

Bridge follows a service-oriented architecture with progressive enhancement:

```
MCP Client (Claude) → MCP Server → Tool Handlers → Services → Storage
                                                         ↓
                                              Embedding Providers
                                                         ↓
                                                  Vector Stores
```

### Progressive Vector Enhancement

Bridge supports multiple levels of vector search capabilities:

1. **Level 0: Zero-Config (Default)**
   - Quality-only search with no embeddings
   - No API keys or external dependencies
   - Works everywhere including Claude Desktop

2. **Level 1: Cloud Embeddings**
   - Voyage AI or OpenAI embeddings
   - Better semantic search quality
   - Requires API key

3. **Level 2: Local Embeddings**
   - TensorFlow.js local embeddings
   - No API keys needed
   - ~25MB model download
   - Universal Sentence Encoder

4. **Level 3: Advanced Vector Store**
   - Qdrant for million+ scale search
   - Advanced filtering and performance
   - Local or cloud deployment
   - REST API integration

### Configuration

#### Via Claude Desktop (Recommended)

If using Bridge as a Desktop Extension, you can configure embedding providers directly in the Claude Desktop UI:

1. Open Claude Desktop settings
2. Navigate to MCP Servers → Bridge
3. Configure your preferred embedding provider:
   - **None (Default)**: Quality-only search, no API keys needed
   - **Voyage AI**: Best quality embeddings (requires API key from voyageai.com)
   - **OpenAI**: Good quality embeddings (requires API key from platform.openai.com)
   - **TensorFlow**: Local embeddings, no API key needed (~25MB download)
4. For Qdrant (advanced users):
   - Set Qdrant URL (default: http://localhost:6333)
   - Add API key if using Qdrant Cloud
   - Customize collection name if needed

#### Via Environment Variables

Alternatively, configure embedding providers via environment variables:

```bash
# .env
BRIDGE_EMBEDDING_PROVIDER=voyage  # or openai, tensorflow, none (default)
VOYAGE_API_KEY=your-api-key
VOYAGE_MODEL=voyage-3-large      # Optional: model selection
VOYAGE_DIMENSIONS=1024           # Optional: output dimensions
```

See [.env.example](./.env.example) for all configuration options.

### Core Components

- **MCP Layer**: Handles Model Context Protocol communication
- **Tool Handlers**: Process tool calls and format responses
- **Services**: Core business logic (experience, recall, reconsider, release)
- **Embedding Providers**: Pluggable text-to-vector conversion
- **Vector Stores**: Pluggable vector storage and search
- **Storage**: JSON persistence with optional embeddings

## Documentation

- [PHILOSOPHY.md](./PHILOSOPHY.md) - Core vision and principles
- [README.md](./README.md) - Implementation details and API reference
- [EXPERIMENTS.md](./EXPERIMENTS.md) - Active and completed experiments
- [LEARNINGS.md](./LEARNINGS.md) - Validated insights from usage
- [OPPORTUNITIES.md](./OPPORTUNITIES.md) - Prioritized feature roadmap
- [CLAUDE.md](./CLAUDE.md) - Claude Code development guide
- [docs/EXTERNAL-REFERENCES.md](./docs/EXTERNAL-REFERENCES.md) - External API documentation
- [docs/MIGRATION-GUIDE.md](./docs/MIGRATION-GUIDE.md) - Migration guide for v0.2.0

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
- ✅ Semantic search with multiple embedding providers
- ✅ Claude Desktop UI configuration for all providers
- ✅ Quality filtering and unified scoring
- ✅ Pattern recognition with clustering analysis
- ✅ Learning loop with recommendations
- ✅ Progressive vector enhancement architecture
- ✅ Local (TensorFlow.js) and cloud (Voyage, OpenAI) embeddings
- ✅ Qdrant integration for million+ scale deployments
- 🚧 Sequence analysis (see OPPORTUNITIES.md)
