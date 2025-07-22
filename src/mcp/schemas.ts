import { z } from 'zod';

// Enums
export const PerspectiveEnum = z.enum(['I', 'we', 'you', 'they']).describe('Perspective from which experience is experienceed: I (first person), we (collective), you (second person), they (third person)');
export const ProcessingEnum = z.enum(['during', 'right-after', 'long-after']).describe('When processing occurred: during (real-time), right-after (immediate), long-after (retrospective)');
// Remove 'crafted' from ProcessingEnumWithCrafted
export const ProcessingEnumWithCrafted = ProcessingEnum; // For compatibility, but no 'crafted'
// Simplified quality types for experiential qualities
export const QualityTypeEnum = z.enum(['embodied', 'focus', 'mood', 'purpose', 'space', 'time', 'presence']).describe(`
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
export const QualityFilterSchema = z.object({
  // Presence/Absence filtering
  embodied: z.union([
    z.object({ present: z.boolean() }).describe('Filter by presence/absence of embodied qualities'),
    z.string().describe('Filter for specific embodied quality (e.g., "thinking", "sensing")'),
    z.array(z.string()).describe('Filter for multiple embodied qualities (OR logic)')
  ]).optional(),
  focus: z.union([
    z.object({ present: z.boolean() }).describe('Filter by presence/absence of focus qualities'),
    z.string().describe('Filter for specific focus quality (e.g., "narrow", "broad")'),
    z.array(z.string()).describe('Filter for multiple focus qualities (OR logic)')
  ]).optional(),
  mood: z.union([
    z.object({ present: z.boolean() }).describe('Filter by presence/absence of mood qualities'),
    z.string().describe('Filter for specific mood quality (e.g., "open", "closed")'),
    z.array(z.string()).describe('Filter for multiple mood qualities (OR logic)')
  ]).optional(),
  purpose: z.union([
    z.object({ present: z.boolean() }).describe('Filter by presence/absence of purpose qualities'),
    z.string().describe('Filter for specific purpose quality (e.g., "goal", "wander")'),
    z.array(z.string()).describe('Filter for multiple purpose qualities (OR logic)')
  ]).optional(),
  space: z.union([
    z.object({ present: z.boolean() }).describe('Filter by presence/absence of space qualities'),
    z.string().describe('Filter for specific space quality (e.g., "here", "there")'),
    z.array(z.string()).describe('Filter for multiple space qualities (OR logic)')
  ]).optional(),
  time: z.union([
    z.object({ present: z.boolean() }).describe('Filter by presence/absence of time qualities'),
    z.string().describe('Filter for specific time quality (e.g., "past", "future")'),
    z.array(z.string()).describe('Filter for multiple time qualities (OR logic)')
  ]).optional(),
  presence: z.union([
    z.object({ present: z.boolean() }).describe('Filter by presence/absence of presence qualities'),
    z.string().describe('Filter for specific presence quality (e.g., "individual", "collective")'),
    z.array(z.string()).describe('Filter for multiple presence qualities (OR logic)')
  ]).optional()
}).describe('Sophisticated quality filtering with presence/absence filtering and OR logic within qualities');

// Perspective field - avoid union to prevent anyOf with $ref issues
export const PerspectiveField = z.string().min(1).describe('Perspective from which experience is experienceed (e.g., I, we, you, they, or custom perspectives)');



// Experience analysis - simplified to prominent qualities array
export const ExperienceObject = z.array(z.string()).describe(`Array of qualities that emerge prominently in this moment. Use dot notation to specify subtypes.

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
export const ExperienceObjectOptional = z.array(z.string()).describe(`Array of qualities that emerge prominently in this moment. Use dot notation to specify subtypes:
- embodied.thinking, embodied.sensing
- focus.narrow, focus.broad
- mood.open, mood.closed
- purpose.goal, purpose.wander
- space.here, space.there
- time.past, time.future
- presence.individual, presence.collective`).optional();

// EXPERIENCE tool input
export const ExperienceInputSchema = z.object({
  source: z.string().min(1).describe("Raw, exact words from the experiencer - their actual text/voice as written or spoken OR your own experiential observations. Do not summarize, interpret, or modify.").optional(),
  perspective: PerspectiveField.optional(),
  experiencer: z.string().describe('Who experienced this moment - "Human" for their experiences, "Claude" for your experiences, or their name if provided').optional(),
  processing: ProcessingEnum.optional(),
  crafted: z.boolean().describe('Whether this is crafted content (blog/refined for an audience) vs raw experience (journal/immediate)').optional(),
  experience: ExperienceObject.optional(),
  reflects: z.array(z.string()).describe('Array of experience IDs that this experience reflects on/connects to (for pattern realizations)').optional(),
  experiences: z.array(z.object({
    source: z.string().min(1).describe("Raw, exact words from the experiencer - their actual text/voice as written or spoken. Do not summarize, interpret, or modify."),
    perspective: PerspectiveField.optional(),
    experiencer: z.string().describe('Who experienced this moment (person, group, or entity)').optional(),
    processing: ProcessingEnum.optional(),
    crafted: z.boolean().describe('Whether this is crafted content (blog/refined for an audience) vs raw experience (journal/immediate)').optional(),
    experience: ExperienceObject,
    reflects: z.array(z.string()).describe('Array of experience IDs that this experience reflects on/connects to (for pattern realizations)').optional()
  })).describe('Array of experiences to experience (for batch operations)').optional()
}).strict().refine(
  (data) => data.source || (data.experiences && data.experiences.length > 0),
  {
    message: "Either 'source' or 'experiences' must be provided",
    path: ["source"]
  }
);

// SEARCH tool input
export const SearchInputSchema = z.object({
  query: z.union([
    z.string().describe('Search query for semantic matching'),
    z.array(z.string()).describe('Array of qualities or search terms')
  ]).describe('Search query - can be a string or array of qualities').optional(),
  qualities: QualityFilterSchema.optional().describe('Sophisticated quality filtering with presence/absence filtering and OR logic within qualities'),
  limit: z.number().describe('Maximum number of results to return').optional(),
  offset: z.number().describe('Number of results to skip for pagination').optional(),
  experiencer: z.string().describe('Filter by experiencer').optional(),
  perspective: PerspectiveField.optional(),
  processing: ProcessingEnum.optional(),
  reflects: z.enum(['only']).describe('Filter for pattern realizations only (experiences with reflects field)').optional(),
  reflected_by: z.union([
    z.string().describe('Find experiences that are reflected by this specific experience ID'),
    z.array(z.string()).describe('Find experiences that are reflected by any of these experience IDs')
  ]).describe('Filter for experiences that are reflected by specific pattern realizations').optional(),
  created: z.union([
    z.string().describe('Filter by specific date (YYYY-MM-DD format)'),
    z.object({
      start: z.string().describe('Start date (YYYY-MM-DD format)'),
      end: z.string().describe('End date (YYYY-MM-DD format)')
    }).describe('Date range')
  ]).describe('Filter by creation date').optional(),
  sort: SortEnum.optional(),
  as: z.enum(['clusters']).describe('Return results as clusters of similar experiences instead of individual results').optional(),
  show_ids: z.boolean().describe('Deprecated - IDs are always shown. This parameter is ignored.').optional(),
  searches: z.array(z.object({
    query: z.string().describe('Search query for semantic matching').optional(),
    limit: z.number().describe('Maximum number of results to return').optional(),
    offset: z.number().describe('Number of results to skip for pagination').optional(),
    experiencer: z.string().describe('Filter by experiencer').optional(),
    perspective: PerspectiveField.optional(),
    processing: ProcessingEnum.optional(),
    reflects: z.enum(['only']).describe('Filter for pattern realizations only (experiences with reflects field)').optional(),
    reflected_by: z.union([
      z.string().describe('Find experiences that are reflected by this specific experience ID'),
      z.array(z.string()).describe('Find experiences that are reflected by any of these experience IDs')
    ]).describe('Filter for experiences that are reflected by specific pattern realizations').optional(),
    created: z.union([
      z.string().describe('Filter by specific date (YYYY-MM-DD format)'),
      z.object({
        start: z.string().describe('Start date (YYYY-MM-DD format)'),
        end: z.string().describe('End date (YYYY-MM-DD format)')
      }).describe('Date range')
    ]).describe('Filter by creation date').optional(),
    sort: SortEnum.optional(),
    as: z.enum(['clusters']).describe('Return results as clusters of similar experiences instead of individual results').optional()
  })).describe('Array of search queries to execute (for batch operations)').optional()
}).strict();

// REconsider tool input
export const ReconsiderInputSchema = z.object({
  id: z.string().describe('ID of the experience to reconsider (for single reconsiderations)').optional(),
  source: z.string().min(1).describe('Updated source (optional)').optional(),
  perspective: PerspectiveField.optional(),
  experiencer: z.string().describe('Updated experiencer (optional)').optional(),
  processing: ProcessingEnum.optional(),
  crafted: z.boolean().describe('Updated crafted status (optional)').optional(),
  experience: ExperienceObjectOptional.optional(),
  reflects: z.array(z.string()).describe('Updated array of experience IDs that this experience reflects on/connects to (for pattern realizations)').optional(),
  reconsiderations: z.array(z.object({
    id: z.string().describe('ID of the experience to reconsider'),
    source: z.string().min(1).describe('Updated source (optional)').optional(),
    perspective: PerspectiveField.optional(),
    experiencer: z.string().describe('Updated experiencer (optional)').optional(),
    processing: ProcessingEnum.optional(),
    crafted: z.boolean().describe('Updated crafted status (optional)').optional(),
    experience: ExperienceObjectOptional.optional(),
    reflects: z.array(z.string()).describe('Updated array of experience IDs that this experience reflects on/connects to (for pattern realizations)').optional()
  })).describe('Array of experiences to reconsider (for batch operations)').optional()
}).strict();

// RELEASE tool input
export const ReleaseInputSchema = z.object({
  id: z.string().describe('ID of the experience to release (for single releases)').optional(),
  reason: z.string().describe('Reason for releasing the experience (optional)').optional(),
  releases: z.array(z.object({
    id: z.string().describe('ID of the experience to release'),
    reason: z.string().describe('Reason for releasing this experience (optional)').optional()
  })).describe('Array of experiences to release (for batch operations)').optional()
}).strict();



// MCP Tool output schemas
export const ToolTextContentSchema = z.object({
  type: z.literal('text'),
  text: z.string()
});

export const ToolResultSchema = z.object({
  isError: z.boolean().optional(),
  content: z.array(ToolTextContentSchema)
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
    source: "I'm sitting at my desk, the afternoon light streaming through the window. My fingers hover over the keyboard, that familiar mix of excitement and uncertainty bubbling up. This project feels like it could be something special, but I'm not quite sure how to start.",
    perspective: 'I',
    experiencer: 'Alex',
    processing: 'during',
    crafted: false,
    experience: ['embodied.sensing', 'mood.open', 'purpose.goal']
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
    query: 'creative breakthrough moments',
    limit: 5,
    experiencer: 'Alex',
    perspective: 'I',
    processing: 'during',
    sort: 'relevance'
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
    id: 'exp_1234567890',
    source: 'Updated source text with more detail about the creative process',
    experience: ['focus']
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
    id: 'exp_1234567890',
    reason: 'No longer relevant to current work'
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
        source: "The first moment of clarity when the solution finally clicks into place.",
        perspective: 'I',
        experiencer: 'Alex',
        processing: 'right-after',
        crafted: false,
        experience: ['focus']
      },
      {
        source: "Walking through the park, the autumn leaves crunching underfoot, feeling grateful for this moment of peace.",
        perspective: 'I',
        experiencer: 'Alex',
        processing: 'during',
        crafted: false,
        experience: ['embodied.thinking', 'mood.closed']
      }
    ]
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
        query: 'creative breakthrough',
        limit: 3,
        sort: 'relevance'
      },
      {
        query: 'peaceful moments',
        limit: 3,
        sort: 'created'
      }
    ]
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



// Utility type guards
/**
 * Type guard to check if ExperienceInput is a single experience
 * @remarks
 * Distinguishes between single and batch experience inputs for proper handling.
 * @param value - ExperienceInput to check
 * @returns True if input contains single source field
 */
export function isSingleExperienceInput(value: ExperienceInput): value is ExperienceInput & { source: string } {
  return 'source' in value && typeof value.source === 'string';
}

/**
 * Type guard to check if ExperienceInput is a batch experience
 * @remarks
 * Distinguishes between single and batch experience inputs for proper handling.
 * @param value - ExperienceInput to check
 * @returns True if input contains experiences array
 */
export function isBatchExperienceInput(value: ExperienceInput): value is ExperienceInput & { experiences: NonNullable<ExperienceInput['experiences']> } {
  return 'experiences' in value && Array.isArray(value.experiences) && value.experiences.length > 0;
}

/**
 * Type guard to check if SearchInput is a single search
 * @remarks
 * Distinguishes between single and batch search inputs for proper handling.
 * @param value - SearchInput to check
 * @returns True if input contains single query field
 */
export function isSingleSearchInput(value: SearchInput): value is SearchInput & { query?: string } {
  return !('searches' in value) || !value.searches;
}

/**
 * Type guard to check if SearchInput is a batch search
 * @remarks
 * Distinguishes between single and batch search inputs for proper handling.
 * @param value - SearchInput to check
 * @returns True if input contains searches array
 */
export function isBatchSearchInput(value: SearchInput): value is SearchInput & { searches: NonNullable<SearchInput['searches']> } {
  return 'searches' in value && Array.isArray(value.searches) && value.searches.length > 0;
}

/**
 * Type guard to check if ReconsiderInput is a single reconsideration
 * @remarks
 * Distinguishes between single and batch reconsideration inputs for proper handling.
 * @param value - ReconsiderInput to check
 * @returns True if input contains single id field
 */
export function isSingleReconsiderInput(value: ReconsiderInput): value is ReconsiderInput & { id?: string } {
  return !('reconsiderations' in value) || !value.reconsiderations;
}

/**
 * Type guard to check if ReconsiderInput is a batch reconsideration
 * @remarks
 * Distinguishes between single and batch reconsideration inputs for proper handling.
 * @param value - ReconsiderInput to check
 * @returns True if input contains reconsiderations array
 */
export function isBatchReconsiderInput(value: ReconsiderInput): value is ReconsiderInput & { reconsiderations: NonNullable<ReconsiderInput['reconsiderations']> } {
  return 'reconsiderations' in value && Array.isArray(value.reconsiderations) && value.reconsiderations.length > 0;
}

/**
 * Type guard to check if ReleaseInput is a single release
 * @remarks
 * Distinguishes between single and batch release inputs for proper handling.
 * @param value - ReleaseInput to check
 * @returns True if input contains single id field
 */
export function isSingleReleaseInput(value: ReleaseInput): value is ReleaseInput & { id?: string } {
  return !('releases' in value) || !value.releases;
}

/**
 * Type guard to check if ReleaseInput is a batch release
 * @remarks
 * Distinguishes between single and batch release inputs for proper handling.
 * @param value - ReleaseInput to check
 * @returns True if input contains releases array
 */
export function isBatchReleaseInput(value: ReleaseInput): value is ReleaseInput & { releases: NonNullable<ReleaseInput['releases']> } {
  return 'releases' in value && Array.isArray(value.releases) && value.releases.length > 0;
}

export type ToolTextContent = z.infer<typeof ToolTextContentSchema>;
export type ToolResult = z.infer<typeof ToolResultSchema>;

// Inferred TypeScript types from Zod schemas
export type ExperienceInput = z.infer<typeof ExperienceInputSchema>;
export type SearchInput = z.infer<typeof SearchInputSchema>;
export type ReconsiderInput = z.infer<typeof ReconsiderInputSchema>;
export type ReleaseInput = z.infer<typeof ReleaseInputSchema>; 