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
  purpose: "Patterns help identify where moments naturally begin and end in continuous experience",
  metaphor: "Think like a storyboard artist deciding frame boundaries",
  patterns: {
    "moment-of-recognition": {
      description: "A clear focal point of understanding or realization",
      storyboard: "Reaction panel - tight on the 'aha!' moment",
      boundaries: "Start when attention sharpens toward insight, end when recognition lands",
      example: "Realizing why you chose a certain career path",
      keywords: ["realize", "understand", "click", "aha", "insight", "discover"]
    },
    "sustained-attention": {
      description: "When duration itself is primary",
      storyboard: "Long take - camera holds steady on extended experience",
      boundaries: "Start when awareness settles, end when it shifts away",
      example: "Sitting beside someone in hospital, meditation",
      keywords: ["sitting", "waiting", "watching", "holding", "staying", "duration"]
    },
    "crossing-threshold": {
      description: "The lived experience of transition",
      storyboard: "Match cut - showing the before→after transition",
      boundaries: "Capture last moment of 'before' through first moment of 'after'",
      example: "The moment understanding clicks after confusion",
      keywords: ["suddenly", "then", "transform", "shift", "become", "transition"]
    },
    "peripheral-awareness": {
      description: "Multiple streams of attention held simultaneously",  
      storyboard: "Wide shot - everything happening at once",
      boundaries: "Start when juggling begins, end when focus narrows",
      example: "Managing all aspects of a dinner party",
      keywords: ["while", "meanwhile", "tracking", "juggling", "multiple", "simultaneous"]
    },
    "directed-momentum": {
      description: "Experience dominated by single direction",
      storyboard: "Tracking shot - following movement to completion",
      boundaries: "Start when everything aligns, end at target/interruption",
      example: "Final sprint to the finish line",
      keywords: ["toward", "racing", "focused", "goal", "must", "driven"]
    },
    "holding-opposites": {
      description: "When contradictions refuse to resolve",
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

const frameSchema = z.object({
  sourceIds: z.array(z.string()).optional(),
  momentIds: z.array(z.string()).optional(),
  emoji: z.string(),
  summary: z.string(),
  narrative: z.string().optional(),
  pattern: z.string().optional(),
}).refine(
  (data) => Boolean(data.sourceIds) !== Boolean(data.momentIds),
  { message: "Provide either sourceIds OR momentIds, not both or neither" }
);

const enhanceSchema = z.object({
  id: z.string(),
  updates: z.record(z.any()),
});

// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const tools = [
    {
      name: 'capture',
      description: 'Save an experience, thought, or feeling',
      inputSchema: {
        type: 'object',
        properties: {
          content: { type: 'string', description: 'The experience to capture' },
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
      description: 'Create a moment from sources OR a synthesis from moments. Patterns help identify natural boundaries - like a storyboard artist choosing where to cut. See moments://patterns/guide for pattern selection.',
      inputSchema: {
        type: 'object',
        properties: {
          sourceIds: { 
            type: 'array', 
            items: { type: 'string' },
            description: 'Source IDs to frame into a moment (use this OR momentIds)'
          },
          momentIds: { 
            type: 'array', 
            items: { type: 'string' },
            description: 'Moment IDs to synthesize into a container moment (use this OR sourceIds)'
          },
          emoji: { type: 'string', description: 'Emoji representation' },
          summary: { type: 'string', description: '5-7 word summary' },
          narrative: { type: 'string', description: 'Full experiential narrative (optional)' },
          pattern: { 
            type: 'string', 
            description: 'Pattern type - helps identify where this moment naturally starts/ends (see moments://patterns/guide). Defaults to "moment-of-recognition" for moments, "synthesis" for syntheses.',
            default: 'moment-of-recognition'
          }
        },
        required: ['emoji', 'summary', 'pattern']
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
    }
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
          return {
            content: [
              {
                type: 'text',
                text: `✓ Captured: "${source.content.substring(0, 50)}${source.content.length > 50 ? '...' : ''}" (ID: ${source.id})`
              },
              {
                type: 'text',
                text: `\nFull record:\n${JSON.stringify(source, null, 2)}`
              }
            ]
          };
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
        return {
          content: [
            {
              type: 'text',
              text: `✓ Captured: "${source.content.substring(0, 50)}${source.content.length > 50 ? '...' : ''}" (ID: ${source.id})`
            },
            {
              type: 'text',
              text: `\nFull record:\n${JSON.stringify(source, null, 2)}`
            }
          ]
        };
      }

      case 'frame': {
        const input = frameSchema.parse(args);
        // Default pattern based on input type
        if (!input.pattern) {
          input.pattern = input.momentIds ? 'synthesis' : 'moment-of-recognition';
        }
        if (input.sourceIds) {
          // Existing moment creation logic
          const validSources: SourceRecord[] = [];
          for (let i = 0; i < input.sourceIds.length; i++) {
            const sourceId = input.sourceIds[i];
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
          const momentId = generateId('mom');
          const momentData = {
            id: momentId,
            emoji: input.emoji,
            summary: input.summary,
            narrative: input.narrative,
            pattern: input.pattern,
            sources: input.sourceIds.map((sourceId: string) => ({ sourceId })),
            created: new Date().toISOString(),
            when: validSources.find(s => s.when)?.when,
          };
          const moment = await saveMoment(momentData);
          return {
            content: [
              {
                type: 'text',
                text: `✓ Framed moment: ${moment.emoji} ${moment.summary} (ID: ${moment.id})`
              },
              {
                type: 'text',
                text: `\nFull record:\n${JSON.stringify(moment, null, 2)}`
              }
            ]
          };
        } else if (input.momentIds) {
          // Synthesis creation logic (from synthesize handler)
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
            pattern: input.pattern || 'synthesis',
            created: new Date().toISOString(),
          });
          return {
            content: [
              {
                type: 'text',
                text: `Created synthesis: ${synthesis.emoji} ${synthesis.summary} (ID: ${synthesis.id})`,
              },
              {
                type: 'text',
                text: `\nFull record:\n${JSON.stringify(synthesis, null, 2)}`
              }
            ],
          };
        } else {
          throw new McpError(
            ErrorCode.InvalidParams,
            'You must provide either sourceIds or momentIds.'
          );
        }
        break;
      }

      case 'enhance': {
        const input = enhanceSchema.parse(args);
        // Try to enhance a moment first
        const moment = await getMoment(input.id);
        if (moment) {
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
        name: 'Qualities Guide',
        description: 'Explore the seven experiential qualities for richer moments',
        mimeType: 'application/json'
      },
      {
        uri: 'moments://examples/framed',
        name: 'Framed Moments Examples',
        description: 'Real tested moments and framework examples in action',
        mimeType: 'application/json'
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
      
      case 'moments://examples/framed':
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