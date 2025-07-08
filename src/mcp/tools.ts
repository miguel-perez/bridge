// MCP Tool definitions - must match DXT manifest exactly
export const tools = [
  {
    name: "capture",
    description: "Capture raw experiential text as a source record. For unprocessed, in-the-moment entries such as journal notes, chat messages, or direct transcripts.",
    inputSchema: {
      type: "object",
      properties: {
        content: { type: "string", description: "Raw text from experiencer, either new experience or reflection or previous capture." },
        experiencer: { type: "string", description: "Who experienced this (e.g., 'Claude', 'Sarah', 'Team')" },
        perspective: { type: "string", enum: ["I", "we", "you", "they"], description: "Perspective used" },
        processing: { type: "string", enum: ["during", "right-after", "long-after", "crafted"], description: "When captured relative to experience" },
        contentType: { type: "string", description: "Type of content", default: "text" },
        event_time: { type: "string", description: "When it happened (ISO timestamp or descriptive like 'yesterday morning')" },
        capture_time: { type: "string", description: "When it was captured (ISO timestamp or descriptive like 'yesterday morning')" },
        crafted: { type: "boolean", description: "Whether content was crafted for an audience (e.g., blog post = true, journal entry = false)" },
        experiential_qualities: { 
          type: "object", 
          description: `Optional experiential quality analysis. Each quality describes a phenomenological dimension of experience, scored 0.0-1.0.

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

**Vector:**
A 7-dimensional object with a number (0.0-1.0) for each quality, representing the prominence of that quality in the moment.

**Qualities Array:**
Each entry provides evidence for a quality, including the excerpt, prominence (rating), and manifestation (how it appears in the experience).
`,
          properties: {
            qualities: {
              type: "array",
              description: `Array of quality evidence. Each entry describes how a quality manifests in the moment, with a rating and supporting excerpt.\n- **type**: One of the seven qualities.\n- **excerpt**: Exact phrase showing this quality.\n- **prominence**: 0.0-1.0 score (see rubric).\n- **manifestation**: How this quality appears in the experience.`,
              items: {
                type: "object",
                properties: {
                  type: { type: "string", enum: ["embodied", "attentional", "affective", "purposive", "spatial", "temporal", "intersubjective"], description: "Phenomenological quality type. See above for definitions." },
                  excerpt: { type: "string", description: "Exact phrase showing this quality." },
                  prominence: { type: "number", minimum: 0, maximum: 1, description: "How prominent this quality is (0.0-1.0). See scoring rubric." },
                  manifestation: { type: "string", description: "How this quality manifests in the experience (e.g., 'physical anxiety', 'diffuse attention', 'background sadness')." }
                },
                required: ["type", "excerpt", "prominence", "manifestation"]
              }
            },
            vector: {
              type: "object",
              description: `A 7-dimensional vector with a number (0.0-1.0) for each quality, representing the overall prominence of each experiential dimension in the moment.`,
              properties: {
                embodied: { type: "number", minimum: 0, maximum: 1, description: "Embodied Presence (see above)" },
                attentional: { type: "number", minimum: 0, maximum: 1, description: "Attentional Flow (see above)" },
                affective: { type: "number", minimum: 0, maximum: 1, description: "Affective Atmosphere (see above)" },
                purposive: { type: "number", minimum: 0, maximum: 1, description: "Purposive Momentum (see above)" },
                spatial: { type: "number", minimum: 0, maximum: 1, description: "Spatial Situation (see above)" },
                temporal: { type: "number", minimum: 0, maximum: 1, description: "Temporal Flow (see above)" },
                intersubjective: { type: "number", minimum: 0, maximum: 1, description: "Intersubjective Field (see above)" }
              },
              required: ["embodied", "attentional", "affective", "purposive", "spatial", "temporal", "intersubjective"]
            }
          },
          required: ["vector"]
        }
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
    description: `Unified faceted search across all records with comprehensive relevance scoring.\n\nRELEVANCE SCORING:\nAll results include a relevance score (0-100%) that combines:\n- Text matching: How well the query matches the content\n- Vector similarity: Similarity to experiential quality vectors\n- Semantic similarity: Semantic similarity to natural language queries\n- Filter relevance: How well the record matches applied filters\n\nResults are automatically sorted by relevance when sort='relevance' (default).\n\nTEMPORAL FILTERING:\n- 'system_time': Filter by when record was created (auto-generated timestamp)\n  Example: system_time: { start: "2025-01-01", end: "2025-01-31" }\n- 'event_time': Filter by when event happened (user-provided time)\n  Example: event_time: "yesterday" or event_time: { start: "last week", end: "today" }\n- 'capture_time': Filter by when record was captured (separate from event time)\n  Example: capture_time: "yesterday" or capture_time: { start: "last week", end: "today" }\n\nCONTENT FILTERING:\n- 'contentType': Filter by content type (e.g., 'text', 'audio')\n- 'crafted': Filter by crafted status (true = crafted for audience, false = raw)\n\nSEMANTIC SEARCH:\n- 'semantic_query': Search for semantically similar content using natural language\n  Example: semantic_query: "moments of anxiety" or semantic_query: "creative breakthroughs"\n- 'semantic_threshold': Minimum similarity threshold (0.0-1.0, default: 0.7)\n\nEXPERIENTIAL QUALITIES FILTERING:\n- min_X / max_X: Filter by minimum/maximum value for each experiential quality (e.g., min_affective: 0.7)\n- vector: Search for records most similar to a provided experiential quality vector (e.g., vector: { embodied: 0.5, affective: 0.9, ... })\n- vector_similarity_threshold: Only return records with similarity above this threshold (0-1, higher = more similar)\n\nExample:\n{ min_affective: 0.7, crafted: false, semantic_query: "moments of anxiety", semantic_threshold: 0.8 }\n\nThe system uses chrono-node for flexible date parsing.\n\nResults include relevance scores and breakdowns to help understand why each result was ranked as it was.`,
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Semantic search query (natural language or keywords)" },
        system_time: { oneOf: [ { type: "string" }, { type: "object", properties: { start: { type: "string" }, end: { type: "string" } }, required: ["start", "end"] } ], description: "Filter by record creation time (auto-generated timestamp)" },
        event_time: { oneOf: [ { type: "string" }, { type: "object", properties: { start: { type: "string" }, end: { type: "string" } }, required: ["start", "end"] } ], description: "Filter by event time (user-supplied)" },
        type: { type: "array", items: { type: "string", enum: ["source"] }, description: "Restrict to certain record types" },
        experiencer: { type: "string", description: "Only records with this experiencer" },
        perspective: { type: "string", description: "Only records with this perspective" },
        processing: { type: "string", description: "Only records with this processing level" },
        contentType: { type: "string", description: "Only records with this content type (e.g., 'text', 'audio')" },
        crafted: { type: "boolean", description: "Only records with this crafted status (true = crafted for audience, false = raw)" },
        capture_time: { oneOf: [ { type: "string" }, { type: "object", properties: { start: { type: "string" }, end: { type: "string" } }, required: ["start", "end"] } ], description: "Filter by when record was captured (separate from event time)" },
        groupBy: { type: "string", enum: ["type", "experiencer", "day", "week", "month", "hierarchy"], description: "Group results by this field" },
        sort: { type: "string", enum: ["relevance", "system_time", "event_time"], description: "Sort by field" },
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
  }
]; 