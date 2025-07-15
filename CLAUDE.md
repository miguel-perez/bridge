# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Bridge is a phenomenological data capture system for distributed cognition between humans and AI. It's packaged as a Claude Desktop Extension (DXT) using the Model Context Protocol (MCP). The system captures and analyzes experiential data across seven phenomenological dimensions: embodied, attentional, affective, purposive, spatial, temporal, and intersubjective.

## Essential Commands

### Development
- `npm run dev` - Start development server with watch mode
- `npm run build` - Compile TypeScript to JavaScript
- `npm run bundle` - Bundle with esbuild for distribution
- `npm run build:all` - Build and bundle in sequence

### Testing
- `npm test` - Run all unit tests (excludes LLM integration)
- `npm run test:unit` - Unit tests only
- `npm run test:bridge` - Interactive Bridge test scenarios (requires API key)
- `npm run test:integration` - Run all Bridge scenarios (requires API key)
- `npm run test:fixtures` - Generate synthetic test fixture file
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate coverage report

#### Bridge Test Scenarios
User-outcome focused test scenarios that validate real Bridge use cases:
- `stress-pattern-evolution` - Work stress pattern evolution over time
- `memory-exploration` - Personal experience discovery  
- `creative-capture` - Creative breakthrough documentation
- `relationship-insights` - Social connection pattern discovery
- `first-time-exploration` - New user Bridge discovery
- `error-recovery` - Graceful error handling

**Test Data Options:**
- Uses synthetic test fixtures by default (36 diverse experiences across 6 months)
- `--fixtures` - Use synthetic test data (default)
- `--use-existing` - Use your actual bridge.json data (be careful!)

**Results Tracking:**
- All results automatically saved to `/test-results/` directory
- `latest-run.json` - Most recent test run
- `trend-data.json` - Historical pass rates and performance metrics
- Individual scenario results with full conversation logs

Example: `npm run test:bridge relationship-insights`

### Code Quality
- `npm run lint` - Check for linting errors
- `npm run lint:fix` - Auto-fix linting issues
- `npm run format` - Format code with Prettier
- `npm run type-check` - Run TypeScript type checking

### DXT Packaging
- `./build-dxt.sh` (macOS/Linux) or `./build-dxt.ps1` (Windows) - Package as Claude Desktop Extension
- Creates a flat-structure DXT without subdirectories (workaround for Claude Desktop bug)
- Bundles all code into a single `index.js` file (~118KB total package size)

### Utilities
- `npm run clean` - Remove dist directory
- `npm run migrate-schema` - Migrate data schema to latest version
- `npm run migrate-embeddings-consolidation` - Consolidate embeddings to new format
- `npm run validate:manifest` - Validate DXT manifest file structure

## Architecture

### Core Components

1. **MCP Server** (`/src/mcp/`)
   - `server.ts` - Main MCP server implementation
   - `handlers.ts` - Tool request handlers for capture, search, update, release
   - `tools.ts` - Tool definitions and schemas
   - Individual handlers: `capture-handler.ts`, `search-handler.ts`, `update-handler.ts`, `release-handler.ts`

2. **Services** (`/src/services/`)
   - `capture.ts` - Creates and persists experiential captures
   - `search.ts` - Multi-modal search (text, vector, semantic)
   - `embeddings.ts` - Generates and manages embeddings
   - `enhanced-embedding.ts` - Enhanced embedding generation with semantic context
   - `enrich.ts` - LLM-based enrichment of captures
   - `vector-store.ts` - In-memory vector store for similarity search
   - `consolidated-vector-store.ts` - Consolidated vector storage implementation
   - `release.ts` - Handles releasing/deleting experiential data

3. **Core Domain** (`/src/core/`)
   - `types.ts` - TypeScript interfaces for all data models
   - `storage.ts` - JSON file persistence layer
   - `search.ts` - Core search functionality

4. **Scripts** (`/src/scripts/`)
   - `bridge-test.ts` - User-outcome focused integration test scenarios
   - `test-fixtures.ts` - Generate synthetic test data
   - `migrate-schema.ts` - Data schema migration utilities
   - `migrate-embeddings-consolidation.ts` - Embedding consolidation migration
   - `extract-experiencer-sources.ts` - Extract unique experiencer sources

### Data Flow
1. User captures experience via MCP tool → 
2. System creates ExperienceCapture with phenomenological ratings and narrative → 
3. Background processing generates embeddings → 
4. Data stored in local JSON file → 
5. Search queries use multi-modal scoring across text, vectors, and semantics

### Seven Phenomenological Dimensions
- **Embodied**: Physical sensations and bodily experience
- **Attentional**: Focus and awareness qualities
- **Affective**: Emotional tone and feeling
- **Purposive**: Intention and goal-directedness
- **Spatial**: Environmental and contextual awareness
- **Temporal**: Time perception and dynamics
- **Intersubjective**: Social and relational aspects

### Search Scoring Weights
- Text matching: 40%
- Vector similarity: 30%
- Semantic relevance: 20%
- Filter matches: 10%

## Development Patterns

### TypeScript Conventions
- Strict mode enabled - avoid `any` types
- Use explicit return types for functions
- Prefer interfaces over type aliases for object shapes
- Use ES modules (`import`/`export`)

### Error Handling
- All MCP handlers return proper error responses
- Storage operations handle file system errors gracefully
- Vector store rebuilds automatically on corruption
- No console.log in MCP mode - use log/message notifications instead

### Testing Strategy
- Unit tests for pure functions and services
- Integration tests for LLM interactions (separate test suite)
- Mock external dependencies in unit tests
- Use `.test.ts` suffix for test files
- User-outcome focused test scenarios based on usability testing principles

### File Organization
- Keep related functionality together in service modules
- Separate MCP protocol layer from business logic
- Utils should be pure functions without side effects

## Special Considerations

### Local-First Design
- All data stored locally in JSON format
- No external database dependencies
- Embeddings cached for performance
- Automatic migration for schema changes

### Performance
- In-memory vector store for fast similarity search
- Lazy loading of embeddings when needed
- Efficient JSON streaming for large datasets
- Batch processing for embedding generation

### MCP Tool Patterns
- Tools always validate input with Zod schemas
- Return structured responses with clear error messages
- Handle partial matches and fuzzy search
- Support both specific IDs and natural language queries
- All tools support both individual and batch operations where applicable

### Four Core MCP Tools
1. **capture** - Create new experiential records with phenomenological analysis
2. **search** - Find experiences through multi-modal search
3. **update** - Modify existing experiences while preserving integrity
4. **release** - Remove experiences with gratitude and reasoning

### Development Tips
- Run `npm run dev` for live reloading during development
- Check `manifest.json` for tool configurations
- Use debug mode in Claude Desktop for troubleshooting
- Test MCP tools via Claude Desktop after packaging with build-dxt script
- Use `npm run test:bridge <scenario>` to test specific Bridge scenarios
- Run `npm run test:fixtures` to generate fresh synthetic test data
- When debugging MCP issues, check the notification system as console.log is redirected