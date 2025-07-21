# EXP-008 Implementation Plan: Sophisticated Quality Filtering with Terminology Standardization

**Experiment**: EXP-008  
**Status**: Active 2025-07-21  
**Purpose**: Enable complex quality queries with boolean logic, absence filtering, and advanced combinations, while standardizing terminology throughout the codebase

## Overview

This plan implements EXP-008 in three phases, starting with terminology standardization to create a clean foundation, then building sophisticated quality filtering capabilities.

## Phase 1: Terminology Standardization (Week 1)

### Goal
Standardize all terminology from "dimensional" to "quality" throughout the codebase for consistency and intuitiveness.

### Tasks

#### 1.1 Update Core Files
**File**: `src/core/dimensions.ts`
- [ ] Rename `KNOWN_DIMENSIONS` → `KNOWN_QUALITIES`
- [ ] Rename `KnownDimension` type → `KnownQuality`
- [ ] Update file header comment
- [ ] Add backward compatibility alias (deprecated)
- [ ] Update all exports

**File**: `src/core/types.ts`
- [ ] Update comments referencing "dimensions" → "qualities"
- [ ] Ensure `QUALITY_TYPES` is the primary reference
- [ ] Update type documentation

#### 1.2 Update Service Files
**File**: `src/services/clustering.ts`
- [ ] Rename `commonDimensions` → `commonQualities`
- [ ] Rename `dimensionalClusters` → `qualityClusters`
- [ ] Update function names: `clusterByDimensions` → `clusterByQualities`
- [ ] Update variable names: `dimensionGroups` → `qualityGroups`
- [ ] Update comments and documentation
- [ ] Update `getCommonDimensions` → `getCommonQualities`

**File**: `src/services/recall.ts`
- [ ] Update comments: "dimensional filtering" → "quality filtering"
- [ ] Update variable names: `dimensional` → `quality`
- [ ] Update function documentation
- [ ] Update debug logging messages

**File**: `src/services/unified-scoring.ts`
- [ ] Rename `calculateDimensionalRelevance` → `calculateQualityRelevance`
- [ ] Rename `calculateDimensionalDensity` → `calculateQualityDensity`
- [ ] Update variable names: `dimensional` → `quality`
- [ ] Update function documentation
- [ ] Update weight calculations and comments

#### 1.3 Update Documentation
**File**: `CLAUDE.md`
- [ ] Update "dimensional filtering" → "quality filtering"
- [ ] Update "dimensions.ts" → "qualities.ts" (future rename)
- [ ] Update "quality signatures" references
- [ ] Update architecture descriptions

**File**: `OPPORTUNITIES.md`
- [ ] Update "HMW enable sophisticated dimensional filtering?" → "HMW enable sophisticated quality filtering?"
- [ ] Update all "dimensional" references to "quality"
- [ ] Update implementation descriptions
- [ ] Update current state descriptions

**File**: `TECHNICAL.md`
- [ ] Update API documentation
- [ ] Update "dimensional filtering" → "quality filtering"
- [ ] Update examples and code snippets
- [ ] Update feature descriptions

#### 1.4 Update Unit Tests
**Files**: All test files with "dimensional" references
- [ ] Update test descriptions
- [ ] Update variable names in tests
- [ ] Update mock data and assertions
- [ ] Ensure all tests pass with new terminology
- [ ] Add tests for terminology consistency
- [ ] Verify backward compatibility through aliases

**File**: `src/core/dimensions.test.ts` (create if doesn't exist)
- [ ] Test KNOWN_QUALITIES array contains all expected qualities
- [ ] Test KnownQuality type validation
- [ ] Test backward compatibility aliases work correctly
- [ ] Test quality name validation functions

**File**: `src/services/clustering.test.ts`
- [ ] Update test descriptions to use "quality" terminology
- [ ] Test clusterByQualities function (renamed from clusterByDimensions)
- [ ] Test getCommonQualities function (renamed from getCommonDimensions)
- [ ] Test quality clustering with various quality signatures
- [ ] Test edge cases with empty quality arrays

**File**: `src/services/recall.test.ts`
- [ ] Update test descriptions to use "quality" terminology
- [ ] Test quality filtering functionality
- [ ] Test quality relevance calculations
- [ ] Test mixed semantic and quality queries
- [ ] Test quality-based clustering

**File**: `src/services/unified-scoring.test.ts`
- [ ] Update test descriptions to use "quality" terminology
- [ ] Test calculateQualityRelevance function (renamed from calculateDimensionalRelevance)
- [ ] Test calculateQualityDensity function (renamed from calculateDimensionalDensity)
- [ ] Test quality weight calculations
- [ ] Test quality-based scoring adjustments

### Success Criteria Phase 1
- [ ] All core files use "quality" terminology consistently
- [ ] All service files use "quality" terminology consistently
- [ ] All documentation uses "quality" terminology consistently
- [ ] All unit tests pass with new terminology
- [ ] Backward compatibility maintained through aliases
- [ ] No breaking changes to existing functionality

## Phase 2: Quality Filtering Infrastructure (Week 2)

### Phase 2 Goal
Create the core infrastructure for sophisticated quality filtering with boolean logic and presence/absence filtering.

### Phase 2 Tasks

#### 2.1 Create QualityFilterService
**File**: `src/services/quality-filter.ts`
- [ ] Define `QualityFilter` interface
- [ ] Define `FilterExpression` types for boolean logic
- [ ] Implement `parseQualityFilter()` function
- [ ] Implement `evaluateFilter()` function
- [ ] Implement `evaluateBooleanExpression()` function
- [ ] Add support for presence/absence filtering
- [ ] Add support for OR logic within qualities
- [ ] Add support for complex boolean expressions ($and, $or, $not)
- [ ] Add comprehensive error handling
- [ ] Add input validation

#### 2.2 Enhanced Schema Definition
**File**: `src/mcp/schemas.ts`
- [ ] Define `QualityFilterSchema` using Zod
- [ ] Add validation for presence/absence objects
- [ ] Add validation for boolean expressions
- [ ] Add validation for quality name validation
- [ ] Update `SearchInputSchema` to include `qualities` field
- [ ] Add backward compatibility for existing `query` field
- [ ] Add comprehensive error messages
- [ ] Add schema documentation

#### 2.3 Unit Tests
**File**: `src/services/quality-filter.test.ts`
- [ ] Test presence/absence filtering
- [ ] Test OR logic within qualities
- [ ] Test complex boolean expressions
- [ ] Test edge cases (empty filters, invalid qualities)
- [ ] Test error handling
- [ ] Test performance with large datasets
- [ ] Test backward compatibility
- [ ] Test schema validation
- [ ] Test filter parsing edge cases
- [ ] Test boolean expression evaluation
- [ ] Test quality name validation
- [ ] Test filter serialization/deserialization

**File**: `src/mcp/schemas.test.ts`
- [ ] Test QualityFilterSchema validation
- [ ] Test presence/absence object validation
- [ ] Test boolean expression validation
- [ ] Test invalid quality name handling
- [ ] Test SearchInputSchema with qualities field
- [ ] Test backward compatibility with query field
- [ ] Test error message clarity

### Success Criteria Phase 2
- [ ] QualityFilterService handles all filter types correctly
- [ ] Schema validation catches invalid filter structures
- [ ] All unit tests pass with comprehensive coverage
- [ ] Performance impact <10% for simple filters
- [ ] Error messages are clear and actionable
- [ ] Backward compatibility maintained

## Phase 3: Integration and Advanced Features (Week 3)

### Phase 3 Goal
Integrate quality filtering into the existing recall system and add advanced features.

### Phase 3 Tasks

#### 3.1 Update Unified Scoring
**File**: `src/services/unified-scoring.ts`
- [ ] Integrate QualityFilterService
- [ ] Add quality filter evaluation to scoring pipeline
- [ ] Maintain backward compatibility with existing scoring
- [ ] Add performance monitoring for filter operations
- [ ] Update weight calculations to consider filter complexity
- [ ] Add debug logging for filter operations

#### 3.2 Enhanced Recall Handler
**File**: `src/mcp/recall-handler.ts`
- [ ] Parse quality filters from request parameters
- [ ] Apply filters before scoring
- [ ] Return appropriate error messages for invalid filters
- [ ] Add filter validation
- [ ] Update response formatting to include filter information
- [ ] Add debug logging

#### 3.3 Integration Tests
**File**: `src/scripts/test-runner.ts`
- [ ] Add sophisticated-filtering scenario (already exists)
- [ ] Test presence/absence filtering
- [ ] Test OR logic combinations
- [ ] Test complex boolean expressions
- [ ] Test mixed semantic and quality queries
- [ ] Test edge cases and error handling
- [ ] Verify performance characteristics
- [ ] Test quality filter with clustering
- [ ] Test quality filter with pattern realizations
- [ ] Test quality filter with temporal queries
- [ ] Test quality filter with batch operations
- [ ] Test quality filter error recovery
- [ ] Test quality filter performance with large datasets

**File**: `src/services/unified-scoring.test.ts`
- [ ] Test quality filter integration with scoring
- [ ] Test filter impact on relevance scores
- [ ] Test performance with complex filters
- [ ] Test backward compatibility with existing scoring
- [ ] Test weight calculations with filters
- [ ] Test debug logging for filter operations

**File**: `src/mcp/recall-handler.test.ts`
- [ ] Test quality filter parsing from requests
- [ ] Test filter validation and error messages
- [ ] Test filter application before scoring
- [ ] Test response formatting with filter info
- [ ] Test backward compatibility with existing queries
- [ ] Test error handling for invalid filters

#### 3.4 Query Optimization
**File**: `src/services/quality-filter.ts`
- [ ] Add quality signature indexing for faster filtering
- [ ] Implement caching for common filter patterns
- [ ] Optimize boolean expression evaluation
- [ ] Add performance monitoring
- [ ] Add query plan analysis

#### 3.5 Enhanced Error Handling
**File**: `src/services/quality-filter.ts`
- [ ] Detailed validation error messages
- [ ] Suggestions for correct filter syntax
- [ ] Graceful degradation for invalid filters
- [ ] Error categorization (validation vs runtime)
- [ ] User-friendly error descriptions

#### 3.6 Documentation and Examples
**File**: `TECHNICAL.md`
- [ ] Update API reference with new capabilities
- [ ] Add comprehensive examples for all filter types
- [ ] Add migration guide for advanced users
- [ ] Add performance considerations
- [ ] Add troubleshooting section

### Success Criteria Phase 3
- [ ] All integration tests pass
- [ ] Performance impact <20% increase in recall latency
- [ ] Complex boolean expressions evaluate correctly
- [ ] Presence/absence filtering works for all qualities
- [ ] Error handling provides clear validation messages
- [ ] Documentation is comprehensive and clear
- [ ] Backward compatibility maintained

## Testing Strategy

### Unit Tests
- **Coverage Target**: 90%+ for new quality filtering code
- **Focus Areas**: Filter parsing, evaluation, error handling
- **Edge Cases**: Invalid inputs, empty filters, complex expressions
- **Phase 1**: Terminology consistency and backward compatibility
- **Phase 2**: QualityFilterService functionality and schema validation
- **Phase 3**: Integration with existing services and performance

### Integration Tests
- **Scenarios**: All test scenarios in EXP-008 pass
- **Performance**: Latency measurements within targets
- **Compatibility**: Existing queries work unchanged
- **Bridge Test Runner**: sophisticated-filtering scenario with real MCP interactions
- **Cross-Service**: Quality filtering with clustering, pattern realizations, temporal queries
- **Error Recovery**: Test error handling in real Bridge scenarios

### Manual Testing
- **User Experience**: Test with real Bridge data
- **Error Handling**: Verify error messages are helpful
- **Performance**: Test with large datasets
- **API Testing**: Test quality filtering through MCP protocol
- **Edge Cases**: Test with unusual quality combinations and filter structures

## Risk Mitigation

### Terminology Migration
- **Strategy**: Use aliases and gradual deprecation
- **Timeline**: Phase 1 focuses on new terminology, Phase 2-3 maintain compatibility
- **Rollback**: Keep old names as deprecated aliases

### Performance Impact
- **Monitoring**: Add performance metrics throughout
- **Optimization**: Implement caching and indexing
- **Targets**: <20% latency increase maintained

### Backward Compatibility
- **Testing**: Ensure existing queries work unchanged
- **Documentation**: Clear migration path for advanced users
- **Gradual**: Phase 1-2 maintain compatibility, Phase 3 adds new features

### Documentation Sync
- **Strategy**: Update all docs together in Phase 1
- **Review**: Cross-reference all documentation files
- **Consistency**: Ensure terminology is consistent everywhere

## Success Metrics

### Phase 1: Terminology Standardization
- [ ] 100% of code files use "quality" terminology
- [ ] 100% of documentation uses "quality" terminology
- [ ] All tests pass with new terminology
- [ ] Zero breaking changes

### Phase 2: Quality Filtering Infrastructure
- [ ] QualityFilterService handles all filter types
- [ ] Schema validation catches all invalid inputs
- [ ] Unit test coverage >90%
- [ ] Performance impact <10%

### Phase 3: Integration and Advanced Features
- [ ] All integration tests pass
- [ ] Performance impact <20%
- [ ] Complex boolean expressions work correctly
- [ ] Documentation is comprehensive
- [ ] Backward compatibility maintained

## Timeline

### Week 1: Terminology Standardization
- **Days 1-2**: Update core files and services
- **Days 3-4**: Update documentation
- **Day 5**: Update tests and verify everything works

### Week 2: Quality Filtering Infrastructure
- **Days 1-3**: Create QualityFilterService
- **Days 4-5**: Enhanced schemas and unit tests

### Week 3: Integration and Advanced Features
- **Days 1-2**: Update unified scoring and recall handler
- **Days 3-4**: Integration tests and optimization
- **Day 5**: Documentation and final testing

## Deliverables

### Code Deliverables
- Updated core files with consistent "quality" terminology
- New QualityFilterService with comprehensive functionality
- Enhanced schemas with validation
- Updated recall handler with filter support
- Comprehensive test suite

### Documentation Deliverables
- Updated API reference with new capabilities
- Migration guide for advanced users
- Performance considerations and best practices
- Troubleshooting guide

### Testing Deliverables
- Unit tests with >90% coverage
- Integration tests for all scenarios
- Performance benchmarks
- Error handling validation

## Test Scenarios Implementation

### Integration Test Scenarios (src/scripts/test-runner.ts)

#### Scenario 1: Presence/Absence Filtering
```javascript
// Test absence filtering
recall("", { 
  qualities: { 
    mood: { present: false },  // Find experiences WITHOUT mood qualities
    embodied: { present: true } // But WITH embodied qualities
  }
});
```

#### Scenario 2: OR Logic with Multiple Values
```javascript
// Test OR logic within a quality
recall("", { 
  qualities: { 
    embodied: ["thinking", "sensing"],  // embodied.thinking OR embodied.sensing
    mood: "closed"  // AND mood.closed
  }
});
```

#### Scenario 3: Complex Boolean Expressions
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
```

#### Scenario 4: Mixed Semantic and Quality Queries
```javascript
// Test semantic search with quality filtering
recall("anxiety nervousness", { 
  qualities: { 
    embodied: { present: true },
    focus: { present: false }
  }
});
```

#### Scenario 5: Quality Filtering with Clustering
```javascript
// Test quality filtering combined with clustering
recall("", { 
  qualities: { mood: "closed" },
  as: "clusters"
});
```

#### Scenario 6: Quality Filtering with Pattern Realizations
```javascript
// Test quality filtering with reflects field
recall("", { 
  qualities: { embodied: "thinking" },
  reflects: "only"
});
```

### Unit Test Coverage by Phase

#### Phase 1 Testing: Terminology Standardization
- **Core Files**: Test quality terminology consistency
- **Service Files**: Test renamed functions and variables
- **Backward Compatibility**: Test aliases work correctly

#### Phase 2 Testing: Quality Filtering Infrastructure
- **QualityFilterService**: Test all filter types and edge cases
- **Schema Validation**: Test QualityFilterSchema thoroughly
- **Error Handling**: Test validation and error messages

#### Phase 3 Testing: Integration and Advanced Features
- **Unified Scoring**: Test filter integration with scoring
- **Recall Handler**: Test filter parsing and application
- **Performance**: Test with large datasets and complex filters

## Next Steps

1. **Begin Phase 1**: Start with core file updates
2. **Daily Progress**: Track completion of each task
3. **Testing**: Run tests after each major change
4. **Documentation**: Update docs as code changes
5. **Review**: Regular check-ins on progress and blockers
6. **Test Implementation**: Implement scenarios as features are built

This plan provides a clear roadmap for implementing EXP-008 with proper risk mitigation, comprehensive testing, and success criteria. 