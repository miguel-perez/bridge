# MCP Tool Definitions (Draft)

This document defines the MCP tools exposed by the Bridge server, following best practices for clarity, discoverability, and UI integration.

---

## capture

```jsonc
{
  "name": "capture",
  "description": "Capture raw experiential text as a source record. This is for unprocessed, in-the-moment entries—such as journal notes, chat messages, or direct transcripts—before any framing or analysis.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "content": { "type": "string", "description": "The lived moment—try present tense, include what you are sensing, feeling, noticing." },
      "experiencer": { "type": "string", "description": "Who experienced this (e.g., 'Claude', 'Sarah', 'Team')" },
      "perspective": { "type": "string", "enum": ["I", "we", "you", "they"], "description": "Perspective used" },
      "processing": { "type": "string", "enum": ["during", "right-after", "long-after", "crafted"], "description": "When captured relative to experience" },
      "contentType": { "type": "string", "description": "Type of content", "default": "text" },
      "when": { "type": "string", "description": "When it happened (ISO timestamp or descriptive like 'yesterday morning')" },
      "reflects_on": { "type": "array", "items": { "type": "string" }, "description": "Array of source IDs this record reflects on (use for reflections)" },
      "file": { "type": "string", "description": "Optional file path for file-based captures" }
    },
    "required": ["content", "experiencer", "perspective", "processing"]
  },
  "annotations": {
    "title": "Capture Experience",
    "readOnlyHint": false,
    "destructiveHint": false,
    "idempotentHint": false,
    "openWorldHint": false
  }
}
```

---

## frame

```jsonc
{
  "name": "frame",
  "description": "Transform raw sources into complete experiential moments by identifying their qualities and attention patterns.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "sourceIds": { "type": "array", "items": { "type": "string" }, "minItems": 1, "description": "Array of source IDs to frame together" },
      "emoji": { "type": "string", "description": "Single emoji that captures the essence" },
      "summary": { "type": "string", "description": "5-7 word summary" },
      "shot": { "type": "string", "enum": ["moment-of-recognition", "sustained-attention", "crossing-threshold", "peripheral-awareness", "directed-momentum", "holding-opposites"], "description": "How attention moved in this experience" },
      "qualities": {
        "type": "array",
        "minItems": 1,
        "items": {
          "type": "object",
          "properties": {
            "type": { "type": "string", "enum": ["embodied", "attentional", "emotional", "purposive", "spatial", "temporal", "relational"], "description": "Which quality is present" },
            "manifestation": { "type": "string", "description": "How this quality shows up in the experience" }
          },
          "required": ["type", "manifestation"]
        },
        "description": "Array of experiential qualities present, with at least one"
      },
      "narrative": { "type": "string", "description": "Full experiential narrative" }
    },
    "required": ["sourceIds", "emoji", "summary", "shot", "qualities"]
  },
  "annotations": {
    "title": "Frame Moment",
    "readOnlyHint": false,
    "destructiveHint": false,
    "idempotentHint": false,
    "openWorldHint": false
  }
}
```

---

## weave

```jsonc
{
  "name": "weave",
  "description": "Connect multiple moments to reveal narrative journeys and transformations.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "momentIds": { "type": "array", "items": { "type": "string" }, "minItems": 1, "description": "Array of moment IDs to weave together" },
      "emoji": { "type": "string", "description": "Emoji representing the journey" },
      "summary": { "type": "string", "description": "5-7 word summary of the arc" },
      "narrative": { "type": "string", "description": "The story that connects these moments" },
      "shot": { "type": "string", "enum": ["moment-of-recognition", "sustained-attention", "crossing-threshold", "peripheral-awareness", "directed-momentum", "holding-opposites"], "description": "Overall attention pattern of the woven scene" }
    },
    "required": ["momentIds", "emoji", "summary", "narrative", "shot"]
  },
  "annotations": {
    "title": "Weave Scene",
    "readOnlyHint": false,
    "destructiveHint": false,
    "idempotentHint": false,
    "openWorldHint": false
  }
}
```

---

## enrich

```jsonc
{
  "name": "enrich",
  "description": "Correct or update an existing source or moment (content, metadata, etc.). Use for factual corrections, typos, or missing details. This directly edits the original record. If a source is referenced by moments, those moments will reflect the updated content.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "id": { "type": "string", "description": "Source or moment ID to enrich" },
      "updates": { "type": "object", "description": "Object with fields to update", "additionalProperties": true }
    },
    "required": ["id", "updates"]
  },
  "annotations": {
    "title": "Enrich Record",
    "readOnlyHint": false,
    "destructiveHint": false,
    "idempotentHint": false,
    "openWorldHint": false
  }
}
```

---

## release

```jsonc
{
  "name": "release",
  "description": "Release (delete) a source or moment - some experiences are meant to be acknowledged then let go.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "id": { "type": "string", "description": "ID of source or moment to release" }
    },
    "required": ["id"]
  },
  "annotations": {
    "title": "Release Record",
    "readOnlyHint": false,
    "destructiveHint": true,
    "idempotentHint": true,
    "openWorldHint": false
  }
}
```

---

## search

```jsonc
{
  "name": "search",
  "description": "Unified faceted search across all records. Supports semantic, temporal, relationship, and metadata filters. Use 'created' for capture time and 'when' for event time.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": { "type": "string", "description": "Semantic search query (natural language or keywords)" },
      "created": { "oneOf": [ { "type": "string" }, { "type": "object", "properties": { "start": { "type": "string" }, "end": { "type": "string" } }, "required": ["start", "end"] } ], "description": "Filter by record creation time (when captured)" },
      "when": { "oneOf": [ { "type": "string" }, { "type": "object", "properties": { "start": { "type": "string" }, "end": { "type": "string" } }, "required": ["start", "end"] } ], "description": "Filter by event time (user-supplied)" },
      "reflectedOn": { "type": "string", "description": "Record ID to find all related records (traverses reflects_on, sources, moments, scenes)" },
      "type": { "type": "array", "items": { "type": "string", "enum": ["source", "moment", "scene"] }, "description": "Restrict to certain record types" },
      "experiencer": { "type": "string", "description": "Only records with this experiencer" },
      "qualities": { "type": "array", "items": { "type": "string" }, "description": "Only moments with all these qualities" },
      "perspective": { "type": "string", "description": "Only records with this perspective" },
      "processing": { "type": "string", "description": "Only records with this processing level" },
      "shot": { "type": "string", "description": "Only moments/scenes with this shot type" },
      "framed": { "type": "boolean", "description": "Only sources that are (or are not) framed" },
      "groupBy": { "type": "string", "enum": ["type", "experiencer", "day", "week", "month", "hierarchy"], "description": "Group results by this field" },
      "sort": { "type": "string", "enum": ["relevance", "created", "when"], "description": "Sort by field" },
      "limit": { "type": "number", "description": "Maximum results to return" },
      "includeContext": { "type": "boolean", "description": "Return full record metadata" },
      "reviewed": { "type": "boolean", "description": "Only records that are (or are not) reviewed" }
    }
  },
  "annotations": {
    "title": "Search Records",
    "readOnlyHint": true,
    "destructiveHint": false,
    "idempotentHint": true,
    "openWorldHint": false
  }
}
```

---

## autoframe

```jsonc
{
  "name": "autoframe",
  "description": "Automatically frame a source and its reflections into moments using OpenAI. Creates moments marked as unreviewed for human oversight.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "sourceId": { "type": "string", "description": "ID of the source to auto-frame (required)" },
      "preview": { "type": "boolean", "description": "If true, show what would be created but do not save anything." }
    },
    "required": ["sourceId"]
  },
  "annotations": {
    "title": "Auto-Frame Moment",
    "readOnlyHint": false,
    "destructiveHint": false,
    "idempotentHint": false,
    "openWorldHint": false
  }
}
```

---

## autoweave

```jsonc
{
  "name": "autoweave",
  "description": "Automatically weave moments or scenes into higher-level scenes using OpenAI. Creates scenes marked as unreviewed for human oversight.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "momentIds": { "type": "array", "items": { "type": "string" }, "description": "Array of moment IDs to auto-weave (optional)" },
      "sceneIds": { "type": "array", "items": { "type": "string" }, "description": "Array of scene IDs to auto-weave (optional)" },
      "preview": { "type": "boolean", "description": "If true, show what would be created but do not save anything." }
    }
  },
  "annotations": {
    "title": "Auto-Weave Scene",
    "readOnlyHint": false,
    "destructiveHint": false,
    "idempotentHint": false,
    "openWorldHint": false
  }
}
```

---

## status

```jsonc
{
  "name": "status",
  "description": "Get a high-level status report of the system, including counts of unframed sources, unreviewed content, and processing errors.",
  "inputSchema": {
    "type": "object",
    "properties": {}
  },
  "annotations": {
    "title": "System Status",
    "readOnlyHint": true,
    "destructiveHint": false,
    "idempotentHint": true,
    "openWorldHint": false
  }
}
```

## Search Tool

**Purpose**: Unified faceted search across all records with consistent result formatting.

**Result Format**: Progressive enhancement approach for predictable output:

### Base Format (Default)
```
1. [MOMENT] (ID: mom_123) 🤔 Auto-framing reveals interpretive depth
   🤔 Auto-framing reveals interpretive depth
   Qualities: attentional, emotional
   Shot: moment-of-recognition

2. [SOURCE] (ID: src_456) Reading through Bridge's documentation...
   Perspective: I
   Processing: during
```

### Enhanced Format (with includeContext: true)
```json
{
  "type": "moment",
  "id": "mom_123",
  "snippet": "🤔 Auto-framing reveals interpretive depth",
  "relevance": 0.95,
  "moment": {
    "id": "mom_123",
    "type": "moment",
    "emoji": "🤔",
    "summary": "Auto-framing reveals interpretive depth",
    "qualities": [
      {"type": "attentional", "manifestation": "Noticing..."},
      {"type": "emotional", "manifestation": "Feeling..."}
    ],
    "shot": "moment-of-recognition",
    "sources": [{"sourceId": "src_456"}],
    "created": "2024-01-15T10:30:00Z",
    "experiencer": "Claude"
  }
}
```

### Grouped Format (with groupBy)
```
source (4)
1. [SOURCE] (ID: src_123) Reading through Bridge's documentation...
   Perspective: I
   Processing: during

moment (9)
1. [MOMENT] (ID: mom_123) 🤔 Auto-framing reveals interpretive depth
   🤔 Auto-framing reveals interpretive depth
   Qualities: attentional, emotional
   Shot: moment-of-recognition
```

**Key Benefits**:
- **Consistent Structure**: All results follow the same base format
- **Progressive Enhancement**: Add detail with includeContext or groupBy
- **Predictable Output**: Same format regardless of search parameters
- **Automation Friendly**: Structured data available when needed 