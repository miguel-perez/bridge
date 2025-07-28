#!/usr/bin/env node
/**
 * Enhance migrated experiences using OpenAI to create proper Bridge format
 * - Transforms experienceQualities into authentic first-person sentences
 * - Determines which qualities should be false (not prominent)
 * - Improves context for clarity
 * - Selects appropriate emojis
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import { z } from 'zod';
import dotenv from 'dotenv';
import { errorLog, debugLog } from '../utils/safe-logger.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..');

// Schema for enhanced experience
const EnhancedExperienceSchema = z.object({
  experienceQualities: z.object({
    embodied: z.union([z.string(), z.literal(false)]),
    focus: z.union([z.string(), z.literal(false)]),
    mood: z.union([z.string(), z.literal(false)]),
    purpose: z.union([z.string(), z.literal(false)]),
    space: z.union([z.string(), z.literal(false)]),
    time: z.union([z.string(), z.literal(false)]),
    presence: z.union([z.string(), z.literal(false)]),
  }),
  context: z.string().optional(),
  emoji: z.string(),
});

interface Experience {
  id: string;
  source: string;
  emoji: string;
  created: string;
  who: string;
  experienceQualities: {
    embodied: string | false;
    focus: string | false;
    mood: string | false;
    purpose: string | false;
    space: string | false;
    time: string | false;
    presence: string | false;
  };
  context?: string;
}

const SYSTEM_PROMPT = `You are helping transform Bridge experiences into their proper format based on the Bridge philosophy.

Bridge captures experiential moments with 7 quality dimensions. Each quality should either be:
- false: if not prominent/receded from awareness in this moment
- A full sentence in the experiencer's authentic voice capturing how they uniquely notice that quality

QUALITY DIMENSIONS:
- embodied: how consciousness textures through body/mind (thinking/sensing)
- focus: attentional quality (narrow/broad)
- mood: emotional atmosphere (open/closed)
- purpose: directional momentum (goal/wander)
- space: spatial awareness (here/there)
- time: temporal orientation (past/future)
- presence: social quality (individual/collective)

IMPORTANT GUIDELINES:
1. Write qualities as complete sentences in first person, capturing the experiencer's unique way of noticing
2. Set qualities to false if they're not prominent in the experience
3. Keep sentences authentic to how someone would actually describe their experience
4. Don't force qualities that aren't naturally present
5. Context should be brief and add essential understanding (or omit if not needed)
6. Choose emojis that viscerally capture the experience

GOOD QUALITY EXAMPLES:
- embodied: "my shoulders creep toward my ears as tension builds"
- mood: "tears press against my eyes while I hold myself together"
- presence: "wanting to vanish from being perceived"
- time: "just one more hour until the round tables start"
- focus: "I can't stop noticing how exposed I feel"

BAD QUALITY EXAMPLES:
- "I feel strong physical sensations" (too clinical/descriptive)
- "emotional state" (not in authentic voice)
- "general temporal awareness" (meaningless placeholder)
- "intense emotional distress with urges to cry" (describing rather than experiencing)

CONTEXT GUIDELINES:
- Keep very brief (max 10 words)
- Only include if adds essential understanding
- Examples: "At a conference", "During team meeting", "After debugging session"
- Omit old format like "Occurred on X. From Y perspective. Processed Z"`;

async function enhanceExperience(
  openai: OpenAI,
  experience: Experience
): Promise<Partial<Experience>> {
  const userPrompt = `Transform this Bridge experience into proper format:

SOURCE (keep unchanged): ${experience.source}
WHO: ${experience.who}
CURRENT EMOJI: ${experience.emoji}
CURRENT CONTEXT: ${experience.context || 'none'}

CURRENT QUALITIES:
${Object.entries(experience.experienceQualities)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join('\n')}

Please provide a JSON response with:
1. experienceQualities: For each of the 7 qualities, either false or a first-person sentence
2. context: Brief context if needed for understanding (or empty string if not needed)
3. emoji: Single emoji that best captures this experience

Remember: Only include qualities that are genuinely prominent in the experience. Set others to false.

Return your response as valid JSON.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('No response from OpenAI');

    const enhanced = JSON.parse(content);
    const validated = EnhancedExperienceSchema.parse(enhanced);

    return {
      experienceQualities: validated.experienceQualities,
      context: validated.context || undefined,
      emoji: validated.emoji,
    };
  } catch (error) {
    errorLog(`Failed to enhance experience ${experience.id}: ${error}`);
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    console.log(`
Enhance Bridge experiences using OpenAI

Usage: npm run enhance-experiences [options]

Options:
  --input <file>       Input file (default: data/bridge.json)
  --output <file>      Output file (default: data/bridge-enhanced.json)
  --batch-size <n>     Batch size for processing (default: 5)
  --limit <n>          Process only first N experiences (for testing)
  --openai-key <key>   OpenAI API key (or use OPENAI_API_KEY env var)
`);
    return;
  }

  // Parse arguments
  const inputIndex = args.indexOf('--input');
  const outputIndex = args.indexOf('--output');
  const batchSizeIndex = args.indexOf('--batch-size');
  const limitIndex = args.indexOf('--limit');
  const apiKeyIndex = args.indexOf('--openai-key');

  const inputFile = inputIndex >= 0 ? args[inputIndex + 1] : 'data/bridge.json';
  const outputFile = outputIndex >= 0 ? args[outputIndex + 1] : 'data/bridge-enhanced.json';
  const batchSize = batchSizeIndex >= 0 ? parseInt(args[batchSizeIndex + 1]) : 5;
  const limit = limitIndex >= 0 ? parseInt(args[limitIndex + 1]) : undefined;
  const apiKey = apiKeyIndex >= 0 ? args[apiKeyIndex + 1] : process.env.OPENAI_API_KEY;

  if (!apiKey) {
    errorLog('OpenAI API key required. Set OPENAI_API_KEY or use --openai-key');
    process.exit(1);
  }

  const openai = new OpenAI({ apiKey });

  // Read input
  debugLog(`Reading experiences from ${inputFile}...`);
  const data = JSON.parse(readFileSync(inputFile, 'utf-8'));
  const experiences = limit ? data.sources.slice(0, limit) : data.sources;
  
  debugLog(`Processing ${experiences.length} experiences in batches of ${batchSize}...`);

  // Process in batches
  const enhanced: Experience[] = [];
  const errors: Array<{ id: string; error: string }> = [];

  for (let i = 0; i < experiences.length; i += batchSize) {
    const batch = experiences.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(experiences.length / batchSize);
    
    console.log(`Processing batch ${batchNum}/${totalBatches} (experiences ${i + 1}-${Math.min(i + batchSize, experiences.length)})...`);

    // Process batch in parallel
    const promises = batch.map(async (exp: Experience) => {
      try {
        const updates = await enhanceExperience(openai, exp);
        console.log(`  ✓ Enhanced ${exp.id}`);
        return { ...exp, ...updates };
      } catch (error) {
        console.log(`  ✗ Failed ${exp.id}: ${error}`);
        errors.push({ id: exp.id, error: String(error) });
        return exp; // Keep original on error
      }
    });

    const results = await Promise.all(promises);
    enhanced.push(...results);

    // Rate limiting pause
    if (i + batchSize < experiences.length) {
      console.log('  Pausing for rate limits...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Write output
  const output = {
    sources: enhanced,
  };

  writeFileSync(outputFile, JSON.stringify(output, null, 2));
  
  console.log(`
Enhancement complete:
- Total experiences: ${experiences.length}
- Successfully enhanced: ${experiences.length - errors.length}
- Errors: ${errors.length}
- Output: ${outputFile}
`);

  if (errors.length > 0) {
    console.log('\nErrors:');
    errors.forEach(e => console.log(`  ${e.id}: ${e.error}`));
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}