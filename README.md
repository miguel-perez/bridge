# Bridge - Experiential Data Desktop Extension

Bridge is an experiential data management system that helps you capture raw experiences, transform them into structured moments with emotional and experiential qualities, and weave them into larger narratives.

## Features

- **AI-Powered Framing**: Automatically identify emotional, spatial, and temporal qualities
- **Semantic Search**: Find experiences by meaning, not just keywords
- **Multi-Experiencer Support**: Capture experiences from different perspectives
- **Reflection Chains**: Link experiences that build on each other
- **Privacy-First**: All data stored locally on your machine
- **Offline Operation**: Works without internet connection

## Installation

1. Download `bridge-experiential-data.dxt`
2. Open Claude Desktop
3. Navigate to Settings > Extensions
4. Drag and drop the .dxt file or click "Install from file"

## Configuration

After installation, you can optionally configure the extension:

1. Click the gear icon next to Bridge in the Extensions panel
2. Enter your preferred data file location (defaults to `bridge.json`)

**Note**: No API keys required! Bridge uses local AI models for all processing.

## Getting Started

Once installed, use these commands in Claude:

### Capture Experiences
```
bridge:capture
```
Capture raw experiential text as a source record.

**Example:**
```
Capture: Just had a breakthrough moment while debugging. The solution finally clicked and I felt a wave of relief and excitement.
```

### Search Experiences
```
bridge:search
```
Search across all experiential records with semantic search.

**Examples:**
```
Search for moments of clarity from this week
Search for experiences with high affective qualities
Search for creative breakthroughs
```

### Enrich Records
```
bridge:enrich
```
Edit and enrich existing source records.

**Example:**
```
Add more detail to moment src_abc123
```

### Release Records
```
bridge:release
```
Delete records by ID.

**Example:**
```
Release source src_abc123
```

## Experiential Qualities

Bridge analyzes experiences across seven phenomenological dimensions:

- **Embodied**: Physical sensations, posture, gestures
- **Attentional**: Focus, awareness, attention shifts
- **Affective**: Emotional coloring, mood, feelings
- **Purposive**: Goals, intentions, momentum
- **Spatial**: Sense of place, location, boundaries
- **Temporal**: Time experience, memory, anticipation
- **Intersubjective**: Social dynamics, relationships

Each quality is scored 0.0-1.0 based on its prominence in the experience.

## Data Storage

Your experiential data is stored in a JSON file on your local machine.
Default location: `bridge.json` (in the root directory)

**Back up this file regularly** to preserve your experiences.

## Troubleshooting

- **"Configuration failed"**: Check the data file path in extension settings
- **"File not found"**: Ensure the data directory exists and is writable
- **Search not working**: Try restarting Claude Desktop
- **Tool not responding**: Check Claude Desktop logs for errors

## Privacy & Security

- All data is stored locally on your machine
- No data is sent to external services
- AI processing happens locally using embedded models
- No internet connection required for core functionality

## Support

For issues or questions:
- Check the troubleshooting section above
- Review Claude Desktop logs
- Create an issue on the [GitHub repository](https://github.com/miguel-perez/bridge)

## License

MIT License - see LICENSE file for details. 