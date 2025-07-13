/**
 * Migration Diagnostic Script
 * 
 * This script analyzes the bridge.json file and shows what sources need migration
 * without actually performing the migration. This helps you understand what
 * would be processed before running the full migration.
 */

import { join } from 'path';
import { readFileSync, existsSync } from 'fs';

// Helper functions
function readBridgeDatabase(): any[] {
  const databasePath = join(process.cwd(), 'bridge.json');
  if (!existsSync(databasePath)) {
    throw new Error('bridge.json not found');
  }
  
  const databaseContent = readFileSync(databasePath, 'utf-8');
  const database = JSON.parse(databaseContent);
  
  // Handle different database structures
  if (Array.isArray(database)) {
    return database;
  } else if (database.sources && Array.isArray(database.sources)) {
    return database.sources;
  } else {
    throw new Error('Invalid database structure');
  }
}

function filterSourcesByExperiencer(sources: any[], experiencerName: string): any[] {
  return sources.filter(source => 
    source.experiencer && 
    source.experiencer.toLowerCase() === experiencerName.toLowerCase()
  );
}

function needsMigration(source: any): boolean {
  return (
    !source.narrative || source.narrative.length === 0 || // Missing or empty narrative
    source.vector || // Has old vector format
    !source.experiential_qualities || // Missing experiential qualities
    source.content_embedding || // Has old embedding field name
    !source.narrative_embedding // Missing new embedding field
  );
}

function analyzeSource(source: any): any {
  const issues = [];
  
  if (!source.narrative || source.narrative.length === 0) {
    issues.push('Missing narrative');
  }
  
  if (source.vector) {
    issues.push('Has old vector format');
  }
  
  if (!source.experiential_qualities) {
    issues.push('Missing experiential qualities');
  }
  
  if (source.content_embedding) {
    issues.push('Has old content_embedding field');
  }
  
  if (!source.narrative_embedding) {
    issues.push('Missing narrative_embedding field');
  }
  
  return {
    id: source.id,
    content: source.content ? source.content.substring(0, 100) + '...' : 'No content',
    experiencer: source.experiencer || 'Not specified',
    perspective: source.perspective || 'Not specified',
    processing: source.processing || 'Not specified',
    narrative: source.narrative ? 'Present' : 'Missing',
    issues,
    needsMigration: needsMigration(source)
  };
}

async function main(): Promise<void> {
  try {
    const experiencerName = process.argv[2];
    
    if (!experiencerName) {
      console.log('Usage: node dist/scripts/migration-diagnostic.js <experiencer-name>');
      console.log('Example: node dist/scripts/migration-diagnostic.js Miguel');
      return;
    }
    
    console.log(`🔍 Analyzing migration needs for experiencer: ${experiencerName}`);
    console.log('='.repeat(60));
    
    // Read database
    const allSources = readBridgeDatabase();
    console.log(`📊 Total sources in database: ${allSources.length}`);
    
    // Filter by experiencer
    const experiencerSources = filterSourcesByExperiencer(allSources, experiencerName);
    console.log(`👤 Sources for ${experiencerName}: ${experiencerSources.length}`);
    
    if (experiencerSources.length === 0) {
      console.log(`❌ No sources found for experiencer: ${experiencerName}`);
      return;
    }
    
    // Analyze each source
    const analysis = experiencerSources.map(analyzeSource);
    const sourcesNeedingMigration = analysis.filter(s => s.needsMigration);
    const sourcesOK = analysis.filter(s => !s.needsMigration);
    
    console.log(`\n✅ Sources that are OK: ${sourcesOK.length}`);
    console.log(`🔄 Sources needing migration: ${sourcesNeedingMigration.length}`);
    
    if (sourcesNeedingMigration.length > 0) {
      console.log('\n📋 Sources needing migration:');
      console.log('-'.repeat(60));
      
      sourcesNeedingMigration.forEach((source, index) => {
        console.log(`${index + 1}. ID: ${source.id}`);
        console.log(`   Content: ${source.content}`);
        console.log(`   Issues: ${source.issues.join(', ')}`);
        console.log('');
      });
      
      // Show batch breakdown
      const batchSize = 5;
      const batches = Math.ceil(sourcesNeedingMigration.length / batchSize);
      console.log(`\n📦 Migration would be processed in ${batches} batches of ${batchSize} sources each`);
      
      console.log('\n💡 To run the migration:');
      console.log(`   node dist/scripts/llm-integration.js migrate ${experiencerName} ${batchSize}`);
      
    } else {
      console.log('\n🎉 All sources are already up to date!');
    }
    
    // Show some examples of sources that are OK
    if (sourcesOK.length > 0) {
      console.log('\n📋 Examples of sources that are OK:');
      console.log('-'.repeat(60));
      sourcesOK.slice(0, 3).forEach((source, index) => {
        console.log(`${index + 1}. ID: ${source.id}`);
        console.log(`   Content: ${source.content}`);
        console.log(`   Narrative: ${source.narrative}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  }
}

main(); 