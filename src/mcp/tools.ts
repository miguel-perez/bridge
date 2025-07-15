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
    description: "Discover and navigate experiential patterns across your captured experiences. SUPPORTS BATCH: Run multiple pattern discoveries in one call for comprehensive exploration. Patterns are automatically discovered and organized into hierarchical groups with emoji signatures. Use to: browse pattern landscape, navigate specific patterns, refresh discovery, view statistics, or explore quality dimensions. Everything is at most 3 clicks away. Example batch usage: get overview + stats + specific pattern details in one call.",
    inputSchema: {
      type: "object",
      properties: {
        discoveries: {
          type: "array",
          description: "One or more pattern discovery operations to execute in batch. Common patterns: [{},] for overview, [{stats: true},] for statistics, [{pattern: 'L1-1'},] for specific pattern, or [{}, {stats: true}, {pattern: 'L1-1'}] for comprehensive exploration.",
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
    description: "🔍 UNIFIED SEARCH API v2 - The primary Bridge function that combines pattern discovery with source retrieval. Returns beautiful formatted text with emojis by default. Empty queries show the living ecosystem tree. Search IS the unified function - it reveals patterns through their sources, and sources through their patterns. SUPPORTS BATCH: Run multiple searches in one call. Examples: search('') for tree view, search('consciousness') for experiences, search({in: 'we-are-so-proud-of-us', about: 'distributed thinking'}) for pattern-aware search.",
    inputSchema: {
      type: "object",
      properties: {
        searches: {
          type: "array",
          description: "One or more searches to execute. Single empty search shows ecosystem tree. Multiple searches compare different perspectives or patterns.",
          items: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "What you're looking for in the experiences. Examples: 'breakthrough moment', 'we are proud', 'alicia teaching', 'captain'. Empty string ('') shows ecosystem tree with patterns and sources. Note: Boolean operators (AND/OR/NOT) are not supported - use filters or separate queries instead"
              },
              
              // Pattern-aware search (new in v2)
              in: {
                type: "string",
                description: "Search within specific pattern. Use pattern ID or natural name like 'we-are-so-proud-of-us' or 'teaching-through-simplification'. This is the pattern-aware search capability."
              },
              about: {
                type: "string",
                description: "What to search for within the pattern (when using 'in'). Semantic search within pattern boundaries."
              },
              examples: {
                type: "number",
                description: "Number of source experiences to show per pattern result (default: 3)",
                default: 3
              },
              
              // Tree view options (new in v2)
              tree: {
                type: "string",
                enum: ["active", "people", "time", "quality"],
                description: "Tree view mode for empty queries. 'active' shows only active patterns, 'people' organizes by experiencer, 'time' shows temporal tree, 'quality' shows by dominant qualities"
              },
              
              // Quality-based search (new in v2)
              dimension: {
                type: "string",
                enum: ["embodied", "attentional", "affective", "purposive", "spatial", "temporal", "intersubjective"],
                description: "Search by dominant phenomenological quality dimension"
              },
              threshold: {
                type: "number",
                description: "Minimum prominence threshold for quality dimension (0-100, default: 70)",
                minimum: 0,
                maximum: 100,
                default: 70
              },
              
              // Temporal search (enhanced in v2)
              when: {
                type: "string",
                description: "Natural language time expressions. Examples: 'this morning', 'last Tuesday', 'past week', 'January 2025', 'yesterday at 5pm'"
              },
              recent: {
                type: "boolean",
                description: "Show only recently active patterns/experiences (last 7 days)"
              },
              today: {
                type: "boolean",
                description: "Show only today's experiences"
              },
              
              // Standard search options (maintained for compatibility)
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
              
              // Legacy filters (maintained for compatibility)
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
              },
              
              // Future enhancement placeholders (for natural language API)
              experiencer: {
                type: "string",
                description: "Natural language alias for filters.experiencer. Examples: 'Miguel', 'Captain', 'self'"
              },
              perspective: {
                type: "string",
                enum: ["I", "we", "you", "they"],
                description: "Natural language alias for filters.perspective"
              },
              processing: {
                type: "string",
                enum: ["during", "right-after", "long-after", "crafted"],
                description: "Natural language alias for filters.processing"
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
