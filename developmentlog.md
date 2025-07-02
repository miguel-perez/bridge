# Framed Moments MCP Server Development Log

## Project Overview
Building a Model Context Protocol (MCP) server for capturing and framing moments of experience. The server provides tools for quick capture, thoughtful framing, enhancement, and synthesis of experiential moments.

## Current State
- Initial project setup completed
- Basic MCP server implemented with stdio transport
- Core types defined in types.ts
- JSONL chosen as storage format
- All 4 tools fully implemented with storage persistence
- Server tested and working with MCP protocol
- Integrated with Cursor via .cursor/mcp.json
- Storage layer implemented with JSONL file handling
- MCP compliance verified and capabilities properly declared

## Immediate Tasks

### 1. Project Setup ✅
- [x] Initialize npm project with TypeScript
- [x] Add @modelcontextprotocol/sdk dependency
- [x] Configure TypeScript and build scripts
- [x] Set up development environment

### 2. Core Server Implementation ✅
- [x] Create basic MCP server with stdio transport
- [x] Implement server initialization and connection handling
- [x] Set up error handling and logging
- [x] Test server with MCP protocol messages
- [x] Configure Cursor integration
- [x] Fix capabilities declaration (listChanged)

### 3. Storage Layer ✅
- [x] Create JSONL file storage utilities
- [x] Implement atomic write operations (append-only)
- [x] Add basic query capabilities
- [x] Set up data validation

### 4. Tool Implementation ✅
- [x] Implement `capture` tool
  - [x] Add input validation
  - [x] Create storage handler
  - [x] Add error handling
  
- [x] Implement `frame` tool
  - [x] Add source validation
  - [x] Implement framing logic
  - [ ] Add pattern recognition (AI integration)
  
- [x] Implement `enhance` tool
  - [x] Add moment/source lookup
  - [x] Implement update logic
  - [x] Add validation rules
  
- [x] Implement `synthesize` tool
  - [x] Add moment grouping logic
  - [x] Implement synthesis creation
  - [x] Add relationship tracking

### 5. Resources Implementation
- [ ] Implement `moments://recent` - Last 20 framed moments
- [ ] Implement `sources://unframed` - Unframed captures
- [ ] Implement `moments://search/{query}` - Search functionality
- [ ] Implement `moments://pattern/{pattern}` - Filter by pattern
- [ ] Implement `moments://date/{date}` - Filter by date
- [ ] Implement `moments://timeline` - Hierarchical view
- [ ] Add other resources from design document

### 6. Prompts Implementation
- [ ] Implement `begin_reflection` - Start reflection session
- [ ] Implement `guided_capture` - Guided capture experience
- [ ] Implement `guided_frame` - Guided framing
- [ ] Implement `guided_enhance` - Guided enhancement
- [ ] Implement `review_captures` - Review unframed sources

### 7. Advanced Features
- [ ] File storage for non-text content (voice, image)
- [ ] AI integration for frame tool (withAI parameter)
- [ ] Session management
- [ ] Progress notifications
- [ ] Elicitation for missing details

### 8. Testing
- [x] Set up testing framework (Jest configured)
- [x] Manual server testing completed
- [ ] Add unit tests for storage operations
- [ ] Add unit tests for each tool
- [ ] Add integration tests
- [ ] Create test fixtures

## Technical Decisions

### Storage
- Using JSONL for:
  - Simple append-only operations
  - Easy backup and restore
  - Human-readable format
  - Efficient line-by-line processing
- Implemented in storage.ts with:
  - Unique ID generation (timestamp + random)
  - Separate files for data and sessions
  - Query operations for unframed sources
  - Search by text, pattern, and date range

### Transport
- Starting with stdio transport for:
  - Simple local development
  - Easy debugging
  - Direct integration with MCP clients

### Type System
- Using TypeScript for:
  - Strong type safety
  - Better development experience
  - Easy integration with MCP SDK

### MCP Compliance
- Properly declaring capabilities with listChanged
- Following tool structure requirements
- Using appropriate error codes
- Implementing JSON-RPC 2.0 via SDK

## Notes & Learnings

### 2025-01-02
- Initial project setup completed
- Created all necessary configuration files:
  - package.json with dependencies (including bin configuration)
  - tsconfig.json for TypeScript
  - jest.config.js for testing
  - .eslintrc and .prettierrc for code quality
  - .gitignore for version control
- Created README.md with basic documentation
- Implemented basic MCP server:
  - Created types.ts with all interfaces from design
  - Implemented index.ts with stdio transport
  - Added all 4 tools with placeholder handlers
  - Set up proper error handling with Zod validation
  - Successfully builds and compiles
- Updated tool definitions to match design document:
  - Added missing fields to capture tool (experiencer, related, file)
  - Enhanced descriptions with valid options
  - Fixed description texts for all tools
- Created .cursor/mcp.json configuration:
  - Server named "moments" 
  - Configured to run with Node.js
  - Successfully integrated with Cursor
- Tested server manually:
  - Verified JSON-RPC protocol handling
  - Confirmed all 4 tools are properly exposed
  - Tested capture and frame tool calls
  - Server responds correctly to MCP messages
- Implemented storage layer:
  - Created storage.ts with JSONL file handling
  - Append-only operations for data integrity
  - Separate data.jsonl and sessions.jsonl files
  - Query operations for unframed sources, search, etc.
- Updated all tools to use storage:
  - Capture tool saves sources with unique IDs
  - Frame tool validates sources and creates moments
  - Enhance tool updates sources or moments
  - Synthesize tool groups moments together
- MCP compliance check completed:
  - Fixed capabilities declaration (added listChanged)
  - Verified tool structure follows spec
  - Confirmed proper error handling
  - Identified Resources and Prompts as next priorities

## What's Working Now
- ✅ Capture experiences with full metadata
- ✅ Frame captures into moments with validation
- ✅ Enhance sources or moments with updates
- ✅ Synthesize multiple moments into groups
- ✅ All data persisted to JSONL files
- ✅ Basic query operations (search, filter)
- ✅ Cursor integration functional

## What's Left to Build
1. **Resources** - Enable browsing and searching stored data
2. **Prompts** - Provide guided experiences and workflows
3. **File handling** - Store voice/image files
4. **AI integration** - Implement withAI features
5. **Session management** - Track user sessions
6. **Testing** - Comprehensive test coverage

## Questions to Resolve
- [ ] Best practices for handling concurrent writes to JSONL
- [ ] Strategy for implementing search across JSONL files
- [ ] Approach for handling large datasets
- [ ] Method for ensuring data integrity
- [ ] How to implement file storage for non-text content
- [ ] Best approach for AI integration (sampling)

## Resources
- [MCP TypeScript SDK Documentation](https://github.com/modelcontextprotocol/typescript-sdk)
- [Framed Moments Design Document](framed-moments-design.md)
- [MCP Reference Guide](mcp-reference.md) 