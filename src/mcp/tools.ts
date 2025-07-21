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
      description: `Remember experiential moments that shape conversations and build shared memory. Captures authentic experiences with quality signatures for both human and AI perspectives.

USE WHEN:
• Someone shares how they're feeling or what they're experiencing emotionally
• Insights, realizations, or breakthroughs occur in conversation
• Physical sensations connect to mental/emotional states
• Moments of struggle, challenge, or triumph are described
• Reflections on past experiences or future concerns arise
• Patterns or connections become clear
• You (as AI) notice experiential qualities in the interaction itself

EXAMPLES OF WHEN TO USE:
• "The code finally compiled after hours of debugging!" → embodied.thinking, mood.open
• "I'm nervous about tomorrow's presentation" → embodied.sensing, time.future
• "We figured it out together" → presence.collective, purpose.goal
• "I've been feeling stuck lately" → mood.closed, purpose.wander
• "That moment when everything clicked" → embodied.thinking, focus.broad

DON'T USE FOR:
• Basic greetings or farewells
• Simple factual questions or answers
• Routine acknowledgments without experiential content
• Pure information exchange without emotional context
• Surface-level pleasantries

QUALITY SIGNATURES:
• embodied - how consciousness textures through body/mind
• focus - narrow (concentrated) or broad (open awareness)  
• mood - open (expansive) or closed (contracted)
• purpose - goal (directed) or wander (exploring)
• space - here (present location) or there (elsewhere)
• time - past (memory) or future (anticipation)
• presence - individual (alone) or collective (together)

Only include qualities that genuinely stand out in the experience.`,
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
        },
        {
          id: 'pattern-realization',
          description: 'Create a pattern realization that reflects on multiple experiences',
          input: {
            source: 'I notice I always feel anxious before things that end up going well',
            experiencer: 'Human',
            perspective: 'I',
            processing: 'long-after',
            experience: ['embodied.thinking', 'mood.open', 'time.past'],
            reflects: ['exp_123', 'exp_456']
          },
          output: {
            content: [{
              type: 'text',
              text: 'Experienced (embodied.thinking, mood.open, time.past)\n\nFrom: Human\nAs: I\nWhen: long after\nCaptured: just now\n🔗 Reflects on: exp_123, exp_456'
            }]
          }
        }
      ]
    },
    {
      name: 'recall',
      description: `Search shared memories to find patterns, connections, and past wisdom across all experiences.

USE WHEN YOU WANT TO:
• Find similar past experiences to what's happening now
• Look for patterns in how someone typically responds
• Check what was captured before making corrections
• Explore connections between different moments
• Reference specific past conversations
• Understand someone's journey over time

SEARCH APPROACHES:
• Natural language: "stuck frustrated breakthrough"
• Emotional themes: "anxiety confidence transformation"
• Situations: "debugging presentation teamwork"
• Quality patterns: Search by specific qualities
• Time-based: Recent experiences or date ranges

SPECIAL SEARCHES:
• Query "last" or "recent" - see most recent captures
• Filter by experiencer - find specific person's experiences  
• Filter by perspective - find "we" moments vs "I" moments
• Filter by reflects: "only" - find pattern realizations (experiences that reflect on other experiences)
• Natural language patterns: "show me all pattern realizations" → use reflects: "only"
• Natural language patterns: "find insights about connections" → use reflects: "only"
• Combine filters for precise results`,
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
        },
        {
          id: 'pattern-realizations',
          description: 'Find all pattern realizations (experiences that reflect on other experiences)',
          input: {
            reflects: 'only',
            limit: 5
          },
          output: {
            content: [{
              type: 'text',
              text: '🔍 Found 2 pattern realizations:\n\n1. "I notice I always feel anxious before things that end up going well" (2 hours ago)\n   💡 embodied.thinking, mood.open, time.past\n   🔗 Reflects on: exp_123, exp_456\n\n2. "There\'s a pattern where my mood.closed experiences often precede mood.open breakthroughs" (1 day ago)\n   🤔 embodied.thinking, presence.collective\n   🔗 Reflects on: exp_789, exp_101'
            }]
          }
        },
        {
          id: 'natural-language-patterns',
          description: 'Natural language request for pattern realizations',
          input: {
            reflects: 'only',
            query: 'pattern realizations insights connections'
          },
          output: {
            content: [{
              type: 'text',
              text: '🔍 Found 3 pattern realizations:\n\n1. "I notice I always feel anxious before things that end up going well" (2 hours ago)\n   💡 embodied.thinking, mood.open, time.past\n   🔗 Reflects on: exp_123, exp_456\n\n2. "There\'s a pattern where my mood.closed experiences often precede mood.open breakthroughs" (1 day ago)\n   🤔 embodied.thinking, presence.collective\n   🔗 Reflects on: exp_789, exp_101\n\n3. "I see how my learning follows a cycle of confusion → practice → clarity" (3 days ago)\n   🎯 embodied.thinking, time.past, purpose.goal\n   🔗 Reflects on: exp_202, exp_303'
            }]
          }
        },
        {
          id: 'reflected-by-filter',
          description: 'Find experiences that are reflected by specific pattern realizations',
          input: {
            reflected_by: 'exp_123',
            limit: 5
          },
          output: {
            content: [{
              type: 'text',
              text: '🔍 Found 2 experiences reflected by exp_123:\n\n1. "I\'m feeling anxious about tomorrow\'s presentation" (2 hours ago)\n   😰 embodied.sensing, mood.closed, time.future\n\n2. "I just nailed the presentation! It went really well" (1 hour ago)\n   🎉 mood.open, purpose.goal, embodied.sensing'
            }]
          }
        }
      ]
    },
    {
      name: 'reconsider',
      description: `Update existing experiences when understanding deepens or corrections are needed.

USE WHEN:
• You realize a captured experience was missing important qualities
• Understanding of a moment has evolved with reflection
• Someone clarifies what they actually meant
• A quality signature needs adjustment
• Perspective was recorded incorrectly (I vs we)
• Processing time has shifted (during → long-after)

NATURAL WORKFLOW:
1. Use recall to find the experience
2. Note what needs updating
3. Use reconsider with the experience ID and changes

COMMON UPDATES:
• Adding missed qualities that were actually prominent
• Switching from subtype to base when mixed (embodied.thinking → embodied)
• Correcting perspective after realizing it was shared
• Updating experiencer name if initially unclear`,
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
      description: `Remove experiences that no longer serve or were captured in error.

USE SPARINGLY WHEN:
• Someone explicitly asks to delete something they shared
• Test experiences during system learning
• Duplicate or incomplete captures
• Interrupted conversations that didn't complete
• Moments shared in confidence that shouldn't persist

NATURAL WORKFLOW:
1. Use recall to find what needs releasing
2. Confirm it's the right experience
3. Release with optional reason

PHILOSOPHY:
Not everything needs permanent retention. Sometimes releasing creates space for new growth. Experiences are released with gratitude for their temporary service to the relationship.`,
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

