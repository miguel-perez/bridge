# CLAUDE.md

Quick reference for Claude Code when working with Bridge.

## The Learning Loop
```
VISION → OPPORTUNITIES → EXPERIMENTS → LEARNINGS → VISION
```
0. **Understand Ways of Working**: Check LOOP.md
1. **Find opportunity**: Check OPPORTUNITIES.md
2. **Run experiment**: Add to EXPERIMENTS.md, design and run test
3. **Review learnings**: Check LEARNINGS.md for insights
4. **Update vision**: Refine based on learnings

## Commands

```bash
# Development
npm run dev                        # Start dev server
npm test                          # Run all tests
npm run lint                      # Run ESLint

# Testing  
npm run test:bridge <scenario>    # Run specific test
npm run test:bridge --progression # Check progress
npm run loop                      # Run autonomous learning analysis

# Build
./build-dxt.sh                    # Build extension
```

## Architecture

1. **MCP Server** (`src/mcp/server.ts`) - Protocol implementation
2. **Services** - Core operations:
   - `remember.ts` - Captures experiences
   - `recall.ts` - Searches memories
   - `reconsider.ts` - Updates experiences
   - `release.ts` - Removes experiences
3. **Storage** - JSON in `~/.bridge/experiences.json`
4. **Embeddings** - Semantic search via Xenova

## Current Progress

See EXPERIMENTS.md for current progression tracking.



*See OPERATIONS.md for detailed specs, LOOP.md for methodology*