# ESLint JSDoc Integration for Bridge

**Document Purpose**: This document explains the ESLint JSDoc integration that enforces our Bridge-specific documentation rubric.

**For Developers**: Use this to understand how ESLint helps maintain consistent JSDoc documentation across the Bridge codebase.

## Overview

Bridge now uses `eslint-plugin-jsdoc` and `eslint-plugin-tsdoc` to automatically enforce our JSDoc documentation standards. This integration helps maintain consistent, high-quality documentation that follows our Bridge-specific rubric.

## Installed Plugins

- **`eslint-plugin-jsdoc`**: Enforces JSDoc comment requirements and structure
- **`eslint-plugin-tsdoc`**: Validates TSDoc syntax and formatting

## Current Configuration

The ESLint configuration in `.eslintrc` is set up with Bridge-specific rules:

### Core Rules

```json
{
  "plugins": ["@typescript-eslint", "jsdoc", "tsdoc"],
  "ignorePatterns": ["**/*.test.ts", "**/*.integration.test.ts"],
  "rules": {
    // TSDoc syntax validation - warnings only
    "tsdoc/syntax": "warn",
    
    // JSDoc requirements for public APIs
    "jsdoc/require-jsdoc": ["warn", {
      "publicOnly": true,
      "require": {
        "FunctionDeclaration": true,
        "ClassDeclaration": true,
        "MethodDefinition": true
      }
    }],
    
    // Require descriptions for documented items
    "jsdoc/require-description": "warn",
    
    // Disable redundant TypeScript-specific tags
    "jsdoc/require-param": "off",
    "jsdoc/require-returns": "off",
    "jsdoc/require-param-description": "off",
    "jsdoc/require-returns-description": "off",
    
    // JSDoc structure enforcement
    "jsdoc/check-alignment": "warn",
    "jsdoc/check-indentation": "warn",
    "jsdoc/check-syntax": "warn",
    
    // Bridge-specific: Optional enhancements
    "jsdoc/require-example": "off",
    "jsdoc/require-throws": "off"
  }
}
```

### Key Features

1. **Test Files Excluded**: All `*.test.ts` and `*.integration.test.ts` files are ignored
2. **Public APIs Only**: JSDoc requirements only apply to exported/public functions and classes
3. **Warnings, Not Errors**: Current configuration uses warnings to encourage gradual improvement
4. **TypeScript-Aware**: Disables redundant tags that TypeScript handles automatically

## Current Status

As of the latest lint run, we have:
- **0 errors** - No blocking issues
- **153 warnings** - Areas for improvement
- **80 warnings fixable** - Can be auto-fixed with `--fix`

## Common Warning Types

### 1. Missing JSDoc Comments
```
warning  Missing JSDoc comment  jsdoc/require-jsdoc
```
**Solution**: Add JSDoc comments to public functions/classes following our rubric.

### 2. TSDoc Syntax Issues
```
warning  tsdoc-malformed-inline-tag: Expecting a TSDoc tag starting with "{@"
warning  tsdoc-escape-right-brace: The "}" character should be escaped using a backslash
```
**Solution**: Fix TSDoc syntax or escape special characters.

### 3. Missing Descriptions
```
warning  Missing JSDoc block description  jsdoc/require-description
```
**Solution**: Add descriptions to JSDoc blocks.

## Usage Commands

### Check Documentation Issues
```bash
npm run lint
```

### Auto-fix What's Possible
```bash
npm run lint:fix
```

### Check Specific Files
```bash
npx eslint src/mcp/experience-handler.ts
```

### Ignore Warnings for Specific Lines
```typescript
// eslint-disable-next-line jsdoc/require-jsdoc
function internalHelper() {
  // ...
}
```

## Gradual Improvement Strategy

The current configuration is designed for gradual improvement:

1. **Phase 1 (Current)**: Warnings only, focus on public APIs
2. **Phase 2 (Future)**: Enable stricter rules for critical files
3. **Phase 3 (Future)**: Convert warnings to errors for new code

## Bridge-Specific Guidelines

When adding JSDoc comments, follow our Bridge rubric:

### MCP Tool Handlers
```typescript
/**
 * Handles experience capture requests from MCP clients
 * @remarks
 * Validates input using Zod schemas, delegates to ExperienceService,
 * and returns user-friendly responses.
 * @example
 * ```ts
 * const result = await experienceHandler.handle({
 *   source: "I feel anxious about tomorrow's presentation",
 *   experience: ["embodied.sensing", "mood.closed"]
 * });
 * ```
 * @throws {ValidationError} When input validation fails
 * @see {@link ExperienceService} for core business logic
 */
```

### Service Methods
```typescript
/**
 * Performs semantic search with unified scoring
 * @remarks
 * Combines text similarity (40%), dimensional matching (30%), 
 * temporal relevance (20%), and filter compliance (10%).
 * @throws {EmbeddingError} When embedding generation fails
 */
```

### Configuration Objects
```typescript
/**
 * Configuration for Bridge MCP server behavior
 * @remarks
 * These settings control performance, storage, and feature availability.
 * Most settings can be overridden via environment variables.
 */
interface BridgeConfig {
  /** Maximum number of experiences to return in search results (default: 20) */
  maxSearchResults?: number;
}
```

## Integration with Development Workflow

### Pre-commit Hooks
The project uses `lint-staged` to run ESLint on staged files:
```json
{
  "lint-staged": {
    "src/**/*.ts": ["npm run lint:fix"]
  }
}
```

### CI/CD Integration
ESLint runs automatically in CI to ensure documentation quality.

## Troubleshooting

### Common Issues

1. **"tsdoc-undefined-tag"**: The `@module` tag isn't configured
   - **Solution**: Remove `@module` tags or configure them in TSDoc settings

2. **"tsdoc-malformed-inline-tag"**: Incorrect TSDoc syntax
   - **Solution**: Use proper TSDoc syntax or escape special characters

3. **"Missing JSDoc comment"**: Public function/class without documentation
   - **Solution**: Add JSDoc comment following our rubric

### Disabling Rules Temporarily

For temporary workarounds:
```typescript
/* eslint-disable jsdoc/require-jsdoc */
// Your code here
/* eslint-enable jsdoc/require-jsdoc */
```

## Future Enhancements

1. **Stricter Rules**: Gradually convert warnings to errors
2. **Custom Rules**: Create Bridge-specific ESLint rules
3. **Documentation Coverage**: Track documentation coverage metrics
4. **Auto-generation**: Tools to auto-generate JSDoc templates

## Resources

- [ESLint JSDoc Plugin Documentation](https://github.com/gajus/eslint-plugin-jsdoc)
- [TSDoc ESLint Plugin](https://github.com/microsoft/tsdoc)
- [Bridge JSDoc Rubric](./BRIDGE-JSDOC-RUBRIC.md)
- [TypeScript JSDoc Reference](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html)

This integration ensures Bridge maintains high-quality, consistent documentation that helps developers understand and use the codebase effectively. 