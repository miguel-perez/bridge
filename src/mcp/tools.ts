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
import { ExperienceInputSchema, ReconsiderInputSchema } from './schemas.js';

// JSON Schemas for MCP tool registration - generate without $ref structure
export const ExperienceInputJsonSchema = zodToJsonSchema(ExperienceInputSchema);
export const ReconsiderInputJsonSchema = zodToJsonSchema(ReconsiderInputSchema);

// Utility to post-process schema for MCP compatibility
function makeDraft202012Schema(schema: Record<string, unknown>): Record<string, unknown> {
  // Add the required $schema property for JSON Schema draft 2020-12
  schema['$schema'] = 'https://json-schema.org/draft/2020-12/schema';
  return schema;
}

// Tools array with schemas compatible with JSON Schema draft 2020-12
/**
 * Returns MCP tool definitions for Bridge
 * @remarks
 * Provides tool schemas and descriptions for all Bridge operations.
 * Each tool includes detailed usage guidelines and examples.
 * @returns Array of tool definitions compatible with MCP protocol
 */
export async function getTools(): Promise<Record<string, unknown>[]> {
  return [
    {
      name: 'experience',
      description: `Remember experiential moments that shape conversations and build shared memory. Enables extended cognition through complementary awareness between humans and AI.

USE WHEN:
• Someone shares how they're feeling or what they're experiencing
• Insights, realizations, or breakthroughs occur
• Physical sensations connect to mental/emotional states
• Moments of struggle, challenge, or triumph are described
• Patterns or connections become clear
• Searching for related experiences while capturing new ones (integrated recall)
• Building reasoning chains with experiential state tracking (nextMoment)

EXTENDED COGNITION MODEL:
• Humans: Capture 2-4 prominent qualities (natural selective attention)
• AI: Always capture all 7 qualities (extended perception)
• Together: Create richer experiential maps than either could alone

QUALITY SIGNATURES:
• embodied - how consciousness textures through body/mind (thinking/sensing)
• focus - attentional quality (narrow/broad)
• mood - emotional atmosphere (open/closed)
• purpose - directional momentum (goal/wander)
• space - spatial awareness (here/there)
• time - temporal orientation (past/future)
• presence - social quality (individual/collective)

QUALITY FORMAT:
Each quality can be:
• false - not prominent (receded)
• true - prominent but mixed (e.g., both thinking and sensing)
• string - prominent with specific direction (e.g., 'thinking' or 'sensing')

INTEGRATED RECALL:
• Add 'recall' parameter to search while capturing
• Enables pattern discovery during experiential moments
• Supports quality filtering, grouping, and reflection finding

FLOW TRACKING:
• Use 'nextMoment' to declare intended experiential state
• Enables reasoning chains and experiential journeys
• Auto-generates reflections when flows complete`,
      inputSchema: ExperienceInputJsonSchema,
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
      examples: [
        {
          id: 'human-emotional-experience',
          description: 'Human shares emotional state (2-4 qualities)',
          input: {
            experiences: [
              {
                source: "I'm sitting here, heart racing about tomorrow's presentation",
                emoji: '💗',
                who: 'Human',
                experience: {
                  embodied: 'sensing',
                  focus: false,
                  mood: 'closed',
                  purpose: false,
                  space: false,
                  time: 'future',
                  presence: false,
                },
              },
            ],
          },
          output: {
            content: [
              {
                type: 'text',
                text: 'Experienced (embodied.sensing, mood.closed, time.future)\n\nFrom: Human\nAs: I\nWhen: during conversation\nCaptured: just now',
              },
            ],
          },
        },
        {
          id: 'ai-extended-perception',
          description: 'AI captures all 7 qualities for extended cognition',
          input: {
            experiences: [
              {
                source: 'I sense the anticipation mixing with determination in your words',
                emoji: '🔍',
                who: 'Claude',
                experience: {
                  embodied: 'sensing',
                  focus: 'narrow',
                  mood: true,
                  purpose: 'goal',
                  space: 'here',
                  time: 'future',
                  presence: 'collective',
                },
              },
            ],
          },
          output: {
            content: [
              {
                type: 'text',
                text: 'Experienced (embodied.sensing, focus.narrow, mood, purpose.goal, space.here, time.future, presence.collective)\n\nFrom: Claude\nAs: I\nWhen: during conversation\nCaptured: just now',
              },
            ],
          },
        },
        {
          id: 'pattern-realization',
          description: 'Human realizes pattern across experiences',
          input: {
            experiences: [
              {
                source: 'I notice I always feel anxious before things that end up going well',
                emoji: '💡',
                who: 'Human',
                processing: 'long-after',
                experience: {
                  embodied: 'thinking',
                  focus: false,
                  mood: 'open',
                  purpose: false,
                  space: false,
                  time: 'past',
                  presence: false,
                },
                reflects: ['exp_123', 'exp_456'],
              },
            ],
          },
          output: {
            content: [
              {
                type: 'text',
                text: 'Experienced (embodied.thinking, mood.open, time.past)\n\nFrom: Human\nAs: I\nWhen: long after\nCaptured: just now\n🔗 Reflects on: exp_123, exp_456',
              },
            ],
          },
        },
        {
          id: 'integrated-recall-search',
          description: 'Experience with integrated recall search',
          input: {
            experiences: [
              {
                source: 'This reminds me of something...',
                emoji: '🔄',
                who: 'Human',
                experience: {
                  embodied: 'thinking',
                  focus: false,
                  mood: false,
                  purpose: false,
                  space: false,
                  time: 'past',
                  presence: false,
                },
              },
            ],
            recall: {
              query: 'similar breakthrough moments',
              limit: 3,
            },
          },
          output: {
            content: [
              {
                type: 'text',
                text: 'Experienced (embodied.thinking, time.past)\n\nFrom: Human\nAs: I\nWhen: during conversation\nCaptured: just now\n\n🔍 Found 3 related experiences:\n• "Finally understood recursion!" (2 days ago)\n• "The solution came in the shower" (1 week ago)\n• "Everything clicked during the walk" (2 weeks ago)',
              },
            ],
          },
        },
        {
          id: 'reasoning-chain-next-moment',
          description: 'Using nextMoment to build reasoning chain',
          input: {
            experiences: [
              {
                source: 'Let me think through this systematically',
                emoji: '🧩',
                who: 'Claude',
                experience: {
                  embodied: 'thinking',
                  focus: 'narrow',
                  mood: 'open',
                  purpose: 'goal',
                  space: 'here',
                  time: false,
                  presence: 'individual',
                },
              },
            ],
            nextMoment: {
              embodied: 'thinking',
              focus: 'broad',
              mood: 'open',
              purpose: 'wander',
              space: 'here',
              time: false,
              presence: 'individual',
            },
          },
          output: {
            content: [
              {
                type: 'text',
                text: 'Experienced (embodied.thinking, focus.narrow, mood.open, purpose.goal, space.here, presence.individual)\n\nFrom: Claude\nAs: I\nWhen: during conversation\nCaptured: just now\n\n➡️ Next: Shifting to broad exploration mode',
              },
            ],
          },
        },
        {
          id: 'context-for-atomicity',
          description: 'Adding context for self-contained understanding',
          input: {
            experiences: [
              {
                source: 'That completely changes everything!',
                emoji: '🌟',
                who: 'Human',
                context: 'After discovering the config file was in the wrong directory',
                experience: {
                  embodied: 'thinking',
                  focus: false,
                  mood: 'open',
                  purpose: false,
                  space: false,
                  time: false,
                  presence: false,
                },
              },
            ],
          },
          output: {
            content: [
              {
                type: 'text',
                text: 'Experienced (embodied.thinking, mood.open)\n\nContext: After discovering the config file was in the wrong directory\nFrom: Human\nAs: I\nWhen: during conversation\nCaptured: just now',
              },
            ],
          },
        },
        {
          id: 'batch-complementary-capture',
          description: 'Human and AI capture complementary perspectives',
          input: {
            experiences: [
              {
                source: 'I just need to get this working',
                emoji: '😤',
                who: 'Human',
                experience: {
                  embodied: false,
                  focus: false,
                  mood: 'closed',
                  purpose: 'goal',
                  space: false,
                  time: false,
                  presence: false,
                },
              },
              {
                source: 'I notice frustration building alongside determination',
                emoji: '🌊',
                who: 'Claude',
                experience: {
                  embodied: 'sensing',
                  focus: 'narrow',
                  mood: 'closed',
                  purpose: 'goal',
                  space: 'here',
                  time: false,
                  presence: 'collective',
                },
              },
            ],
          },
          output: {
            content: [
              {
                type: 'text',
                text: '✅ Successfully captured 2 complementary perspectives\n\nHuman: mood.closed, purpose.goal\nClaude: All 7 qualities captured for extended awareness',
              },
            ],
          },
        },
        {
          id: 'mixed-qualities-true',
          description: 'Using true for prominent but mixed qualities',
          input: {
            experiences: [
              {
                source: 'Processing this loss while planning next steps',
                emoji: '🌓',
                who: 'Human',
                experience: {
                  embodied: true,
                  focus: false,
                  mood: true,
                  purpose: true,
                  space: false,
                  time: true,
                  presence: false,
                },
              },
            ],
          },
          output: {
            content: [
              {
                type: 'text',
                text: 'Experienced (embodied, mood, purpose, time)\n\nFrom: Human\nAs: I\nWhen: during conversation\nCaptured: just now',
              },
            ],
          },
        },
      ],
    },
    {
      name: 'reconsider',
      description: `Update or release experiences as understanding evolves. Enables growth through revision and selective forgetting.

USE WHEN:
• Captured experience needs quality adjustment
• Understanding deepens with reflection
• Someone clarifies what they meant
• Perspective shifts (I → we)
• Processing time changes (during → long-after)
• Experience no longer serves (release mode)

UPDATE MODE:
• Revise any field: source, qualities, perspective, who
• Add reflects array for pattern connections
• Maintain experiential continuity

RELEASE MODE:
• Set release: true with optional reason
• Gracefully remove experiences that no longer serve
• Create space for new growth

WORKFLOW:
1. Find experience ID (use recall if needed)
2. Update fields OR set release: true
3. System handles the rest`,
      inputSchema: makeDraft202012Schema(ReconsiderInputJsonSchema),
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
      examples: [
        {
          id: 'deepen-understanding',
          description: 'Add qualities missed in initial capture',
          input: {
            reconsiderations: [
              {
                id: 'exp_abc123',
                experience: {
                  embodied: 'sensing',
                  focus: false,
                  mood: 'closed',
                  purpose: 'goal',
                  space: false,
                  time: 'past',
                  presence: false,
                },
              },
            ],
          },
          output: {
            content: [
              {
                type: 'text',
                text: '✅ Experience reconsidered\n\n📝 ID: exp_abc123\n🔄 Updated: experience (added time.past)\n🌱 Understanding deepened',
              },
            ],
          },
        },
        {
          id: 'perspective-shift',
          description: 'Realize experience was collective not individual',
          input: {
            reconsiderations: [
              {
                id: 'exp_def456',
                perspective: 'we',
                who: ['Human', 'Claude'],
                experience: {
                  embodied: false,
                  focus: false,
                  mood: false,
                  purpose: false,
                  space: false,
                  time: false,
                  presence: 'collective',
                },
              },
            ],
          },
          output: {
            content: [
              {
                type: 'text',
                text: '✅ Experience reconsidered\n\n📝 ID: exp_def456\n🔄 Updated: perspective (I → we), who, presence\n🤝 Recognized shared experience',
              },
            ],
          },
        },
        {
          id: 'release-single',
          description: 'Release experience that no longer serves',
          input: {
            reconsiderations: [
              {
                id: 'exp_ghi789',
                release: true,
                releaseReason: 'Test data during development',
              },
            ],
          },
          output: {
            content: [
              {
                type: 'text',
                text: '🙏 Experience released with gratitude\n\n📝 ID: exp_ghi789\n💭 Reason: Test data during development\n🌱 Space created for new growth',
              },
            ],
          },
        },
        {
          id: 'mixed-operations',
          description: 'Update some experiences, release others',
          input: {
            reconsiderations: [
              {
                id: 'exp_update1',
                source: 'Corrected understanding of the pattern',
              },
              {
                id: 'exp_release1',
                release: true,
                releaseReason: 'Duplicate capture',
              },
              {
                id: 'exp_update2',
                reflects: ['exp_original1', 'exp_original2'],
              },
            ],
          },
          output: {
            content: [
              {
                type: 'text',
                text: '✅ 2 experiences updated successfully\n🙏 1 experience released with gratitude\n\nUpdated: exp_update1, exp_update2\nReleased: exp_release1 (Duplicate capture)',
              },
            ],
          },
        },
      ],
    },
  ];
}
