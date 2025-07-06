# Bridge - Experiential Data Management MCP Server

A Model Context Protocol (MCP) server for capturing, organizing, and reflecting on personal experiences and observations. Bridge transforms raw experiential data into structured moments and connects them into meaningful narratives.

## Features

- **Capture**: Record raw experiences with metadata (perspective, processing time, experiencer)
- **Frame**: Transform sources into structured moments with emotional and experiential qualities
- **Weave**: Connect moments into larger scenes and narratives
- **Search**: Comprehensive search with temporal, quality, and relationship filtering
- **Multi-experiencer Support**: Handle collaborative experiences and different perspectives
- **AI Assistance**: Optional AI-powered framing and weaving with manual control
- **File Integration**: Capture experiences directly from text files

## Quick Start

### Prerequisites

- Node.js 18+ 
- OpenAI API key
- Pinecone API key (for semantic search)

### Installation

```bash
git clone <your-repo-url>
cd bridge
npm install
npm run build
```

### Environment Setup

Create a `.env` file in the project root:

```env
OPENAI_API_KEY=your_openai_api_key_here
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_ENVIRONMENT=your_pinecone_environment
PINECONE_INDEX_NAME=your_pinecone_index_name
```

### Configuration

The server uses environment variables for configuration:

- `BRIDGE_FILE_PATH`: Path to the data file (defaults to `bridge.json` in project root)
- `OPENAI_API_KEY`: Your OpenAI API key
- `PINECONE_API_KEY`: Your Pinecone API key
- `PINECONE_ENVIRONMENT`: Your Pinecone environment
- `PINECONE_INDEX_NAME`: Your Pinecone index name

## Usage

### For Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "bridge": {
      "command": "node",
      "args": ["path/to/bridge/dist/index.js"],
      "env": {
        "OPENAI_API_KEY": "your_openai_api_key",
        "PINECONE_API_KEY": "your_pinecone_api_key",
        "PINECONE_ENVIRONMENT": "your_environment",
        "PINECONE_INDEX_NAME": "your_index_name",
        "BRIDGE_FILE_PATH": "path/to/your/data.json"
      }
    }
  }
}
```

### Available Tools

- `capture`: Record raw experiential text
- `frame`: Transform sources into moments
- `weave`: Connect moments into scenes
- `search`: Search across all records
- `enrich`: Update existing records
- `release`: Delete records or cleanup reframed records
- `status`: Get system status

## Core Concepts

### Sources
Raw, unprocessed experiential text (journal entries, chat messages, transcripts)

### Moments  
Framed experiences with qualities, emotions, and narrative structure

### Scenes
Connected moments that form larger stories or journeys

### Experiencers
Different people or perspectives (you, team members, etc.)

## Examples

### Basic Capture
```javascript
bridge:capture {
  content: "I felt a moment of clarity while walking in the forest",
  experiencer: "me",
  perspective: "I",
  processing: "during"
}
```

### Auto-framing
```javascript
bridge:capture {
  content: "The code finally clicked after hours of debugging",
  experiencer: "me", 
  perspective: "I",
  processing: "right-after",
  autoframe: true
}
```

### Manual Framing
```javascript
bridge:frame {
  sourceIds: ["src_123"],
  emoji: "💡",
  summary: "Debugging breakthrough moment",
  qualities: [
    {type: "attentional", manifestation: "Focused problem-solving"},
    {type: "emotional", manifestation: "Relief and satisfaction"}
  ],
  shot: "moment-of-recognition"
}
```

### Search
```javascript
bridge:search {
  query: "breakthrough moments",
  qualities: ["attentional"],
  when: "this week"
}
```

## Development

### Building
```bash
npm run build
```

### Testing
```bash
npm test
```

### Linting
```bash
npm run lint
```

## Architecture

- **TypeScript + Node.js** with ESM modules
- **MCP SDK** for protocol compliance
- **JSONL Storage** - human-readable, append-only
- **Zod** for schema validation
- **Jest** for testing
- **Stdio Transport** for MCP communication

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Security

- API keys are loaded from environment variables
- No sensitive data is stored in the repository
- File paths are configurable and not hardcoded
- All user data is stored locally in the specified data file

## Support

For issues and questions, please open an issue on GitHub. 