# Bridge Learnings

**Document Purpose**: This captures validated insights from experiments and real-world usage. Each learning includes evidence trails and practical implications. These are proven findings, not hypotheses.

**For Everyone**: Use this to understand what we've discovered about Bridge's behavior and best practices.

This document captures validated insights from Bridge experiments with clear evidence trails.

## Core Behavioral Insights

### 2025-07-21 - Dimensional Filtering Fix

**Key Achievement**: Fixed critical bug where partial dimension matching caused false positives (e.g., "mood.closed" matching "mood.open")

**Technical Implementation**:
- Implemented unified scoring system with dynamic weight calculation
- Added proper filtering for pure dimensional queries
- Mixed text/dimension queries now score all experiences without filtering
- Comprehensive test coverage added for dimensional filtering

**Impact**: Recall operations now correctly filter experiences when querying by dimensions, ensuring more accurate and relevant results.

**Evidence Trail**:
- Commit: 0379376 "fix: dimensional filtering for recall queries"
- Files affected: recall.ts, unified-scoring.ts, recall-handler.ts
- Tests added: recall-service.test.ts, unified-scoring.test.ts

### 2025-07-21 - Learning Loop Analysis (EXP-001)

**Patterns Observed**:
- Bridge successfully detected thematic similarities between anxiety experiences across different temporal contexts (Turn 3: identified connection between future presentation anxiety and past familiar anxiety feelings)
- Quality signatures showed consistent core markers for anxiety states: "embodied.sensing" and "mood.closed" appeared in both experiences while temporal qualities appropriately varied

**Limitations Identified**:
- Average operation latency of 7.3 seconds per tool call could disrupt conversational flow, particularly during similarity detection
- Sort parameter in recall operation didn't affect output order despite "sort: created" specification, suggesting potential functionality issue (now fixed)

**Evidence Trail**:
- Experiment: EXP-001 (see EXPERIMENTS.md)
- Test run: test-run-1753069074129.json
- Analysis: /Users/miguel/Git/bridge/loop/learning-loop-1753069156823.json
- Model: claude-opus-4-20250514
- Thoughts generated: 8

## Architecture Insights

### 2025-07-20 - Vision and Technical Separation

**Documentation Improvement**: Separated conceptual vision from technical details for clarity

**Changes Made**:
- Removed duplicate content about sequences and pattern recognition from VISION.md
- Created TECHNICAL.md for detailed API documentation and recall() functionality
- Streamlined VISION.md to focus on conceptual overview and user benefits

**Impact**: Clearer documentation structure helps users understand Bridge at appropriate levels of detail

**Evidence Trail**:
- Commit: 5282bda "docs: clean up VISION.md and separate technical details"
- New file: TECHNICAL.md
- Updated: VISION.md

### 2025-07-20 - Learning Loop Optimization

**Performance Improvement**: Streamlined learning loop to prevent Opus timeouts

**Changes Made**:
- Reduced to 8 thoughts maximum
- Removed forced categorization that was causing analysis paralysis
- Improved test result capture with complete conversation flow

**Impact**: More reliable learning loop execution without sacrificing insight quality

**Evidence Trail**:
- Commit: 39f1d0b "fix: learning loop parsing and streamline to 8 thoughts with Opus"
- Commit: da043df "fix: improve test result capture with complete conversation flow"

## Gap Analysis

### 2025-07-21 - Vision vs Implementation

**Currently Implemented**:

- Basic experience capture with quality signatures ✓
- Semantic recall with embedding-based search ✓
- Dimensional filtering (pure and mixed queries) ✓
- Unified scoring system ✓
- Reconsider and release operations ✓
- Test infrastructure with learning loop ✓

**Vision Features Not Yet Implemented**:

1. **Pattern Recognition** (OPPORTUNITIES.md Score: 560)
   - No `reflects: string[]` field for linking pattern realizations
   - Cannot capture "aha" moments about connections between experiences
   - No way to query pattern realizations specifically

2. **Clustering Analysis** (OPPORTUNITIES.md Score: 378)
   - No `{ as: "clusters" }` option in recall
   - Cannot group similar experiences automatically
   - Missing thematic analysis capabilities

3. **Sequence Analysis** (OPPORTUNITIES.md Score: 240)
   - No `{ as: "sequence" }` option in recall
   - Cannot detect temporal patterns or transitions
   - Missing OODA loop and flow state detection

4. **Advanced Filtering** (OPPORTUNITIES.md Score: 280)
   - Cannot filter by dimension presence/absence
   - No support for complex dimension queries

5. **Natural Language Time Filters** (OPPORTUNITIES.md Score: 216)
   - No parsing of "last week", "yesterday", etc.
   - Only supports explicit date ranges

**Technical Debt**:

- Sort parameter in recall not fully functional
- Average 7.3 second latency needs optimization
- Test results directory management needs improvement

**Next Priority**: Based on scoring, pattern recognition (`reflects` field) should be implemented first as it's fundamental to Bridge's collaborative wisdom vision
