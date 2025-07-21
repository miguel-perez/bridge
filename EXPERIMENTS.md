# Bridge Experiments

**Document Purpose**: This tracks active and completed experiments on Bridge functionality. Each experiment is designed
to test specific features and generate learnings through the learning loop. For insights from completed experiments, see
LEARNINGS.md.

**For Developers**: Use this to understand what's being tested and contribute new experiments.

This document outlines experiments designed to work with our learning loop. Each experiment includes specific test
scenarios that allow Opus to evaluate results and suggest improvements.

## Experiment Structure

Each experiment follows this format for learning loop compatibility:
1. **Test Scenarios**: Specific conversation flows to test
2. **Measurable Outcomes**: What Opus should evaluate
3. **Learning Questions**: What insights we seek
4. **Evidence Trail**: Links to test results and learnings

## Active Experiments

### EXP-008: Sophisticated Quality Filtering with Terminology Standardization
**Status**: Active 2025-07-21  
**Purpose**: Enable complex quality queries with boolean logic, absence filtering, and advanced combinations, while standardizing terminology throughout the codebase

**Design Overview**:
Transform Bridge's quality filtering from simple exact matches to a sophisticated query system that supports complex boolean logic, presence/absence filtering, and nested expressions. Additionally, standardize all terminology from "dimensional" to "quality" throughout the codebase for consistency and intuitiveness.

**Technical Architecture**:

### 1. Enhanced Schema Design
```typescript
// New quality filter structure
interface QualityFilter {
  // Presence/Absence filtering
  embodied?: { present: boolean } | string | string[];
  focus?: { present: boolean } | string | string[];
  mood?: { present: boolean } | string | string[];
  purpose?: { present: boolean } | string | string[];
  space?: { present: boolean } | string | string[];
  time?: { present: boolean } | string | string[];
  presence?: { present: boolean } | string | string[];
  
  // Complex boolean expressions
  $and?: QualityFilter[];
  $or?: QualityFilter[];
  $not?: QualityFilter;
}

// Enhanced SearchInputSchema
export const SearchInputSchema = z.object({
  // ... existing fields ...
  qualities: QualityFilterSchema.optional(),
  // ... rest of schema
});
```

### 2. Query Processing Pipeline
```typescript
// New quality filtering service
export class QualityFilterService {
  // Parse complex quality queries
  parseQualityFilter(filter: QualityFilter): FilterExpression;
  
  // Evaluate filter expressions against experiences
  evaluateFilter(experience: SourceRecord, filter: FilterExpression): boolean;
  
  // Support for complex boolean logic
  evaluateBooleanExpression(expression: BooleanExpression): boolean;
}
```

### 3. Backward Compatibility Strategy
- **Phase 1**: Add new `qualities` field alongside existing `query` field
- **Phase 2**: Enhance existing `query` array support for simple OR logic
- **Phase 3**: Deprecate old quality query format with migration path

**Test Scenarios**:

### Scenario 1: Presence/Absence Filtering
```javascript
// Test absence filtering
recall("", { 
  qualities: { 
    mood: { present: false },  // Find experiences WITHOUT mood qualities
    embodied: { present: true } // But WITH embodied qualities
  }
});

// Expected: Experiences with embodied qualities but no mood qualities
// Test data: 3 experiences with embodied.thinking, 2 with mood.closed, 1 with both
// Should return: 2 experiences (embodied.thinking without mood)
```

### Scenario 2: OR Logic with Multiple Values
```javascript
// Test OR logic within a quality
recall("", { 
  qualities: { 
    embodied: ["thinking", "sensing"],  // embodied.thinking OR embodied.sensing
    mood: "closed"  // AND mood.closed
  }
});

// Expected: Experiences with (embodied.thinking OR embodied.sensing) AND mood.closed
// Test data: 4 experiences with various combinations
// Should return: 2 experiences matching the OR+AND pattern
```

### Scenario 3: Complex Boolean Expressions
```javascript
// Test nested boolean logic
recall("", { 
  qualities: { 
    $and: [
      { mood: "closed" },
      { 
        $or: [
          { embodied: "thinking" },
          { focus: "narrow" }
        ]
      }
    ]
  }
});

// Expected: mood.closed AND (embodied.thinking OR focus.narrow)
// Test data: 6 experiences with various combinations
// Should return: 3 experiences matching the complex pattern
```

### Scenario 4: Mixed Semantic and Quality Queries
```javascript
// Test semantic search with quality filtering
recall("anxiety nervousness", { 
  qualities: { 
    embodied: { present: true },
    focus: { present: false }
  }
});

// Expected: Semantic matches for "anxiety nervousness" that have embodied qualities but no focus
// Test data: 5 experiences with anxiety-related content and various quality signatures
// Should return: 2 experiences matching semantic + quality criteria
```

### Scenario 5: Edge Cases and Error Handling
```javascript
// Test invalid quality names
recall("", { 
  qualities: { 
    invalid_quality: "value"  // Should be ignored or return error
  }
});

// Test empty filter objects
recall("", { 
  qualities: {}  // Should return all experiences
});

// Test conflicting presence/absence
recall("", { 
  qualities: { 
    mood: { present: true, absent: true }  // Should return validation error
  }
});
```

**Success Criteria**:
- ✅ All test scenarios pass with correct filtering results
- ✅ Backward compatibility maintained (existing queries work unchanged)
- ✅ Performance impact <20% increase in recall latency
- ✅ Complex boolean expressions evaluate correctly
- ✅ Presence/absence filtering works for all qualities
- ✅ Error handling provides clear validation messages
- ✅ Schema validation catches invalid filter structures
- ✅ Terminology standardized throughout codebase (dimensional → quality)
- ✅ All service files use consistent "quality" terminology
- ✅ Documentation updated to use "quality" consistently
- ✅ Variable names and function names updated for clarity

**Implementation Plan**:

### Phase 1: Terminology Standardization (Week 1)
1. **Update Core Files** (`src/core/dimensions.ts`)
   - Rename KNOWN_DIMENSIONS → KNOWN_QUALITIES
   - Update type names and exports
   - Maintain backward compatibility

2. **Update Service Files**
   - `src/services/clustering.ts`: dimensionalClusters → qualityClusters, commonDimensions → commonQualities
   - `src/services/recall.ts`: dimensional filtering → quality filtering
   - `src/services/unified-scoring.ts`: dimensional relevance → quality relevance
   - Update all variable names and function names

3. **Update Documentation**
   - `CLAUDE.md`: Update all "dimensional" references to "quality"
   - `OPPORTUNITIES.md`: Update opportunity descriptions
   - `TECHNICAL.md`: Update API documentation
   - Ensure consistent terminology throughout

4. **Unit Tests** (Update existing tests)
   - Update test descriptions and variable names
   - Ensure all tests pass with new terminology
   - Add tests for terminology consistency

### Phase 2: Quality Filtering Infrastructure (Week 2)
1. **Create QualityFilterService** (`src/services/quality-filter.ts`)
   - Filter expression parsing
   - Boolean logic evaluation
   - Presence/absence checking

2. **Enhanced Schema Definition** (`src/mcp/schemas.ts`)
   - Add QualityFilterSchema
   - Update SearchInputSchema with qualities field
   - Add validation for complex filter structures

3. **Unit Tests** (`src/services/quality-filter.test.ts`)
   - Test all filter types individually
   - Test boolean logic combinations
   - Test edge cases and error conditions

### Phase 3: Integration and Advanced Features (Week 3)
1. **Update Unified Scoring** (`src/services/unified-scoring.ts`)
   - Integrate QualityFilterService
   - Maintain backward compatibility
   - Add performance monitoring

2. **Enhanced Recall Handler** (`src/mcp/recall-handler.ts`)
   - Parse quality filters from requests
   - Apply filters before scoring
   - Return appropriate error messages

3. **Integration Tests** (`src/scripts/test-runner.ts`)
   - Add sophisticated-filtering scenario
   - Test with real Bridge data
   - Verify performance characteristics

4. **Query Optimization**
   - Index quality signatures for faster filtering
   - Cache common filter patterns
   - Optimize boolean expression evaluation

5. **Enhanced Error Handling**
   - Detailed validation error messages
   - Suggestions for correct filter syntax
   - Graceful degradation for invalid filters

6. **Documentation and Examples**
   - Update TECHNICAL.md with new capabilities
   - Add comprehensive examples
   - Create migration guide for advanced users

**Risk Mitigation**:
- **Performance**: Implement query optimization and caching
- **Complexity**: Start with simple presence/absence, add boolean logic incrementally
- **Backward Compatibility**: Maintain existing query format alongside new capabilities
- **Testing**: Comprehensive test coverage for all filter combinations
- **Terminology Migration**: Use aliases and gradual deprecation to avoid breaking changes
- **Documentation Sync**: Ensure all docs are updated together to prevent confusion

**Evidence Trail**:
- Implementation: New quality filtering service and enhanced schemas
- Test results: All scenarios passing with correct filtering behavior
- Performance metrics: <20% latency increase maintained
- Documentation: Updated API reference with new capabilities
- Terminology consistency: All files use "quality" terminology consistently
- Migration success: Backward compatibility maintained during terminology transition

## Completed Experiments

### EXP-007: Enhanced Learning Loop with Rich Test Evidence
**Status**: Completed 2025-07-21  
**Purpose**: Enhance learning loop to provide beautifully formatted conversation flow and tool calls for more compelling recommendations

**Key Outcomes**: ✅ All success criteria met
- Conversation flow extracted from both conversationFlow and messages arrays
- Tool calls display arguments and results in readable format
- Content-rich scenarios prioritized over summary-only scenarios
- Test evidence includes actual user-assistant interactions
- Recommendations are more compelling and actionable
- Long content appropriately truncated for readability

**Technical Implementation**: Enhanced extractTestContent method, added conversation flow and tool call formatting, implemented content prioritization logic

**Evidence**: Learning loop analysis shows dramatically improved evidence quality, commit 65e6f1b

### EXP-006: Clustering Similar Experiences
**Status**: Completed 2025-07-21  
**Purpose**: Enable Bridge to reveal patterns by automatically clustering similar experiences

**Key Outcomes**: ✅ All success criteria met
- Clusters returned in structured format with `{ as: "clusters" }` option
- Each cluster contains multiple experience IDs with meaningful summaries
- Filtering works correctly with clustering
- Edge cases handled gracefully (single/individual clusters)
- Output is MCP protocol compliant

**Technical Implementation**: Added clustering service, enhanced recall handler, implemented dimensional and semantic clustering

**Evidence**: Integration tests passing, learning loop analysis complete, commit e468d67

### EXP-005: Pattern Realizations with reflects Field
**Status**: Completed 2025-07-21  
**Purpose**: Implement `reflects` field to enable capturing pattern realizations as linkable experiences

**Key Outcomes**: ✅ All success criteria met
- Pattern realizations can be created and stored successfully
- All reflect-based search queries work correctly (`reflects: "only"`, `reflected_by`)
- 100% backward compatibility with existing experiences
- Performance impact minimal (<10% increase in recall latency)

**Technical Implementation**: Added `reflects?: string[]` field to Source interface, implemented bidirectional filtering, enhanced tool descriptions

**Evidence**: 507 unit tests passing, schema validation successful, learning loop analysis complete

### EXP-004: Strategic Test Coverage Improvement
**Status**: Completed 2025-07-21  
**Purpose**: Improve test coverage from 26% to 60%+ to reduce bug introduction rate

**Key Outcomes**: ✅ All targets exceeded
- Line coverage: 27.4% → **82.18%** (Target: 60%+)
- Branch coverage: 19.1% → **69.84%** (Target: 50%+)
- Function coverage: 31.5% → **78.4%** (Target: 60%+)
- Added 3,593 lines of test code across 13 files

**Technical Implementation**: Comprehensive testing of critical handlers, error paths, and edge cases

**Evidence**: 8b46df0 (82% coverage), coverage-analysis.md, learning loop confirmation

### EXP-003: Intelligent Learning Loop Recommendations
**Status**: Completed 2025-07-21  
**Purpose**: Test recommendation-based learning loop providing actionable insights

**Key Outcomes**: ✅ All scenarios validated
- Time saved: ~95% reduction (2 min automated vs 40+ min manual analysis)
- Recommendation accuracy: 100% actionable in recent runs
- Smart test execution prevents unnecessary re-runs

**Technical Implementation**: Context aggregation, evidence linking, prioritized recommendations

**Evidence**: src/scripts/learning-loop.ts, multiple successful runs, 12 related commits

### EXP-002: Dimensional Filtering and Unified Scoring
**Status**: Completed 2025-07-21  
**Purpose**: Test dimensional filtering capabilities and unified scoring system

**Key Outcomes**: ✅ All scenarios passing
- Dimensional filtering accuracy: 100% (no false positives)
- Unified scoring effectiveness: Significantly improved relevance
- Performance impact: Minimal (~2ms added latency)

**Technical Implementation**: Pure dimensional queries, mixed text/dimension queries, unified scoring weights

**Evidence**: src/services/recall.ts, src/services/unified-scoring.ts, all Bridge integration tests passing

### EXP-001: Bridge Operations Discovery
**Status**: Completed 2025-07-21  
**Purpose**: Establish baseline understanding of Bridge operations in practice

**Key Outcomes**: ✅ Baseline established
- Tool activation appropriateness confirmed
- Quality signature accuracy validated
- Similarity detection effectiveness proven
- Pattern emergence identified across temporal contexts

**Technical Implementation**: Basic experience capture, similarity detection, recall accuracy, pattern recognition

**Evidence**: test-run-1753069074129.json, learning analysis, insights added to LEARNINGS.md