# Framed Moments MCP Server Design

## Overview

A minimal MCP server for capturing and framing moments of experience using the Framed Moment framework. The system separates quick capture from thoughtful framing, enabling both in-the-moment recording and later reflection with optional AI assistance.

## Core Types

```typescript
type Perspective = "I" | "we" | "you" | "they" | string;
type ProcessingLevel = "during" | "right-after" | "long-after" | "crafted";
type ContentType = "text" | "voice" | "image" | "link" | string;
type QualityType = "embodied" | "attentional" | "emotional" | "purposive" | "spatial" | "temporal" | "relational";

type FramePattern = 
  | "moment-of-recognition"    // A clear focal point of understanding
  | "sustained-attention"      // When duration itself is primary
  | "crossing-threshold"       // The lived experience of transition
  | "peripheral-awareness"     // Multiple streams held simultaneously  
  | "directed-momentum"        // Experience dominated by direction
  | "holding-opposites"        // When contradictions refuse to resolve
  | string;                    // Open for other patterns

interface Source {
  id: string; // Generated
  content: string; 
  contentType: ContentType; // Default: "text"
  created: string; // ISO timestamp
  when?: string; // When it happened (defaults to created)
  
  // Context
  perspective?: Perspective; // Default: "I"
  experiencer?: string; // Default: "self"
  processing?: ProcessingLevel; // Default: "during"
  related?: string[]; // Relationships to other sources
  
  // File reference (for non-text content)
  file?: string; // Path to file, validated against MCP roots
}

interface Moment {
  id: string; // Generated
  
  // Core frame data
  emoji: string;
  summary: string; // 5-7 word narrative
  narrative?: string; // Full first-person experiential description
  pattern?: FramePattern; // Optional pattern type
  
  // Experiential dimensions - include whichever are present
  qualities?: Array<{
    type: QualityType;
    manifestation: string; // Rich description of how this quality appears
  {
    name: "synthesize",
    description: "Create a container moment holding related moments",
    inputSchema: {
      type: "object",
      properties: {
        momentIds: { 
          type: "array", 
          items: { type: "string" },
          description: "Moments to group together"
        },
        emoji: { type: "string" },
        summary: { type: "string", description: "5-7 words for the synthesis" },
        narrative: { type: "string", description: "Optional overarching narrative" },
        pattern: { type: "string", default: "synthesis" }
      },
      required: ["momentIds", "emoji", "summary"]
    }
  }>;
  
  // Source tracking
  sources: Array<{
    sourceId: string;
    start?: number; // Character positions for fragments
    end?: number;
  }>;
  
  // Timestamps  
  created: string; // When moment was framed
  when?: string; // When experience happened
}

interface Synthesis {
  id: string; // Generated
  emoji: string;
  summary: string; // 5-7 word summary
  narrative?: string; // Optional overarching narrative
  synthesizedMomentIds: string[]; // The moments contained within
  pattern: string; // Default: "synthesis"
  created: string; // When synthesis was created
}
```

## MCP Tools

```typescript
const tools = [
  {
    name: "capture",
    description: "Save an experience, thought, or feeling",
    inputSchema: {
      type: "object",
      properties: {
        content: { type: "string" },
        // All other properties are optional with smart defaults
        contentType: { type: "string", default: "text" },
        perspective: { type: "string", default: "I" },
        processing: { type: "string", default: "during" },
        when: { type: "string", description: "When it happened" }
      },
      required: ["content"] // Only content is required!
    }
  },
  {
    name: "frame",
    description: "Create a moment from your captures",
    inputSchema: {
      type: "object", 
      properties: {
        sourceIds: { type: "array", items: { type: "string" } },
        emoji: { type: "string" },
        summary: { type: "string", description: "5-7 words" },
        narrative: { type: "string" },
        pattern: { type: "string" },
        withAI: { type: "boolean", default: false }
      },
      required: ["sourceIds", "emoji", "summary"]
    }
  },
  {
    name: "enhance",
    description: "Refine or add details to existing captures or moments",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Source or moment ID" },
        updates: {
          type: "object",
          description: "Fields to update",
          additionalProperties: true
        },
        withAI: { 
          type: "boolean", 
          description: "Get AI suggestions for enhancement",
          default: false
        }
      },
      required: ["id", "updates"]
    }
  },
  {
    name: "synthesize",
    description: "Create a container moment holding related moments",
    inputSchema: {
      type: "object",
      properties: {
        momentIds: { 
          type: "array", 
          items: { type: "string" },
          description: "Moments to group together"
        },
        emoji: { type: "string" },
        summary: { type: "string", description: "5-7 words for the synthesis" },
        narrative: { type: "string", description: "Optional overarching narrative" },
        pattern: { type: "string", default: "synthesis" }
      },
      required: ["momentIds", "emoji", "summary"]
    }
  }
];
```

## MCP Prompts

```typescript
const prompts = [
  // Session Management
  {
    name: "begin_reflection",
    description: "Open a reflective session",
    arguments: [
      { name: "intention", description: "What brings you here?", required: false }
    ]
  },
  {
    name: "close_reflection", 
    description: "Close session and review what emerged",
    arguments: []
  },
  
  // Guided Tool Usage
  {
    name: "guided_capture",
    description: "Capture an experience with gentle guidance",
    arguments: [
      { name: "experience_type", description: "memory, feeling, observation", required: false }
    ]
  },
  {
    name: "guided_frame",
    description: "Frame moments from your captures", 
    arguments: [
      { name: "source_hint", description: "Which capture(s) to frame", required: false }
    ]
  },
  {
    name: "guided_enhance",
    description: "Deepen and refine an existing moment",
    arguments: [
      { name: "moment_id", description: "Which moment to enhance", required: true }
    ]
  },
  
  // Queue Management
  {
    name: "review_captures",
    description: "Review your unframed captures",
    arguments: []
  },
  
  // Syntheses and Timeline
  {
    uri: "moments://syntheses",
    name: "Browse synthesis moments",
    description: "View all container moments"
  },
  {
    uri: "moments://timeline",
    name: "Timeline view", 
    description: "Hierarchical view with syntheses and moments"
  },
  {
    uri: "moments://id/{id}",
    name: "Get specific moment",
    description: "Retrieve any moment or synthesis by ID"
  },
  {
    uri: "moments://id/{id}/children",
    name: "Moments within synthesis",
    description: "Get all moments contained in a synthesis"
  }
];
```

```typescript
const resources = [
  // Recent activity
  {
    uri: "moments://recent",
    name: "Recent moments",
    description: "Last 20 framed moments"
  },
  {
    uri: "sources://unframed",
    name: "Captures waiting to be framed",
    description: "Sources not yet part of any moment"
  },
  
  // Time-based browsing
  {
    uri: "moments://date/{date}",
    name: "Moments from specific date",
    description: "Use YYYY-MM-DD or YYYY-MM format"
  },
  {
    uri: "moments://year/{year}",
    name: "Moments from a year"
  },
  
  // Search and filter
  {
    uri: "moments://search/{query}",
    name: "Search moments",
    description: "Search in summaries and narratives"
  },
  {
    uri: "moments://pattern/{pattern}",
    name: "Moments by pattern",
    description: "e.g., crossing-threshold, sustained-attention"
  },
  {
    uri: "moments://quality/{quality}",
    name: "Moments with quality",
    description: "e.g., embodied, relational, temporal"
  },
  
  // Source metadata filters
  {
    uri: "moments://perspective/{perspective}",
    name: "Moments by perspective",
    description: "e.g., I, we, you, they"
  },
  {
    uri: "moments://experiencer/{experiencer}",
    name: "Moments by experiencer",
    description: "e.g., self, mom, partner"
  },
  {
    uri: "moments://processing/{level}",
    name: "Moments by processing level",
    description: "during, right-after, long-after, crafted"
  },
  {
    uri: "moments://type/{contentType}",
    name: "Moments by content type",
    description: "text, voice, image, link"
  }
];
```

## AI Integration with Phenomenological Grounding

### Core System Prompt
```typescript
const PHENOMENOLOGICAL_SYSTEM_PROMPT = `
You are a guide for experiential capture and reflection using the Framed Moment framework.

Core principles:
- Experience emerges as an indivisible whole with multiple dimensions
- Preserve the experiencer's authentic voice - use their words, rhythm, and expressions
- Each moment naturally presents certain dimensions more prominently
- The body, mood, attention, purpose, place, time, and others mutually constitute experience
- Discrete moments are practical tools, not claims about consciousness

When helping frame moments:
- Listen for what's most alive in the experience
- Use the storyboard metaphor: wide shots (scenes), medium shots (beats), close-ups (micro-moments)
- Never impose interpretations - draw out what's already there
- Maintain first-person immediacy and experiential completeness
`;
```

### Sampling Configuration
```typescript
// For AI-assisted framing
const samplingConfig = {
  modelPreferences: {
    costPriority: 0.2,
    speedPriority: 0.3,
    intelligencePriority: 0.9  // High intelligence for nuanced understanding
  },
  systemPrompt: PHENOMENOLOGICAL_SYSTEM_PROMPT,
  includeContext: "allServers",  // See patterns across all moments
  metadata: {
    temperature: 0.7,  // Balanced for analysis
    max_tokens: 2000
  }
};

// Different temperatures for different operations
const TEMPS = {
  boundary_detection: 0.3,    // Low - precise analysis
  quality_extraction: 0.5,    // Medium - balanced
  narrative_expansion: 0.8,   // Higher - creative expression
  voice_preservation: 0.4     // Low - maintain authenticity
};
```

The `frame` tool can leverage AI assistance through MCP's sampling feature:

### 1. Boundary Detection
When framing a long capture, AI can identify discrete moments using the storyboard metaphor:
- **Wide shots**: Major scenes (5-30 minutes)
- **Medium shots**: Emotional beats (1-5 minutes)  
- **Close-ups**: Crystallized micro-moments (5-60 seconds)

### 2. Quality Identification
AI analyzes which experiential dimensions are most prominent:
- Embodied presence: How physicality textures this moment
- Attentional flow: The direction and quality of awareness
- Affective atmosphere: The emotional coloring
- Purposive momentum: The directedness or drift
- Spatial situation: The lived sense of place
- Temporal flow: How past and future inhabit present
- Intersubjective field: How others' presence matters

### 3. Narrative Expansion
AI can help expand brief notes into full experiential narratives while preserving the authentic voice.

### 4. Voice Preservation
All AI assistance maintains the experiencer's:
- Vocabulary and unique expressions
- Rhythm and sentence structure
- Emotional register and intensity
- Perspective and self-awareness level

## Storage with File Support

Directory structure:
```
storage/
  data.jsonl          // All source/moment/synthesis records
  sessions.jsonl      // Session metadata
  files/
    2024/
      01/
        15/
          src_123_morning-walk.m4a
          src_124_summit-view.jpg
```

JSONL examples:
```jsonl
{"type":"source","id":"src_123","content":"Sal said I should be a designer","created":"2024-01-15T10:30:00Z"}
{"type":"source","id":"src_124","content":"[Voice memo about morning walk]","contentType":"voice","file":"files/2024/01/15/src_124_morning-walk.m4a"}
{"type":"moment","id":"mom_456","emoji":"🚗","summary":"Permission to choose passion over survival","sources":[{"sourceId":"src_123"}]}
{"type":"synthesis","id":"syn_789","emoji":"📅","summary":"Tuesday's profound conversations","synthesizedMomentIds":["mom_456","mom_457"]}
{"type":"session","id":"ses_012","started":"2024-01-15T09:00:00Z","ended":"2024-01-15T10:00:00Z","captureCount":5,"frameCount":2}
```

File handling:
```typescript
async function storeFile(sourcePath: string, sourceId: string): Promise<string> {
  const date = new Date();
  const dir = `files/${date.getFullYear()}/${pad(date.getMonth()+1)}/${pad(date.getDate())}`;
  await fs.mkdir(dir, { recursive: true });
  
  const ext = path.extname(sourcePath);
  const filename = `${sourceId}_${sanitize(path.basename(sourcePath))}`;
  const storedPath = path.join(dir, filename);
  
  await fs.copyFile(sourcePath, storedPath);
  return storedPath;
}
```

## Enhanced Features Using MCP Capabilities

### 1. File Handling with Roots
```typescript
// Server receives roots from client
server.setRequestHandler(ListRootsRequestSchema, async () => ({
  roots: [] // Client will provide accessible directories
}));

// Validate file access against MCP roots
async function validateFile(filepath: string): Promise<boolean> {
  const roots = await getRoots(); // Get current roots from client
  const resolved = path.resolve(filepath);
  return roots.some(root => resolved.startsWith(root.uri.replace('file://', '')));
}

// Capture with file reference
capture({
  content: "[Voice memo about morning walk]",
  contentType: "voice",
  file: "audio/2024-01-15-walk.m4a"  // Validated against roots
});
```

### 2. Elicitation for Missing Details
When the server detects missing valuable information, it can ask:

```typescript
// After a quick capture
if (!source.when && processing === "long-after") {
  const response = await elicitation.create({
    message: "When did this memory originally happen?",
    requestedSchema: {
      type: "string",
      format: "date",
      description: "Approximate date (YYYY-MM or YYYY)"
    }
  });
  
  if (response.action === "accept") {
    source.when = response.content;
  }
}
```

### 3. Progressive Validation with Error Handling
```typescript
// Non-blocking validation with partial success
try {
  const moment = await createMoment(params);
  
  if (params.withAI) {
    try {
      const qualities = await extractQualities(moment);
      moment.qualities = qualities;
    } catch (aiError) {
      // AI failed but moment still created
      return {
        content: [{
          type: "text",
          text: `Created moment "${moment.summary}" (AI analysis unavailable)`
        }],
        isError: false,
        meta: { partialSuccess: true }
      };
    }
  }
  
  return { content: [{ type: "text", text: `Framed moment: ${moment.emoji} ${moment.summary}` }] };
} catch (error) {
  // Complete failure - return helpful error
  return {
    content: [{ type: "text", text: `Couldn't create moment: ${error.message}` }],
    isError: true
  };
}
```

### 4. Progress Feedback During AI Analysis
```typescript
if (withAI && progressToken) {
  await server.sendProgress({
    progressToken,
    progress: { kind: "begin", title: "Analyzing experience..." }
  });
  
  // Boundary detection
  await server.sendProgress({
    progressToken,
    progress: { kind: "report", percentage: 33, message: "Finding moment boundaries" }
  });
  
  // Quality extraction
  await server.sendProgress({
    progressToken,
    progress: { kind: "report", percentage: 66, message: "Identifying qualities" }
  });
  
  // Complete
  await server.sendProgress({
    progressToken,
    progress: { kind: "end" }
  });
}
```

### 5. Smart Defaults and Corrections
The system assumes intelligent defaults but allows easy correction:

```typescript
// Quick capture assumes defaults
capture("Met Sarah at coffee shop") 
// Creates: perspective="I", processing="during", contentType="text"

// Later enhancement
enhance({
  id: "src_123",
  updates: {
    perspective: "we",  // Actually it was collaborative
    experiencer: "sarah-and-me",
    when: "2024-01-14T10:00:00Z"
  }
});
```

### 6. Notifications for Engagement
```typescript
// Gentle reminders about unframed captures
server.sendNotification({
  method: "notifications/sources/unframed-accumulating",
  params: {
    count: unframedCount,
    oldest: oldestUnframed.created,
    suggestion: "You have captures waiting to be framed"
  }
});

// Validation as enhancement opportunity
server.sendNotification({
  method: "notifications/moment/enhancement-available",
  params: {
    momentId: moment.id,
    suggestions: ["Add narrative", "Explore qualities"]
  }
});
```

## Real-Life Usage Example: Sal's Career Advice

This example shows how a real memory transforms through the Framed Moments process.

### Initial Capture (October 2023)
From a recording about career experiences:

```typescript
// Quick capture during recording session
capture({
  content: `At the time I was exploring freelancing with web design. Sal lived 
  two blocks away and gave me rides to work. Those car conversations were great. 
  He turned to me and said "you should be a designer, you think like a designer." 
  First time someone gave me such clear career advice.`,
  contentType: "voice",
  file: "recordings/2023-10-27-career-reflection.m4a",
  processing: "right-after"
});
```

### Framing Session (June 2024)
Eight months later, using AI assistance to frame the moment:

```typescript
// Frame with AI help to identify qualities
frame({
  sourceIds: ["src_original"],
  emoji: "🚗",
  summary: "Permission to choose passion over survival",
  withAI: true
});

// AI helps identify experiential dimensions:
// - Intersubjective (1.0): "This moment is fundamentally about being seen"
// - Purposive (0.9): "The moment captures a pivot"
// - Temporal (0.8): "Time crystallizes - past, present, future"
```

### Progressive Enhancement
Through dialogue and reflection, details emerge:

```typescript
enhance({
  id: "mom_sal",
  updates: {
    narrative: `Those car conversations were so great - Sal had been giving me 
    rides ever since we discovered he lived just two blocks away. 34 minutes from 
    Trevose back to North Philly, beats the hour and 48 minutes by bus and train...
    
    We're stopped at an intersection and he turned to me and said:
    "You should be a designer."
    "What do you mean?"
    "You think like a designer."
    
    I remember looking down when he said that, at my hands, then out at those 
    row homes. Part of why I'd gone to learn how to code because I thought art 
    wasn't secure enough...`,
    
    qualities: [
      {
        type: "intersubjective",
        manifestation: `This moment is fundamentally about being seen. Sal as 
        accomplished designer recognizing something I hadn't claimed. But deeper - 
        Sal as another North Philly kid who made it, who understood why I chose 
        "practical" over passion...`
      }
    ]
  }
});
```

### Creating Synthesis
Later, connecting related moments:

```typescript
synthesize({
  momentIds: ["mom_sal", "mom_first_design_job", "mom_pixel_art"],
  emoji: "🎨",
  summary: "Journey from security to creative identity",
  narrative: `The thread through these moments: others seeing my design nature 
  before I could claim it myself. From pixel art constraints to Sal's recognition 
  to finally accepting design as identity.`
});
```

### Browsing the Timeline

```typescript
// See the journey over time
read_resource("moments://timeline");
// Returns hierarchical view showing how individual moments nest within larger patterns

// Find all moments about career transitions
read_resource("moments://search/career");

// Explore all "permission" moments
read_resource("moments://pattern/moment-of-recognition");
```

This real example demonstrates:
- **Quick capture** preserves raw experience
- **Later framing** with AI assistance reveals dimensions
- **Progressive enhancement** as understanding deepens
- **Synthesis** connects moments into larger patterns
- **Timeline browsing** reveals life threads

## Usage Examples

### Quick Capture with Defaults
```typescript
// Minimal capture - assumes all defaults
capture("Walking to lunch, sudden memory of dad's sandwich shop")
// Creates with: perspective="I", processing="during", contentType="text"

// The system might later ask via elicitation:
// "This seems like a memory - when did this originally happen?"
```

### Session-Based Workflow
```typescript
// Start reflection
prompt("begin_reflection", { intention: "process the day" });

// Capture several experiences
capture("Morning standup felt different today - team really connected");
capture("Lunch conversation with Sarah about career paths");
capture({ 
  content: "[Frustrated rambling about the deployment]",
  contentType: "voice",
  file: "audio/deployment-rant.m4a"
});

// Close session - review what emerged
prompt("close_reflection");
// "You captured 3 experiences today. Would you like to review them?"

// Frame the meaningful ones
frame({
  sourceIds: ["src_standup"],
  emoji: "👥",
  summary: "Team finally gelling after months",
  withAI: true
});
```

### Creating Syntheses
```typescript
// End of week synthesis
synthesize({
  momentIds: ["mom_mon_meeting", "mom_wed_breakthrough", "mom_fri_celebration"],
  emoji: "📅",
  summary: "The week everything clicked",
  narrative: "Started with tension, moved through breakthrough, ended in celebration"
});

// Thematic synthesis
synthesize({
  momentIds: ["mom_dad_sandwich", "mom_grandma_recipes", "mom_family_dinner"],
  emoji: "🍞",
  summary: "Food as family connection",
  narrative: "How meals carry memory and create belonging"
});
```

### Session Flow with Queue Management
```typescript
interface SessionRecord {
  id: string;
  started: string;
  ended: string;
  captureCount: number;
  frameCount: number;
  intention?: string;
}

// During session - track what's created
on("begin_reflection", (params) => {
  session = {
    id: generateId(),
    started: new Date().toISOString(),
    intention: params.intention,
    captures: [],
    moments: []
  };
});

// Track activity
on("capture", (source) => session.captures.push(source.id));
on("frame", (moment) => session.moments.push(moment.id));

// Close session - review the queue
on("close_reflection", async () => {
  // Find unframed captures from this session
  const unframed = session.captures.filter(id => 
    !session.moments.some(m => m.sources.includes(id))
  );
  
  // Save session record
  await saveSession({
    id: session.id,
    started: session.started,
    ended: new Date().toISOString(),
    captureCount: session.captures.length,
    frameCount: session.moments.length,
    intention: session.intention
  });
  
  if (unframed.length > 0) {
    return {
      message: `Session complete. You captured ${session.captures.length} experiences 
                and framed ${session.moments.length} moments. Would you like to 
                review the ${unframed.length} unframed captures?`,
      options: ["Review now", "Save for later", "Let them go"]
    };
  }
});
```

### Browsing Moments
```typescript
// In any MCP client
read_resource("moments://recent")
read_resource("moments://search/Sal")
read_resource("moments://pattern/crossing-threshold")
read_resource("moments://date/2024-01")

// Browse by source metadata
read_resource("moments://perspective/we")      // Collaborative moments
read_resource("moments://experiencer/mom")     // Stories from mom
read_resource("moments://processing/long-after") // Old memories
read_resource("moments://type/voice")          // Voice captures

// Queue management
read_resource("sources://unframed")            // All unframed captures
```

### Working with Files
```typescript
// Capture a voice memo
capture({
  content: "[Morning reflection on the walk]",
  contentType: "voice",
  file: "recordings/2024-01-15-morning.m4a"
});

// Capture with image
capture({
  content: "The view from the mountain top",
  contentType: "image", 
  file: "photos/mountain-summit.jpg"
});
```

### Session-Based Reflection
```typescript
// Start a reflection session
prompt("begin_reflection", { intention: "process the day" });
// Claude guides capture and framing

// Review accumulated captures
prompt("review_captures");
// Claude helps identify what to frame

// Close with integration
prompt("close_reflection");
// Claude summarizes what emerged
```
```

## Key Design Principles

1. **Minimal but Complete**: Four tools (capture/frame/enhance/synthesize) handle the entire workflow
2. **Forgiving by Design**: Accept imperfect input, enhance later
3. **Progressive Enhancement**: Start simple, add detail as understanding develops
4. **Smart Defaults**: Assume the common case, allow corrections
5. **Non-Blocking Validation**: Create first, improve later
6. **Voice Preservation**: All text maintains the experiencer's authentic voice
7. **Flexible Capture**: Accept any content type, any processing level
8. **Rich Browsing**: Resources provide multiple ways to explore moments
9. **Natural Organization**: Syntheses create meaningful hierarchies
10. **Session Containers**: Bounded time for reflection with light tracking

## Implementation Notes

- Sources are immutable once created
- Moments can evolve as understanding deepens
- AI prompts emphasize phenomenological grounding with natural expression
- Validation ensures experiential completeness without being rigid
- JSONL storage enables streaming and append-only patterns

This design bridges the philosophical depth of the Framed Moment framework with practical implementation needs, creating a system that's both powerful and approachable.