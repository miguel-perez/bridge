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

### EXP-003: Intelligent Learning Loop Recommendations

**Purpose**: Test a recommendation-based learning loop that provides actionable insights without auto-updating files

**Status**: Ready to test

**Test Scenarios**:

1. **Context Aggregation**: Learning loop successfully loads and parses all data sources
   - Git history (recent commits)
   - Unit test results
   - Bridge scenario test results
   - All documentation files

2. **Recommendation Generation**: System produces useful, prioritized recommendations
   - Each recommendation has clear rationale and evidence
   - Priorities (critical/high/medium/low) are appropriate
   - Suggestions are actionable and specific

3. **Evidence Linking**: Recommendations trace back to specific evidence
   - Links to relevant commits
   - References specific test failures
   - Points to documentation sections

4. **Report Quality**: Output is clear and actionable
   - Executive summary captures key insights
   - Recommendations are well-structured
   - Next steps are concrete

**Measurable Outcomes**:

- Time saved vs manual analysis (target: 80% reduction)
- Recommendation accuracy (>90% actionable suggestions)
- Evidence quality (each recommendation has 2+ evidence sources)
- Developer satisfaction with insights provided

**Learning Questions**:

- What context is most valuable for generating recommendations?
- How should recommendations be prioritized?
- What format makes recommendations easiest to act on?
- Which types of patterns are most useful to detect?

**Implementation Notes**:

Start with a minimal prototype that:

1. Loads git history and test results
2. Identifies one type of pattern (e.g., test failures after commits)
3. Generates simple recommendations
4. Outputs a markdown report

### EXP-002: Dimensional Filtering and Unified Scoring

**Purpose**: Test the new dimensional filtering capabilities and unified scoring system

**Status**: Ready to test

**Test Scenarios**:

1. Pure dimensional queries (e.g., "mood.closed") should only return exact matches
2. Array dimensional queries should require ALL dimensions to match
3. Mixed text/dimension queries should score all experiences without filtering
4. Unified scoring should properly weight semantic, dimensional, and temporal factors
5. Edge cases: partial dimension names, invalid dimensions, empty results

**Measurable Outcomes**:

- Dimensional filtering accuracy (no false positives like mood.closed matching mood.open)
- Unified scoring effectiveness (relevant experiences ranked higher)
- Performance impact of the new scoring system
- Error handling for edge cases

**Learning Questions**:

- Does unified scoring improve recall relevance?
- How do different weight distributions affect results?
- What query patterns benefit most from dimensional filtering?
- Are there unexpected interactions between scoring components?

## Completed Experiments

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

- Test Results: `test-results/test-run-1753069074129.json`
- Learning Analysis: `/Users/miguel/Git/bridge/test-results/learning-loop-1753069156823.json`
- Validated Insights: Added to LEARNINGS.md (2025-07-21 entry)
