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
  embeddings?: any[];
}

function validateSource(source: any): source is Source {
  // Required fields
  if (!source.id || typeof source.id !== 'string') {
    console.log('❌ Invalid id:', source.id);
    return false;
  }
  if (!source.source || typeof source.source !== 'string') {
    console.log('❌ Invalid source:', typeof source.source);
    return false;
  }
  if (!source.emoji || typeof source.emoji !== 'string') {
    console.log('❌ Invalid emoji:', source.emoji);
    return false;
  }
  if (!source.created || typeof source.created !== 'string') {
    console.log('❌ Invalid created:', source.created);
    return false;
  }
  
  // ID format
  if (!source.id.startsWith('src_')) {
    console.log('❌ Invalid id format:', source.id);
    return false;
  }
  
  // Created date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
  if (!dateRegex.test(source.created)) {
    console.log('❌ Invalid date format:', source.created);
    return false;
  }
  
  // Emoji validation
  if (source.emoji.length === 0) {
    console.log('❌ Empty emoji');
    return false;
  }
  
  // Optional fields validation
  if (source.who !== undefined && typeof source.who !== 'string' && !Array.isArray(source.who)) {
    console.log('❌ Invalid who:', source.who);
    return false;
  }
  if (source.experience !== undefined && !Array.isArray(source.experience)) {
    console.log('❌ Invalid experience:', source.experience);
    return false;
  }
  if (source.context !== undefined && typeof source.context !== 'string') {
    console.log('❌ Invalid context:', source.context);
    return false;
  }
  
  // ExperienceQualities validation
  if (source.experienceQualities) {
    const qualities = source.experienceQualities;
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

function validateStorageData(data: any): data is StorageData {
  if (!data || typeof data !== 'object') return false;
  if (!Array.isArray(data.sources)) return false;
  
  for (const source of data.sources) {
    if (!validateSource(source)) return false;
  }
  
  return true;
}

function validateMigration() {
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