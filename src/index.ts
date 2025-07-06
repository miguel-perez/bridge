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
  deleteSource,
  deleteMoment,
  updateScene,
  deleteScene,
  setStorageConfig,
  updateSource,
  getSources,
} from './storage.js';
import type { SourceRecord, ProcessingLevel, StorageRecord, MomentRecord, SceneRecord } from './types.js';

import path from 'path';
import type { SearchResult } from './search.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { statusMonitor } from './status.js';
import { AutoProcessor } from './auto-processing.js';

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
  autoframe: z.boolean().optional().default(false), // Changed from true to false - opt-in by default
});

// Helper function for flexible date validation using chrono-node
async function validateFlexibleDate(dateString: string | undefined): Promise<boolean> {
  if (!dateString) return true; // Optional field
  try {
    const chrono = await import('chrono-node');
    const results = chrono.parse(dateString);
    return results.length > 0;
  } catch (error) {
    return false;
  }
}

// Smart frameSchema: accepts sourceIds for AI generation OR full parameters for manual control
const frameSchema = z.object({
  sourceIds: z.array(z.string()).min(1),
  // Smart default mode: only sourceIds provided
  // Manual override mode: provide additional parameters
  emoji: z.string().optional(),
  summary: z.string().optional(),
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
  })).optional(),
  narrative: z.string().optional(),
  shot: z.enum([
    'moment-of-recognition',
    'sustained-attention',
    'crossing-threshold',
    'peripheral-awareness',
    'directed-momentum',
    'holding-opposites'
  ]).optional(),
  when: z.string().optional(),
});

// Smart weaveSchema: accepts momentIds for AI generation OR full parameters for manual control
const weaveSchema = z.object({
  momentIds: z.array(z.string()).min(1),
  // Smart default mode: only momentIds provided
  // Manual override mode: provide additional parameters
  emoji: z.string().optional(),
  summary: z.string().optional(),
  narrative: z.string().optional(),
  shot: z.enum([
    'moment-of-recognition',
    'sustained-attention',
    'crossing-threshold',
    'peripheral-awareness',
    'directed-momentum',
    'holding-opposites'
  ]).optional(),
  when: z.string().optional(),
});

const enrichSchema = z.object({
  id: z.string(),
  updates: z.record(z.unknown()),
});

// Custom Zod refinement for conditional default
const releaseSchema = z.object({
  id: z.string().optional(),
  cleanupReframed: z.boolean().optional(),
}).superRefine((val) => {
  if (val.id === undefined && val.cleanupReframed === undefined) {
    val.cleanupReframed = true;
  } else if (val.id !== undefined && val.cleanupReframed === undefined) {
    val.cleanupReframed = false;
  }
});

// Helper: Contextual coaching prompts for captures and tool-to-tool flow
function getContextualPrompts(toolName: string): string {
  let prompts = '\n✓ Next steps:\n';
  switch(toolName) {
    case 'capture':
      prompts += '• Frame - transform this into a complete moment (manual control recommended)\n';
      prompts += '• Search - explore your captured experiences\n';
      prompts += '• Set autoframe: true in capture to enable AI framing\n';
      break;
    case 'frame':
      prompts += '• Smart default: just provide sourceIds for AI-generated framing\n';
      prompts += '• Manual control: include emoji, summary, qualities, narrative, shot\n';
      prompts += '• Enrich - add narrative depth or missing experiential qualities\n';
      prompts += '• Weave - connect with moments that reflect on each other (see larger narrative threads)\n';
      break;
    case 'weave':
      prompts += '• Smart default: just provide momentIds for AI-generated weaving\n';
      prompts += '• Manual control: include emoji, summary, narrative, shot\n';
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

// Utility: smart word-boundary truncation with ellipsis
function smartTruncate(text: string, maxLength: number = 120): string {
  if (text.length <= maxLength) return text;
  // Find last space before maxLength
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > 0) {
    return truncated.slice(0, lastSpace) + '...';
  }
  return truncated + '...';
}

// Simple formatter for search results - consistent base format
function formatSearchResult(result: SearchResult, index: number): string {
  const label = String(result.type ?? '');
  let summary: string;
  if (typeof result.snippet === 'string') {
    summary = smartTruncate(result.snippet);
  } else if (typeof result.id === 'string') {
    summary = result.id;
  } else {
    summary = '[no summary]';
  }
  // Always include the ID in the output
  return `${index + 1}. [${label.toUpperCase()}] (ID: ${result.id}) ${summary}`;
}

// Enhanced formatter for detailed results
function formatDetailedSearchResult(result: SearchResult, index: number): string {
  const baseFormat = formatSearchResult(result, index);
  
  // Add additional context based on record type
  let details = '';
  
  if (result.type === 'moment' && result.moment) {
    const moment = result.moment;
    if (moment.emoji && moment.summary) {
      details += `\n   ${moment.emoji} ${moment.summary}`;
    }
    if (moment.qualities && moment.qualities.length > 0) {
      details += `\n   Qualities: ${moment.qualities.map(q => q.type).join(', ')}`;
    }
    if (moment.shot) {
      details += `\n   Shot: ${moment.shot}`;
    }
  } else if (result.type === 'scene' && result.scene) {
    const scene = result.scene;
    if (scene.emoji && scene.summary) {
      details += `\n   ${scene.emoji} ${scene.summary}`;
    }
    if (scene.shot) {
      details += `\n   Shot: ${scene.shot}`;
    }
    if (scene.momentIds && scene.momentIds.length > 0) {
      details += `\n   Moments: ${scene.momentIds.length}`;
    }
  } else if (result.type === 'source' && result.source) {
    const source = result.source;
    if (source.perspective) {
      details += `\n   Perspective: ${source.perspective}`;
    }
    if (source.processing) {
      details += `\n   Processing: ${source.processing}`;
    }
  }
  
  return baseFormat + details;
}

// Structured formatter for JSON output
function formatStructuredSearchResult(result: SearchResult): any {
  const base: any = {
    type: result.type,
    id: result.id,
    snippet: result.snippet,
    relevance: result.relevance
  };
  
  // Add full record data when available
  if (result.source) base.source = result.source;
  if (result.moment) base.moment = result.moment;
  if (result.scene) base.scene = result.scene;
  
  return base;
}

// Define SearchToolInput for the new search tool
interface SearchToolInput {
  query?: string;
  created?: string | { start: string; end: string };
  when?: string | { start: string; end: string };
  reflectedOn?: string;
  type?: Array<'source' | 'moment' | 'scene'>;
  experiencer?: string;
  qualities?: string[];
  qualitiesMode?: 'all' | 'any';
  perspective?: string;
  processing?: string;
  shot?: string;
  framed?: boolean;
  groupBy?: 'type' | 'experiencer' | 'day' | 'week' | 'month' | 'hierarchy';
  sort?: 'relevance' | 'created' | 'when';
  limit?: number;
  includeContext?: boolean;
  debug?: boolean;
}

// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const tools = [
    {
      name: "capture",
      description: "Capture raw experiential text as a source record. This is for unprocessed, in-the-moment entries—such as journal notes, chat messages, or direct transcripts—before any framing or analysis. Auto-framing is disabled by default to preserve user control.",
      inputSchema: {
        type: "object",
        properties: {
          content: { type: "string", description: "Raw text from experiencer, either new expereience or reflection or previous capture" },
          experiencer: { type: "string", description: "Who experienced this (e.g., 'Claude', 'Sarah', 'Team')" },
          perspective: { type: "string", enum: ["I", "we", "you", "they"], description: "Perspective used" },
          processing: { type: "string", enum: ["during", "right-after", "long-after", "crafted"], description: "When captured relative to experience" },
          contentType: { type: "string", description: "Type of content", default: "text" },
          when: { type: "string", description: "When it happened (ISO timestamp or descriptive like 'yesterday morning')" },
          reflects_on: { type: "array", items: { type: "string" }, description: "Array of source IDs this record reflects on (use for reflections)" },
          file: { type: "string", description: "Optional file path for file-based captures" },
          autoframe: { type: "boolean", description: "Whether to automatically frame this capture into moments (default: false - set to true to enable AI framing)" }
        },
        required: ["content", "experiencer", "perspective", "processing"]
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
      name: "frame",
      description: "Transform sources into moments. Provide only sourceIds for AI-generated framing, or include additional parameters for manual control.",
      inputSchema: {
        type: "object",
        properties: {
          sourceIds: { type: "array", items: { type: "string" }, minItems: 1, description: "Array of source IDs to frame together" },
          emoji: { type: "string", description: "Single emoji that captures the essence (optional - AI generates if not provided)" },
          summary: { type: "string", description: "5-7 word summary (optional - AI generates if not provided)" },
          shot: { type: "string", enum: ["moment-of-recognition", "sustained-attention", "crossing-threshold", "peripheral-awareness", "directed-momentum", "holding-opposites"], description: "How attention moved in this experience (optional - AI generates if not provided)" },
          qualities: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string", enum: ["embodied", "attentional", "emotional", "purposive", "spatial", "temporal", "relational"], description: "Which quality is present" },
                manifestation: { type: "string", description: "How this quality shows up in the experience" }
              },
              required: ["type", "manifestation"]
            },
            description: "Array of experiential qualities present (optional - AI generates if not provided)"
          },
          narrative: { type: "string", description: "Full experiential narrative (optional - AI generates if not provided)" },
          when: { type: "string", description: "When the frame was created (optional - AI generates if not provided)" }
        },
        required: ["sourceIds"]
      },
      annotations: {
        title: "Frame Moment",
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false
      }
    },
    {
      name: "weave",
      description: "Connect moments into scenes. Provide only momentIds for AI-generated weaving, or include additional parameters for manual control.",
      inputSchema: {
        type: "object",
        properties: {
          momentIds: { type: "array", items: { type: "string" }, minItems: 1, description: "Array of moment IDs to weave together" },
          emoji: { type: "string", description: "Emoji representing the journey (optional - AI generates if not provided)" },
          summary: { type: "string", description: "5-7 word summary of the arc (optional - AI generates if not provided)" },
          narrative: { type: "string", description: "The story that connects these moments (optional - AI generates if not provided)" },
          shot: { type: "string", enum: ["moment-of-recognition", "sustained-attention", "crossing-threshold", "peripheral-awareness", "directed-momentum", "holding-opposites"], description: "Overall attention pattern of the woven scene (optional - AI generates if not provided)" },
          when: { type: "string", description: "When the scene happened (optional - AI generates if not provided)" }
        },
        required: ["momentIds"]
      },
      annotations: {
        title: "Weave Scene",
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false
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
      },
      annotations: {
        title: "Enrich Record",
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false
      }
    },
    {
      name: "release",
      description: "Release (delete) a source, moment, or scene. If no id is provided, performs a bulk cleanup of all reframed (superseded) records. In bulk mode, cleanupReframed defaults to true.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "ID of source, moment, or scene to release (optional for bulk cleanup)" },
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
      description: "Unified faceted search across all records. Supports semantic, temporal, relationship, and metadata filters. Use 'created' for capture time and 'when' for event time. Results use consistent format: base format shows type, ID, and snippet; includeContext adds full record data as JSON; groupBy organizes results by category.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Semantic search query (natural language or keywords)" },
          created: { oneOf: [ { type: "string" }, { type: "object", properties: { start: { type: "string" }, end: { type: "string" } }, required: ["start", "end"] } ], description: "Filter by record creation time (when captured)" },
          when: { oneOf: [ { type: "string" }, { type: "object", properties: { start: { type: "string" }, end: { type: "string" } }, required: ["start", "end"] } ], description: "Filter by event time (user-supplied)" },
          reflectedOn: { type: "string", description: "Record ID to find all related records (traverses reflects_on, sources, moments, scenes)" },
          type: { type: "array", items: { type: "string", enum: ["source", "moment", "scene"] }, description: "Restrict to certain record types" },
          experiencer: { type: "string", description: "Only records with this experiencer" },
          qualities: { type: "array", items: { type: "string" }, description: "Only moments with these qualities" },
          qualitiesMode: { type: "string", enum: ["all", "any"], description: "For qualities filter: 'all' = AND logic (all qualities must be present), 'any' = OR logic (any quality must be present)", default: "all" },
          perspective: { type: "string", description: "Only records with this perspective" },
          processing: { type: "string", description: "Only records with this processing level" },
          shot: { type: "string", description: "Only moments/scenes with this shot type" },
          framed: { type: "boolean", description: "Only sources that are (or are not) framed" },
          groupBy: { type: "string", enum: ["type", "experiencer", "day", "week", "month", "hierarchy"], description: "Group results by this field" },
          sort: { type: "string", enum: ["relevance", "created", "when"], description: "Sort by field" },
          limit: { type: "number", description: "Maximum results to return" },
          includeContext: { type: "boolean", description: "Return full record metadata as structured JSON" },
          debug: { type: "boolean", description: "Include debug information about filter results" }
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
      name: "status",
      description: "Get a high-level status report of the system, including counts of unframed sources, unweaved moments, and processing errors.",
      inputSchema: {
        type: "object",
        properties: {}
      },
      annotations: {
        title: "System Status",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
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
          // Validate when field with flexible date parsing
          if (input.when && !(await validateFlexibleDate(input.when))) {
            throw new McpError(
              ErrorCode.InvalidParams,
              `Invalid date format for 'when': ${input.when}. Use natural language like 'yesterday', 'last week', '2024-01-15', or ISO 8601 format.`
            );
          }
        } catch (err) {
          if (err instanceof z.ZodError) {
            // User-friendly error for missing/invalid fields
            const details = err.errors.map(e =>
              e.path.length ? `Missing or invalid field: ${e.path.join('.')}` : e.message
            ).join('; ');
            throw new McpError(ErrorCode.InvalidParams, details);
          }
          if (err instanceof Error) {
            throw err;
          }
          throw new Error(String(err));
        }
        // For file captures, require content to describe the file
        if (input.file) {
          // File parameter is not yet implemented - provide clear error message
          throw new McpError(
            ErrorCode.InvalidParams,
            `The 'file' parameter is not yet implemented. Your content was captured without the file reference.

To link files, mention the path in your content text instead:
bridge:capture {
  content: "Reading through Bridge's documentation at C:\\Users\\Miguel\\Git\\bridge\\README.md...",
  experiencer: "Claude",
  perspective: "I"
}`
          );
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
            },
            {
              type: 'text',
              text: `⏳ Running AI framing on this capture...`
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
          if (source.content.length > 1024 || isFirstSource) {
            content.push({
              type: 'text',
              text: framingGuide
            });
          }
          // Conditionally run AI framing after capture
          if (input.autoframe) {
            content.push({
              type: 'text',
              text: `⏳ Running AI framing on this capture...`
            });
            try {
              const autoProcessor = new AutoProcessor();
              const autoframeResult = await autoProcessor.autoFrameSources({ sourceIds: [source.id] });
              const successes = autoframeResult.filter(r => r.success && r.created);
              if (successes.length > 0) {
                let summary = `✅ AI framing complete: created ${successes.length} moment(s) from this capture.\n`;
                successes.forEach((r, idx) => {
                  if (r.created) {
                    summary += `  - Moment ${idx + 1}: ${r.created.emoji} "${r.created.summary}" (ID: ${r.created.id})\n`;
                  } else {
                    summary += `  - Moment ${idx + 1}: [no data]\n`;
                  }
                });
                content.push({ type: 'text', text: summary });
                content.push({ type: 'text', text: `\nFull records:\n${JSON.stringify(successes.map(r => r.created), null, 2)}` });
              } else if (autoframeResult.length > 0 && autoframeResult[0].error) {
                content.push({ type: 'text', text: `⚠️ AI framing failed: ${String(autoframeResult[0].error)}` });
              } else {
                content.push({ type: 'text', text: `⚠️ AI framing did not create any moments.` });
              }
            } catch (err: unknown) {
              let errorMessage: string;
              if (err instanceof Error) {
                errorMessage = (err as Error).message;
              } else {
                errorMessage = String(err);
              }
              content.push({ type: 'text', text: `⚠️ AI framing error: ${errorMessage}` });
            }
          } else {
            content.push({
              type: 'text',
              text: `⏸️ AI framing skipped. Use the frame tool to manually frame this source when ready.`
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
        if (source.content.length > 1024 || isFirstSource) {
          content.push({
            type: 'text',
            text: framingGuide
          });
        }
        // Conditionally run autoframe after capture
        if (input.autoframe) {
          content.push({
            type: 'text',
            text: `⏳ Running AI framing on this capture...`
          });
          try {
            const autoProcessor = new AutoProcessor();
            const autoframeResult = await autoProcessor.autoFrameSources({ sourceIds: [source.id] });
            const successes = autoframeResult.filter(r => r.success && r.created);
            if (successes.length > 0) {
              let summary = `✅ AI framing complete: created ${successes.length} moment(s) from this capture.\n`;
              successes.forEach((r, idx) => {
                if (r.created) {
                  summary += `  - Moment ${idx + 1}: ${r.created.emoji} "${r.created.summary}" (ID: ${r.created.id})\n`;
                } else {
                  summary += `  - Moment ${idx + 1}: [no data]\n`;
                }
              });
              content.push({ type: 'text', text: summary });
              content.push({ type: 'text', text: `\nFull records:\n${JSON.stringify(successes.map(r => r.created), null, 2)}` });
            } else if (autoframeResult.length > 0 && autoframeResult[0].error) {
              content.push({ type: 'text', text: `⚠️ AI framing failed: ${String(autoframeResult[0].error)}` });
            } else {
              content.push({ type: 'text', text: `⚠️ AI framing did not create any moments.` });
            }
          } catch (err: unknown) {
            let errorMessage: string;
            if (err instanceof Error) {
              errorMessage = (err as Error).message;
            } else {
              errorMessage = String(err);
            }
            content.push({ type: 'text', text: `⚠️ AI framing error: ${errorMessage}` });
          }
        } else {
          content.push({
            type: 'text',
            text: `📝 Source captured successfully. Use the frame tool to manually frame this experience when ready, or set autoframe: true to enable AI framing.`
          });
        }
        return { content };
      }

      case 'frame': {
        const input = frameSchema.parse(args);
        // Validate when field with flexible date parsing
        if (input.when && !(await validateFlexibleDate(input.when))) {
          throw new McpError(
            ErrorCode.InvalidParams,
            `Invalid date format for 'when': ${input.when}. Use natural language like 'yesterday', 'last week', '2024-01-15', or ISO 8601 format.`
          );
        }
        
        // UPFRONT VALIDATION: Check that all source IDs exist before proceeding
        const validSources: SourceRecord[] = [];
        const missingSources: string[] = [];
        const alreadyFramedSources: string[] = [];
        
        for (const sourceId of input.sourceIds) {
          const source = await getSource(sourceId);
          if (!source) {
            missingSources.push(sourceId);
          } else {
            // Check if source is already framed by looking for moments that reference it
            const moments = await getMoments();
            const isFramed = moments.some(m => m.sources.some(s => s.sourceId === sourceId));
            if (isFramed) {
              alreadyFramedSources.push(sourceId);
            } else {
              validSources.push(source);
            }
          }
        }
        
        // Report specific validation errors
        if (missingSources.length > 0) {
          throw new McpError(
            ErrorCode.InvalidParams,
            `Source ID(s) not found: ${missingSources.join(', ')}. Please check the IDs and try again.`
          );
        }
        
        if (alreadyFramedSources.length > 0) {
          throw new McpError(
            ErrorCode.InvalidParams,
            `Source(s) already framed: ${alreadyFramedSources.join(', ')}. These sources have already been processed into moments.`
          );
        }
        
        if (validSources.length === 0) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'No valid unframed sources found. All provided sources have already been framed or do not exist.'
          );
        }
        
        // Determine mode based on provided parameters
        const isSmartDefault = !input.emoji && !input.summary && !input.qualities && !input.narrative && !input.shot && !input.when;
        
        if (isSmartDefault) {
          // Smart default: use AutoProcessor (now we know all sources are valid and unframed)
          const autoProcessor = new AutoProcessor();
          const result = await autoProcessor.autoFrameSources({ sourceIds: input.sourceIds });
          const successes = result.filter(r => r.success && r.created);
          
          if (successes.length > 0) {
            let summary = `✓ Smart-framed ${input.sourceIds.length} source(s) into ${successes.length} moment(s):\n`;
            successes.forEach((r, idx) => {
              if (r.created) {
                summary += `  - Moment ${idx + 1}: ${r.created.emoji} "${r.created.summary}" (ID: ${r.created.id})\n`;
              } else {
                summary += `  - Moment ${idx + 1}: [no data]\n`;
              }
            });
            
            // Add reframed moments info if any
            const reframedArr = successes.flatMap(r => (r.created && Array.isArray((r.created as any)["_reframed"])) ? (r.created as any)["_reframed"] : []);
            if (reframedArr.length > 0) {
              summary += `\n🌀 Reframed (superseded) earlier moments:\n`;
              reframedArr.forEach((m) => {
                summary += `  - ${m.summary} (ID: ${m.id})\n`;
              });
            }
            
            return {
              content: [
                { type: 'text', text: summary },
                { type: 'text', text: `\nFull records:\n${JSON.stringify(successes.map(r => r.created), null, 2)}` },
                { type: 'text', text: getContextualPrompts('frame') }
              ]
            };
          } else {
            const firstError = result.find(r => r.error) || { error: 'Unknown error' };
            return { content: [{ type: 'text', text: `Smart-framing failed: ${String(firstError.error)}` }] };
          }
        } else {
          // Manual override: sources are already validated above, use the validSources array
          
          // Validate that all required manual parameters are provided (when is optional)
          if (!input.emoji || !input.summary || !input.qualities || !input.shot) {
            const missingFields = [];
            if (!input.emoji) missingFields.push('emoji');
            if (!input.summary) missingFields.push('summary');
            if (!input.qualities) missingFields.push('qualities');
            if (!input.shot) missingFields.push('shot');
            
            throw new McpError(
              ErrorCode.InvalidParams,
              `Manual framing requires: emoji, summary, qualities, and shot. The 'when' field is optional and will inherit from sources if not provided.

Missing fields: ${missingFields.join(', ')}

For AI-generated framing, provide only sourceIds:
bridge:frame { sourceIds: ["src_xxx"] }

For manual control, provide required fields:
bridge:frame {
  sourceIds: ["src_xxx"],
  emoji: "🤔",
  summary: "Auto-framing reveals interpretive depth",
  qualities: [{type: "attentional", manifestation: "Noticing..."}],
  shot: "moment-of-recognition"
}

Optional: add 'when' to override temporal inheritance from sources.`
            );
          }
          
          // STRICT VALIDATION: Validate shot type
          const validShotTypes = [
            'moment-of-recognition',
            'sustained-attention',
            'crossing-threshold',
            'peripheral-awareness',
            'directed-momentum',
            'holding-opposites'
          ];
          if (!validShotTypes.includes(input.shot)) {
            throw new McpError(
              ErrorCode.InvalidParams,
              `Invalid shot type: "${input.shot}". Valid options are: ${validShotTypes.join(', ')}`
            );
          }
          
          // STRICT VALIDATION: Validate quality types
          const validQualityTypes = [
            'embodied',
            'attentional',
            'emotional',
            'purposive',
            'spatial',
            'temporal',
            'relational'
          ];
          const invalidQualities = input.qualities.filter(q => !validQualityTypes.includes(q.type));
          if (invalidQualities.length > 0) {
            throw new McpError(
              ErrorCode.InvalidParams,
              `Invalid quality types: ${invalidQualities.map(q => q.type).join(', ')}. Valid options are: ${validQualityTypes.join(', ')}`
            );
          }
          
          // Create moment record
          const experiencer = validSources[0]?.experiencer || '';
          
          // Inherit 'when' from sources if not provided
          let whenValue = input.when;
          if (!whenValue && validSources.length > 0) {
            // Use the first source's 'when' if available, otherwise use 'created'
            whenValue = validSources[0].when || validSources[0].created;
          }
          
          const moment = await saveMoment({
            id: generateId('mom'),
            ...( {
              emoji: input.emoji,
              summary: input.summary,
              qualities: input.qualities,
              narrative: input.narrative,
              shot: input.shot,
              sources: input.sourceIds.map(sourceId => ({ sourceId })),
              created: new Date().toISOString(),
              when: whenValue,
              experiencer,
            } as any ),
          });
          
          return {
            content: [
              {
                type: 'text',
                text: `✓ Manually framed moment: ${moment.emoji} ${moment.summary} (ID: ${moment.id})`
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
      }

      case 'weave': {
        const input = weaveSchema.parse(args);
        // Validate when field with flexible date parsing
        if (input.when && !(await validateFlexibleDate(input.when))) {
          throw new McpError(
            ErrorCode.InvalidParams,
            `Invalid date format for 'when': ${input.when}. Use natural language like 'yesterday', 'last week', '2024-01-15', or ISO 8601 format.`
          );
        }
        
        // UPFRONT VALIDATION: Check that all moment IDs exist before proceeding
        const validMoments: MomentRecord[] = [];
        const missingMoments: string[] = [];
        const alreadyWovenMoments: string[] = [];
        
        for (const momentId of input.momentIds) {
          const moment = await getMoment(momentId);
          if (!moment) {
            missingMoments.push(momentId);
          } else {
            // Check if moment is already woven by looking for scenes that reference it
            const scenes = await getScenes();
            const isWoven = scenes.some(s => s.momentIds.includes(momentId));
            if (isWoven) {
              alreadyWovenMoments.push(momentId);
            } else {
              validMoments.push(moment);
            }
          }
        }
        
        // Report specific validation errors
        if (missingMoments.length > 0) {
          throw new McpError(
            ErrorCode.InvalidParams,
            `Moment ID(s) not found: ${missingMoments.join(', ')}. Please check the IDs and try again.`
          );
        }
        
        if (alreadyWovenMoments.length > 0) {
          throw new McpError(
            ErrorCode.InvalidParams,
            `Moment(s) already woven: ${alreadyWovenMoments.join(', ')}. These moments have already been processed into scenes.`
          );
        }
        
        if (validMoments.length === 0) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'No valid unwoven moments found. All provided moments have already been woven or do not exist.'
          );
        }
        
        // Determine mode based on provided parameters
        const isSmartDefault = !input.emoji && !input.summary && !input.narrative && !input.shot && !input.when;
        
        if (isSmartDefault) {
          // Smart default: use AutoProcessor (now we know all moments are valid and unwoven)
          const autoProcessor = new AutoProcessor();
          const result = await autoProcessor.autoWeaveMoments(input.momentIds);
          const scenesArr = Array.isArray(result.created) ? result.created : (result.created ? [result.created] : []);
          
          if (scenesArr.length > 0) {
            let summary = `✓ Smart-wove ${input.momentIds.length} moment(s) into ${scenesArr.length} scene(s):\n`;
            scenesArr.forEach((scene, idx) => {
              summary += `  - Scene ${idx + 1}: ${scene.emoji || '❓'} "${scene.summary || '[no summary]'}" (moments: ${(scene.momentIds || []).join(', ')})\n`;
            });
            
            // Add reframed scenes info if any
            const reframedArr = scenesArr.flatMap(s => (s && Array.isArray((s as any)["_reframed"])) ? (s as any)["_reframed"] : []);
            if (reframedArr.length > 0) {
              summary += `\n🌀 Reframed (superseded) earlier scenes:\n`;
              reframedArr.forEach((sc) => {
                summary += `  - ${sc.summary} (ID: ${sc.id})\n`;
              });
            }
            
            return {
              content: [
                { type: 'text', text: summary },
                { type: 'text', text: `\nFull records:\n${JSON.stringify(scenesArr, null, 2)}` },
                { type: 'text', text: getContextualPrompts('weave') }
              ]
            };
          } else {
            return { content: [{ type: 'text', text: `Smart-weaving failed: ${String(result.error)}` }] };
          }
        } else {
          // Manual override: moments are already validated above, use the validMoments array
          
          // Validate that all required manual parameters are provided (when is optional)
          if (!input.emoji || !input.summary || !input.narrative || !input.shot) {
            const missingFields = [];
            if (!input.emoji) missingFields.push('emoji');
            if (!input.summary) missingFields.push('summary');
            if (!input.narrative) missingFields.push('narrative');
            if (!input.shot) missingFields.push('shot');
            
            throw new McpError(
              ErrorCode.InvalidParams,
              `Manual weaving requires: emoji, summary, narrative, and shot. The 'when' field is optional and will inherit from moments if not provided.

Missing fields: ${missingFields.join(', ')}

For AI-generated weaving, provide only momentIds:
bridge:weave { momentIds: ["mom_xxx"] }

For manual control, provide required fields:
bridge:weave {
  momentIds: ["mom_xxx"],
  emoji: "🎭",
  summary: "The journey of discovery",
  narrative: "A story that connects these moments...",
  shot: "crossing-threshold"
}

Optional: add 'when' to override temporal inheritance from moments.`
            );
          }
          
          // STRICT VALIDATION: Validate shot type
          const validShotTypes = [
            'moment-of-recognition',
            'sustained-attention',
            'crossing-threshold',
            'peripheral-awareness',
            'directed-momentum',
            'holding-opposites'
          ];
          if (!validShotTypes.includes(input.shot)) {
            throw new McpError(
              ErrorCode.InvalidParams,
              `Invalid shot type: "${input.shot}". Valid options are: ${validShotTypes.join(', ')}`
            );
          }
          
          // Create scene record
          const validMoments = await Promise.all(input.momentIds.map(getMoment));
          const sceneExperiencer = validMoments[0]?.experiencer || '';
          
          // Inherit 'when' from moments if not provided
          let whenValue = input.when;
          if (!whenValue && validMoments.length > 0 && validMoments[0]) {
            // Use the first moment's 'when' if available, otherwise use 'created'
            whenValue = validMoments[0].when || validMoments[0].created;
          }
          
          const scene = await saveScene({
            id: generateId('sce'),
            emoji: input.emoji,
            summary: input.summary,
            ...( {
              narrative: input.narrative,
              momentIds: input.momentIds,
              shot: input.shot,
              when: whenValue,
              created: new Date().toISOString(),
              experiencer: sceneExperiencer,
            } as any ),
          });
          
          return {
            content: [
              {
                type: 'text',
                text: `✓ Manually wove moments into: ${scene.emoji || '❓'} ${scene.summary || '[no summary]'} (ID: ${scene.id})`
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
          
          // Validate shot type if being updated
          if (input.updates.shot) {
            const validShotTypes = [
              'moment-of-recognition',
              'sustained-attention',
              'crossing-threshold',
              'peripheral-awareness',
              'directed-momentum',
              'holding-opposites'
            ];
            if (!validShotTypes.includes(input.updates.shot as string)) {
              throw new McpError(
                ErrorCode.InvalidParams,
                `Invalid shot type: "${input.updates.shot}". Valid options are: ${validShotTypes.join(', ')}`
              );
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
        // If not a moment or source, try scene
        const scene = await getScene(input.id);
        if (scene) {
          const updatedScene = await updateScene(input.id, input.updates);
          if (!updatedScene) {
            throw new McpError(ErrorCode.InternalError, 'Failed to update scene');
          }
          return {
            content: [
              {
                type: 'text',
                text: `Enriched scene (ID: ${updatedScene.id}) with updates: ${Object.keys(input.updates).join(', ')}`,
              },
              {
                type: 'text',
                text: `\nFull record:\n${JSON.stringify(updatedScene, null, 2)}`
              }
            ],
            record: updatedScene
          };
        }
        throw new McpError(
          ErrorCode.InvalidParams,
          `No source, moment, or scene found with ID: ${input.id || 'undefined'}`
        );
      }

      case 'release': {
        const input = releaseSchema.parse(args);
        // Runtime fallback for default
        if (input.id === undefined && input.cleanupReframed === undefined) input.cleanupReframed = true;
        if (input.id !== undefined && input.cleanupReframed === undefined) input.cleanupReframed = false;
        
        // Helper function to clean up reframed records for a specific record
        const cleanupReframedRecords = async (recordId: string, recordType: 'moment' | 'scene') => {
          if (!input.cleanupReframed) return '';
          
          let cleanupMessage = '';
          const { deleteEmbedding } = await import('./embeddings.js');
          
          if (recordType === 'moment') {
            // Find and delete moments that were reframed by this moment
            const allMoments = await getMoments();
            const reframedMoments = allMoments.filter(m => m.reframedBy === recordId);
            for (const reframed of reframedMoments) {
              await deleteMoment(reframed.id);
              await deleteEmbedding(reframed.id);
              cleanupMessage += `\n  • Cleaned up reframed moment: ${reframed.emoji} "${reframed.summary}" (ID: ${reframed.id})`;
            }
          } else if (recordType === 'scene') {
            // Find and delete scenes that were reframed by this scene
            const allScenes = await getScenes();
            const reframedScenes = allScenes.filter(s => s.reframedBy === recordId);
            for (const reframed of reframedScenes) {
              await deleteScene(reframed.id);
              await deleteEmbedding(reframed.id);
              cleanupMessage += `\n  • Cleaned up reframed scene: ${reframed.emoji} "${reframed.summary}" (ID: ${reframed.id})`;
            }
          }
          
          return cleanupMessage;
        };
        
        // Helper function for bulk cleanup of all reframed records
        const bulkCleanupReframedRecords = async () => {
          if (!input.cleanupReframed) return '';
          
          let cleanupMessage = '';
          const { deleteEmbedding } = await import('./embeddings.js');
          
          // Clean up all reframed moments
          const allMoments = await getMoments();
          const reframedMoments = allMoments.filter(m => m.reframedBy);
          for (const reframed of reframedMoments) {
            await deleteMoment(reframed.id);
            await deleteEmbedding(reframed.id);
            cleanupMessage += `\n  • Cleaned up reframed moment: ${reframed.emoji} "${reframed.summary}" (ID: ${reframed.id})`;
          }
          
          // Clean up all reframed scenes
          const allScenes = await getScenes();
          const reframedScenes = allScenes.filter(s => s.reframedBy);
          for (const reframed of reframedScenes) {
            await deleteScene(reframed.id);
            await deleteEmbedding(reframed.id);
            cleanupMessage += `\n  • Cleaned up reframed scene: ${reframed.emoji} "${reframed.summary}" (ID: ${reframed.id})`;
          }
          
          return cleanupMessage;
        };
        
        // If no ID provided, perform bulk cleanup
        if (!input.id) {
          if (!input.cleanupReframed) {
            throw new McpError(
              ErrorCode.InvalidParams,
              'Either provide an ID to release a specific record, or set cleanupReframed: true for bulk cleanup'
            );
          }
          
          const cleanupMessage = await bulkCleanupReframedRecords();
          return {
            content: [
              {
                type: 'text',
                text: `✓ Bulk cleanup of reframed records completed`
              },
              {
                type: 'text',
                text: cleanupMessage || '\n🌊 No reframed records found to clean up'
              }
            ]
          };
        }
        
        // Check if it's a source
        if (input.id) {
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
                let affectedScenes: SceneRecord[] = [];
                if (typeof input.id === 'string') {
                  affectedScenes = scenes.filter(s => s.momentIds.includes(input.id!));
                }
                for (const scene of affectedScenes) {
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
            // Clean up reframed records first
            const reframedCleanup = await cleanupReframedRecords(input.id, 'moment');
            await deleteMoment(input.id);
            // Clean up any orphaned scenes
            const scenes = await getScenes();
            let affectedScenes: SceneRecord[] = [];
            if (typeof input.id === 'string') {
              affectedScenes = scenes.filter(s => s.momentIds.includes(input.id!));
            }
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
                  text: reframedCleanup + cleanupMessage || '\n🌊 The moment has been released'
                }
              ]
            };
          }
          // Check if it's a scene
          const scene = await getScene(input.id);
          if (scene) {
            // Clean up reframed records first
            const reframedCleanup = await cleanupReframedRecords(input.id, 'scene');
            await deleteScene(input.id);
            return {
              content: [
                {
                  type: 'text',
                  text: `✓ Released scene: ${scene.emoji} "${scene.summary}" (ID: ${input.id})`
                },
                {
                  type: 'text',
                  text: reframedCleanup || '\n🌊 The woven experience has been released'
                }
              ]
            };
          }
        }
        throw new McpError(
          ErrorCode.InvalidParams,
          `No source, moment, or scene found with ID: ${input.id || 'undefined'}`
        );
      }

      case 'search': {
        // Parse input
        const input = args as SearchToolInput;
        // Build filters for created and when (explicit, no fallback)
        const filters: Record<string, unknown> = {};
        if (Array.isArray(input.type) && input.type.length > 0) filters.type = input.type;
        if (typeof input.experiencer === 'string' && input.experiencer.length > 0) filters.experiencers = [input.experiencer];
        if (input.qualities) filters.qualities = input.qualities;
        if (typeof input.perspective === 'string' && input.perspective.length > 0) filters.perspectives = [input.perspective];
        if (typeof input.processing === 'string' && input.processing.length > 0) filters.processing = [input.processing];
        if (typeof input.shot === 'string' && input.shot.length > 0) filters.shotTypes = [input.shot];
        if (typeof input.framed === 'boolean') filters.framed = input.framed;
        if (typeof input.debug === 'boolean') filters.debug = input.debug;

        // Helper function to validate and parse date with chrono-node
        const validateAndParseDate = async (dateInput: string | { start: string; end: string }): Promise<{ start: string; end: string }> => {
          if (typeof dateInput === 'string') {
            // Validate with chrono-node
            if (!(await validateFlexibleDate(dateInput))) {
              throw new McpError(
                ErrorCode.InvalidParams,
                `Invalid date format: ${dateInput}. Use natural language like 'yesterday', 'last week', '2024-01-15', or ISO 8601 format.`
              );
            }
            // Parse with chrono-node to get actual date
            const chrono = await import('chrono-node');
            const results = chrono.parse(dateInput);
            if (results.length === 0) {
              throw new McpError(
                ErrorCode.InvalidParams,
                `Could not parse date: ${dateInput}`
              );
            }
            const parsedDate = results[0].start.date().toISOString();
            return { start: parsedDate, end: parsedDate };
          } else {
            // Validate both start and end dates
            if (!(await validateFlexibleDate(dateInput.start))) {
              throw new McpError(
                ErrorCode.InvalidParams,
                `Invalid start date format: ${dateInput.start}. Use natural language like 'yesterday', 'last week', '2024-01-15', or ISO 8601 format.`
              );
            }
            if (!(await validateFlexibleDate(dateInput.end))) {
              throw new McpError(
                ErrorCode.InvalidParams,
                `Invalid end date format: ${dateInput.end}. Use natural language like 'yesterday', 'last week', '2024-01-15', or ISO 8601 format.`
              );
            }
            // Parse both dates
            const chrono = await import('chrono-node');
            const startResults = chrono.parse(dateInput.start);
            const endResults = chrono.parse(dateInput.end);
            if (startResults.length === 0 || endResults.length === 0) {
              throw new McpError(
                ErrorCode.InvalidParams,
                `Could not parse date range: ${dateInput.start} to ${dateInput.end}`
              );
            }
            const startDate = startResults[0].start.date().toISOString();
            const endDate = endResults[0].start.date().toISOString();
            return { start: startDate, end: endDate };
          }
        };

        // Explicitly filter by 'created' (system timestamp, UTC)
        if (input.created) {
          try {
            const parsedRange = await validateAndParseDate(input.created);
            filters.createdRange = parsedRange;
          } catch (error) {
            if (error instanceof McpError) throw error;
            throw new McpError(
              ErrorCode.InvalidParams,
              `Error processing created date: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        }
        // Explicitly filter by 'when' (user-supplied, UTC)
        if (input.when) {
          try {
            const parsedRange = await validateAndParseDate(input.when);
            filters.whenRange = parsedRange;
          } catch (error) {
            if (error instanceof McpError) throw error;
            throw new McpError(
              ErrorCode.InvalidParams,
              `Error processing when date: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        }
        // Relationship search (optional pre-filter)
        let preFilteredRecords: StorageRecord[] | undefined = undefined;
        if (input.reflectedOn) {
          const allRecords = await import('./storage.js').then(m => m.getAllRecords());
          const searchModule = await import('./search.js');
          const forward = searchModule.findReflectsOnRecords(input.reflectedOn, await allRecords);
          const backward = searchModule.findReflectionsAbout(input.reflectedOn, await allRecords);
          // Union, deduplicated by ID
          const all = [...forward, ...backward];
          const seen = new Set();
          preFilteredRecords = all.filter(r => {
            if (seen.has(r.id)) return false;
            seen.add(r.id);
            return true;
          });
          if (preFilteredRecords.length === 0) {
            return { content: [{ type: 'text', text: `No record found with ID: ${input.reflectedOn}` }] };
          }
          
          // If there's no query, return the reflection network directly
          if (!input.query || input.query.trim() === '') {
            const { getSearchableText } = await import('./storage.js');
            const results = preFilteredRecords.map(record => {
              const snippet = getSearchableText(record);
              return {
                type: record.type,
                id: record.id,
                snippet,
                source: record.type === 'source' ? record as SourceRecord : undefined,
                moment: record.type === 'moment' ? record as MomentRecord : undefined,
                scene: record.type === 'scene' ? record as SceneRecord : undefined,
              };
            });
            
            if (input.includeContext) {
              return {
                content: results.map((result: SearchResult) => ({
                  type: 'text',
                  text: JSON.stringify(formatStructuredSearchResult(result), null, 2)
                }))
              };
            } else {
              return {
                content: results.map((result: SearchResult, index: number) => ({
                  type: 'text',
                  text: formatDetailedSearchResult(result, index)
                }))
              };
            }
          }
        }
        // When calling search, construct a SearchOptions object with all required properties and use object spread for optional fields
        const searchOptions: import('./search.js').SearchOptions = {
          query: input.query ?? '',
          filters,
          limit: input.limit,
          includeContext: input.includeContext,
          debug: input.debug,
        };
        if (typeof input.sort === 'string') searchOptions.sort = input.sort;
        if (typeof input.groupBy === 'string') searchOptions.groupBy = input.groupBy;
        const results = await (await import('./search.js')).search(searchOptions);
        // If preFilteredRecords is set, filter results to only those in preFilteredRecords
        let finalResults = results;
        if (preFilteredRecords) {
          const allowedIds = new Set(preFilteredRecords.map((r) => r.id));
          finalResults = (Array.isArray(results) ? results : results.groups.flatMap((g) => g.items)).filter((r) => allowedIds.has(r.id));
        }
        if (Array.isArray(finalResults)) {
          if (finalResults.length === 0) {
            // Provide more helpful error message when no results found
            let errorMessage = 'No relevant memories found.';
            if (input.debug) {
              const activeFilters = [];
              if (input.type && input.type.length > 0) activeFilters.push(`type: ${input.type.join(', ')}`);
              if (input.experiencer) activeFilters.push(`experiencer: ${input.experiencer}`);
              if (input.perspective) activeFilters.push(`perspective: ${input.perspective}`);
              if (input.qualities && input.qualities.length > 0) activeFilters.push(`qualities: ${input.qualities.join(', ')} (mode: ${input.qualitiesMode || 'all'})`);
              if (input.shot) activeFilters.push(`shot: ${input.shot}`);
              if (input.created) activeFilters.push(`created: ${typeof input.created === 'string' ? input.created : `${input.created.start} to ${input.created.end}`}`);
              if (input.when) activeFilters.push(`when: ${typeof input.when === 'string' ? input.when : `${input.when.start} to ${input.when.end}`}`);
              if (input.framed !== undefined) activeFilters.push(`framed: ${input.framed}`);
              if (input.debug !== undefined) activeFilters.push(`debug: ${input.debug}`);
              
              if (activeFilters.length > 0) {
                errorMessage += `\n\nActive filters that may be too restrictive:\n${activeFilters.map(f => `  • ${f}`).join('\n')}`;
              }
            }
            return { content: [{ type: 'text', text: errorMessage }] };
          }
          if (input.includeContext) {
            return {
              content: finalResults.map((result: SearchResult) => ({
                type: 'text',
                text: JSON.stringify(formatStructuredSearchResult(result), null, 2)
              }))
            };
          } else {
            // Always return an array, even for a single result
            return {
              content: finalResults
                .filter((result: any) => typeof result === 'object' && result !== null && typeof result.type === 'string')
                .map((result: SearchResult, index: number) => ({
                  type: 'text',
                  text: formatDetailedSearchResult(result, index)
                }))
            };
          }
        } else if (finalResults && typeof finalResults === 'object' && 'groups' in finalResults) {
          // Pretty-print grouped results
          const groupBlocks = (finalResults as import('./search.js').GroupedResults).groups.map((group: { label: string; count: number; items: SearchResult[] }) => {
            const header = `${group.label} (${group.count})`;
            const items = group.items.map((item: SearchResult, idx: number) => formatSearchResult(item, idx)).join('\n');
            return `${header}\n${items}`;
          });
          return {
            content: groupBlocks.map(text => ({ type: 'text', text: String(text) }))
          };
        } else {
          return { content: [{ type: 'text', text: 'Grouped results are not yet supported in this view.' }] };
        }
      }

      case 'status': {
        const report = await statusMonitor.generateStatusReport();
        // Add recent scenes section
        const { getScenes } = await import('./storage.js');
        const scenes = await getScenes();
        const now = Date.now();
        const recentScenes = scenes.filter(s => {
          const created = new Date(s.created).getTime();
          return now - created < 10 * 60 * 1000; // last 10 minutes
        });
        let recentSection = '';
        if (recentScenes.length > 0) {
          recentSection += '\nRecently created scenes (last 10 minutes):\n';
          for (const scene of recentScenes) {
            recentSection += `- ${scene.emoji || '❓'} "${scene.summary || '[no summary]'}" (ID: ${scene.id}, moments: ${(scene.momentIds || []).join(', ')}, created: ${scene.created})\n`;
          }
        }
        return {
          content: [
            {
              type: 'text',
              text: `📊 System Status Report

📝 Unframed sources: ${report.unframed_sources_count}
🧵 Unweaved moments: ${report.unweaved_moments_count}
🌀 Reframed moments: ${report.reframed_moments_count}
🌀 Reframed scenes: ${report.reframed_scenes_count}
⚙️ Auto-weave threshold: ${report.auto_weave_threshold}

🤖 Auto-processing (disabled by default for user control):
  • Auto-framing: ${report.auto_framing_enabled ? 'enabled' : 'disabled'}
  • Auto-weaving: ${report.auto_weaving_enabled ? 'enabled' : 'disabled'}

💡 To enable auto-processing:
  • Set autoframe: true in capture calls
  • Configure auto-processing in environment variables

${report.processing_errors.length > 0 ? 
  `❌ Processing Errors:
${report.processing_errors.map(e => 
  `  • ${e.type}: ${e.count} error(s), last: ${e.lastError}`
).join('\n')}` : 
  '✅ No processing errors'
}
` + recentSection
            }
          ]
        };
      }

      default: {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Unknown tool: ${name}`
        );
      }
    }
  } catch (err) {
    // Improved error reporting for user clarity - return proper MCP tool result format
    let errorMessage = 'An unexpected error occurred';
    
    if (err instanceof McpError) {
      errorMessage = err.message;
    } else if (err instanceof z.ZodError) {
      // Convert Zod validation errors to user-friendly messages
      const details = err.errors.map(e => {
        const field = e.path.join('.');
        const message = e.message;
        
        // Provide specific guidance for common validation errors
        if (field === 'shot') {
          return `Invalid shot type. Valid options are: moment-of-recognition, sustained-attention, crossing-threshold, peripheral-awareness, directed-momentum, holding-opposites`;
        }
        if (field === 'perspective') {
          return `Invalid perspective. Must be one of: I, we, you, they`;
        }
        if (field === 'processing') {
          return `Invalid processing level. Must be one of: during, right-after, long-after, crafted`;
        }
        if (field === 'sourceIds' || field === 'momentIds') {
          return `Missing required field: ${field}. Provide an array of IDs.`;
        }
        if (field === 'content') {
          return `Content is required and cannot be empty.`;
        }
        if (field === 'experiencer') {
          return `Experiencer is required. Specify who experienced this.`;
        }
        
        return `Invalid ${field}: ${message}`;
      }).join('; ');
      errorMessage = details;
    } else if (err instanceof Error) {
      errorMessage = err.message;
    }
    
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: errorMessage
        }
      ]
    };
  }
});

(async () => {
  const transport = new StdioServerTransport();
  await server.connect(transport);
})();