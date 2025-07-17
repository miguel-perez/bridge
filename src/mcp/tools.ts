/**
 * MCP Tool Definitions (Zod-based)
 *
 * All tool input schemas are defined using Zod for type safety, validation, and maintainability.
 * - Use `.describe()` on every field for manifest/JSON Schema documentation.
 * - Use Zod enums for enum fields.
 * - Infer TypeScript types from Zod schemas for use in handlers and tests.
 * - Convert Zod schemas to JSON Schema using `zod-to-json-schema` for MCP tool registration.
 * - The `tools` array uses the generated JSON Schemas for each tool's `inputSchema`.
 *
 * MCP Tool Annotations:
 * - title: Human-friendly name for UI display
 * - readOnlyHint: true if tool doesn't modify state, false if it does
 * - destructiveHint: true if tool can delete/irreversibly change data (only meaningful when readOnlyHint=false)
 * - idempotentHint: true if repeated calls with same args have no additional effect (only meaningful when readOnlyHint=false)
 * - openWorldHint: true if tool interacts with external systems/entities, false if closed system only
 *
 * To add a new tool:
 * 1. Define a Zod schema for the tool's input at the top of this file.
 * 2. Export the inferred TypeScript type and JSON Schema.
 * 3. Add the tool to the `tools` array, referencing the JSON Schema for `inputSchema`.
 * 4. Add appropriate annotations based on the tool's behavior.
 * 5. Use the inferred type in your handler for type-safe access and validation.
 *
 * This pattern ensures:
 * - DRY, maintainable schemas
 * - Consistent validation and documentation
 * - Full MCP protocol compatibility
 * - Clear tool behavior hints for clients and LLMs
 */
// MCP Tool definitions - must match DXT manifest exactly

// Zod-based schemas for MCP tools
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  CaptureInputSchema,
  SearchInputSchema,
  UpdateInputSchema,
  ReleaseInputSchema
} from './schemas.js';


// JSON Schemas for MCP tool registration - generate without $ref structure
export const CaptureInputJsonSchema = zodToJsonSchema(CaptureInputSchema);
export const SearchInputJsonSchema = zodToJsonSchema(SearchInputSchema);
export const UpdateInputJsonSchema = zodToJsonSchema(UpdateInputSchema);
export const ReleaseInputJsonSchema = zodToJsonSchema(ReleaseInputSchema);

// Utility to post-process schema for MCP compatibility
function makeDraft202012Schema(schema: any) {
  // Add the required $schema property for JSON Schema draft 2020-12
  schema['$schema'] = 'https://json-schema.org/draft/2020-12/schema';
  return schema;
}

// Tools array with schemas compatible with JSON Schema draft 2020-12
export async function getTools() {
  return [
    {
      name: 'capture',
      description: 'Capture experiences. The source field must contain the experiencer\'s exact words as written or spoken - without summarizing, interpreting, or modifying. Process this raw source material into framed moments with seven-dimensional analysis (embodied, attentional, affective, purposive, spatial, temporal, intersubjective). Each capture requires an emoji and narrative summary written in present tense. Supports both single captures and batch operations. Use the experiencer field and batch operations to capture experiences from each perspective, including your own.',
      inputSchema: makeDraft202012Schema(CaptureInputJsonSchema),
      annotations: {
        title: 'Capture Experience',
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false
      },
      examples: [
        {
          id: 'basic-capture',
          description: 'Capture a simple experience with narrative and emoji',
          input: {
            source: 'I\'m walking through the rain and feeling completely alive. The water is cold but invigorating.',
            perspective: 'I',
            experiencer: 'Alex',
            processing: 'during',
            experience: {
              qualities: [
                {
                  type: 'embodied',
                  prominence: 0.9,
                  manifestation: 'cold water invigorating the body'
                },
                {
                  type: 'affective',
                  prominence: 0.8,
                  manifestation: 'feeling completely alive'
                }
              ],
              emoji: '🌧️',
              narrative: 'Step through cold rain, body tingles with life'
            }
          },
          output: {
            content: [
              {
                type: 'text',
                text: '✅ Experience captured successfully!\n\n🌧️ Step through cold rain, body tingles with life\n\n✨ Qualities: embodied: 90%, affective: 80%\n\n📝 ID: exp_1234567890\n👤 Experiencer: Alex\n👁️  Perspective: I\n⏰ Processing: during\n🕐 Created: 2025-01-15T10:30:00.000Z'
              }
            ]
          }
        },
        {
          id: 'capture-with-defaults',
          description: 'Capture with minimal input, using system defaults',
          input: {
            source: 'Just had a breakthrough moment with the code.',
            experiencer: 'Developer'
          },
          output: {
            content: [
              {
                type: 'text',
                text: '✅ Experience captured successfully!\n\n💡 Fidget with pen, heart thuds hard\n\n✨ Qualities: purposive: 85%, affective: 75%\n\n📝 ID: exp_9876543210\n👤 Experiencer: Developer\n👁️  Perspective: I\n⏰ Processing: during\n🕐 Created: 2025-01-15T10:30:00.000Z\n\n📋 Defaults applied: perspective, processing, experience'
              }
            ]
          }
        }
      ]
    },
    {
      name: 'search',
      description: 'Search framed moments using semantic matching and metadata filters. Returns sources with their qualities, emoji, narrative, and metadata. Empty queries show recent framed moments. Supports filtering by experiencer, perspective, processing level, and date ranges. Supports both single searches and batch operations.',
      inputSchema: makeDraft202012Schema(SearchInputJsonSchema),
      annotations: {
        title: 'Search Experiences',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      },
      examples: [
        {
          id: 'semantic-search',
          description: 'Search for experiences using natural language',
          input: {
            query: 'creative breakthrough moments',
            limit: 5,
            experiencer: 'Alex'
          },
          output: {
            content: [
              {
                type: 'text',
                text: '🔍 Search: "creative breakthrough moments"\n📊 Found 3 experiences\n\n💡 Hover over keyboard, afternoon light streams in, excitement and uncertainty bubble up about this project that feels special but unclear.\n\n✨ Qualities: purposive: 85%, affective: 80%\n\nexp_1234567890 • Alex • I • during • 2h ago\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎨 Focus deep on the creative challenge, breakthrough clarity hits.\n\n✨ Qualities: attentional: 90%\n\nexp_2345678901 • Alex • I • during • 1d ago'
              }
            ]
          }
        },
        {
          id: 'recent-experiences',
          description: 'Show recent experiences without a specific query',
          input: {
            limit: 3
          },
          output: {
            content: [
              {
                type: 'text',
                text: '📚 Recent Experiences (3 total)\n\n🌧️ Step through cold rain, body tingles with life\n\n✨ Qualities: embodied: 90%, affective: 80%\n\nexp_1234567890 • Alex • I • during • 2h ago\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💡 Hover over keyboard, afternoon light streams in, excitement and uncertainty bubble up about this project that feels special but unclear.\n\n✨ Qualities: purposive: 85%, affective: 80%\n\nexp_2345678901 • Alex • I • during • 1d ago'
              }
            ]
          }
        }
      ]
    },
    {
      name: 'update',
      description: 'Update existing framed moments. Can modify content, perspective, experiencer, processing level, crafted status, and the seven-dimensional experiential qualities. Useful for correcting mistakes or refining experiential analysis to ensure moments remain visually anchorable, experientially complete, and preserve authentic voice. Supports both single updates and batch operations.',
      inputSchema: makeDraft202012Schema(UpdateInputJsonSchema),
      annotations: {
        title: 'Update Experience',
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false
      },
      examples: [
        {
          id: 'update-narrative',
          description: 'Update the narrative and emoji of an experience',
          input: {
            id: 'exp_1234567890',
            experience: {
              emoji: '🎯',
              narrative: 'Focus intently on keyboard, afternoon light streams in, excitement and uncertainty bubble up about this project that feels special but unclear.'
            }
          },
          output: {
            content: [
              {
                type: 'text',
                text: '✅ Experience updated successfully!\n\n🎯 Focus intently on keyboard, afternoon light streams in, excitement and uncertainty bubble up about this project that feels special but unclear.\n\n📝 ID: exp_1234567890\n🔄 Fields updated: emoji, narrative\n🕐 Updated: 2025-01-15T10:30:00.000Z'
              }
            ]
          }
        }
      ]
    },
    {
      name: 'release',
      description: 'Release framed moments by ID. Removes experiences from the system with gratitude and reasoning. Useful for letting go of moments that no longer need to be held, acknowledging that significance emerges through accumulation and connection rather than through permanent retention. Supports both single releases and batch operations.',
      inputSchema: makeDraft202012Schema(ReleaseInputJsonSchema),
      annotations: {
        title: 'Release Experience',
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false
      },
      examples: [
        {
          id: 'single-release',
          description: 'Release a single experience with gratitude',
          input: {
            id: 'exp_1234567890',
            reason: 'No longer relevant to current work'
          },
          output: {
            content: [
              {
                type: 'text',
                text: '🙏 Experience released with gratitude\n\n📝 ID: exp_1234567890\n💭 Reason: No longer relevant to current work\n🕐 Released: 2025-01-15T10:30:00.000Z\n\nThank you for the insights this moment provided. Significance emerges through accumulation and connection rather than through permanent retention.'
              }
            ]
          }
        }
      ]
    }
  ];
}

