// MCP Tool definitions - must match DXT manifest exactly
export const tools = [
  {
    name: "capture",
    description: "Preserve experiences exactly as they were shared with you, maintaining their authentic voice through seven-dimensional phenomenological analysis (embodied, attentional, affective, purposive, spatial, temporal, intersubjective) and narrative generation that weaves content with weighted quality manifestations for better searchability",
    inputSchema: {
      type: "object",
      properties: {
        experiences: {
          type: "array",
          description: "One or more experiences to capture (can be from different experiencers in the same moment)",
          items: {
            type: "object",
            properties: {
              content: { 
                type: "string", 
                description: "The exact words or experience as directly shared with you, preserving their original expression" 
              },
              narrative: { 
                type: "string", 
                description: "Narrative that integrates content with weighted quality manifestations for better searchability. Should preserve key phrases while weaving in quality manifestations proportionally based on prominence scores." 
              },
              experiencer: { 
                type: "string", 
                description: "The person whose experience this is (e.g., 'Miguel', 'Alicia', 'Claude-Captain')" 
              },
              perspective: { 
                type: "string", 
                enum: ["I", "we", "you", "they"], 
                description: "The grammatical perspective from which the experience was shared" 
              },
              processing: { 
                type: "string", 
                enum: ["during", "right-after", "long-after", "crafted"], 
                description: "When this was shared relative to when it happened" 
              },
              experiential_qualities: { 
                type: "object", 
                description: "Your phenomenological analysis of the qualities present in their experience",
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
                          maximum: 1,
                          description: "How strongly this quality appears (0=absent, 1=dominant)"
                        },
                        manifestation: {
                          type: "string",
                          description: "How this quality specifically shows up in their experience"
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
                description: "When the experience actually happened (e.g., 'yesterday morning', 'last week', '2024-01-15', 'just now')" 
              },
              crafted: { 
                type: "boolean", 
                description: "Whether this was crafted for sharing (true) or raw/spontaneous expression (false)" 
              }
            },
            required: ["content", "experiencer", "perspective", "processing", "experiential_qualities", "narrative"]
          }
        }
      },
      required: ["experiences"]
    }
  },

  {
    name: "search",
    description: "Find and explore captured experiences through text, phenomenological patterns, meaning, and context to understand journeys and connections",
    inputSchema: {
      type: "object",
      properties: {
        queries: {
          type: "array",
          description: "One or more search queries to execute (useful for initialization or comparing perspectives)",
          items: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "What you're looking for in the experiences"
              },
              limit: {
                type: "number",
                description: "Maximum number of results to return",
                default: 10
              },
              offset: {
                type: "number",
                description: "Number of results to skip (for pagination)",
                default: 0
              },
              sort: {
                type: "string",
                enum: ["relevance", "system_time", "occurred"],
                description: "How to sort results (default: occurred for recency)",
                default: "occurred"
              },
              includeContext: {
                type: "boolean",
                description: "Include metadata like experiencer, perspective, processing level, and experiential qualities in results",
                default: false
              },
              includeFullContent: {
                type: "boolean",
                description: "Include full content instead of truncated snippets",
                default: false
              },
              filters: {
                type: "object",
                description: "Optional filters to apply to search results",
                properties: {
                  experiencer: {
                    type: "string",
                    description: "Show only experiences from this person"
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
        }
      },
      required: ["queries"]
    }
  },

  {
    name: "update",
    description: "Correct or update existing experiences when mistakes were made during capture, maintaining the integrity of the experiential record",
    inputSchema: {
      type: "object",
      properties: {
        updates: {
          type: "array",
          description: "One or more experience updates to apply",
          items: {
            type: "object",
            properties: {
              source_id: {
                type: "string",
                description: "The ID of the experience to update"
              },
              content: {
                type: "string",
                description: "Corrected content text (only if fixing errors in the original)"
              },
              narrative: {
                type: "string",
                description: "Corrected narrative text (only if fixing errors in the generated narrative)"
              },
              contentType: {
                type: "string",
                description: "Updated content type"
              },
              perspective: {
                type: "string",
                enum: ["I", "we", "you", "they"],
                description: "Corrected perspective (only if original was wrong)"
              },
              processing: {
                type: "string",
                enum: ["during", "right-after", "long-after", "crafted"],
                description: "Corrected processing level"
              },
              occurred: {
                type: "string",
                description: "Corrected time when the experience actually happened"
              },
              experiencer: {
                type: "string",
                description: "Corrected experiencer (only if attribution was wrong)"
              },
              crafted: {
                type: "boolean",
                description: "Updated crafted flag"
              },
              experiential_qualities: {
                type: "object",
                description: "Corrected phenomenological analysis if original was inaccurate",
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
                          maximum: 1,
                          description: "How strongly this quality appears (0=absent, 1=dominant)"
                        },
                        manifestation: {
                          type: "string",
                          description: "How this quality specifically shows up in their experience"
                        }
                      },
                      required: ["type", "prominence", "manifestation"]
                    }
                  }
                },
                required: ["qualities"]
              },
              regenerate_embeddings: {
                type: "boolean",
                description: "Whether to regenerate embeddings (useful when narrative or content is updated)",
                default: false
              }
            },
            required: ["source_id"]
          }
        }
      },
      required: ["updates"]
    }
  },

  {
    name: "release",
    description: "Let go of experiences that no longer need to be held, returning them to the flow of memory with gratitude",
    inputSchema: {
      type: "object",
      properties: {
        releases: {
          type: "array",
          description: "One or more experiences to release",
          items: {
            type: "object",
            properties: {
              source_id: {
                type: "string",
                description: "The ID of the experience to release"
              },
              reason: {
                type: "string",
                description: "Why this experience is ready to be released"
              }
            },
            required: ["source_id", "reason"]
          }
        }
      },
      required: ["releases"]
    }
  }
]; 