# Bridge + Graphiti Integration Design

**Purpose**: Add temporal knowledge graph capabilities to Bridge, enabling relationship discovery and richer recall without modifying the core experience capture flow.

## Core Concept

Bridge experiences flow into a temporal knowledge graph where:
- Each experience becomes a node
- Relationships emerge through analysis
- Understanding evolves by adding new nodes, not editing old ones
- The graph reveals patterns Bridge's flat structure cannot

## Architecture Changes

### Current State
```
MCP Tools (experience, reconsider) → ExperienceService → JSON Storage → Embedding Search
```

### Target State  
```
MCP Tools (experience, forget) → ExperienceService → JSON Storage → GraphitiService → FalkorDB
                                                     ↓
                                              