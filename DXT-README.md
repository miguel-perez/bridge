# Bridge Desktop Extension (DXT)

Bridge is now available as a Desktop Extension for Claude Desktop, providing seamless integration for phenomenological data capture and analysis directly within your AI conversations.

## Installation

1. **Build the extension** (if not already built):
   ```bash
   # macOS/Linux
   ./build-dxt.sh
   
   # Windows
   ./build-dxt.ps1
   ```

2. **Install in Claude Desktop**:
   - Open Claude Desktop
   - Go to Settings → Extensions
   - Click "Load from file..."
   - Select the `bridge.dxt` file
   - Configure your data file path in the extension settings

## Configuration

After installation, you'll need to configure:

1. **Data File Path**: Where to store your experiential data (default: `~/bridge.json`)
2. **Debug Mode**: Enable for troubleshooting (default: false)

## Available Tools

Once installed, Bridge provides four MCP tools:

### 1. Experience
Remember experiences with seven-dimensional phenomenological analysis:
- **Embodied**: Physical sensations and somatic awareness
- **Attentional**: Focus patterns and awareness distribution
- **Affective**: Emotional qualities and feeling tones
- **Purposive**: Intentions and goal-oriented aspects
- **Spatial**: Environmental awareness and positioning
- **Temporal**: Time perception and flow
- **Intersubjective**: Relational and social dimensions

### 2. Search
Find remembered experiences through:
- Text matching (40%)
- Vector similarity (30%)
- Semantic relevance (20%)
- Filter matches (10%)

### 3. Update
Correct or enhance existing experiences:
- Fix content errors
- Update experiential analysis
- Regenerate embeddings
- Modify metadata

### 4. Release
Let go of experiences that no longer serve:
- Remove individual records
- Batch deletion with reasons
- Permanent removal from storage

## Usage Examples

```
"Capture this moment of clarity while coding - I feel completely absorbed in the flow, 
time seems to dissolve, and the solution emerges naturally from the problem space."

"Search for experiences about 'breakthrough insights' from last week"

"Update experience abc123 - the content should say 'profound' not 'profane'"

"Release all experiences tagged with 'practice sessions' - they've served their purpose"
```

## Technical Details

- **Runtime**: Node.js 18+
- **Storage**: Local JSON file
- **Embeddings**: Generated locally using Xenova transformers
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
   - Verify embeddings are generated (may take a moment)
   - Check that captures have completed processing
   - Try broader search terms

## Privacy & Security

- All data stored locally on your machine
- No external API calls for core functionality
- Embeddings generated locally
- Optional LLM enrichment requires API key

## Development

To modify and rebuild:

1. Make changes to source code
2. Run tests: `npm test`
3. Rebuild: `npm run build`
4. Package: `./build-dxt.sh` or `./build-dxt.ps1`

## License

MIT License - See LICENSE file for details