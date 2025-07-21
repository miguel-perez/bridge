---
description: Bridge MCP Server Development Rules
---

# Bridge Development Rules

## Project Overview
Bridge is an MCP (Model Context Protocol) server for shared experiential memory between humans and AI. It captures meaningful moments with quality signatures, enabling pattern recognition and collaborative wisdom building.

## Architecture & Patterns

### Core Architecture
- **MCP Layer** (`src/mcp/`): Protocol implementation, tool handlers, routing
- **Services** (`src/services/`): Business logic (experience, recall, unified-scoring)
- **Storage** (`src/core/`): JSON persistence, data structures, configuration
- **Testing** (`src/scripts/`): Integration tests, learning loop analysis

### Data Flow
```
MCP Client → MCP Server → Tool Handlers → Services → Storage
                                              ↓
                                         Embeddings
```

### Key Patterns
- **Service-oriented architecture** with clear separation of concerns
- **Zod schemas** for all MCP tool inputs (see `src/mcp/schemas.ts`)
- **Quality signatures** - sparse arrays of prominent dimensions for experiences
- **Unified scoring system** combining semantic, dimensional, temporal, and length factors

## Development Workflow

### Learning Loop Methodology
Bridge follows: **VISION → OPPORTUNITIES → EXPERIMENTS → LEARNINGS → VISION**

1. **Check current state**: Read `TECHNICAL.md` for implemented features
2. **Find next priority**: Check `OPPORTUNITIES.md` for scored features (400+ priority)
3. **Run tests**: `npm test` (unit), `npm run test:bridge` (integration)
4. **Analyze results**: `npm run loop` for recommendation-based analysis
5. **Update docs**: Keep `TECHNICAL.md` current with implementation

### Quality Standards
- **Test Coverage**: Maintain 80%+ line coverage, 65%+ branch coverage
- **Current Status**: 85.27% lines, 74.54% branches (see `README.md`)
- **Linting**: 100% ESLint compliance with JSDoc/TSDoc standards
- **Type Safety**: Strict TypeScript with no `any` types unless absolutely necessary

## Code Conventions

### File Organization
- **Co-located tests**: `*.test.ts` files next to source files
- **Handler pattern**: `*-handler.ts` for MCP tool implementations
- **Service pattern**: `*.ts` in `src/services/` for business logic
- **Schema-first**: Define Zod schemas before implementing handlers

### Naming Conventions
- **Files**: kebab-case for scripts, camelCase for source files
- **Functions**: camelCase, descriptive names
- **Constants**: UPPERCASE_SNAKE_CASE for configuration
- **Types**: PascalCase for interfaces and types
- **Dimensions**: `category.quality` format (e.g., `mood.open`, `embodied.thinking`)

### Code Style
- **Exports**: Use named exports over default exports
- **Functions**: Prefer `function foo()` over `const foo = () =>`
- **Arrays**: Use `Array<T>` instead of `T[]`
- **Async**: Use `async/await` over `.then()` chains
- **Error handling**: Use try/catch with specific error types

## MCP Development

### Tool Implementation Pattern
1. **Define Zod schema** in `src/mcp/schemas.ts`
2. **Export TypeScript type** and JSON schema
3. **Implement handler** in `src/mcp/*-handler.ts`
4. **Register tool** in `src/mcp/tools.ts` with appropriate annotations
5. **Add tests** in co-located `*.test.ts` file

### Handler Structure
```typescript
export class ExperienceHandler {
  async handle(params: ExperienceInput): Promise<ToolResult> {
    // 1. Validate input using Zod schema
    // 2. Delegate to service layer
    // 3. Format response for user
    // 4. Return structured result
  }
}
```

### Service Layer Pattern
```typescript
export async function experienceService(input: ExperienceInput): Promise<ExperienceResult> {
  // 1. Business logic implementation
  // 2. Storage operations
  // 3. Embedding generation
  // 4. Return structured result
}
```

## Testing Conventions

### Unit Tests
- **Coverage target**: 100% for handlers, 80%+ for services
- **Mocking**: Use Jest mocks for external dependencies
- **Test isolation**: Each test should be independent
- **Descriptive names**: `describe('when user creates experience', () => {})`

### Integration Tests
- **Bridge scenarios**: Use `src/scripts/test-runner.ts`
- **Test data**: Generate realistic test data with `src/scripts/generate-bridge-test-data.ts`
- **Learning loop**: Run `npm run loop` to analyze results

### Test Commands
```bash
npm test                    # Unit tests with coverage
npm run test:bridge         # Integration tests (sequential)
npm run test:bridge -- --parallel  # Integration tests (parallel)
npm run test:all            # Unit + integration + learning loop
npm run loop                # Learning loop analysis
```

## Documentation Standards

### DRY Documentation
- **Single source of truth**: Each piece of information in one place
- **Cross-references**: Use `See **FILENAME.md**` instead of duplication
- **Current status**: Keep `README.md` updated with latest metrics
- **Learning loop**: Update `EXPERIMENTS.md`, `LEARNINGS.md` based on results

### Documentation Files
- **`README.md`**: Project overview, quick start, quality metrics
- **`TECHNICAL.md`**: Current API reference and implementation details
- **`OPPORTUNITIES.md`**: Prioritized feature roadmap (scored by Impact × Certainty × Urgency)
- **`EXPERIMENTS.md`**: Active and completed experiments
- **`LEARNINGS.md`**: Validated insights from experiments
- **`LOOP.md`**: Development methodology and commands
- **`CLAUDE.md`**: Claude Code development guide

## Quality Dimensions

### Seven Dimensional Pairs
- **embodied**: thinking/sensing
- **focus**: narrow/broad
- **mood**: open/closed
- **purpose**: goal/wander
- **space**: here/there
- **time**: past/future
- **presence**: individual/collective

### Usage Pattern
```typescript
experience({
  source: "I feel anxious about the presentation",
  experience: ["embodied.sensing", "mood.closed", "time.future"]
})
```

## Error Handling

### MCP Error Patterns
- **Validation errors**: Use Zod validation with user-friendly messages
- **Service errors**: Return structured error responses
- **Storage errors**: Handle file system and JSON parsing gracefully
- **Embedding errors**: Graceful fallback for embedding generation failures

### Error Response Format
```typescript
{
  error: {
    code: -32602,
    message: "Invalid input: experience must be an array of valid dimensions"
  }
}
```

## Performance Considerations

### Optimization Targets
- **Recall latency**: <100ms for typical queries
- **Embedding generation**: <5s for new experiences
- **Storage operations**: <50ms for read/write operations
- **Memory usage**: Efficient handling of large experience datasets

### Caching Strategy
- **Embedding cache**: Reuse embeddings for identical content
- **Search results**: Cache frequent query results
- **Configuration**: Cache parsed configuration values

## Security Guidelines

### Input Validation
- **Path validation**: Prevent directory traversal attacks
- **Content sanitization**: Validate all user inputs
- **Schema validation**: Use Zod for all MCP tool inputs
- **File operations**: Validate file paths and permissions

### Data Protection
- **Local storage**: All data stored locally in `~/.bridge/`
- **No external APIs**: Except for embedding generation
- **Privacy-first**: No data sent to external services

## Common Patterns

### Adding New Dimensions
1. Update `src/core/dimensions.ts`
2. Add validation in `src/mcp/schemas.ts`
3. Update test data generation
4. Add tests for new dimension combinations

### Adding New Tools
1. Define schema in `src/mcp/schemas.ts`
2. Implement handler in `src/mcp/*-handler.ts`
3. Register in `src/mcp/tools.ts`
4. Add integration tests
5. Update documentation

### Performance Optimization
1. Profile with `npm run test:coverage`
2. Identify bottlenecks in service layer
3. Optimize storage operations
4. Add caching where appropriate
5. Update performance metrics

## Troubleshooting

### Common Issues
- **TypeScript errors**: Check schema definitions and type exports
- **Test failures**: Ensure test isolation and proper mocking
- **MCP protocol errors**: Validate JSON-RPC format and error codes
- **Performance issues**: Check embedding generation and storage operations

### Debug Commands
```bash
npm run type-check     # TypeScript compilation check
npm run lint           # ESLint validation
npm run test:coverage  # Detailed coverage report
npm run loop           # Learning loop analysis
```

## Current Priorities

### Next Development Phase
1. **Clustering Analysis** (Score: 378) - Core to revealing insights
2. **Dimension Filtering** (Score: 280) - Sophisticated queries
3. **Extensible Recall** (Score: 270) - Technical foundation

### Completed Features
- ✅ Pattern Realizations with `reflects` field (EXP-005)
- ✅ Strategic test coverage improvement (EXP-004)
- ✅ Learning loop recommendations (EXP-003)
- ✅ Dimensional filtering and unified scoring (EXP-002)
- ✅ Bridge operations discovery (EXP-001)

## External Resources

### MCP Documentation
- **Protocol Spec**: https://modelcontextprotocol.io/specification/
- **TypeScript SDK**: https://github.com/modelcontextprotocol/typescript-sdk
- **Building MCP**: https://modelcontextprotocol.io/tutorials/building-mcp-with-llms

### Development Tools
- **Cursor Rules**: This file for AI assistance
- **Learning Loop**: Automated analysis and recommendations
- **Test Infrastructure**: Comprehensive testing with coverage tracking 