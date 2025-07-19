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
  RememberInputSchema,
  SearchInputSchema,
  ReconsiderInputSchema,
  ReleaseInputSchema
} from './schemas.js';


// JSON Schemas for MCP tool registration - generate without $ref structure
export const RememberInputJsonSchema = zodToJsonSchema(RememberInputSchema);
export const SearchInputJsonSchema = zodToJsonSchema(SearchInputSchema);
export const ReconsiderInputJsonSchema = zodToJsonSchema(ReconsiderInputSchema);
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
      name: 'remember',
      description: `Remember experiences as framed moments. Based on FRAMED_MOMENTS.md theoretical framework.

THEORETICAL FOUNDATION:
A framed moment is a practical unit for capturing experience - what consciousness apprehends in a single, held attention. Like a photograph taken from continuous movement, it creates a useful representation that is complete enough to stand alone yet naturally implies its temporal flow.

SEVEN DIMENSIONAL ANALYSIS:
- embodied: How consciousness textures through physicality (thinking/sensing)
- focus: Direction and quality of awareness (narrow/broad)
- mood: Emotional coloring of experience (open/closed)
- purpose: Directedness or drift of the moment (goal/wander)
- space: Lived sense of place and position (here/there)
- time: How past and future inhabit the present (past/future, or just 'time' when neither dominates)
- presence: How others' presence or absence matters (individual/collective)

PRINCIPLES:
- Source must contain experiencer's exact words - no summarizing or interpreting
- Choose qualities that emerge prominently (dimensions either emerge prominently or recede)
- Experience should be present-tense, experientially complete, and preserve authentic voice
- Use dot notation for specific qualities: e.g., "embodied.thinking", "mood.open", "purpose.goal"
- Use base dimension when quality is mixed or unclear: e.g., just "mood" or "space"`,
      inputSchema: RememberInputJsonSchema,
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false
    },
    {
      name: 'recall',
      description: `Recall experiences using natural language or quality-based queries. Returns relevant shared memories or patterns.`,
      inputSchema: SearchInputJsonSchema,
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    },
    {
      name: 'reconsider',
      description: 'Reconsider and update existing framed moments. Can modify content, perspective, experiencer, processing level, crafted status, and experiential qualities. Useful for correcting mistakes or refining experiential analysis to ensure moments remain visually anchorable, experientially complete, and preserve authentic voice. Supports both single updates and batch operations.',
      inputSchema: makeDraft202012Schema(ReconsiderInputJsonSchema),
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
      examples: [
        {
          id: 'reconsider-experience',
          description: 'Reconsider and update the experience qualities of an experience',
          input: {
            id: 'exp_1234567890',
            experience: ['embodied.sensing', 'focus.narrow', 'purpose.goal']
          },
          output: {
            content: [
              {
                type: 'text',
                text: '✅ Experience reconsidered and updated successfully!\n\n📝 ID: exp_1234567890\n🔄 Fields updated: experience\n🕐 Updated: 2025-01-15T10:30:00.000Z'
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
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false,
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
    },

  ];
}

