// MCP Tool definitions - must match DXT manifest exactly
export const tools = [
  {
    name: "capture",
    description: "Capture experiential moments with seven-dimensional phenomenological analysis (embodied, attentional, affective, purposive, spatial, temporal, intersubjective)",
    inputSchema: {
      type: "object",
      properties: {
        content: { 
          type: "string", 
          description: "Raw text from experiencer, either new experience or reflection or previous capture." 
        },
        experiencer: { 
          type: "string", 
          description: "Who experienced this (e.g., 'Claude', 'Sarah', 'Team')" 
        },
        perspective: { 
          type: "string", 
          enum: ["I", "we", "you", "they"], 
          description: "Perspective used" 
        },
        processing: { 
          type: "string", 
          enum: ["during", "right-after", "long-after", "crafted"], 
          description: "When captured relative to experience" 
        },
        experiential_qualities: { 
          type: "object", 
          description: "Analysis of experiential qualities in the content",
          properties: {
            qualities: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: {
                    type: "string",
                    enum: ["embodied", "attentional", "affective", "purposive", "spatial", "temporal", "intersubjective"]
                  },
                  prominence: {
                    type: "number",
                    minimum: 0,
                    maximum: 1
                  },
                  manifestation: {
                    type: "string"
                  }
                },
                required: ["type", "prominence", "manifestation"]
              }
            }
          },
          required: ["qualities"]
        },
        contentType: { 
          type: "string", 
          description: "Type of content", 
          default: "text" 
        },
        occurred: { 
          type: "string", 
          description: "When it happened (chrono-node compatible - e.g., 'yesterday morning', 'last week', '2024-01-15')" 
        },
        crafted: { 
          type: "boolean", 
          description: "Whether content was crafted for an audience (e.g., blog post = true, journal entry = false)" 
        }
      },
      required: ["content", "experiencer", "perspective", "processing", "experiential_qualities"]
    }
  },

  {
    name: "search",
    description: "Search experiences using multi-modal relevance: text matching, phenomenological vector similarity, semantic meaning, and contextual filters",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query text"
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return",
          default: 10
        },
        filters: {
          type: "object",
          description: "Optional filters to apply to search results",
          properties: {
            experiencer: {
              type: "string",
              description: "Filter by experiencer"
            },
            perspective: {
              type: "string",
              enum: ["I", "we", "you", "they"],
              description: "Filter by perspective"
            },
            processing: {
              type: "string",
              enum: ["during", "right-after", "long-after", "crafted"],
              description: "Filter by processing level"
            },
            date_range: {
              type: "object",
              description: "Filter by date range",
              properties: {
                start: {
                  type: "string",
                  description: "Start date (ISO string)"
                },
                end: {
                  type: "string",
                  description: "End date (ISO string)"
                }
              }
            }
          }
        }
      },
      required: ["query"]
    }
  },

  {
    name: "enrich",
    description: "Iteratively deepen experiential records through reflection, adding new insights while preserving original capture",
    inputSchema: {
      type: "object",
      properties: {
        source_id: {
          type: "string",
          description: "ID of the source record to enrich"
        },
        reflection: {
          type: "string",
          description: "New reflection or insight to add"
        },
        reflection_type: {
          type: "string",
          enum: ["insight", "connection", "pattern", "question", "memory"],
          description: "Type of reflection being added"
        }
      },
      required: ["source_id", "reflection", "reflection_type"]
    }
  },

  {
    name: "release",
    description: "Release experiential records back to consciousness flow (delete), acknowledging some moments need to be let go",
    inputSchema: {
      type: "object",
      properties: {
        source_id: {
          type: "string",
          description: "ID of the source record to release"
        },
        reason: {
          type: "string",
          description: "Reason for releasing this record"
        }
      },
      required: ["source_id", "reason"]
    }
  }
]; 