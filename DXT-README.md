# Bridge Desktop Extension (DXT)

Bridge is now available as a Desktop Extension for Claude Desktop, providing seamless integration for phenomenological
data capture and analysis directly within your AI conversations.

## Installation

1. **Build the extension** (if not already built):
   ```bash
   # macOS/Linux
   npm run dxt:build
   
   # Windows
   npm run dxt:build:windows
   ```
   
   This will create a `bridge.dxt` file (~120KB) containing everything needed.

2. **Install in Claude Desktop**:
   - Open Claude Desktop
   - Go to Settings → Extensions
   - Click "Load from file..."
   - Select the `bridge.dxt` file
   - Configure your data file path in the extension settings

## Configuration

Bridge works out of the box with sensible defaults. You can optionally configure:

1. **Data File Path**: Where to store your experiential data 
   - Default: `Documents/Bridge/experiences.json`
   - The directory will be created automatically if it doesn't exist

2. **OpenAI API Key** (Optional): For enhanced semantic search
   - When provided, enables advanced pattern matching with OpenAI embeddings
   - Leave empty to disable semantic search (uses exact matching only)

3. **Debug Mode**: Enable for troubleshooting (default: false)

## Available Tools

Once installed, Bridge provides two powerful MCP tools:

### 1. Experience
Capture and search experiential moments with seven-dimensional quality framework:
- **embodied**: How consciousness textures through body/mind (thinking/sensing)
- **focus**: Attentional quality (narrow/broad)
- **mood**: Emotional atmosphere (open/closed)  
- **purpose**: Directional momentum (goal/wander)
- **space**: Spatial awareness (here/there)
- **time**: Temporal orientation (past/future)
- **presence**: Social quality (individual/collective)

#### Extended Cognition Model
- **Humans**: Capture only evident qualities (2-4 typically) - natural selective attention
- **AI**: Always capture all 7 qualities - extended perception
- **Together**: Create richer experiential maps than either could alone

#### Quality Values
Each quality can be:
- `false` - not prominent (receded)
- `true` - prominent but mixed or not a specific direction
- `string` - prominent with specific direction (e.g., 'thinking', 'sensing')

#### Key Features
- **Integrated Recall**: Search while capturing with `recall` parameter
- **Context Field**: Add context for atomic, self-contained experiences
- **Pattern Realizations**: Use `reflects` array to link insights to experiences
- **Reasoning Chains**: Use `nextMoment` to declare intended experiential states
- **Batch Operations**: Capture multiple complementary perspectives at once
- **Auto-Reflection**: Flows generate insights when chains complete naturally

### 2. Reconsider
Update or release experiences as understanding evolves:
- **Update Mode**: Revise qualities, who, source, or add reflects connections
- **Release Mode**: Set `release: true` with optional reason to gracefully remove
- **Batch Operations**: Update or release multiple experiences in one call
- **Continuity**: Maintains experiential thread while allowing growth

## Usage Examples

### Basic Capture - Human (2-4 qualities)
```
"I'm sitting here, heart racing about tomorrow's presentation"
→ Bridge captures: embodied.sensing, mood.closed, time.future
```

### Extended Capture - AI (all 7 qualities)
```
"I sense the anticipation mixing with determination in your words"
→ Bridge captures all 7: embodied.sensing, focus.narrow, mood, purpose.goal, 
  space.here, time.future, presence.collective
```

### Context for Atomicity
```
"That completely changes everything!"
Context: "After discovering the config file was in the wrong directory"
→ Creates self-contained experience that makes sense without conversation history
```

### Pattern Realization with Reflects
```
"I notice I always feel anxious before things that end up going well"
Reflects: ["exp_123", "exp_456"] 
→ Links this insight to specific past experiences
```

### Integrated Recall While Capturing
```
"This reminds me of something..."
With recall: "similar breakthrough moments" (limit 3)
→ Captures the experience AND shows 3 related past experiences
```

### Reasoning Chain with NextMoment
```
"Let me think through this systematically"
Current: embodied.thinking, focus.narrow, mood.open, purpose.goal
NextMoment: embodied.thinking, focus.broad, mood.open, purpose.wander
→ Declares shift from narrow analysis to broad exploration
```

### Batch Complementary Capture
```
Human: "I just need to get this working" (mood.closed, purpose.goal)
Claude: "I notice frustration building alongside determination" (all 7 qualities)
→ Creates complementary perspectives of same moment
```

### Mixed Qualities (true for prominent but mixed)
```
"Processing this loss while planning next steps"
→ embodied: true (both thinking and sensing)
→ mood: true (both open and closed)
→ purpose: true (both goal and wander)
```

### Reconsider - Deepen Understanding
```
"Update exp_abc123 - I realize there was also a time.past quality"
→ Adds missing quality to existing experience
```

### Reconsider - Collective Shift
```
"Update exp_def456 - this was actually a shared experience with Claude"
→ Changes who: ["Human", "Claude"] and presence: "collective"
```

### Release with Gratitude
```
"Release exp_ghi789 - this was just test data"
→ Removes experience with reason: "Test data during development"
```

### Mixed Operations
```
Update exp_1 with corrected text
Release exp_2 as duplicate
Add reflects connections to exp_3
→ Batch operations in single call
```

## When to Use Each Feature

### Use Context When:
- The experience references "this" or "that" without explaining what
- You want the experience to be understandable in isolation
- Capturing reactions to specific events or discoveries

### Use Integrated Recall When:
- Something reminds you of past experiences
- You want to find patterns while capturing new moments
- Building on previous insights or breakthroughs

### Use NextMoment When:
- Building reasoning chains or thought sequences
- Declaring intended shifts in experiential state
- Creating deliberate transitions in thinking modes

### Use Reflects When:
- Having realizations about patterns across experiences
- Connecting insights to specific past moments
- Building meta-understanding of experiential threads

### Use Release When:
- Experiences no longer serve their purpose
- Cleaning up test data or duplicates
- Making space for new growth

## Technical Details

- **Runtime**: Node.js 18+
- **Storage**: Local JSON file with automatic backups
- **Embeddings**: Optional - OpenAI text-embedding-3-large or none (default)
- **Architecture**: MCP server with stdio transport
- **Performance**: Optimized for instant recall and pattern matching

## Troubleshooting

1. **Extension not loading**: 
   - Check Claude Desktop console for errors
   - Enable debug mode in extension settings
   - Verify Node.js 18+ is installed

2. **Data not persisting**:
   - Check file permissions on data file path
   - Ensure path exists and is writable
   - Look for errors in debug logs

3. **Search not finding results**:
   - If using OpenAI embeddings, verify API key is correct
   - Check that experiences have been captured
   - Try different search terms or use quality filters

## Privacy & Security

- All data stored locally on your machine
- No external API calls for core functionality
- No embeddings by default (exact text matching)
- Optional OpenAI embeddings for semantic search

## Development

To modify and rebuild:

1. Make changes to source code
2. Run quality checks: `npm run quality`
3. Build DXT package: `npm run dxt:build` (or `dxt:build:windows`)

Other useful commands:
- `npm run dev` - Development watch mode
- `npm test` - Run unit tests
- `npm run test:all` - Run all tests
- `npm run lint:fix` - Fix code style issues

## License

MIT License - See LICENSE file for details