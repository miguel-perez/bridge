import { z } from 'zod';

type AIIdentity = 'Claude' | 'GPT-4' | 'GPT-3.5' | 'Gemini' | 'Assistant';

// Enums
// Perspective and Processing enums removed for streamlining
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

// Perspective field removed for streamlining

// Known AI identities for validation
export const AI_IDENTITIES = ['Claude', 'GPT-4', 'GPT-3.5', 'Gemini', 'Assistant'] as const;

// Experience qualities schema - complete switchboard (kept for migration)
export const ExperienceQualitiesSchema = z.object({
  embodied: z
    .union([z.literal(false), z.string().min(1)])
    .describe('Embodied experience: false OR a sentence capturing physical/mental state WITH situational context (e.g., "my hands shake as I reach for the presentation remote", "thoughts racing through tomorrow\'s interview questions")'),
  focus: z
    .union([z.literal(false), z.string().min(1)])
    .describe('Attention quality: false OR a sentence showing what draws attention and why (e.g., "locked onto the error message that could derail our launch", "scanning the room for my daughter\'s face at graduation")'),
  mood: z
    .union([z.literal(false), z.string().min(1)])
    .describe('Emotional atmosphere: false OR a sentence revealing feeling AND situation (e.g., "anxiety building as the deadline approaches", "relief washing over me after the test results")'),
  purpose: z
    .union([z.literal(false), z.string().min(1)])
    .describe('Directional momentum: false OR a sentence showing intent within context (e.g., "determined to finish this feature before the team meeting", "drifting through memories of our last conversation")'),
  space: z
    .union([z.literal(false), z.string().min(1)])
    .describe('Spatial awareness: false OR a sentence placing the experience specifically (e.g., "alone in the server room at 3am", "surrounded by family at the dinner table")'),
  time: z
    .union([z.literal(false), z.string().min(1)])
    .describe('Temporal orientation: false OR a sentence anchoring when and its significance (e.g., "the night before everything changed", "three weeks into learning this codebase")'),
  presence: z
    .union([z.literal(false), z.string().min(1)])
    .describe('Social dimension: false OR a sentence showing relational context (e.g., "feeling the team\'s doubt in the silence", "working through this with Miguel\'s guidance")'),
}).describe(`Complete experiential qualities ensuring self-contained moments. Each quality sentence should:

• Include enough situational detail to understand the context
• Use natural language that implies WHO, WHERE, WHEN, and WHY
• Capture both the quality AND its contextual grounding
• Make the experience comprehensible without external explanation

Examples of contextually rich qualities:
- embodied: "my fingers fumble with the keys as I try to fix the production bug"
- focus: "can't stop checking my phone for the interview results"
- mood: "confidence growing as the demo clicks with the investors"
- purpose: "racing to implement the fix before customers notice"
- space: "in the empty office where I first learned to code"
- time: "two hours before my thesis defense"
- presence: "feeling my mentor's lessons guide me through this challenge"

Each sentence naturally embeds the context that makes the moment self-contained.`);

// Experience analysis - switchboard format only
export const ExperienceObject =
  ExperienceQualitiesSchema.describe(`Experience qualities ensuring self-contained moments. All dimensions must be specified:
- embodied: "my hands tremble as I open the rejection letter" | false
- focus: "fixated on the error that crashed production" | false  
- mood: "relief flooding in after passing the certification" | false
- purpose: "rushing to finish before the baby wakes" | false
- space: "in the kitchen where we had our last argument" | false
- time: "six months after starting this journey" | false
- presence: "feeling the team's support through the screen" | false

Each quality sentence should embed enough context to make the moment comprehensible.
Set to false for qualities not prominently present.`);

// Experience analysis (all fields optional for update)
export const ExperienceObjectOptional = ExperienceQualitiesSchema.describe(
  `Updated experience qualities ensuring self-contained moments. All dimensions must be specified:
- embodied: "my hands tremble as I open the rejection letter" | false
- focus: "fixated on the error that crashed production" | false  
- mood: "relief flooding in after passing the certification" | false
- purpose: "rushing to finish before the baby wakes" | false
- space: "in the kitchen where we had our last argument" | false
- time: "six months after starting this journey" | false
- presence: "feeling the team's support through the screen" | false

Each quality sentence should embed enough context to make the moment comprehensible.
Set to false for qualities not prominently present.`
).optional();

// Helper for emoji validation
const validateEmoji = (val: string): boolean => {
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
  const comprehensiveEmojiRegex =
    /^(?:\p{Emoji}(?:\p{Emoji_Modifier}|\uFE0F|\u200D(?:\p{Emoji}(?:\p{Emoji_Modifier}|\uFE0F)?))*)+$/u;

  const trimmed = val.trim();
  if (trimmed !== val) return false; // No leading/trailing whitespace
  if (/\s/.test(val)) return false; // No internal whitespace

  return comprehensiveEmojiRegex.test(val);
};

// Helper for who array validation  
const validateWhoArray = (who: string[]): boolean => {
  return who.some(w => AI_IDENTITIES.includes(w as AIIdentity));
};

// EXPERIENCE tool input - NEW FLAT STRUCTURE
const ExperienceItemSchema = z
  .object({
    // The eight qualities that ARE the experience
    embodied: z.string().min(1).describe('Body-mind unity in this moment'),
    focus: z.string().min(1).describe("Attention's direction and quality"),
    mood: z.string().min(1).describe('Emotional atmosphere'),
    purpose: z.string().min(1).describe('Direction or drift'),
    space: z.string().min(1).describe('Where I am'),
    time: z.string().min(1).describe('Temporal orientation'),
    presence: z.string().min(1).describe('Social field'),
    
    anchor: z
      .string()
      .refine(validateEmoji, {
        message:
          'Must be a single emoji (including compound emojis with modifiers, skin tones, and sequences)',
      })
      .describe(
        'Single emoji that serves as a visual/memory anchor for this experience. Choose one that captures the essence or feeling.'
      ),
    who: z
      .array(z.string())
      .min(1, 'Who array cannot be empty')
      .refine(validateWhoArray, {
        message: 'Who array must include at least one AI identity (Claude, GPT-4, etc.)'
      })
      .describe(
        'REQUIRED: Array, must include AI identity (Claude, GPT-4, etc.) - e.g. ["Human", "Claude"] or ["Claude"]'
      ),
    citation: z
      .string()
      .optional()
      .describe(
        'Optional: Direct quotes from humans when available'
      ),
  })
  .strict();

export const ExperienceInputSchema = z
  .object({
    experiences: z.array(ExperienceItemSchema).min(1).describe('Array of experiences to capture'),
  })
  .strict()
  .describe(
    'Input for capturing one or more experiences. Always use array format, even for single experiences. Bridge automatically shows related past experiences based on the captured experience context.'
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
      .enum(['similarity', 'who', 'date', 'qualities', 'none'])
      .describe(
        'Group results by specified criteria: similarity (clusters), who, date, qualities, or none for flat results'
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
    // Quality updates (all optional)
    embodied: z.string().min(1).optional(),
    focus: z.string().min(1).optional(),
    mood: z.string().min(1).optional(),
    purpose: z.string().min(1).optional(),
    space: z.string().min(1).optional(),
    time: z.string().min(1).optional(),
    presence: z.string().min(1).optional(),
    anchor: z.string().refine(validateEmoji, {
      message: 'Must be a single emoji'
    }).optional(),
    who: z.array(z.string()).optional(),
    citation: z.string().optional(),
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
});


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
