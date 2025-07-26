# Bridge Integration Testing

This directory contains utilities for integration testing Bridge using real MCP client/server communication.

## Overview

Integration tests use the actual MCP protocol to test the full stack, from client requests through handlers to services and back. This ensures our implementation works correctly with the MCP SDK.

## Running Tests

```bash
# Run only unit tests
npm test

# Run only integration tests (builds first)
npm run test:integration

# Run all tests
npm run test:all
```

## Writing Integration Tests

### Basic Structure

```typescript
import { withTestEnvironment, callExperience } from '../test-utils/integration-helpers.js';

describe('MyFeature Integration', () => {
  test('should do something via MCP', async () => {
    await withTestEnvironment(async (env) => {
      // Use env.client to make MCP calls
      const result = await callExperience(env.client, {
        source: 'Test experience',
        emoji: '🧪',
        experience: ['embodied.thinking'],
      });

      // Verify results
      expect(verifyToolResponse(result, 'Experienced')).toBe(true);
    });
  }, 30000); // 30 second timeout
});
```

### Key Helpers

- `withTestEnvironment()` - Creates isolated test environment with MCP client
- `callExperience()` - Helper to call the experience tool
- `callReconsider()` - Helper to call the reconsider tool
- `verifyToolResponse()` - Check if response contains expected text
- `extractExperienceId()` - Extract experience ID from response
- `createTestExperiences()` - Generate sample test data

### Test Isolation

Each test runs in a completely isolated environment:

- Temporary data directory
- Fresh MCP client/server connection
- Clean storage state
- Automatic cleanup

### Best Practices

1. **Use helpers**: Prefer the provided helpers over raw MCP calls
2. **Set timeouts**: Integration tests need longer timeouts (30-60s)
3. **Test real flows**: Focus on end-to-end user scenarios
4. **Verify responses**: Check both success and content of responses
5. **Handle async**: All MCP operations are async, use await properly

### Common Patterns

#### Testing with Recall

```typescript
const result = await callExperience(env.client, {
  source: 'New experience',
  emoji: '📝',
  experience: ['embodied.thinking'],
  recall: {
    query: 'related experiences',
    limit: 5,
  },
});
```

#### Testing Pattern Realizations

```typescript
const exp1 = await callExperience(env.client, {...});
const id1 = extractExperienceId(exp1);

const reflection = await callExperience(env.client, {
  source: 'I see a pattern',
  emoji: '🔄',
  experience: ['embodied.thinking'],
  reflects: [id1]
});
```

#### Testing Updates

```typescript
const id = extractExperienceId(createResult);

await callReconsider(env.client, {
  id: id,
  source: 'Updated text',
  experience: ['mood.open'],
});
```

## Debugging

Set environment variables for debugging:

```bash
BRIDGE_DEBUG=true npm run test:integration
```

Check test output directory:

- Temporary directories are created in system temp
- Path is logged if tests fail
- Manual cleanup may be needed if tests crash
