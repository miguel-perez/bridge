import { z } from 'zod';

// Enums
export const PerspectiveEnum = z.enum(['I', 'we', 'you', 'they']).describe('Perspective from which experience is remembered: I (first person), we (collective), you (second person), they (third person)');
export const ProcessingEnum = z.enum(['during', 'right-after', 'long-after']).describe('When processing occurred: during (real-time), right-after (immediate), long-after (retrospective)');
// Remove 'crafted' from ProcessingEnumWithCrafted
export const ProcessingEnumWithCrafted = ProcessingEnum; // For compatibility, but no 'crafted'
// Simplified quality types from README, mapped to theoretical concepts from FRAMED_MOMENTS.md
export const QualityTypeEnum = z.enum(['embodied', 'focus', 'mood', 'purpose', 'space', 'time', 'presence']).describe(`
The experiential quality being analyzed. Based on FRAMED_MOMENTS.md theoretical framework:

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

// Perspective field - avoid union to prevent anyOf with $ref issues
export const PerspectiveField = z.string().min(1).describe('Perspective from which experience is remembered (e.g., I, we, you, they, or custom perspectives)');



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

- time.past: "remembering", "used to" → historical orientation
- time.future: "planning", "worried about" → anticipatory orientation
- time: When temporal flow doesn't clearly fit past/future subtypes

- presence.individual: "just me", alone → solitary experience
- presence.collective: "we", "together" → social/shared experience
- presence: When social dimension doesn't clearly fit individual/collective subtypes

Example: ["embodied.sensing", "mood.open", "purpose.goal"]
Following FRAMED_MOMENTS.md principle: "dimensions either emerge prominently or recede."`);

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
  source: z.string().min(1).describe("Raw, exact words from the experiencer - their actual text/voice as written or spoken OR your own experiential observations. Do not summarize, interpret, or modify. This is the source material that will be processed into a framed moment.").optional(),
  perspective: PerspectiveField.optional(),
  experiencer: z.string().describe('Who experienced this moment - "Human" for their experiences, "Claude" for your experiences, or their name if provided').optional(),
  processing: ProcessingEnum.optional(),
  crafted: z.boolean().describe('Whether this is crafted content (blog/refined for an audience) vs raw remember (journal/immediate)').optional(),
  experience: ExperienceObject.optional(),
  remembers: z.array(z.object({
    source: z.string().min(1).describe("Raw, exact words from the experiencer - their actual text/voice as written or spoken. Do not summarize, interpret, or modify. This is the source material that will be processed into a framed moment."),
    perspective: PerspectiveField.optional(),
    experiencer: z.string().describe('Who experienced this moment (person, group, or entity)').optional(),
    processing: ProcessingEnum.optional(),
    crafted: z.boolean().describe('Whether this is crafted content (blog/refined for an audience) vs raw remember (journal/immediate)').optional(),
    experience: ExperienceObject
  })).describe('Array of experiences to remember (for batch operations)').optional()
}).strict().refine(
  (data) => data.source || (data.remembers && data.remembers.length > 0),
  {
    message: "Either 'source' or 'remembers' must be provided",
    path: ["source"]
  }
);

// SEARCH tool input
export const SearchInputSchema = z.object({
  query: z.string().describe('Search query for semantic matching').optional(),
  limit: z.number().describe('Maximum number of results to return').optional(),
  offset: z.number().describe('Number of results to skip for pagination').optional(),
  experiencer: z.string().describe('Filter by experiencer').optional(),
  perspective: PerspectiveField.optional(),
  processing: ProcessingEnum.optional(),
  created: z.union([
    z.string().describe('Filter by specific date (YYYY-MM-DD format)'),
    z.object({
      start: z.string().describe('Start date (YYYY-MM-DD format)'),
      end: z.string().describe('End date (YYYY-MM-DD format)')
    }).describe('Date range')
  ]).describe('Filter by creation date').optional(),
  sort: SortEnum.optional(),
  show_ids: z.boolean().describe('Whether to show experience IDs in results').optional(),
  searches: z.array(z.object({
    query: z.string().describe('Search query for semantic matching').optional(),
    limit: z.number().describe('Maximum number of results to return').optional(),
    offset: z.number().describe('Number of results to skip for pagination').optional(),
    experiencer: z.string().describe('Filter by experiencer').optional(),
    perspective: PerspectiveField.optional(),
    processing: ProcessingEnum.optional(),
    created: z.union([
      z.string().describe('Filter by specific date (YYYY-MM-DD format)'),
      z.object({
        start: z.string().describe('Start date (YYYY-MM-DD format)'),
        end: z.string().describe('End date (YYYY-MM-DD format)')
      }).describe('Date range')
    ]).describe('Filter by creation date').optional(),
    sort: SortEnum.optional()
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
  reconsiderations: z.array(z.object({
    id: z.string().describe('ID of the experience to reconsider'),
    source: z.string().min(1).describe('Updated source (optional)').optional(),
    perspective: PerspectiveField.optional(),
    experiencer: z.string().describe('Updated experiencer (optional)').optional(),
    processing: ProcessingEnum.optional(),
    crafted: z.boolean().describe('Updated crafted status (optional)').optional(),
    experience: ExperienceObjectOptional.optional()
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

export function generateReconsiderExample(): ReconsiderInput {
  return {
    id: 'exp_1234567890',
    source: 'Updated source text with more detail about the creative process',
    experience: ['focus']
  };
}

export function generateReleaseExample(): ReleaseInput {
  return {
    id: 'exp_1234567890',
    reason: 'No longer relevant to current work'
  };
}

export function generateBatchExperienceExample(): ExperienceInput {
  return {
    remembers: [
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
export function isExperienceInput(value: unknown): value is ExperienceInput {
  return ExperienceInputSchema.safeParse(value).success;
}

export function isSearchInput(value: unknown): value is SearchInput {
  return SearchInputSchema.safeParse(value).success;
}

export function isReconsiderInput(value: unknown): value is ReconsiderInput {
  return ReconsiderInputSchema.safeParse(value).success;
}

export function isReleaseInput(value: unknown): value is ReleaseInput {
  return ReleaseInputSchema.safeParse(value).success;
}

export function isToolResult(value: unknown): value is ToolResult {
  return ToolResultSchema.safeParse(value).success;
}

export function isToolTextContent(value: unknown): value is ToolTextContent {
  return ToolTextContentSchema.safeParse(value).success;
}

export function isExperienceObject(value: unknown): value is z.infer<typeof ExperienceObject> {
  return ExperienceObject.safeParse(value).success;
}



// Utility type guards
export function isSingleExperienceInput(value: ExperienceInput): value is ExperienceInput & { source: string } {
  return 'source' in value && typeof value.source === 'string';
}

export function isBatchExperienceInput(value: ExperienceInput): value is ExperienceInput & { remembers: NonNullable<ExperienceInput['remembers']> } {
  return 'remembers' in value && Array.isArray(value.remembers) && value.remembers.length > 0;
}

export function isSingleSearchInput(value: SearchInput): value is SearchInput & { query?: string } {
  return !('searches' in value) || !value.searches;
}

export function isBatchSearchInput(value: SearchInput): value is SearchInput & { searches: NonNullable<SearchInput['searches']> } {
  return 'searches' in value && Array.isArray(value.searches) && value.searches.length > 0;
}

export function isSingleReconsiderInput(value: ReconsiderInput): value is ReconsiderInput & { id?: string } {
  return !('reconsiderations' in value) || !value.reconsiderations;
}

export function isBatchReconsiderInput(value: ReconsiderInput): value is ReconsiderInput & { reconsiderations: NonNullable<ReconsiderInput['reconsiderations']> } {
  return 'reconsiderations' in value && Array.isArray(value.reconsiderations) && value.reconsiderations.length > 0;
}

export function isSingleReleaseInput(value: ReleaseInput): value is ReleaseInput & { id?: string } {
  return !('releases' in value) || !value.releases;
}

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