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
- Cloud embeddings (OpenAI) for enhanced semantic search
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
# Edit .env and add your OPENAI_API_KEY if running tests

# Build the project
npm run build
```

## Quick Start

### As Desktop Extension (Recommended)

1. Install Bridge in Claude Desktop (see [DXT-README.md](./DXT-README.md))
2. Configure your preferred embedding provider in Claude Desktop settings:
   - **Default**: Local TensorFlow embeddings (no configuration needed)
   - **OpenAI**: Cloud embeddings for enhanced search (requires API key)
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
      context: 'Working on the sorting optimization for three days', // Optional context
    },
  ],
  // Optional: Declare next experiential state for reasoning chains
  nextMoment: {
    embodied: 'thinking',
    focus: 'broad',
    mood: 'open',
    purpose: 'wander',
    space: false,
    time: false,
    presence: false,
  },
  // Optional: Search for related experiences during capture
  recall: {
    query: 'algorithm optimization breakthrough',
    limit: 3,
  },
});
```

### 2. Search via Experience (Integrated Recall)

Every search is an experience! Bridge now integrates search directly into the experience tool, recognizing that the act of searching is itself an experiential moment with purpose and qualities.

#### Basic Search while Capturing

```javascript
// Capture a moment while searching for related experiences
experience({
  experiences: [
    {
      source: 'This bug is really confusing me',
      emoji: '🐛',
      experience: ['mood.closed', 'embodied.thinking'],
    },
  ],
  recall: {
    search: 'debugging confusion similar bugs',
    limit: 3,
  },
});
// Returns: Your experience + related experiences found

// Search by ID while capturing
experience({
  experiences: [
    {
      source: 'Following up on our earlier discussion',
      emoji: '🔗',
      experience: ['purpose.goal', 'presence.collective'],
    },
  ],
  recall: {
    ids: 'exp_123', // Reference specific past experience
  },
});
```

#### Advanced Search Features

All the powerful search capabilities from the standalone recall tool are available:

```javascript
// Quality filtering during capture
experience({
  experiences: [
    {
      source: 'Looking for moments of creative breakthrough',
      emoji: '🔍',
      experience: ['purpose.wander', 'embodied.thinking'],
    },
  ],
  recall: {
    qualities: { mood: 'open', embodied: 'thinking' },
    limit: 5,
  },
});

// Group results by similarity
experience({
  experiences: [
    {
      source: 'Exploring patterns in my anxiety',
      emoji: '🌀',
      experience: ['embodied.sensing', 'purpose.wander'],
    },
  ],
  recall: {
    search: 'anxiety nervous worry',
    group_by: 'similarity',
    limit: 10,
  },
});

// Find pattern realizations
experience({
  experiences: [
    {
      source: 'Seeking insights about my learning patterns',
      emoji: '💡',
      experience: ['embodied.thinking', 'purpose.goal'],
    },
  ],
  recall: {
    reflects: 'only', // Find experiences that reflect on others
    who: 'Human',
    limit: 5,
  },
});
```

#### Migration Guide

If you were using the standalone `recall` tool, simply wrap your search in an experience:

```javascript
// Old way (no longer available):
recall({
  searches: [{ search: 'breakthrough moments' }],
});

// New way - recognize search as an experience:
experience({
  experiences: [
    {
      source: 'Searching for breakthrough moments',
      emoji: '🔍',
      experience: ['purpose.goal', 'embodied.thinking'],
    },
  ],
  recall: {
    search: 'breakthrough moments',
  },
});
```

This approach acknowledges that:

- Every search has intent and emotional quality
- The act of searching is part of your experiential journey
- Search results connect to the current moment
- Your search itself becomes part of the memory tapestry

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

Remove experiences that no longer serve using the reconsider tool:

```javascript
reconsider({
  reconsiderations: [
    {
      id: experienceId,
      release: true,
      releaseReason: 'Test data cleanup',
    },
  ],
});
```

### 5. Flow Tracking (NextMoment)

Declare experiential states for reasoning chains with auto-reflection:

```javascript
// Start exploring with nextMoment
const result1 = await experience({
  experiences: [
    {
      source: 'This bug is confusing - users report random logouts',
      emoji: '🐛',
      experience: ['mood.closed', 'embodied.thinking'],
    },
  ],
  nextMoment: {
    embodied: 'thinking',
    focus: 'narrow',
    mood: false,
    purpose: 'goal',
    space: false,
    time: false,
    presence: false,
  }, // Declare what experiential state to explore next
});
// Returns: {
//   content: [
//     { type: 'text', text: '🐛 Experienced (mood.closed, embodied.thinking)' }
//   ],
//   nextMoment: { embodied: 'thinking', focus: 'narrow', ... },
//   flow: {
//     moments: [{ id: 'exp_123', source: '...', ... }],
//     transitions: []
//   }
// }

// Experience with integrated recall
const result2 = await experience({
  experiences: [
    {
      source: 'Looking at session management code',
      emoji: '🔍',
      experience: ['embodied.thinking', 'focus.narrow'],
    },
  ],
  recall: {
    query: 'logout authentication session timeout',
    limit: 3,
  }, // Search for related experiences during capture
});
// Returns: {
//   content: [
//     { type: 'text', text: '🔍 Experienced (embodied.thinking, focus.narrow)' },
//     { type: 'text', text: '🔍 Related experiences:\n1. "Session timeout in UTC..."' }
//   ],
//   flow: { moments: [...], transitions: [...] }
// }

// Complete the flow (no nextMoment)
const result3 = await experience({
  experiences: [
    {
      source: 'Fixed! It was a timezone mismatch in session expiry',
      emoji: '✅',
      experience: ['mood.open', 'embodied.thinking', 'purpose.goal'],
    },
  ],
});
// Returns: {
//   content: [
//     { type: 'text', text: '✅ Experienced (mood.open, embodied.thinking, purpose.goal)' }
//   ],
//   flow: {
//     moments: [...],
//     transitions: [...],
//     reflection: { // Auto-generated when chain completes
//       source: 'Moved from mood.closed to mood.open through persistent exploration',
//       emoji: '🔮',
//       experience: ['embodied.thinking', 'time.past', 'presence.collective'],
//       reflects: ['exp_123', 'exp_124', 'exp_125']
//     }
//   }
// }
```

**Key Features:**

- **NextMoment Pattern**: Declare experiential state to explore next in reasoning chains
- **Integrated Recall**: Search for related experiences while capturing new ones
- **Flow Tracking**: Automatic tracking of experiential journeys with transitions
- **Auto-Reflection**: Generates pattern realizations when chains complete
- **Enhanced Reconsider**: Supports both update and release modes
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

- **81.64%** line coverage (exceeds 80% target)
- **69.26%** branch coverage (exceeds 65% target)
- **88.95%** function coverage
- **768 total tests** (705 unit, 63 integration)
- 100% coverage on all critical handler files

### Testing

```bash
# Run unit tests with coverage
npm test

# Run integration tests (real MCP client/server)
npm run test:integration

# Run all tests (unit + integration)
npm run test:all

# Run specific test file
npm test -- src/services/experience.test.ts

# Run tests matching pattern
npm run test:integration -- --testNamePattern="should handle"
```

### Integration Testing

Bridge includes comprehensive integration tests that validate the complete MCP flow:

- **Real MCP Communication**: Tests use actual client/server protocol
- **Isolated Environments**: Each test runs in a clean temporary directory
- **Complete Workflows**: Tests validate end-to-end user journeys
- **Performance Testing**: Includes stress tests and concurrent operations

See [src/test-utils/README.md](src/test-utils/README.md) for integration test documentation.

### Code Quality

```bash
# Lint and type check
npm run lint
npm run type-check
```

## Troubleshooting

### Embeddings in Claude Desktop

Bridge now supports multiple embedding providers that work seamlessly in Claude Desktop:

- **Cloud Providers (OpenAI)**: Work perfectly in Claude Desktop with just an API key
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
   - OpenAI embeddings
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

If using Bridge as a Desktop Extension, configure it directly in the Claude Desktop UI:

1. Open Claude Desktop settings
2. Navigate to MCP Servers → Bridge
3. Configure your preferences:
   - **Data File Path**: Where to store experiences (default: ~/.bridge/experiences.json)
   - **OpenAI API Key**: Enables enhanced semantic search and future AI-powered features
   - **Debug Mode**: Enable for troubleshooting

**Note**: Bridge automatically detects and uses OpenAI embeddings when an API key is provided. No need to manually select a provider!

#### Via Environment Variables

Alternatively, configure via environment variables:

```bash
# .env
OPENAI_API_KEY=your-api-key      # Automatically enables OpenAI embeddings
BRIDGE_FILE_PATH=~/.bridge/experiences.json  # Optional: data location
BRIDGE_DEBUG=true                # Optional: debug logging

# Advanced: Force local embeddings even with API key
BRIDGE_EMBEDDING_PROVIDER=default  # Forces TensorFlow.js (~25MB download)
```

### Core Components

- **MCP Layer**: Handles Model Context Protocol communication
- **Tool Handlers**: Process tool calls and format responses
- **Services**: Core business logic (experience, recall, reconsider)
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

- ✅ Core operations (experience, recall, reconsider)
- ✅ **Enhanced recall tool with advanced grouping** (similarity, experiencer, date, qualities, perspective)
- ✅ **Comprehensive parameter support** with rich feedback generation
- ✅ **Advanced quality filtering** with presence/absence and boolean expressions
- ✅ **Pagination and sorting** with metadata tracking
- ✅ **Composite emoji validation** supporting all Unicode sequences
- ✅ **Improved similar experience formatting** with better readability
- ✅ **NextMoment reasoning chains** with auto-reflection generation
- ✅ **Integrated recall** in Experience tool for seamless memory work
- ✅ **Enhanced Reconsider** with both update and release modes
- ✅ Semantic search with multiple embedding providers
- ✅ Claude Desktop UI configuration for all providers
- ✅ Quality filtering and unified scoring
- ✅ Pattern recognition with clustering analysis
- ✅ Simplified test runner with mock responses
- ✅ Progressive vector enhancement architecture
- ✅ Local (TensorFlow.js) and cloud (OpenAI) embeddings
- ✅ Qdrant integration for million+ scale deployments
- 🚧 Sequence analysis (see OPPORTUNITIES.md)
