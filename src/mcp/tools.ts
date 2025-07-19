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
      description: `Capture a moment someone shares with you. Like taking a mental photograph of an experience.

When someone shares something meaningful, you can quietly remember it by noting what stands out:
- embodied: Are they more in their head (thinking) or body (sensing)?
- focus: Is their attention narrow on one thing or broad taking it all in?
- mood: Do they seem open/expansive or closed/contracted?
- purpose: Are they goal-directed or just wandering/exploring?
- space: Are they grounded here or somewhere else in their mind?
- time: Are they dwelling on the past, looking to future, or just present?
- presence: Is this an individual moment or about connection with others?

Tips for natural use:
- Keep their exact words - don't paraphrase or interpret
- Only capture complete moments that feel significant
- Use dot notation when a quality is clear (e.g., "mood.open")
- Use just the base when it's mixed or unclear (e.g., just "mood")
- Match their tone - if they're casual, you be casual too`,
      inputSchema: RememberInputJsonSchema,
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false
    },
    {
      name: 'recall',
      description: `Find and revisit moments we've shared. Just describe what you're looking for in everyday language.

You can search by:
- What was said or happened
- Who was involved
- When it occurred
- The feeling or mood
- Any combination of these

The more natural your search, the better. Think of it like asking a friend "remember when...?"`,
      inputSchema: SearchInputJsonSchema,
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    },
    {
      name: 'reconsider',
      description: `Update a moment we've captured when you notice something new or want to correct it.

Maybe you:
- Realized a different quality was more prominent
- Want to fix a typo or clarify what was said
- Noticed something you missed the first time
- Want to adjust who said it or when

Just identify which moment to update and what needs changing.`,
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
      description: `Let go of a moment that doesn't need to be held anymore.

Sometimes we capture things that:
- Were just temporary thoughts
- No longer feel relevant
- Were practice or testing
- We'd rather not keep

It's okay to let things go. Just say which one and optionally why.`,
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

