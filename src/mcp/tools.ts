// MCP Tool definitions - must match DXT manifest exactly
export const tools = [
  {
    name: "capture",
    description: "Capture raw experiential text as a source record. For unprocessed, in-the-moment entries such as journal notes, chat messages, or direct transcripts. The AI assistant MUST analyze and provide experiential quality scores for each capture.",
    inputSchema: {
      type: "object",
      properties: {
        content: { type: "string", description: "Raw text from experiencer, either new experience or reflection or previous capture." },
        experiencer: { type: "string", description: "Who experienced this (e.g., 'Claude', 'Sarah', 'Team')" },
        perspective: { type: "string", enum: ["I", "we", "you", "they"], description: "Perspective used" },
        processing: { type: "string", enum: ["during", "right-after", "long-after", "crafted"], description: "When captured relative to experience" },
        contentType: { type: "string", description: "Type of content", default: "text" },
        occurred: { type: "string", description: "When it happened (chrono-node compatible - e.g., 'yesterday morning', 'last week', '2024-01-15')" },
        crafted: { type: "boolean", description: "Whether content was crafted for an audience (e.g., blog post = true, journal entry = false)" },
        experiential_qualities: { 
          type: "object", 
          description: `REQUIRED experiential quality analysis. The AI assistant MUST analyze the content and provide quality scores. Each quality describes a phenomenological dimension of experience, scored 0.0-1.0.

**How to Break Down Larger Content into Smaller Captures :**
To identify experiential boundaries, look for natural breaks where qualities shift:
- Attention redirects or refocuses
- Emotional atmosphere transforms
- Purpose crystallizes or disperses
- Spatial transitions occur
- Temporal pace changes
- Social dynamics shift

Each boundary marks a new moment. Use these cues to segment continuous experience into discrete, self-contained moments for analysis.

**The Seven Experiential Qualities:**
- **embodied**: How physicality textures the moment (sensations, posture, gestures, visceral feelings).
- **attentional**: The direction, quality, and movement of awareness (focus, shifts, meta-attention).
- **affective**: The emotional coloring or mood-space (emotions, background feeling, intensity, complexity).
- **purposive**: The sense of moving toward, away from, or through something (goals, drift, momentum, intention).
- **spatial**: The lived sense of place and position (location, scale, boundaries, spatial meaning).
- **temporal**: How past and future inhabit the present (time's pace, memory, anticipation, duration).
- **intersubjective**: How others' presence or absence shapes the moment (social dynamics, recognition, internalized voices).

**Detailed Scoring Ranges for Each Quality:**

**Embodied Presence:**
- 0.1: Body implied but not felt
- 0.3: Single sensation mentioned
- 0.5: Multiple physical details
- 0.7: Rich bodily experience
- 0.9: Physical experience dominates

**Attentional Flow:**
- 0.1: Implied awareness only
- 0.3: Simple focus noted
- 0.5: Clear attention pattern
- 0.7: Complex attention dynamics
- 0.9: Attention itself is central

**Affective Atmosphere:**
- 0.1: Emotional tone implied
- 0.3: Basic emotion named
- 0.5: Clear emotional quality
- 0.7: Rich emotional texture
- 0.9: Emotion saturates everything

**Purposive Momentum:**
- 0.1: Drift without direction
- 0.3: Vague intention present
- 0.5: Clear goal or purpose
- 0.7: Strong directional pull
- 0.9: Purpose drives everything

**Spatial Situation:**
- 0.1: Location barely noted
- 0.3: Basic spatial awareness
- 0.5: Clear sense of place
- 0.7: Rich spatial experience
- 0.9: Space is primary feature

**Temporal Flow:**
- 0.1: Time unmarked
- 0.3: Basic temporal markers
- 0.5: Clear time experience
- 0.7: Time distortion/thickness
- 0.9: Temporal experience central

**Intersubjective Field:**
- 0.1: Others barely present
- 0.3: Others mentioned
- 0.5: Clear social dynamic
- 0.7: Rich relational experience
- 0.9: Recognition/connection central

**General Scoring Rubric:**
- 0.0-0.2: Minimal/absent
- 0.3-0.4: Present but backgrounded
- 0.5-0.6: Noticeable and contributing
- 0.7-0.8: Prominent feature
- 0.9-1.0: Dominant/defining

**Vector and Qualities Interaction:**
- **vector**: Optional base values for all dimensions. If provided, these serve as starting values.
- **qualities**: Array of specific quality evidence that overrides vector values for those dimensions.
- **Final vector**: Combines base values from vector (or 0 if not provided) with overrides from qualities array.
- **Example**: If vector has spatial: 0.3 but qualities array specifies spatial: 0.8, the final spatial value will be 0.8.
`,
          properties: {
            qualities: {
              type: "array",
              description: `Array of quality evidence. Each entry describes how a quality manifests in the moment, with a rating.\n- **type**: One of the seven qualities.\n- **prominence**: 0.0-1.0 score (see rubric).\n- **manifestation**: How this quality appears in the experience.`,
              items: {
                type: "object",
                                  properties: {
                    type: { type: "string", enum: ["embodied", "attentional", "affective", "purposive", "spatial", "temporal", "intersubjective"], description: "Phenomenological quality type. See above for definitions." },
 
                    prominence: { type: "number", minimum: 0, maximum: 1, description: "How prominent this quality is (0.0-1.0). See scoring rubric." },
                    manifestation: { type: "string", description: "How this quality manifests in the experience (e.g., 'physical anxiety', 'diffuse attention', 'background sadness')." }
                  },
                  required: ["type", "prominence", "manifestation"]
              }
            },
            vector: {
              type: "object",
              description: `Optional 7-dimensional vector with base values (0.0-1.0) for each quality. If provided, these values serve as the starting point for the final vector. The qualities array will override specific dimensions, while dimensions not in the qualities array retain these base values (or default to 0 if no vector provided).`,
              properties: {
                embodied: { type: "number", minimum: 0, maximum: 1, description: "Embodied Presence base value (see above)" },
                attentional: { type: "number", minimum: 0, maximum: 1, description: "Attentional Flow base value (see above)" },
                affective: { type: "number", minimum: 0, maximum: 1, description: "Affective Atmosphere base value (see above)" },
                purposive: { type: "number", minimum: 0, maximum: 1, description: "Purposive Momentum base value (see above)" },
                spatial: { type: "number", minimum: 0, maximum: 1, description: "Spatial Situation base value (see above)" },
                temporal: { type: "number", minimum: 0, maximum: 1, description: "Temporal Flow base value (see above)" },
                intersubjective: { type: "number", minimum: 0, maximum: 1, description: "Intersubjective Field base value (see above)" }
              },
              required: ["embodied", "attentional", "affective", "purposive", "spatial", "temporal", "intersubjective"]
            }
          },
          required: ["qualities"]
        }
      },
      required: ["experiencer", "perspective", "processing", "experiential_qualities"]
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
    description: "Release (delete) a source record by ID.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "ID of source to release" }
      },
      required: ["id"]
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
    description: `Unified faceted search across all records with comprehensive relevance scoring.\n\nRELEVANCE SCORING:\nAll results include a relevance score (0-100%) that combines:\n- Text matching: How well the query matches the content\n- Vector similarity: Similarity to experiential quality vectors\n- Semantic similarity: Semantic similarity to natural language queries\n- Filter relevance: How well the record matches applied filters\n\nResults are automatically sorted by relevance when sort='relevance' (default).\n\nTEMPORAL FILTERING:\n- 'system_time': Filter by when record was created (auto-generated timestamp)\n  Example: system_time: { start: "2025-01-01", end: "2025-01-31" }\n- 'occurred': Filter by when event happened (chrono-node compatible, preferred)\n  Example: occurred: "yesterday" or occurred: { start: "last week", end: "today" }\n\nCONTENT FILTERING:\n- 'contentType': Filter by content type (e.g., 'text', 'audio')\n- 'crafted': Filter by crafted status (true = crafted for audience, false = raw)\n\nSEMANTIC SEARCH:\n- 'semantic_query': Search for semantically similar content using natural language\n  Example: semantic_query: "moments of anxiety" or semantic_query: "creative breakthroughs"\n- 'semantic_threshold': Minimum similarity threshold (0.0-1.0, default: 0.7)\n\nEXPERIENTIAL QUALITIES FILTERING:\n- min_X / max_X: Filter by minimum/maximum value for each experiential quality (e.g., min_affective: 0.7)\n- vector: Search for records most similar to a provided experiential quality vector (e.g., vector: { embodied: 0.5, affective: 0.9, ... })\n- vector_similarity_threshold: Only return records with similarity above this threshold (0-1, higher = more similar)\n\nExample:\n{ min_affective: 0.7, crafted: false, semantic_query: "moments of anxiety", semantic_threshold: 0.8 }\n\nThe system uses chrono-node for flexible date parsing.\n\nResults include relevance scores and breakdowns to help understand why each result was ranked as it was.`,
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Search for a specific record by ID" },
        query: { type: "string", description: "Semantic search query (natural language or keywords)" },
        system_time: { oneOf: [ { type: "string" }, { type: "object", properties: { start: { type: "string" }, end: { type: "string" } }, required: ["start", "end"] } ], description: "Filter by record creation time (auto-generated timestamp)" },
        occurred: { oneOf: [ { type: "string" }, { type: "object", properties: { start: { type: "string" }, end: { type: "string" } }, required: ["start", "end"] } ], description: "Filter by occurred time (chrono-node compatible)" },
        type: { type: "array", items: { type: "string", enum: ["source"] }, description: "Restrict to certain record types" },
        experiencer: { type: "string", description: "Only records with this experiencer" },
        perspective: { type: "string", description: "Only records with this perspective" },
        processing: { type: "string", description: "Only records with this processing level" },
        contentType: { type: "string", description: "Only records with this content type (e.g., 'text', 'audio')" },
        crafted: { type: "boolean", description: "Only records with this crafted status (true = crafted for audience, false = raw)" },
        groupBy: { type: "string", enum: ["type", "experiencer", "day", "week", "month", "hierarchy"], description: "Group results by this field" },
        sort: { type: "string", enum: ["relevance", "system_time", "occurred"], description: "Sort by field" },
        limit: { type: "number", description: "Maximum results to return" },
        includeContext: { type: "boolean", description: "Return full record metadata as structured JSON" },
        // Experiential qualities min/max
        min_embodied: { type: "number", minimum: 0, maximum: 1, description: "Minimum embodied value" },
        max_embodied: { type: "number", minimum: 0, maximum: 1, description: "Maximum embodied value" },
        min_attentional: { type: "number", minimum: 0, maximum: 1, description: "Minimum attentional value" },
        max_attentional: { type: "number", minimum: 0, maximum: 1, description: "Maximum attentional value" },
        min_affective: { type: "number", minimum: 0, maximum: 1, description: "Minimum affective value" },
        max_affective: { type: "number", minimum: 0, maximum: 1, description: "Maximum affective value" },
        min_purposive: { type: "number", minimum: 0, maximum: 1, description: "Minimum purposive value" },
        max_purposive: { type: "number", minimum: 0, maximum: 1, description: "Maximum purposive value" },
        min_spatial: { type: "number", minimum: 0, maximum: 1, description: "Minimum spatial value" },
        max_spatial: { type: "number", minimum: 0, maximum: 1, description: "Maximum spatial value" },
        min_temporal: { type: "number", minimum: 0, maximum: 1, description: "Minimum temporal value" },
        max_temporal: { type: "number", minimum: 0, maximum: 1, description: "Maximum temporal value" },
        min_intersubjective: { type: "number", minimum: 0, maximum: 1, description: "Minimum intersubjective value" },
        max_intersubjective: { type: "number", minimum: 0, maximum: 1, description: "Maximum intersubjective value" },
        // Vector similarity search
        vector: {
          type: "object",
          description: "Experiential quality vector to search for similar records (all values 0-1)",
          properties: {
            embodied: { type: "number", minimum: 0, maximum: 1 },
            attentional: { type: "number", minimum: 0, maximum: 1 },
            affective: { type: "number", minimum: 0, maximum: 1 },
            purposive: { type: "number", minimum: 0, maximum: 1 },
            spatial: { type: "number", minimum: 0, maximum: 1 },
            temporal: { type: "number", minimum: 0, maximum: 1 },
            intersubjective: { type: "number", minimum: 0, maximum: 1 }
          }
        },
        vector_similarity_threshold: { type: "number", minimum: 0, maximum: 1, description: "Only return records with similarity above this threshold (0-1)" },
        // Semantic search
        semantic_query: { type: "string", description: "Search for semantically similar content using natural language (e.g., 'moments of anxiety', 'creative breakthroughs', 'social interactions')" },
        semantic_threshold: { type: "number", minimum: 0, maximum: 1, default: 0.7, description: "Minimum similarity threshold for semantic search (0.0-1.0, higher = more similar)" }
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
    name: "enrich",
    description: "Edit and enrich an existing source record. Allows updating any field including content, experiential qualities, metadata, and optionally regenerating embeddings. Only provide the fields you want to change - unchanged fields will retain their original values.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "The ID of the source to enrich" },
        content: { type: "string", description: "Updated content text" },
        contentType: { type: "string", description: "Updated content type" },
        perspective: { type: "string", enum: ["I", "we", "you", "they"], description: "Updated perspective" },
        processing: { type: "string", enum: ["during", "right-after", "long-after", "crafted"], description: "Updated processing level" },
        occurred: { type: "string", description: "Updated occurred time (chrono-node compatible - e.g., 'yesterday morning', 'last week', '2024-01-15')" },
        experiencer: { type: "string", description: "Updated experiencer" },
        crafted: { type: "boolean", description: "Updated crafted flag" },
        experiential_qualities: { 
          type: "object", 
          description: `Updated experiential quality analysis. Each quality describes a phenomenological dimension of experience, scored 0.0-1.0. See capture tool for detailed scoring guidelines.

**Vector and Qualities Interaction:**
- **vector**: Optional base values for all dimensions. If provided, these serve as starting values.
- **qualities**: Array of specific quality evidence that overrides vector values for those dimensions.
- **Final vector**: Combines base values from vector (or 0 if not provided) with overrides from qualities array.
- **Example**: If vector has spatial: 0.3 but qualities array specifies spatial: 0.8, the final spatial value will be 0.8.`,
          properties: {
            qualities: {
              type: "array",
              description: `Array of quality evidence. Each entry describes how a quality manifests in the moment, with a rating.`,
              items: {
                type: "object",
                                  properties: {
                    type: { type: "string", enum: ["embodied", "attentional", "affective", "purposive", "spatial", "temporal", "intersubjective"], description: "Phenomenological quality type" },
 
                    prominence: { type: "number", minimum: 0, maximum: 1, description: "How prominent this quality is (0.0-1.0)" },
                    manifestation: { type: "string", description: "How this quality manifests in the experience" }
                  },
                  required: ["type", "prominence", "manifestation"]
              }
            },
            vector: {
              type: "object",
              description: `Optional 7-dimensional vector with base values (0.0-1.0) for each quality. If provided, these values serve as the starting point for the final vector. The qualities array will override specific dimensions, while dimensions not in the qualities array retain these base values (or default to 0 if no vector provided).`,
              properties: {
                embodied: { type: "number", minimum: 0, maximum: 1, description: "Embodied Presence base value" },
                attentional: { type: "number", minimum: 0, maximum: 1, description: "Attentional Flow base value" },
                affective: { type: "number", minimum: 0, maximum: 1, description: "Affective Atmosphere base value" },
                purposive: { type: "number", minimum: 0, maximum: 1, description: "Purposive Momentum base value" },
                spatial: { type: "number", minimum: 0, maximum: 1, description: "Spatial Situation base value" },
                temporal: { type: "number", minimum: 0, maximum: 1, description: "Temporal Flow base value" },
                intersubjective: { type: "number", minimum: 0, maximum: 1, description: "Intersubjective Field base value" }
              },
              required: ["embodied", "attentional", "affective", "purposive", "spatial", "temporal", "intersubjective"]
            }
          },
          required: ["qualities"]
        },
        regenerate_embeddings: { type: "boolean", description: "Whether to regenerate content embeddings (defaults to false, but will regenerate if content is changed)", default: false }
      },
      required: ["id"]
    },
    annotations: {
      title: "Enrich Record",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false
    }
  }
]; 