#!/usr/bin/env node
/**
 * Embedding regeneration script for migrated Bridge data
 * 
 * Regenerates embeddings for migrated data using OpenAI API
 * with proper error handling and rate limiting.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { errorLog, debugLog } from '../utils/safe-logger.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface _Source {
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

interface RegenerationConfig {
  openaiApiKey: string;
  inputFile: string;
  outputFile: string;
  batchSize: number;
  delayMs: number;
}

interface RegenerationResult {
  total: number;
  successful: number;
  failed: number;
  errors: Array<{ id: string; error: string; details?: unknown }>;
}

/**
 * Sleep function for rate limiting
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Regenerates embeddings for migrated data
 */
async function regenerateEmbeddings(config: RegenerationConfig): Promise<RegenerationResult> {
  const result: RegenerationResult = {
    total: 0,
    successful: 0,
    failed: 0,
    errors: [],
  };

  try {
    // Read migrated data
    debugLog(`Reading migrated data from ${config.inputFile}...`);
    const data = JSON.parse(readFileSync(config.inputFile, 'utf-8'));
    const sources = data.sources || [];
    result.total = sources.length;

    debugLog(`Found ${result.total} sources to regenerate embeddings for`);

    // Initialize OpenAI
    const openai = new OpenAI({ apiKey: config.openaiApiKey });
    debugLog('OpenAI initialized for embedding regeneration');

    // Process sources in batches
    const embeddings: EmbeddingRecord[] = [];

    for (let i = 0; i < sources.length; i += config.batchSize) {
      const batch = sources.slice(i, i + config.batchSize);
      const batchNumber = Math.floor(i / config.batchSize) + 1;
      const totalBatches = Math.ceil(sources.length / config.batchSize);
      
      debugLog(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} sources)`);

      for (const source of batch) {
        try {
          // Build embedding text following Bridge pattern
          let embeddingText = source.source;
          
          // Add context if present
          if (source.context) {
            embeddingText = `Context: ${source.context}. ${embeddingText}`;
          }
          
          // Add qualities if present
          if (source.experienceQualities) {
            const qualities = Object.entries(source.experienceQualities)
              .filter(([, value]) => value !== false)
              .map(([key, value]) => `${key}: ${value}`)
              .join('. ');
            if (qualities) {
              embeddingText += ` [${qualities}]`;
            }
          }
          
          const response = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: embeddingText,
          });

          const embedding: EmbeddingRecord = {
            sourceId: source.id,
            vector: response.data[0].embedding,
            generated: new Date().toISOString(),
          };

          embeddings.push(embedding);
          result.successful++;

          // Rate limiting delay
          await sleep(config.delayMs);
        } catch (error) {
          result.errors.push({
            id: source.id,
            error: 'Embedding regeneration failed',
            details: error,
          });
          result.failed++;
          
          // Continue with next source even if this one fails
          debugLog(`Failed to regenerate embedding for ${source.id}: ${error}`);
        }
      }

      // Progress update
      debugLog(`Batch ${batchNumber} complete. Success: ${result.successful}, Failed: ${result.failed}`);
    }

    // Write output with embeddings
    const outputData = {
      sources: sources,
      embeddings: embeddings,
    };

    writeFileSync(config.outputFile, JSON.stringify(outputData, null, 2));
    debugLog(`Embedding regeneration completed. Output written to ${config.outputFile}`);

  } catch (error) {
    errorLog(`Embedding regeneration failed: ${error}`);
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
Embedding regeneration script for migrated Bridge data

Usage: npm run regenerate-embeddings [options]

Options:
  --input <file>              Input file path (default: data/migration/migrated.bridge.json)
  --output <file>             Output file path (default: data/migration/migrated-with-embeddings.bridge.json)
  --openai-key <key>          OpenAI API key (required)
  --batch-size <number>       Batch size for processing (default: 5)
  --delay-ms <number>         Delay between API calls in ms (default: 100)
  --help, -h                  Show this help

Examples:
  npm run regenerate-embeddings --openai-key sk-...
  npm run regenerate-embeddings --input data/migrated.json --output data/with-embeddings.json
  npm run regenerate-embeddings --batch-size 10 --delay-ms 200
`);
    return;
  }

  // Parse arguments
  const inputIndex = args.indexOf('--input');
  const outputIndex = args.indexOf('--output');
  const openaiKeyIndex = args.indexOf('--openai-key');
  const batchSizeIndex = args.indexOf('--batch-size');
  const delayMsIndex = args.indexOf('--delay-ms');

  const config: RegenerationConfig = {
    inputFile: inputIndex >= 0 ? args[inputIndex + 1] : 'data/migration/migrated.bridge.json',
    outputFile: outputIndex >= 0 ? args[outputIndex + 1] : 'data/migration/migrated-with-embeddings.bridge.json',
    openaiApiKey: openaiKeyIndex >= 0 ? args[openaiKeyIndex + 1] : process.env.OPENAI_API_KEY || '',
    batchSize: batchSizeIndex >= 0 ? parseInt(args[batchSizeIndex + 1]) : 5,
    delayMs: delayMsIndex >= 0 ? parseInt(args[delayMsIndex + 1]) : 100,
  };

  // Validate
  if (!config.openaiApiKey) {
    errorLog('OpenAI API key required. Set OPENAI_API_KEY environment variable or use --openai-key');
    process.exit(1);
  }

  if (!existsSync(config.inputFile)) {
    errorLog(`Input file not found: ${config.inputFile}`);
    process.exit(1);
  }

  try {
    debugLog('Starting embedding regeneration...');
    const result = await regenerateEmbeddings(config);

    console.log(`
Embedding regeneration completed:
  Total sources: ${result.total}
  Successful: ${result.successful}
  Failed: ${result.failed}
  Errors: ${result.errors.length}
  
Success rate: ${((result.successful / result.total) * 100).toFixed(1)}%
`);

    if (result.errors.length > 0) {
      console.log('\nErrors:');
      result.errors.slice(0, 10).forEach(error => {
        console.log(`  ${error.id}: ${error.error}`);
      });
      if (result.errors.length > 10) {
        console.log(`  ... and ${result.errors.length - 10} more errors`);
      }
    }

  } catch (error) {
    errorLog(`Embedding regeneration failed: ${error}`);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { regenerateEmbeddings }; 