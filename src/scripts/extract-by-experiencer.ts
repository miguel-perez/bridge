#!/usr/bin/env tsx
/**
 * Extract sources from bridge.json grouped by experiencer
 * 
 * This script reads the bridge.json file and creates a new file with all sources
 * organized by experiencer name. This is useful for migration and analysis purposes.
 * 
 * Usage: npx tsx src/scripts/extract-by-experiencer.ts [output-file]
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { SourceRecord } from '../core/types.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_INPUT_FILE = 'bridge.json';
const DEFAULT_OUTPUT_FILE = 'sources-by-experiencer.json';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Gets the data file path from environment or defaults to bridge.json in current directory
 */
function getDataFilePath(): string {
  const envPath = process.env.BRIDGE_FILE_PATH;
  if (envPath) {
    return envPath;
  }
  
  // Default to bridge.json in current directory
  return join(process.cwd(), DEFAULT_INPUT_FILE);
}

/**
 * Formats a date for display
 */
function formatDate(isoDate: string): string {
  if (!isoDate) return 'Unknown date';
  
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return 'Invalid date';
    
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return 'Invalid date';
  }
}

/**
 * Creates a summary of sources for an experiencer
 */
function createExperiencerSummary(sources: SourceRecord[]): any {
  const totalSources = sources.length;
  const perspectives = [...new Set(sources.map(s => s.perspective).filter(Boolean))];
  const processingLevels = [...new Set(sources.map(s => s.processing).filter(Boolean))];
  
  // Date range
  const dates = sources
    .map(s => s.occurred || s.system_time)
    .filter(Boolean)
    .map(d => new Date(d))
    .filter(d => !isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
  
  const dateRange = dates.length > 0 ? {
    earliest: formatDate(dates[0].toISOString()),
    latest: formatDate(dates[dates.length - 1].toISOString()),
    totalDays: Math.ceil((dates[dates.length - 1].getTime() - dates[0].getTime()) / (1000 * 60 * 60 * 24))
  } : null;
  
  // Experiential qualities analysis
  const qualityStats: Record<string, { count: number; avgProminence: number }> = {};
  const qualityTypes = ['embodied', 'attentional', 'affective', 'purposive', 'spatial', 'temporal', 'intersubjective'];
  
  qualityTypes.forEach(type => {
    const sourcesWithQuality = sources.filter(s => 
      s.experience?.qualities?.some(q => q.type === type)
    );
    
    if (sourcesWithQuality.length > 0) {
      const totalProminence = sourcesWithQuality.reduce((sum, s) => {
        const quality = s.experience?.qualities?.find(q => q.type === type);
        return sum + (quality?.prominence || 0);
      }, 0);
      
      qualityStats[type] = {
        count: sourcesWithQuality.length,
        avgProminence: totalProminence / sourcesWithQuality.length
      };
    }
  });
  
  return {
    totalSources,
    perspectives,
    processingLevels,
    dateRange,
    qualityStats,
    hasExperientialAnalysis: sources.some(s => (s.experience?.qualities?.length || 0) > 0),
    hasNarratives: sources.some(s => s.experience?.narrative),
    hasEmbeddings: sources.some(s => s.embedding)
  };
}

// ============================================================================
// MAIN EXTRACTION LOGIC
// ============================================================================

/**
 * Extracts and groups sources by experiencer
 */
function extractSourcesByExperiencer(): any {
  const dataFilePath = getDataFilePath();
  
  console.log(`Reading data from: ${dataFilePath}`);
  
  try {
    // Read the bridge.json file
    const fileContent = readFileSync(dataFilePath, 'utf-8');
    const data = JSON.parse(fileContent);
    
    if (!data.sources || !Array.isArray(data.sources)) {
      throw new Error('Invalid bridge.json format: sources array not found');
    }
    
    const sources: SourceRecord[] = data.sources;
    console.log(`Found ${sources.length} total sources`);
    
    // Group sources by experiencer
    const groupedByExperiencer: Record<string, SourceRecord[]> = {};
    
    sources.forEach(source => {
      const experiencer = source.experiencer || 'Unknown';
      
      if (!groupedByExperiencer[experiencer]) {
        groupedByExperiencer[experiencer] = [];
      }
      
      groupedByExperiencer[experiencer].push(source);
    });
    
    // Create the output structure
    const output = {
      metadata: {
        extractedAt: new Date().toISOString(),
        totalSources: sources.length,
        totalExperiencers: Object.keys(groupedByExperiencer).length,
        sourceFile: dataFilePath
      },
      experiencers: {} as Record<string, any>
    };
    
    // Process each experiencer
    Object.entries(groupedByExperiencer).forEach(([experiencer, experiencerSources]) => {
      // Sort sources by system_time (newest first)
      const sortedSources = experiencerSources.sort((a, b) => 
        new Date(b.system_time).getTime() - new Date(a.system_time).getTime()
      );
      
      output.experiencers[experiencer] = {
        summary: createExperiencerSummary(sortedSources),
        sources: sortedSources.map(source => ({
          id: source.id,
          content: source.content,
          contentType: source.contentType,
          system_time: source.system_time,
          occurred: source.occurred,
          perspective: source.perspective,
          processing: source.processing,
          crafted: source.crafted,
          experience: source.experience,
          embedding: source.embedding ? 'present' : undefined // Don't include full embedding arrays
        }))
      };
    });
    
    return output;
    
  } catch (error) {
    console.error('Error reading bridge.json:', error);
    throw error;
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main(): Promise<void> {
  console.log('🚀 Script starting...');
  console.log('📂 Current directory:', process.cwd());
  console.log('📝 Arguments:', process.argv);
  
  try {
    // Get output file path from command line arguments
    const outputFile = process.argv[2] || DEFAULT_OUTPUT_FILE;
    console.log('📄 Output file:', outputFile);
    
    console.log('Extracting sources by experiencer...');
    
    // Extract the data
    const extractedData = extractSourcesByExperiencer();
    
    // Write to output file
    const outputPath = join(process.cwd(), outputFile);
    console.log('💾 Writing to:', outputPath);
    writeFileSync(outputPath, JSON.stringify(extractedData, null, 2), 'utf-8');
    
    console.log(`\n✅ Extraction complete!`);
    console.log(`📁 Output file: ${outputPath}`);
    console.log(`📊 Total sources: ${extractedData.metadata.totalSources}`);
    console.log(`👥 Total experiencers: ${extractedData.metadata.totalExperiencers}`);
    
    // Display experiencer summary
    console.log('\n📋 Experiencer Summary:');
    Object.entries(extractedData.experiencers).forEach(([experiencer, data]) => {
      const summary = (data as any).summary;
      console.log(`  ${experiencer}: ${summary.totalSources} sources`);
      
      if (summary.dateRange) {
        console.log(`    📅 Date range: ${summary.dateRange.earliest} to ${summary.dateRange.latest} (${summary.dateRange.totalDays} days)`);
      }
      
      if (summary.perspectives.length > 0) {
        console.log(`    👁️  Perspectives: ${summary.perspectives.join(', ')}`);
      }
      
      if (summary.processingLevels.length > 0) {
        console.log(`    ⏰ Processing levels: ${summary.processingLevels.join(', ')}`);
      }
      
      if (summary.hasExperientialAnalysis) {
        console.log(`    🧠 Has experiential analysis: Yes`);
      }
      
      if (summary.hasNarratives) {
        console.log(`    📝 Has narratives: Yes`);
      }
    });
    
  } catch (error) {
    console.error('❌ Extraction failed:', error);
    process.exit(1);
  }
}

// Run the script
main(); 