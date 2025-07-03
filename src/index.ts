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
  validateFilePath,
  deleteSource,
  deleteMoment,
  updateSynthesis,
  deleteSynthesis,
} from './storage.js';
import type { SourceRecord, ProcessingLevel } from './types.js';
import { DESIGNER_MOMENT, WRESTLING_MOMENT, DOLPHIN_MOMENT, BLEH_MOMENT, KETAMINE_MOMENT, SHOT_VARIATIONS, QUALITIES_EXAMPLES, TRANSFORMATION_PRINCIPLES, COMMON_PITFALLS } from './tested-moments-data.js';

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
  patternVariations: SHOT_VARIATIONS,
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

// Updated frameSchema: only accepts sourceIds and now requires qualities
const frameSchema = z.object({
  sourceIds: z.array(z.string()).min(1),
  emoji: z.string(),
  summary: z.string(),
  qualities: z.array(z.object({
    type: z.enum([
      'embodied',
      'attentional',
      'emotional',
      'purposive',
      'spatial',
      'temporal',
      'relational',
    ]),
    manifestation: z.string().min(1)
  })).min(1, 'Must identify at least one experiential quality before creating narrative'),
  narrative: z.string().optional(),
  shot: z.enum([
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
  shot: z.enum([
    'moment-of-recognition',
    'sustained-attention',
    'crossing-threshold',
    'peripheral-awareness',
    'directed-momentum',
    'holding-opposites'
  ])
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

const enrichSchema = z.object({
  id: z.string(),
  updates: z.record(z.any()),
});

const releaseSchema = z.object({
  id: z.string(),
});

const critiqueSchema = z.object({
  momentId: z.string(),
});

const treeSchema = z.object({
  rootId: z.string().optional(),
});

interface TreeNode {
  type: 'source' | 'moment' | 'synthesis';
  id: string;
  emoji?: string;
  summary?: string;
  content?: string;
  when: string;
  children?: TreeNode[];
}

async function buildMomentTree(rootId?: string): Promise<TreeNode | TreeNode[]> {
  const sources = await getSources();
  const moments = await getMoments();
  const syntheses = await getSyntheses();

  const sourceMap = new Map(sources.map(s => [s.id, s]));
  const momentMap = new Map(moments.map(m => [m.id, m]));
  const synthesisMap = new Map(syntheses.map(s => [s.id, s]));

  function buildSourceNode(sourceId: string): TreeNode | null {
    const source = sourceMap.get(sourceId);
    if (!source) return null;
    return {
      type: 'source',
      id: source.id,
      content: source.content.substring(0, 50) + '...',
      when: source.when || source.created
    };
  }

  function buildMomentNode(momentId: string): TreeNode | null {
    const moment = momentMap.get(momentId);
    if (!moment) return null;
    const children = moment.sources
      .map(s => buildSourceNode(s.sourceId))
      .filter(Boolean) as TreeNode[];
    return {
      type: 'moment',
      id: moment.id,
      emoji: moment.emoji,
      summary: moment.summary,
      when: moment.when || moment.created,
      children
    };
  }

  function buildSynthesisNode(synthesisId: string): TreeNode | null {
    const synthesis = synthesisMap.get(synthesisId);
    if (!synthesis) return null;
    const children = synthesis.synthesizedMomentIds
      .map(id => buildMomentNode(id))
      .filter(Boolean) as TreeNode[];
    return {
      type: 'synthesis',
      id: synthesis.id,
      emoji: synthesis.emoji,
      summary: synthesis.summary,
      when: synthesis.created,
      children
    };
  }

  // If specific root requested
  if (rootId) {
    return buildSynthesisNode(rootId) || 
           buildMomentNode(rootId) || 
           buildSourceNode(rootId) || 
           { type: 'source', id: rootId, content: 'Not found', when: '' };
  }

  // Otherwise return forest of all top-level items
  const momentIdsInSyntheses = new Set(
    syntheses.flatMap(s => s.synthesizedMomentIds)
  );
  const topLevelSyntheses = syntheses.map(s => buildSynthesisNode(s.id)).filter(Boolean);
  const orphanMoments = moments
    .filter(m => !momentIdsInSyntheses.has(m.id))
    .map(m => buildMomentNode(m.id))
    .filter(Boolean);
  return [...topLevelSyntheses, ...orphanMoments] as TreeNode[];
}

// Helper: Contextual coaching prompts for captures and tool-to-tool flow
function getContextualPrompts(toolName: string, unframedCount?: number): string {
  let prompts = '\n✓ Next steps:\n';
  switch(toolName) {
    case 'capture':
      prompts += '• Reflect - add memories, insights, or deeper noticings about this experience\n';
      if (unframedCount && unframedCount >= 5) {
        prompts += `• Storyboard - review your ${unframedCount} unframed sources to identify moment boundaries\n`;
      } else {
        prompts += '• Frame - transform this into a complete moment with patterns and qualities\n';
      }
      break;
    case 'storyboard':
      prompts += '• Frame - create individual moments using the boundaries you\'ve identified\n';
      prompts += '• Capture more - if you need additional raw material\n';
      break;
    case 'frame':
      prompts += '• Critique - validate this moment against proven quality criteria\n';
      prompts += '• Enrich - add narrative depth or missing experiential qualities\n';
      prompts += '• Weave - connect with related moments to see larger patterns\n';
      break;
    case 'critique':
      prompts += '• Enrich - add missing elements the validation revealed\n';
      prompts += '• Reframe - if the moment boundaries feel wrong\n';
      prompts += '• Tree - see how this moment fits your larger experiential patterns\n';
      break;
    case 'weave':
      prompts += '• Tree - visualize your new synthesis in the larger hierarchy\n';
      prompts += '• Capture more - explore themes this synthesis revealed\n';
      break;
    case 'tree':
      prompts += '• Capture - record more experiences in the patterns you notice\n';
      prompts += '• Weave - connect moments that share themes but aren\'t yet linked\n';
      break;
    case 'reflect':
      prompts += '• Frame - combine this reflection with the original source\n';
      prompts += '• Reflect again - if more layers have emerged\n';
      break;
    default:
      prompts += '• Capture - record another experience\n';
      prompts += '• Storyboard - review unframed sources\n';
      prompts += '• Tree - see your moment hierarchy\n';
  }
  return prompts;
}

// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const tools = [
    {
      name: 'capture',
      description: 'Capture a lived moment - preserving raw experience before it fades. The more sensory detail and present-tense immediacy, the richer your future framing. Start here with messy, authentic experience.',
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
      description: 'Transform raw sources into a complete experiential moment. Like choosing what belongs in a storyboard shot, identify natural boundaries using shot types. Requires identifying experiential qualities first.',
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
          qualities: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: [
                    'embodied',
                    'attentional',
                    'emotional',
                    'purposive',
                    'spatial',
                    'temporal',
                    'relational',
                  ],
                  description: 'Which quality is present'
                },
                manifestation: {
                  type: 'string',
                  description: 'How this quality shows up in the experience'
                }
              },
              required: ['type', 'manifestation']
            },
            description: 'Identify which qualities are most alive in this experience (at least one required)'
          },
          narrative: { type: 'string', description: 'Full experiential narrative (optional)' },
          shot: { 
            type: 'string', 
            description: 'Shot type - helps identify where your moment naturally begins and ends. Like a storyboard artist choosing frame boundaries. See moments://patterns/guide for detailed explanations.',
            default: 'moment-of-recognition'
          }
        },
        required: ['sourceIds', 'emoji', 'summary', 'qualities', 'shot']
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
          narrative: { type: 'string', description: 'Optional overarching narrative' },
          shot: {
            type: 'string',
            description: 'Shot type for the synthesized moment',
            enum: [
              'moment-of-recognition',
              'sustained-attention',
              'crossing-threshold',
              'peripheral-awareness',
              'directed-momentum',
              'holding-opposites'
            ]
          }
        },
        required: ['momentIds', 'emoji', 'summary', 'narrative', 'shot']
      }
    },
    {
      name: 'enrich',
      description: 'Refine or add details to existing captures or moments',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Source or moment ID to enrich' },
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
      description: 'Add layers to an existing capture - how you see it now, what you remember differently, what meanings emerge. Creates linked sources that can be framed together for richer moments.',
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
    {
      name: 'release',
      description: 'Release (delete) a source or moment by ID. Some experiences are meant to be acknowledged then let go.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'ID of source or moment to release' }
        },
        required: ['id']
      }
    },
    {
      name: 'critique',
      description: 'Validate your framed moments against 13 proven criteria. Like a trusted reader checking if your experience rings true. Expect 2-3 iterations - refinement is normal, not failure.',
      inputSchema: {
        type: 'object',
        properties: {
          momentId: { type: 'string', description: 'ID of moment to critique' }
        },
        required: ['momentId'],
      },
    },
    {
      name: 'storyboard',
      description: 'View all unframed sources to find natural moment boundaries. Like a film editor with rushes, identify where attention shifts, emotions change, or actions complete. Essential for continuous captures.',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'tree',
      description: 'See how your moments nest and connect hierarchically. Reveals experiential architecture - recurring themes, micro-to-macro patterns, meaning clusters. Essential for understanding your larger story.',
      inputSchema: {
        type: 'object',
        properties: {
          rootId: { type: 'string', description: 'Optional: Start from specific moment/synthesis' }
        },
        required: [],
      },
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
          const unframed = await getUnframedSources();
          content.push({
            type: 'text',
            text: getContextualPrompts('capture', unframed.length)
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
        const unframed = await getUnframedSources();
        content.push({
          type: 'text',
          text: getContextualPrompts('capture', unframed.length)
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
              `Source not found: ${sourceId}. Capture an experience first, then frame it into a moment.`
            );
          }
          validSources.push(source);
        }
        // Create moment record
        const moment = await saveMoment({
          id: generateId('mom'),
          emoji: input.emoji,
          summary: input.summary,
          qualities: input.qualities,
          narrative: input.narrative,
          shot: input.shot,
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
              text: `Qualities noticed: ${input.qualities.map(q => q.type).join(', ')}`
            },
            {
              type: 'text',
              text: `Full record:\n${JSON.stringify(moment, null, 2)}`
            },
            {
              type: 'text',
              text: getContextualPrompts('frame')
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
              `Moment not found: ${momentId}. Frame your sources into moments first, then weave moments together.`
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
          shot: input.shot,
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
            },
            {
              type: 'text',
              text: getContextualPrompts('weave')
            }
          ]
        };
      }

      case 'enrich': {
        const input = enrichSchema.parse(args);
        // Try to enhance a moment first
        const moment = await getMoment(input.id);
        if (moment) {
          // Support adding qualities
          if (input.updates.qualities) {
            // Validate qualities structure
            const qualitiesSchema = z.array(z.object({
              type: z.enum([
                'embodied',
                'attentional',
                'emotional',
                'purposive',
                'spatial',
                'temporal',
                'relational',
              ]),
              manifestation: z.string()
            }));
            try {
              input.updates.qualities = qualitiesSchema.parse(input.updates.qualities);
            } catch (e) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid qualities structure');
            }
          }
          const updated = await updateMoment(input.id, input.updates);
          if (!updated) {
            throw new McpError(ErrorCode.InternalError, 'Failed to update moment');
          }
          return {
            content: [
              {
                type: 'text',
                text: `Enriched moment (ID: ${updated.id}) with updates: ${Object.keys(input.updates).join(', ')}`,
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
          throw new McpError(
            ErrorCode.InvalidRequest, 
            'Sources are immutable raw captures. To add depth, use "reflect" to create a linked source, then frame multiple related sources together into a richer moment.'
          );
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
              text: getContextualPrompts('reflect')
            }
          ]
        };
      }

      case 'release': {
        const input = releaseSchema.parse(args);
        // Check if it's a source
        const source = await getSource(input.id);
        if (source) {
          // Delete the source
          await deleteSource(input.id);
          // Clean up any orphaned moments
          const moments = await getMoments();
          const affectedMoments = moments.filter(m => 
            m.sources.some(s => s.sourceId === input.id)
          );
          let cleanupMessage = '';
          for (const moment of affectedMoments) {
            // Remove the released source from the moment
            const remainingSources = moment.sources.filter(s => s.sourceId !== input.id);
            if (remainingSources.length === 0) {
              // No sources left, release the moment
              await deleteMoment(moment.id);
              cleanupMessage += `\n  • Released orphaned moment: ${moment.emoji} "${moment.summary}"`;
              // Also check if this moment was in any syntheses
              const syntheses = await getSyntheses();
              for (const synthesis of syntheses) {
                if (synthesis.synthesizedMomentIds.includes(moment.id)) {
                  const remainingMoments = synthesis.synthesizedMomentIds.filter(id => id !== moment.id);
                  if (remainingMoments.length === 0) {
                    await deleteSynthesis(synthesis.id);
                    cleanupMessage += `\n  • Released orphaned synthesis: ${synthesis.emoji} "${synthesis.summary}"`;
                  } else {
                    // Update synthesis to remove the deleted moment
                    await updateSynthesis(synthesis.id, {
                      synthesizedMomentIds: remainingMoments
                    });
                    cleanupMessage += `\n  • Updated synthesis: ${synthesis.emoji} "${synthesis.summary}"`;
                  }
                }
              }
            } else {
              // Update moment to remove the released source
              await updateMoment(moment.id, {
                sources: remainingSources
              });
              cleanupMessage += `\n  • Updated moment: ${moment.emoji} "${moment.summary}" (${remainingSources.length} source(s) remain)`;
            }
          }
          return {
            content: [
              {
                type: 'text',
                text: `✓ Released source: "${source.content.substring(0, 50)}..." (ID: ${input.id})`
              },
              {
                type: 'text',
                text: cleanupMessage || '\n🌊 The experience has been released'
              }
            ]
          };
        }
        // Check if it's a moment
        const moment = await getMoment(input.id);
        if (moment) {
          await deleteMoment(input.id);
          // Clean up any orphaned syntheses
          const syntheses = await getSyntheses();
          const affectedSyntheses = syntheses.filter(s => 
            s.synthesizedMomentIds.includes(input.id)
          );
          let cleanupMessage = '';
          for (const synthesis of affectedSyntheses) {
            const remainingMoments = synthesis.synthesizedMomentIds.filter(id => id !== input.id);
            if (remainingMoments.length === 0) {
              // No moments left, release the synthesis
              await deleteSynthesis(synthesis.id);
              cleanupMessage += `\n  • Released orphaned synthesis: ${synthesis.emoji} "${synthesis.summary}"`;
            } else {
              // Update synthesis to remove the released moment
              await updateSynthesis(synthesis.id, {
                synthesizedMomentIds: remainingMoments
              });
              cleanupMessage += `\n  • Updated synthesis: ${synthesis.emoji} "${synthesis.summary}" (${remainingMoments.length} moment(s) remain)`;
            }
          }
          return {
            content: [
              {
                type: 'text',
                text: `✓ Released moment: ${moment.emoji} "${moment.summary}" (ID: ${input.id})`
              },
              {
                type: 'text',
                text: cleanupMessage || '\n🌊 The moment has been released'
              }
            ]
          };
        }
        // Check if it's a synthesis
        const synthesis = await getSynthesis(input.id);
        if (synthesis) {
          await deleteSynthesis(input.id);
          return {
            content: [
              {
                type: 'text',
                text: `✓ Released synthesis: ${synthesis.emoji} "${synthesis.summary}" (ID: ${input.id})`
              },
              {
                type: 'text',
                text: '\n🌊 The woven experience has been released'
              }
            ]
          };
        }
        throw new McpError(
          ErrorCode.InvalidParams,
          `No source, moment, or synthesis found with ID: ${input.id}`
        );
      }

      case 'critique': {
        const input = critiqueSchema.parse(args);
        const moment = await getMoment(input.momentId);
        if (!moment) {
          throw new McpError(
            ErrorCode.InvalidParams,
            `Moment not found: ${input.momentId}`
          );
        }
        const checklistText = `VALIDATION CHECKLIST:

□ Voice recognition ("that's how I talk")
  Does this sound like the actual person speaking? Are speech patterns preserved?

□ Experiential completeness  
  Is this a whole experience, not assembled from parts? Can you feel the unified moment?

□ Visual anchorability
  Can you imagine this as a specific moment in time? Concrete enough to visualize?

□ Temporal flow implied
  Does the moment naturally suggest what came before and after?

□ Emotional atmosphere preserved
  Is the feeling-tone present? Not just named emotions, but the lived quality?

□ Self-containment
  Could someone understand this without additional context?

□ Narrative coherence
  Does it flow naturally from beginning to end? No jarring jumps?

□ Causal logic
  Do actions and reactions make sense? Cause connects to effect?

□ Temporal knowledge accuracy
  Only what was known/felt THEN, not insights that came later?

□ No invented details
  Everything described actually in the source? No embellishments?

□ Voice pattern fidelity
  Exact phrasings and speech quirks preserved from original?

□ Minimal transformation
  Reordered for flow but not rewritten? Original words kept?

□ Physical/sensory grounding
  Enough embodied details to anchor in lived experience?`;
        return {
          content: [
            {
              type: 'text',
              text: `MOMENT TO CRITIQUE:\n\n${moment.emoji} ${moment.summary} (ID: ${moment.id})`
            },
            {
              type: 'text',
              text: `Shot: ${moment.shot || 'none'}\nQualities: ${moment.qualities?.map(q => q.type).join(', ') || 'none'}\n`
            },
            {
              type: 'text',
              text: checklistText
            },
            {
              type: 'text',
              text: getContextualPrompts('critique')
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

      case 'storyboard': {
        // No input validation needed
        const unframedSources = await getUnframedSources();
        if (unframedSources.length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'No unframed sources found. All sources have been framed into moments!'
            }]
          };
        }
        const framingGuide = `THE TENSION:
Experience flows continuously - "it cannot be broken into separate moments" (Bergson). 
Yet for understanding, we need discrete units. You're a storyboard artist facing an 
impossible but necessary task: finding natural joints in what is inherently seamless.

BOUNDARY TYPES:

1. ATTENTION BOUNDARIES
   Where awareness fundamentally redirects. The entire field of consciousness 
   reorganizes around a different center.

2. TEMPORAL BOUNDARIES  
   Natural segments in lived duration. Where experience has its own beginning, 
   middle, end. Where "now" becomes "then."

3. SPATIAL BOUNDARIES
   When the sense of place transforms. Not just moving, but when lived space 
   - its feeling, meaning, possibilities - becomes different.

4. EMOTIONAL BOUNDARIES
   Where affective atmosphere shifts. When the whole coloring of experience 
   changes, like weather fronts moving through.

5. ACTIONAL BOUNDARIES
   Natural completions and initiations. Where purposive momentum finds its 
   target or redirects. Reaching vs having reached.

6. RELATIONAL BOUNDARIES
   When the intersubjective field reconfigures. Others entering, leaving, 
   or the felt sense of connection fundamentally shifting.

Go as granular as possible. A conversation might contain dozens of attention 
shifts, several emotional boundaries, multiple actional completions.`;
        const content = [
          {
            type: 'text',
            text: `UNFRAMED SOURCES (${unframedSources.length} total):\n`
          }
        ];
        unframedSources.forEach((source, index) => {
          content.push({
            type: 'text',
            text: `\n--- Source ${index + 1} ---\nID: ${source.id}\nCaptured: ${source.created}\n\n"${source.content}"\n`
          });
        });
        content.push(
          { type: 'text', text: `\n\nFRAMING GUIDE:\n\n${framingGuide}` },
          { type: 'text', text: getContextualPrompts('storyboard') }
        );
        return { content };
      }

      case 'tree': {
        const input = treeSchema.parse(args);
        const treeData = await buildMomentTree(input.rootId);
        return {
          content: [
            {
              type: 'text',
              text: 'MOMENT HIERARCHY DATA:\n'
            },
            {
              type: 'text',
              text: JSON.stringify(treeData, null, 2)
            },
            {
              type: 'text',
              text: '\n\nAsk Claude to render this as a visual tree showing how sources build to moments, moments weave into syntheses.'
            },
            {
              type: 'text',
              text: getContextualPrompts('tree')
            }
          ]
        };
      }

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
    }
  } catch (error) {
    // General error enhancer
    if (error instanceof McpError) {
      throw error; // Already formatted
    }
    if (error instanceof z.ZodError) {
      // Check for specific validation errors
      const issues = error.issues;
      if (issues.some(i => i.path.includes('qualities') && i.code === 'too_small')) {
        throw new McpError(
          ErrorCode.InvalidParams,
          'Please identify at least one experiential quality. What did your body feel? Where was your attention? What emotions were present?'
        );
      }
      if (issues.some(i => i.path.includes('shot'))) {
        throw new McpError(
          ErrorCode.InvalidParams,
          'Invalid shot. Valid shots: moment-of-recognition (sudden clarity), sustained-attention (dwelling in experience), crossing-threshold (transformation), peripheral-awareness (multiple streams), directed-momentum (goal focus), holding-opposites (unresolved tensions)'
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
          const shot = decodeURIComponent(patternMatch[1]);
          const moments = await getMomentsByPattern(shot);
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