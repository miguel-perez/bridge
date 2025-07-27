# MCP Logging Guidelines

## Critical Rule: Never Use console.log() in MCP Servers

MCP servers communicate via JSON-RPC protocol over stdin/stdout. **Any output to stdout that isn't valid JSON-RPC will crash the server connection.**

### ❌ NEVER DO THIS:
```typescript
console.log('Debug message');     // Breaks JSON-RPC!
console.info('Info message');     // Breaks JSON-RPC!
console.warn('Warning message');  // Breaks JSON-RPC!
```

### ✅ DO THIS INSTEAD:

```typescript
import { debugLog, errorLog, mcpLog } from './utils/safe-logger.js';

// Debug output (only shows when BRIDGE_DEBUG=true)
debugLog('Debug message - safe for development');

// Error output (always shows in stderr)
errorLog('Error message - visible in logs');

// Client-visible logging via MCP protocol
mcpLog('info', 'Message visible to MCP client', server);
```

## Safe Logging Options

1. **debugLog()** - Outputs to stderr when `BRIDGE_DEBUG=true`
   - Use for development debugging
   - Automatically disabled in production
   - Safe - doesn't corrupt JSON-RPC

2. **errorLog()** - Always outputs to stderr
   - Use for critical errors
   - Visible in server logs
   - Safe - doesn't corrupt JSON-RPC

3. **mcpLog()** - Sends via MCP protocol
   - Visible to MCP clients (like Claude Desktop)
   - Proper way to communicate with clients
   - Requires server instance

4. **console.error()** - Outputs to stderr
   - Can be used directly since it doesn't corrupt stdout
   - But prefer errorLog() for consistency

## Enforcement

1. **ESLint Rule**: Configured to error on console.log/info/warn usage
2. **Runtime Override**: console methods are overridden to prevent accidents
3. **Pre-commit Hook**: Blocks commits containing console usage in core code

## Exceptions

Console usage is allowed in:
- Test files (`*.test.ts`, `*.spec.ts`)
- Scripts (`src/scripts/**`)
- Simulations (`src/simulations/**`)

These don't run as MCP servers, so stdout isn't used for JSON-RPC.

## Common Scenarios

### During Development
```typescript
// See debug output while developing
BRIDGE_DEBUG=true npm run dev
```

### Finding Console Usage
```bash
# Run ESLint to find all console usage
npm run lint

# Fix automatically where possible
npm run lint:fix
```

### Emergency Debugging
```typescript
// If you absolutely must debug in production
console.error('[DEBUG]', someValue); // Goes to stderr, won't break protocol
```

## Why This Matters

When Bridge runs as an MCP server:
1. Client sends JSON-RPC requests via stdin
2. Server sends JSON-RPC responses via stdout
3. Any non-JSON output to stdout corrupts the stream
4. Client disconnects with "Server transport closed unexpectedly"

This is the #1 cause of MCP server crashes during development!