import { z } from 'zod';

// Enums
export const PerspectiveEnum = z
  .enum(['I', 'we', 'you', 'they'])
  .describe(
    'Perspective from which experience is experienceed: I (first person), we (collective), you (second person), they (third person)'
  );
export const ProcessingEnum = z
  .enum(['during', 'right-after', 'long-after'])
  .describe(
    'When processing occurred: during (real-time), right-after (immediate), long-after (retrospective)'
  );
// Remove 'crafted' from ProcessingEnumWithCrafted
export const ProcessingEnumWithCrafted = ProcessingEnum; // For compatibility, but no 'crafted'
// Simplified quality types for experiential qualities
export const QualityTypeEnum = z.enum([
  'embodied',
  'focus',
  'mood',
  'purpose',
  'space',
  'time',
  'presence',
]).describe(`
The experiential quality being analyzed:

- embodied: How consciousness textures through physicality (thinking/sensing)
- focus: Direction and quality of awareness (narrow/broad)
- mood: Emotional coloring of experience (open/closed)
- purpose: Directedness or drift of the moment (goal/wander)
- space: Lived sense of place and position (here/there)
- time: How past and future inhabit the present (past/future)
- presence: How others' presence or absence matters (individual/collective)

Choose qualities that emerge prominently in this moment. Following the principle: "qualities emerge prominently or recede."
`);
export const SortEnum = z.enum(['relevance', 'created']).describe('Sort order for results');

// Quality Filter Schema for sophisticated filtering
// Quality Filter Schema for sophisticated filtering
export const QualityFilterSchema = z
  .object({
    // Presence/Absence filtering
    embodied: z
      .union([
        z
          .object({ present: z.boolean() })
          .describe('Filter by presence/absence of embodied qualities'),
        z.string().describe('Filter for specific embodied quality (e.g., "thinking", "sensing")'),
        z.array(z.string()).describe('Filter for multiple embodied qualities (OR logic)'),
      ])
      .optional(),
    focus: z
      .union([
        z
          .object({ present: z.boolean() })
          .describe('Filter by presence/absence of focus qualities'),
        z.string().describe('Filter for specific focus quality (e.g., "narrow", "broad")'),
        z.array(z.string()).describe('Filter for multiple focus qualities (OR logic)'),
      ])
      .optional(),
    mood: z
      .union([
        z.object({ present: z.boolean() }).describe('Filter by presence/absence of mood qualities'),
        z.string().describe('Filter for specific mood quality (e.g., "open", "closed")'),
        z.array(z.string()).describe('Filter for multiple mood qualities (OR logic)'),
      ])
      .optional(),
    purpose: z
      .union([
        z
          .object({ present: z.boolean() })
          .describe('Filter by presence/absence of purpose qualities'),
        z.string().describe('Filter for specific purpose quality (e.g., "goal", "wander")'),
        z.array(z.string()).describe('Filter for multiple purpose qualities (OR logic)'),
      ])
      .optional(),
    space: z
      .union([
        z
          .object({ present: z.boolean() })
          .describe('Filter by presence/absence of space qualities'),
        z.string().describe('Filter for specific space quality (e.g., "here", "there")'),
        z.array(z.string()).describe('Filter for multiple space qualities (OR logic)'),
      ])
      .optional(),
    time: z
      .union([
        z.object({ present: z.boolean() }).describe('Filter by presence/absence of time qualities'),
        z.string().describe('Filter for specific time quality (e.g., "past", "future")'),
        z.array(z.string()).describe('Filter for multiple time qualities (OR logic)'),
      ])
      .optional(),
    presence: z
      .union([
        z
          .object({ present: z.boolean() })
          .describe('Filter by presence/absence of presence qualities'),
        z
          .string()
          .describe('Filter for specific presence quality (e.g., "individual", "collective")'),
        z.array(z.string()).describe('Filter for multiple presence qualities (OR logic)'),
      ])
      .optional(),
  })
  .describe(
    'Sophisticated quality filtering with presence/absence filtering and OR logic within qualities'
  );

// Perspective field - avoid union to prevent anyOf with $ref issues
export const PerspectiveField = z
  .string()
  .min(1)
  .describe(
    'Perspective from which experience is experienceed (e.g., I, we, you, they, or custom perspectives)'
  );

// Experience qualities schema - complete switchboard
export const ExperienceQualitiesSchema = z.object({
  embodied: z
    .union([z.literal(false), z.literal(true), z.literal('thinking'), z.literal('sensing')])
    .describe('Embodied experience: false (not prominent), true (mixed), thinking, or sensing'),
  focus: z
    .union([z.literal(false), z.literal(true), z.literal('narrow'), z.literal('broad')])
    .describe('Focus quality: false (not prominent), true (mixed), narrow, or broad'),
  mood: z
    .union([z.literal(false), z.literal(true), z.literal('open'), z.literal('closed')])
    .describe('Mood quality: false (not prominent), true (mixed), open, or closed'),
  purpose: z
    .union([z.literal(false), z.literal(true), z.literal('goal'), z.literal('wander')])
    .describe('Purpose quality: false (not prominent), true (mixed), goal, or wander'),
  space: z
    .union([z.literal(false), z.literal(true), z.literal('here'), z.literal('there')])
    .describe('Space quality: false (not prominent), true (mixed), here, or there'),
  time: z
    .union([z.literal(false), z.literal(true), z.literal('past'), z.literal('future')])
    .describe('Time quality: false (not prominent), true (mixed), past, or future'),
  presence: z
    .union([z.literal(false), z.literal(true), z.literal('individual'), z.literal('collective')])
    .describe('Presence quality: false (not prominent), true (mixed), individual, or collective'),
}).describe(`Complete switchboard of experiential qualities. Each quality can be:
- false: not prominent (receded)
- true: prominent but general/mixed
- string subtype: prominent with specific quality

Quality detection guide:
- embodied.thinking: "analyzing", "figuring out", "strategy" → mental processing
- embodied.sensing: "feeling", "gut reaction", "tense" → body/emotion awareness
- embodied: When embodied experience doesn't clearly fit thinking/sensing subtypes

- focus.narrow: "concentrated", "tunnel vision" → single-task attention
- focus.broad: "overwhelmed", "juggling" → multi-task awareness
- focus: When attentional quality doesn't clearly fit narrow/broad subtypes

- mood.open: "excited", "curious", "flowing" → expansive emotional state
- mood.closed: "defensive", "shut down" → contracted emotional state
- mood: When emotional atmosphere doesn't clearly fit open/closed subtypes

- purpose.goal: "working toward", "trying to" → clear direction
- purpose.wander: "exploring", "seeing what happens" → curiosity-driven
- purpose: When purposive momentum doesn't clearly fit goal/wander subtypes

- space.here: "in this room", immediate environment → physically grounded
- space.there: "thinking about home" → spatially displaced
- space: When spatial experience doesn't clearly fit here/there subtypes

- time.past: "remembering", "used to" → historical orientation
- time.future: "planning", "worried about" → anticipatory orientation
- time: When temporal flow doesn't clearly fit past/future subtypes

- presence.individual: "just me", alone → solitary experience
- presence.collective: "we", "together" → social/shared experience
- presence: When social quality doesn't clearly fit individual/collective subtypes`);

// Experience analysis - switchboard format only
export const ExperienceObject =
  ExperienceQualitiesSchema.describe(`Experience qualities in switchboard format. All dimensions must be specified:
- embodied: 'thinking' | 'sensing' | false
- focus: 'narrow' | 'broad' | false  
- mood: 'open' | 'closed' | false
- purpose: 'goal' | 'wander' | false
- space: 'here' | 'there' | false
- time: 'past' | 'future' | false
- presence: 'individual' | 'collective' | false

Set to false for qualities not prominently present.`);

// Experience analysis (all fields optional for update)
export const ExperienceObjectOptional = ExperienceQualitiesSchema.describe(
  `Updated experience qualities in switchboard format. All dimensions must be specified:
- embodied: 'thinking' | 'sensing' | false
- focus: 'narrow' | 'broad' | false  
- mood: 'open' | 'closed' | false
- purpose: 'goal' | 'wander' | false
- space: 'here' | 'there' | false
- time: 'past' | 'future' | false
- presence: 'individual' | 'collective' | false

Set to false for qualities not prominently present.`
).optional();

// EXPERIENCE tool input - Array Only
const ExperienceItemSchema = z
  .object({
    source: z
      .string()
      .min(1)
      .describe(
        'Raw, exact words from the experiencer - their actual text/voice as written or spoken OR your own experiential observations. Do not summarize, interpret, or modify.'
      ),
    emoji: z
      .string()
      .refine(
        (val) => {
          // Comprehensive emoji validation for composite emojis
          if (!val || val.length === 0) return false;

          // Use Intl.Segmenter if available (modern browsers/Node.js)
          if (typeof Intl !== 'undefined' && Intl.Segmenter) {
            const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
            const segments = Array.from(segmenter.segment(val));

            // Must be exactly one grapheme cluster (visual character)
            if (segments.length !== 1) return false;

            // Check if the single grapheme contains emoji characters
            const segment = segments[0].segment;
            return /\p{Emoji}/u.test(segment);
          }

          // Fallback for older environments - comprehensive emoji regex
          // This pattern matches:
          // - Basic emojis: \p{Emoji}
          // - Variation selectors: \uFE0F
          // - Zero-width joiners: \u200D
          // - Skin tone modifiers: \p{Emoji_Modifier}
          // - Regional indicators: \p{Regional_Indicator}
          const comprehensiveEmojiRegex =
            /^(?:\p{Emoji}(?:\p{Emoji_Modifier}|\uFE0F|\u200D(?:\p{Emoji}(?:\p{Emoji_Modifier}|\uFE0F)?))*)+$/u;

          // Additional check: ensure it's not multiple separate emojis
          // Split by common emoji boundaries (space, etc) and check we only have one "unit"
          const trimmed = val.trim();
          if (trimmed !== val) return false; // No leading/trailing whitespace
          if (/\s/.test(val)) return false; // No internal whitespace

          return comprehensiveEmojiRegex.test(val);
        },
        {
          message:
            'Must be a single emoji (including compound emojis with modifiers, skin tones, and sequences)',
        }
      )
      .describe(
        'Single emoji that serves as a visual/memory anchor for this experience. Choose one that captures the essence or feeling.'
      ),
    perspective: PerspectiveField.optional(),
    who: z
      .union([
        z.string().describe('Single person who experienced this'),
        z.array(z.string()).describe('Multiple people who shared this experience'),
      ])
      .describe(
        'Who experienced this moment - single string for individual ("Human", "Claude", or name), array for shared experience (["Human", "Claude"])'
      )
      .optional(),
    processing: ProcessingEnum.optional(),
    crafted: z
      .boolean()
      .describe(
        'Whether this is crafted content (blog/refined for an audience) vs raw experience (journal/immediate)'
      )
      .optional(),
    experienceQualities: ExperienceObject,
    reflects: z
      .array(z.string())
      .describe(
        'Array of experience IDs that this experience reflects on/connects to (for pattern realizations)'
      )
      .optional(),
    context: z
      .string()
      .describe(
        'Optional background context to make this experience self-contained and comprehensible. Use when the source alone might lack necessary situational understanding. Keep brief and factual.'
      )
      .optional(),
  })
  .strict();

export const ExperienceInputSchema = z
  .object({
    experiences: z.array(ExperienceItemSchema).min(1).describe('Array of experiences to capture'),
    recall: z
      .object({
        // ID lookup
        ids: z
          .union([
            z.string().describe('Exact experience ID to fetch'),
            z.array(z.string()).describe('Array of exact experience IDs to fetch'),
          ])
          .optional(),
        // Semantic search
        search: z
          .union([
            z.string().describe('Semantic search query'),
            z.array(z.string()).describe('Array of search terms'),
          ])
          .optional(),
        // Quality filtering - using the full QualityFilterSchema
        qualities: QualityFilterSchema.optional(),
        // Pagination
        limit: z.number().describe('Maximum number of results').optional(),
        offset: z.number().describe('Number of results to skip').optional(),
        // Filters
        who: z.string().describe('Filter by who experienced').optional(),
        perspective: PerspectiveField.optional(),
        processing: ProcessingEnum.optional(),
        crafted: z.boolean().describe('Filter by crafted status').optional(),
        // Pattern filters
        reflects: z.enum(['only']).describe('Filter for pattern realizations only').optional(),
        reflected_by: z
          .union([
            z.string().describe('Find experiences reflected by this ID'),
            z.array(z.string()).describe('Find experiences reflected by these IDs'),
          ])
          .optional(),
        // Date filtering
        created: z
          .union([
            z.string().describe('Filter by specific date (YYYY-MM-DD)'),
            z
              .object({
                start: z.string().describe('Start date (YYYY-MM-DD)'),
                end: z.string().describe('End date (YYYY-MM-DD)'),
              })
              .describe('Date range'),
          ])
          .optional(),
        // Sorting and grouping
        sort: SortEnum.optional(),
        group_by: z
          .enum(['similarity', 'who', 'date', 'qualities', 'perspective', 'none'])
          .describe('Group results by criteria')
          .optional(),
      })
      .optional()
      .describe('Full-featured integrated recall with all standalone capabilities'),
    nextMoment: ExperienceQualitiesSchema.optional().describe(
      'What experiential state you intend to explore next in this reasoning chain'
    ),
  })
  .strict()
  .describe(
    'Input for capturing one or more experiences. Always use array format, even for single experiences.'
  );

// RECALL tool input - Array Only
const SearchItemSchema = z
  .object({
    ids: z
      .union([
        z.string().describe('Exact experience ID to fetch'),
        z.array(z.string()).describe('Array of exact experience IDs to fetch'),
      ])
      .describe('Exact ID lookup - returns only these specific experiences')
      .optional(),
    search: z
      .union([
        z.string().describe('Semantic search query for finding related experiences'),
        z.array(z.string()).describe('Array of search terms for semantic matching'),
      ])
      .describe('Semantic search - finds experiences by meaning/content')
      .optional(),
    qualities: QualityFilterSchema.optional().describe(
      'Sophisticated quality filtering with presence/absence filtering and OR logic within qualities'
    ),
    limit: z.number().describe('Maximum number of results to return').optional(),
    offset: z.number().describe('Number of results to skip for pagination').optional(),
    who: z.string().describe('Filter by who experienced').optional(),
    perspective: PerspectiveField.optional(),
    processing: ProcessingEnum.optional(),
    crafted: z
      .boolean()
      .describe(
        'Filter by crafted status (true for blog/refined content, false for raw experience)'
      )
      .optional(),
    reflects: z
      .enum(['only'])
      .describe('Filter for pattern realizations only (experiences with reflects field)')
      .optional(),
    reflected_by: z
      .union([
        z.string().describe('Find experiences that are reflected by this specific experience ID'),
        z
          .array(z.string())
          .describe('Find experiences that are reflected by any of these experience IDs'),
      ])
      .describe('Filter for experiences that are reflected by specific pattern realizations')
      .optional(),
    created: z
      .union([
        z.string().describe('Filter by specific date (YYYY-MM-DD format)'),
        z
          .object({
            start: z.string().describe('Start date (YYYY-MM-DD format)'),
            end: z.string().describe('End date (YYYY-MM-DD format)'),
          })
          .describe('Date range'),
      ])
      .describe('Filter by creation date')
      .optional(),
    sort: SortEnum.optional(),
    group_by: z
      .enum(['similarity', 'who', 'date', 'qualities', 'perspective', 'none'])
      .describe(
        'Group results by specified criteria: similarity (clusters), who, date, qualities, perspective, or none for flat results'
      )
      .optional(),
  })
  .strict();

export const SearchInputSchema = z
  .object({
    searches: z.array(SearchItemSchema).min(1).describe('Array of search queries to execute'),
  })
  .strict()
  .describe('Input for searching experiences. Always use array format, even for single searches.');

// RECONSIDER tool input - Array Only
const ReconsiderItemSchema = z
  .object({
    id: z.string().describe('ID of the experience to reconsider'),
    source: z.string().min(1).describe('Updated source (optional)').optional(),
    perspective: PerspectiveField.optional(),
    who: z
      .union([
        z.string().describe('Single person who experienced this'),
        z.array(z.string()).describe('Multiple people who shared this experience'),
      ])
      .describe(
        'Who experienced this moment - single string for individual ("Human", "Claude", or name), array for shared experience (["Human", "Claude"])'
      )
      .optional(),
    processing: ProcessingEnum.optional(),
    crafted: z.boolean().describe('Updated crafted status (optional)').optional(),
    experienceQualities: ExperienceObjectOptional.optional(),
    reflects: z
      .array(z.string())
      .describe(
        'Updated array of experience IDs that this experience reflects on/connects to (for pattern realizations)'
      )
      .optional(),
    context: z
      .string()
      .describe('Updated context to make the experience self-contained (optional)')
      .optional(),
    release: z
      .boolean()
      .describe('Whether to release (delete) this experience instead of updating it')
      .optional(),
    releaseReason: z
      .string()
      .describe('Reason for releasing this experience (only used if release is true)')
      .optional(),
  })
  .strict();

export const ReconsiderInputSchema = z
  .object({
    reconsiderations: z
      .array(ReconsiderItemSchema)
      .min(1)
      .describe('Array of experiences to reconsider'),
  })
  .strict()
  .describe('Input for updating experiences. Always use array format, even for single updates.');

// MCP Tool output schemas
export const ToolTextContentSchema = z.object({
  type: z.literal('text'),
  text: z.string(),
});

export const ToolResultSchema = z.object({
  isError: z.boolean().optional(),
  content: z.array(ToolTextContentSchema),
  nextMoment: ExperienceQualitiesSchema.optional(),
  flow: z
    .object({
      moments: z.array(z.any()),
      transitions: z.array(z.any()),
      reflection: z.any().optional(),
    })
    .optional(),
});

// Example generation functions
/**
 * Generates an example experience input for testing and documentation
 * @remarks
 * Provides a realistic example of single experience capture with quality signatures.
 * @returns Example experience input with embodied sensing and mood qualities
 */
export function generateExperienceExample(): ExperienceInput {
  return {
    experiences: [
      {
        source:
          "I'm sitting at my desk, the afternoon light streaming through the window. My fingers hover over the keyboard, that familiar mix of excitement and uncertainty bubbling up. This project feels like it could be something special, but I'm not quite sure how to start.",
        emoji: '✨',
        perspective: 'I',
        who: 'Alex',
        processing: 'during',
        crafted: false,
        experienceQualities: {
          embodied: 'sensing',
          focus: false,
          mood: 'open',
          purpose: 'goal',
          space: false,
          time: false,
          presence: false,
        },
      },
    ],
  };
}

/**
 * Generates an example search input for testing and documentation
 * @remarks
 * Provides a realistic example of semantic search with filters and limits.
 * @returns Example search input with query and quality filters
 */
export function generateSearchExample(): SearchInput {
  return {
    searches: [
      {
        search: 'creative breakthrough moments',
        limit: 5,
        who: 'Alex',
        perspective: 'I',
        processing: 'during',
        sort: 'relevance',
      },
    ],
  };
}

/**
 * Generates an example reconsider input for testing and documentation
 * @remarks
 * Provides a realistic example of experience update with ID and new content.
 * @returns Example reconsider input with source ID and updated experience
 */
export function generateReconsiderExample(): ReconsiderInput {
  return {
    reconsiderations: [
      {
        id: 'exp_1234567890',
        source: 'Updated source text with more detail about the creative process',
        experienceQualities: {
          embodied: false,
          focus: 'narrow',
          mood: false,
          purpose: false,
          space: false,
          time: false,
          presence: false,
        },
      },
    ],
  };
}

/**
 * Generates an example batch experience input for testing and documentation
 * @remarks
 * Provides a realistic example of multiple experience capture in a single request.
 * @returns Example batch experience input with multiple experiences
 */
export function generateBatchExperienceExample(): ExperienceInput {
  return {
    experiences: [
      {
        source: 'The first moment of clarity when the solution finally clicks into place.',
        emoji: '💡',
        perspective: 'I',
        who: 'Alex',
        processing: 'right-after',
        crafted: false,
        experienceQualities: {
          embodied: false,
          focus: 'narrow', // Base quality 'focus' defaults to narrow
          mood: false,
          purpose: false,
          space: false,
          time: false,
          presence: false,
        },
      },
      {
        source:
          'Walking through the park, the autumn leaves crunching underfoot, feeling grateful for this moment of peace.',
        emoji: '🍂',
        perspective: 'I',
        who: 'Alex',
        processing: 'during',
        crafted: false,
        experienceQualities: {
          embodied: 'thinking',
          focus: false,
          mood: 'closed',
          purpose: false,
          space: false,
          time: false,
          presence: false,
        },
      },
    ],
  };
}

/**
 * Generates an example batch search input for testing and documentation
 * @remarks
 * Provides a realistic example of multiple search queries in a single request.
 * @returns Example batch search input with multiple queries
 */
export function generateBatchSearchExample(): SearchInput {
  return {
    searches: [
      {
        search: 'creative breakthrough',
        limit: 3,
        sort: 'relevance',
      },
      {
        search: 'peaceful moments',
        limit: 3,
        sort: 'created',
      },
    ],
  };
}

// Type guards using Zod schemas
/**
 * Type guard to check if value is a valid ExperienceInput
 * @remarks
 * Uses Zod schema validation to ensure type safety for experience inputs.
 * @param value - Value to validate
 * @returns True if value matches ExperienceInput schema
 */
export function isExperienceInput(value: unknown): value is ExperienceInput {
  return ExperienceInputSchema.safeParse(value).success;
}

/**
 * Type guard to check if value is a valid SearchInput
 * @remarks
 * Uses Zod schema validation to ensure type safety for search inputs.
 * @param value - Value to validate
 * @returns True if value matches SearchInput schema
 */
export function isSearchInput(value: unknown): value is SearchInput {
  return SearchInputSchema.safeParse(value).success;
}

/**
 * Type guard to check if value is a valid ReconsiderInput
 * @remarks
 * Uses Zod schema validation to ensure type safety for reconsider inputs.
 * @param value - Value to validate
 * @returns True if value matches ReconsiderInput schema
 */
export function isReconsiderInput(value: unknown): value is ReconsiderInput {
  return ReconsiderInputSchema.safeParse(value).success;
}

/**
 * Type guard to check if value is a valid ToolResult
 * @remarks
 * Uses Zod schema validation to ensure type safety for tool results.
 * @param value - Value to validate
 * @returns True if value matches ToolResult schema
 */
export function isToolResult(value: unknown): value is ToolResult {
  return ToolResultSchema.safeParse(value).success;
}

/**
 * Type guard to check if value is a valid ToolTextContent
 * @remarks
 * Uses Zod schema validation to ensure type safety for tool text content.
 * @param value - Value to validate
 * @returns True if value matches ToolTextContent schema
 */
export function isToolTextContent(value: unknown): value is ToolTextContent {
  return ToolTextContentSchema.safeParse(value).success;
}

/**
 * Type guard to check if value is a valid ExperienceObject
 * @remarks
 * Uses Zod schema validation to ensure type safety for experience objects.
 * @param value - Value to validate
 * @returns True if value matches ExperienceObject schema
 */
export function isExperienceObject(value: unknown): value is z.infer<typeof ExperienceObject> {
  return ExperienceObject.safeParse(value).success;
}

// Utility type guards - All inputs are now arrays only
/**
 * Type guard to check if ExperienceInput has experiences array
 * @remarks
 * All experience inputs now use array format.
 * @param value - ExperienceInput to check
 * @returns True if input contains experiences array
 */
export function hasExperienceArray(value: ExperienceInput): value is ExperienceInput {
  return 'experiences' in value && Array.isArray(value.experiences) && value.experiences.length > 0;
}

/**
 * Type guard to check if SearchInput has searches array
 * @remarks
 * All search inputs now use array format.
 * @param value - SearchInput to check
 * @returns True if input contains searches array
 */
export function hasSearchArray(value: SearchInput): value is SearchInput {
  return 'searches' in value && Array.isArray(value.searches) && value.searches.length > 0;
}

/**
 * Type guard to check if ReconsiderInput has reconsiderations array
 * @remarks
 * All reconsider inputs now use array format.
 * @param value - ReconsiderInput to check
 * @returns True if input contains reconsiderations array
 */
export function hasReconsiderArray(value: ReconsiderInput): value is ReconsiderInput {
  return (
    'reconsiderations' in value &&
    Array.isArray(value.reconsiderations) &&
    value.reconsiderations.length > 0
  );
}

export type ToolTextContent = z.infer<typeof ToolTextContentSchema>;
export type ToolResult = z.infer<typeof ToolResultSchema>;

// Inferred TypeScript types from Zod schemas
export type ExperienceInput = z.infer<typeof ExperienceInputSchema>;
export type SearchInput = z.infer<typeof SearchInputSchema>;
export type ReconsiderInput = z.infer<typeof ReconsiderInputSchema>;
