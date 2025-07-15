// MCP Tool definitions - must match DXT manifest exactly
export const tools = [
  {
    name: 'capture',
    description: 'Capture experiences. The source field must contain the experiencer\'s exact words as written or spoken - without summarizing, interpreting, or modifying. Process this raw source material into framed moments with seven-dimensional analysis (embodied, attentional, affective, purposive, spatial, temporal, intersubjective). Each capture requires an emoji and narrative summary written in present tense. Supports both single captures and batch operations. Use the experiencer field and batch operations to capture experiences from each perspective, including your own.',
    inputSchema: {
      type: 'object',
      properties: {
        source: {
          type: 'string',
          description: 'Raw, exact words from the experiencer - their actual text/voice as written or spoken. Do not summarize, interpret, or modify. This is the source material that will be processed into a framed moment.'
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
          enum: ['during', 'right-after', 'long-after'],
          description: 'When processing occurred: during (real-time), right-after (immediate), long-after (retrospective)'
        },
        crafted: {
          type: 'boolean',
          description: 'Whether this is crafted content (blog/refined for an audience) vs raw capture (journal/immediate)'
        },
        experience: {
          type: 'object',
          description: 'Experience analysis (all fields optional for updates)',
          properties: {
            qualities: {
              type: 'array',
              description: 'Seven-dimensional experiential analysis: embodied (physical sensations), attentional (focus/awareness), affective (emotional tone), purposive (intention/direction), spatial (sense of place), temporal (time awareness), intersubjective (social presence), pick the ones that are most relevant to the experience',
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
              description: 'Concise experiential summary in experiencer\'s own words and voice (max 200 characters). Must present unified experience, be visually anchorable, feel experientially complete, and preserve authentic voice.'
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
              source: {
                type: 'string',
                description: 'Raw, exact words from the experiencer - their actual text/voice as written or spoken. Do not summarize, interpret, or modify. This is the source material that will be processed into a framed moment.'
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
                    description: 'Concise experiential summary in experiencer\'s own words and voice (max 200 characters). Must present unified experience, be visually anchorable, feel experientially complete, and preserve authentic voice.'
                  }
                },
                required: ['emoji', 'narrative']
              }
            },
            required: ['experience']
          }
        }
      },
      required: ['source']
      // Required fields: source is always needed, other fields are optional
    }
  },
  {
    name: 'search',
    description: 'Search framed moments using semantic matching and metadata filters. Returns experiences with their seven-dimensional qualities, emoji, narrative, and metadata. Empty queries show recent framed moments. Supports filtering by experiencer, perspective, processing level, and date ranges. Supports both single searches and batch operations.',
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
    description: 'Update existing framed moments. Can modify content, perspective, experiencer, processing level, crafted status, and the seven-dimensional experiential qualities. Useful for correcting mistakes or refining experiential analysis to ensure moments remain visually anchorable, experientially complete, and preserve authentic voice. Supports both single updates and batch operations.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'ID of the experience to update (for single updates)'
        },
        source: {
          type: 'string',
          description: 'Updated source (optional)'
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
              description: 'Updated experiential summary in experiencer\'s own words and voice (max 200 characters). Must present unified experience, be visually anchorable, feel experientially complete, and preserve authentic voice.'
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
              source: {
                type: 'string',
                description: 'Updated source (optional)'
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
                    description: 'Updated experiential summary in experiencer\'s own words and voice (max 200 characters). Must present unified experience, be visually anchorable, feel experientially complete, and preserve authentic voice.'
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
    description: 'Release framed moments by ID. Removes experiences from the system with gratitude and reasoning. Useful for letting go of moments that no longer need to be held, acknowledging that significance emerges through accumulation and connection rather than through permanent retention. Supports both single releases and batch operations.',
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
