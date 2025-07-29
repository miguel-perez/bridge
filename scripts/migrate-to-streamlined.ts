#!/usr/bin/env node
/**
 * Migration script to convert existing Bridge data to streamlined format
 * 
 * This script:
 * 1. Backs up existing data
 * 2. Converts Source records to Experience format (where possible)
 * 3. Validates all records have required qualities
 * 4. Reports any records that can't be migrated
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';

interface OldSource {
  id: string;
  source: string;
  emoji: string;
  created: string;
  who?: string | string[];
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
}

interface StorageData {
  sources: OldSource[];
  embeddings?: any[];
}

// Get data file path
const dataPath = process.env.BRIDGE_FILE_PATH || join(homedir(), '.bridge', 'experiences.json');

console.log('🔄 Bridge Data Migration to Streamlined Format\n');
console.log(`📁 Data file: ${dataPath}`);

if (!existsSync(dataPath)) {
  console.error('❌ Data file not found!');
  process.exit(1);
}

// Read existing data
let data: StorageData;
try {
  const content = readFileSync(dataPath, 'utf-8');
  data = JSON.parse(content);
  console.log(`✓ Loaded ${data.sources.length} experiences\n`);
} catch (error) {
  console.error('❌ Failed to read data file:', error);
  process.exit(1);
}

// Create backup
const backupPath = dataPath.replace('.json', `.backup-${Date.now()}.json`);
try {
  writeFileSync(backupPath, JSON.stringify(data, null, 2));
  console.log(`✓ Backup created: ${backupPath}\n`);
} catch (error) {
  console.error('❌ Failed to create backup:', error);
  process.exit(1);
}

// Migration statistics
let migrated = 0;
let skipped = 0;
let enhanced = 0;
const skippedRecords: any[] = [];

// Process each source
console.log('🔄 Processing experiences...\n');

for (const source of data.sources) {
  // Check if already has all required qualities
  if (source.experienceQualities && 
      typeof source.experienceQualities === 'object' &&
      Object.values(source.experienceQualities).every(q => q && q !== false)) {
    
    // Ensure who array includes AI
    if (!source.who) {
      source.who = ['Claude'];
      enhanced++;
    } else if (typeof source.who === 'string') {
      source.who = [source.who];
      if (!['Claude', 'GPT-4', 'GPT-3.5', 'Gemini', 'Assistant'].some(ai => source.who?.includes(ai))) {
        (source.who as string[]).push('Claude');
        enhanced++;
      }
    } else if (Array.isArray(source.who)) {
      if (!['Claude', 'GPT-4', 'GPT-3.5', 'Gemini', 'Assistant'].some(ai => source.who?.includes(ai))) {
        source.who.push('Claude');
        enhanced++;
      }
    }
    
    migrated++;
  } else {
    // Can't migrate - missing required qualities
    skipped++;
    skippedRecords.push({
      id: source.id,
      reason: 'Missing or incomplete qualities',
      source: source.source.substring(0, 50) + '...'
    });
  }
}

// Save migrated data
console.log('\n📝 Migration Summary:');
console.log(`✓ Migrated: ${migrated} experiences`);
console.log(`✓ Enhanced: ${enhanced} (added AI to who array)`);
console.log(`⚠️  Skipped: ${skipped} experiences`);

if (skipped > 0) {
  console.log('\n⚠️  Skipped Records:');
  skippedRecords.forEach(record => {
    console.log(`   - ${record.id}: ${record.reason}`);
    console.log(`     "${record.source}"`);
  });
  
  // Save skipped records for manual review
  const skippedPath = dataPath.replace('.json', '.skipped.json');
  writeFileSync(skippedPath, JSON.stringify(skippedRecords, null, 2));
  console.log(`\n📄 Skipped records saved to: ${skippedPath}`);
}

// Only save if we migrated some records
if (migrated > 0) {
  try {
    writeFileSync(dataPath, JSON.stringify(data, null, 2));
    console.log('\n✅ Migration complete! Data file updated.');
  } catch (error) {
    console.error('\n❌ Failed to save migrated data:', error);
    console.log('💡 Your backup is safe at:', backupPath);
    process.exit(1);
  }
} else {
  console.log('\n⚠️  No records could be migrated. Original data unchanged.');
  console.log('💡 This might mean your data needs manual conversion.');
}

console.log('\n🎉 Done!');