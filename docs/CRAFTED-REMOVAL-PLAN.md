# Crafted Field Removal - Refactoring Plan

## Overview
This document outlines the comprehensive plan to remove the `crafted` field from the Bridge source structure. The crafted field was used to distinguish between "crafted content (blog/refined for an audience)" vs "raw experience (journal/immediate)".

## Impact Analysis
- **Files affected**: 27+ files
- **Tests affected**: 50+ test cases
- **Default value**: Currently defaults to `false`
- **Purpose**: Distinguished between refined content and raw experiences

## Phase 1: Core Type Definitions

### 1. **src/core/types.ts**
- Remove `crafted?: boolean;` from `Source` interface
- Remove `crafted: z.boolean().optional()` from `SourceSchema`
- Remove `CRAFTED: false` from `DEFAULTS` constant
- Update `createSource()` and `createSourceRecord()` functions

### 2. **src/mcp/schemas.ts**
- Remove `crafted` from `ExperienceItemSchema`
- Remove `crafted` from `SearchItemSchema` (filter)
- Remove `crafted` from `ReconsiderItemSchema`
- Update all example generation functions

## Phase 2: Service Layer

### 3. **src/services/experience.ts**
- Remove from `experienceSchema` zod definition
- Remove from `ExperienceInput` interface
- Remove from `rememberExperience()` logic
- Update `getDefaultsUsed()` method

### 4. **src/services/search.ts**
- Remove `crafted?: boolean` from `RecallInput` interface
- Remove crafted filtering logic from `search()` function
- Remove `crafted_filter` from debug filter breakdown

### 5. **src/services/enrich.ts**
- Remove from `enrichSchema` zod definition
- Remove from `EnrichInput` interface
- Remove from `enrichSource()` update logic
- Remove from `getUpdatedFields()` comparison

### 6. **src/services/unified-scoring.ts**
- Verify no direct usage (likely none based on pattern)

### 7. **src/services/grouping.ts**
- Verify no direct usage (likely none based on pattern)

## Phase 3: Handlers & Formatters

### 8. **src/mcp/experience-handler.ts**
- Remove `crafted: item.crafted` from experience mapping
- Remove `crafted` from recall search params mapping

### 9. **src/mcp/reconsider-handler.ts**
- Remove `crafted: item.crafted` from enrichSource call

### 10. **src/utils/formatters.ts**
- Remove `crafted?: boolean` from `RecallSearchParams` interface
- Remove crafted feedback generation logic:
  ```typescript
  if (summary.activeFilters.crafted === true) {
    feedback += ' (crafted content)';
  } else if (summary.activeFilters.crafted === false) {
    feedback += ' (raw experiences)';
  }
  ```

### 11. **src/mcp/tools.ts**
- Update tool descriptions if they mention crafted field
- Update examples to remove crafted references

## Phase 4: Tests (Most extensive changes)

### Unit Tests to Update:
- `src/core/types.test.ts` - Remove `DEFAULTS.CRAFTED` test
- `src/core/storage.test.ts` - Remove crafted from test data
- `src/services/experience.test.ts` - Remove crafted field tests
- `src/services/search.test.ts` - Remove crafted filter tests
- `src/services/enrich.test.ts` - Remove crafted update tests
- `src/services/grouping.test.ts` - Remove from mock data
- `src/mcp/experience-handler.test.ts` - Remove crafted expectations
- `src/mcp/reconsider-handler.test.ts` - Remove crafted tests
- `src/mcp/schemas.test.ts` - Remove crafted validation tests
- `src/utils/formatters.test.ts` - Remove crafted formatting tests

### Integration Tests to Update:
- `src/services/advanced-features.integration.test.ts` - Remove "crafted vs raw experiences" test
- `src/bridge.integration.test.ts` - Remove from test scenarios
- Other integration tests - Remove crafted from test data

## Phase 5: Documentation

### 12. **docs/LEARNINGS.md**
- Remove references to crafted field in filtering examples
- Update any documentation about content types

### 13. **docs/EXPERIMENTS.md**
- Remove crafted field from schema coverage
- Update any examples using crafted

### 14. **DXT-README.md**
- Check for any user-facing documentation about crafted field

## Migration Strategy

As specified, **no data migration is required**. Existing records with the crafted field will simply ignore it going forward.

## Benefits of Removal

1. **Simpler Data Model**: One less field to validate and process
2. **Unified Experience Treatment**: All experiences treated equally
3. **Reduced Complexity**: Fewer filtering options and edge cases
4. **Clearer Purpose**: Focus on experiential qualities rather than content type

## Potential Risks

1. **Lost Distinction**: Can no longer differentiate between refined and raw content
2. **User Expectations**: Some users might expect this filtering capability
3. **Integration Impact**: Any external tools using this field will need updates

## Testing Strategy

1. Run full test suite after each phase
2. Pay special attention to search/filter functionality
3. Verify that existing data with crafted field still loads correctly
4. Check that all examples and documentation are consistent

## Rollback Plan

If issues arise, the changes can be reverted phase by phase since each phase is self-contained.