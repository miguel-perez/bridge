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

// Experience analysis - simplified to prominent qualities array
export const ExperienceObject = z.array(z.string())
  .describe(`Array of qualities that emerge prominently in this moment. Use dot notation to specify subtypes.

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

- time.past: "experienceing", "used to" → historical orientation
- time.future: "planning", "worried about" → anticipatory orientation
- time: When temporal flow doesn't clearly fit past/future subtypes

- presence.individual: "just me", alone → solitary experience
- presence.collective: "we", "together" → social/shared experience
- presence: When social quality doesn't clearly fit individual/collective subtypes

Example: ["embodied.sensing", "mood.open", "purpose.goal"]
Qualities either emerge prominently or recede - only include what stands out.`);

// Experience analysis (all fields optional for update)
export const ExperienceObjectOptional = z
  .array(z.string())
  .describe(
    `Array of qualities that emerge prominently in this moment. Use dot notation to specify subtypes:
- embodied.thinking, embodied.sensing
- focus.narrow, focus.broad
- mood.open, mood.closed
- purpose.goal, purpose.wander
- space.here, space.there
- time.past, time.future
- presence.individual, presence.collective`
  )
  .optional();

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
          // Check if it's a valid emoji sequence
          // This includes single emojis, compound emojis with ZWJ, and emojis with modifiers
          const emojiRegex = /^(\p{Extended_Pictographic}|\p{Emoji_Component})+$/u;

          // Also check for specific patterns to avoid multiple separate emojis
          // Count grapheme clusters (visual characters) to ensure it's a single emoji
          const graphemeSegmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
          const graphemes = Array.from(graphemeSegmenter.segment(val));

          // A single emoji (even compound) should be 1 grapheme cluster
          return emojiRegex.test(val) && graphemes.length === 1;
        },
        { message: 'Must be a single emoji (including compound emojis)' }
      )
      .describe(
        'Single emoji that serves as a visual/memory anchor for this experience. Choose one that captures the essence or feeling.'
      ),
    perspective: PerspectiveField.optional(),
    experiencer: z
      .string()
      .describe(
        'Who experienced this moment - "Human" for their experiences, "Claude" for your experiences, or their name if provided'
      )
      .optional(),
    processing: ProcessingEnum.optional(),
    crafted: z
      .boolean()
      .describe(
        'Whether this is crafted content (blog/refined for an audience) vs raw experience (journal/immediate)'
      )
      .optional(),
    experience: ExperienceObject,
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
    stillThinking: z
      .boolean()
      .optional()
      .describe('Whether more tool calls are expected in this flow'),
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
    experiencer: z.string().describe('Filter by experiencer').optional(),
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
    as: z
      .enum(['clusters'])
      .describe('Return results as clusters of similar experiences instead of individual results')
      .optional(),
  })
  .strict();

export const SearchInputSchema = z
  .object({
    searches: z.array(SearchItemSchema).min(1).describe('Array of search queries to execute'),
    stillThinking: z
      .boolean()
      .optional()
      .describe('Whether more tool calls are expected in this flow'),
  })
  .strict()
  .describe('Input for searching experiences. Always use array format, even for single searches.');

// RECONSIDER tool input - Array Only
const ReconsiderItemSchema = z
  .object({
    id: z.string().describe('ID of the experience to reconsider'),
    source: z.string().min(1).describe('Updated source (optional)').optional(),
    perspective: PerspectiveField.optional(),
    experiencer: z.string().describe('Updated experiencer (optional)').optional(),
    processing: ProcessingEnum.optional(),
    crafted: z.boolean().describe('Updated crafted status (optional)').optional(),
    experience: ExperienceObjectOptional.optional(),
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
  })
  .strict();

export const ReconsiderInputSchema = z
  .object({
    reconsiderations: z
      .array(ReconsiderItemSchema)
      .min(1)
      .describe('Array of experiences to reconsider'),
    stillThinking: z
      .boolean()
      .optional()
      .describe('Whether more tool calls are expected in this flow'),
  })
  .strict()
  .describe('Input for updating experiences. Always use array format, even for single updates.');

// RELEASE tool input - Array Only
const ReleaseItemSchema = z
  .object({
    id: z.string().describe('ID of the experience to release'),
    reason: z.string().describe('Reason for releasing this experience (optional)').optional(),
  })
  .strict();

export const ReleaseInputSchema = z
  .object({
    releases: z.array(ReleaseItemSchema).min(1).describe('Array of experiences to release'),
    stillThinking: z
      .boolean()
      .optional()
      .describe('Whether more tool calls are expected in this flow'),
  })
  .strict()
  .describe('Input for releasing experiences. Always use array format, even for single releases.');

// MCP Tool output schemas
export const ToolTextContentSchema = z.object({
  type: z.literal('text'),
  text: z.string(),
});

export const ToolResultSchema = z.object({
  isError: z.boolean().optional(),
  content: z.array(ToolTextContentSchema),
  stillThinking: z.boolean().optional(),
  callsSoFar: z.number().optional(),
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
        experiencer: 'Alex',
        processing: 'during',
        crafted: false,
        experience: ['embodied.sensing', 'mood.open', 'purpose.goal'],
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
        experiencer: 'Alex',
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
        experience: ['focus'],
      },
    ],
  };
}

/**
 * Generates an example release input for testing and documentation
 * @remarks
 * Provides a realistic example of experience deletion with ID and reason.
 * @returns Example release input with source ID and release reason
 */
export function generateReleaseExample(): ReleaseInput {
  return {
    releases: [
      {
        id: 'exp_1234567890',
        reason: 'No longer relevant to current work',
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
        experiencer: 'Alex',
        processing: 'right-after',
        crafted: false,
        experience: ['focus'],
      },
      {
        source:
          'Walking through the park, the autumn leaves crunching underfoot, feeling grateful for this moment of peace.',
        emoji: '🍂',
        perspective: 'I',
        experiencer: 'Alex',
        processing: 'during',
        crafted: false,
        experience: ['embodied.thinking', 'mood.closed'],
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
 * Type guard to check if value is a valid ReleaseInput
 * @remarks
 * Uses Zod schema validation to ensure type safety for release inputs.
 * @param value - Value to validate
 * @returns True if value matches ReleaseInput schema
 */
export function isReleaseInput(value: unknown): value is ReleaseInput {
  return ReleaseInputSchema.safeParse(value).success;
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

/**
 * Type guard to check if ReleaseInput has releases array
 * @remarks
 * All release inputs now use array format.
 * @param value - ReleaseInput to check
 * @returns True if input contains releases array
 */
export function hasReleaseArray(value: ReleaseInput): value is ReleaseInput {
  return 'releases' in value && Array.isArray(value.releases) && value.releases.length > 0;
}

export type ToolTextContent = z.infer<typeof ToolTextContentSchema>;
export type ToolResult = z.infer<typeof ToolResultSchema>;

// Inferred TypeScript types from Zod schemas
export type ExperienceInput = z.infer<typeof ExperienceInputSchema>;
export type SearchInput = z.infer<typeof SearchInputSchema>;
export type ReconsiderInput = z.infer<typeof ReconsiderInputSchema>;
export type ReleaseInput = z.infer<typeof ReleaseInputSchema>;
