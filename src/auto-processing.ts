import { createLLMProvider } from './llm-provider.js';
import { generateEmbedding, queryEmbedding, deleteEmbedding } from './embeddings.js';
import type { SourceRecord, MomentRecord, QualityType, ShotType } from './types.js';
import { createBatchFramePrompt, createBatchRevisionPrompt } from './prompts.js';
import { generateId } from './storage.js';

export interface FrameFragment {
  sourceId: string;
  start?: number;
  end?: number;
  text?: string;
}

export interface DraftFrame {
  sources: FrameFragment[];
  shot: ShotType;
  qualities: Array<{ type: QualityType; manifestation: string }>;
}

export interface AssignFrame {
  emoji: string;
  summary: string;
  shot: ShotType;
  qualities: Array<{ type: QualityType; manifestation: string }>;
  sources: FrameFragment[];
}

export interface CritiqueResult {
  pass: boolean;
  reasons: string[];
}

export interface AutoProcessingResult {
  success: boolean;
  created?: MomentRecord;
  error?: string;
  warning?: string;
}

const debugLogs: string[] = [];
function addDebugLog(msg: string) { debugLogs.push(msg); }
export function getAutoProcessingDebugLogs() { return debugLogs; }

// Helper: recursively, bidirectionally collect all related sources via reflects_on
function getAllRelatedSources(
  sourceId: string,
  allSources: SourceRecord[],
  visited = new Set<string>()
): SourceRecord[] {
  if (visited.has(sourceId)) return [];
  visited.add(sourceId);
  const source = allSources.find(s => s.id === sourceId);
  if (!source) return [];
  // Forward: sources this source reflects on
  const forward = (source.reflects_on || [])
    .flatMap(refId => getAllRelatedSources(refId, allSources, visited));
  // Backward: sources that reflect on this source
  const backward = allSources
    .filter(s => (s.reflects_on || []).includes(sourceId))
    .flatMap(s => getAllRelatedSources(s.id, allSources, visited));
  return [source, ...forward, ...backward];
}

export class AutoProcessor {
  private lastBatch: SourceRecord[] = [];
  protected llmProvider = createLLMProvider();

  // Main entry: auto-frame with context enrichment and validation
  async autoFrameSources(options: {
    sourceIds?: string[];
    timeWindowMinutes?: number;
    linkageSourceId?: string;
    maxBatchSize?: number;
    semanticSimilarity?: boolean;
  } = {}): Promise<AutoProcessingResult[]> {
    // Dynamic imports to fix module load order
    const { getSources, saveMoment, updateMoment } = await import('./storage.js');
    
    const allSources = await getSources();
    let batch: SourceRecord[];
    if (options.sourceIds && options.sourceIds.length > 0) {
      const idSet = new Set(options.sourceIds);
      batch = allSources.filter(s => idSet.has(s.id));
    } else {
      batch = this.selectBatch(allSources, options);
    }
    this.lastBatch = batch;
    if (batch.length === 0) {
      return [{ success: false, error: 'No unframed sources found for auto-framing.' }];
    }

    let tries = 0;
    const maxTries = 3;
    let frames: AssignFrame[] = [];
    let validation: { errors: string[]; warnings: string[] } = { errors: [], warnings: [] };
    let lastCritique: string[] = [];
    let lastPrompt = '';
    const fullSourceText = batch.map(s => s.content).join('\n\n');
    while (tries < maxTries) {
      if (tries === 0) {
        // 1. Frame the sources (initial batch prompt)
        lastPrompt = await createBatchFramePrompt(batch);
        const batchResponse = await this.llmProvider.complete(lastPrompt, { maxTokens: 3000 });
        frames = this.parseBatchFrameResponse(batchResponse);
      } else {
        // Batch revision prompt for all frames at once
        lastPrompt = createBatchRevisionPrompt(frames, lastCritique, batch, fullSourceText);
        const revisionResponse = await this.llmProvider.complete(lastPrompt, { maxTokens: 3000 });
        frames = this.parseBatchFrameResponse(revisionResponse);
      }

      // 2. Programmatic validation (schema, coverage, allowed types)
      validation = await this.validateBatchFrames(frames, batch);
      if (validation.errors.length === 0) {
        break;
      } else {
        lastCritique = [...(validation.errors || []), ...(validation.warnings || [])];
        tries++;
      }
    }

    if (validation.errors.length === 0) {
      // 4. Save moments
      const results: AutoProcessingResult[] = [];
      for (const frame of frames) {
        const moment = await saveMoment({
          id: generateId('mom'),
          emoji: frame.emoji,
          summary: frame.summary,
          qualities: frame.qualities,
          narrative: frame.summary,
          shot: frame.shot,
          sources: frame.sources.map((frag: FrameFragment) => ({ sourceId: frag.sourceId })),
          created: new Date().toISOString(),
          when: this.inheritWhenFromSources(frame.sources, batch),
          experiencer: batch[0]?.experiencer || 'unknown',
          reframedBy: undefined,
        });
        // --- ReframedBy logic for moments ---
        const { getMoments } = await import('./storage.js');
        const allMoments = await getMoments();
        const newSourceSet = new Set(moment.sources.map(s => s.sourceId));
        const reframed: { id: string; summary: string }[] = [];
        for (const m of allMoments) {
          if (m.id === moment.id) continue;
          if (m.reframedBy) continue;
          const mSourceSet = new Set(m.sources.map(s => s.sourceId));
          // Proper subset: mSourceSet ⊂ newSourceSet
          if (mSourceSet.size < newSourceSet.size && [...mSourceSet].every(sid => newSourceSet.has(sid))) {
            await updateMoment(m.id, { reframedBy: moment.id });
            await deleteEmbedding(m.id);
            reframed.push({ id: m.id, summary: m.summary });
          }
        }
        (moment as any)._reframed = reframed;
        results.push({ success: true, created: moment, warning: (validation.warnings.length > 0 ? validation.warnings.join('; ') : undefined) });
      }
      return results;
    } else {
      return [{ success: false, error: 'Batch did not pass validation after 3 attempts: ' + [...(validation.errors || []), ...(validation.warnings || [])].join('; ') }];
    }
  }

  // --- Batch selection logic ---
  selectBatch(sources: SourceRecord[], options: any): SourceRecord[] {
    const now = Date.now();
    let batch = sources.filter(() => !this.isFramed());
    // 1. Time window (created or when)
    if (options.timeWindowMinutes) {
      const cutoff = now - options.timeWindowMinutes * 60 * 1000;
      batch = batch.filter(s => {
        const t = new Date(s.created).getTime();
        return t >= cutoff;
      });
    }
    // 2. Linkage (reflects_on)
    if (options.linkageSourceId) {
      batch = batch.filter(s => s.reflects_on?.includes(options.linkageSourceId));
    }
    // 3. Semantic similarity (if too many)
    if (options.maxBatchSize && batch.length > options.maxBatchSize) {
      if (options.semanticSimilarity) {
        // Use semantic search to cluster
        // For now, just pick the top-N by semantic similarity to the first source
        // (Replace with real clustering if available)
        return batch; // We'll handle this in a future improvement
      } else {
        batch = batch.slice(0, options.maxBatchSize);
      }
    }
    return batch;
  }

  isFramed(): boolean {
    // TODO: Implement logic to check if a source is already framed (referenced by a moment)
    // For now, assume all sources are unframed
    return false;
  }

  // Prompt construction for auto-framing and assignment
  // See: FRAMED_MOMENTS.md and 5 - Experiments/*.md for theory, criteria, and examples
  // Validation Framework (13 criteria):
  // 1. Voice recognition ("that's how I talk")
  // 2. Experiential completeness
  // 3. Visual anchorability
  // 4. Temporal flow implied
  // 5. Emotional atmosphere preserved
  // 6. Self-containment
  // 7. Narrative coherence
  // 8. Causal logic
  // 9. Temporal knowledge accuracy
  // 10. No invented details
  // 11. Voice pattern fidelity
  // 12. Minimal transformation
  // 13. Physical/sensory grounding
  //
  // Prompt improvements: minimal transformation, authentic voice, physical/sensory grounding, iterative refinement, avoid over-interpretation, preserve original order, use examples if needed.

  // --- Context enrichment ---
  async findContextForFrame(fragments: FrameFragment[], batch: SourceRecord[]): Promise<string> {
    // Use the actual text of the fragments as the query, or the whole source if fragment is short
    let queryText = '';
    let queryType = 'fragment';
    if (fragments.length === 1) {
      const frag = fragments[0];
      const src = batch.find(s => s.id === frag.sourceId);
      if (src) {
        const fragText = src.content.slice(frag.start, frag.end);
        if (fragText.length < 40) {
          queryText = src.content;
          queryType = 'source';
        } else {
          queryText = fragText;
        }
      }
    }
    if (!queryText) {
      // Fallback: concatenate all fragment texts
      queryText = fragments.map(f => {
        const src = batch.find(s => s.id === f.sourceId);
        return src ? src.content.slice(f.start, f.end) : '';
      }).join(' ');
      queryType = 'multi-fragment';
    }
    // Debug: log the query text and type
    addDebugLog(`[semantic search] QueryType: ${queryType}, Query: ${queryText}`);
    // Use all sources for semantic search
    const { getSources } = await import('./storage.js');
    const allRecords = await getSources();
    addDebugLog(`[semantic search] Using all sources (${allRecords.length}) for context search.`);
    // Pinecone-based semantic search
    const queryEmbeddingVec = await generateEmbedding(queryText);
    const pineconeResults = await queryEmbedding(queryEmbeddingVec, 3);
    const idToRecord = new Map(allRecords.map(r => [r.id, r]));
    const results = (pineconeResults.matches || []).map((match: any) => {
      const rec = idToRecord.get(match.id);
      if (!rec) return null;
      return { id: rec.id, content: (rec as any).content || (rec as any).summary || '' };
    }).filter(Boolean);
    function hasContent(obj: unknown): obj is { content: string } {
      return typeof obj === 'object' && obj !== null && 'content' in obj && typeof (obj as any).content === 'string';
    }
    let contextStrings: string[] = [];
    if (Array.isArray(results)) {
      contextStrings = (results as unknown[]).filter(hasContent).map(r => r.content);
    } else if (results && 'groups' in results) {
      contextStrings = (results as { groups: { items: unknown[] }[] }).groups.flatMap(g => g.items.filter(hasContent).map(r => r.content));
    }
    // Add reflects_on sources if present (recursive, bidirectional)
    const reflectsOnTexts: string[] = [];
    const seen = new Set<string>();
    for (const frag of fragments) {
      const src = batch.find(s => s.id === frag.sourceId);
      if (src) {
        const related = getAllRelatedSources(src.id, allRecords);
        for (const rel of related) {
          if (rel.id !== src.id && rel.content && !seen.has(rel.id)) {
            reflectsOnTexts.push(`[reflects_on: ${rel.id}] ${rel.content}`);
            seen.add(rel.id);
          }
        }
      }
    }
    if (reflectsOnTexts.length > 0) {
      addDebugLog(`[reflects_on] Added context from reflects_on sources: ${reflectsOnTexts.map(t => t.slice(0, 80)).join(' | ')}`);
    }
    // Compose context block
    let contextBlock = '';
    if (reflectsOnTexts.length > 0) {
      contextBlock += 'REFLECTED SOURCES (referenced by this source):\n' + reflectsOnTexts.join('\n---\n') + '\n';
    }
    if (contextStrings.length > 0) {
      contextBlock += 'SEMANTIC CONTEXT (similar sources):\n' + contextStrings.join('\n---\n') + '\n';
    }
    if (!contextBlock) contextBlock = '[No additional context found]';
    addDebugLog(`[context block] For frame: ${contextBlock.slice(0, 200)}`);
    return contextBlock;
  }

  // --- Response parsing ---
  parseSplitResponse(response: string): DraftFrame[] {
    try {
      const jsonMatch = response.match(/\[.*\]/s);
      if (!jsonMatch) throw new Error('No JSON array found');
      const arr = JSON.parse(jsonMatch[0]);
      // New schema: array of { text }
      if (Array.isArray(arr) && arr.length > 0 && typeof arr[0] === 'object' && 'text' in arr[0]) {
        const batch = this.lastBatch || [];
        const source = batch[0];
        if (!source) return [];
        const usedRanges: Array<{ start: number; end: number; text: string }> = [];
        const usedTexts = new Set<string>();
        let lastIndex = 0;
        const draftFrames: DraftFrame[] = [];
        const errors: string[] = [];
        const warnings: string[] = [];
        for (const fragObj of arr) {
          const fragText = fragObj.text;
          if (!fragText || typeof fragText !== 'string' || fragText.trim().length === 0) {
            errors.push('Fragment is empty or whitespace.');
            continue;
          }
          if (usedTexts.has(fragText)) {
            errors.push(`Duplicate fragment: "${fragText}"`);
            continue;
          }
          const idx = source.content.indexOf(fragText, lastIndex);
          if (idx === -1) {
            errors.push(`Fragment not found in source: "${fragText}"`);
            continue;
          }
          const start = idx;
          const end = idx + fragText.length;
          usedRanges.push({ start, end, text: fragText });
          usedTexts.add(fragText);
          lastIndex = end; // move forward to avoid overlapping
          draftFrames.push({
            sources: [{ sourceId: source.id, start, end }],
            shot: '' as ShotType,
            qualities: []
          });
        }
        // Sort ranges by start
        usedRanges.sort((a, b) => a.start - b.start);
        // Check for overlaps
        for (let i = 1; i < usedRanges.length; i++) {
          if (usedRanges[i].start < usedRanges[i - 1].end) {
            errors.push(`Overlapping fragments: [${usedRanges[i - 1].start}, ${usedRanges[i - 1].end}) and [${usedRanges[i].start}, ${usedRanges[i].end})`);
          }
        }
        // Check for gaps
        let lastEnd = 0;
        for (const range of usedRanges) {
          if (range.start > lastEnd) {
            const gapText = source.content.slice(lastEnd, range.start);
            if (gapText.trim().length > 0) {
              warnings.push(`Unframed text at: [${lastEnd}, ${range.start}) -> "${gapText.trim()}"`);
            }
          }
          lastEnd = Math.max(lastEnd, range.end);
        }
        if (lastEnd < source.content.length) {
          const gapText = source.content.slice(lastEnd);
          if (gapText.trim().length > 0) {
            warnings.push(`Unframed text at: [${lastEnd}, ${source.content.length}) -> "${gapText.trim()}"`);
          }
        }
        // Attach errors/warnings to frames for downstream logic
        if (errors.length > 0 || warnings.length > 0) {
          (draftFrames as any)._validation = { errors, warnings };
        }
        return draftFrames;
      }
      // Fallback: old schema
      return arr;
    } catch (e) {
      return [];
    }
  }

  parseAssignResponse(response: string): AssignFrame {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      return { emoji: '', summary: '', shot: '' as ShotType, qualities: [], sources: [] };
    }
  }

  parseCritiqueResponse(response: string): CritiqueResult {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      const parsed = JSON.parse(jsonMatch[0]);
      return { pass: !!parsed.pass, reasons: parsed.reasons || [] };
    } catch (e) {
      return { pass: false, reasons: ['Failed to parse critique response'] };
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async autoWeaveMoments(momentIds: string[]): Promise<{ success: boolean; created?: any; error?: string }> {
    // 1. Gather the batch of moments
    const { getMoments, saveScene, updateScene, getScenes } = await import('./storage.js');
    const allMoments = await getMoments();
    const batch = allMoments.filter(m => momentIds.includes(m.id));
    if (batch.length === 0) {
      return { success: false, error: 'No valid moments found for auto-weaving.' };
    }

    // 2. Build the LLM prompt
    const { createBatchWeavePrompt } = await import('./prompts.js');
    const prompt = createBatchWeavePrompt(batch);
    const llmResponse = await this.llmProvider.complete(prompt, { maxTokens: 2000 });

    // 3. Parse the LLM output (expecting an array of scenes)
    let scenes: any[] = [];
    try {
      const jsonMatch = llmResponse.match(/\[.*\]/s);
      if (!jsonMatch) throw new Error('No JSON array found');
      scenes = JSON.parse(jsonMatch[0]);
    } catch (e) {
      return { success: false, error: 'Failed to parse LLM scene output: ' + (e instanceof Error ? e.message : String(e)) };
    }

    // 4. Validate scenes
    const batchIds = new Set(batch.map(m => m.id));
    const allowedShots = [
      'moment-of-recognition',
      'sustained-attention',
      'crossing-threshold',
      'peripheral-awareness',
      'directed-momentum',
      'holding-opposites'
    ];
    const results: { success: boolean; created?: any; error?: string }[] = [];
    for (const scene of scenes) {
      // Validate required fields
      if (!scene || typeof scene !== 'object' ||
        typeof scene.emoji !== 'string' ||
        typeof scene.summary !== 'string' ||
        typeof scene.shot !== 'string' ||
        !Array.isArray(scene.momentIds) ||
        typeof scene.narrative !== 'string') {
        results.push({ success: false, error: 'Scene missing required fields.' });
        continue;
      }
      // Validate shot type
      if (!allowedShots.includes(scene.shot)) {
        results.push({ success: false, error: `Invalid shot type: ${scene.shot}` });
        continue;
      }
      // Validate all momentIds exist in batch
      if (!scene.momentIds.every((id: string) => batchIds.has(id))) {
        results.push({ success: false, error: 'Scene references momentIds not in batch.' });
        continue;
      }
      // Validate summary: 5-7 words, verb-forward (basic check: starts with a verb or action word)
      const wordCount = scene.summary.trim().split(/\s+/).length;
      if (wordCount < 5 || wordCount > 7) {
        results.push({ success: false, error: `Scene summary not 5-7 words: "${scene.summary}"` });
        continue;
      }
      
      // Detect multiple experiencers and handle appropriately
      const uniqueExperiencers = [...new Set(batch.map(m => m.experiencer).filter(Boolean))] as string[];
      const isMultiExperiencer = uniqueExperiencers.length > 1;
      
      // For multi-experiencer scenes, ensure the narrative acknowledges different perspectives
      if (isMultiExperiencer && scene.narrative) {
        // Check if narrative already acknowledges multiple perspectives
        const hasMultiPerspective = uniqueExperiencers.some(exp => 
          scene.narrative!.toLowerCase().includes(exp.toLowerCase())
        );
        
        if (!hasMultiPerspective) {
          // Add a note about multi-experiencer composition
          scene.narrative = `[Multi-experiencer scene: ${uniqueExperiencers.join(', ')}] ${scene.narrative}`;
        }
      }
      
      // Save the scene with multi-experiencer support
      const saved = await saveScene({
        id: generateId('sce'),
        emoji: scene.emoji,
        summary: scene.summary,
        shot: scene.shot,
        momentIds: scene.momentIds,
        narrative: scene.narrative,
        created: new Date().toISOString(),
        when: this.inheritWhenFromMoments(scene.momentIds, batch),
        experiencers: uniqueExperiencers,
        primaryExperiencer: uniqueExperiencers[0] || 'unknown',
        reframedBy: undefined,
      });
      // --- ReframedBy logic for scenes ---
      const allScenes = await getScenes();
      const newMomentSet = new Set(saved.momentIds);
      const reframed: { id: string; summary: string }[] = [];
      for (const s of allScenes) {
        if (!s || typeof s.id !== 'string') continue;
        if (s.id === saved.id) continue;
        if (s.reframedBy) continue;
        const sMomentSet = new Set(s.momentIds);
        if (sMomentSet.size < newMomentSet.size && [...sMomentSet].every(mid => newMomentSet.has(mid))) {
          await updateScene(s.id, { reframedBy: saved.id });
          await deleteEmbedding(String(s.id));
          reframed.push({ id: s.id, summary: s.summary });
        }
      }
      (saved as any)._reframed = reframed;
      results.push({ success: true, created: saved });
    }
    // Return first success or error
    const firstSuccess = results.find(r => r.success);
    if (firstSuccess) return firstSuccess;
    return results[0] || { success: false, error: 'No valid scenes created.' };
  }

  // Parse the LLM's batch output and map text to fragments with start/end indices
  parseBatchFrameResponse(response: string): AssignFrame[] {
    const ALLOWED_QUALITY_TYPES = [
      'embodied',
      'attentional',
      'emotional',
      'purposive',
      'spatial',
      'temporal',
      'relational'
    ];
    
    const ALLOWED_SHOT_TYPES = [
      'moment-of-recognition',
      'sustained-attention',
      'crossing-threshold',
      'peripheral-awareness',
      'directed-momentum',
      'holding-opposites'
    ];
    
    try {
      const jsonMatch = response.match(/\[.*\]/s);
      if (!jsonMatch) throw new Error('No JSON array found');
      const arr = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(arr)) return [];
      const validFrames: AssignFrame[] = [];
      for (const frameObj of arr) {
        // Validate required fields
        if (!frameObj || typeof frameObj !== 'object') continue;
        const { emoji, summary, shot, qualities, sources } = frameObj;
        if (
          typeof emoji !== 'string' ||
          typeof summary !== 'string' ||
          typeof shot !== 'string' ||
          !Array.isArray(qualities) ||
          !Array.isArray(sources)
        ) {
          addDebugLog(`[parseBatchFrameResponse] Skipping invalid frame: missing required fields.`);
          continue;
        }
        
        // STRICT VALIDATION: Reject frames with invalid shot types
        if (!ALLOWED_SHOT_TYPES.includes(shot)) {
          addDebugLog(`[parseBatchFrameResponse] REJECTING frame with invalid shot type: "${shot}". Valid options: ${ALLOWED_SHOT_TYPES.join(', ')}`);
          continue;
        }
        
        // STRICT VALIDATION: Reject frames with invalid quality types
        const invalidQualities = qualities.filter((q: any) => !ALLOWED_QUALITY_TYPES.includes(q.type));
        if (invalidQualities.length > 0) {
          addDebugLog(`[parseBatchFrameResponse] REJECTING frame with invalid quality types: ${JSON.stringify(invalidQualities)}. Valid options: ${ALLOWED_QUALITY_TYPES.join(', ')}`);
          continue;
        }
        
        // Validate fragments
        // Accept fragments with only sourceId and text (no start/end)
        const validSources: any[] = [];
        for (const frag of sources) {
          if (!frag || typeof frag !== 'object') continue;
          if (typeof frag.sourceId !== 'string' || typeof frag.text !== 'string') continue;
          validSources.push({ sourceId: frag.sourceId, text: frag.text });
        }
        if (validSources.length === 0) {
          addDebugLog(`[parseBatchFrameResponse] Skipping frame with no valid fragments: ${JSON.stringify(frameObj)}`);
          continue;
        }
        validFrames.push({
          emoji,
          summary,
          shot: shot as ShotType,
          qualities: qualities,
          sources: validSources
        });
      }
      return validFrames;
    } catch (e) {
      addDebugLog(`[parseBatchFrameResponse] Failed to parse response: ${e}`);
      return [];
    }
  }

  // Validate: all text present, all content covered, qualities supported by fragment text
  async validateBatchFrames(frames: AssignFrame[], batch: SourceRecord[]): Promise<{ errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    // Track coverage for each source
    const coverage: Record<string, boolean[]> = {};
    for (const src of batch) {
      coverage[src.id] = Array(src.content.length).fill(false);
    }
    for (const frame of frames) {
      for (const frag of frame.sources) {
        const src = batch.find(s => s.id === frag.sourceId);
        if (!src) {
          errors.push(`Source not found for fragment: ${frag.sourceId}`);
          continue;
        }
        // Support fragments with only text (no start/end)
        if (typeof frag.text === 'string' && frag.text.length > 0) {
          let searchStart = 0;
          let found = false;
          // Allow minor whitespace/ellipsis differences at start/end
          const clean = (s: string) => s.trim().replace(/^\.*|\.*$/g, '').replace(/\s+/g, ' ');
          const fragTextClean = clean(frag.text);
          while (searchStart < src.content.length) {
            const idx = src.content.indexOf(frag.text, searchStart);
            // Try exact match first
            if (idx !== -1) {
              found = true;
              for (let i = idx; i < idx + frag.text.length; i++) {
                coverage[src.id][i] = true;
              }
              searchStart = idx + frag.text.length;
              break;
            }
            // Try fuzzy match: ignore leading/trailing ellipses and whitespace
            const regex = new RegExp(fragTextClean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            const match = regex.exec(src.content);
            if (match) {
              found = true;
              const idx2 = match.index;
              for (let i = idx2; i < idx2 + match[0].length; i++) {
                coverage[src.id][i] = true;
              }
              searchStart = idx2 + match[0].length;
              break;
            }
            break;
          }
          if (!found) {
            errors.push(`Fragment text not found in source: "${frag.text}"`);
          }
        } else if (typeof frag.start === 'number' && typeof frag.end === 'number') {
          if (frag.start < 0 || frag.end > src.content.length || frag.start >= frag.end) {
            errors.push(`Invalid fragment range for source ${frag.sourceId}: [${frag.start}, ${frag.end})`);
            continue;
          }
          for (let i = frag.start; i < frag.end; i++) {
            coverage[frag.sourceId][i] = true;
          }
          const fragText = src.content.slice(frag.start, frag.end);
          if (frame.summary && !fragText) {
            errors.push(`Empty fragment text for summary: ${frame.summary}`);
          }
        }
      }
    }
    // Check for gaps in coverage
    for (const src of batch) {
      let inGap = false, gapStart = 0;
      for (let i = 0; i < src.content.length; i++) {
        if (!coverage[src.id][i] && !inGap) {
          inGap = true;
          gapStart = i;
        } else if (coverage[src.id][i] && inGap) {
          inGap = false;
          const gapText = src.content.slice(gapStart, i);
          if (gapText.trim().length > 0) {
            // Only treat as error if gap is large (>40 chars or >10% of source)
            if (gapText.length > 40 || gapText.length > 0.1 * src.content.length) {
              errors.push(`Large unframed text in source ${src.id} at [${gapStart}, ${i}): "${gapText.trim()}"`);
            } else {
              warnings.push(`Unframed text in source ${src.id} at [${gapStart}, ${i}): "${gapText.trim()}"`);
            }
          }
        }
      }
      if (inGap) {
        const gapText = src.content.slice(gapStart);
        if (gapText.trim().length > 0) {
          if (gapText.length > 40 || gapText.length > 0.1 * src.content.length) {
            errors.push(`Large unframed text in source ${src.id} at [${gapStart}, ${src.content.length}): "${gapText.trim()}"`);
          } else {
            warnings.push(`Unframed text in source ${src.id} at [${gapStart}, ${src.content.length}): "${gapText.trim()}"`);
          }
        }
      }
    }
    return { errors, warnings };
  }

  // TODO: Implement createBatchFramePrompt in prompts.js if not yet present

  // Helper: inherit when field from sources
  private inheritWhenFromSources(sources: FrameFragment[], batch: SourceRecord[]): string | undefined {
    const whenValues = new Set<string>();
    for (const frag of sources) {
      const src = batch.find(s => s.id === frag.sourceId);
      if (src && src.when) {
        whenValues.add(src.when);
      }
    }
    
    // If all sources have the same when, use it
    if (whenValues.size === 1) {
      return Array.from(whenValues)[0];
    }
    
    // If sources have different when values, use the earliest one
    if (whenValues.size > 1) {
      const sortedWhen = Array.from(whenValues).sort();
      return sortedWhen[0]; // Return earliest timestamp
    }
    
    // If no sources have when values, return undefined
    return undefined;
  }

  // Helper: inherit when field from moments
  private inheritWhenFromMoments(momentIds: string[], batch: MomentRecord[]): string | undefined {
    const whenValues = new Set<string>();
    for (const id of momentIds) {
      const moment = batch.find(m => m.id === id);
      if (moment && moment.when) {
        whenValues.add(moment.when);
      }
    }
    
    // If all moments have the same when, use it
    if (whenValues.size === 1) {
      return Array.from(whenValues)[0];
    }
    
    // If moments have different when values, use the earliest one
    if (whenValues.size > 1) {
      const sortedWhen = Array.from(whenValues).sort();
      return sortedWhen[0]; // Return earliest timestamp
    }
    
    // If no moments have when values, return undefined
    return undefined;
  }

  public async complete(prompt: string, opts: { maxTokens: number }) {
    return this.llmProvider.complete(prompt, opts);
  }
} 