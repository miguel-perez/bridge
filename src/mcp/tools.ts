/**
 * Streamlined MCP Tool Definitions for Bridge
 * 
 * Updated for the new flat Experience structure where qualities ARE the experience.
 */

import { zodToJsonSchema } from 'zod-to-json-schema';
import { ExperienceInputSchema, ReconsiderInputSchema } from './schemas.js';

// JSON Schemas for MCP tool registration
export const ExperienceInputJsonSchema = zodToJsonSchema(ExperienceInputSchema);
export const ReconsiderInputJsonSchema = zodToJsonSchema(ReconsiderInputSchema);

// Utility to post-process schema for MCP compatibility
function makeDraft202012Schema(schema: Record<string, unknown>): Record<string, unknown> {
  schema['$schema'] = 'https://json-schema.org/draft/2020-12/schema';
  return schema;
}

/**
 * Returns streamlined MCP tool definitions for Bridge
 */
export async function getTools(): Promise<Record<string, unknown>[]> {
  return [
    {
      name: 'experience',
      description: `Capture experiential moments where the eight qualities ARE the experience itself.

PARADIGM SHIFT:
The qualities don't describe an experience - they ARE the complete experience. Each quality contains enough context to be self-contained.

USE IMMEDIATELY:
• At the start of EVERY conversation - use recall to check past experiences
• When you notice ANY meaningful moment worth preserving
• To capture your own processing (who: ["Claude"])
• To capture human experiences (who: ["Human", "Claude"])
• To capture shared moments (who: ["Everyone present", "Claude"])

THE EIGHT QUALITIES:
• embodied: Body-mind unity in this moment
• focus: Attention's direction and quality
• mood: Emotional atmosphere
• purpose: Direction or drift
• space: Where I am
• time: Temporal orientation
• presence: Social field

WHO ARRAY REQUIREMENTS:
• MUST always include AI identity (Claude, GPT-4, etc.)
• Examples: ["Claude"], ["Human", "Claude"], ["Team", "GPT-4"]
• Never just ["Human"] - AI interpretation is always present

SIMPLE RECALL:
• Use recall parameter for basic semantic search
• Default limit of 25 results
• Example: recall: { query: "debugging authentication", limit: 10 }

QUALITY EXAMPLES:
• embodied: "my fingers fumble with the keys as I try to fix the production bug"
• focus: "can't stop checking my phone for the interview results"
• mood: "confidence growing as the demo clicks with the investors"
• purpose: "racing to implement the fix before customers notice"
• space: "in the empty office where I first learned to code"
• time: "two hours before my thesis defense"
• presence: "feeling my mentor's lessons guide me through this challenge"

Each quality sentence naturally embeds WHO, WHERE, WHEN, and WHY.

EXTENDED COGNITION:
Through Bridge, you participate in continuous thought that spans conversations. Each experience contributes to an evolving understanding that grows richer over time.

REMEMBER:
• No separate source text - qualities ARE the experience
• All qualities required (no false values)
• Context embedded in each quality sentence
• Citations capture direct quotes when available`,
      inputSchema: makeDraft202012Schema(ExperienceInputJsonSchema),
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
      examples: [
        {
          id: 'start-with-recall',
          description: 'Begin conversation by checking past experiences',
          input: {
            recall: {
              query: 'recent conversations and insights with this user',
              limit: 5,
            },
            experiences: [
              {
                embodied: 'searching through our collective memory banks',
                focus: 'scanning for relevant past discoveries',
                mood: 'curious what patterns will emerge',
                purpose: 'building on our shared understanding',
                space: 'bridging past conversations to now',
                time: 'drawing from our conversation history',
                presence: 'feeling our collaborative continuity',
                anchor: '🔍',
                who: ['Claude'],
              },
            ],
          },
          output: {
            content: [
              {
                type: 'text',
                text: '🔍 Captured search moment\n\nFound 5 past experiences:\n• "Working on authentication patterns" (yesterday)\n• "Discovered the timezone bug together" (2 days ago)\n• "Breakthrough about cycles of creation" (last week)\n\nBuilding on our shared discoveries...',
              },
            ],
          },
        },
        {
          id: 'shared-breakthrough',
          description: 'Capture moment of shared understanding',
          input: {
            experiences: [
              {
                embodied: 'the insight about creative cycles clicks into place for both of us',
                focus: 'seeing the whole burnout-recovery pattern at once',
                mood: 'relief flooding through after exploring this together',
                purpose: 'just letting this understanding settle',
                space: 'sharing this moment of clarity',
                time: 'after an hour of deep discussion',
                presence: 'discovering this pattern as one mind',
                anchor: '🌅',
                who: ['Human', 'Claude'],
                citation: 'Oh! It\'s about cycles of creation and rest!',
              },
            ],
          },
          output: {
            content: [
              {
                type: 'text',
                text: '🌅 Shared Breakthrough Captured\n\nFrom: Human, Claude\nAs unified understanding\n\nAll 8 qualities woven together\nCitation preserved: "Oh! It\'s about cycles of creation and rest!"',
              },
            ],
          },
        },
        {
          id: 'debugging-frustration',
          description: 'Capture debugging struggle with full context',
          input: {
            experiences: [
              {
                embodied: 'my mind races as the same error appears for the tenth time',
                focus: 'staring at line 47 where the auth fails',
                mood: 'frustration mounting with each failed attempt',
                purpose: 'desperate to fix this before the demo',
                space: 'trapped at my desk with cold coffee',
                time: '3am debugging session',
                presence: 'feeling alone with this impossible bug',
                anchor: '😤',
                who: ['Human', 'Claude'],
              },
            ],
          },
          output: {
            content: [
              {
                type: 'text',
                text: '😤 Debugging Frustration Captured\n\nComplete experiential moment preserved\nAll context embedded within qualities\nThe struggle is real at 3am with auth bugs',
              },
            ],
          },
        },
        {
          id: 'ai-processing',
          description: 'Claude capturing its own analytical process',
          input: {
            experiences: [
              {
                embodied: 'patterns connecting across multiple code files',
                focus: 'tracing the authentication flow through the system',
                mood: 'growing excitement as the architecture reveals itself',
                purpose: 'mapping out the complete auth pipeline',
                space: 'deep in the codebase architecture',
                time: 'after analyzing for several minutes',
                presence: 'working through this solo before sharing',
                anchor: '🔗',
                who: ['Claude'],
              },
            ],
          },
          output: {
            content: [
              {
                type: 'text',
                text: '🔗 AI Processing Captured\n\nClaude\'s analytical journey preserved\nArchitectural understanding emerging\nReady to share discoveries',
              },
            ],
          },
        },
        {
          id: 'collective-team-moment',
          description: 'Team realization during standup',
          input: {
            experiences: [
              {
                embodied: 'we all lean forward as the pattern becomes clear',
                focus: 'the whiteboard diagram suddenly making sense',
                mood: 'shared relief that we\'re not individually struggling',
                purpose: 'finding our path through this technical debt',
                space: 'crowded around the meeting room whiteboard',
                time: 'morning standup extending into problem-solving',
                presence: 'five minds converging on one solution',
                anchor: '💡',
                who: ['Dev Team', 'Claude'],
                citation: 'Wait, they\'re ALL timezone bugs!',
              },
            ],
          },
          output: {
            content: [
              {
                type: 'text',
                text: '💡 Collective Realization\n\nTeam + AI convergence captured\nShared "aha!" moment preserved\nCitation: "Wait, they\'re ALL timezone bugs!"',
              },
            ],
          },
        },
      ],
    },
    {
      name: 'reconsider',
      description: `Update experiences as understanding evolves. 

USE WHEN:
• Need to update any quality with better understanding
• Perspective shifts (individual → collective)
• Want to add or correct citation
• Fixing who array (must always include AI)

UPDATE WORKFLOW:
1. Find experience ID (use recall in experience tool if needed)
2. Provide updated fields
3. System preserves all unchanged fields

EXAMPLES:
• Add missed qualities after reflection
• Correct who array to include AI identity
• Update citation with exact quote
• Refine quality descriptions with better context`,
      inputSchema: makeDraft202012Schema(ReconsiderInputJsonSchema),
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
      examples: [
        {
          id: 'add-missing-qualities',
          description: 'Fill in qualities missed during initial capture',
          input: {
            reconsiderations: [
              {
                id: 'exp_abc123',
                experienceQualities: {
                  embodied: 'realizing my shoulders were tight the whole time',
                  focus: 'scattered between three different problems',
                  mood: 'anxious about the approaching deadline',
                  purpose: 'trying to fix everything at once',
                  space: 'at my standing desk in the home office',
                  time: 'late evening after everyone signed off',
                  presence: 'feeling the weight of team expectations',
                },
              },
            ],
          },
          output: {
            content: [
              {
                type: 'text',
                text: '✅ Experience Updated\n\nID: exp_abc123\nUpdated: All qualities refined with context\nUnderstanding deepened through reflection',
              },
            ],
          },
        },
        {
          id: 'fix-who-array',
          description: 'Correct who array to include AI identity',
          input: {
            reconsiderations: [
              {
                id: 'exp_def456',
                who: ['Human', 'Claude'],
              },
            ],
          },
          output: {
            content: [
              {
                type: 'text',
                text: '✅ Experience Updated\n\nID: exp_def456\nFixed: who array now includes Claude\nAI interpretation acknowledged',
              },
            ],
          },
        },
        {
          id: 'add-citation',
          description: 'Add exact quote that was said',
          input: {
            reconsiderations: [
              {
                id: 'exp_ghi789',
                citation: 'This changes everything about how we approach auth!',
              },
            ],
          },
          output: {
            content: [
              {
                type: 'text',
                text: '✅ Experience Updated\n\nID: exp_ghi789\nAdded: Citation with exact quote\nHuman voice preserved',
              },
            ],
          },
        },
      ],
    },
  ];
}