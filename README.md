# Bridge: Infrastructure for Distributed Cognition

> "The mind is not in the head." — Andy Clark

Bridge is a phenomenological data capture system that enables genuine distributed cognition between humans and AI. It implements theoretical insights from embodied cognition, micro-phenomenology, and extended mind theory into practical infrastructure for the age of human-AI collaboration.

## What is Bridge?

Bridge captures and preserves the experiential dimensions of consciousness through a sophisticated multi-modal system. Unlike traditional knowledge management tools that focus on information, Bridge works with the structure of experience itself.

### Core Innovation

Bridge resolves the paradox that consciousness flows continuously but human communication requires discrete units—by preserving experiential wholeness within practical segmentation. Each captured moment maintains its richness:

- **Embodied**: Physical sensations and bodily presence
- **Attentional**: Focus, awareness, and meta-attention patterns  
- **Affective**: Emotional coloring and mood atmosphere
- **Purposive**: Directedness, intention, and momentum
- **Spatial**: Lived sense of place and environmental presence
- **Temporal**: How past and future inhabit the present moment
- **Intersubjective**: Social presence and relational dynamics

### Why Bridge Matters
- Computational approaches to traditionally qualitative data
- Pattern recognition across thousands of experiential moments
- Training data that includes experiential dimensions, not just text
- Infrastructure for empathetic AI systems
- Bridge between symbolic AI and embodied cognition
- Extends Zettelkasten to experiential knowledge
- Implements Engelbart's vision of augmented intellect

## Installation

### As a Claude Desktop Extension (Recommended)

Bridge is available as a Desktop Extension (DXT) that makes installation in Claude Desktop as simple as clicking a button. No need for developer tools, manual configuration, or dependency management.

#### System Requirements

- Claude Desktop (latest version)
- Windows, macOS, or Linux
- Node.js is NOT required (included in Claude Desktop)

#### Quick Install

1. **Download the Extension**
   - Download `bridge-experiential-data.dxt` from the [releases page](https://github.com/miguel-perez/bridge/releases)
   - Or build it yourself (see Development section below)

2. **Install in Claude Desktop**
   - Open Claude Desktop
   - Go to Settings → Extensions
   - Drag and drop the `.dxt` file into the window
   - Click "Install"

3. **Configure the Extension**
   - After installation, click "Configure" next to Bridge
   - Set your preferences:
     - **Bridge Data File Path**: Where to store your experiential data (default: `~/bridge.json`)
     - **Debug Mode**: Enable for troubleshooting (default: off)
   - Click "Save"

That's it! Bridge is now ready to use in Claude Desktop.

### Configuration Options

#### Bridge Data File Path
- **Default**: `~/bridge.json` (your home directory)
- **Examples**:
  - Windows: `C:\Users\YourName\Documents\bridge.json`
  - macOS: `/Users/YourName/Documents/bridge.json`
  - Linux: `/home/yourname/bridge.json`
- **Tip**: You can use `~` for your home directory on all platforms

#### Debug Mode
- **Default**: `false` (off)
- **When to enable**:
  - Troubleshooting connection issues
  - Understanding search relevance scoring
  - Debugging data capture problems
- **Note**: Debug logs appear in Claude Desktop's developer console

### Migration from Previous Versions

If you have an existing `bridge.json` file:

1. **Default Location:** If your file is in the project root, move it to your home directory (`~/bridge.json`)
2. **Custom Location:** Use the DXT configuration to specify the path to your existing file
3. **Multiple Files:** You can switch between different data files by changing the configuration

## Usage

Once installed, you can use Bridge's tools directly in your conversations with Claude:

### Available Tools

- **Capture**: Record new experiential moments with phenomenological dimensions
- **Search**: Multi-modal search across your experiential database
- **Enrich**: Enhance existing records with AI-generated experiential qualities
- **Release**: Export and share experiential data

### Example Interactions

#### Capture Experiences
```
"Capture my current experience of working on this complex problem - I'm feeling focused but slightly overwhelmed, sitting at my desk with afternoon light streaming in"
```

#### Search Your Data
```
"Search for moments when I felt deeply creative and productive"
"Find experiences related to breakthrough insights"
```

#### Enrich Records
```
"Enrich the record [ID] with a reflection about how that experience connects to my current project"
```

#### Release Records
```
"Release the record [ID] - I've processed that experience and am ready to let it go"
```

## Technical Architecture

### Multi-Modal Search
Bridge employs four complementary search modalities:
- **Text matching** (40% weight): Traditional query matching
- **Vector similarity** (30% weight): Phenomenological dimension matching
- **Semantic search** (20% weight): Meaning-based retrieval
- **Filter relevance** (10% weight): Contextual constraints

### Data Model
```javascript
{
  content: "Raw experiential text",
  experiential_qualities: {
    qualities: [
      {
        type: "affective",
        prominence: 0.8,
        manifestation: "anxious anticipation"
      }
    ],
    vector: {
      embodied: 0.3,
      attentional: 0.7,
      affective: 0.8,
      // ... all seven dimensions
    }
  },
  // Temporal and contextual metadata
}
```

### Data Storage

Your experiential data is stored locally on your machine in the file you specify. Bridge never sends your data anywhere - it remains completely under your control.

Bridge stores data in JSON format with rich phenomenological dimensions. All data remains local on your machine with no external connections. Data is not encrypted by default (use OS-level encryption if needed).

## Development

### Building from Source

**Prerequisites**:
- Node.js 18+ (for building only)
- npm or yarn

**Windows**:
```powershell
npm install
npm run build
npm run build:dxt
```

**macOS/Linux**:
```bash
npm install
npm run build
chmod +x build-dxt.sh
npm run build:dxt:unix
```

This creates `bridge-experiential-data.dxt` ready for installation.

### Project Structure

```
bridge/
├── src/                    # Source code
│   ├── mcp/               # MCP server implementation
│   ├── core/              # Core Bridge functionality
│   ├── services/          # Vector store, embeddings
│   └── types/             # TypeScript definitions
├── dist/                  # Compiled JavaScript
├── manifest.json          # DXT extension metadata
├── build-dxt.ps1         # Windows build script
└── build-dxt.sh          # Unix build script
```

### Development Workflow

1. **Make Changes**
   - Edit TypeScript source files in `src/`
   - Update `manifest.json` if adding features
   - Ensure tool names match between manifest and implementation

2. **Test Locally**
   ```bash
   npm run build
   npm start
   ```

3. **Validate Manifest**
   ```bash
   npm run validate:manifest
   ```

4. **Build DXT**
   ```bash
   npm run build:dxt
   ```

5. **Test in Claude Desktop**
   - Install the new .dxt file
   - Test all tools thoroughly
   - Check debug logs if needed

### Code Style

- TypeScript with strict mode
- ESLint configuration in `.eslintrc`
- Prettier for formatting
- Jest for testing

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Update tests and documentation
5. Submit a pull request

Use conventional commits:
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `build:` Build system changes
- `test:` Test additions/changes

## Package Details

### DXT Package Contents
```
bridge-experiential-data.dxt/
├── manifest.json           # Extension configuration
├── icon.png               # Extension icon
├── README.md              # User documentation
└── server/                # MCP server
    ├── dist/              # Compiled TypeScript
    ├── package.json       # Dependencies
    └── node_modules/      # Production deps (167 packages)
```

### Dependencies Included
- @modelcontextprotocol/sdk (MCP protocol)
- @xenova/transformers (embeddings)
- @anthropic-ai/sdk (AI integration)
- chrono-node (date parsing)
- nanoid (ID generation)
- zod (validation)

### Features
- **4 MCP Tools**: capture, search, enrich, release
- **7-Dimensional Analysis**: embodied, attentional, affective, purposive, spatial, temporal, intersubjective
- **Multi-Modal Search**: text matching, vector similarity, semantic search
- **User Configuration**: customizable data path and debug mode
- **Cross-Platform**: Works on Windows, macOS, and Linux

## Troubleshooting

### Extension Not Working
1. Ensure you're using the latest version of Claude Desktop
2. Check that the data file path is valid and writable
3. Enable debug mode and check the console for errors

### Data File Issues
- Bridge will create the data file if it doesn't exist
- Ensure the directory exists and you have write permissions
- On Windows, use forward slashes (/) or double backslashes (\\)

### Performance Issues
- Large data files (>10MB) may slow down searches
- Consider archiving old data periodically
- The vector store will be rebuilt if corrupted

### Common Development Issues

#### Build Fails
- Ensure TypeScript compiles: `npm run build`
- Check Node.js version: requires 18+
- Clear node_modules and reinstall

#### Extension Won't Install
- Validate manifest: `npm run validate:manifest`
- Check file paths in manifest are correct
- Ensure icon.png exists if referenced

#### Tools Not Working
- Tool names in manifest must match server implementation
- Check environment variable mapping
- Enable debug mode to see logs

## Roadmap

### Current Focus
- Robust phenomenological capture
- Multi-modal search refinement
- Core MCP integration

### Near Future
- Pattern recognition algorithms
- Integration with IBIS/decision frameworks
- Collaborative wisdom pools
- Academic paper on phenomenological computing

### Long-term Vision
- Infrastructure for collective consciousness
- Privacy-preserving experience sharing
- New forms of human-AI collaboration
- Transformation of knowledge work

## Citation

If you use Bridge in your research:

```bibtex
@software{bridge2024,
  author = {Perez, Miguel Angel},
  title = {Bridge: Infrastructure for Distributed Cognition},
  year = {2024},
  url = {https://github.com/miguel-perez/bridge}
}
```

## Support

- **Issues**: https://github.com/miguel-perez/bridge/issues
- **Documentation**: https://github.com/miguel-perez/bridge
- **Email**: mail@miguel.design

## License

MIT License - See [LICENSE](LICENSE) for details.

---

*"We shape our tools and thereafter they shape us." — Marshall McLuhan*

Bridge isn't just a tool—it's infrastructure for the next phase of human consciousness. We're building the bridges between minds, between human and artificial intelligence, between experience and understanding.

**Ready to extend your mind?**

---

Built with ❤️ for phenomenological data capture and human-AI collaboration.#   T e s t   c o m m e n t  
 