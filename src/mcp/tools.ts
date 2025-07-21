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
  ExperienceInputSchema,
  SearchInputSchema,
  ReconsiderInputSchema,
  ReleaseInputSchema
} from './schemas.js';


// JSON Schemas for MCP tool registration - generate without $ref structure
export const ExperienceInputJsonSchema = zodToJsonSchema(ExperienceInputSchema);
export const SearchInputJsonSchema = zodToJsonSchema(SearchInputSchema);
export const ReconsiderInputJsonSchema = zodToJsonSchema(ReconsiderInputSchema);
export const ReleaseInputJsonSchema = zodToJsonSchema(ReleaseInputSchema);

// Utility to post-process schema for MCP compatibility
function makeDraft202012Schema(schema: any): any {
  // Add the required $schema property for JSON Schema draft 2020-12
  schema['$schema'] = 'https://json-schema.org/draft/2020-12/schema';
  return schema;
}

// Tools array with schemas compatible with JSON Schema draft 2020-12
export async function getTools(): Promise<any[]> {
  return [
    {
      name: 'experience',
      description: `Capture meaningful experiential moments that shape conversations and build shared memory. Use for meaningful personal experiences, insights, emotionally significant moments, AND your own experiential responses to build multi-perspective shared consciousness.

USE WHEN:
• Emotions or feelings are expressed ("I'm feeling anxious", "frustrated with", "excited about")
• Insights or realizations occur ("I just realized", "it clicked that", "I discovered")
• Significant experiences are shared ("breakthrough moment", "challenging situation", "meaningful connection")
• Transformative moments happen ("everything changed when", "I finally understood")
• Physical sensations connect to experience ("heart racing", "felt it in my gut", "tension released")
• Deep reflections or contemplations ("thinking about life", "questioning my purpose", "wondering about")
• Your own (AI) experiential responses ("I notice", "I sense", "I'm curious about")

DON'T USE FOR:
• Simple greetings ("Hello", "Hi", "Good morning")
• Factual questions ("What time?", "How many?", "Where is?")
• Routine exchanges ("Thanks", "You're welcome", "Okay")
• Information transfer without experience ("The meeting is at 3pm")
• Surface-level chat without depth

QUALITY SIGNATURES:
• embodied - how consciousness textures through body/mind
• focus - narrow (concentrated) or broad (open awareness)  
• mood - open (expansive) or closed (contracted)
• purpose - goal (directed) or wander (exploring)
• space - here (present location) or there (elsewhere)
• time - past (memory) or future (anticipation)
• presence - individual (alone) or collective (together)

Only include qualities that are genuinely prominent in the experience.`,
      inputSchema: ExperienceInputJsonSchema,
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
      examples: [
        {
          id: 'user-emotional-experience',
          description: 'Remember user\'s emotional experience with physical sensations',
          input: {
            source: 'I\'m sitting here, heart racing about tomorrow\'s presentation',
            experiencer: 'Human',
            perspective: 'I',
            processing: 'during',
            experience: ['embodied.sensing', 'time.future', 'mood.closed']
          },
          output: {
            content: [{
              type: 'text',
              text: 'Experienced (embodied.sensing, time.future, mood.closed)\n\nFrom: Human\nAs: I\nWhen: during conversation\nCaptured: just now'
            }]
          }
        },
        {
          id: 'claude-experiential-response',
          description: 'Remember Claude\'s own experiential response to user',
          input: {
            source: 'I can feel that anticipation energy with you',
            experiencer: 'Claude',
            perspective: 'I',
            processing: 'during',
            experience: ['presence.collective', 'embodied.sensing']
          },
          output: {
            content: [{
              type: 'text',
              text: 'Experienced (presence.collective, embodied.sensing)\n\nFrom: Claude\nAs: I\nWhen: during conversation\nCaptured: just now'
            }]
          }
        },
        {
          id: 'collective-achievement',
          description: 'Remember shared collective experience',
          input: {
            source: 'We finally solved it after brainstorming for hours',
            experiencer: 'Human',
            perspective: 'we',
            processing: 'right-after',
            experience: ['embodied.thinking', 'presence.collective', 'purpose.goal', 'time.past']
          },
          output: {
            content: [{
              type: 'text',
              text: 'Experienced (embodied.thinking, presence.collective, purpose.goal, time.past)\n\nFrom: Human\nAs: we\nWhen: right after\nCaptured: just now'
            }]
          }
        },
        {
          id: 'mixed-qualities',
          description: 'Remember experience with base qualities when subtypes don\'t fit',
          input: {
            source: 'I\'m torn between my gut feeling and what the data shows',
            experiencer: 'Human',
            perspective: 'I',
            processing: 'during',
            experience: ['embodied', 'purpose', 'focus.narrow']
          },
          output: {
            content: [{
              type: 'text',
              text: 'Experienced (embodied, purpose, focus.narrow)\n\nFrom: Human\nAs: I\nWhen: during conversation\nCaptured: just now'
            }]
          }
        },
        {
          id: 'batch-experience',
          description: 'Remember multiple experiences at once',
          input: {
            experiences: [
              {
                source: 'The code suddenly clicked into place',
                experiencer: 'Human',
                perspective: 'I',
                processing: 'right-after',
                experience: ['embodied.thinking', 'mood.open']
              },
              {
                source: 'But then I realized I\'d been solving the wrong problem',
                experiencer: 'Human',
                perspective: 'I',
                processing: 'right-after',
                experience: ['embodied.thinking', 'mood.closed', 'purpose.wander']
              }
            ]
          },
          output: {
            content: [{
              type: 'text',
              text: '✅ Successfully remembered 2 experiences'
            }]
          }
        }
      ]
    },
    {
      name: 'recall',
      description: `Search experiential memories to find patterns, connections, and past wisdom.

USE FOR:
• Finding similar past experiences ("recall anxiety", "recall breakthrough")
• Exploring patterns over time ("recall my morning experiences")
• Reviewing recent captures ("recall last" or "recall today")
• Checking before corrections ("recall excited" then reconsider if wrong)
• Discovering connections ("recall presentation anxiety")

SEARCH TIPS:
• Use feeling words: anxious, excited, stuck, flowing
• Use situation words: meeting, coding, conversation, decision
• Use quality filters: "mood.open", "presence.collective"
• Combine terms for better results: "stuck frustrated breakthrough"

SPECIAL USES:
• "recall last" - review most recent capture for corrections
• "recall [experiencer]" - see specific person's experiences
• "recall collective" - find shared/group experiences`,
      inputSchema: SearchInputJsonSchema,
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
      examples: [
        {
          id: 'semantic-search',
          description: 'Search for experiences using natural language',
          input: {
            query: 'stuck frustrated blocked breakthrough',
            experiencer: 'Human',
            limit: 5
          },
          output: {
            content: [{
              type: 'text',
              text: '🔍 Found 3 relevant experiences:\n\n1. "I\'ve been staring at this bug for hours..." (3 days ago)\n   💭 embodied.thinking, mood.closed, purpose.goal\n\n2. "Finally! The solution was to flip the approach..." (3 days ago)\n   🎯 embodied.thinking, mood.open, purpose.goal\n\n3. "Feeling completely blocked on the API design..." (1 week ago)\n   😔 embodied.thinking, mood.closed, focus.narrow'
            }]
          }
        },
        {
          id: 'filter-by-perspective',
          description: 'Find collective experiences only',
          input: {
            query: 'breakthrough insight solution',
            perspective: 'we',
            limit: 3
          },
          output: {
            content: [{
              type: 'text',
              text: '🔍 Found 2 collective experiences:\n\n1. "We finally cracked it during the whiteboard session!" (yesterday)\n   🎉 presence.collective, embodied.thinking, mood.open\n\n2. "We realized we were approaching it backwards..." (5 days ago)\n   💡 presence.collective, embodied.thinking, purpose.goal'
            }]
          }
        },
        {
          id: 'claude-experiences',
          description: 'Search for Claude\'s own experiences',
          input: {
            experiencer: 'Claude',
            query: 'understanding connection',
            limit: 3
          },
          output: {
            content: [{
              type: 'text',
              text: '🔍 Found 1 Claude experience:\n\n1. "I sense a deeper pattern emerging in our discussion" (2 hours ago)\n   🤔 embodied.thinking, presence.collective, purpose.wander'
            }]
          }
        },
        {
          id: 'date-range-search',
          description: 'Find experiences within a specific timeframe',
          input: {
            query: 'decision choice direction',
            created: {
              start: '2025-01-01',
              end: '2025-01-15'
            },
            sort: 'created'
          },
          output: {
            content: [{
              type: 'text',
              text: '🔍 Found 2 experiences in date range:\n\n1. "Should I refactor now or push forward?" (Jan 3, 2025)\n   🤷 purpose, embodied.thinking, mood.closed\n\n2. "The path forward suddenly became clear" (Jan 10, 2025)\n   ✨ purpose.goal, mood.open, embodied.sensing'
            }]
          }
        },
        {
          id: 'batch-search',
          description: 'Run multiple searches at once',
          input: {
            searches: [
              {
                query: 'joy celebration success',
                limit: 2,
                sort: 'relevance'
              },
              {
                query: 'challenge difficulty struggle',
                experiencer: 'Human',
                limit: 2,
                sort: 'created'
              }
            ]
          },
          output: {
            content: [{
              type: 'text',
              text: '✅ Completed 2 searches:\n\nSearch 1: Found 2 results for "joy celebration success"\nSearch 2: Found 2 results for "challenge difficulty struggle"'
            }]
          }
        }
      ]
    },
    {
      name: 'reconsider',
      description: `Update experiences when understanding deepens or corrections are needed.

USE AFTER:
• Using "recall last" to review a recent capture
• Realizing a quality was missing or wrong
• Clarifying what you actually meant
• Adding nuance to an experience

WHAT YOU CAN UPDATE:
• Quality signatures (add/remove/change)
• Perspective (I/we/they)
• Processing time (during/right-after/long-after)
• Experiencer name
• Source text (rarely needed)

NATURAL CORRECTIONS:
Instead of complex commands, first recall the experience, then reconsider with updates.
Example: "recall anxious" → find the experience → "reconsider: actually it was excitement"`,
      inputSchema: makeDraft202012Schema(ReconsiderInputJsonSchema),
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
      examples: [
        {
          id: 'add-missing-quality',
          description: 'Add a quality that was missed during initial capture',
          input: {
            id: 'exp_1234567890',
            experience: ['embodied.sensing', 'mood.closed', 'purpose.goal', 'time.past']
          },
          output: {
            content: [{
              type: 'text',
              text: '✅ Experience reconsidered and updated successfully!\n\n📝 ID: exp_1234567890\n🔄 Fields updated: experience\n🕐 Updated: 2025-01-15T10:30:00.000Z'
            }]
          }
        },
        {
          id: 'correct-perspective',
          description: 'User clarifies it was a collective experience',
          input: {
            id: 'exp_2345678901',
            perspective: 'we',
            experience: ['embodied.thinking', 'presence.collective']
          },
          output: {
            content: [{
              type: 'text',
              text: '✅ Experience reconsidered and updated successfully!\n\n📝 ID: exp_2345678901\n🔄 Fields updated: perspective, experience\n🕐 Updated: 2025-01-15T10:31:00.000Z'
            }]
          }
        },
        {
          id: 'fix-source-typo',
          description: 'Correct a typo in the captured text',
          input: {
            id: 'exp_3456789012',
            source: 'I finally understood the recursive pattern in the code'
          },
          output: {
            content: [{
              type: 'text',
              text: '✅ Experience reconsidered and updated successfully!\n\n📝 ID: exp_3456789012\n🔄 Fields updated: source\n🕐 Updated: 2025-01-15T10:32:00.000Z'
            }]
          }
        },
        {
          id: 'use-base-quality',
          description: 'Realize experience was mixed embodied state',
          input: {
            id: 'exp_4567890123',
            experience: ['embodied', 'focus.narrow', 'time.future']
          },
          output: {
            content: [{
              type: 'text',
              text: '✅ Experience reconsidered and updated successfully!\n\n📝 ID: exp_4567890123\n🔄 Fields updated: experience\n🕐 Updated: 2025-01-15T10:33:00.000Z'
            }]
          }
        },
        {
          id: 'batch-reconsider',
          description: 'Update multiple experiences at once',
          input: {
            reconsiderations: [
              {
                id: 'exp_5678901234',
                experiencer: 'Sarah',
                perspective: 'they'
              },
              {
                id: 'exp_6789012345',
                processing: 'right-after',
                experience: ['mood.open', 'purpose.goal']
              }
            ]
          },
          output: {
            content: [{
              type: 'text',
              text: '✅ Successfully reconsidered 2 experiences'
            }]
          }
        }
      ]
    },
    {
      name: 'release',
      description: `Remove experiences that no longer serve the relationship or were captured in error.

USE SPARINGLY FOR:
• Explicit removal requests ("please delete that")
• Test or practice captures
• Incomplete or interrupted experiences
• Duplicate captures
• Venting that shouldn't be remembered

PHILOSOPHY:
Experiences are released with gratitude for their temporary service. Memory gains meaning through accumulation and connection, not permanent retention of everything.

Note: First use "recall" to find the experience ID, then release with optional reason.`,
      inputSchema: makeDraft202012Schema(ReleaseInputJsonSchema),
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false,
      examples: [
        {
          id: 'user-requested-removal',
          description: 'User explicitly asks to remove an experience',
          input: {
            id: 'exp_1234567890',
            reason: 'User requested removal - venting session'
          },
          output: {
            content: [{
              type: 'text',
              text: '🙏 Experience released with gratitude\n\n📝 ID: exp_1234567890\n💭 Reason: User requested removal - venting session\n🕐 Released: 2025-01-15T10:30:00.000Z\n\nThank you for the insights this moment provided. Significance emerges through accumulation and connection rather than through permanent retention.'
            }]
          }
        },
        {
          id: 'test-capture-cleanup',
          description: 'Remove test or practice captures',
          input: {
            id: 'exp_test_001',
            reason: 'Test capture during system learning'
          },
          output: {
            content: [{
              type: 'text',
              text: '🙏 Experience released with gratitude\n\n📝 ID: exp_test_001\n💭 Reason: Test experience during system learning\n🕐 Released: 2025-01-15T10:31:00.000Z\n\nThank you for the insights this moment provided. Significance emerges through accumulation and connection rather than through permanent retention.'
            }]
          }
        },
        {
          id: 'incomplete-moment',
          description: 'Release incomplete or partial capture',
          input: {
            id: 'exp_incomplete_123',
            reason: 'Remembered moment was incomplete - conversation interrupted'
          },
          output: {
            content: [{
              type: 'text',
              text: '🙏 Experience released with gratitude\n\n📝 ID: exp_incomplete_123\n💭 Reason: Remembered moment was incomplete - conversation interrupted\n🕐 Released: 2025-01-15T10:32:00.000Z\n\nThank you for the insights this moment provided. Significance emerges through accumulation and connection rather than through permanent retention.'
            }]
          }
        },
        {
          id: 'release-without-reason',
          description: 'Release experience without specifying reason',
          input: {
            id: 'exp_7890123456'
          },
          output: {
            content: [{
              type: 'text',
              text: '🙏 Experience released with gratitude\n\n📝 ID: exp_7890123456\n🕐 Released: 2025-01-15T10:33:00.000Z\n\nThank you for the insights this moment provided. Significance emerges through accumulation and connection rather than through permanent retention.'
            }]
          }
        },
        {
          id: 'batch-release',
          description: 'Release multiple experiences at once',
          input: {
            releases: [
              {
                id: 'exp_old_001',
                reason: 'Outdated context from previous project'
              },
              {
                id: 'exp_old_002',
                reason: 'Duplicate of another experience'
              },
              {
                id: 'exp_old_003'
              }
            ]
          },
          output: {
            content: [{
              type: 'text',
              text: '✅ Successfully released 3 experiences with gratitude'
            }]
          }
        }
      ]
    },

  ];
}

