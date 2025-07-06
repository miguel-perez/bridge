# OpenAI Integration: Auto-Framing, Weaving, and Status Tool

## Overview

This document describes the design for integrating OpenAI-powered automation into the MCP server. The goal is to enable automatic creation of frames (moments) and scenes from captured sources, while providing a scalable, reviewable, and user-friendly workflow. The integration includes:

- **Automatic framing** of sources into moments using OpenAI
- **Automatic weaving** of moments into scenes using OpenAI
- **Batch and threshold logic** to ensure scalability
- **Review workflow** for human oversight
- **Status tool** for high-level monitoring and error reporting

---

## 1. Automatic Framing (Auto-Frame)

- **Trigger**: Whenever new sources are captured, the system attempts to automatically frame them into moments using OpenAI.
- **Batching**: Sources are processed in batches (e.g., 10–20 at a time) to avoid API overload and memory issues.
- **Reflect_on Awareness**: Sources that reference each other (via `reflect_on`) are grouped and framed together for better context.
- **Review Flag**: Auto-generated moments are marked as `reviewed: false`.
- **Failure Handling**: If framing fails (e.g., API error), the source remains unframed and the error is logged for status reporting.

---

## 2. Automatic Weaving (Auto-Weave)

- **Trigger**: When the number of unweaved moments reaches a configurable threshold (e.g., 10), the system attempts to weave them into a scene using OpenAI.
- **Batching**: Only moments not already part of a scene are considered. The batch size and threshold are configurable.
- **Review Flag**: Auto-generated scenes are marked as `reviewed: false`.
- **Failure Handling**: If weaving fails, moments remain unweaved and the error is logged for status reporting.

---

## 3. Review Workflow

- **reviewed: boolean** field is added to moments and scenes.
  - `reviewed: false`: Item was generated automatically and has not been human-reviewed or edited.
  - `reviewed: true`: Item has been reviewed or enriched by a human (e.g., via the `enrich` tool).
- **Enrich as Review**: When a user edits a moment/scene, `reviewed` is set to `true`.
- **Status Tool**: Surfaces unreviewed items so users can focus their attention where needed.

---

## 4. Status Tool

### Purpose
- Provides a high-level, scalable overview of the system's state.
- Surfaces only actionable information (counts, errors), not full lists.

### Output Schema Example
```json
{
  "unframed_sources_count": 512,
  "unreviewed_moments_count": 8,
  "unreviewed_scenes_count": 1,
  "unweaved_moments_count": 13,
  "auto_weave_threshold": 10,
  "processing_errors": [
    {
      "type": "framing",
      "count": 2,
      "last_error": "OpenAI API error: ..."
    },
    {
      "type": "weaving",
      "count": 1,
      "last_error": "Timeout during scene creation"
    }
  ]
}
```
- **Counts**: Only numbers for each relevant queue.
- **Threshold**: Shows the current auto-weave trigger threshold.
- **Errors**: Summarizes any recent or recurring errors (type, count, last error message).

### Behavior
- No lists of IDs or content are returned.
- No actions are performed—this tool is for reporting only.
- Keeps performance high even with thousands of records.
- Should be updated after each auto-processing batch or error.

---

## 5. Security and Trust
- All OpenAI API calls are made with explicit user configuration (API key via env/config).
- User data sent to OpenAI is limited to what is necessary for framing/weaving.
- The review workflow ensures a human is always in the loop before auto-generated content is fully trusted.
- Errors and processing status are surfaced transparently via the status tool.

---

## 6. Configuration
- **OpenAI API Key**: Provided via environment variable or config file.
- **Batch Size/Thresholds**: Configurable for both auto-framing and auto-weaving.
- **Status Tool**: Always available for monitoring and debugging.

---

## 7. Summary Table

| Component      | Trigger/Logic                                  | Reviewable | Scalable | Error Reporting |
|----------------|------------------------------------------------|------------|----------|-----------------|
| Auto-Frame     | On new sources, batch process                  | Yes        | Yes      | Yes             |
| Auto-Weave     | When unweaved moments >= threshold, batch      | Yes        | Yes      | Yes             |
| Review         | Via enrich tool, sets reviewed: true           | Yes        | N/A      | N/A             |
| Status Tool    | On demand, always available                    | N/A        | Yes      | Yes             |

---

## Notes
- The integration is designed to be compatible with MCP's model-controlled tool invocation pattern.
- It is safe for use in environments with very large numbers of sources, moments, or scenes.
- Error reporting is summarized for clarity and actionability.

---

## Findings from Protocol, Security, and Workflow Questions

### 1. Protocol & Capability Compliance
- The MCP server is designed to be fully compliant with the MCP protocol, registering all tools with clear schemas and correct capability declarations (e.g., `tools: { listChanged: true }`).
- JSON-RPC message formats and error handling are implemented as required for interoperability with hosts like Claude Desktop.

### 2. OpenAI Integration & Data Flow
- The current implementation uses direct OpenAI API calls for automation, but the MCP protocol also supports a `sampling` feature, allowing the client (e.g., Claude Desktop) to mediate LLM completions. This can enhance user control, privacy, and flexibility (e.g., using different LLMs).
- Prompts and responses are validated for structure and phenomenological fidelity, with robust error handling and batching to ensure scalability.

### 3. Data Privacy & Security
- Only the minimum necessary data is sent to OpenAI, and all API calls require explicit user configuration. No sensitive metadata or credentials are transmitted.
- All tool inputs and outputs are validated and sanitized, with rate limiting and error logging for audit and safety.

### 4. Batch Processing & Scalability
- Batch and threshold logic ensures the system can handle large numbers of sources and moments efficiently. The status tool reports only counts and errors, maintaining performance at scale.
- Errors are surfaced transparently, and failed items remain in the queue for future attempts.

### 5. Review Workflow & User Experience
- Auto-generated moments and scenes are clearly marked as unreviewed, and users can easily find and enrich these items. The distinction between auto-generated and human-reviewed content is always clear.
- Users have control over batch sizes, thresholds, and can disable automation if desired. The status tool provides actionable, not overwhelming, information.

### 6. Extensibility & Future-Proofing
- The architecture is modular, allowing for easy integration of new LLMs or automation features. Logging is sufficient for debugging and audit, without leaking sensitive data.

### 7. Testing & Documentation
- All critical paths are tested, and documentation is clear and up-to-date, supporting new contributors and future development.

### 8. Sampling and Elicitation Potential
- **Sampling**: MCP's sampling feature allows the server to request LLM completions via the client, enabling user-in-the-loop review, privacy, and model flexibility. This fits the Framed Moments philosophy of user agency and transparency.
- **Elicitation**: MCP's elicitation feature enables the server to request structured input from the user via the client, supporting interactive, guided workflows and richer data capture.
- Both features depend on client support (e.g., Claude Desktop must implement them), but offer powerful ways to blend automation with human participation.

### 9. Current Limitations with TypeScript SDK
- **SDK Support Gap**: The TypeScript MCP SDK currently lacks high-level APIs for initiating sampling and elicitation requests. While the protocol supports these features, the SDK does not provide convenient methods like `AsSamplingChatClient()` or `AsElicitationClient()`.
- **Transport Limitations**: The `StdioServerTransport` in the TypeScript SDK does not support Node.js-style event listeners (`.on('message')`), making it difficult to implement custom JSON-RPC message handling for sampling/elicitation.
- **Workaround Instability**: Direct JSON-RPC message sending over the transport is possible but unstable and not officially supported, leading to potential protocol violations and client compatibility issues.
- **Recommendation**: For production use, wait for official SDK support or consider alternative approaches like direct OpenAI API integration (as currently implemented) until the TypeScript SDK adds proper sampling/elicitation APIs.

### 10. Future Opportunities
- When the TypeScript SDK adds proper sampling and elicitation support, these features could enable:
  - User-reviewed auto-framing and weaving
  - Interactive, guided capture and enrichment workflows
  - Enhanced privacy and control over LLM interactions
- These features align with the Framed Moments framework's emphasis on preserving experiential wholeness, user voice, and agency.
- **Action Item**: Consider filing feature requests with the TypeScript MCP SDK maintainers for high-level sampling/elicitation APIs.

--- 