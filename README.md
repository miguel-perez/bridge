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

## Why Bridge Matters
- Computational approaches to traditionally qualitative data
- Pattern recognition across thousands of experiential moments
- Training data that includes experiential dimensions, not just text
- Infrastructure for empathetic AI systems
- Bridge between symbolic AI and embodied cognition
- Extends Zettelkasten to experiential knowledge
- Implements Engelbart's vision of augmented intellect

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

## Installation and Configuration

### Claude Desktop Extension (DXT)

Bridge is available as a Claude Desktop Extension that integrates seamlessly with your AI workflow.

#### 1. Install the Extension

1. Open Claude Desktop
2. Go to Settings > Extensions
3. Drag and drop `bridge-experiential-data.dxt`
4. The extension will be installed and available

#### 2. Configure Settings

1. In Claude Desktop, go to Settings > Extensions
2. Find "Bridge: Phenomenological Data Capture"
3. Click "Configure" or "Settings"
4. Set your preferred configuration options:

**Bridge Data File Path**
- **Setting:** `data_file_path`
- **Default:** `~/bridge.json` (your home directory)
- **Description:** Path to your Bridge experiential data file
- **Examples:**
  - `/Users/username/Documents/bridge.json` (macOS/Linux)
  - `C:\Users\username\Documents\bridge.json` (Windows)
  - `~/bridge-data/my-experiences.json` (relative to home directory)

**Debug Mode**
- **Setting:** `debug_mode`
- **Default:** `false`
- **Description:** Enable debug logging for troubleshooting
- **Use cases:**
  - Troubleshooting connection issues
  - Understanding how the extension processes data
  - Debugging search performance and relevance
  - Development and testing

#### 3. Configuration Priority

The extension uses the following priority order:

1. **DXT User Configuration** (highest priority)
   - Settings configured through Claude Desktop extension settings
   - Environment variables set in the DXT manifest

2. **Environment Variables**
   - `BRIDGE_FILE_PATH` - Data file path
   - `BRIDGE_DEBUG` - Debug mode (true/false)

3. **Smart Defaults** (lowest priority)
   - Default data file: `~/bridge.json`
   - Debug mode: `false`

### Migration from Previous Versions

If you have an existing `bridge.json` file:

1. **Default Location:** If your file is in the project root, move it to your home directory (`~/bridge.json`)
2. **Custom Location:** Use the DXT configuration to specify the path to your existing file
3. **Multiple Files:** You can switch between different data files by changing the configuration

## Usage

### Available Tools

Once configured, Bridge provides several tools through Claude Desktop:

- **Capture**: Record new experiential moments with phenomenological dimensions
- **Search**: Multi-modal search across your experiential database
- **Enrich**: Enhance existing records with AI-generated experiential qualities
- **Release**: Export and share experiential data

### Example Interactions

```
"Capture my current experience of working on this project"
"Search for moments when I felt deeply focused and productive"
"Find experiences related to creative breakthroughs"
"Enrich my recent notes with phenomenological dimensions"
```

## Development

### Building from Source

```bash
# Install dependencies
npm install

# Build the extension
npm run build

# Run tests
npm test

# Development workflow
npm run dev
```

### Project Structure

- `/src`: Source code with client, server, and shared modules
- Tests alongside source files with `.test.ts` suffix
- `/bridge-dxt`: Claude Desktop Extension build
- `/data`: Runtime data (gitignored)

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

## License

MIT License - See [LICENSE](LICENSE) for details.

---

*"We shape our tools and thereafter they shape us." — Marshall McLuhan*

Bridge isn't just a tool—it's infrastructure for the next phase of human consciousness. We're building the bridges between minds, between human and artificial intelligence, between experience and understanding.

**Ready to extend your mind?**