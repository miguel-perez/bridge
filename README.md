# Framed Moments MCP Server

An MCP (Model Context Protocol) server for capturing and framing moments of experience. This server provides tools for quick capture, thoughtful framing, enhancement, and synthesis of experiential moments.

## Features

- **Capture**: Quick recording of experiences, thoughts, or feelings
- **Frame**: Transform captures into structured moments with patterns and qualities
- **Enhance**: Refine and add details to existing captures or moments
- **Synthesize**: Create container moments that group related experiences

## Installation

```bash
npm install
```

## Development

```bash
# Build the project
npm run build

# Run in development mode with auto-reload
npm run dev

# Run tests
npm test

# Lint the code
npm run lint

# Format the code
npm run format
```

## Usage

The server runs over stdio transport and can be used with any MCP-compatible client.

```bash
npm start
```

## Data Storage

The server stores data in JSONL (JSON Lines) format for:
- Simple append-only operations
- Easy backup and restore
- Human-readable format
- Efficient line-by-line processing

## License

MIT 