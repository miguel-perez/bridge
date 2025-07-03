#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import {
  generateId,
  saveSource,
  saveMoment,
  saveSynthesis,
  getSource,
  getMoment,
  updateMoment,
  getSources,
  getMoments,
  getRecentMoments,
  getSyntheses,
  getUnframedSources,
  validateDataIntegrity,
  getMomentsByDateRange,
  searchMoments,
  getMomentsByPattern,
  getMomentsBySynthesis,
  getSynthesis,
  validateFilePath
} from './storage.js';
import type { SourceRecord, ProcessingLevel } from './types.js';
import { DESIGNER_MOMENT, WRESTLING_MOMENT, DOLPHIN_MOMENT, BLEH_MOMENT, KETAMINE_MOMENT, PATTERN_VARIATIONS, QUALITIES_EXAMPLES, TRANSFORMATION_PRINCIPLES, COMMON_PITFALLS } from './tested-moments-data.js';

// Constants
const SERVER_NAME = 'framed-moments';
const SERVER_VERSION = '0.1.0';

// Pattern documentation constant
const PATTERN_GUIDE = {
  purpose: "Patterns reveal how your attention moved through the experience - each has its own rhythm and natural boundaries you can feel.",
  metaphor: "Think like a storyboard artist deciding frame boundaries",
  patterns: {
    "moment-of-recognition": {
      description: "Everything suddenly snaps into focus—the background fades and this one thing becomes crystal clear.",
      feltSignal: "A surge of clarity or insight, like a lightbulb turning on.",
      attentionMoves: "Like a camera zooming in sharply on a single subject, blurring everything else.",
      storyboard: "Reaction panel - tight on the 'aha!' moment",
      boundaries: "Start when attention sharpens toward insight, end when recognition lands",
      example: "Realizing why you chose a certain career path",
      keywords: ["realize", "understand", "click", "aha", "insight", "discover"]
    },
    "sustained-attention": {
      description: "Time stretches out—your awareness settles and holds steady, everything else recedes to the edges.",
      feltSignal: "A sense of being absorbed or suspended, as if time slows down.",
      attentionMoves: "Like a spotlight holding steady on one scene, refusing to move on.",
      storyboard: "Long take - camera holds steady on extended experience",
      boundaries: "Start when awareness settles, end when it shifts away",
      example: "Sitting beside someone in hospital, meditation",
      keywords: ["sitting", "waiting", "watching", "holding", "staying", "duration"]
    },
    "crossing-threshold": {
      description: "A shift or transformation—suddenly, you're on the other side of something, and everything feels different.",
      feltSignal: "A jolt or sense of crossing over, like stepping through a doorway.",
      attentionMoves: "Like a match cut in film—one scene instantly becomes another, and you feel the before and after.",
      storyboard: "Match cut - showing the before→after transition",
      boundaries: "Capture last moment of 'before' through first moment of 'after'",
      example: "The moment understanding clicks after confusion",
      keywords: ["suddenly", "then", "transform", "shift", "become", "transition"]
    },
    "peripheral-awareness": {
      description: "Your attention spreads wide—holding many things at once, tracking the whole field instead of one point.",
      feltSignal: "A sense of juggling or being everywhere at once, with no single focus.",
      attentionMoves: "Like a wide-angle lens capturing the whole scene, everything in view but nothing in sharp focus.",
      storyboard: "Wide shot - everything happening at once",
      boundaries: "Start when juggling begins, end when focus narrows",
      example: "Managing all aspects of a dinner party",
      keywords: ["while", "meanwhile", "tracking", "juggling", "multiple", "simultaneous"]
    },
    "directed-momentum": {
      description: "Everything lines up behind a single drive—your focus narrows and you move with unstoppable force toward a goal.",
      feltSignal: "A rush or tunnel vision, as if nothing else exists but the target.",
      attentionMoves: "Like a tracking shot racing toward a finish line, all energy moving in one direction.",
      storyboard: "Tracking shot - following movement to completion",
      boundaries: "Start when everything aligns, end at target/interruption",
      example: "Final sprint to the finish line",
      keywords: ["toward", "racing", "focused", "goal", "must", "driven"]
    },
    "holding-opposites": {
      description: "You feel pulled in two directions at once—contradictions or tensions refuse to resolve, and you hold both at the same time.",
      feltSignal: "A sense of inner conflict, like being stretched between two truths.",
      attentionMoves: "Like a split screen showing both sides at once, unable to choose just one.",
      storyboard: "Split panel - showing both truths at once",
      boundaries: "Start when tension becomes conscious, end when you act despite it",
      example: "Setting boundaries with loved ones",
      keywords: ["but", "yet", "both", "despite", "tension", "conflict"]
    }
  },
  defaultPattern: "moment-of-recognition"
};

const QUALITIES_GUIDE = {
  purpose: "Every moment we capture weaves together different experiential qualities—ways of noticing how experience shows up in the body, mind, space, time, and relationships. Attending to these qualities helps evoke richer, more vivid moments.",
  qualities: {
    embodied: {
      description: "How experience is felt in the body—sensations, posture, breath, movement, tension, or ease.",
      prompts: [
        "What is your body doing or feeling right now?",
        "Where do you notice tension, relaxation, or movement?",
        "How does your breath, heartbeat, or posture shape this moment?"
      ],
      example: "My shoulders pull up toward my ears, that familiar armor against judgment."
    },
    attentional: {
      description: "Where and how your attention moves—what draws focus, what drifts to the background, what you notice or ignore.",
      prompts: [
        "What is most vivid or clear in your awareness?",
        "Does your attention jump, settle, or scatter?",
        "What do you keep returning to, or what fades away?"
      ],
      example: "My gaze keeps flicking to the clock, even as I try to listen."
    },
    emotional: {
      description: "The felt sense of mood, feeling, or emotional coloring—subtle or intense, shifting or steady.",
      prompts: [
        "What feelings are present, even faintly?",
        "Is there a mood or emotional weather in this moment?",
        "How does emotion shape what you notice or do?"
      ],
      example: "A tightness blooms in my chest, equal parts hope and dread."
    },
    purposive: {
      description: "The sense of intention, drive, or aim—what you want, avoid, or are drawn toward in this moment.",
      prompts: [
        "What are you trying to do, change, or achieve?",
        "Is there a pull toward or away from something?",
        "What feels possible or necessary right now?"
      ],
      example: "Every muscle leans toward the finish line, nothing else matters."
    },
    spatial: {
      description: "The lived sense of place, position, and environment—how space shapes experience.",
      prompts: [
        "Where are you, and what do you notice about the space?",
        "How does the environment feel—open, closed, crowded, empty?",
        "What details of place stand out?"
      ],
      example: "The kitchen hums around me, tile cool beneath my bare feet."
    },
    temporal: {
      description: "How time is felt—rushing, dragging, suspended, or layered with past and future.",
      prompts: [
        "Does time feel fast, slow, or strange?",
        "Are you aware of before, after, or just now?",
        "How does memory or anticipation color this moment?"
      ],
      example: "Minutes stretch and pool, each breath thick with waiting."
    },
    relational: {
      description: "The presence or absence of others—how relationships, spoken or unspoken, shape the moment.",
      prompts: [
        "Who else is present, even in thought?",
        "How do others' actions, words, or silence affect you?",
        "Is there a sense of connection, distance, or tension?"
      ],
      example: "His eyes search mine for forgiveness, but I look away."
    }
  }
};

const FRAMED_MOMENTS_EXAMPLES = {
  purpose: 'Real moments from testing show how raw experience transforms into rich experiential capture',
  examples: [
    DESIGNER_MOMENT,
    WRESTLING_MOMENT,
    DOLPHIN_MOMENT,
    BLEH_MOMENT,
    KETAMINE_MOMENT
  ],
  patternVariations: PATTERN_VARIATIONS,
  qualitiesInAction: QUALITIES_EXAMPLES,
  transformationPrinciples: TRANSFORMATION_PRINCIPLES,
  commonPitfalls: COMMON_PITFALLS
};

// Create server instance
const server = new Server(
  {
    name: SERVER_NAME,
    version: SERVER_VERSION,
  },
  {
    capabilities: {
      tools: {
        listChanged: false  // We don't dynamically change tools
      },
      resources: {
        listChanged: false  // We don't dynamically change resources
      },
      prompts: {
        listChanged: false  // We don't dynamically change prompts
      },
    },
  }
);

// Add schema definitions for tool input validation
const captureSchema = z.object({
  content: z.string().min(1),
  contentType: z.string().optional().default('text'),
  perspective: z.string().optional().default('I'),
  processing: z.string().optional().default('during'),
  when: z.string().optional(),
  experiencer: z.string().optional().default('self'),
  related: z.array(z.string()).optional(),
  file: z.string().optional(),
});

// Updated frameSchema: only accepts sourceIds
const frameSchema = z.object({
  sourceIds: z.array(z.string()).min(1),
  emoji: z.string(),
  summary: z.string(),
  narrative: z.string().optional(),
  pattern: z.enum([
    'moment-of-recognition',
    'sustained-attention',
    'crossing-threshold',
    'peripheral-awareness',
    'directed-momentum',
    'holding-opposites'
  ]).optional().default('moment-of-recognition'),
});

// New weaveSchema: accepts momentIds
const weaveSchema = z.object({
  momentIds: z.array(z.string()).min(1),
  emoji: z.string(),
  summary: z.string(),
  narrative: z.string().optional(),
});

// New reflectSchema: for reflecting on sources
const reflectSchema = z.object({
  originalId: z.string(),
  content: z.string().min(1),
  contentType: z.string().optional().default('text'),
  perspective: z.string().optional(),
  processing: z.string().optional(),
  when: z.string().optional(),
  experiencer: z.string().optional(),
});

const enhanceSchema = z.object({
  id: z.string(),
  updates: z.record(z.any()),
});

// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const tools = [
    {
      name: 'capture',
      description: 'Capture a lived moment - what are you sensing, feeling, noticing right now? Try present tense to stay close to the experience. (Defaults: perspective="I", experiencer="self", processing="during")',
      inputSchema: {
        type: 'object',
        properties: {
          content: { type: 'string', description: 'The lived moment - try present tense, include what you\'re sensing, feeling, noticing' },
          contentType: { type: 'string', description: 'Type of content (text, voice, image, link)', default: 'text' },
          perspective: { type: 'string', description: 'Perspective (I, we, you, they)', default: 'I' },
          processing: { type: 'string', description: 'When captured relative to experience (during, right-after, long-after, crafted)', default: 'during' },
          when: { type: 'string', description: 'When it happened (ISO timestamp or descriptive)' },
          experiencer: { type: 'string', description: 'Who experienced this', default: 'self' },
          related: { 
            type: 'array',
            items: { type: 'string' },
            description: 'Related source IDs'
          },
          file: { type: 'string', description: 'Path to file (for non-text content)' },
        },
        required: ['content'],
      },
    },
    {
      name: 'frame',
      description: 'Frame your experience into a complete moment from one or more sources. Pattern type - recognizes how your attention moved (moment-of-recognition, sustained-attention, crossing-threshold, peripheral-awareness, directed-momentum, holding-opposites). See moments://patterns/guide, moments://qualities/guide and moments://examples.',
      inputSchema: {
        type: 'object',
        properties: {
          sourceIds: { 
            type: 'array', 
            items: { type: 'string' },
            description: 'Source IDs to frame into a moment',
            minItems: 1
          },
          emoji: { type: 'string', description: 'Emoji representation' },
          summary: { type: 'string', description: '5-7 word summary' },
          narrative: { type: 'string', description: 'Full experiential narrative (optional)' },
          pattern: { 
            type: 'string', 
            description: 'Pattern type - recognizes how your attention moved (focused, sustained, shifting, juggling). Helps identify natural moment boundaries. See moments://patterns/guide',
            default: 'moment-of-recognition'
          }
        },
        required: ['sourceIds', 'emoji', 'summary', 'pattern']
      }
    },
    {
      name: 'weave',
      description: 'Weave multiple moments together to reveal meta-patterns and deeper understanding. Like a tapestry, individual moments remain visible while creating something larger.',
      inputSchema: {
        type: 'object',
        properties: {
          momentIds: { 
            type: 'array', 
            items: { type: 'string' },
            description: 'Moment IDs to weave together into a larger pattern',
            minItems: 1
          },
          emoji: { type: 'string', description: 'Emoji representation' },
          summary: { type: 'string', description: '5-7 word summary' },
          narrative: { type: 'string', description: 'Optional overarching narrative' }
        },
        required: ['momentIds', 'emoji', 'summary']
      }
    },
    {
      name: 'enhance',
      description: 'Refine or add details to existing captures or moments',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Source or moment ID to enhance' },
          updates: { 
            type: 'object', 
            description: 'Fields to update',
            additionalProperties: true 
          },
        },
        required: ['id', 'updates'],
      },
    },
    {
      name: 'reflect',
      description: 'Add depth to an existing source by capturing further reflection, memories, or insights. Creates a new source linked to the original.',
      inputSchema: {
        type: 'object',
        properties: {
          originalId: { type: 'string', description: 'ID of source being reflected upon' },
          content: { type: 'string', description: 'New insights, memories, or noticings about the original experience' },
          contentType: { type: 'string', description: 'Type of content', default: 'text' },
          perspective: { type: 'string', description: 'Perspective (inherits from original if not specified)' },
          processing: { type: 'string', description: 'When captured relative to reflection' },
          when: { type: 'string', description: 'When the reflection occurred' },
          experiencer: { type: 'string', description: 'Who is reflecting (inherits from original if not specified)' }
        },
        required: ['originalId', 'content']
      }
    },
  ];
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'capture': {
        let input;
        try {
          input = captureSchema.parse(args);
        } catch (err) {
          if (err instanceof z.ZodError) {
            throw new McpError(
              ErrorCode.InvalidParams,
              err.errors.map(e => e.message).join('; ')
            );
          }
          throw err;
        }
        // For file captures, require content to describe the file
        if (input.file) {
          // Validate file exists and is readable
          if (!await validateFilePath(input.file)) {
            throw new McpError(
              ErrorCode.InvalidParams,
              `File not found or not readable: ${input.file}`
            );
          }
          // Create source record
          const source = await saveSource({
            id: generateId('src'),
            content: input.content,
            contentType: input.contentType,
            created: new Date().toISOString(),
            when: input.when,
            perspective: input.perspective,
            experiencer: input.experiencer,
            processing: input.processing as ProcessingLevel,
            related: input.related,
            file: input.file,
          });
          const defaultsUsed = [];
          const safeArgs = args || {};
          if (!safeArgs.perspective) defaultsUsed.push('perspective="I"');
          if (!safeArgs.experiencer) defaultsUsed.push('experiencer="self"');
          if (!safeArgs.processing) defaultsUsed.push('processing="during"');
          const content = [
            {
              type: 'text',
              text: `✓ Captured: "${source.content.substring(0, 50)}${source.content.length > 50 ? '...' : ''}" (ID: ${source.id})`
            },
            {
              type: 'text',
              text: `\nFull record:\n${JSON.stringify(source, null, 2)}`
            }
          ];
          if (defaultsUsed.length > 0) {
            content.push({
              type: 'text',
              text: `Defaults applied: ${defaultsUsed.join(', ')}`
            });
          }
          content.push({
            type: 'text',
            text: '\n💡 To enrich this capture, notice: What was your body experiencing? Where were you? What pulled your attention? Who else was present (even in memory)? Use "enhance" to add these lived details.'
          });
          return { content };
        }
        // Create source record
        const source = await saveSource({
          id: generateId('src'),
          content: input.content,
          contentType: input.contentType,
          created: new Date().toISOString(),
          when: input.when,
          perspective: input.perspective,
          experiencer: input.experiencer,
          processing: input.processing as ProcessingLevel,
          related: input.related,
        });
        const defaultsUsed = [];
        const safeArgs = args || {};
        if (!safeArgs.perspective) defaultsUsed.push('perspective="I"');
        if (!safeArgs.experiencer) defaultsUsed.push('experiencer="self"');
        if (!safeArgs.processing) defaultsUsed.push('processing="during"');
        const content = [
          {
            type: 'text',
            text: `✓ Captured: "${source.content.substring(0, 50)}${source.content.length > 50 ? '...' : ''}" (ID: ${source.id})`
          },
          {
            type: 'text',
            text: `\nFull record:\n${JSON.stringify(source, null, 2)}`
          }
        ];
        if (defaultsUsed.length > 0) {
          content.push({
            type: 'text',
            text: `Defaults applied: ${defaultsUsed.join(', ')}`
          });
        }
        content.push({
          type: 'text',
          text: '\n💡 To enrich this capture, notice: What was your body experiencing? Where were you? What pulled your attention? Who else was present (even in memory)? Use "enhance" to add these lived details.'
        });
        return { content };
      }

      case 'frame': {
        const input = frameSchema.parse(args);
        // Validate all sources exist
        const validSources: SourceRecord[] = [];
        for (const sourceId of input.sourceIds) {
          const source = await getSource(sourceId);
          if (!source) {
            throw new McpError(
              ErrorCode.InvalidParams,
              `Source not found: ${sourceId}`
            );
          }
          validSources.push(source);
        }
        // Create moment record
        const moment = await saveMoment({
          id: generateId('mom'),
          emoji: input.emoji,
          summary: input.summary,
          narrative: input.narrative,
          pattern: input.pattern,
          sources: input.sourceIds.map(sourceId => ({ sourceId })),
          created: new Date().toISOString(),
          when: validSources.find(s => s.when)?.when,
        });
        return {
          content: [
            {
              type: 'text',
              text: `✓ Framed moment: ${moment.emoji} ${moment.summary} (ID: ${moment.id})`
            },
            {
              type: 'text',
              text: `Full record:\n${JSON.stringify(moment, null, 2)}`
            },
            {
              type: 'text',
              text: '\n✨ Does this capture the lived experience? Consider which qualities feel most alive:\n- Embodied: What your body felt\n- Attentional: Where your focus went\n- Emotional: The feeling atmosphere\n- Spatial: Your sense of place\n- Temporal: How time flowed\n- Relational: Others\' presence\n- Purposive: What you moved toward/away from'
            }
          ]
        };
      }

      case 'weave': {
        const input = weaveSchema.parse(args);
        // Validate all moments exist
        for (const momentId of input.momentIds) {
          const moment = await getMoment(momentId);
          if (!moment) {
            throw new McpError(
              ErrorCode.InvalidParams,
              `Moment not found: ${momentId}`
            );
          }
        }
        // Create synthesis record
        const synthesis = await saveSynthesis({
          id: generateId('syn'),
          emoji: input.emoji,
          summary: input.summary,
          narrative: input.narrative,
          synthesizedMomentIds: input.momentIds,
          pattern: 'synthesis',
          created: new Date().toISOString(),
        });
        return {
          content: [
            {
              type: 'text',
              text: `✓ Wove moments into: ${synthesis.emoji} ${synthesis.summary} (ID: ${synthesis.id})`
            },
            {
              type: 'text',
              text: `Full record:\n${JSON.stringify(synthesis, null, 2)}`
            }
          ]
        };
      }

      case 'enhance': {
        const input = enhanceSchema.parse(args);
        // Try to enhance a moment first
        const moment = await getMoment(input.id);
        if (moment) {
          // TODO: Future enhancement - support adding qualities
          // Example: updates.qualities = [
          //   { type: 'embodied', manifestation: 'shoulders tight, jaw clenched' },
          //   { type: 'spatial', manifestation: 'kitchen suddenly felt too small' }
          // ]
          // The Moment type in types.ts already supports this structure
          const updated = await updateMoment(input.id, input.updates);
          if (!updated) {
            throw new McpError(ErrorCode.InternalError, 'Failed to update moment');
          }
          return {
            content: [
              {
                type: 'text',
                text: `Enhanced moment (ID: ${updated.id}) with updates: ${Object.keys(input.updates).join(', ')}`,
              },
              {
                type: 'text',
                text: `\nFull record:\n${JSON.stringify(updated, null, 2)}`
              }
            ],
            record: updated
          };
        }
        // If not a moment, try source
        const source = await getSource(input.id);
        if (source) {
          throw new McpError(ErrorCode.InvalidRequest, 'Sources are immutable and cannot be updated');
        }
        throw new McpError(
          ErrorCode.InvalidParams,
          `No source or moment found with ID: ${input.id}`
        );
      }

      case 'reflect': {
        const input = reflectSchema.parse(args);
        // Verify original source exists
        const original = await getSource(input.originalId);
        if (!original) {
          throw new McpError(
            ErrorCode.InvalidParams,
            `Source not found: ${input.originalId}`
          );
        }
        // Create new source with related link
        const source = await saveSource({
          id: generateId('src'),
          content: input.content,
          contentType: input.contentType,
          created: new Date().toISOString(),
          when: input.when,
          perspective: input.perspective || original.perspective,
          experiencer: input.experiencer || original.experiencer,
          processing: (input.processing as ProcessingLevel) || 'long-after',
          related: [input.originalId]
        });
        return {
          content: [
            {
              type: 'text',
              text: `✓ Reflected on source ${input.originalId}: "${original.content.substring(0, 30)}..."`
            },
            {
              type: 'text',
              text: `New reflection (ID: ${source.id}): "${source.content.substring(0, 50)}..."`
            },
            {
              type: 'text',
              text: '\n💡 Frame these related sources together for a richer, multi-layered moment'
            }
          ]
        };
      }

      case 'clear': {
        const env = process.env.NODE_ENV || process.env.MCP_ENV || 'development';
        if (env === 'production') {
          throw new McpError(ErrorCode.InvalidRequest, 'Clear is not available in production');
        }
        // No inputSchema validation needed for clear
        const confirmed = args && args.confirm === true;
        if (!confirmed) {
          throw new McpError(ErrorCode.InvalidParams, 'Must confirm to clear data');
        }
        // Clear the data file
        const data = { sources: [], moments: [], syntheses: [] };
        const fs = await import('fs/promises');
        const { join, dirname } = await import('path');
        const { fileURLToPath } = await import('url');
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        const ENV = process.env.NODE_ENV || process.env.MCP_ENV || 'development';
        const STORAGE_DIR = join(__dirname, '..', 'data', ENV);
        const DATA_FILE = join(STORAGE_DIR, 'data.json');
        await fs.mkdir(STORAGE_DIR, { recursive: true });
        await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
        return {
          content: [{
            type: 'text',
            text: `✓ Cleared all data in ${env} environment`
          }]
        };
      }

      case 'status': {
        const env = process.env.NODE_ENV || process.env.MCP_ENV || 'development';
        if (env === 'production') {
          throw new McpError(ErrorCode.InvalidRequest, 'Status is not available in production');
        }
        // No inputSchema validation needed for status
        const stats = await validateDataIntegrity();
        let message = `System Health Report:\n`;
        message += `Sources: ${stats.stats.sources}\nMoments: ${stats.stats.moments}\nSyntheses: ${stats.stats.syntheses}`;
        return {
          content: [
            {
              type: 'text',
              text: message,
            },
          ],
        };
      }

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      if (error.issues.some(i => i.path.includes('pattern'))) {
        throw new McpError(
          ErrorCode.InvalidParams,
          'Invalid pattern. Valid patterns: moment-of-recognition (sudden clarity), sustained-attention (dwelling in experience), crossing-threshold (transformation), peripheral-awareness (multiple streams), directed-momentum (goal focus), holding-opposites (unresolved tensions)'
        );
      }
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid parameters: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
      );
    }
    throw error;
  }
});

// Resource handlers - expose captured data
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const sources = await getSources();
  const moments = await getMoments();
  const recentMoments = await getRecentMoments();
  const syntheses = await getSyntheses();
  const unframed = await getUnframedSources();

  return {
    resources: [
      {
        uri: 'moments://recent',
        name: 'Recent Moments',
        description: `Last ${recentMoments.length} framed moments (most recent first)`,
        mimeType: 'application/json',
      },
      {
        uri: 'sources://all',
        name: 'All Sources',
        description: `All captured sources (${sources.length} total)`,
        mimeType: 'application/json',
      },
      {
        uri: 'moments://all',
        name: 'All Moments',
        description: `All framed moments (${moments.length} total)`,
        mimeType: 'application/json',
      },
      {
        uri: 'syntheses://all',
        name: 'All Syntheses',
        description: `All syntheses (${syntheses.length} total)`,
        mimeType: 'application/json',
      },
      {
        uri: 'sources://unframed',
        name: 'Unframed Sources',
        description: `Sources not yet framed into moments (${unframed.length} total)`,
        mimeType: 'application/json',
      },
      {
        uri: 'moments://patterns/guide',
        name: 'Pattern Selection Guide',
        description: 'Understand how patterns help identify moment boundaries',
        mimeType: 'application/json'
      },
      {
        uri: 'moments://qualities/guide',
        name: 'Experiential Qualities Guide',
        description: 'Understand the seven qualities that weave through every moment',
        mimeType: 'application/json',
      },
      {
        uri: 'moments://examples',
        name: 'Framed Moments Examples',
        description: 'See how raw experiences transform into rich moments through iteration',
        mimeType: 'application/json',
      },
    ],
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  try {
    switch (uri) {
      case 'moments://recent':
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(await getRecentMoments(), null, 2),
            },
          ],
        };
        
      case 'sources://all':
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(await getSources(), null, 2),
            },
          ],
        };
      
      case 'moments://all':
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(await getMoments(), null, 2),
            },
          ],
        };
      
      case 'syntheses://all':
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(await getSyntheses(), null, 2),
            },
          ],
        };
      
      case 'sources://unframed':
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(await getUnframedSources(), null, 2),
            },
          ],
        };
      
      case 'moments://patterns/guide':
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(PATTERN_GUIDE, null, 2)
          }]
        };
      
      case 'moments://qualities/guide':
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(QUALITIES_GUIDE, null, 2)
          }]
        };
      
      case 'moments://examples':
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(FRAMED_MOMENTS_EXAMPLES, null, 2)
          }]
        };
      
      // New resource URIs
      default: {
        // Pattern matching for parameterized URIs
        const dateMatch = uri.match(/^moments:\/\/date\/(\d{4}-\d{2}-\d{2}|\d{4}-\d{2})$/);
        if (dateMatch) {
          const dateStr = dateMatch[1];
          let start: Date, end: Date;
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            // YYYY-MM-DD
            start = new Date(dateStr);
            end = new Date(start);
            end.setDate(end.getDate() + 1);
          } else {
            // YYYY-MM
            start = new Date(dateStr + '-01');
            end = new Date(start);
            end.setMonth(end.getMonth() + 1);
          }
          const moments = await getMomentsByDateRange(start, end);
          return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(moments, null, 2) }] };
        }
        const yearMatch = uri.match(/^moments:\/\/year\/(\d{4})$/);
        if (yearMatch) {
          const year = parseInt(yearMatch[1], 10);
          const start = new Date(`${year}-01-01`);
          const end = new Date(`${year + 1}-01-01`);
          const moments = await getMomentsByDateRange(start, end);
          return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(moments, null, 2) }] };
        }
        const searchMatch = uri.match(/^moments:\/\/search\/(.+)$/);
        if (searchMatch) {
          const query = decodeURIComponent(searchMatch[1]);
          const moments = await searchMoments(query);
          return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(moments, null, 2) }] };
        }
        const patternMatch = uri.match(/^moments:\/\/pattern\/(.+)$/);
        if (patternMatch) {
          const pattern = decodeURIComponent(patternMatch[1]);
          const moments = await getMomentsByPattern(pattern);
          return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(moments, null, 2) }] };
        }
        const qualityMatch = uri.match(/^moments:\/\/quality\/(.+)$/);
        if (qualityMatch) {
          const quality = decodeURIComponent(qualityMatch[1]);
          const moments = (await getMoments()).filter(m => m.qualities && m.qualities.some(q => q.type === quality));
          return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(moments, null, 2) }] };
        }
        const perspectiveMatch = uri.match(/^moments:\/\/perspective\/(.+)$/);
        if (perspectiveMatch) {
          const perspective = decodeURIComponent(perspectiveMatch[1]);
          const moments = await getMoments();
          const sources = await getSources();
          const filtered = moments.filter(m => m.sources.some(s => {
            const src = sources.find(src => src.id === s.sourceId);
            return src && src.perspective === perspective;
          }));
          return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(filtered, null, 2) }] };
        }
        const experiencerMatch = uri.match(/^moments:\/\/experiencer\/(.+)$/);
        if (experiencerMatch) {
          const experiencer = decodeURIComponent(experiencerMatch[1]);
          const moments = await getMoments();
          const sources = await getSources();
          const filtered = moments.filter(m => m.sources.some(s => {
            const src = sources.find(src => src.id === s.sourceId);
            return src && src.experiencer === experiencer;
          }));
          return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(filtered, null, 2) }] };
        }
        const processingMatch = uri.match(/^moments:\/\/processing\/(.+)$/);
        if (processingMatch) {
          const processing = decodeURIComponent(processingMatch[1]);
          const moments = await getMoments();
          const sources = await getSources();
          const filtered = moments.filter(m => m.sources.some(s => {
            const src = sources.find(src => src.id === s.sourceId);
            return src && src.processing === processing;
          }));
          return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(filtered, null, 2) }] };
        }
        const typeMatch = uri.match(/^moments:\/\/type\/(.+)$/);
        if (typeMatch) {
          const contentType = decodeURIComponent(typeMatch[1]);
          const moments = await getMoments();
          const sources = await getSources();
          const filtered = moments.filter(m => m.sources.some(s => {
            const src = sources.find(src => src.id === s.sourceId);
            return src && src.contentType === contentType;
          }));
          return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(filtered, null, 2) }] };
        }
        if (uri === 'moments://syntheses') {
          const syntheses = await getSyntheses();
          return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(syntheses, null, 2) }] };
        }
        if (uri === 'moments://timeline') {
          const syntheses = await getSyntheses();
          const moments = await getMoments();
          return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify({ syntheses, moments }, null, 2) }] };
        }
        const idMatch = uri.match(/^moments:\/\/id\/([^/]+)$/);
        if (idMatch) {
          const id = decodeURIComponent(idMatch[1]);
          const moment = await getMoment(id);
          const synthesis = await getSynthesis(id);
          return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(moment || synthesis || null, null, 2) }] };
        }
        const childrenMatch = uri.match(/^moments:\/\/id\/([^/]+)\/children$/);
        if (childrenMatch) {
          const id = decodeURIComponent(childrenMatch[1]);
          const children = await getMomentsBySynthesis(id);
          return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(children, null, 2) }] };
        }
        throw new McpError(ErrorCode.InvalidParams, `Unknown resource: ${uri}`);
      }
    }
  } catch (error) {
    throw new McpError(ErrorCode.InternalError, `Failed to read resource: ${error}`);
  }
});

// Prompt handlers - provide common workflows
server.setRequestHandler(ListPromptsRequestSchema, async () => ({
  prompts: []
}));

server.setRequestHandler(GetPromptRequestSchema, async () => {
  throw new McpError(ErrorCode.MethodNotFound, 'No prompts available');
});

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`${SERVER_NAME} v${SERVER_VERSION} running on stdio`);
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
}); 