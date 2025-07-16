import { z } from 'zod';

// Enums
export const PerspectiveEnum = z.enum(['I', 'we', 'you', 'they']).describe('Perspective from which experience is captured: I (first person), we (collective), you (second person), they (third person)');
export const ProcessingEnum = z.enum(['during', 'right-after', 'long-after']).describe('When processing occurred: during (real-time), right-after (immediate), long-after (retrospective)');
// Remove 'crafted' from ProcessingEnumWithCrafted
export const ProcessingEnumWithCrafted = ProcessingEnum; // For compatibility, but no 'crafted'
export const QualityTypeEnum = z.enum(['embodied', 'attentional', 'affective', 'purposive', 'spatial', 'temporal', 'intersubjective']).describe('The experiential quality being analyzed');
export const SortEnum = z.enum(['relevance', 'created']).describe('Sort order for results');

// Perspective field - avoid union to prevent anyOf with $ref issues
export const PerspectiveField = z.string().min(1).describe('Perspective from which experience is captured (e.g., I, we, you, they, or custom perspectives)');

// Qualities
export const QualityItem = z.object({
  type: QualityTypeEnum,
  prominence: z.number().min(0).max(1).describe('How prominent this quality is in the moment (0-1 scale)'),
  manifestation: z.string().describe("How this quality manifests in the specific moment - preserving their authentic voice and way of expressing themselves.")
});

// Experience analysis
export const ExperienceObject = z.object({
  qualities: z.array(QualityItem).describe('Qualitative experiential analysis: embodied (physical sensations), attentional (focus/awareness), affective (emotional tone), purposive (intention/direction), spatial (sense of place), temporal (time awareness), intersubjective (social presence), pick the ones that are most relevant to the experience'),
  emoji: z.string().describe('Emoji as a visual anchor for the experience'),
  narrative: z.string().describe("Concise verb-forward summary in the experiencer's own style written in present tense and assuming the noted perspective. Presents as a memory anchor that feels experientially complete and preserve authentic voice.")
});

// Experience analysis (all fields optional for update)
export const ExperienceObjectOptional = z.object({
  qualities: z.array(QualityItem).describe('Quality experiential analysis: embodied (physical sensations), attentional (focus/awareness), affective (emotional tone), purposive (intention/direction), spatial (sense of place), temporal (time awareness), intersubjective (social presence), pick the ones that are most relevant to the experience').optional(),
  emoji: z.string().describe('Emoji as a visual anchor for the experience').optional(),
  narrative: z.string().describe("Concise verb-forward summary in the experiencer's own style written in present tense and assuming the noted perspective. Presents as a memory anchor that feels experientially complete and preserve authentic voice.").optional()
});

// CAPTURE tool input
export const CaptureInputSchema = z.object({
  source: z.string().min(1).describe("Raw, exact words from the experiencer - their actual text/voice as written or spoken. Do not summarize, interpret, or modify. This is the source material that will be processed into a framed moment.").optional(),
  perspective: PerspectiveField.optional(),
  experiencer: z.string().describe('Who experienced this moment (person, group, or entity)').optional(),
  processing: ProcessingEnum.optional(),
  crafted: z.boolean().describe('Whether this is crafted content (blog/refined for an audience) vs raw capture (journal/immediate)').optional(),
  experience: ExperienceObject.optional(),
  captures: z.array(z.object({
    source: z.string().min(1).describe("Raw, exact words from the experiencer - their actual text/voice as written or spoken. Do not summarize, interpret, or modify. This is the source material that will be processed into a framed moment."),
    perspective: PerspectiveField.optional(),
    experiencer: z.string().describe('Who experienced this moment (person, group, or entity)').optional(),
    processing: ProcessingEnum.optional(),
    crafted: z.boolean().describe('Whether this is crafted content (blog/refined for an audience) vs raw capture (journal/immediate)').optional(),
    experience: ExperienceObject
  })).describe('Array of experiences to capture (for batch operations)').optional()
}).strict().refine(
  (data) => data.source || (data.captures && data.captures.length > 0),
  {
    message: "Either 'source' or 'captures' must be provided",
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

// UPDATE tool input
export const UpdateInputSchema = z.object({
  id: z.string().describe('ID of the experience to update (for single updates)').optional(),
  source: z.string().min(1).describe('Updated source (optional)').optional(),
  perspective: PerspectiveField.optional(),
  experiencer: z.string().describe('Updated experiencer (optional)').optional(),
  processing: ProcessingEnum.optional(),
  crafted: z.boolean().describe('Updated crafted status (optional)').optional(),
  experience: ExperienceObjectOptional.optional(),
  updates: z.array(z.object({
    id: z.string().describe('ID of the experience to update'),
    source: z.string().min(1).describe('Updated source (optional)').optional(),
    perspective: PerspectiveField.optional(),
    experiencer: z.string().describe('Updated experiencer (optional)').optional(),
    processing: ProcessingEnum.optional(),
    crafted: z.boolean().describe('Updated crafted status (optional)').optional(),
    experience: ExperienceObjectOptional.optional()
  })).describe('Array of experiences to update (for batch operations)').optional()
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
export function generateCaptureExample(): CaptureInput {
  return {
    source: "I'm sitting at my desk, the afternoon light streaming through the window. My fingers hover over the keyboard, that familiar mix of excitement and uncertainty bubbling up. This project feels like it could be something special, but I'm not quite sure how to start.",
    perspective: 'I',
    experiencer: 'Alex',
    processing: 'during',
    crafted: false,
    experience: {
      qualities: [
        {
          type: 'embodied',
          prominence: 0.8,
          manifestation: 'fingers hovering over keyboard, afternoon light streaming through window'
        },
        {
          type: 'affective',
          prominence: 0.9,
          manifestation: 'mix of excitement and uncertainty bubbling up'
        },
        {
          type: 'purposive',
          prominence: 0.7,
          manifestation: 'feels like it could be something special, not quite sure how to start'
        }
      ],
      emoji: '💭',
      narrative: 'I hover over my keyboard, afternoon light streaming in, excitement and uncertainty bubbling up about this project that feels special but unclear.'
    }
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

export function generateUpdateExample(): UpdateInput {
  return {
    id: 'exp_1234567890',
    source: 'Updated source text with more detail about the creative process',
    experience: {
      qualities: [
        {
          type: 'attentional',
          prominence: 0.9,
          manifestation: 'deep focus on the creative challenge'
        }
      ],
      emoji: '🎨',
      narrative: 'Deep focus on the creative challenge, the moment of breakthrough clarity.'
    }
  };
}

export function generateReleaseExample(): ReleaseInput {
  return {
    id: 'exp_1234567890',
    reason: 'No longer relevant to current work'
  };
}

export function generateBatchCaptureExample(): CaptureInput {
  return {
    captures: [
      {
        source: "The first moment of clarity when the solution finally clicks into place.",
        perspective: 'I',
        experiencer: 'Alex',
        processing: 'right-after',
        crafted: false,
        experience: {
          qualities: [
            {
              type: 'attentional',
              prominence: 0.9,
              manifestation: 'clarity when the solution finally clicks'
            }
          ],
          emoji: '💡',
          narrative: 'The solution clicks into place with sudden clarity.'
        }
      },
      {
        source: "Walking through the park, the autumn leaves crunching underfoot, feeling grateful for this moment of peace.",
        perspective: 'I',
        experiencer: 'Alex',
        processing: 'during',
        crafted: false,
        experience: {
          qualities: [
            {
              type: 'embodied',
              prominence: 0.8,
              manifestation: 'leaves crunching underfoot'
            },
            {
              type: 'affective',
              prominence: 0.7,
              manifestation: 'feeling grateful for this moment of peace'
            }
          ],
          emoji: '🍂',
          narrative: 'Autumn leaves crunch underfoot as I walk through the park, grateful for this moment of peace.'
        }
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
export function isCaptureInput(value: unknown): value is CaptureInput {
  return CaptureInputSchema.safeParse(value).success;
}

export function isSearchInput(value: unknown): value is SearchInput {
  return SearchInputSchema.safeParse(value).success;
}

export function isUpdateInput(value: unknown): value is UpdateInput {
  return UpdateInputSchema.safeParse(value).success;
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

export function isQualityItem(value: unknown): value is z.infer<typeof QualityItem> {
  return QualityItem.safeParse(value).success;
}

// Utility type guards
export function isSingleCaptureInput(value: CaptureInput): value is CaptureInput & { source: string } {
  return 'source' in value && typeof value.source === 'string';
}

export function isBatchCaptureInput(value: CaptureInput): value is CaptureInput & { captures: NonNullable<CaptureInput['captures']> } {
  return 'captures' in value && Array.isArray(value.captures) && value.captures.length > 0;
}

export function isSingleSearchInput(value: SearchInput): value is SearchInput & { query?: string } {
  return !('searches' in value) || !value.searches;
}

export function isBatchSearchInput(value: SearchInput): value is SearchInput & { searches: NonNullable<SearchInput['searches']> } {
  return 'searches' in value && Array.isArray(value.searches) && value.searches.length > 0;
}

export function isSingleUpdateInput(value: UpdateInput): value is UpdateInput & { id?: string } {
  return !('updates' in value) || !value.updates;
}

export function isBatchUpdateInput(value: UpdateInput): value is UpdateInput & { updates: NonNullable<UpdateInput['updates']> } {
  return 'updates' in value && Array.isArray(value.updates) && value.updates.length > 0;
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
export type CaptureInput = z.infer<typeof CaptureInputSchema>;
export type SearchInput = z.infer<typeof SearchInputSchema>;
export type UpdateInput = z.infer<typeof UpdateInputSchema>;
export type ReleaseInput = z.infer<typeof ReleaseInputSchema>; 