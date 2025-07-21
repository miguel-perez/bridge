# Bridge Experiments

This document outlines experiments designed to work with our learning loop. Each experiment includes specific test scenarios that allow Opus to evaluate results and suggest improvements.

## Experiment Structure

Each experiment follows this format for learning loop compatibility:
1. **Test Scenarios**: Specific conversation flows to test
2. **Measurable Outcomes**: What Opus should evaluate
3. **Learning Questions**: What insights we seek
4. **Evidence Trail**: Links to test results and learnings

## Active Experiments

### EXP-001: Bridge Operations Discovery

**Purpose**: Establish baseline understanding of how Bridge operations function in practice

**Test Scenarios**:

1. Basic experience capture with varied quality signatures
2. Similarity detection between related experiences
3. Recall accuracy across different query types
4. Pattern recognition in accumulated experiences
5. Reconsider operation for evolving understanding
6. Release operation for cleanup

**Measurable Outcomes**:

- Tool activation appropriateness (when tools are used vs not used)
- Quality signature accuracy (do the dimensions match the experience?)
- Similarity detection effectiveness (related experiences found?)
- Recall relevance (useful results returned?)
- Pattern emergence (what patterns become visible?)

**Learning Questions**:

- How do quality signatures evolve with conversation depth?
- What patterns emerge from accumulated experiences?
- How does similarity detection handle nuanced differences?
- What makes recall results most useful?
- When is reconsideration most valuable?

**Evidence Trail**:

- Test Results: `test-results/test-run-*.json`
- Learning Analysis: `test-results/learning-loop-*.json`
- Validated Insights: Added to LEARNINGS.md with references