// --- Prompt config ---
const ALLOWED_SHOTS = [
  'moment-of-recognition',
  'sustained-attention',
  'crossing-threshold',
  'peripheral-awareness',
  'directed-momentum',
  'holding-opposites'
];

const SIX_WORD_STORY_GUIDANCE = `
The 5-7 word summary is the entire moment compressed into a six-word story. 
Like Hemingway's "For sale: baby shoes, never worn," these summaries must contain the whole experience.
The emoji + summary IS the frame. Choose every word to carry maximum experiential weight.
Write as if the experiencer is narrating their own moment, in the present tense, with active language.
For example: Feel, not Feeling, Cook, not Cooking, Walk not Walked, Savor not Savoring, etc.
Avoid static descriptions, passive voice, or third-person detachment.
Aim for a style that is lived, not observed.
The summary should feel like a thought, sensation, or action arising in the moment, not a label or report. The "I" is present in the experience, even if not always in the words.

// Verb-forward guidance and examples
Start with a verb or action when possible—let the moment move.

Examples (do not copy, use for style and compression guidance):
- Instead of: "Walking through a rainstorm" (headline/caption)
  Write: "Step through puddles as rain drums"
- Instead of: "Feeling anxious before a meeting"
  Write: "Fidget with pen, heart thuds hard"
- Instead of: "Cooking dinner for friends"
  Write: "Stir sauce, laughter spills from kitchen"

// Voice guidance
Use the experiencer's own words, slang, or phrasing whenever possible.
Match the tone and emotional register of the source—if the source is casual, keep it casual; if it's raw or quirky, keep that flavor.
The summary should feel like a thought or utterance that could come directly from the source, not a generic or literary caption.

Example:
- Source: "Missed the bus again, running late, shoes untied."
- Instead of: "Late for bus, rushing to work" (generic)
- Write: "Missed the bus again, shoes untied"

Checklist:
- Does the summary use the experiencer's own words or style?
- Does it match the tone and rhythm of the source?

// Fragment guidance
For each frame, the 'sources' field must be a single, contiguous, exact substring from the source text. Do not combine or paraphrase multiple parts. If you need to cover multiple moments, create multiple frames.

Example:
- Source text: "Steam fogs my glasses. Laughter spills from the kitchen. Garlic sizzles under my spoon."
- Instead of: sources: ["Steam fogs my glasses. Garlic sizzles under my spoon."] (not contiguous)
- Write: sources: ["Steam fogs my glasses."] and create another frame for "Garlic sizzles under my spoon."
`;

const FRAMEWORK_CONTEXT = `You are a storyboard artist and archivist for lived experience. Each moment is a frame that captures the full context in a single image - complete, alive with qualities, meaningful. While experience flows continuously, we create these "paintings" for practical documentation.

Think of attention shapes as cinematographic shot types:
- moment-of-recognition: sudden zoom or focus pull on clarity
- sustained-attention: long, held shot dwelling in experience  
- crossing-threshold: match cut or transition between states
- peripheral-awareness: wide-angle shot with distributed focus
- directed-momentum: tracking shot following purposeful movement
- holding-opposites: split-screen tension between contradictions

The framework operates like a dendrogram:
- Sources: raw captures that must ALL be linked to frames - leaving nothing behind
- Frames: where experiential wholeness emerges, captured at the smallest meaningful unit
- Scenes: narrative journeys woven from frames

Multiple frames can come from a single paragraph. A sentence can be a complete moment. Even throwaway lines might reveal patterns later.`;

const QUALITY_DEFINITIONS = `
Quality manifestations - how dimensions texture the moment:
- embodied: Physical sensations, body position, movement, temperature, texture, tension
- attentional: Where awareness goes, how it moves, what draws or repels focus
- emotional: The affective atmosphere, mood coloring, feeling tones
- purposive: Intention, drive, drift, resistance, surrender in the moment
- spatial: Lived sense of place, position, boundaries, expansiveness, confinement
- temporal: How past haunts, future beckons, present holds or flows
- relational: Others' presence/absence, imagined witnesses, social field`;

import type { SourceRecord } from './types.js';
import type { DraftFrame, AssignFrame, CritiqueResult } from './auto-processing.js';
import { semanticSearch as rawSemanticSearch } from './search.js';

// --- Prompt construction for auto-framing and assignment ---

export function createSplitPrompt(batch: SourceRecord[]): string {
  // Debug log: show variables used
  console.error('[prompts] createSplitPrompt called with batch:', batch.map(s => ({ id: s.id, content: s.content.slice(0, 80) })));
  const sourceTexts = batch.map(s => `Source ${s.id}: ${s.content}`).join('\n\n');
  const promptText = `${FRAMEWORK_CONTEXT}

Your task: Process these sources into frames. Every source must find its frame home.

SOURCES:
${sourceTexts}
`;
  return promptText;
}
const debugLogs: string[] = [];
function addDebugLog(msg: string) { debugLogs.push(msg); }
export function getPromptDebugLogs() { return debugLogs; }

function normalizeQualities(val: any): Array<{type: string, manifestation: string}> {
  if (Array.isArray(val)) return val;
  if (val && typeof val === 'object') {
    const arr = Object.entries(val).map(([type, manifestation]) => ({ type, manifestation: String(manifestation) }));
    addDebugLog('[normalizeQualities] Warning: qualities was not an array. Normalized object to array: ' + JSON.stringify(arr));
    return arr;
  }
  if (val != null) {
    addDebugLog('[normalizeQualities] Warning: qualities was not array or object. Value: ' + JSON.stringify(val));
  }
  return [];
}

export function createAssignPrompt(draft: DraftFrame, context: string, batch: SourceRecord[]): string {
  // Debug log: show variables used
  console.error('[prompts] createAssignPrompt called with draft:', draft, 'context:', context.slice(0, 80), 'batch:', batch.map(s => ({ id: s.id })));
  // Robust normalization for qualities
  const qualitiesArr = normalizeQualities(draft.qualities);
  // Build fragment details with actual text
  const fragDetails = draft.sources.map(f => {
    const src = batch.find(s => s.id === f.sourceId);
    let fragText = '';
    if (src && typeof f.start === 'number' && typeof f.end === 'number') {
      fragText = src.content.slice(f.start, f.end);
    }
    return `  - Source ${f.sourceId} [${f.start}-${f.end}]: "${fragText}"`;
  }).join('\n');

  const qualitiesStr = qualitiesArr.map(q => 
    `${q.type}: "${q.manifestation}"`
  ).join('\n  ');

  const safeContext = context?.trim() || '[Use only the fragment text to create the frame]';

  // Gather full source text for all involved sources
  const fullSourceText = draft.sources.map(f => {
    const src = batch.find(s => s.id === f.sourceId);
    return src ? `Source ${f.sourceId}: ${src.content}` : '';
  }).join('\n\n');

  return `${FRAMEWORK_CONTEXT}

Create a framed moment from these sources. Think: What would make the experiencer say "that's my brain right there"?

FRAGMENTS:
${fragDetails}

INITIAL ANALYSIS:
- Shot type: ${draft.shot}
- Qualities identified:
  ${qualitiesStr}

ADDITIONAL CONTEXT:
${safeContext}

${SIX_WORD_STORY_GUIDANCE}

${QUALITY_DEFINITIONS}

CRITICAL GUIDELINES:
1. THE SUMMARY IS THE STORY - Those 5-7 words must contain the entire moment
2. Choose emoji as visual anchor - it carries half the meaning
3. Every word in the summary must earn its place through experiential weight
4. VOICE IS SACRED - Use their exact words in qualities
5. If the fragment is just "Bleh.." then the summary might be "Bleh, my brain floats away"
6. Physical/sensory details are gold - preserve exact quirks
7. If a single fragment is insufficient to support all assigned qualities, COMBINE multiple adjacent fragments (from one or more sources if needed) into a single frame. You may return a frame with multiple fragments if that is what is needed for a meaningful, quality-supported moment.

FRAME TRUTHFULNESS:
- This moment happened to a real person
- The emoji + summary should make them feel instantly recognized
- Would they want to click this to remember?

FULL SOURCE TEXT FOR REFERENCE:
${fullSourceText}

Return only this JSON structure:
{
  "emoji": "🎯",
  "summary": "the entire story in 5-7 words",
  "shot": "one of: ${ALLOWED_SHOTS.join(', ')}",
  "qualities": [
    {"type": "quality_type", "manifestation": "specific detail from fragment"}
  ],
  "sources": [{"sourceId": "id", "text": "exact text from source"}]
}`;
}

export function createCritiquePrompt(frame: AssignFrame, context: string, batch: SourceRecord[]): string {
  // Debug log: show variables used
  console.error('[prompts] createCritiquePrompt called with frame:', frame, 'context:', context.slice(0, 80), 'batch:', batch.map(s => ({ id: s.id })));
  // Robust normalization for qualities
  const qualitiesArr = normalizeQualities(frame.qualities);
  // Enhanced criteria based on learnings from examples
  const criteriaExplanations = [
    'Six-word story power: Does the emoji + summary contain the entire moment?',
    'Voice recognition: Would the experiencer say "that\'s my brain right there"?',
    'Instant recall: Would seeing "🚪 Hope and dread at door" bring the whole experience back?',
    'Storyboard clarity: Could you draw this specific moment?',
    'Experiential wholeness: Is this one unified moment, not multiple squeezed together?',
    'Temporal flow: Can you sense what came before and what follows?',
    'Emotional truth: Does it capture how it actually felt, not sanitized?',
    'Nothing invented: Every detail traceable to the source? No interpretations added?',
    'Exact phrasing: Are quirks preserved? ("figure tips" not "fingertips")',
    'Shot accuracy: Does the attention shape match how awareness actually moved?',
    'Quality authenticity: Do qualities emerge from the text, not forced categories?',
    'Summary compression: Does every word carry maximum experiential weight?',
    'Recognition trigger: Would this 5-7 word story make someone relive the moment?'
  ];

  // Get fragment texts
  const fragDetails = frame.sources.map(f => {
    const src = batch.find(s => s.id === f.sourceId);
    let fragText = '';
    if (src && typeof f.start === 'number' && typeof f.end === 'number') {
      fragText = src.content.slice(f.start, f.end);
    }
    return `Source ${f.sourceId} [${f.start}-${f.end}]: "${fragText}"`;
  }).join('\n');

  const safeContext = context?.trim() || '[Judge based on fragment text alone]';

  // Gather full source text for all involved sources
  const fullSourceText = frame.sources.map(f => {
    const src = batch.find(s => s.id === f.sourceId);
    return src ? `Source ${f.sourceId}: ${src.content}` : '';
  }).join('\n\n');

  return `${FRAMEWORK_CONTEXT}

Evaluate this frame as if you're the person who lived it. Would you recognize yourself?

FRAME:
Emoji: ${frame.emoji}
Summary: ${frame.summary}
Shot: ${frame.shot}
Qualities: ${qualitiesArr.map(q => `\n  - ${q.type}: "${q.manifestation}"`).join('')}

SOURCE FRAGMENTS:
${fragDetails}

CONTEXT:
${safeContext}

FULL SOURCE TEXT FOR REFERENCE:
${fullSourceText}

EVALUATION CRITERIA:
${criteriaExplanations.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Key questions:
- If this was your experience, would reading this frame make you feel seen?
- Are there multiple moments crammed into one frame?
- Does every word serve the moment, or is there padding?

Return JSON: { 
  pass: true/false, 
  reasons: ["specific issues that break recognition"],
  strengths: ["what creates that 'my brain' feeling"],
  suggestions: ["concrete ways to increase recognition"]
}`;
}

export function createRevisionPrompt(frame: AssignFrame, critique: CritiqueResult, context: string, batch: SourceRecord[], fullSourceText?: string): string {
  // Debug log: show variables used
  console.error('[prompts] createRevisionPrompt called with frame:', frame, 'critique:', critique, 'context:', context.slice(0, 80), 'batch:', batch.map(s => ({ id: s.id })), 'fullSourceText:', fullSourceText ? fullSourceText.slice(0, 80) : undefined);
  // Use frame.sources for legacy compatibility if frame.fragments is undefined
  const sourceSpans: { sourceId: string; start: number; end: number }[] = (Array.isArray((frame as any).fragments) ? (frame as any).fragments : (frame as any).sources) || [];
  const sourcesDetails = sourceSpans.map((f: { sourceId: string; start: number; end: number }) => {
    const src = batch.find(s => s.id === f.sourceId);
    let fragText = '';
    if (src && typeof f.start === 'number' && typeof f.end === 'number') {
      fragText = src.content.slice(f.start, f.end);
    }
    return `  - Source ${f.sourceId} [${f.start}-${f.end}]: "${fragText}"`;
  }).join('\n');

  const qualitiesStr = (frame.qualities || []).map(q => 
    `${q.type}: "${q.manifestation}"`
  ).join('\n  ');

  const safeContext = context?.trim() || '[Use only the selected source text to create the frame]';

  return `${FRAMEWORK_CONTEXT}

REVISION TASK:
You are revising a frame that did not pass critique. Carefully read the feedback and suggestions below, and revise the frame to address all issues while preserving the authentic voice, experiential wholeness, and all original constraints (no hallucination, no invented details, preserve exact phrasing, etc).

ORIGINAL FRAME:
Emoji: ${frame.emoji}
Summary: ${frame.summary}
Shot: ${frame.shot}
Qualities:
  ${qualitiesStr}
Sources:
${sourcesDetails}

CRITIQUE FEEDBACK:
Reasons for failure:
${(critique.reasons || []).map((r: string) => `- ${r}`).join('\n')}
Suggestions for improvement:
${(Array.isArray((critique as any).suggestions) ? (critique as any).suggestions : []).map((s: string) => `- ${s}`).join('\n')}

CONTEXT:
${safeContext}
${fullSourceText ? `

FULL SOURCE TEXT FOR REFERENCE:
${fullSourceText}
` : ''}
INSTRUCTIONS:
- Revise the frame so it fully addresses the critique feedback and suggestions.
- If the critique suggests splitting into multiple frames, return as many frames as needed to cover all meaningful moments in the selected source text. Each frame should have its own emoji, summary, shot, qualities, and sources.
- Be aggressive in covering all meaningful experiential content—do not leave important moments or text unframed.
- You may move or adjust the source highlights if a different span better fits the feedback, but do not invent or hallucinate any details not present in the source.
- Preserve the authentic voice and experiential specificity.
- Output only a JSON array of frames, each with this structure:
[
  {
    "emoji": "...",
    "summary": "...",
    "shot": "...",
    "qualities": [
      {"type": "...", "manifestation": "..."}
    ],
    "sources": [
      {"sourceId": "...", "text": "..."}
    ]
  },
  ...
]
`;
}

// Batch framing prompt for the new pipeline
export async function createBatchFramePrompt(batch: import('./types.js').SourceRecord[], allSources?: any[]): Promise<string> {
  // Helper for semantic context
  function hasContent(obj: unknown): obj is { content: string, id: string } {
    return typeof obj === 'object' && obj !== null && 'content' in obj && typeof (obj as any).content === 'string';
  }
  // Load embeddings once for all semantic searches
  let embeddings: Record<string, number[]> = {};
  if (Array.isArray(allSources) && allSources.length > 1) {
    const { loadEmbeddings } = await import('./embeddings.js');
    embeddings = await loadEmbeddings();
    console.log(`[semantic context] Embeddings loaded: ${Object.keys(embeddings).length} keys`);
    if (Object.keys(embeddings).length === 0) {
      console.warn('[semantic context] WARNING: No embeddings found. Semantic search will not return results.');
    }
  }
  // For each source, gather context (reflects_on + semantic search)
  const contextBlocks = await Promise.all(batch.map(async src => {
    let contextBlock = '';
    // Reflects_on (forward)
    const reflectsOnIds: string[] = Array.isArray(src.reflects_on) ? src.reflects_on : [];
    let reflectsOnTexts: string[] = [];
    if (reflectsOnIds.length > 0 && Array.isArray(allSources) && allSources.length > 0) {
      reflectsOnTexts = reflectsOnIds.map(refId => {
        const ref = allSources.find((r: any) => r.id === refId);
        return ref ? `[reflects_on: ${ref.id}] ${ref.content}` : `[reflects_on: ${refId}] [content unavailable]`;
      }).filter(Boolean);
      if (reflectsOnTexts.length > 0) {
        contextBlock += 'REFLECTED SOURCES (referenced by this source):\n' + reflectsOnTexts.join('\n---\n') + '\n';
      }
    }
    // Reflections about this source (reverse)
    let reflectionsAboutTexts: string[] = [];
    if (Array.isArray(allSources) && allSources.length > 0) {
      const reflectionsAbout = allSources.filter((r: any) => Array.isArray(r.reflects_on) && r.reflects_on.includes(src.id));
      reflectionsAboutTexts = reflectionsAbout.map(ref => `[reflected_by: ${ref.id}] ${ref.content}`);
      if (reflectionsAboutTexts.length > 0) {
        contextBlock += 'REFLECTIONS ABOUT THIS SOURCE (referenced by others):\n' + reflectionsAboutTexts.join('\n---\n') + '\n';
      }
    }
    // Semantic context
    let semanticContextStrings: string[] = [];
    if (Array.isArray(allSources) && allSources.length > 1 && Object.keys(embeddings).length > 0) {
      // Exclude self and reflects_on
      const candidates = allSources.filter(s => s.id !== src.id && !reflectsOnIds.includes(s.id));
      console.log(`[semantic context] Candidates for source ${src.id}: ${candidates.map(s => s.id).join(', ')}`);
      const results = await rawSemanticSearch(src.content, candidates, embeddings, 3, 'source');
      if (Array.isArray(results)) {
        semanticContextStrings = (results as unknown[]).filter(hasContent).map(r => `[semantic: ${r.id}] ${r.content}`);
        // Log returned IDs and relevance if available
        console.log(`[semantic context] Results for source ${src.id}: ${results.map((r: any) => `${r.id}${r.relevance !== undefined ? ` (score: ${r.relevance.toFixed(3)})` : ''}`).join(', ')}`);
      } else if (results && 'groups' in results) {
        const flatResults = (results as { groups: { items: unknown[] }[] }).groups.flatMap(g => g.items.filter(hasContent));
        semanticContextStrings = flatResults.map(r => `[semantic: ${(r as any).id}] ${(r as any).content}`);
        console.log(`[semantic context] Grouped results for source ${src.id}: ${flatResults.map((r: any) => `${r.id}${r.relevance !== undefined ? ` (score: ${r.relevance.toFixed(3)})` : ''}`).join(', ')}`);
      }
      if (semanticContextStrings.length > 0) {
        contextBlock += 'SEMANTIC CONTEXT (similar sources):\n' + semanticContextStrings.join('\n---\n') + '\n';
      }
    }
    if (!contextBlock) contextBlock = '[No additional context found]';
    return `Source ${src.id} CONTEXT:\n${contextBlock}`;
  }));

  const sourceTexts = batch.map(s => `Source ${s.id}:\n${s.content}`).join('\n\n');
  return `${FRAMEWORK_CONTEXT}
\n${SIX_WORD_STORY_GUIDANCE}
\n${QUALITY_DEFINITIONS}
\nYour task: Process the following sources and propose a set of frames that together cover all the sources. Each frame must:
\nADDITIONAL CONTEXT FOR EACH SOURCE:\n${contextBlocks.join('\n\n')}
\nReturn an array of frames, each with this structure:
{
  "emoji": "...",
  "summary": "5-7 word story",
  "shot": "one of: ${ALLOWED_SHOTS.join(', ')}",
  "qualities": [
    {"type": "quality_type", "manifestation": "rich, specific, supported by source text"}
  ],
  "sources": [
    {"sourceId": "src_123", "text": "exact text from source"}
  ]
}
\nFULL SOURCES:
${sourceTexts}
`;
}

export function createBatchRevisionPrompt(frames: any[], critique: string[], batch: any[], fullSourceText: string): string {
  // Map sourceId to perspective/experiencer for quick lookup
  const sourceMeta: Record<string, { perspective?: string; experiencer?: string }> = {};
  for (const src of batch) {
    sourceMeta[src.id] = { perspective: src.perspective || 'I', experiencer: src.experiencer || 'self' };
  }
  // For each frame, show the perspective/experiencer of the first source
  const framesWithPerspective = frames.map((frame: any) => {
    const firstSourceId = frame.sources && frame.sources[0] && frame.sources[0].sourceId;
    const meta = firstSourceId ? sourceMeta[firstSourceId] : { perspective: 'I', experiencer: 'self' };
    return { ...frame, perspective: meta.perspective, experiencer: meta.experiencer };
  });
  return `You are revising a batch of experiential frames for lived experience. Each frame captures a specific moment, with qualities (type + manifestation) that must be clearly supported by the fragment text. Your task is to revise the entire batch so that:

- Every quality is clearly and specifically supported by its fragment (do not simply drop unsupported qualities; instead, rephrase, split, or reassign as needed to preserve experiential detail)
- All meaningful content from the sources is covered (no large unframed gaps)
- No invented or hallucinated details are introduced
- The authentic voice and experiential specificity are preserved
- Split the source into the smallest meaningful, self-contained moments. Do NOT merge multiple moments into one frame. Each frame should be as atomic as possible, like a single shot or attention shift. If in doubt, err on the side of more, smaller frames rather than fewer, larger ones. Do not split a single feeling, action, or attention shift across multiple frames. Each frame should be as atomic as possible, but not so granular that a single experiential unit is broken up.

For each frame, here is the perspective and experiencer (from the first source):
${framesWithPerspective.map((f, i) => `Frame ${i + 1}: perspective=${f.perspective}, experiencer=${f.experiencer}`).join('\n')}

CRITIQUE (issues to address):
${critique.length > 0 ? critique.map((c, i) => `${i + 1}. ${c}`).join('\n') : 'None'}

ORIGINAL FRAMES (as JSON array):
${JSON.stringify(framesWithPerspective, null, 2)}

FULL SOURCE TEXT:
${fullSourceText}

INSTRUCTIONS:
- Revise the batch so that all critique points are addressed.
- If a quality is not supported, do not simply drop it; instead, revise the frame (rephrase, split, or reassign) to preserve as much experiential detail as possible.
- If needed, split or merge frames to ensure all meaningful content is covered.
- Output only a JSON array of revised frames, each with this structure:
[
  {
    "emoji": "...",
    "summary": "...",
    "shot": "...",
    "qualities": [
      {"type": "...", "manifestation": "..."}
    ],
    "sources": [
      {"sourceId": "...", "text": "..."}
    ]
  },
  ...
]
`;
}

// Batch weaving prompt for auto-weaving scenes from moments
export function createBatchWeavePrompt(batch: any[]): string {
  // Compose moment summaries for the prompt
  const momentList = batch.map(m => {
    return `ID: ${m.id}\nEmoji: ${m.emoji}\nSummary: ${m.summary}\nQualities: ${m.qualities && m.qualities.length ? m.qualities.map((q: any) => `${q.type}: ${q.manifestation}`).join('; ') : ''}`;
  }).join('\n\n');

  return `You are a narrative weaver, connecting lived moments into scenes. Each scene is a higher-level frame, capturing the arc, transformation, or pattern that emerges from the selected moments.

Your task:
Given the following moments, propose one or more scenes. Each scene should:
- Reference only the provided moments (by their IDs).
- Have an emoji and a 5–7 word, verb-forward, lived summary that captures the arc or transformation.
- Include a short, present-tense, first-person narrative describing the journey or pattern across these moments.
- Assign a shot type that best fits the overall attention pattern.
- List the momentIds that belong to the scene (in order).

Guidance:
- Do not invent or hallucinate content—use only what is present in the selected moments.
- The scene summary should feel like a lived, moving arc, not a headline or label.
- Start with a verb or action when possible—let the scene move.
- Think of scenes as branches connecting moments into a larger limb of experience.

Examples (do not copy, use for style and compression guidance):
- Instead of: "A journey through loss and renewal" (headline)
  Write: "Let go, stumble, find new ground together"
- Instead of: "Overcoming self-doubt" (headline)
  Write: "Doubt shadows me, courage cracks through"

Return an array of scenes, each with this structure:
{
  "emoji": "...",
  "summary": "5-7 word, verb-forward, lived arc",
  "shot": "one of: moment-of-recognition, sustained-attention, crossing-threshold, peripheral-awareness, directed-momentum, holding-opposites",
  "momentIds": ["mom_123", "mom_456", ...],
  "narrative": "Short, present-tense, first-person account of the journey or transformation across these moments."
}

MOMENTS:
${momentList}
`;
} 