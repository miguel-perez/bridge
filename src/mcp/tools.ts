// MCP Tool definitions - must match DXT manifest exactly
export const tools = [
  {
    name: "capture",
    description: "Capture raw experiential text as a source record. For unprocessed, in-the-moment entries such as journal notes, chat messages, or direct transcripts. When a file path is provided, the system will automatically read the file contents if no content is specified.",
    inputSchema: {
      type: "object",
      properties: {
        content: { type: "string", description: "Raw text from experiencer, either new experience or reflection or previous capture. If file is provided without content, file contents will be read automatically." },
        experiencer: { type: "string", description: "Who experienced this (e.g., 'Claude', 'Sarah', 'Team')" },
        perspective: { type: "string", enum: ["I", "we", "you", "they"], description: "Perspective used" },
        processing: { type: "string", enum: ["during", "right-after", "long-after", "crafted"], description: "When captured relative to experience" },
        contentType: { type: "string", description: "Type of content", default: "text" },
        when: { type: "string", description: "When it happened (ISO timestamp or descriptive like 'yesterday morning')" },
        reflects_on: { type: "array", items: { type: "string" }, description: "Array of source IDs this record reflects on (use for reflections)" },
        file: { type: "string", description: "File path to read contents from. If provided without content, file contents will be automatically read and used as content. Supports text files (txt, md, json, etc.)." }
      },
      required: ["experiencer", "perspective", "processing"]
    },
    annotations: {
      title: "Capture Experience",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false
    }
  },

  {
    name: "release",
    description: "Release (delete) a source. If no id is provided, performs a bulk cleanup of all reframed (superseded) records. In bulk mode, cleanupReframed defaults to true.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "ID of source to release (optional for bulk cleanup)" },
        cleanupReframed: { type: "boolean", description: "If true, also delete any reframed records that were superseded by this record, or perform bulk cleanup if no ID provided. Defaults to true if no id is provided, otherwise false." }
      }
    },
    annotations: {
      title: "Release Record",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false
    }
  },

  {
    name: "search",
    description: `Unified faceted search across all records. \n\nTEMPORAL FILTERING:\n- 'created': Filter by when record was captured (system time)\n  Example: created: { start: "2025-01-01", end: "2025-01-31" }\n- 'when': Filter by when event happened (user-provided time)\n  Example: when: "yesterday" or when: { start: "last week", end: "today" }\n\nBoth support:\n- Natural language: "yesterday", "last week", "January 2025"\n- ISO dates: "2025-01-15T10:00:00Z"\n- Date ranges: { start: "date", end: "date" }\n\nThe system uses chrono-node for flexible date parsing.\n\nResults use consistent format: base format shows type, ID, and snippet; includeContext adds full record data as JSON; groupBy organizes results by category.`,
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Semantic search query (natural language or keywords)" },
        created: { oneOf: [ { type: "string" }, { type: "object", properties: { start: { type: "string" }, end: { type: "string" } }, required: ["start", "end"] } ], description: "Filter by record creation time (when captured)" },
        when: { oneOf: [ { type: "string" }, { type: "object", properties: { start: { type: "string" }, end: { type: "string" } }, required: ["start", "end"] } ], description: "Filter by event time (user-supplied)" },
        reflectedOn: { type: "string", description: "Record ID to find all related records (traverses reflects_on, sources)" },
        type: { type: "array", items: { type: "string", enum: ["source"] }, description: "Restrict to certain record types" },
        experiencer: { type: "string", description: "Only records with this experiencer" },
        perspective: { type: "string", description: "Only records with this perspective" },
        processing: { type: "string", description: "Only records with this processing level" },
        groupBy: { type: "string", enum: ["type", "experiencer", "day", "week", "month", "hierarchy"], description: "Group results by this field" },
        sort: { type: "string", enum: ["relevance", "created", "when"], description: "Sort by field" },
        limit: { type: "number", description: "Maximum results to return" },
        includeContext: { type: "boolean", description: "Return full record metadata as structured JSON" }
      }
    },
    annotations: {
      title: "Search Records",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  },

  {
    name: "status",
    description: "Get a high-level status report of the system, including counts of unframed sources and processing errors.",
    inputSchema: {
      type: "object",
      properties: {}
    },
    annotations: {
      title: "System Status",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  }
]; 