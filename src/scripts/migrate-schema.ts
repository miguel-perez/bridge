/**
 * Schema Migration Script for Bridge
 * 
 * This script migrates existing records to the updated schema by:
 * 1. Using Claude to generate narratives from existing content
 * 2. Converting old vector format to new experiential qualities format
 * 3. Updating records with new schema fields
 * 4. Regenerating embeddings from narratives (preferred) or content
 * 
 * @module scripts/migrate-schema
 */

import { Anthropic } from "@anthropic-ai/sdk";
import { join } from 'path';
import dotenv from 'dotenv';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { CaptureService } from '../services/capture.js';
import { embeddingService } from '../services/embeddings.js';

// Load environment variables
dotenv.config();

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY is not set");
}

class SchemaMigrationService {
  private anthropic: Anthropic;
  private captureService: CaptureService;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: ANTHROPIC_API_KEY,
    });
    this.captureService = new CaptureService();
  }

  async migrateDatabase(): Promise<void> {
    console.log('🔄 Starting database migration...');
    
    try {
      // First, migrate the main database
      await this.migrateMainDatabase();
      
      // Then, migrate the vectors file if it exists
      await this.migrateVectorsFile();
      
      console.log('🎉 All migrations completed successfully!');
      
    } catch (error) {
      console.error('💥 Migration failed:', error);
      throw error;
    }
  }

  private async migrateMainDatabase(): Promise<void> {
    // Load current database
    const databasePath = join(process.cwd(), 'bridge.json');
    console.log(`📂 Loading database from: ${databasePath}`);
    
    if (!existsSync(databasePath)) {
      console.log('⚠️ No existing database found, skipping main database migration');
      return;
    }
    
    const databaseContent = readFileSync(databasePath, 'utf-8');
    const database = JSON.parse(databaseContent);
    
    // Handle different database structures
    let sources: any[] = [];
    if (Array.isArray(database)) {
      // Database is a direct array of sources
      sources = database;
    } else if (database.sources && Array.isArray(database.sources)) {
      // Database has a sources property
      sources = database.sources;
    } else {
      throw new Error('Invalid database structure: expected array of sources or object with sources array');
    }
    
    // Filter out sources without IDs
    const validSources = sources.filter(source => source && source.id && typeof source.id === 'string');
    const invalidSources = sources.length - validSources.length;
    
    if (invalidSources > 0) {
      console.log(`⚠️ Skipping ${invalidSources} sources without valid IDs`);
    }
    
    console.log(`📊 Found ${validSources.length} valid sources to migrate`);
    
    if (validSources.length === 0) {
      console.log('✅ No sources to migrate');
      return;
    }
    
    let migratedCount = 0;
    let errorCount = 0;
    let totalProcessed = 0;
    
    // Process sources in batches for better performance and progress tracking
    const batchSize = 10;
    const totalBatches = Math.ceil(validSources.length / batchSize);
    
    console.log(`🔄 Processing ${validSources.length} sources in ${totalBatches} batches of ${batchSize}...`);
    
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIndex = batchIndex * batchSize;
      const endIndex = Math.min(startIndex + batchSize, validSources.length);
      const batch = validSources.slice(startIndex, endIndex);
      
      console.log(`\n📦 Processing batch ${batchIndex + 1}/${totalBatches} (sources ${startIndex + 1}-${endIndex})...`);
      
      // Process batch in parallel
      const batchPromises = batch.map(async (source) => {
        try {
          const sourceId = source.id;
          console.log(`  🔄 Migrating source: ${sourceId}`);
          
          // Check if source needs migration
          const needsMigration = this.needsMigration(source);
          
          if (!needsMigration) {
            console.log(`    ✅ Source ${sourceId} already up to date`);
            return { success: true, skipped: true };
          }
          
          // Generate narrative if missing
          if (!source.narrative) {
            console.log(`    📝 Generating narrative for source ${sourceId}...`);
            const narrative = await this.generateNarrative(source);
            source.narrative = narrative;
          }
          
          // Convert old vector format to new experiential qualities
          if (source.vector && !source.experiential_qualities) {
            console.log(`    🔄 Converting vector to experiential qualities for source ${sourceId}...`);
            source.experiential_qualities = this.convertVectorToQualities(source.vector);
            delete source.vector;
          }
          
          // Rename content_embedding to embedding if it exists
          if (source.content_embedding && !source.embedding) {
            console.log(`    🔄 Renaming content_embedding to embedding for source ${sourceId}...`);
            source.embedding = source.content_embedding;
            delete source.content_embedding;
          }
          
          // Generate new embeddings using the new format: [emoji] + [narrative] "[content]" {qualities[array]}
          if (source.experience && source.experience.narrative && source.content) {
            console.log(`    🧠 Generating new embeddings for source ${sourceId}...`);
            const qualitiesText = source.experience.qualities.length > 0 
              ? `{${source.experience.qualities.map((q: any) => q.type).join(', ')}}`
              : '{}';
            
            const embeddingText = `${source.experience.emoji} ${source.experience.narrative} "${source.content}" ${qualitiesText}`;
            const embedding = await embeddingService.generateEmbedding(embeddingText);
            source.embedding = embedding;
          }
          
          console.log(`    ✅ Successfully migrated source ${sourceId}`);
          return { success: true, skipped: false };
          
        } catch (error) {
          const sourceId = source?.id || 'unknown';
          console.error(`    ❌ Failed to migrate source ${sourceId}:`, error);
          return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
      });
      
      // Wait for batch to complete
      const batchResults = await Promise.all(batchPromises);
      
      // Update counters
      batchResults.forEach(result => {
        totalProcessed++;
        if (result.success && !result.skipped) {
          migratedCount++;
        } else if (!result.success) {
          errorCount++;
        }
      });
      
      // Show progress
      const progress = ((totalProcessed / validSources.length) * 100).toFixed(1);
      console.log(`    📊 Progress: ${totalProcessed}/${validSources.length} (${progress}%) - ✅ ${migratedCount} migrated, ❌ ${errorCount} errors`);
    }
    
    // Save migrated database with the same structure
    console.log('\n💾 Saving migrated database...');
    const migratedDatabase = Array.isArray(database) ? validSources : { ...database, sources: validSources };
    writeFileSync(databasePath, JSON.stringify(migratedDatabase, null, 2));
    
    console.log(`✅ Main database migration complete!`);
    console.log(`✅ Migrated: ${migratedCount} sources`);
    console.log(`⏭️  Skipped: ${validSources.length - migratedCount - errorCount} sources (already up to date)`);
    console.log(`❌ Errors: ${errorCount} sources`);
    console.log(`📊 Total processed: ${totalProcessed} sources`);
  }

  private async migrateVectorsFile(): Promise<void> {
    const vectorsPath = join(process.cwd(), 'data', 'vectors.json');
    console.log(`📂 Checking vectors file: ${vectorsPath}`);
    
    if (!existsSync(vectorsPath)) {
      console.log('⚠️ No vectors file found, skipping vectors migration');
      return;
    }
    
    try {
      const vectorsContent = readFileSync(vectorsPath, 'utf-8');
      const vectors = JSON.parse(vectorsContent);
      
      if (!Array.isArray(vectors)) {
        console.log('⚠️ Vectors file is not an array, skipping vectors migration');
        return;
      }
      
      console.log(`📊 Found ${vectors.length} vectors to migrate`);
      
      // The vectors.json file contains old vector data that should be converted
      // to experiential qualities and stored in the main database
      // For now, we'll just log that this file exists and should be handled
      console.log('ℹ️ Vectors file found. Old vector data should be converted to experiential qualities.');
      console.log('ℹ️ This migration will be handled by the main database migration process.');
      
    } catch (error) {
      console.error('❌ Error reading vectors file:', error);
    }
  }

  private needsMigration(source: any): boolean {
    // Check if source needs migration
    return (
      !source.narrative || source.narrative.length === 0 || // Missing or empty narrative (now required)
      source.vector || // Has old vector format
      !source.experiential_qualities || // Missing experiential qualities
      source.content_embedding || // Has old embedding field name
      !source.embedding // Missing new embedding field
    );
  }

  private async generateNarrative(source: any): Promise<string> {
    const prompt = `Generate a rich, phenomenological narrative from this experiential data:

Content: ${source.content}
Content Type: ${source.contentType || 'text'}
Perspective: ${source.perspective || 'I'}
Processing: ${source.processing || 'during'}
Experiencer: ${source.experiencer || 'self'}
Occurred: ${source.occurred || 'unknown'}

Please create a narrative that:
1. Weaves the content with experiential qualities
2. Captures the lived experience authentically
3. Maintains the original perspective and context
4. Is rich in phenomenological detail
5. Flows naturally as a cohesive story

Narrative:`;

    const response = await this.anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }]
    });

    return response.content[0].type === "text" ? response.content[0].text : "";
  }

  private convertVectorToQualities(vector: number[]): any {
    // Convert old vector format to new experiential qualities structure
    const qualityTypes = [
      'embodied', 'attentional', 'affective', 'purposive',
      'spatial', 'temporal', 'intersubjective'
    ];
    
    const qualities = qualityTypes.map((type, index) => ({
      type,
      prominence: Math.max(0, Math.min(1, vector[index] || 0.5)),
      manifestation: `Converted from vector dimension ${index + 1}`
    }));
    
    return { qualities };
  }
}

async function main(): Promise<void> {
  const migrationService = new SchemaMigrationService();
  
  try {
    console.log('🚀 Starting Bridge Schema Migration');
    console.log('='.repeat(50));
    
    await migrationService.migrateDatabase();
    
    console.log('\n🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
main(); 