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
} from './storage.js';
import type { SourceRecord, ProcessingLevel } from './types.js';

// Constants
const SERVER_NAME = 'framed-moments';
const SERVER_VERSION = '0.1.0';

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
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'capture': {
        const input = captureSchema.parse(args);
        
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
              text: `Captured: "${input.content.substring(0, 50)}${input.content.length > 50 ? '...' : ''}" (ID: ${source.id})`,
            },
          ],
        };
      }

      case 'frame': {
        const input = frameSchema.parse(args);
        
        // Verify all sources exist
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
          // Use the earliest source's when date if available
          when: validSources.find(s => s.when)?.when,
        });
        
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

// Resource handlers (placeholder)
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [],
}));

server.setRequestHandler(ReadResourceRequestSchema, async () => {
  throw new McpError(ErrorCode.MethodNotFound, 'No resources available yet');
});

// Prompt handlers (placeholder)
server.setRequestHandler(ListPromptsRequestSchema, async () => ({
  prompts: [],
}));

server.setRequestHandler(GetPromptRequestSchema, async () => {
  throw new McpError(ErrorCode.MethodNotFound, 'No prompts available yet');
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