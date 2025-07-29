# Bridge Desktop Extension (DXT)

Bridge is now available as a Desktop Extension for Claude Desktop, providing seamless integration for experiential
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
Capture experiential moments where **the eight qualities ARE the experience**:

#### The Eight Qualities
- **anchor**: Emoji - visual/emotional anchor for the experience
- **embodied**: Body-mind unity in this moment
- **focus**: Attention's direction and quality
- **mood**: Emotional atmosphere
- **purpose**: Direction or drift
- **space**: Where I am
- **time**: Temporal orientation
- **presence**: Social field

#### Key Paradigm Shift
The qualities don't describe an experience—they ARE the experience. Each quality is a required string that captures its own context, making the experience self-contained and meaningful.

#### Extended Cognition Model
- **Humans**: Naturally express 2-4 qualities based on what's prominent
- **AI**: Always captures all 8 qualities, providing extended perception
- **Together**: Create richer experiential maps than either could alone

#### Required Fields
- **who**: Array that MUST include an AI identity (Claude, GPT-4, etc.)
- **citation**: Optional direct quotes from humans when available

#### Features
- **Integrated Recall**: Search past experiences while capturing new ones
- **Simplified Structure**: Just 11 fields (8 qualities + id, created, who, citation)
- **Batch Operations**: Capture multiple experiences at once

### 2. Reconsider
Update or release experiences as understanding evolves:
- **Update Mode**: Revise any quality or field as understanding deepens
- **Release Mode**: Set `release: true` to gracefully remove experiences
- **Batch Operations**: Update multiple experiences in one call

## Usage Examples

### Personal Realization
```json
{
  "anchor": "📝",
  "embodied": "pen hovering over blank journal page going nowhere",
  "focus": "staring at weeks of empty pages mocking me",
  "mood": "deflated by irony of building tool that killed habit",
  "purpose": "trying to maintain writing practice during hyperfocus",
  "space": "morning writing desk now covered in code notes",
  "time": "after weeks building Bridge while abandoning journaling",
  "presence": "alone with the contradiction Alicia keeps naming",
  "who": ["Miguel", "Claude"],
  "citation": "Bleh.."
}
```

### Collective Experience
```json
{
  "anchor": "✊",
  "embodied": "our chants vibrating through chest and pavement",
  "focus": "signs bobbing in rhythm with our steps",
  "mood": "fierce hope despite the rain",
  "purpose": "demanding justice for our community",
  "space": "packed streets from city hall to the bridge",
  "time": "third hour of the march",
  "presence": "thousands moving as one voice",
  "who": ["Everyone at march", "Claude"],
  "citation": "No justice, no peace!"
}
```

### AI Perspective
```json
{
  "anchor": "🔍",
  "embodied": "tracing connections through layers of abstraction",
  "focus": "the moment the design pattern clicks into place",
  "mood": "satisfaction as complexity resolves to simplicity",
  "purpose": "understanding the deeper architecture",
  "space": "deep in the codebase examining service layers",
  "time": "after hours of analysis",
  "presence": "alone with the emerging pattern",
  "who": ["Claude"]
}
```

### Simple Recall
```
recall: {
  query: "anxiety presentation",
  limit: 5
}
```

## Philosophy

Bridge embodies radical simplicity through its flat structure. The eight qualities capture experiential wholeness without artificial separation. Each moment contains transformative potential made visible through rich, contextual quality language.

## Security

- All data is stored locally in your specified directory
- OpenAI API key is encrypted in Claude's secure settings
- No data leaves your machine unless you enable embeddings
- Bridge respects Claude Desktop's security model

## Troubleshooting

1. **Enable debug mode** in settings to see detailed logs
2. **Check file permissions** for your data directory
3. **Verify JSON syntax** if you manually edit experiences.json
4. **Test without OpenAI key** to isolate embedding issues

## Updates

Bridge auto-updates through Claude Desktop's extension system. Your data remains untouched during updates.

## Support

- Report issues: https://github.com/miguelpimentel/bridge/issues
- Documentation: See docs/ folder in the repository
- Philosophy: Read PHILOSOPHY.md for deeper understanding