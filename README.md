# Bridge

A simple way to capture and explore your experiences using Claude. Bridge helps you record moments from your life and find them later using natural language search.

## What it does

- **Easy Capture**: Just write what's happening - no need to format it perfectly
- **Smart Processing**: Claude helps organize your raw thoughts into meaningful moments
- **Natural Search**: Find your experiences using everyday language
- **Private**: Everything stays on your computer
- **Your Voice**: Keeps your actual words and way of thinking

### Tools
- `capture` - Record what's happening right now
- `search` - Find past experiences using natural language
- `update` - Edit or improve existing captures
- `release` - Remove experiences you no longer need

## Installation

### Prerequisites
- Node.js >= 18.0.0
- Claude Desktop application

### Setup
```bash
git clone https://github.com/miguel-perez/bridge.git
cd bridge
npm install
npm run build
./build-dxt.sh  # or ./build-dxt.ps1 on Windows
```

Install the generated `.dxt` file in Claude Desktop Settings > Extensions.

## Usage

### Capture a Moment
Just write what's happening - Claude will help organize it:

```
I'm sitting here staring at this code and my brain feels like mush. 
The coffee is cold and I keep checking my phone even though I know 
there won't be any messages. My back hurts from sitting too long.
```

### Find Your Experiences
Search using natural language:
- "moments of creative breakthrough"
- "times I felt deeply connected to others"
- "experiences of physical exhaustion"

## Development

```bash
npm run dev          # Development server
npm test            # Run tests (116 tests across 11 suites)
npm run build:all   # Build and bundle
```

### Testing
Bridge includes comprehensive testing with both unit tests and AI "usability" testing:

```bash
npm run test:bridge bridge-exploration  # Test Claude's interaction with Bridge
npm run test:fixtures                   # Generate synthetic test data
```

Test results are automatically saved to `/test-results/` for tracking improvements over time.

## How it Works

Bridge looks at experiences through seven different lenses to help capture the full picture:

- **Body**: How you feel physically
- **Focus**: What you're paying attention to
- **Emotions**: Your mood and feelings
- **Purpose**: What you're trying to do
- **Environment**: Where you are and what's around you
- **Time**: How time feels in the moment
- **Others**: How other people are present (even if they're not there)

## The Approach

Bridge is based on research about how people naturally experience and remember moments. Instead of forcing you to fit your experiences into rigid categories, it helps you capture the raw reality of what's happening, then uses AI to organize it in ways that make sense.

### Key Ideas
- **Keep it Real**: Capture what's actually happening, not what you think should happen
- **Stay Natural**: Use your own words and way of thinking
- **Let AI Help**: Claude handles the organizing so you can focus on living

## License

MIT License - see [LICENSE.md](LICENSE.md)

## Support

- **Issues**: [GitHub Issues](https://github.com/miguel-perez/bridge/issues)
- **Author**: Miguel Angel Perez - [mail@miguel.design](mailto:mail@miguel.design) 