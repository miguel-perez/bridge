# Framed Moments MCP Server Development Log

## Project Overview
Building a Model Context Protocol (MCP) server for capturing and framing moments of experience using phenomenological principles. The system separates quick capture from thoughtful framing, enabling both in-the-moment recording and later reflection with optional AI assistance.

## Current Status: ~30% Complete

### ✅ **Foundation Complete** (High Quality)
- **Core Architecture**: MCP server with stdio transport, full protocol compliance
- **Type System**: All interfaces from design implemented correctly
- **Storage Layer**: Robust JSONL storage with integrity validation, caching, security
- **Core Tools**: All 4 primary tools (capture, frame, enhance, synthesize) functional
- **Testing**: Jest working with ESM + TypeScript, basic test coverage
- **Integration**: Server configured with Cursor via .cursor/mcp.json

### 🚧 **Partially Implemented**
- **Tool Features**: `withAI` parameter exists but AI integration not implemented
- **File Handling**: Path validation exists but storage system not implemented
- **Basic Resources**: 4 core resources vs 16+ in design
- **Basic Prompts**: 2 simple prompts vs 8+ guided workflows in design
- **Integration Testing**: Server configured for Cursor but no manual testing with Claude as MCP host

## Implementation Gaps (70% Missing)

### 🔴 **Critical Gaps** (Highest Priority)
1. **Advanced Resources** (13 missing)
   - Search, filtering, timeline views essential for usability
   - `moments://search/{query}`, `moments://pattern/{pattern}`, `moments://timeline`
   - Date, quality, perspective, processing level filters

2. **Advanced Prompts** (6 missing)
   - Guided workflows are core user experience
   - `begin_reflection`, `guided_capture`, `guided_frame`, `review_captures`

3. **AI Integration** (Complete gap)
   - MCP Sampling for AI-assisted framing
   - Phenomenological system prompts
   - Boundary detection and quality identification

### 🟡 **Important Features** (Medium Priority)
4. **File Storage System**
   - Directory structure, MCP Roots integration
   - Voice/image support with secure file handling

5. **Session Management**
   - Session tracking, workflow containers
   - Queue management for unframed captures

### 🟢 **Enhanced Features** (Low Priority)
6. **Advanced MCP Features**
   - Elicitation, progress feedback, notifications

## Next Development Phases

### Phase 0: Validation & Core Testing (Immediate)
- [ ] **Manual testing with Claude on Cursor as MCP host**
- [ ] Validate all 4 tools work end-to-end in practice
- [ ] Test current resources and prompts with real AI interaction
- [ ] Document user experience gaps and workflow issues

### Phase 1: Advanced Resources (Essential)
- [ ] Implement search functionality (`moments://search/{query}`)
- [ ] Add filtering resources (pattern, date, quality, perspective)
- [ ] Create timeline view (`moments://timeline`)
- [ ] Add recent moments view (`moments://recent`)

### Phase 2: Guided Workflows (High Impact)
- [ ] Implement session prompts (`begin_reflection`, `close_reflection`)
- [ ] Add guided capture workflows
- [ ] Create frame and enhance guidance
- [ ] Build review and queue management prompts

### Phase 3: AI Integration (Key Differentiator)
- [ ] Implement MCP Sampling for AI assistance
- [ ] Add phenomenological system prompts
- [ ] Build boundary detection and quality identification
- [ ] Create voice-preserving narrative expansion

### Phase 4: File & Session Systems
- [ ] Complete file storage with MCP Roots
- [ ] Implement session management
- [ ] Add enhanced MCP features

## Technical Architecture

### **Storage**: JSONL with append-only design
- Unique ID generation, data integrity validation
- Caching for performance, security validation
- Separate files for data and sessions

### **MCP Compliance**: Full protocol support
- Proper capabilities declaration
- Error handling with appropriate codes
- JSON-RPC 2.0 via SDK

### **Testing**: Jest with ESM + TypeScript
- `jest.config.mjs` with `--experimental-vm-modules`
- ts-jest preset with useESM configuration

## Key Learnings & Decisions

### **2025-01-02**: Foundation Complete
- All core types and tools implemented
- Storage layer with security and validation
- Jest ESM configuration resolved
- MCP protocol compliance verified
- **Design evaluation**: Identified 70% implementation gap

### **Architecture Decisions**
- **JSONL Storage**: Human-readable, append-only, efficient streaming
- **TypeScript**: Strong typing for better development experience
- **Stdio Transport**: Simple debugging and direct MCP client integration
- **Security First**: File path validation, data integrity checks

## Current Working Features
- ✅ Capture experiences with full metadata validation
- ✅ Frame captures into moments with source validation
- ✅ Enhance sources or moments with update tracking
- ✅ Synthesize multiple moments into groups
- ✅ Data persistence with integrity validation
- ✅ Basic data access via 4 core resources
- ✅ Simple guided workflows via 2 basic prompts
- ✅ Full MCP protocol compliance with error handling

## Resources
- [Framed Moments Design Document](framed-moments-design.md) - Complete feature specification
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) - Implementation reference
- [MCP Sampling Documentation](https://modelcontextprotocol.io/specification/server/sampling) - AI integration guide 