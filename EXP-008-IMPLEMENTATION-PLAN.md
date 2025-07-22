# EXP-008 Implementation Plan: Sophisticated Quality Filtering with Terminology Standardization

**Experiment**: EXP-008  
**Status**: Phase 1 Complete, Phase 2 Complete, Phase 3 Ready 2025-07-21  
**Purpose**: Enable complex quality queries with boolean logic, absence filtering, and advanced combinations, while standardizing terminology throughout the codebase

## Overview

This plan implements EXP-008 in three phases, starting with terminology standardization to create a clean foundation, then building sophisticated quality filtering capabilities.

## Phase 1: Terminology Standardization (Week 1) ✅ COMPLETE

### Goal
Standardize all terminology from "dimensional" to "quality" throughout the codebase for consistency and intuitiveness.

### Tasks

#### 1.1 Update Core Files ✅
**File**: `src/core/dimensions.ts`
- [x] Rename `KNOWN_DIMENSIONS` → `KNOWN_QUALITIES`
- [x] Rename `KnownDimension` type → `KnownQuality`
- [x] Update file header comment
- [x] Add backward compatibility alias (deprecated)
- [x] Update all exports

**File**: `src/core/types.ts`
- [x] Update comments referencing "dimensions" → "qualities"
- [x] Ensure `QUALITY_TYPES` is the primary reference
- [x] Update type documentation

#### 1.2 Update Service Files ✅
**File**: `src/services/clustering.ts`
- [x] Rename `commonDimensions` → `commonQualities`
- [x] Rename `dimensionalClusters` → `qualityClusters`
- [x] Update function names: `clusterByDimensions` → `clusterByQualities`
- [x] Update variable names: `dimensionGroups` → `qualityGroups`
- [x] Update comments and documentation
- [x] Update `getCommonDimensions` → `getCommonQualities`

**File**: `src/services/recall.ts`
- [x] Update comments: "dimensional filtering" → "quality filtering"
- [x] Update variable names: `dimensional` → `quality`
- [x] Update function documentation
- [x] Update debug logging messages

**File**: `src/services/unified-scoring.ts`
- [x] Rename `calculateDimensionalRelevance` → `calculateQualityRelevance`
- [x] Rename `calculateDimensionalDensity` → `calculateQualityDensity`
- [x] Update variable names: `dimensional` → `quality`
- [x] Update function documentation
- [x] Update weight calculations and comments

#### 1.3 Update Documentation ✅
**File**: `CLAUDE.md`
- [x] Update "dimensional filtering" → "quality filtering"
- [x] Update "dimensions.ts" → "qualities.ts" (future rename)
- [x] Update "quality signatures" references
- [x] Update architecture descriptions

**File**: `OPPORTUNITIES.md`
- [x] Update "HMW enable sophisticated dimensional filtering?" → "HMW enable sophisticated quality filtering?"
- [x] Update all "dimensional" references to "quality"
- [x] Update implementation descriptions
- [x] Update current state descriptions

**File**: `TECHNICAL.md`
- [x] Update API documentation
- [x] Update "dimensional filtering" → "quality filtering"
- [x] Update examples and code snippets
- [x] Update feature descriptions

#### 1.4 Update Unit Tests ✅
**Files**: All test files with "dimensional" references
- [x] Update test descriptions
- [x] Update variable names in tests
- [x] Update mock data and assertions
- [x] Ensure all tests pass with new terminology
- [x] Add tests for terminology consistency
- [x] Verify backward compatibility through aliases

**File**: `src/core/dimensions.test.ts` (create if doesn't exist)
- [x] Test KNOWN_QUALITIES array contains all expected qualities
- [x] Test KnownQuality type validation
- [x] Test backward compatibility aliases work correctly
- [x] Test quality name validation functions

**File**: `src/services/clustering.test.ts`
- [x] Update test descriptions to use "quality" terminology
- [x] Test clusterByQualities function (renamed from clusterByDimensions)
- [x] Test getCommonQualities function (renamed from getCommonDimensions)
- [x] Test quality clustering with various quality signatures
- [x] Test edge cases with empty quality arrays

**File**: `src/services/recall.test.ts`
- [x] Update test descriptions to use "quality" terminology
- [x] Test quality filtering functionality
- [x] Test quality relevance calculations
- [x] Test mixed semantic and quality queries
- [x] Test quality-based clustering

**File**: `src/services/unified-scoring.test.ts`
- [x] Update test descriptions to use "quality" terminology
- [x] Test calculateQualityRelevance function (renamed from calculateDimensionalRelevance)
- [x] Test calculateQualityDensity function (renamed from calculateDimensionalDensity)
- [x] Test quality weight calculations
- [x] Test quality-based scoring adjustments

### Success Criteria Phase 1 ✅ ACHIEVED
- [x] All core files use "quality" terminology consistently
- [x] All service files use "quality" terminology consistently
- [x] All documentation uses "quality" terminology consistently
- [x] All unit tests pass with new terminology (582/582 tests passing)
- [x] Backward compatibility maintained through aliases
- [x] No breaking changes to existing functionality
- [x] All quality gates passing (pre-commit and pre-push)
- [x] Learning loop confirms completion

### Phase 1 Results
- **Commit**: `5decff6` - "feat: complete EXP-008 Phase 1 - final terminology cleanup"
- **Test Coverage**: 84.8% lines, 73.3% branches, 88.0% functions
- **All Tests Passing**: 582/582 unit tests, 8/8 integration scenarios
- **Quality Gates**: All pre-commit and pre-push checks passing
- **Learning Loop**: Confirmed EXP-008 Phase 1 completion

## Phase 2: Quality Filtering Infrastructure (Week 2) ✅ COMPLETE

### Phase 2 Goal
Create the core infrastructure for sophisticated quality filtering with boolean logic and presence/absence filtering.

### Phase 2 Tasks

#### 2.1 Create QualityFilterService ✅
**File**: `src/services/quality-filter.ts`
- [x] Define `QualityFilter` interface
- [x] Define `FilterExpression` types for boolean logic
- [x] Implement `parseQualityFilter()` function
- [x] Implement `evaluateFilter()` function
- [x] Implement `evaluateBooleanExpression()` function
- [x] Add support for presence/absence filtering
- [x] Add support for OR logic within qualities
- [x] Add support for complex boolean expressions ($and, $or, $not)
- [x] Add comprehensive error handling
- [x] Add input validation

#### 2.2 Enhanced Schema Definition ✅
**File**: `src/mcp/schemas.ts`
- [x] Define `QualityFilterSchema` using Zod
- [x] Add validation for presence/absence objects
- [x] Add validation for boolean expressions
- [x] Add validation for quality name validation
- [x] Update `SearchInputSchema` to include `qualities` field
- [x] Add backward compatibility for existing `query` field
- [x] Add comprehensive error messages
- [x] Add schema documentation

#### 2.3 Unit Tests ✅
**File**: `src/services/quality-filter.test.ts`
- [x] Test presence/absence filtering
- [x] Test OR logic within qualities
- [x] Test complex boolean expressions
- [x] Test edge cases (empty filters, invalid qualities)
- [x] Test error handling
- [x] Test performance with large datasets
- [x] Test backward compatibility
- [x] Test schema validation
- [x] Test filter parsing edge cases
- [x] Test boolean expression evaluation
- [x] Test quality name validation
- [x] Test filter serialization/deserialization

**File**: `src/mcp/schemas.test.ts`
- [x] Test QualityFilterSchema validation
- [x] Test presence/absence object validation
- [x] Test boolean expression validation
- [x] Test invalid quality name handling
- [x] Test SearchInputSchema with qualities field
- [x] Test backward compatibility with query field
- [x] Test error message clarity

### Success Criteria Phase 2 ✅ ACHIEVED
- [x] QualityFilterService handles all filter types correctly
- [x] Schema validation catches invalid filter structures
- [x] All unit tests pass with comprehensive coverage (39 tests, 100% coverage)
- [x] Performance impact <10% for simple filters
- [x] Error messages are clear and actionable
- [x] Backward compatibility maintained

### Phase 2 Results
- **Commit**: `9df9ab1` - "feat: implement EXP-008 Phase 2 - Quality Filtering Infrastructure"
- **Test Coverage**: 39 comprehensive unit tests for QualityFilterService
- **All Tests Passing**: 621/621 tests (including new quality filter tests)
- **Quality Gates**: All pre-commit and pre-push checks passing
- **Integration Test**: Quick integration test passed (experience-capture scenario)
- **Features Implemented**:
  - ✅ Presence/absence filtering: `{ mood: { present: false } }`
  - ✅ OR logic within qualities: `{ embodied: ['thinking', 'sensing'] }`
  - ✅ AND logic across qualities: `{ mood: 'closed', embodied: 'sensing' }`
  - ✅ Complex boolean expressions: `$and`, `$or`, `$not`
  - ✅ Comprehensive validation with detailed error messages
  - ✅ Human-readable filter descriptions
  - ✅ QualityFilterSchema integrated into MCP schemas
  - ✅ qualities field added to SearchInputSchema

## Phase 3: Integration and Advanced Features (Week 3) 🚀 READY TO BEGIN

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
- **Phase 1**: ✅ Terminology consistency and backward compatibility
- **Phase 2**: ✅ QualityFilterService functionality and schema validation
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

### Terminology Migration ✅ COMPLETE
- **Strategy**: ✅ Used aliases and gradual deprecation
- **Timeline**: ✅ Phase 1 completed successfully
- **Rollback**: ✅ Old names maintained as deprecated aliases

### Performance Impact
- **Monitoring**: Add performance metrics throughout
- **Optimization**: Implement caching and indexing
- **Targets**: <20% latency increase maintained

### Backward Compatibility
- **Testing**: Ensure existing queries work unchanged
- **Documentation**: Clear migration path for advanced users
- **Gradual**: Phase 1-2 maintain compatibility, Phase 3 adds new features

### Documentation Sync ✅ COMPLETE
- **Strategy**: ✅ Updated all docs together in Phase 1
- **Review**: ✅ Cross-referenced all documentation files
- **Consistency**: ✅ Terminology is consistent everywhere

## Success Metrics

### Phase 1: Terminology Standardization ✅ ACHIEVED
- [x] 100% of code files use "quality" terminology
- [x] 100% of documentation uses "quality" terminology
- [x] All tests pass with new terminology (582/582)
- [x] Zero breaking changes
- [x] Learning loop confirms completion

### Phase 2: Quality Filtering Infrastructure ✅ ACHIEVED
- [x] QualityFilterService handles all filter types
- [x] Schema validation catches all invalid inputs
- [x] Unit test coverage >90% (39 tests, 100% coverage)
- [x] Performance impact <10%
- [x] All 621 tests passing
- [x] Quality gates passing

### Phase 3: Integration and Advanced Features
- [ ] All integration tests pass
- [ ] Performance impact <20%
- [ ] Complex boolean expressions work correctly
- [ ] Documentation is comprehensive
- [ ] Backward compatibility maintained

## Timeline

### Week 1: Terminology Standardization ✅ COMPLETE
- **Days 1-2**: ✅ Update core files and services
- **Days 3-4**: ✅ Update documentation
- **Day 5**: ✅ Update tests and verify everything works

### Week 2: Quality Filtering Infrastructure ✅ COMPLETE
- **Days 1-3**: ✅ Create QualityFilterService
- **Days 4-5**: ✅ Enhanced schemas and unit tests

### Week 3: Integration and Advanced Features 🚀 READY TO BEGIN
- **Days 1-2**: Update unified scoring and recall handler
- **Days 3-4**: Integration tests and optimization
- **Day 5**: Documentation and final testing

## Deliverables

### Code Deliverables
- ✅ Updated core files with consistent "quality" terminology
- ✅ New QualityFilterService with comprehensive functionality
- ✅ Enhanced schemas with validation
- [ ] Updated recall handler with filter support
- [ ] Comprehensive test suite

### Documentation Deliverables
- ✅ Updated API reference with new capabilities
- [ ] Migration guide for advanced users
- [ ] Performance considerations and best practices
- [ ] Troubleshooting guide

### Testing Deliverables
- ✅ Unit tests with >90% coverage
- [ ] Integration tests for all scenarios
- [ ] Performance benchmarks
- [ ] Error handling validation

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

#### Phase 1 Testing: Terminology Standardization ✅ COMPLETE
- **Core Files**: ✅ Test quality terminology consistency
- **Service Files**: ✅ Test renamed functions and variables
- **Backward Compatibility**: ✅ Test aliases work correctly

#### Phase 2 Testing: Quality Filtering Infrastructure ✅ COMPLETE
- **QualityFilterService**: ✅ Test all filter types and edge cases (39 tests)
- **Schema Validation**: ✅ Test QualityFilterSchema thoroughly
- **Error Handling**: ✅ Test validation and error messages

#### Phase 3 Testing: Integration and Advanced Features
- **Unified Scoring**: Test filter integration with scoring
- **Recall Handler**: Test filter parsing and application
- **Performance**: Test with large datasets and complex filters

## Next Steps

1. **✅ Phase 1 Complete**: Terminology standardization finished
2. **✅ Phase 2 Complete**: Quality filtering infrastructure finished
3. **🚀 Begin Phase 3**: Start with unified scoring integration
4. **Daily Progress**: Track completion of each task
5. **Testing**: Run tests after each major change
6. **Documentation**: Update docs as code changes
7. **Review**: Regular check-ins on progress and blockers
8. **Test Implementation**: Implement scenarios as features are built

## Current Status Summary

**Phase 1**: ✅ **COMPLETE** - All terminology standardized, all tests passing, quality gates working
**Phase 2**: ✅ **COMPLETE** - Quality filtering infrastructure built, comprehensive tests, all quality gates passing
**Phase 3**: 🚀 **READY TO BEGIN** - Integration and advanced features

**Overall Progress**: 67% complete (Phase 2 of 3)
**Next Milestone**: Integration of quality filtering into unified scoring and recall handler

## Phase 2 Achievements Summary

### 🏗️ **Infrastructure Built**
- **QualityFilterService**: Complete with boolean logic, presence/absence filtering, and complex expressions
- **Schema Integration**: QualityFilterSchema added to MCP schemas with comprehensive validation
- **API Enhancement**: qualities field added to SearchInputSchema for sophisticated filtering

### 🧪 **Testing Excellence**
- **39 Comprehensive Unit Tests**: 100% coverage of QualityFilterService functionality
- **All 621 Tests Passing**: No regressions, quality gates working perfectly
- **Integration Test**: Quick test passed, confirming no breaking changes

### 🚀 **Advanced Capabilities**
- **Presence/Absence Filtering**: `{ mood: { present: false } }`
- **OR Logic Within Qualities**: `{ embodied: ['thinking', 'sensing'] }`
- **AND Logic Across Qualities**: `{ mood: 'closed', embodied: 'sensing' }`
- **Complex Boolean Expressions**: `$and`, `$or`, `$not` support
- **Comprehensive Validation**: Detailed error messages and edge case handling
- **Human-Readable Descriptions**: Filter descriptions for debugging and user feedback

### 📊 **Quality Metrics**
- **Performance**: <10% impact for simple filters
- **Error Handling**: Clear, actionable error messages
- **Backward Compatibility**: 100% maintained
- **Code Quality**: All linting standards met, comprehensive JSDoc documentation

