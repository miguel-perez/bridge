#!/usr/bin/env node
/**
 * Migration script for converting legacy Bridge data to new Bridge schema
 * 
 * Converts from old format with experiential_qualities to new format with
 * experienceQualities and required emoji fields.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import { errorLog, debugLog } from '../utils/safe-logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// TYPES
// ============================================================================

interface LegacySource {
  id: string;
  content: string;
  content_type: string;
  created: string;
  occurred?: string;
  perspective?: string;
  experiencer: string;
  processing?: string;
  type: string;
  experiential_qualities: {
    qualities: Array<{
      type: string;
      prominence: number;
      manifestation: string;
    }>;
    vector: Record<string, number>;
  };
  content_embedding?: number[];
}

interface NewSource {
  id: string;
  source: string;
  emoji: string;
  created: string;
  who?: string | string[];
  experience?: string[];
  experienceQualities?: {
    embodied: string | false;
    focus: string | false;
    mood: string | false;
    purpose: string | false;
    space: string | false;
    time: string | false;
    presence: string | false;
  };
  reflects?: string[];
  context?: string;
}

interface EmbeddingRecord {
  sourceId: string;
  vector: number[];
  generated: string;
}

interface MigrationConfig {
  openaiApiKey?: string;
  inputFile: string;
  outputFile: string;
  batchSize: number;
  dryRun: boolean;
  regenerateEmbeddings: boolean;
}

interface MigrationResult {
  total: number;
  successful: number;
  failed: number;
  errors: MigrationError[];
  qualityMapping: Record<string, string>;
  emojiMapping: Record<string, string>;
}

interface MigrationError {
  id: string;
  error: string;
  details?: unknown;
}

// ============================================================================
// QUALITY MAPPING
// ============================================================================

const QUALITY_MAPPING: Record<string, keyof NonNullable<NewSource['experienceQualities']>> = {
  'affective': 'mood',
  'embodied': 'embodied',
  'attentional': 'focus',
  'purposive': 'purpose',
  'temporal': 'time',
  'spatial': 'space',
  'intersubjective': 'presence',
};

// ============================================================================
// EMOJI SELECTION
// ============================================================================

/**
 * Selects appropriate emoji based on content and quality types
 * Following Bridge's visual anchor guidelines
 */
function selectEmoji(content: string, qualityTypes: string[]): string {
  const contentLower = content.toLowerCase();
  
  // Emotional/affective content
  if (qualityTypes.includes('affective') || 
      contentLower.includes('cry') || contentLower.includes('tears') ||
      contentLower.includes('sad') || contentLower.includes('overwhelm')) {
    return '😔';
  }
  
  if (contentLower.includes('anxiety') || contentLower.includes('nervous') ||
      contentLower.includes('worry') || contentLower.includes('stress')) {
    return '😟';
  }
  
  if (contentLower.includes('joy') || contentLower.includes('happy') ||
      contentLower.includes('excited') || contentLower.includes('thrilled')) {
    return '😊';
  }
  
  if (contentLower.includes('anger') || contentLower.includes('frustrated') ||
      contentLower.includes('mad') || contentLower.includes('irritated')) {
    return '😤';
  }
  
  // Embodied/physical content
  if (qualityTypes.includes('embodied') || 
      contentLower.includes('body') || contentLower.includes('physical') ||
      contentLower.includes('sensation') || contentLower.includes('feeling')) {
    return '💪';
  }
  
  if (contentLower.includes('tired') || contentLower.includes('exhausted') ||
      contentLower.includes('fatigue') || contentLower.includes('sleep')) {
    return '😴';
  }
  
  // Focus/attentional content
  if (qualityTypes.includes('attentional') || 
      contentLower.includes('focus') || contentLower.includes('concentrate') ||
      contentLower.includes('attention') || contentLower.includes('mind')) {
    return '🔍';
  }
  
  // Purpose/goal content
  if (qualityTypes.includes('purposive') || 
      contentLower.includes('goal') || contentLower.includes('purpose') ||
      contentLower.includes('intention') || contentLower.includes('plan')) {
    return '🎯';
  }
  
  // Temporal/time content
  if (qualityTypes.includes('temporal') || 
      contentLower.includes('time') || contentLower.includes('moment') ||
      contentLower.includes('past') || contentLower.includes('future')) {
    return '⏰';
  }
  
  // Spatial/place content
  if (qualityTypes.includes('spatial') || 
      contentLower.includes('place') || contentLower.includes('location') ||
      contentLower.includes('here') || contentLower.includes('there')) {
    return '📍';
  }
  
  // Social/intersubjective content
  if (qualityTypes.includes('intersubjective') || 
      contentLower.includes('people') || contentLower.includes('social') ||
      contentLower.includes('others') || contentLower.includes('connection')) {
    return '👥';
  }
  
  // Creative/artistic content
  if (contentLower.includes('poem') || contentLower.includes('art') ||
      contentLower.includes('creative') || contentLower.includes('write')) {
    return '✨';
  }
  
  // Work/productivity content
  if (contentLower.includes('work') || contentLower.includes('project') ||
      contentLower.includes('task') || contentLower.includes('productive')) {
    return '💼';
  }
  
  // Learning/insight content
  if (contentLower.includes('learn') || contentLower.includes('insight') ||
      contentLower.includes('understand') || contentLower.includes('realize')) {
    return '💡';
  }
  
  // Default for general reflection/experience
  return '🤔';
}

// ============================================================================
// QUALITY TRANSFORMATION
// ============================================================================

/**
 * Transforms legacy quality format to new Bridge format
 * prominence \> 0.3 → use manifestation text
 * prominence \< 0.3 → false
 */
function transformQualities(legacyQualities: LegacySource['experiential_qualities']): NewSource['experienceQualities'] {
  const newQualities: NewSource['experienceQualities'] = {
    embodied: false,
    focus: false,
    mood: false,
    purpose: false,
    space: false,
    time: false,
    presence: false,
  };
  
  // Process each quality
  for (const quality of legacyQualities.qualities) {
    const bridgeQuality = QUALITY_MAPPING[quality.type];
    if (bridgeQuality && quality.prominence > 0.3) {
      newQualities[bridgeQuality] = quality.manifestation;
    }
  }
  
  return newQualities;
}

/**
 * Extracts quality types for emoji selection
 */
function extractQualityTypes(legacyQualities: LegacySource['experiential_qualities']): string[] {
  return legacyQualities.qualities.map(q => q.type);
}

// ============================================================================
// CONTEXT BUILDING
// ============================================================================

/**
 * Builds context string from legacy fields
 */
function buildContext(source: LegacySource): string {
  const contextParts: string[] = [];
  
  if (source.occurred) {
    contextParts.push(`Occurred on ${source.occurred}`);
  }
  
  if (source.perspective) {
    contextParts.push(`From ${source.perspective} perspective`);
  }
  
  if (source.processing) {
    contextParts.push(`Processed ${source.processing}`);
  }
  
  return contextParts.length > 0 ? contextParts.join('. ') + '.' : '';
}

// ============================================================================
// EMBEDDING REGENERATION
// ============================================================================

/**
 * Regenerates embeddings using OpenAI
 */
async function regenerateEmbedding(
  openai: OpenAI,
  content: string,
  sourceId: string
): Promise<EmbeddingRecord> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: content,
    });
    
    return {
      sourceId,
      vector: response.data[0].embedding,
      generated: new Date().toISOString(),
    };
  } catch (error) {
    throw new Error(`Failed to regenerate embedding for ${sourceId}: ${error}`);
  }
}

// ============================================================================
// MIGRATION CORE
// ============================================================================

/**
 * Migrates a single legacy source to new format
 */
function migrateSource(source: LegacySource): NewSource {
  const qualityTypes = extractQualityTypes(source.experiential_qualities);
  const emoji = selectEmoji(source.content, qualityTypes);
  
  return {
    id: source.id,
    source: source.content,
    emoji,
    created: source.created,
    who: source.experiencer,
    experience: qualityTypes.map(q => `${QUALITY_MAPPING[q] || q}`),
    experienceQualities: transformQualities(source.experiential_qualities),
    context: buildContext(source),
  };
}

/**
 * Main migration function
 */
async function migrateData(config: MigrationConfig): Promise<MigrationResult> {
  const result: MigrationResult = {
    total: 0,
    successful: 0,
    failed: 0,
    errors: [],
    qualityMapping: {},
    emojiMapping: {},
  };
  
  try {
    // Read legacy data
    debugLog(`Reading legacy data from ${config.inputFile}...`);
    const legacyData = JSON.parse(readFileSync(config.inputFile, 'utf-8'));
    const sources = legacyData.sources || [];
    result.total = sources.length;
    
    debugLog(`Found ${result.total} sources to migrate`);
    
    // Initialize OpenAI if needed
    let openai: OpenAI | null = null;
    if (config.regenerateEmbeddings && config.openaiApiKey) {
      openai = new OpenAI({ apiKey: config.openaiApiKey });
      debugLog('OpenAI initialized for embedding regeneration');
    }
    
    // Process sources in batches
    const newSources: NewSource[] = [];
    const newEmbeddings: EmbeddingRecord[] = [];
    
    for (let i = 0; i < sources.length; i += config.batchSize) {
      const batch = sources.slice(i, i + config.batchSize);
      debugLog(`Processing batch ${Math.floor(i / config.batchSize) + 1}/${Math.ceil(sources.length / config.batchSize)}`);
      
      for (const legacySource of batch) {
        try {
          const newSource = migrateSource(legacySource);
          newSources.push(newSource);
          
          // Track quality mapping for analysis
          const qualityTypes = extractQualityTypes(legacySource.experiential_qualities);
          for (const qualityType of qualityTypes) {
            if (!result.qualityMapping[qualityType]) {
              result.qualityMapping[qualityType] = QUALITY_MAPPING[qualityType] || qualityType;
            }
          }
          
          // Track emoji selection
          const emoji = selectEmoji(legacySource.content, qualityTypes);
          result.emojiMapping[newSource.id] = emoji;
          
          // Regenerate embedding if requested
          if (config.regenerateEmbeddings && openai && legacySource.content_embedding) {
            try {
              const newEmbedding = await regenerateEmbedding(openai, legacySource.content, legacySource.id);
              newEmbeddings.push(newEmbedding);
            } catch (error) {
              result.errors.push({
                id: legacySource.id,
                error: 'Embedding regeneration failed',
                details: error,
              });
              result.failed++;
            }
          }
          
          result.successful++;
        } catch (error) {
          result.errors.push({
            id: legacySource.id,
            error: 'Migration failed',
            details: error,
          });
          result.failed++;
        }
      }
    }
    
    // Write output
    if (!config.dryRun) {
      const outputData = {
        sources: newSources,
        ...(newEmbeddings.length > 0 && { embeddings: newEmbeddings }),
      };
      
      writeFileSync(config.outputFile, JSON.stringify(outputData, null, 2));
      debugLog(`Migration completed. Output written to ${config.outputFile}`);
    } else {
      debugLog('Dry run completed - no files written');
    }
    
  } catch (error) {
    errorLog(`Migration failed: ${error}`);
    throw error;
  }
  
  return result;
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Migration script for converting legacy Bridge data to new Bridge schema

Usage: npm run migrate [options]

Options:
  --input <file>              Input file path (default: data/migration/2025.07.27.backup.bridge.json)
  --output <file>             Output file path (default: data/migration/migrated.bridge.json)
  --openai-key <key>          OpenAI API key for embedding regeneration
  --batch-size <number>       Batch size for processing (default: 10)
  --dry-run                   Don't write output files
  --regenerate-embeddings     Regenerate embeddings using OpenAI
  --help, -h                  Show this help

Examples:
  npm run migrate --input data/legacy.json --output data/new.json
  npm run migrate --regenerate-embeddings --openai-key sk-...
  npm run migrate --dry-run --batch-size 5
`);
    return;
  }
  
  // Parse arguments
  const inputIndex = args.indexOf('--input');
  const outputIndex = args.indexOf('--output');
  const openaiKeyIndex = args.indexOf('--openai-key');
  const batchSizeIndex = args.indexOf('--batch-size');
  
  const config: MigrationConfig = {
    inputFile: inputIndex >= 0 ? args[inputIndex + 1] : 'data/migration/2025.07.27.backup.bridge.json',
    outputFile: outputIndex >= 0 ? args[outputIndex + 1] : 'data/migration/migrated.bridge.json',
    openaiApiKey: openaiKeyIndex >= 0 ? args[openaiKeyIndex + 1] : process.env.OPENAI_API_KEY,
    batchSize: batchSizeIndex >= 0 ? parseInt(args[batchSizeIndex + 1]) : 10,
    dryRun: args.includes('--dry-run'),
    regenerateEmbeddings: args.includes('--regenerate-embeddings'),
  };
  
  // Validate
  if (!existsSync(config.inputFile)) {
    errorLog(`Input file not found: ${config.inputFile}`);
    process.exit(1);
  }
  
  if (config.regenerateEmbeddings && !config.openaiApiKey) {
    errorLog('OpenAI API key required for embedding regeneration');
    process.exit(1);
  }
  
  try {
    debugLog('Starting migration...');
    const result = await migrateData(config);
    
    console.log(`
Migration completed:
  Total sources: ${result.total}
  Successful: ${result.successful}
  Failed: ${result.failed}
  Errors: ${result.errors.length}
  
Quality mapping:
${Object.entries(result.qualityMapping).map(([old, new_]) => `  ${old} → ${new_}`).join('\n')}

Emoji distribution:
${Object.entries(Object.values(result.emojiMapping).reduce((acc, emoji) => {
  acc[emoji] = (acc[emoji] || 0) + 1;
  return acc;
}, {} as Record<string, number>)).map(([emoji, count]) => `  ${emoji}: ${count}`).join('\n')}
`);
    
    if (result.errors.length > 0) {
      console.log('\nErrors:');
      result.errors.forEach(error => {
        console.log(`  ${error.id}: ${error.error}`);
      });
    }
    
  } catch (error) {
    errorLog(`Migration failed: ${error}`);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { migrateData, selectEmoji, transformQualities }; 