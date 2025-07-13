#!/usr/bin/env tsx
/**
 * Extract all sources for specified experiencers from bridge.json
 * Output: array of combined descriptive strings with all metadata
 * Usage: npx tsx src/scripts/extract-experiencer-sources.ts [output-directory]
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { SourceRecord } from '../core/types.js';

const DEFAULT_INPUT_FILE = 'bridge.json';
const DEFAULT_OUTPUT_DIR = 'extracted-strings';
const EXPERIENCERS = ['Miguel', 'Captain'];

function getDataFilePath(): string {
  const envPath = process.env.BRIDGE_FILE_PATH;
  if (envPath) return envPath;
  return join(process.cwd(), DEFAULT_INPUT_FILE);
}

function extractCombinedStringsForExperiencer(sources: SourceRecord[], experiencer: string): string[] {
  const experiencerSources = sources.filter(s => s.experiencer === experiencer);
  
  return experiencerSources.map(s => {
    let combinedString = `Experiencer: ${s.experiencer}
Content: ${s.content}
Content Type: ${s.contentType}
Occurred: ${s.occurred}
Perspective: ${s.perspective}
Processing: ${s.processing}
Crafted: ${s.crafted}`;

    // Add nested experience metadata if it exists
    if (s.experience) {
      combinedString += `\nEmoji: ${s.experience.emoji}
Narrative: ${s.experience.narrative}`;
      
      // Add qualities if they exist
      if (s.experience.qualities && s.experience.qualities.length > 0) {
        combinedString += '\nQualities:';
        s.experience.qualities.forEach(quality => {
          combinedString += `\n  - ${quality.type} (${quality.prominence}): ${quality.manifestation}`;
        });
      } else {
        combinedString += '\nQualities: none';
      }
    }

    return combinedString;
  });
}

function getAllSources(): SourceRecord[] {
  const dataFilePath = getDataFilePath();
  const fileContent = readFileSync(dataFilePath, 'utf-8');
  const data = JSON.parse(fileContent);
  if (!data.sources || !Array.isArray(data.sources)) {
    throw new Error('Invalid bridge.json format: sources array not found');
  }
  return data.sources;
}

async function main(): Promise<void> {
  try {
    const outputDir = process.argv[2] || DEFAULT_OUTPUT_DIR;
    const outputPath = join(process.cwd(), outputDir);
    
    mkdirSync(outputPath, { recursive: true });
    const allSources = getAllSources();
    console.log(`Found ${allSources.length} total sources`);
    
    for (const experiencer of EXPERIENCERS) {
      const strings = extractCombinedStringsForExperiencer(allSources, experiencer);
      const fileName = `${experiencer.toLowerCase()}-combined-strings.json`;
      const filePath = join(outputPath, fileName);
      writeFileSync(filePath, JSON.stringify(strings, null, 2), 'utf-8');
      console.log(`Extracted ${strings.length} combined strings for '${experiencer}' to ${filePath}`);
    }
    
    console.log(`\n✅ Extraction complete! All files saved to: ${outputPath}`);
  } catch (error) {
    console.error('Extraction failed:', error);
    process.exit(1);
  }
}

main(); 