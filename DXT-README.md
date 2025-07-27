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

Features:
- Integrated recall while capturing new experiences
- Dual view: Recent Flow + Emerging Patterns
- NextMoment target state search
- Automatic quality-based clustering

### 2. Reconsider
Update or release experiences as understanding evolves:
- Revise qualities, perspective, or content
- Add pattern connections via reflects array
- Release experiences that no longer serve
- Maintain experiential continuity

## Usage Examples

```
"I feel completely absorbed in the flow while coding - time seems to dissolve"
(Bridge captures with qualities: embodied.thinking, focus.narrow, mood.open, purpose.goal, time.future)

"Show me recent experiences about breakthrough insights"
(Bridge recalls with dual view: Recent Flow + Emerging Patterns)

"Update experience abc123 - it was actually more sensing than thinking"
(Bridge updates qualities while maintaining continuity)

"I want to find experiences similar to this target state: feeling open and wandering"
(Bridge searches using NextMoment target state matching)
```

## Technical Details

- **Runtime**: Node.js 18+
- **Storage**: Local JSON file
- **Embeddings**: OpenAI text-embedding-3-large (when API key provided) or none
- **Architecture**: MCP server with stdio transport
- **Performance**: In-memory vector store for fast similarity search

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