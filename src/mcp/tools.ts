// MCP Tool definitions - must match DXT manifest exactly
export const tools = [
  {
    name: "capture",
    description: "Records meaningful moments and experiences with rich phenomenological analysis. Use this to preserve conversations, insights, breakthroughs, or any significant human experience. Each capture includes: (1) the original content/words, (2) who experienced it and when, (3) an emoji + narrative summary, and (4) analysis across 7 experiential dimensions. SUPPORTS BATCH: Capture multiple experiences in one call. Example uses: documenting therapy breakthroughs, recording user feedback, preserving learning moments, capturing creative insights.",
    inputSchema: {
      type: "object",
      properties: {
        captures: {
          type: "array",
          description: "One or more experiences to capture (can be from different experiencers in the same moment)",
          items: {
            type: "object",
            properties: {
              content: { 
                type: "string", 
                description: "The exact words or experience as directly shared with you, preserving their original expression. Examples: 'I finally understood why I've been avoiding that conversation', 'The code suddenly clicked and I saw the pattern everywhere', 'We realized we were solving the wrong problem all along'" 
              },
              experience: {
                type: "object",
                description: "Phenomenological analysis of the experience, including qualities, emoji, and narrative. Emoji + narrative = storyboard frame.",
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
                          description: "How this quality specifically shows up in their experience. Examples: 'tension releasing from shoulders' (embodied), 'sudden clarity about the pattern' (attentional), 'overwhelming gratitude' (affective)"
                        }
                      },
                      required: ["type", "prominence", "manifestation"]
                    }
                  },
                  emoji: {
                    type: "string",
                    description: "REQUIRED: Emoji visually summarizing the experience. Must be paired with the narrative as a storyboard frame."
                  },
                  narrative: {
                    type: "string",
                    description: "REQUIRED: Concise experiential summary (max 200 chars) in experiencer's voice. Write as if they're narrating their moment in present tense with active language. Use their own words, slang, or phrasing. Start with a verb when possible. Must be paired with an emoji as a visual summary. Examples: 'Step through puddles as rain drums', 'Fidget with pen, heart thuds hard', 'Stir sauce, laughter spills from kitchen'."
                  }
                },
                required: ["qualities", "emoji", "narrative"]
              },
              experiencer: { 
                type: "string", 
                description: "The person whose experience this is. Examples: 'Miguel', 'Sarah Chen', 'Anonymous User', 'Team Alpha', 'Claude-3'" 
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
              contentType: { 
                type: "string", 
                description: "Type of content", 
                default: "text" 
              },
              occurred: { 
                type: "string", 
                description: "When the experience actually happened. Examples: 'just now', '5 minutes ago', 'yesterday at 3pm', 'last Tuesday', 'January 15, 2024', '2024-01-15T14:30:00Z'" 
              },
              crafted: { 
                type: "boolean", 
                description: "Whether this was crafted for sharing (true) or raw/spontaneous expression (false)" 
              }
            },
            required: ["content", "experiencer", "perspective", "processing", "experience"]
          }
        }
      },
      required: ["captures"]
    }
  },

  {
    name: "discover",
    description: "Discover and navigate experiential patterns. Patterns are automatically discovered from your experiences and organized into hierarchical groups with emoji signatures. Use to: browse patterns, navigate into specific patterns, refresh discovery, or view statistics. SUPPORTS BATCH: Run multiple discoveries in one call. Everything is at most 3 clicks away.",
    inputSchema: {
      type: "object",
      properties: {
        discoveries: {
          type: "array",
          description: "One or more discovery operations to execute (useful for overview + stats + specific patterns in one call)",
          items: {
            type: "object",
            properties: {
              pattern: {
                type: "string",
                description: "Pattern ID to explore (e.g., 'L1-1'). If not provided, shows experiential landscape overview."
              },
              dimension: {
                type: "string",
                description: "Quality dimension to explore: 'embodied', 'attentional', 'affective', 'purposive', 'spatial', 'temporal', or 'intersubjective'",
                enum: ["embodied", "attentional", "affective", "purposive", "spatial", "temporal", "intersubjective"]
              },
              dimensions: {
                type: "boolean",
                description: "Show all quality dimensions with descriptions (default: false)"
              },
              stats: {
                type: "boolean",
                description: "Show pattern statistics and ecosystem health (default: false)"
              },
              refresh: {
                type: "boolean",
                description: "Force refresh pattern discovery (default: false)"
              },
              insights: {
                type: "boolean",
                description: "Show pattern evolution insights when viewing specific pattern (default: false)"
              },
              depth: {
                type: "number",
                description: "Navigation depth for pattern hierarchy (default: 1, max: 3)",
                minimum: 1,
                maximum: 3,
                default: 1
              },
              when: {
                type: "string",
                description: "Temporal filter: 'this_week', 'morning', 'evolution'"
              },
              recent: {
                type: "boolean",
                description: "Show recently active patterns (default: false)"
              }
            }
          }
        }
      },
      required: ["discoveries"]
    }
  },

  {
    name: "search",
    description: "Finds previously captured experiences using text search, filters, or patterns. Use this to: recall past conversations, find similar experiences across time, track patterns in user feedback, or explore phenomenological themes. Returns results with emoji+narrative summaries and full content. Supports filtering by: who (experiencer), when (date ranges), how (perspective: I/we/you/they), and processing level (during/after). SUPPORTS BATCH: Run multiple searches in one call. IMPORTANT: Boolean operators (AND/OR/NOT) are not supported. To find experiences matching multiple criteria, use filters or run separate searches. For example, instead of 'anxiety OR stress', run two searches: one for 'anxiety' and one for 'stress'. Leave query empty to see all recent experiences.",
    inputSchema: {
      type: "object",
      properties: {
        searches: {
          type: "array",
          description: "One or more searches to execute (useful for initialization or comparing perspectives)",
          items: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "What you're looking for in the experiences. Examples: 'breakthrough moment', 'frustration with API', 'team collaboration', 'aha realization', '' (empty to see all recent). Note: Boolean operators (AND/OR/NOT) are not supported - use filters or separate queries instead"
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
                default: true
              },
              filters: {
                type: "object",
                description: "Optional filters to apply to search results",
                properties: {
                  experiencer: {
                    type: "string",
                    description: "Show only experiences from this person. Examples: 'Miguel', 'Sarah', 'Team Alpha', 'self'"
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
                        description: "Start date. Examples: '2024-01-01', 'last week', 'January 1st', '7 days ago'"
                      },
                      end: {
                        type: "string",
                        description: "End date. Examples: '2024-12-31', 'today', 'now', 'yesterday at 5pm'"
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
      required: ["searches"]
    }
  },

  {
    name: "update",
    description: "Modifies existing captured experiences to fix errors or enhance analysis. Use this to: correct typos or attribution errors, add missing phenomenological dimensions, improve narrative clarity, or update metadata. Requires the experience ID from search results. SUPPORTS BATCH: Update multiple experiences in one call. Common uses: fixing autocorrect errors, attributing to correct person, enriching analysis after reflection, updating timestamps.",
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
              experience: {
                type: "object",
                description: "Corrected phenomenological analysis, including qualities, emoji, and narrative. Emoji + narrative = storyboard frame.",
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
                          description: "How this quality specifically shows up in their experience. Examples: 'tension releasing from shoulders' (embodied), 'sudden clarity about the pattern' (attentional), 'overwhelming gratitude' (affective)"
                        }
                      },
                      required: ["type", "prominence", "manifestation"]
                    }
                  },
                  emoji: {
                    type: "string",
                    description: "REQUIRED: Emoji visually summarizing the experience. Must be paired with the narrative as a storyboard frame."
                  },
                  narrative: {
                    type: "string",
                    description: "REQUIRED: Corrected narrative text (max 200 chars) - concise experiential summary in experiencer's voice using present tense and active language. Must be paired with an emoji as a storyboard frame."
                  }
                },
                required: ["qualities", "emoji", "narrative"]
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
    description: "Permanently removes captured experiences from Bridge storage. Use this to: delete test data, remove duplicates, clear sensitive information, or honor someone's request to forget. Requires both the experience ID and a reason for deletion. This action cannot be undone. SUPPORTS BATCH: Release multiple experiences in one call. Common uses: removing practice captures, deleting outdated entries, managing storage, respecting privacy requests.",
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
                description: "The ID of the experience to release. Example: 'src_2024_01_15_abc123xyz'"
              },
              reason: {
                type: "string",
                description: "Why this experience is ready to be released. Examples: 'Test data', 'Duplicate entry', 'User requested deletion', 'Contains sensitive information'"
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
