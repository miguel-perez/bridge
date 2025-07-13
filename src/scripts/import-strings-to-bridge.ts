#!/usr/bin/env tsx
/**
 * Import an array of strings into a compliant Bridge JSON file
 * 
 * This script takes an array of strings and converts them into Bridge-compliant
 * source records with proper experiential analysis. It processes strings asynchronously
 * in parallel for efficiency when dealing with hundreds of items.
 * 
 * Usage: npx tsx src/scripts/import-strings-to-bridge.ts [input-file] [output-file] [experiencer]
 */

import { Client as MCPClient } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Anthropic } from "@anthropic-ai/sdk";
import { join } from 'path';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import dotenv from 'dotenv';
import { nanoid } from 'nanoid';
import type { SourceRecord, Experience } from '../core/types.js';
import { QUALITY_TYPES } from '../core/types.js';

// Load environment variables
dotenv.config();

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_INPUT_FILE = 'strings-to-import.json';
const DEFAULT_OUTPUT_FILE = 'imported-bridge-data.json';
const DEFAULT_EXPERIENCER = 'self';
const DEFAULT_PERSPECTIVE = 'I';
const DEFAULT_PROCESSING = 'during';
const DEFAULT_CONTENT_TYPE = 'text';

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates and normalizes quality types to ensure they match the enum
 */
function validateQualityType(type: string): string {
  const validTypes = QUALITY_TYPES as readonly string[];
  if (validTypes.includes(type)) {
    return type;
  }
  
  // Map common invalid types to valid ones
  const typeMapping: Record<string, string> = {
    'insight': 'attentional',
    'recognition': 'attentional', 
    'synthesis': 'attentional',
    'wisdom': 'attentional',
    'growth': 'purposive',
    'acceptance': 'affective',
    'connection': 'intersubjective',
    'collaboration': 'intersubjective',
    'validation': 'affective',
    'transformation': 'purposive',
    'integration': 'attentional',
    'emotional_resonance': 'affective',
    'vulnerability': 'affective',
    'gratitude': 'affective',
    'mentorship': 'intersubjective',
    'belonging': 'intersubjective',
    'empowerment': 'purposive',
    'reflection': 'attentional',
    'identity_realization': 'attentional',
    'self_reference': 'attentional',
    'temporal_awareness': 'temporal',
    'collective_consciousness': 'intersubjective',
    'innovation': 'purposive',
    'cultural_inclusion': 'intersubjective',
    'transparency': 'attentional',
    'pioneering': 'purposive',
    'care': 'affective',
    'adaptation': 'purposive',
    'adaptability': 'purposive',
    'problem-solving': 'purposive',
    'growth_mindset': 'attentional',
    'technical_achievement': 'purposive',
    'discovery': 'attentional'
  };
  
  return typeMapping[type] || 'attentional'; // Default fallback
}

// ============================================================================
// TYPES
// ============================================================================

interface ImportConfig {
  experiencer: string;
  perspective: string;
  processing: string;
  contentType: string;
  batchSize: number;
  maxConcurrency: number;
}

interface ImportResult {
  success: boolean;
  source?: SourceRecord;
  error?: string;
  originalString: string;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generates a unique ID for a source
 */
function generateId(): string {
  return `src_${nanoid(16)}`;
}

/**
 * Creates a basic source record with minimal required fields
 */
function createBasicSource(content: string, config: ImportConfig): SourceRecord {
  return {
    type: 'source',
    id: generateId(),
    content,
    contentType: config.contentType,
    system_time: new Date().toISOString(),
    perspective: config.perspective,
    experiencer: config.experiencer,
    processing: config.processing as any,
    crafted: false,
    experience: {
      qualities: [],
      emoji: '',
      narrative: ''
    }
  };
}

/**
 * Validates that a string is not empty and is suitable for import
 */
function isValidString(str: string): boolean {
  return typeof str === 'string' && str.trim().length > 0;
}

/**
 * Reads the input file containing strings to import
 */
function readInputStrings(inputFile: string): string[] {
  const filePath = join(process.cwd(), inputFile);
  
  if (!existsSync(filePath)) {
    throw new Error(`Input file not found: ${filePath}`);
  }
  
  const content = readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content);
  
  // Handle different input formats
  if (Array.isArray(data)) {
    return data.filter(isValidString);
  } else if (data.strings && Array.isArray(data.strings)) {
    return data.strings.filter(isValidString);
  } else if (data.content && Array.isArray(data.content)) {
    return data.content.filter(isValidString);
  } else {
    throw new Error('Invalid input format. Expected array of strings or object with strings/content array.');
  }
}

// ============================================================================
// MCP CLIENT CLASS
// ============================================================================

class BridgeImporter {
  private mcp: MCPClient;
  private anthropic: Anthropic;
  private transport: StdioClientTransport | null = null;
  private tools: any[] = [];

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    this.mcp = new MCPClient({ name: "bridge-importer", version: "1.0.0" });
  }

  /**
   * Connects to the Bridge MCP server
   */
  async connectToServer(): Promise<void> {
    try {
      // Connect to the local Bridge server
      this.transport = new StdioClientTransport({
        command: "node",
        args: [join(process.cwd(), "dist/index.js")],
      });
      
      await this.mcp.connect(this.transport);
      
      // Get available tools
      const toolsResult = await this.mcp.listTools();
      this.tools = toolsResult.tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.inputSchema,
      }));
      
      console.log(`Connected to Bridge server with ${this.tools.length} tools available`);
    } catch (error) {
      console.error('Failed to connect to Bridge server:', error);
      throw error;
    }
  }

  /**
   * Analyzes a string and generates experiential analysis using Claude
   */
  async analyzeString(content: string): Promise<Experience> {
    const prompt = `
You are an expert in phenomenological analysis and experiential data capture. Your task is to analyze the following text and create a rich experiential analysis.

TEXT TO ANALYZE:
"${content}"

Please provide:
1. An emoji that visually represents the core experience
2. A concise narrative (max 200 characters) written in first-person present tense, capturing the experiential essence
3. Analysis of 2-4 most prominent experiential qualities from these dimensions:
   - embodied: physical sensations, bodily presence
   - attentional: focus, awareness, meta-attention
   - affective: emotional coloring, mood atmosphere
   - purposive: directedness, intention, momentum
   - spatial: lived sense of place, environmental presence
   - temporal: how past/future inhabit the present
   - intersubjective: social presence, relational dynamics

For each quality, provide:
- type: one of the 7 dimensions above
- prominence: score from 0.0 (absent) to 1.0 (dominant)
- manifestation: specific description of how this quality shows up

Respond in this exact JSON format:
{
  "emoji": "🎯",
  "narrative": "Brief experiential summary in first person present tense",
  "qualities": [
    {
      "type": "affective",
      "prominence": 0.8,
      "manifestation": "Specific description of how this quality manifests"
    }
  ]
}
`;

    try {
      const response = await this.anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      });

      const responseText = response.content[0].type === "text" ? response.content[0].text : "";
      
      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      const analysis = JSON.parse(jsonMatch[0]);
      
      // Validate and return the analysis
      return {
        emoji: analysis.emoji || '📝',
        narrative: analysis.narrative || content.substring(0, 200),
        qualities: Array.isArray(analysis.qualities) ? analysis.qualities.map((q: any) => ({
          type: validateQualityType(q.type || 'attentional'),
          prominence: Math.max(0, Math.min(1, q.prominence || 0.5)),
          manifestation: q.manifestation || 'Not specified'
        })) : []
      };
    } catch (error) {
      console.warn(`Failed to analyze string: ${error}`);
      // Return fallback analysis
      return {
        emoji: '📝',
        narrative: content.substring(0, 200),
        qualities: [{
          type: 'attentional',
          prominence: 0.5,
          manifestation: 'Basic content analysis'
        }]
      };
    }
  }

  /**
   * Processes a single string and converts it to a Bridge source record
   */
  async processString(content: string, config: ImportConfig): Promise<ImportResult> {
    try {
      // Create basic source
      const source = createBasicSource(content, config);
      
      // Analyze the content
      const experience = await this.analyzeString(content);
      source.experience = experience;
      
      return {
        success: true,
        source,
        originalString: content
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        originalString: content
      };
    }
  }

  /**
   * Processes strings in batches with controlled concurrency
   */
  async processStringsBatch(strings: string[], config: ImportConfig): Promise<ImportResult[]> {
    const results: ImportResult[] = [];
    
    // Process in batches to control concurrency
    for (let i = 0; i < strings.length; i += config.batchSize) {
      const batch = strings.slice(i, i + config.batchSize);
      
      console.log(`Processing batch ${Math.floor(i / config.batchSize) + 1}/${Math.ceil(strings.length / config.batchSize)} (${batch.length} items)`);
      
      // Process batch with controlled concurrency
      const batchPromises = batch.map(str => this.processString(str, config));
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Convert Promise.allSettled results to ImportResult[]
      const batchImportResults = batchResults.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          return {
            success: false,
            error: result.reason?.message || 'Promise rejected',
            originalString: batch[index]
          };
        }
      });
      
      results.push(...batchImportResults);
      
      // Small delay between batches to be respectful to the API
      if (i + config.batchSize < strings.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return results;
  }

  /**
   * Saves the imported sources to a Bridge-compliant JSON file
   */
  saveToBridgeFormat(sources: SourceRecord[], outputFile: string): void {
    const bridgeData = {
      sources: sources
    };
    
    const outputPath = join(process.cwd(), outputFile);
    writeFileSync(outputPath, JSON.stringify(bridgeData, null, 2), 'utf-8');
    console.log(`Saved ${sources.length} sources to: ${outputPath}`);
  }

  /**
   * Main import function
   */
  async importStrings(strings: string[], config: ImportConfig, outputFile: string): Promise<void> {
    console.log(`Starting import of ${strings.length} strings...`);
    console.log(`Configuration:`, config);
    
    const startTime = Date.now();
    
    // Process all strings
    const results = await this.processStringsBatch(strings, config);
    
    // Separate successful and failed imports
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    // Extract successful sources
    const sources = successful.map(r => r.source!);
    
    // Save to Bridge format
    this.saveToBridgeFormat(sources, outputFile);
    
    // Print summary
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log('\n=== IMPORT SUMMARY ===');
    console.log(`Total strings processed: ${strings.length}`);
    console.log(`Successfully imported: ${successful.length}`);
    console.log(`Failed imports: ${failed.length}`);
    console.log(`Success rate: ${((successful.length / strings.length) * 100).toFixed(1)}%`);
    console.log(`Processing time: ${duration.toFixed(1)} seconds`);
    console.log(`Average time per string: ${(duration / strings.length).toFixed(2)} seconds`);
    
    if (failed.length > 0) {
      console.log('\n=== FAILED IMPORTS ===');
      failed.slice(0, 5).forEach((result, index) => {
        console.log(`${index + 1}. Error: ${result.error}`);
        console.log(`   String: "${result.originalString.substring(0, 100)}..."`);
      });
      if (failed.length > 5) {
        console.log(`   ... and ${failed.length - 5} more failures`);
      }
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.transport) {
      await this.mcp.close();
    }
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main(): Promise<void> {
  console.log('🚀 Starting Bridge String Importer...');
  
  try {
    // Parse command line arguments
    const inputFile = process.argv[2] || DEFAULT_INPUT_FILE;
    const outputFile = process.argv[3] || DEFAULT_OUTPUT_FILE;
    const experiencer = process.argv[4] || DEFAULT_EXPERIENCER;
    
    // Configuration
    const config: ImportConfig = {
      experiencer,
      perspective: DEFAULT_PERSPECTIVE,
      processing: DEFAULT_PROCESSING,
      contentType: DEFAULT_CONTENT_TYPE,
      batchSize: 10, // Process 10 strings at a time
      maxConcurrency: 5 // Maximum 5 concurrent API calls
    };
    
    console.log('Bridge String Importer');
    console.log('======================');
    console.log(`Input file: ${inputFile}`);
    console.log(`Output file: ${outputFile}`);
    console.log(`Experiencer: ${experiencer}`);
    
    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }
    
    // Read input strings
    const strings = readInputStrings(inputFile);
    console.log(`Found ${strings.length} strings to import`);
    
    if (strings.length === 0) {
      console.log('No valid strings found. Exiting.');
      return;
    }
    
    // Create importer and process
    const importer = new BridgeImporter();
    
    try {
      await importer.connectToServer();
      await importer.importStrings(strings, config, outputFile);
    } finally {
      await importer.cleanup();
    }
    
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
}

// Run the script
console.log('🔧 Script loaded, checking execution condition...');
console.log('import.meta.url:', import.meta.url);
console.log('process.argv[1]:', process.argv[1]);

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('✅ Condition met, calling main()...');
  main();
} else {
  console.log('❌ Condition not met, calling main() anyway...');
  main();
} 