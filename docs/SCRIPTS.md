# Bridge Build Scripts

## Development
- `npm run dev` - Watch mode for development
- `npm start` - Run the bundled MCP server

## Building
- `npm run build` - Compile TypeScript to JavaScript
- `npm run build:bundle` - Create bundled ESM module
- `npm run build:manifest` - Generate manifest.json from sources
- `npm run build:all` - Complete build (compile + manifest + bundle)

## DXT Package Creation
- `npm run dxt:build` - Build complete DXT package (macOS/Linux)
- `npm run dxt:build:windows` - Build complete DXT package (Windows)

The DXT build scripts will:
1. Build and bundle the TypeScript code
2. Generate the manifest.json
3. Create a bridge.dxt package ready for Claude Desktop

## Testing
- `npm test` - Run unit tests with coverage
- `npm run test:integration` - Run integration tests
- `npm run test:simulation` - Run simulation tests
- `npm run test:all` - Run unit and integration tests

## Code Quality
- `npm run lint` - Check code style
- `npm run lint:fix` - Fix code style issues
- `npm run type-check` - TypeScript type checking
- `npm run quality` - Full quality check (lint + types + tests)

## Simplified Workflow

### For Development:
```bash
npm run dev
```

### For Building DXT:
```bash
# macOS/Linux
npm run dxt:build

# Windows
npm run dxt:build:windows
```

### For Testing:
```bash
npm run quality  # Quick quality check
npm run test:all # Comprehensive testing
```