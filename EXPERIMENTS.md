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

### EXP-006: Clustering Similar Experiences
**Status**: Active  
**Purpose**: Enable Bridge to reveal patterns by automatically clustering similar experiences

**Test Scenarios**:
1. **Basic Clustering Evidence**
   - Input: Multiple experiences with overlapping dimensions
   - Expected: Recall returns structured clusters, not flat list
   - Evidence: Loop sees `{ clusters: [...] }` in output

2. **Cluster Quality Evidence** 
   - Input: Experiences with clear semantic/dimensional similarities
   - Expected: Clusters group logically similar experiences
   - Evidence: Loop sees meaningful cluster summaries and groupings

3. **Filtering Integration Evidence**
   - Input: Filtered clustering request
   - Expected: Only relevant experiences are clustered
   - Evidence: Loop sees filtered clusters match input criteria

4. **Edge Case Evidence**
   - Input: Too few experiences or highly diverse data
   - Expected: Graceful degradation (single cluster or individual clusters)
   - Evidence: Loop sees appropriate handling of edge cases

**Measurable Outcomes**:
- ✅ Clusters are returned in structured format
- ✅ Each cluster contains multiple experience IDs
- ✅ Clusters have meaningful summaries/labels
- ✅ Filtering works correctly with clustering
- ✅ Edge cases are handled gracefully
- ✅ Output is MCP protocol compliant

**Learning Questions**:
- Do clusters reveal meaningful patterns?
- Is the output format useful for both humans and LLMs?
- Does clustering work reliably across different datasets?
- How does clustering interact with other recall features?

**Evidence Trail**: Integration test results, cluster output validation, learning loop analysis

## Completed Experiments

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