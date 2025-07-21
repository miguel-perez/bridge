---
description: Testing Conventions for Bridge
---

# Testing Conventions

## Test Organization

### File Structure
- **Co-located tests**: `*.test.ts` files next to source files
- **Integration tests**: `src/scripts/test-runner.ts` for Bridge scenarios
- **Test data**: `src/scripts/generate-bridge-test-data.ts` for realistic data

### Test File Naming
```
src/services/experience.ts          # Source file
src/services/experience.test.ts     # Unit tests
src/mcp/experience-handler.ts       # Handler file
src/mcp/experience-handler.test.ts  # Handler tests
```

## Unit Testing

### Coverage Targets
- **Handlers**: 100% line and branch coverage
- **Services**: 80%+ line coverage, 65%+ branch coverage
- **Utilities**: 100% coverage for critical functions
- **Current Status**: 85.27% lines, 74.54% branches

### Test Structure
```typescript
describe('ExperienceService', () => {
  beforeEach(() => {
    // Setup test environment
  });

  afterEach(() => {
    // Cleanup
  });

  describe('when creating an experience', () => {
    it('should store experience with quality signatures', async () => {
      // Test implementation
    });

    it('should generate embeddings for semantic search', async () => {
      // Test implementation
    });
  });
});
```

### Mocking Patterns
```typescript
// Mock external dependencies
jest.mock('../utils/embeddings');
const mockEmbeddings = jest.mocked(embeddings);

// Mock file system operations
jest.mock('fs/promises');
const mockFs = jest.mocked(fs);

// Mock MCP tools
jest.mock('../mcp/tools');
```

### Test Data Patterns
```typescript
const mockExperienceInput = {
  source: "I feel anxious about the presentation",
  experience: ["mood.closed", "embodied.sensing", "time.future"]
};

const mockSourceRecord = {
  id: "exp-123",
  source: "I feel anxious about the presentation",
  experience: ["mood.closed", "embodied.sensing", "time.future"],
  created: "2025-07-21T10:00:00.000Z"
};
```

## Integration Testing

### Bridge Scenarios
```bash
npm run test:bridge                    # All scenarios (sequential)
npm run test:bridge -- --parallel      # All scenarios (parallel)
npm run test:bridge:experience         # Experience tool only
npm run test:bridge:recall             # Recall tool only
npm run test:bridge:reconsider         # Reconsider tool only
npm run test:bridge:release            # Release tool only
npm run test:bridge:dimensional        # Dimensional queries only
```

### Scenario Structure
```typescript
// In src/scripts/test-runner.ts
const scenarios = {
  'experience-capture': {
    description: 'Tests experience tool with various emotional states',
    turns: [
      {
        role: 'user',
        content: 'I feel anxious about the presentation tomorrow'
      },
      {
        role: 'assistant',
        expectedTools: ['experience'],
        expectedContent: 'Experienced (mood.closed, embodied.sensing)'
      }
    ]
  }
};
```

### Test Data Generation
```typescript
// Use src/scripts/generate-bridge-test-data.ts
// Generates realistic test data with:
// - Various emotional states
// - Different dimensional combinations
// - Temporal patterns
// - Pattern realizations with reflects field
```

## Learning Loop Testing

### Analysis Commands
```bash
npm run loop                    # Full analysis (30 days)
npm run loop -- -d 7           # Last 7 days only
npm run loop -- -f markdown    # Markdown output only
npm run loop -- --verbose      # Detailed progress
```

### Test Result Analysis
- **Git history**: Recent commits, development velocity
- **Test results**: Coverage metrics, pass/fail rates
- **Documentation**: Gaps and inconsistencies
- **Experiments**: Completion status and learnings

## Performance Testing

### Latency Targets
- **Recall operations**: <100ms for typical queries
- **Embedding generation**: <5s for new experiences
- **Storage operations**: <50ms for read/write
- **Integration tests**: <30s total runtime

### Memory Testing
```typescript
// Test with large datasets
const largeDataset = generateTestData(1000); // 1000 experiences
await testRecallPerformance(largeDataset);
```

## Error Testing

### Error Scenarios
```typescript
describe('error handling', () => {
  it('should handle invalid dimension format', async () => {
    const result = await handler.handle({
      source: "test",
      experience: ["invalid.dimension"]
    });
    expect(result.error).toBeDefined();
    expect(result.error.code).toBe(-32602);
  });

  it('should handle file system errors gracefully', async () => {
    // Mock fs to throw error
    mockFs.readFile.mockRejectedValue(new Error('ENOENT'));
    // Test graceful handling
  });
});
```

## Test Commands Reference

### Development Commands
```bash
npm test                    # Unit tests with coverage
npm run test:coverage       # Detailed coverage report
npm run test:watch          # Watch mode for development
npm run test:debug          # Debug mode with breakpoints
```

### Integration Commands
```bash
npm run test:bridge         # All Bridge scenarios
npm run test:all            # Unit + integration + learning loop
npm run loop                # Learning loop analysis
```

### Quality Commands
```bash
npm run lint                # ESLint validation
npm run type-check          # TypeScript compilation check
npm run build               # Build verification
```

## Test Best Practices

### Isolation
- Each test should be independent
- Use `beforeEach`/`afterEach` for setup/cleanup
- Mock external dependencies consistently
- Reset mocks between tests

### Descriptive Names
```typescript
// Good
it('should return experiences matching mood.closed dimension', () => {});

// Bad
it('should work', () => {});
```

### Assertions
```typescript
// Use specific assertions
expect(result.experience).toContain('mood.closed');
expect(result.error).toBeUndefined();
expect(mockStorage.save).toHaveBeenCalledWith(expectedData);
```

### Error Testing
- Test both success and failure paths
- Verify error messages are user-friendly
- Test edge cases and boundary conditions
- Ensure graceful degradation 