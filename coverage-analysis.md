# Test Coverage Analysis - Phase 1

## Current Coverage Summary
- **Lines**: 27.02% (Target: 60%)
- **Branches**: 18.98% (Target: 50%)
- **Functions**: 31.09% (Target: 60%)

## Priority Testing List

Based on coverage gaps, change frequency, and criticality:

### 🔴 Critical Priority (0% coverage, high traffic)

1. **src/mcp/handlers.ts** (0% coverage, 23 changes)
   - Central MCP request routing
   - Critical for all operations
   - Small file, high impact

2. **src/mcp/server.ts** (0% coverage, 20 changes)
   - Core MCP server functionality
   - Entry point for all requests
   - Integration point

3. **src/mcp/experience-handler.ts** (0% coverage)
   - Core experience capture logic
   - Direct user-facing functionality
   - Business-critical operation

4. **src/mcp/recall-handler.ts** (0% coverage)
   - Search functionality handler
   - Most complex user operation
   - High usage frequency

### 🟠 High Priority (Low coverage, important functionality)

5. **src/services/embedding-search.ts** (9.37% coverage)
   - Core search implementation
   - Performance critical
   - Complex logic

6. **src/services/embeddings.ts** (35.63% coverage, 14 changes)
   - Semantic search foundation
   - External dependency integration
   - Error-prone area

7. **src/utils/formatters.ts** (0% coverage, 10 changes)
   - User-facing output formatting
   - Used by all handlers
   - Many edge cases

### 🟡 Medium Priority (Partial coverage, utilities)

8. **src/utils/timeout.ts** (18.64% coverage)
   - Critical for MCP compliance
   - Prevents hanging operations
   - Error handling

9. **src/utils/security.ts** (32.25% coverage)
   - Input validation
   - Security critical
   - Error boundaries

10. **src/core/storage.ts** (71.32% coverage, 14 changes)
    - Data persistence layer
    - Already decent coverage
    - Focus on error paths

## Test Strategy by File Type

### MCP Handlers (Priority 1-4)
- Focus on request/response flow
- Test error handling
- Verify MCP protocol compliance
- Mock service layer

### Service Layer (Priority 5-6)
- Test business logic thoroughly
- Cover edge cases
- Test error conditions
- Performance scenarios

### Utilities (Priority 7-9)
- Test all branches
- Focus on error cases
- Validate security measures
- Test timeouts

## Implementation Order

### Day 1: MCP Handler Foundation
- [ ] Create handler test utilities
- [ ] Test handlers.ts routing logic
- [ ] Test server.ts initialization

### Day 2: Core Operation Handlers
- [ ] Test experience-handler.ts
- [ ] Test recall-handler.ts
- [ ] Add integration tests

### Day 3: Service Layer
- [ ] Improve embeddings.ts coverage
- [ ] Complete embedding-search.ts
- [ ] Test error scenarios

### Day 4: Utilities & Polish
- [ ] Test formatters.ts
- [ ] Improve timeout.ts coverage
- [ ] Add security.ts edge cases

## Success Metrics
- Each file should reach 80%+ coverage
- All critical paths tested
- Error handling validated
- No performance regression