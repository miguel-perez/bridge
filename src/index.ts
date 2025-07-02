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
  updateSource,
  updateMoment,
  getSources,
  getMoments,
  getRecentMoments,
  getSyntheses,
  getUnframedSources,
  validateFilePath,
  validateDataIntegrity,
  getMomentsByDateRange,
  searchMoments,
  getMomentsByPattern,
  getMomentsBySynthesis,
  getSynthesis,
  saveSession,
} from './storage.js';
import type { SourceRecord, ProcessingLevel } from './types.js';

// System prompt for AI sampling (from design doc)
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

// Constants
const SERVER_NAME = 'framed-moments';
const SERVER_VERSION = '0.1.0';

// In-memory session tracker
let currentSession: {
  id: string;
  started: string;
  ended?: string;
  intention?: string;
  captures: string[];
  moments: string[];
} | null = null;

// In-memory state for guided_capture (single user/session for now)
let guidedCaptureState: {
  step: number;
  answers: Record<string, string>;
} | null = null;

// In-memory state for guided_frame (single user/session for now)
let guidedFrameState: {
  step: number;
  answers: Record<string, any>;
} | null = null;

// In-memory state for guided_enhance (single user/session for now)
let guidedEnhanceState: {
  step: number;
  momentId?: string;
  fields?: string[];
  currentFieldIndex?: number;
  updates: Record<string, any>;
  withAI?: boolean;
} | null = null;

function startSession(intention?: string) {
  currentSession = {
    id: generateId('ses'),
    started: new Date().toISOString(),
    intention,
    captures: [],
    moments: [],
  };
}

function endSession() {
  if (currentSession) {
    currentSession.ended = new Date().toISOString();
  }
}

function trackCapture(id: string) {
  if (currentSession) {
    currentSession.captures.push(id);
  }
}

function trackMoment(id: string) {
  if (currentSession) {
    currentSession.moments.push(id);
  }
}

// Tool input schemas
const captureSchema = z.object({
  content: z.string(),
  contentType: z.string().optional().default('text'),
  perspective: z.string().optional().default('I'),
  processing: z.string().optional().default('during'),
  when: z.string().optional(),
  experiencer: z.string().optional().default('self'),
  related: z.array(z.string()).optional(),
  file: z.string().optional(),
});

const frameSchema = z.object({
  sourceIds: z.array(z.string()),
  emoji: z.string(),
  summary: z.string(),
  narrative: z.string().optional(),
  pattern: z.string().optional(),
  withAI: z.boolean().optional().default(false),
});

const enhanceSchema = z.object({
  id: z.string(),
  updates: z.record(z.any()),
  withAI: z.boolean().optional().default(false),
});

const synthesizeSchema = z.object({
  momentIds: z.array(z.string()),
  emoji: z.string(),
  summary: z.string(),
  narrative: z.string().optional(),
  pattern: z.string().optional().default('synthesis'),
});

// Add diagnostic tool for system health
const statusSchema = z.object({
  verbose: z.boolean().optional().default(false),
});

// Zod schema for MCP sampling response
const SamplingResponseSchema = z.object({
  model: z.string(),
  stopReason: z.string().optional(),
  role: z.string(),
  content: z.object({
    type: z.string(),
    text: z.string().optional(),
  })
});

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
      sampling: {}, // Enable sampling capability for AI integration
    },
  }
);

// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
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
      description: 'Create a moment from your captures',
      inputSchema: {
        type: 'object',
        properties: {
          sourceIds: { 
            type: 'array', 
            items: { type: 'string' },
            description: 'Source IDs to frame into a moment'
          },
          emoji: { type: 'string', description: 'Emoji representation' },
          summary: { type: 'string', description: '5-7 word summary' },
          narrative: { type: 'string', description: 'Full experiential narrative' },
          pattern: { type: 'string', description: 'Frame pattern type' },
          withAI: { type: 'boolean', description: 'Use AI assistance', default: false },
        },
        required: ['sourceIds', 'emoji', 'summary'],
      },
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
          withAI: { type: 'boolean', description: 'Get AI suggestions for enhancement', default: false },
        },
        required: ['id', 'updates'],
      },
    },
    {
      name: 'synthesize',
      description: 'Create a container moment holding related moments',
      inputSchema: {
        type: 'object',
        properties: {
          momentIds: { 
            type: 'array', 
            items: { type: 'string' },
            description: 'Moments to group together'
          },
          emoji: { type: 'string', description: 'Emoji for the synthesis' },
          summary: { type: 'string', description: '5-7 words for the synthesis' },
          narrative: { type: 'string', description: 'Optional overarching narrative' },
          pattern: { type: 'string', description: 'Pattern type', default: 'synthesis' },
        },
        required: ['momentIds', 'emoji', 'summary'],
      },
    },
    {
      name: 'status',
      description: 'Check system health and data integrity',
      inputSchema: {
        type: 'object',
        properties: {
          verbose: { type: 'boolean', description: 'Include detailed information', default: false },
        },
        required: [],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'capture': {
        const input = captureSchema.parse(args);
        
        // Validate file path if provided
        if (input.file && !validateFilePath(input.file)) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'Invalid file path: path traversal not allowed'
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
        
        trackCapture(source.id);
        
        return {
          content: [
            {
              type: 'text',
              text: `✓ Captured: "${input.content.substring(0, 50)}${input.content.length > 50 ? '...' : ''}" (ID: ${source.id})\nType: ${source.contentType} | Perspective: ${source.perspective} | Processing: ${source.processing}`,
            },
          ],
        };
      }

      case 'frame': {
        const input = frameSchema.parse(args);
        
        // Verify all sources exist
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
          sources: input.sourceIds.map(sourceId => ({ sourceId })),
          created: new Date().toISOString(),
          // Use the earliest source's when date if available
          when: validSources.find(s => s.when)?.when,
        };
        
        const moment = await saveMoment(momentData);
        
        trackMoment(moment.id);
        
        // AI integration for framing
        if (input.withAI) {
          try {
            const aiResult = await server.request(
              {
                method: 'sampling/createMessage',
                params: {
                  messages: [
                    {
                      role: 'user',
                      content: {
                        type: 'text',
                        text: `Given this moment:
Summary: ${moment.summary}
${moment.narrative ? `Narrative: ${moment.narrative}
` : ''}Suggest the most prominent experiential qualities and a richer narrative, preserving the authentic voice.`
                      }
                    }
                  ],
                  systemPrompt: PHENOMENOLOGICAL_SYSTEM_PROMPT,
                  includeContext: 'thisServer',
                  temperature: 0.7,
                  maxTokens: 2000
                }
              },
              SamplingResponseSchema,
              undefined
            );
            if (aiResult.content && aiResult.content.text) {
              await updateMoment(moment.id, { ai: { suggestion: aiResult.content.text } });
            }
          } catch (aiError) {
            return {
              content: [{
                type: 'text',
                text: `Created moment "${moment.summary}" (AI analysis unavailable)`
              }],
              isError: false,
              meta: { partialSuccess: true }
            };
          }
        }
        return {
          content: [
            {
              type: 'text',
              text: `Framed moment: ${moment.emoji} ${moment.summary} (ID: ${moment.id})`,
            },
          ],
        };
      }

      case 'enhance': {
        const input = enhanceSchema.parse(args);
        
        // Try to enhance a source first
        const enhancedSource = await updateSource(input.id, input.updates);
        if (enhancedSource) {
          // AI integration for source enhancement
          if (input.withAI) {
            try {
              const aiResult = await server.request(
                {
                  method: 'sampling/createMessage',
                  params: {
                    messages: [
                      {
                        role: 'user',
                        content: {
                          type: 'text',
                          text: `Given this source:
${JSON.stringify(enhancedSource, null, 2)}
Suggest improvements for: ${Object.keys(input.updates).join(', ')}.`
                        }
                      }
                    ],
                    systemPrompt: PHENOMENOLOGICAL_SYSTEM_PROMPT,
                    includeContext: 'thisServer',
                    temperature: 0.7,
                    maxTokens: 2000
                  }
                },
                SamplingResponseSchema,
                undefined
              );
              if (aiResult.content && aiResult.content.text) {
                await updateSource(input.id, { ai: { suggestion: aiResult.content.text } });
              }
            } catch (aiError) {
              return {
                content: [{
                  type: 'text',
                  text: `Enhanced source ${input.id} (AI suggestion unavailable)`
                }],
                isError: false,
                meta: { partialSuccess: true }
              };
            }
          }
          return {
            content: [
              {
                type: 'text',
                text: `Enhanced source ${input.id} with updates: ${Object.keys(input.updates).join(', ')}`,
              },
            ],
          };
        }
        
        // If not a source, try moment
        const enhancedMoment = await updateMoment(input.id, input.updates);
        if (enhancedMoment) {
          // AI integration for moment enhancement
          if (input.withAI) {
            try {
              const aiResult = await server.request(
                {
                  method: 'sampling/createMessage',
                  params: {
                    messages: [
                      {
                        role: 'user',
                        content: {
                          type: 'text',
                          text: `Given this moment:
${JSON.stringify(enhancedMoment, null, 2)}
Suggest improvements for: ${Object.keys(input.updates).join(', ')}.`
                        }
                      }
                    ],
                    systemPrompt: PHENOMENOLOGICAL_SYSTEM_PROMPT,
                    includeContext: 'thisServer',
                    temperature: 0.7,
                    maxTokens: 2000
                  }
                },
                SamplingResponseSchema,
                undefined
              );
              if (aiResult.content && aiResult.content.text) {
                await updateMoment(input.id, { ai: { suggestion: aiResult.content.text } });
              }
            } catch (aiError) {
              return {
                content: [{
                  type: 'text',
                  text: `Enhanced moment ${input.id} (AI suggestion unavailable)`
                }],
                isError: false,
                meta: { partialSuccess: true }
              };
            }
          }
          return {
            content: [
              {
                type: 'text',
                text: `Enhanced moment ${input.id} with updates: ${Object.keys(input.updates).join(', ')}`,
              },
            ],
          };
        }
        
        throw new McpError(
          ErrorCode.InvalidParams,
          `No source or moment found with ID: ${input.id}`
        );
      }

      case 'synthesize': {
        const input = synthesizeSchema.parse(args);
        
        // Verify all moments exist
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
          pattern: input.pattern,
          created: new Date().toISOString(),
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Created synthesis: ${synthesis.emoji} ${synthesis.summary} (ID: ${synthesis.id})`,
            },
          ],
        };
      }

      case 'status': {
        const input = statusSchema.parse(args);
        const integrity = await validateDataIntegrity();
        
        let message = `System Health Report:\n`;
        message += `✅ Data integrity: ${integrity.valid ? 'GOOD' : 'ISSUES FOUND'}\n`;
        message += `📊 Stats: ${integrity.stats.sources} sources, ${integrity.stats.moments} moments, ${integrity.stats.syntheses} syntheses\n`;
        
        if (!integrity.valid) {
          message += `🚨 Issues found:\n${integrity.errors.map(e => `  - ${e}`).join('\n')}\n`;
        }
        
        if (input.verbose) {
          const unframed = await getUnframedSources();
          message += `📝 Unframed sources: ${unframed.length}\n`;
          message += `📅 Server uptime: ${process.uptime().toFixed(0)}s\n`;
        }
        
        return {
          content: [
            {
              type: 'text',
              text: message,
            },
          ],
        };
      }

      case 'guided_enhance': {
        // Multi-step, stateful guided enhance prompt
        if (!guidedEnhanceState) {
          guidedEnhanceState = { step: 0, updates: {} };
        }
        // Step 0: Ask for moment/source ID
        if (guidedEnhanceState.step === 0) {
          if (args && typeof args.answer === 'string' && args.answer.trim()) {
            guidedEnhanceState.momentId = args.answer.trim();
            guidedEnhanceState.step++;
          } else {
            return {
              description: 'Guided enhancement: select moment/source',
              messages: [
                {
                  role: 'assistant',
                  content: { type: 'text', text: 'Enter the ID of the moment or source you want to enhance.' },
                },
              ],
            };
          }
        }
        // Step 1: Ask which fields to enhance
        if (guidedEnhanceState.step === 1) {
          if (args && typeof args.answer === 'string' && args.answer.trim()) {
            guidedEnhanceState.fields = args.answer.split(',').map((f: string) => f.trim()).filter(Boolean);
            guidedEnhanceState.currentFieldIndex = 0;
            guidedEnhanceState.step++;
          } else {
            return {
              description: 'Guided enhancement: choose fields',
              messages: [
                {
                  role: 'assistant',
                  content: { type: 'text', text: 'Which fields would you like to enhance? (e.g., narrative, summary, pattern, qualities) List as comma-separated values.' },
                },
              ],
            };
          }
        }
        // Step 2: For each field, ask for new value
        if (guidedEnhanceState.step === 2 && guidedEnhanceState.fields && guidedEnhanceState.currentFieldIndex !== undefined) {
          const fields = guidedEnhanceState.fields;
          const idx = guidedEnhanceState.currentFieldIndex;
          const field = fields[idx];
          if (args && typeof args.answer === 'string') {
            if (args.answer.toLowerCase() !== 'skip') {
              guidedEnhanceState.updates[field] = args.answer;
            }
            guidedEnhanceState.currentFieldIndex!++;
          }
          // If more fields, ask next
          if (guidedEnhanceState.currentFieldIndex! < fields.length) {
            const nextField = fields[guidedEnhanceState.currentFieldIndex!];
            return {
              description: 'Guided enhancement: field update',
              messages: [
                {
                  role: 'assistant',
                  content: { type: 'text', text: `Enter new value for "${nextField}" (or type 'skip'):` },
                },
              ],
            };
          } else {
            guidedEnhanceState.step++;
          }
        }
        // Step 3: Offer AI assistance
        if (guidedEnhanceState.step === 3) {
          if (args && typeof args.answer === 'string') {
            guidedEnhanceState.withAI = /^y(es)?$/i.test(args.answer);
            guidedEnhanceState.step++;
          } else {
            return {
              description: 'Guided enhancement: AI assistance',
              messages: [
                {
                  role: 'assistant',
                  content: { type: 'text', text: 'Would you like AI suggestions for enhancement? (yes/no, default: no)' },
                },
              ],
            };
          }
        }
        // Step 4: Confirm and save
        if (guidedEnhanceState.step === 4) {
          if (args && typeof args.answer === 'string' && args.answer.toLowerCase().startsWith('y')) {
            // Call enhance tool
            const input: any = {
              id: guidedEnhanceState.momentId,
              updates: guidedEnhanceState.updates,
              withAI: guidedEnhanceState.withAI,
            };
            // Remove undefined/empty fields
            Object.keys(input.updates).forEach(k => (input.updates[k] === undefined || input.updates[k] === '') && delete input.updates[k]);
            // Use the correct method signature for server.request
            const result = await server.request(
              { method: 'callTool', params: { name: 'enhance', arguments: input } },
              z.object({ content: z.array(z.object({ type: z.string(), text: z.string() })), isError: z.boolean().optional(), meta: z.any().optional() }),
              undefined
            );
            guidedEnhanceState = null;
            return {
              description: 'Guided enhancement complete',
              messages: [
                {
                  role: 'assistant',
                  content: { type: 'text', text: result.content[0].text },
                },
              ],
            };
          } else if (args && typeof args.answer === 'string' && args.answer.toLowerCase().startsWith('n')) {
            guidedEnhanceState = null;
            return {
              description: 'Guided enhancement cancelled',
              messages: [
                {
                  role: 'assistant',
                  content: { type: 'text', text: 'Enhancement cancelled.' },
                },
              ],
            };
          } else {
            // Show summary and ask for confirmation
            const summary = Object.entries(guidedEnhanceState.updates).map(([k, v]) => `${k}: ${v}`).join('\n');
            return {
              description: 'Guided enhancement: confirm',
              messages: [
                {
                  role: 'assistant',
                  content: { type: 'text', text: `You are about to enhance ${guidedEnhanceState.momentId} with:\n${summary}\nProceed? (yes/no)` },
                },
              ],
            };
          }
        }
        // Should not reach here
        guidedEnhanceState = null;
        return {
          description: 'Guided enhancement error',
          messages: [
            {
              role: 'assistant',
              content: { type: 'text', text: 'Something went wrong in the guided enhance flow.' },
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
  prompts: [
    {
      name: 'capture-moment',
      description: 'Help capture a meaningful moment of experience',
      arguments: [
        { name: 'experience', description: 'Describe the experience you want to capture', required: true },
        { name: 'context', description: 'Additional context about when/where this happened', required: false },
      ],
    },
    {
      name: 'frame-sources',
      description: 'Help frame captured sources into a meaningful moment',
      arguments: [
        { name: 'sourceIds', description: 'Comma-separated source IDs to frame together', required: true },
      ],
    },
    {
      name: 'begin_reflection',
      description: 'Open a reflective session',
      arguments: [
        { name: 'intention', description: 'What brings you here?', required: false },
      ],
    },
    {
      name: 'close_reflection',
      description: 'Close session and review what emerged',
      arguments: [],
    },
    {
      name: 'guided_capture',
      description: 'Capture an experience with gentle guidance',
      arguments: [
        { name: 'experience_type', description: 'memory, feeling, observation', required: false },
      ],
    },
    {
      name: 'guided_frame',
      description: 'Frame moments from your captures',
      arguments: [
        { name: 'source_hint', description: 'Which capture(s) to frame', required: false },
      ],
    },
    {
      name: 'review_captures',
      description: 'Review your unframed captures',
      arguments: [],
    },
  ],
}));

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'capture-moment': {
      const experience = args?.experience || '[experience description]';
      const context = args?.context || '';
      
      return {
        description: 'Guided prompt for capturing experiential moments',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Help me capture this moment of experience:

Experience: ${experience}
${context ? `Context: ${context}` : ''}

Guide me through capturing this as a source, then suggest how to frame it into a moment. Focus on:
- The embodied, felt sense of this experience
- What was most alive or present in this moment
- The experiential qualities that stood out
- How to preserve the authentic voice and immediacy

Use the capture tool to save this, then suggest framing options.`,
            },
          },
        ],
      };
    }
    
    case 'frame-sources': {
      const sourceIds = args?.sourceIds || '';
      
      return {
        description: 'Guided prompt for framing sources into moments',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Help me frame these sources into a meaningful moment:

Source IDs: ${sourceIds}

First, let me see these sources, then help me:
- Identify the unified experiential thread connecting them
- Choose an appropriate emoji and 5-7 word summary
- Craft a first-person narrative that captures the experiential wholeness
- Suggest an appropriate frame pattern if one emerges

Use the frame tool when we've crafted something that feels right.`,
            },
          },
        ],
      };
    }
    
    case 'begin_reflection': {
      const intention = args?.intention || '';
      startSession(intention);
      return {
        description: 'Begin a new reflective session',
        messages: [
          {
            role: 'assistant',
            content: {
              type: 'text',
              text: `Welcome to your reflection session.${intention ? `\nIntention: ${intention}` : ''}\nWhat would you like to explore or process today?`,
            },
          },
        ],
      };
    }
    case 'close_reflection': {
      endSession();
      let summary = 'Session closed.';
      if (currentSession) {
        // Persist session
        await saveSession({
          id: currentSession.id,
          started: currentSession.started,
          ended: currentSession.ended,
          intention: currentSession.intention,
          captureCount: currentSession.captures.length,
          frameCount: currentSession.moments.length,
        });
        // Find unframed captures
        const unframed = currentSession.captures.filter(
          id => !currentSession!.moments.some(
            mId => mId === id
          )
        );
        summary = `Session closed.\nCaptures: ${currentSession.captures.length}\nMoments: ${currentSession.moments.length}`;
        if (unframed.length > 0) {
          summary += `\nUnframed captures: ${unframed.join(', ')}`;
          summary += `\nWould you like to review or frame these?`;
        }
        currentSession = null;
      }
      return {
        description: 'Close the session and review what emerged',
        messages: [
          {
            role: 'assistant',
            content: {
              type: 'text',
              text: summary,
            },
          },
        ],
      };
    }
    case 'guided_capture': {
      // Initialize state if not present
      if (!guidedCaptureState) {
        guidedCaptureState = { step: 0, answers: {} };
      }
      const steps = [
        { key: 'experience_type', question: 'What type of experience is this? (memory, feeling, observation, etc.)' },
        { key: 'description', question: 'Describe what happened, in your own words.' },
        { key: 'when', question: 'When did this happen? (date or time, or "now")' },
        { key: 'where', question: 'Where did it happen?' },
        { key: 'who', question: 'Who was involved? (optional)' },
        { key: 'mood', question: 'What was your mood or feeling in the moment? (optional)' },
        { key: 'body', question: 'What was happening in your body? (optional)' },
        { key: 'attention', question: 'Where was your attention focused? (optional)' },
        { key: 'file', question: 'If you want to attach a file (voice, image), provide the path or say "skip".' },
      ];
      // If user provided an answer, store it
      if (args && args.answer !== undefined && guidedCaptureState.step > 0) {
        const prevKey = steps[guidedCaptureState.step - 1].key;
        guidedCaptureState.answers[prevKey] = args.answer;
      }
      // If all steps complete, call capture tool
      if (guidedCaptureState.step >= steps.length) {
        // Build capture input
        const input: any = {
          content: guidedCaptureState.answers['description'] || '',
          contentType: 'text',
          perspective: 'I',
          processing: 'during',
          when: guidedCaptureState.answers['when'],
          experiencer: guidedCaptureState.answers['who'] || 'self',
          file: guidedCaptureState.answers['file'] && guidedCaptureState.answers['file'] !== 'skip' ? guidedCaptureState.answers['file'] : undefined,
        };
        // Call capture tool
        const source = await saveSource({
          id: generateId('src'),
          ...input,
          created: new Date().toISOString(),
        });
        trackCapture(source.id);
        const summary = `Captured: "${input.content.substring(0, 50)}${input.content.length > 50 ? '...' : ''}" (ID: ${source.id})`;
        guidedCaptureState = null;
        return {
          description: 'Guided capture complete',
          messages: [
            {
              role: 'assistant',
              content: { type: 'text', text: summary },
            },
          ],
        };
      }
      // Ask next question
      const currentStep = steps[guidedCaptureState.step];
      guidedCaptureState.step++;
      return {
        description: 'Guided capture of an experience',
        messages: [
          {
            role: 'assistant',
            content: { type: 'text', text: currentStep.question },
          },
        ],
      };
    }
    case 'guided_frame': {
      // Multi-step, stateful guided frame prompt
      if (!guidedFrameState) {
        guidedFrameState = { step: 0, answers: {} };
      }
      const steps = [
        { key: 'sourceIds', question: 'Which capture(s) would you like to frame? (comma-separated IDs)' },
        { key: 'emoji', question: 'Choose an emoji to represent this moment.' },
        { key: 'summary', question: 'Write a 5-7 word summary for this moment.' },
        { key: 'narrative', question: 'Optionally, write a full narrative (or say "skip").' },
        { key: 'pattern', question: 'Optionally, choose a frame pattern (or say "skip").' },
        { key: 'withAI', question: 'Would you like AI assistance? (yes/no, default: no)' },
      ];
      // If user provided an answer, store it
      if (args && args.answer !== undefined && guidedFrameState.step > 0) {
        const prevKey = steps[guidedFrameState.step - 1].key;
        guidedFrameState.answers[prevKey] = args.answer;
      }
      // If all steps complete, call frame tool
      if (guidedFrameState.step >= steps.length) {
        // Build frame input
        const inputValidated = frameSchema.parse(guidedFrameState.answers);
        // Verify all sources exist
        const validSources: SourceRecord[] = [];
        for (let i = 0; i < inputValidated.sourceIds.length; i++) {
          const sourceId = inputValidated.sourceIds[i];
          const source = await getSource(sourceId);
          if (!source) {
            guidedFrameState = null;
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
          emoji: inputValidated.emoji,
          summary: inputValidated.summary,
          narrative: inputValidated.narrative,
          pattern: inputValidated.pattern,
          sources: inputValidated.sourceIds.map((sourceId: string) => ({ sourceId })),
          created: new Date().toISOString(),
          when: validSources.find(s => s.when)?.when,
        };
        const moment = await saveMoment(momentData);
        trackMoment(moment.id);
        guidedFrameState = null;
        return {
          description: 'Guided frame complete',
          messages: [
            {
              role: 'assistant',
              content: { type: 'text', text: `Framed moment: ${moment.emoji} ${moment.summary} (ID: ${moment.id})` },
            },
          ],
        };
      }
      // Ask next question
      const currentStep = steps[guidedFrameState.step];
      guidedFrameState.step++;
      return {
        description: 'Guided framing of a moment',
        messages: [
          {
            role: 'assistant',
            content: { type: 'text', text: currentStep.question },
          },
        ],
      };
    }
    case 'review_captures': {
      return {
        description: 'Review your unframed captures',
        messages: [
          {
            role: 'assistant',
            content: {
              type: 'text',
              text: `Here are your unframed captures. Which would you like to frame or review?`,
            },
          },
        ],
      };
    }
    default:
      throw new McpError(ErrorCode.InvalidParams, `Unknown prompt: ${name}`);
  }
});

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`${SERVER_NAME} v${SERVER_VERSION} running on stdio`);
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
}); 