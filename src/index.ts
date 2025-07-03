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
  validateDataIntegrity,
  getMomentsByDateRange,
  searchMoments,
  getMomentsByPattern,
  getMomentsBySynthesis,
  getSynthesis,
  getLatestRecord,
  storeFile,
  writeData
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

const statusSchema = z.object({
  verbose: z.boolean().optional().default(false),
});

const SamplingResponseSchema = z.object({
  model: z.string(),
  stopReason: z.string().optional(),
  role: z.string(),
  content: z.object({
    type: z.string(),
    text: z.string().optional(),
  })
});

// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const env = process.env.NODE_ENV || process.env.MCP_ENV || 'development';
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
    }
  ];
  if (env !== 'production') {
    tools.push({
      name: 'clear',
      description: 'Clear all data (only available in development/test)',
      inputSchema: {
        type: 'object',
        properties: {
          confirm: { 
            type: 'boolean', 
            description: 'Confirm you want to clear all data',
            default: false
          }
        },
        required: ['confirm']
      }
    });
    tools.push({
      name: 'status',
      description: 'Check system health and data counts (only available in development/test)',
      inputSchema: {
        type: 'object',
        properties: {
          verbose: { type: 'boolean', description: 'Include detailed information', default: false },
        },
        required: [],
      },
    });
  }
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
          if (!input.content || input.content.trim().length < 5) {
            throw new McpError(
              ErrorCode.InvalidParams,
              'For file captures, content must describe what the file contains.'
            );
          }
        }
        let storedFilePath: string | undefined = undefined;
        if (input.file) {
          const maybePath = await storeFile(input.file, generateId('srcfile'));
          if (!maybePath) {
            throw new McpError(
              ErrorCode.InvalidParams,
              `File not found or could not be stored: ${input.file}`
            );
          }
          storedFilePath = maybePath;
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
          file: storedFilePath,
        });
        return {
          content: [
            {
              type: 'text',
              text: `✓ Captured: "${input.content.substring(0, 50)}${input.content.length > 50 ? '...' : ''}" (ID: ${source.id})\nType: ${input.contentType} | Perspective: ${input.perspective} | Processing: ${input.processing}`,
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
          sources: input.sourceIds.map((sourceId: string) => ({ sourceId })),
          created: new Date().toISOString(),
          when: validSources.find(s => s.when)?.when,
        };
        const moment = await saveMoment(momentData);
        // AI integration for framing
        if (input.withAI) {
          const progressToken = generateId('progress');
          try {
            await sendProgress(progressToken, { kind: 'begin', title: 'Analyzing experience...' });
            await sendProgress(progressToken, { kind: 'report', percentage: 33, message: 'Finding moment boundaries' });
            const aiResult = await server.request(
              {
                method: 'sampling/createMessage',
                params: {
                  messages: [
                    {
                      role: 'user',
                      content: {
                        type: 'text',
                        text: `Given this moment:\nSummary: ${moment.summary}\n${moment.narrative ? `Narrative: ${moment.narrative}\n` : ''}Suggest the most prominent experiential qualities and a richer narrative, preserving the authentic voice.`
                      }
                    }
                  ],
                  systemPrompt: PHENOMENOLOGICAL_SYSTEM_PROMPT,
                  includeContext: 'thisServer',
                  temperature: 0.7,
                  maxTokens: 2000,
                  progressToken,
                }
              },
              SamplingResponseSchema,
              undefined
            );
            await sendProgress(progressToken, { kind: 'report', percentage: 66, message: 'Identifying qualities' });
            if (aiResult.content && aiResult.content.text) {
              // Store suggestion in latest version
              const latest = await getLatestRecord(moment.id);
              if (latest && latest.type === 'moment') {
                await updateMoment(latest.id, { ai: { suggestion: aiResult.content.text } });
              }
            }
            await sendProgress(progressToken, { kind: 'end' });
          } catch (aiError) {
            await sendProgress(progressToken, { kind: 'end' });
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
        // Always enhance the latest version
        const latestSource = await getLatestRecord(input.id);
        const latestMoment = await getLatestRecord(input.id);
        // Try to enhance a source first
        const enhancedSource = latestSource && latestSource.type === 'source'
          ? await updateSource(latestSource.id, input.updates)
          : null;
        if (enhancedSource) {
          if (input.withAI) {
            const progressToken = generateId('progress');
            try {
              await sendProgress(progressToken, { kind: 'begin', title: 'Enhancing source...' });
              await sendProgress(progressToken, { kind: 'report', percentage: 50, message: 'Generating suggestions' });
              const aiResult = await server.request(
                {
                  method: 'sampling/createMessage',
                  params: {
                    messages: [
                      {
                        role: 'user',
                        content: {
                          type: 'text',
                          text: `Given this source:\n${JSON.stringify(enhancedSource, null, 2)}\nSuggest improvements for: ${Object.keys(input.updates).join(', ')}.`
                        }
                      }
                    ],
                    systemPrompt: PHENOMENOLOGICAL_SYSTEM_PROMPT,
                    includeContext: 'thisServer',
                    temperature: 0.7,
                    maxTokens: 2000,
                    progressToken,
                  }
                },
                SamplingResponseSchema,
                undefined
              );
              if (aiResult.content && aiResult.content.text) {
                const latest = await getLatestRecord(enhancedSource.id);
                if (latest && latest.type === 'source') {
                  await updateSource(latest.id, { ai: { suggestion: aiResult.content.text } });
                }
              }
              await sendProgress(progressToken, { kind: 'end' });
            } catch (aiError) {
              await sendProgress(progressToken, { kind: 'end' });
              return {
                content: [{
                  type: 'text',
                  text: `Enhanced source ${enhancedSource.id} (AI suggestion unavailable)`
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
                text: `Enhanced source (new ID: ${enhancedSource.id}, version: ${enhancedSource.version}) with updates: ${Object.keys(input.updates).join(', ')}`,
              },
            ],
            record: enhancedSource
          };
        }
        // If not a source, try moment
        const enhancedMoment = latestMoment && latestMoment.type === 'moment'
          ? await updateMoment(latestMoment.id, input.updates)
          : null;
        if (enhancedMoment) {
          if (input.withAI) {
            const progressToken = generateId('progress');
            try {
              await sendProgress(progressToken, { kind: 'begin', title: 'Enhancing moment...' });
              await sendProgress(progressToken, { kind: 'report', percentage: 50, message: 'Generating suggestions' });
              const aiResult = await server.request(
                {
                  method: 'sampling/createMessage',
                  params: {
                    messages: [
                      {
                        role: 'user',
                        content: {
                          type: 'text',
                          text: `Given this moment:\n${JSON.stringify(enhancedMoment, null, 2)}\nSuggest improvements for: ${Object.keys(input.updates).join(', ')}.`
                        }
                      }
                    ],
                    systemPrompt: PHENOMENOLOGICAL_SYSTEM_PROMPT,
                    includeContext: 'thisServer',
                    temperature: 0.7,
                    maxTokens: 2000,
                    progressToken,
                  }
                },
                SamplingResponseSchema,
                undefined
              );
              if (aiResult.content && aiResult.content.text) {
                const latest = await getLatestRecord(enhancedMoment.id);
                if (latest && latest.type === 'moment') {
                  await updateMoment(latest.id, { ai: { suggestion: aiResult.content.text } });
                }
              }
              await sendProgress(progressToken, { kind: 'end' });
            } catch (aiError) {
              await sendProgress(progressToken, { kind: 'end' });
              return {
                content: [{
                  type: 'text',
                  text: `Enhanced moment ${enhancedMoment.id} (AI suggestion unavailable)`
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
                text: `Enhanced moment (new ID: ${enhancedMoment.id}, version: ${enhancedMoment.version}) with updates: ${Object.keys(input.updates).join(', ')}`,
              },
            ],
            record: enhancedMoment
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

      case 'clear': {
        const env = process.env.NODE_ENV || process.env.MCP_ENV || 'development';
        if (env === 'production') {
          throw new McpError(ErrorCode.InvalidRequest, 'Clear is not available in production');
        }
        const input = z.object({ confirm: z.boolean() }).parse(args);
        if (!input.confirm) {
          throw new McpError(ErrorCode.InvalidParams, 'Must confirm to clear data');
        }
        await writeData({ sources: [], moments: [], syntheses: [] });
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

// Utility: send progress notification (MCP-compliant)
async function sendProgress(progressToken: string, progress: object): Promise<void> {
  await server.notification({ method: 'server/progress', params: { progressToken, progress } });
} 