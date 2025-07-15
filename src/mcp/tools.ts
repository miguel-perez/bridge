// MCP Tool definitions - must match DXT manifest exactly
export const tools = [
  {
    name: 'capture',
    description: 'Capture experiences. Creates experiential records with seven-dimensional analysis (embodied, attentional, affective, purposive, spatial, temporal, intersubjective). CRITICAL: All content must preserve the user\'s authentic voice - narrative and manifestations should feel like "that\'s my brain right there." Use the experiencer\'s actual words, phrases, and way of thinking. Each capture requires an emoji and narrative (max 200 chars) written in the experiencer\'s voice using present tense. Supports both single captures and batch operations.',
    inputSchema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'The content to capture (optional if experience.narrative is provided)'
        },
        perspective: {
          type: 'string',
          enum: ['I', 'we', 'you', 'they'],
          description: 'Perspective from which experience is captured: I (first person), we (collective), you (second person), they (third person)'
        },
        experiencer: {
          type: 'string',
          description: 'Who experienced this moment (person, group, or entity)'
        },
        processing: {
          type: 'string',
          enum: ['during', 'right-after', 'long-after', 'crafted'],
          description: 'When processing occurred: during (real-time), right-after (immediate), long-after (retrospective), crafted (refined/edited)'
        },
        crafted: {
          type: 'boolean',
          description: 'Whether this is crafted content (blog/refined) vs raw capture (journal/immediate)'
        },
        experience: {
          type: 'object',
          description: 'Experience analysis (all fields optional for updates)',
          properties: {
            qualities: {
              type: 'array',
              description: 'Seven-dimensional experiential analysis: embodied (physical sensations), attentional (focus/awareness), affective (emotional tone), purposive (intention/direction), spatial (sense of place), temporal (time awareness), intersubjective (social presence)',
              items: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    enum: ['embodied', 'attentional', 'affective', 'purposive', 'spatial', 'temporal', 'intersubjective'],
                    description: 'The experiential dimension being analyzed'
                  },
                  prominence: {
                    type: 'number',
                    minimum: 0,
                    maximum: 1,
                    description: 'How prominent this dimension is in the moment (0-1 scale)'
                  },
                  manifestation: {
                    type: 'string',
                    description: 'How this dimension manifests in the specific moment - use the experiencer\'s actual words and phrases, preserving their authentic voice and way of expressing themselves.'
                  }
                },
                required: ['type', 'prominence', 'manifestation']
              }
            },
            emoji: {
              type: 'string',
              description: 'Emoji representing the experience'
            },
            narrative: {
              type: 'string',
              description: 'Concise experiential summary in experiencer\'s own words and voice (max 200 characters). Must sound like the actual person who lived the experience.'
            }
          },
          required: ['emoji', 'narrative']
        },
        captures: {
          type: 'array',
          description: 'Array of experiences to capture (for batch operations)',
          items: {
            type: 'object',
            properties: {
              content: {
                type: 'string',
                description: 'The content to capture (optional if experience.narrative is provided)'
              },
              perspective: {
                type: 'string',
                enum: ['I', 'we', 'you', 'they'],
                description: 'Perspective from which experience is captured'
              },
              experiencer: {
                type: 'string',
                description: 'Who experienced this moment'
              },
              processing: {
                type: 'string',
                enum: ['during', 'right-after', 'long-after', 'crafted'],
                description: 'When processing occurred'
              },
              crafted: {
                type: 'boolean',
                description: 'Whether this is crafted content'
              },
              experience: {
                type: 'object',
                description: 'Experience analysis',
                properties: {
                  qualities: {
                    type: 'array',
                    description: 'Seven-dimensional experiential analysis',
                    items: {
                      type: 'object',
                      properties: {
                        type: {
                          type: 'string',
                          enum: ['embodied', 'attentional', 'affective', 'purposive', 'spatial', 'temporal', 'intersubjective'],
                          description: 'The experiential dimension being analyzed'
                        },
                        prominence: {
                          type: 'number',
                          minimum: 0,
                          maximum: 1,
                          description: 'How prominent this dimension is in the moment (0-1 scale)'
                        },
                        manifestation: {
                          type: 'string',
                          description: 'How this dimension manifests - use the experiencer\'s actual words and phrases'
                        }
                      },
                      required: ['type', 'prominence', 'manifestation']
                    }
                  },
                  emoji: {
                    type: 'string',
                    description: 'Emoji representing the experience'
                  },
                  narrative: {
                    type: 'string',
                    description: 'Concise experiential summary in experiencer\'s own words and voice (max 200 characters)'
                  }
                },
                required: ['emoji', 'narrative']
              }
            },
            required: ['experience']
          }
        }
      }
      // No required fields - either single capture fields or 'captures' array can be used
    }
  },
  {
    name: 'search',
    description: 'Search experiences using semantic matching and metadata filters. Returns experiences with their seven-dimensional qualities, emoji, narrative, and metadata. Empty queries show recent experiences. Supports filtering by experiencer, perspective, processing level, and date ranges. Supports both single searches and batch operations.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query for semantic matching'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return'
        },
        offset: {
          type: 'number',
          description: 'Number of results to skip for pagination'
        },
        experiencer: {
          type: 'string',
          description: 'Filter by experiencer'
        },
        perspective: {
          type: 'string',
          enum: ['I', 'we', 'you', 'they'],
          description: 'Filter by perspective'
        },
        processing: {
          type: 'string',
          enum: ['during', 'right-after', 'long-after', 'crafted'],
          description: 'Filter by processing level'
        },
        created: {
          oneOf: [
            {
              type: 'string',
              description: 'Filter by specific date (YYYY-MM-DD format)'
            },
            {
              type: 'object',
              properties: {
                start: {
                  type: 'string',
                  description: 'Start date (YYYY-MM-DD format)'
                },
                end: {
                  type: 'string',
                  description: 'End date (YYYY-MM-DD format)'
                }
              },
              required: ['start', 'end']
            }
          ],
          description: 'Filter by creation date'
        },
        sort: {
          type: 'string',
          enum: ['relevance', 'created'],
          description: 'Sort order for results'
        },
        searches: {
          type: 'array',
          description: 'Array of search queries to execute (for batch operations)',
          items: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query for semantic matching'
              },
              limit: {
                type: 'number',
                description: 'Maximum number of results to return'
              },
              offset: {
                type: 'number',
                description: 'Number of results to skip for pagination'
              },
              experiencer: {
                type: 'string',
                description: 'Filter by experiencer'
              },
              perspective: {
                type: 'string',
                enum: ['I', 'we', 'you', 'they'],
                description: 'Filter by perspective'
              },
              processing: {
                type: 'string',
                enum: ['during', 'right-after', 'long-after', 'crafted'],
                description: 'Filter by processing level'
              },
              created: {
                oneOf: [
                  {
                    type: 'string',
                    description: 'Filter by specific date (YYYY-MM-DD format)'
                  },
                  {
                    type: 'object',
                    properties: {
                      start: {
                        type: 'string',
                        description: 'Start date (YYYY-MM-DD format)'
                      },
                      end: {
                        type: 'string',
                        description: 'End date (YYYY-MM-DD format)'
                      }
                    },
                    required: ['start', 'end']
                  }
                ],
                description: 'Filter by creation date'
              },
              sort: {
                type: 'string',
                enum: ['relevance', 'created'],
                description: 'Sort order for results'
              }
            }
            // No required fields for search items
          }
        }
      }
      // No required fields - either single search fields or 'searches' array can be used
    }
  },
  {
    name: 'update',
    description: 'Update existing experiences. Can modify content, perspective, experiencer, processing level, crafted status, and the seven-dimensional experiential qualities. Useful for correcting mistakes or refining experiential analysis. Supports both single updates and batch operations.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'ID of the experience to update (for single updates)'
        },
        content: {
          type: 'string',
          description: 'Updated content (optional)'
        },
        perspective: {
          type: 'string',
          enum: ['I', 'we', 'you', 'they'],
          description: 'Updated perspective (optional)'
        },
        experiencer: {
          type: 'string',
          description: 'Updated experiencer (optional)'
        },
        processing: {
          type: 'string',
          enum: ['during', 'right-after', 'long-after', 'crafted'],
          description: 'Updated processing level (optional)'
        },
        crafted: {
          type: 'boolean',
          description: 'Updated crafted status (optional)'
        },
        experience: {
          type: 'object',
          description: 'Experience analysis',
          properties: {
            qualities: {
              type: 'array',
              description: 'Seven-dimensional experiential analysis: embodied (physical sensations), attentional (focus/awareness), affective (emotional tone), purposive (intention/direction), spatial (sense of place), temporal (time awareness), intersubjective (social presence)',
              items: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    enum: ['embodied', 'attentional', 'affective', 'purposive', 'spatial', 'temporal', 'intersubjective'],
                    description: 'The experiential dimension being analyzed'
                  },
                  prominence: {
                    type: 'number',
                    minimum: 0,
                    maximum: 1,
                    description: 'How prominent this dimension is in the moment (0-1 scale)'
                  },
                  manifestation: {
                    type: 'string',
                    description: 'How this dimension manifests in the specific moment - use the experiencer\'s actual words and phrases, preserving their authentic voice and way of expressing themselves.'
                  }
                },
                required: ['type', 'prominence', 'manifestation']
              }
            },
            emoji: {
              type: 'string',
              description: 'Updated emoji representing the experience'
            },
            narrative: {
              type: 'string',
              description: 'Updated experiential summary in experiencer\'s own words and voice (max 200 characters). Must sound like the actual person who lived the experience.'
            }
          }
          // No required here: all fields optional for update
        },
        updates: {
          type: 'array',
          description: 'Array of experiences to update (for batch operations)',
          items: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'ID of the experience to update'
              },
              content: {
                type: 'string',
                description: 'Updated content (optional)'
              },
              perspective: {
                type: 'string',
                enum: ['I', 'we', 'you', 'they'],
                description: 'Updated perspective (optional)'
              },
              experiencer: {
                type: 'string',
                description: 'Updated experiencer (optional)'
              },
              processing: {
                type: 'string',
                enum: ['during', 'right-after', 'long-after', 'crafted'],
                description: 'Updated processing level (optional)'
              },
              crafted: {
                type: 'boolean',
                description: 'Updated crafted status (optional)'
              },
              experience: {
                type: 'object',
                description: 'Experience analysis',
                properties: {
                  qualities: {
                    type: 'array',
                    description: 'Seven-dimensional experiential analysis',
                    items: {
                      type: 'object',
                      properties: {
                        type: {
                          type: 'string',
                          enum: ['embodied', 'attentional', 'affective', 'purposive', 'spatial', 'temporal', 'intersubjective'],
                          description: 'The experiential dimension being analyzed'
                        },
                        prominence: {
                          type: 'number',
                          minimum: 0,
                          maximum: 1,
                          description: 'How prominent this dimension is in the moment (0-1 scale)'
                        },
                        manifestation: {
                          type: 'string',
                          description: 'How this dimension manifests - use the experiencer\'s actual words and phrases'
                        }
                      },
                      required: ['type', 'prominence', 'manifestation']
                    }
                  },
                  emoji: {
                    type: 'string',
                    description: 'Updated emoji representing the experience'
                  },
                  narrative: {
                    type: 'string',
                    description: 'Updated experiential summary in experiencer\'s own words and voice (max 200 characters)'
                  }
                }
                // No required here: all fields optional for update
              }
            },
            required: ['id']
          }
        }
      }
      // No required fields - either 'id' or 'updates' array can be used
    }
  },
  {
    name: 'release',
    description: 'Release experiences by ID. Removes experiences from the system with gratitude and reasoning. Useful for letting go of experiences that no longer need to be held. Supports both single releases and batch operations.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'ID of the experience to release (for single releases)'
        },
        reason: {
          type: 'string',
          description: 'Reason for releasing the experience (optional)'
        },
        releases: {
          type: 'array',
          description: 'Array of experiences to release (for batch operations)',
          items: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'ID of the experience to release'
              },
              reason: {
                type: 'string',
                description: 'Reason for releasing this experience (optional)'
              }
            },
            required: ['id']
          }
        }
      }
      // No required fields - either 'id' or 'releases' can be used
    }
  }
];
