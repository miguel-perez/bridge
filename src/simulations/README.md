# Bridge Simulation Testing

This directory contains **experiential simulation tests** that validate Bridge's core philosophy and usage patterns through LLM-powered conversations.

## Overview

Simulation tests form the third layer of our testing pyramid:

```
┌─────────────────────────────────────┐
│      Simulation Tests (1-3)         │ <- Experiential validation
├─────────────────────────────────────┤
│    Integration Tests (63)           │ <- Protocol validation  
├─────────────────────────────────────┤
│      Unit Tests (705)               │ <- Component validation
└─────────────────────────────────────┘
```

## What Makes Simulations Different

- **Unit tests**: "Does this function work correctly?"
- **Integration tests**: "Does the MCP protocol flow work?"
- **Simulation tests**: "Does this feel like authentic Bridge usage?"

## Running Simulations

```bash
# Run all simulations (requires OPENAI_API_KEY)
npm run test:simulation

# Run with data saving
SAVE_SIMULATION_DATA=true npm run test:simulation

# Run specific simulation
npm run test:simulation -- complementary-awareness
```

## Current Simulations

### 1. Complementary Awareness Journey

Tests Bridge's core extended cognition model where:
- Human captures 2-4 qualities (selective attention)
- AI captures all 7 qualities (extended perception)  
- Combined awareness reveals patterns neither could see alone

**Success Criteria:**
- Human quality count accuracy > 80%
- AI quality count accuracy > 90%
- Complementary value > 70%
- Pattern emergence > 60%
- Natural flow > 70%

## Architecture

### Core Components

- **SimulationRunner**: Orchestrates conversations between agents
- **HumanSimulator**: OpenAI-powered human with partial awareness
- **ClaudeSimulator**: OpenAI-powered Claude with full awareness
- **LLMSimulationEvaluator**: Judges simulation quality using GPT-4

### How It Works

1. **Setup**: Create isolated Bridge environment
2. **Conversation**: Agents alternate turns following scenario
3. **Bridge Calls**: AI agent uses Bridge tools naturally
4. **Evaluation**: LLM judges experiential quality
5. **Scoring**: Quantitative metrics for CI/CD

### Evaluation Metrics

```typescript
{
  humanQualityCount: 85,     // Captures 2-4 qualities?
  aiQualityCount: 95,        // Captures all 7 qualities?
  complementaryValue: 82,    // Combined > sum of parts?
  patternEmergence: 78,      // Insights naturally arise?
  naturalFlow: 88,           // Feels authentic?
  overallScore: 85           // Weighted average
}
```

## Adding New Simulations

1. Create scenario in `scenarios/`:
```typescript
export const MY_SCENARIO: SimulationScenario = {
  name: 'My Simulation',
  description: '...',
  humanContext: '...',
  aiContext: '...',
  objectives: { human: '...', ai: '...', shared: '...' },
  expectedOutcomes: [...],
  maxTurns: 12
};
```

2. Create test file `my-simulation.simulation.ts`
3. Focus on experiential quality, not technical correctness

## Design Philosophy

Simulations test whether Bridge fulfills its promise of enabling extended cognition and collaborative wisdom building. They validate:

- The human-AI quality asymmetry works as designed
- Patterns emerge from complementary perspectives
- The experience feels natural and valuable
- Bridge tools enhance rather than interrupt flow

## Cost Considerations

- Uses OpenAI API (gpt-4o-mini for efficiency)
- Each simulation costs ~$0.02-0.05
- Run sparingly: release candidates, major features
- Not part of regular CI to control costs

## Integration with Testing Suite

Simulation tests form the top layer of our testing pyramid:

1. **Unit Tests** (705): Fast, isolated component validation
2. **Integration Tests** (63): Real MCP protocol validation
3. **Simulation Tests** (1): Experiential quality validation

While unit and integration tests ensure Bridge works correctly, simulation tests ensure it *feels* right and fulfills its promise of enabling extended cognition.

## Technical Details

### Environment Requirements

- `OPENAI_API_KEY` environment variable must be set
- Node.js 18+ for ESM support
- Isolated test environments prevent data contamination

### Configuration Options

```typescript
// Simulation delays (in environment variables)
SIMULATION_TURN_DELAY=3000    // Between conversational turns
SAVE_SIMULATION_DATA=true     // Save results to data/simulations/
```

### Test Isolation

- Each simulation creates a temporary Bridge data directory
- MCP client/server run in isolated process
- Automatic cleanup after test completion
- No interference with development Bridge instance

## Future Enhancements

- Multiple scenarios (debugging, creative flow, team collaboration)
- Different LLM providers for agent diversity
- Automated scenario generation from real usage
- Pattern library from successful simulations
- Integration with CI/CD for major releases