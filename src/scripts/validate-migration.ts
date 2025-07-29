#!/usr/bin/env node
/**
 * Validation script for migrated Bridge data
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..');

// Bridge schema validation
interface ExperienceQualities {
  embodied: string | false;
  focus: string | false;
  mood: string | false;
  purpose: string | false;
  space: string | false;
  time: string | false;
  presence: string | false;
}

interface Source {
  id: string;
  source: string;
  emoji: string;
  created: string;
  who?: string | string[];
  experience?: string[];
  experienceQualities?: ExperienceQualities;
  context?: string;
}

interface StorageData {
  sources: Source[];
  embeddings?: unknown[];
}

function validateSource(source: unknown): source is Source {
  if (!source || typeof source !== 'object' || source === null) {
    return false;
  }
  const src = source as Record<string, unknown>;
  // Required fields
  if (!src.id || typeof src.id !== 'string') {
    console.log('❌ Invalid id:', src.id);
    return false;
  }
  if (!src.source || typeof src.source !== 'string') {
    console.log('❌ Invalid source:', typeof src.source);
    return false;
  }
  if (!src.emoji || typeof src.emoji !== 'string') {
    console.log('❌ Invalid emoji:', src.emoji);
    return false;
  }
  if (!src.created || typeof src.created !== 'string') {
    console.log('❌ Invalid created:', src.created);
    return false;
  }
  
  // ID format
  if (!src.id.startsWith('src_')) {
    console.log('❌ Invalid id format:', src.id);
    return false;
  }
  
  // Created date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
  if (!dateRegex.test(src.created)) {
    console.log('❌ Invalid date format:', src.created);
    return false;
  }
  
  // Emoji validation
  if ((src.emoji as string).length === 0) {
    console.log('❌ Empty emoji');
    return false;
  }
  
  // Optional fields validation
  if (src.who !== undefined && typeof src.who !== 'string' && !Array.isArray(src.who)) {
    console.log('❌ Invalid who:', src.who);
    return false;
  }
  if (src.experience !== undefined && !Array.isArray(src.experience)) {
    console.log('❌ Invalid experience:', src.experience);
    return false;
  }
  if (src.context !== undefined && typeof src.context !== 'string') {
    console.log('❌ Invalid context:', src.context);
    return false;
  }
  
  // ExperienceQualities validation
  if (src.experienceQualities) {
    const qualities = src.experienceQualities as Record<string, unknown>;
    const requiredQualities = ['embodied', 'focus', 'mood', 'purpose', 'space', 'time', 'presence'];
    
    for (const quality of requiredQualities) {
      if (!(quality in qualities)) {
        console.log(`❌ Missing quality: ${quality}`);
        return false;
      }
      if (qualities[quality] !== false && typeof qualities[quality] !== 'string') {
        console.log(`❌ Invalid quality value for ${quality}:`, qualities[quality]);
        return false;
      }
    }
  }
  
  return true;
}

function validateStorageData(data: unknown): data is StorageData {
  if (!data || typeof data !== 'object') return false;
  if (!Array.isArray(data.sources)) return false;
  
  for (const source of data.sources) {
    if (!validateSource(source)) return false;
  }
  
  return true;
}

function validateMigration(): void {
  const filePath = join(projectRoot, 'data/migration/migrated-fixed.bridge.json');
  
  try {
    const data = JSON.parse(readFileSync(filePath, 'utf8'));
    
    console.log('🔍 Validating migrated Bridge data...\n');
    
    // Basic JSON validation
    console.log('✅ JSON is valid');
    
    // Schema validation
    if (!validateStorageData(data)) {
      console.log('❌ Schema validation failed');
      return;
    }
    console.log('✅ Bridge schema validation passed');
    
    // Data statistics
    console.log(`📊 Total sources: ${data.sources.length}`);
    
    // Emoji validation
    const emojiCounts: Record<string, number> = {};
    let validEmojis = 0;
    let invalidEmojis = 0;
    
    for (const source of data.sources) {
      if (source.emoji && source.emoji.length > 0) {
        emojiCounts[source.emoji] = (emojiCounts[source.emoji] || 0) + 1;
        validEmojis++;
      } else {
        invalidEmojis++;
      }
    }
    
    console.log(`✅ Valid emojis: ${validEmojis}`);
    if (invalidEmojis > 0) {
      console.log(`⚠️  Invalid emojis: ${invalidEmojis}`);
    }
    
    // Quality validation
    let sourcesWithQualities = 0;
    let sourcesWithoutQualities = 0;
    
    for (const source of data.sources) {
      if (source.experienceQualities) {
        sourcesWithQualities++;
      } else {
        sourcesWithoutQualities++;
      }
    }
    
    console.log(`📈 Sources with qualities: ${sourcesWithQualities}`);
    console.log(`📉 Sources without qualities: ${sourcesWithoutQualities}`);
    
    // Context validation
    let sourcesWithContext = 0;
    let sourcesWithoutContext = 0;
    
    for (const source of data.sources) {
      if (source.context && source.context.length > 0) {
        sourcesWithContext++;
      } else {
        sourcesWithoutContext++;
      }
    }
    
    console.log(`📝 Sources with context: ${sourcesWithContext}`);
    if (sourcesWithoutContext > 0) {
      console.log(`⚠️  Sources without context: ${sourcesWithoutContext}`);
    }
    
    // ID validation
    let validIds = 0;
    let invalidIds = 0;
    
    for (const source of data.sources) {
      if (source.id && source.id.startsWith('src_')) {
        validIds++;
      } else {
        invalidIds++;
      }
    }
    
    console.log(`🆔 Valid IDs: ${validIds}`);
    if (invalidIds > 0) {
      console.log(`❌ Invalid IDs: ${invalidIds}`);
    }
    
    // Date validation
    let validDates = 0;
    let invalidDates = 0;
    const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
    
    for (const source of data.sources) {
      if (source.created && dateRegex.test(source.created)) {
        validDates++;
      } else {
        invalidDates++;
      }
    }
    
    console.log(`📅 Valid dates: ${validDates}`);
    if (invalidDates > 0) {
      console.log(`❌ Invalid dates: ${invalidDates}`);
    }
    
    // Emoji distribution
    console.log('\n📊 Emoji distribution:');
    Object.entries(emojiCounts)
      .sort(([,a], [,b]) => b - a)
      .forEach(([emoji, count]) => {
        console.log(`  ${emoji}: ${count}`);
      });
    
    console.log('\n✅ Migration validation completed successfully!');
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
  }
}

validateMigration(); 