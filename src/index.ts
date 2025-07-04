#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import {
  generateId,
  saveSource,
  saveMoment,
  saveScene,
  getSource,
  getMoment,
  updateMoment,
  getMoments,
  getScenes,
  getScene,
  validateFilePath,
  deleteSource,
  deleteMoment,
  updateScene,
  deleteScene,
  setStorageConfig,
  updateSource,
  getSources,
} from './storage.js';
import type { SourceRecord, ProcessingLevel } from './types.js';
import { search as semanticSearch } from './search.js';
import { setEmbeddingsConfig } from './embeddings.js';
import path from 'path';
import type { SearchResult } from './search.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// Constants
const SERVER_NAME = 'captain';
const SERVER_VERSION = '0.1.0';

// Define data file path using environment variable with fallback in project root
const defaultDataPath = path.resolve(process.cwd(), 'bridge.json');
const DATA_FILE_PATH = process.env.BRIDGE_FILE_PATH
  ? path.isAbsolute(process.env.BRIDGE_FILE_PATH)
    ? process.env.BRIDGE_FILE_PATH
    : path.resolve(process.cwd(), process.env.BRIDGE_FILE_PATH)
  : defaultDataPath;

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
  perspective: z.enum(['I', 'we', 'you', 'they']),
  processing: z.enum(['during', 'right-after', 'long-after', 'crafted']),
  when: z.string().optional(),
  experiencer: z.string(),
  reflects_on: z.array(z.string()).optional(),
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

const enrichSchema = z.object({
  id: z.string(),
  updates: z.record(z.unknown()),
});

const releaseSchema = z.object({
  id: z.string(),
});

// Helper: Contextual coaching prompts for captures and tool-to-tool flow
function getContextualPrompts(toolName: string): string {
  let prompts = '\n✓ Next steps:\n';
  switch(toolName) {
    case 'capture':
      prompts += '• Frame - transform this into a complete moment with a shot and qualities\n';
      break;
    case 'frame':
      prompts += '• Enrich - add narrative depth or missing experiential qualities\n';
      prompts += '• Weave - connect with moments that reflect on each other (see larger narrative threads)\n';
      break;
    case 'weave':
      prompts += '• Use hierarchy/group view in search to visualize your new scene in context\n';
      prompts += '• Capture more - explore themes this scene revealed\n';
      break;
    case 'search':
      prompts += '• Search - use natural language to find relevant sources, moments, scenes or relationships\n';
      prompts += '• Filter - refine search results with optional filters\n';
      prompts += '• Sort - order results by relevance or creation date\n';
      prompts += '• Group - organize results by type or experiencer\n';
      prompts += '• Limit - control the number of results returned\n';
      prompts += '• Context - include full record context in search results\n';
      break;
    default:
      prompts += '• Capture - record another experience\n';
      prompts += '• Use hierarchy/group view in search to explore your moments and scenes\n';
  }
  return prompts;
}

// Helper strings for tool descriptions
const critiqueChecklist = `Validation criteria:\n- Voice recognition ("that's how I talk")\n- Experiential completeness\n- Visual anchorability\n- Temporal flow implied\n- Emotional atmosphere preserved\n- Self-containment\n- Narrative coherence\n- Causal logic\n- Temporal knowledge accuracy\n- No invented details\n- Voice fidelity\n- Minimal transformation\n- Physical/sensory grounding\n(2-3 iterations are normal)`;

// Set storage and embeddings config to use DATA_FILE_PATH
setStorageConfig({ dataFile: DATA_FILE_PATH });
setEmbeddingsConfig({ dataFile: DATA_FILE_PATH });

// Simple formatter for search results
function formatSearchResult(result: SearchResult, index: number): string {
  const label = result.type.toUpperCase();
  const summary = result.snippet || result.id;
  return `${index + 1}. [${label}] ${summary}`;
}

// Define SearchToolInput for the new search tool
interface SearchToolInput {
  query?: string;
  created?: string | { start: string; end: string };
  when?: string | { start: string; end: string };
  relatedTo?: string;
  type?: Array<'source' | 'moment' | 'scene'>;
  experiencer?: string;
  qualities?: string[];
  perspective?: string;
  processing?: string;
  shot?: string;
  framed?: boolean;
  groupBy?: 'type' | 'experiencer' | 'day' | 'week' | 'month' | 'hierarchy';
  sort?: 'relevance' | 'created' | 'when';
  limit?: number;
  includeContext?: boolean;
}

// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const tools = [
    {
      name: "capture",
      description: "Capture a lived experience as a source - the raw material of memory.",
      inputSchema: {
        type: "object",
        properties: {
          content: { type: "string", description: "The lived moment—try present tense, include what you are sensing, feeling, noticing." },
          experiencer: { type: "string", description: "Who experienced this (e.g., 'Claude', 'Sarah', 'Team')" },
          perspective: { type: "string", enum: ["I", "we", "you", "they"], description: "Perspective used" },
          processing: { type: "string", enum: ["during", "right-after", "long-after", "crafted"], description: "When captured relative to experience" },
          contentType: { type: "string", description: "Type of content", default: "text" },
          when: { type: "string", description: "When it happened (ISO timestamp or descriptive like 'yesterday morning')" },
          reflects_on: { type: "array", items: { type: "string" }, description: "Array of source IDs this record reflects on (use for reflections)" }
        },
        required: ["content", "experiencer", "perspective", "processing"]
      }
    },
    {
      name: "frame",
      description: "Transform raw sources into complete experiential moments by identifying their qualities and attention patterns.",
      inputSchema: {
        type: "object",
        properties: {
          sourceIds: { type: "array", items: { type: "string" }, description: "Array of source IDs to frame together", minItems: 1 },
          emoji: { type: "string", description: "Single emoji that captures the essence" },
          summary: { type: "string", description: "5-7 word summary" },
          shot: { type: "string", enum: ["moment-of-recognition", "sustained-attention", "crossing-threshold", "peripheral-awareness", "directed-momentum", "holding-opposites"], description: "How attention moved in this experience" },
          qualities: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              properties: {
                type: { type: "string", enum: ["embodied", "attentional", "emotional", "purposive", "spatial", "temporal", "relational"], description: "Which quality is present" },
                manifestation: { type: "string", description: "How this quality shows up in the experience" }
              },
              required: ["type", "manifestation"]
            },
            description: "Array of experiential qualities present, with at least one"
          },
          narrative: { type: "string", description: "Full experiential narrative" }
        },
        required: ["sourceIds", "emoji", "summary", "shot", "qualities"]
      }
    },
    {
      name: "weave",
      description: "Connect multiple moments to reveal narrative journeys and transformations.",
      inputSchema: {
        type: "object",
        properties: {
          momentIds: { type: "array", items: { type: "string" }, description: "Array of moment IDs to weave together", minItems: 1 },
          emoji: { type: "string", description: "Emoji representing the journey" },
          summary: { type: "string", description: "5-7 word summary of the arc" },
          narrative: { type: "string", description: "The story that connects these moments" },
          shot: { type: "string", enum: ["moment-of-recognition", "sustained-attention", "crossing-threshold", "peripheral-awareness", "directed-momentum", "holding-opposites"], description: "Overall attention pattern of the woven scene" }
        },
        required: ["momentIds", "emoji", "summary", "narrative", "shot"]
      }
    },
    {
      name: "enrich",
      description: "Correct or update an existing source or moment (content, metadata, etc.). Use for factual corrections, typos, or missing details. This directly edits the original record. If a source is referenced by moments, those moments will reflect the updated content.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Source or moment ID to enrich" },
          updates: { type: "object", description: "Object with fields to update", additionalProperties: true }
        },
        required: ["id", "updates"]
      }
    },
    {
      name: "release",
      description: "Release (delete) a source or moment - some experiences are meant to be acknowledged then let go.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "ID of source or moment to release" }
        },
        required: ["id"]
      }
    },
    {
      name: "search",
      description: "Unified faceted search across all records. Supports semantic, temporal, relationship, and metadata filters. Use 'created' for capture time and 'when' for event time.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Semantic search query (natural language or keywords)" },
          created: {
            oneOf: [
              { type: "string", description: "ISO date, date string, or natural language (e.g., '2023-03-15', 'last week')" },
              { type: "object", properties: { start: { type: "string" }, end: { type: "string" } }, required: ["start", "end"] }
            ],
            description: "Filter by record creation time (when captured)"
          },
          when: {
            oneOf: [
              { type: "string", description: "ISO date, date string, or natural language (e.g., '2023-03-15', 'last week')" },
              { type: "object", properties: { start: { type: "string" }, end: { type: "string" } }, required: ["start", "end"] }
            ],
            description: "Filter by event time (user-supplied 'when')"
          },
          relatedTo: { type: "string", description: "Record ID to find all related records (traverses reflects_on, sources, moments, scenes)" },
          type: { type: "array", items: { type: "string", enum: ["source", "moment", "scene"] }, description: "Restrict to certain record types" },
          experiencer: { type: "string", description: "Only records with this experiencer" },
          qualities: { type: "array", items: { type: "string" }, description: "Only moments with all these qualities" },
          perspective: { type: "string", description: "Only records with this perspective" },
          processing: { type: "string", description: "Only records with this processing level" },
          shot: { type: "string", description: "Only moments/scenes with this shot type" },
          framed: { type: "boolean", description: "Only sources that are (or are not) framed" },
          groupBy: { type: "string", enum: ["type", "experiencer", "day", "week", "month", "hierarchy"], description: "Group results by this field" },
          sort: { type: "string", enum: ["relevance", "created", "when"], description: "Sort by field" },
          limit: { type: "number", description: "Maximum results to return" },
          includeContext: { type: "boolean", description: "Return full record metadata" }
        }
      }
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
        const framingGuide = `Break up sources into smaller units when possible by imagining you're a storyboard artist facing an 
impossible but necessary task: finding natural joints in what is inherently seamless.

Example Shot Types:

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
        try {
          input = captureSchema.parse(args);
        } catch (err) {
          if (err instanceof z.ZodError) {
            // User-friendly error for missing/invalid fields
            const details = err.errors.map(e =>
              e.path.length ? `Missing or invalid field: ${e.path.join('.')}` : e.message
            ).join('; ');
            throw new McpError(ErrorCode.InvalidParams, details);
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
            reflects_on: input.reflects_on,
            file: input.file,
          });
          // Check if this is the first source ever captured
          const sourcesAfter = await getSources();
          const isFirstSource = sourcesAfter.length === 1;
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
            text: getContextualPrompts('capture')
          });
          // Only show framingGuide if content is long or this is the first source
          if (source.content.length > 256 || isFirstSource) {
            content.push({
              type: 'text',
              text: framingGuide
            });
          }
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
          reflects_on: input.reflects_on,
        });
        // Check if this is the first source ever captured
        const sourcesAfter = await getSources();
        const isFirstSource = sourcesAfter.length === 1;
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
          text: getContextualPrompts('capture')
        });
        // Only show framingGuide if content is long or this is the first source
        if (source.content.length > 256 || isFirstSource) {
          content.push({
            type: 'text',
            text: framingGuide
          });
        }
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
              `Source with ID '${sourceId}' not found. Capture an experience first, then frame it into a moment.`
            );
          }
          validSources.push(source);
        }
        // Create moment record
        const experiencer = validSources[0]?.experiencer || '';
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
          experiencer,
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
            },
            {
              type: 'text',
              text: critiqueChecklist
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
        // Create scene record
        const validMoments = await Promise.all(input.momentIds.map(getMoment));
        const sceneExperiencer = validMoments[0]?.experiencer || '';
        const scene = await saveScene({
          id: generateId('sce'),
          emoji: input.emoji,
          summary: input.summary,
          narrative: input.narrative,
          momentIds: input.momentIds,
          shot: input.shot,
          created: new Date().toISOString(),
          experiencer: sceneExperiencer,
        });
        return {
          content: [
            {
              type: 'text',
              text: `✓ Wove moments into: ${scene.emoji} ${scene.summary} (ID: ${scene.id})`
            },
            {
              type: 'text',
              text: `Full record:\n${JSON.stringify(scene, null, 2)}`
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
          // Check if this source is referenced by any moments
          const moments = await getMoments();
          const referencingMoments = moments.filter(m => m.sources.some(s => s.sourceId === source.id));
          // Update the source in place
          const updatedSource = await updateSource(input.id, input.updates);
          if (!updatedSource) {
            throw new McpError(ErrorCode.InternalError, 'Failed to update source');
          }
          const content = [
            {
              type: 'text',
              text: `Enriched source (ID: ${updatedSource.id}) with updates: ${Object.keys(input.updates).join(', ')}`,
            },
            {
              type: 'text',
              text: `\nFull record:\n${JSON.stringify(updatedSource, null, 2)}`
            }
          ];
          if (referencingMoments.length > 0) {
            content.push({
              type: 'text',
              text: `Warning: This change will update all moments that include this source (${referencingMoments.length} moment(s)).`
            });
          }
          return {
            content,
            record: updatedSource
          };
        }
        throw new McpError(
          ErrorCode.InvalidParams,
          `No source or moment found with ID: ${input.id}`
        );
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
              // Also check if this moment was in any scenes
              const scenes = await getScenes();
              for (const scene of scenes) {
                if (scene.momentIds.includes(moment.id)) {
                  const remainingMoments = scene.momentIds.filter(id => id !== moment.id);
                  if (remainingMoments.length === 0) {
                    await deleteScene(scene.id);
                    cleanupMessage += `\n  • Released orphaned scene: ${scene.emoji} "${scene.summary}"`;
                  } else {
                    // Update scene to remove the deleted moment
                    await updateScene(scene.id, {
                      momentIds: remainingMoments
                    });
                    cleanupMessage += `\n  • Updated scene: ${scene.emoji} "${scene.summary}"`;
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
          // Clean up any orphaned scenes
          const scenes = await getScenes();
          const affectedScenes = scenes.filter(s => 
            s.momentIds.includes(input.id)
          );
          let cleanupMessage = '';
          for (const scene of affectedScenes) {
            const remainingMoments = scene.momentIds.filter(id => id !== input.id);
            if (remainingMoments.length === 0) {
              // No moments left, release the scene
              await deleteScene(scene.id);
              cleanupMessage += `\n  • Released orphaned scene: ${scene.emoji} "${scene.summary}"`;
            } else {
              // Update scene to remove the released moment
              await updateScene(scene.id, {
                momentIds: remainingMoments
              });
              cleanupMessage += `\n  • Updated scene: ${scene.emoji} "${scene.summary}" (${remainingMoments.length} moment(s) remain)`;
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
        // Check if it's a scene
        const scene = await getScene(input.id);
        if (scene) {
          await deleteScene(input.id);
          return {
            content: [
              {
                type: 'text',
                text: `✓ Released scene: ${scene.emoji} "${scene.summary}" (ID: ${input.id})`
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
          `No source, moment, or scene found with ID: ${input.id}`
        );
      }

      case 'search': {
        // Parse input
        const input = args as SearchToolInput;
        // Build filters for created and when (explicit, no fallback)
        const filters: Record<string, unknown> = {};
        if (Array.isArray(input.type) && input.type.length > 0) filters.type = input.type;
        if (typeof input.experiencer === 'string' && input.experiencer.length > 0) filters.experiencer = input.experiencer;
        if (input.qualities) filters.qualities = input.qualities;
        if (typeof input.perspective === 'string' && input.perspective.length > 0) filters.perspectives = [input.perspective];
        if (typeof input.processing === 'string' && input.processing.length > 0) filters.processing = [input.processing];
        if (typeof input.shot === 'string' && input.shot.length > 0) filters.shotTypes = [input.shot];
        if (typeof input.framed === 'boolean') filters.framed = input.framed;

        // Explicitly filter by 'created' (system timestamp, UTC)
        if (input.created) {
          if (typeof input.created === 'string') {
            filters.createdRange = { start: input.created, end: input.created };
          } else if (typeof input.created === 'object' && input.created.start && input.created.end) {
            filters.createdRange = { start: input.created.start, end: input.created.end };
          }
        }
        // Explicitly filter by 'when' (user-supplied, UTC)
        if (input.when) {
          if (typeof input.when === 'string') {
            filters.whenRange = { start: input.when, end: input.when };
          } else if (typeof input.when === 'object' && input.when.start && input.when.end) {
            filters.whenRange = { start: input.when.start, end: input.when.end };
          }
        }
        // Relationship search (optional pre-filter)
        let preFilteredRecords: SearchResult[] | undefined = undefined;
        if (input.relatedTo) {
          const allRecords = await import('./storage.js').then(m => m.getAllRecords());
          preFilteredRecords = (await import('./search.js')).findReflectsOnRecords(input.relatedTo, await allRecords) as SearchResult[];
        }
        // When calling semanticSearch, construct a SearchOptions object with all required properties and use object spread for optional fields
        const searchOptions: import('./search.js').SearchOptions = {
          query: input.query ?? '',
          filters,
          limit: input.limit,
          includeContext: input.includeContext,
        };
        if (typeof input.sort === 'string') searchOptions.sort = input.sort;
        if (typeof input.groupBy === 'string') searchOptions.groupBy = input.groupBy;
        const results = await semanticSearch(searchOptions);
        // If preFilteredRecords is set, filter results to only those in preFilteredRecords
        let finalResults = results;
        if (preFilteredRecords) {
          const allowedIds = new Set(preFilteredRecords.map((r) => r.id));
          finalResults = (Array.isArray(results) ? results : results.groups.flatMap((g) => g.items)).filter((r) => allowedIds.has(r.id));
        }
        if (Array.isArray(finalResults)) {
          if (finalResults.length === 0) {
            return { content: [{ type: 'text', text: 'No relevant memories found.' }] };
          }
          if (input.includeContext) {
            return {
              content: finalResults.map((result: SearchResult) => ({
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }))
            };
          } else {
            return {
              content: finalResults.map((result: SearchResult, index: number) => ({
                type: 'text',
                text: formatSearchResult(result, index)
              }))
            };
          }
        } else {
          return { content: [{ type: 'text', text: 'Grouped results are not yet supported in this view.' }] };
        }
      }

      default: {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Unknown tool: ${name}`
        );
      }
    }
  } catch (err) {
    // Improved error reporting for user clarity
    if (err instanceof McpError) {
      return { error: err.message };
    }
    if (err instanceof z.ZodError) {
      const details = err.errors.map(e =>
        e.path.length ? `Missing or invalid field: ${e.path.join('.')}` : e.message
      ).join('; ');
      return { error: details };
    }
    if (err instanceof Error) {
      return { error: err.message };
    }
    return { error: 'Unknown error' };
  }
});

(async () => {
  const transport = new StdioServerTransport();
  await server.connect(transport);
})();