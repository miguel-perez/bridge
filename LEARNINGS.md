# Bridge Learnings

This document captures validated insights from Bridge experiments with clear evidence trails.

## Core Behavioral Insights

## 2025-07-21 - Learning Loop Analysis (EXP-001)

### Patterns Observed
- Bridge successfully detected thematic similarities between anxiety experiences across different temporal contexts (Turn 3: identified connection between future presentation anxiety and past familiar anxiety feelings)
- Quality signatures showed consistent core markers for anxiety states: "embodied.sensing" and "mood.closed" appeared in both experiences while temporal qualities appropriately varied

### Limitations Identified
- Average operation latency of 7.3 seconds per tool call could disrupt conversational flow, particularly during similarity detection
- Sort parameter in recall operation didn't affect output order despite "sort: created" specification, suggesting potential functionality issue

### Evidence Trail
- Experiment: EXP-001 (see EXPERIMENTS.md)
- Test run: test-run-1753069074129.json
- Analysis: /Users/miguel/Git/bridge/test-results/learning-loop-1753069156823.json
- Model: claude-opus-4-20250514
- Thoughts generated: 8
