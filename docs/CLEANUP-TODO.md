# Cleanup Tasks After Streamlining

## Scripts to Update or Remove

### Scripts that will be obsolete:
- `src/scripts/migrate-legacy-data.ts` - Old migration format
- `src/scripts/enhance-experiences-with-ai.ts` - Qualities are now required
- `src/scripts/enrich-standalone.ts` - Old enrichment logic

### Scripts that need updating:
- `src/scripts/regenerate-embeddings.ts` - Update to use concatenated qualities
- `src/scripts/generate-manifest.ts` - May need updates for new schema

## Files to Remove After Migration

### Old Service Files:
- `src/services/experience-old.ts`
- `src/services/search-old.ts`
- `src/services/enrich.ts` (if not used by reconsider)

### Old Handler Files:
- `src/mcp/experience-handler-old.ts`
- `src/mcp/reconsider-handler-old.ts`
- `src/mcp/tools-old.ts`

### Old Test Files:
- Any `.test.ts.bak` files
- Tests that rely on old structure

## Other Cleanup Tasks

1. Remove references to `nextMoment` throughout codebase
2. Remove references to `reflects` pattern realization
3. Update all imports to use new services
4. Clean up unused types and interfaces
5. Update README and documentation
6. Remove complex recall/search features from old search service

## Migration Path

1. Run migration script on test data
2. Verify all experiences have required qualities
3. Test new handlers with migrated data
4. Update integration tests
5. Remove old files
6. Update documentation