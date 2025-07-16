#!/usr/bin/env tsx
/**
 * Simple migration script to fix field names in Bridge data
 * 
 * Changes:
 * - Rename 'content' to 'source'
 * - Convert crafted "undefined" string to boolean false
 * - Ensure proper storage structure with sources and embeddings arrays
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

async function migrateFieldNames(): Promise<void> {
  const databasePath = join(process.cwd(), 'bridge.json');
  
  console.log('🔄 Starting Bridge field name migration...');
  console.log(`📂 Reading from: ${databasePath}`);
  
  if (!existsSync(databasePath)) {
    throw new Error('No bridge.json file found');
  }
  
  // Read the database
  const content = readFileSync(databasePath, 'utf-8');
  const data = JSON.parse(content);
  
  // Handle different possible structures
  let sources: any[] = [];
  if (Array.isArray(data)) {
    sources = data;
  } else if (data.sources && Array.isArray(data.sources)) {
    sources = data.sources;
  } else {
    throw new Error('Invalid database structure');
  }
  
  console.log(`📊 Found ${sources.length} sources to migrate`);
  
  // Process each source
  let migratedCount = 0;
  const migratedSources = sources.map((source, index) => {
    try {
      // Create new source with correct field names
      const migrated: any = {
        ...source,
        // Rename content to source
        source: source.content || source.source,
        // Fix crafted field
        crafted: source.crafted === true || source.crafted === 'true' ? true : false
      };
      
      // Remove old content field if it exists
      delete migrated.content;
      
      migratedCount++;
      return migrated;
      
    } catch (error) {
      console.error(`❌ Error migrating source at index ${index}:`, error);
      return source; // Return original if migration fails
    }
  });
  
  // Create the proper storage structure
  const storageData = {
    sources: migratedSources,
    embeddings: [] // Bridge will regenerate these as needed
  };
  
  // Save the migrated data
  console.log('\n💾 Saving migrated database...');
  writeFileSync(databasePath, JSON.stringify(storageData, null, 2));
  
  console.log('\n✅ Migration completed!');
  console.log(`✅ Successfully migrated: ${migratedCount} sources`);
  console.log(`📝 Note: Embeddings will be regenerated on first search`);
}

// Run the migration
migrateFieldNames().catch(error => {
  console.error('💥 Migration failed:', error);
  process.exit(1);
});