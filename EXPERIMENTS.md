# Bridge Experiments

**Document Purpose**: This tracks active and completed experiments on Bridge functionality. Each experiment is designed to test specific features and generate learnings through the learning loop. For insights from completed experiments, see LEARNINGS.md.

**For Developers**: Use this to understand what's being tested and contribute new experiments.

This document outlines experiments designed to work with our learning loop. Each experiment includes specific test scenarios that allow Opus to evaluate results and suggest improvements.

## Experiment Structure

Each experiment follows this format for learning loop compatibility:
1. **Test Scenarios**: Specific conversation flows to test
2. **Measurable Outcomes**: What Opus should evaluate
3. **Learning Questions**: What insights we seek
4. **Evidence Trail**: Links to test results and learnings

## Active Experiments

### EXP-004: Strategic Test Coverage Improvement

**Purpose**: Systematically improve test coverage from 26% to 60%+ to reduce bug introduction rate

**Status**: Ready to implement

**Hypothesis**: The high bug fix rate (33% of commits) is directly correlated with low test coverage (26%). By strategically improving coverage in high-traffic, high-risk areas, we can reduce future bug introduction and improve development velocity.

**Test Scenarios**:

1. **Coverage Gap Analysis**
   - Run coverage report with detailed file-by-file breakdown
   - Identify critical paths with <50% coverage
   - Prioritize by: (change frequency × complexity × criticality)
   - Document top 10 files needing coverage

2. **High-Traffic Area Testing**
   - Focus on `src/services/` (recall, experience, unified-scoring)
   - Add edge case tests for dimensional filtering
   - Test error handling paths
   - Verify timeout and failure scenarios

3. **Integration Test Expansion**
   - Add tests for complete user journeys
   - Test interaction between services
   - Verify MCP protocol compliance
   - Test concurrent operations

4. **Coverage Monitoring**
   - Set up coverage threshold enforcement
   - Add coverage badges to README
   - Configure CI to fail below 60%
   - Track coverage trends in learning loop

**Measurable Outcomes**:

- Increase line coverage from 27.4% to 60%+
- Increase branch coverage from 19.1% to 50%+
- Increase function coverage from 31.5% to 60%+
- Reduce bug fix commit rate from 33% to <20%
- Zero regressions in existing functionality

**Learning Questions**:

- Which types of tests provide the most bug-catching value?
- What's the optimal balance between unit and integration tests?
- Which uncovered code paths are most likely to harbor bugs?
- How does coverage correlate with bug introduction in this codebase?

**Implementation Plan**:

1. **Phase 1: Analysis** (Day 1)
   - Generate detailed coverage report
   - Analyze git history for high-change files
   - Create prioritized test list

2. **Phase 2: Critical Path Tests** (Days 2-3)
   - Write tests for top 5 critical files
   - Focus on error paths and edge cases
   - Ensure 80%+ coverage for these files

3. **Phase 3: Service Layer Tests** (Days 4-5)
   - Complete coverage for recall service
   - Add missing experience service tests
   - Test unified scoring edge cases

4. **Phase 4: Integration & Monitoring** (Day 6)
   - Add end-to-end test scenarios
   - Set up coverage enforcement
   - Document testing best practices

**Success Criteria**:

- All measurable outcomes achieved
- No increase in test execution time >20%
- Clear documentation of testing patterns
- Learning loop confirms reduced bug rate

## Completed Experiments

### EXP-003: Intelligent Learning Loop Recommendations

**Purpose**: Test a recommendation-based learning loop that provides actionable insights without auto-updating files

**Status**: Completed 2025-07-21

**Test Scenarios**: ✓ All scenarios validated

1. **Context Aggregation**: Successfully loads and parses all data sources
   - Git history with commit analysis
   - Unit test results with coverage metrics
   - Bridge scenario test results
   - All documentation files

2. **Recommendation Generation**: Produces prioritized, actionable recommendations
   - Each recommendation includes rationale and evidence
   - Priorities (high/medium/low) based on impact
   - Specific, actionable suggestions

3. **Evidence Linking**: All recommendations trace to specific evidence
   - Links to relevant commits
   - References test results
   - Points to documentation gaps

4. **Report Quality**: Clear, actionable output
   - Executive summary with key metrics
   - Well-structured recommendations
   - Markdown format for easy reading

**Measurable Outcomes**:

- Time saved: ~95% reduction (2 min automated vs 40+ min manual analysis)
- Recommendation accuracy: 100% actionable in recent runs
- Evidence quality: All recommendations have 3+ evidence sources
- Enhanced experiment detection: Correctly identifies completed experiments

**Key Findings**:

- Smart test execution prevents unnecessary re-runs
- Experiment detection works via content matching, not explicit mentions
- Recommendations consistently identify high-impact improvements
- Loop successfully detects patterns like high bug fix rates

**Evidence Trail**:

- Implementation: `src/scripts/learning-loop.ts`
- Test runs: Multiple successful runs in `loop/` directory
- Commits: 12 related commits including feat: enhance learning loop
- Latest analysis: `loop/recommendations-1753111683976.md`

### EXP-002: Dimensional Filtering and Unified Scoring

**Purpose**: Test the new dimensional filtering capabilities and unified scoring system

**Status**: Completed 2025-07-21

**Test Scenarios**: ✓ All scenarios passing

1. Pure dimensional queries return only exact matches ✓
2. Array dimensional queries require ALL dimensions to match ✓
3. Mixed text/dimension queries score all experiences appropriately ✓
4. Unified scoring properly weights all factors ✓
5. Edge cases handled gracefully ✓

**Measurable Outcomes**:

- Dimensional filtering accuracy: 100% (no false positives)
- Unified scoring effectiveness: Significantly improved relevance
- Performance impact: Minimal (~2ms added latency)
- Error handling: All edge cases handled appropriately

**Key Findings**:

- Dimensional filtering eliminates confusion between similar dimensions
- Unified scoring provides more intuitive result ordering
- The scoring weights (0.4 semantic, 0.3 dimensional, 0.2 temporal, 0.1 length) work well
- Pure dimensional queries are powerful for finding specific experience types

**Evidence Trail**:

- Implementation: `src/services/recall.ts`, `src/services/unified-scoring.ts`
- Test scenarios: `recall-queries` and `dimensional-focus` in Bridge tests
- Commits: 14 related commits including fix: dimensional filtering
- All Bridge integration tests passing

### EXP-001: Bridge Operations Discovery

**Purpose**: Establish baseline understanding of how Bridge operations function in practice

**Status**: Completed 2025-07-21

**Test Scenarios**:

1. Basic experience capture with varied quality signatures ✓
2. Similarity detection between related experiences ✓
3. Recall accuracy across different query types ✓
4. Pattern recognition in accumulated experiences ✓
5. Reconsider operation for evolving understanding ✓
6. Release operation for cleanup ✓

**Measurable Outcomes**:

- Tool activation appropriateness: Confirmed tools activate for meaningful moments
- Quality signature accuracy: Dimensions appropriately matched experiences
- Similarity detection effectiveness: Successfully found thematically related experiences
- Recall relevance: Results were contextually appropriate
- Pattern emergence: Anxiety patterns identified across temporal contexts

**Key Findings**:

- Bridge successfully detected thematic similarities between anxiety experiences
- Quality signatures showed consistent markers for emotional states
- Average operation latency of 7.3 seconds could disrupt flow
- Sort parameter in recall didn't affect output order (bug identified)

**Evidence Trail**:

- Test Results: `loop/test-run-1753069074129.json`
- Learning Analysis: `/Users/miguel/Git/bridge/loop/learning-loop-1753069156823.json`
- Validated Insights: Added to LEARNINGS.md (2025-07-21 entry)
