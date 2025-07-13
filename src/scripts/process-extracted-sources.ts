#!/usr/bin/env tsx
/**
 * Process extracted sources through MCP capture tool
 * 
 * This script takes the combined string outputs from extract-experiencer-sources.ts
 * and processes them through the MCP capture tool to create new Bridge-compliant source records.
 * 
 * Usage: npx tsx src/scripts/process-extracted-sources.ts [input-directory] [output-directory]
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';
import { Client as MCPClient } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Anthropic } from "@anthropic-ai/sdk";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const DEFAULT_INPUT_DIR = 'extracted-strings';
const DEFAULT_OUTPUT_DIR = 'processed-sources';
const MAX_RETRIES = 3;
const BATCH_SIZE = 1; // Process sources in smaller batches to avoid overwhelming the API

interface ProcessedSource {
  id: string;
  type: 'source';
  system_time: string;
  content: string;
  contentType: string;
  occurred: string;
  perspective: string;
  processing: string;
  crafted: string;
  experience: {
    qualities: Array<{
      type: string;
      manifestation: string;
      prominence: number;
    }>;
  };
  experiencer: string;
}

interface ProcessingResult {
  success: ProcessedSource[];
  failed: Array<{
    source: string;
    error: string;
    attempts: number;
  }>;
}

class SourceProcessor {
  private mcp: MCPClient;
  private anthropic: Anthropic;
  public transport: StdioClientTransport | null = null;
  private tools: any[] = [];

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is required");
    }

    this.anthropic = new Anthropic({ apiKey });
    this.mcp = new MCPClient({ name: "source-processor", version: "1.0.0" });
  }

  async connectToMCPServer(): Promise<void> {
    try {
      this.transport = new StdioClientTransport({
        command: "node",
        args: ["dist/index.js"]
      });
      
      await this.mcp.connect(this.transport);
      
      const toolsResult = await this.mcp.listTools();
      this.tools = toolsResult.tools.map((tool) => ({
        name: tool.name,
        description: tool.description || 'No description available',
        input_schema: tool.inputSchema,
      }));
      console.log("Anthropic tool schema:", JSON.stringify(this.tools, null, 2));
      
      console.log("Connected to MCP server with tools:", this.tools.map(({ name }) => name));
    } catch (error) {
      console.error("Failed to connect to MCP server:", error);
      throw error;
    }
  }

  async analyzeSourceWithRetry(sourceString: string, retryCount = 0): Promise<ProcessedSource> {
    try {
      const analysis = await this.analyzeSource(sourceString);
      return this.createProcessedSource(sourceString, analysis);
    } catch (error) {
      if (retryCount < MAX_RETRIES - 1) {
        const preview = sourceString.substring(0, 100) + '...';
        console.log(`⚠️  Retry ${retryCount + 1}/${MAX_RETRIES} for source: ${preview}`);
        await this.delay(1000 * (retryCount + 1)); // Exponential backoff
        return this.analyzeSourceWithRetry(sourceString, retryCount + 1);
      }
      throw error;
    }
  }

  private async analyzeSource(sourceString: string): Promise<any> {
    // Parse the source string to extract metadata
    const lines = sourceString.split('\n');
    const metadata: Record<string, string> = {};
    
    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();
        metadata[key] = value;
      }
    }

    // Extract the content (everything after "Content:")
    const contentIndex = sourceString.indexOf('Content:');
    const content = contentIndex >= 0 ? sourceString.substring(contentIndex + 8).trim() : sourceString;

    // First, use Claude to analyze the content and generate the experience analysis
    const analysisPrompt = `Analyze this experiential moment and create a Bridge-compliant source record:

${content}

Please analyze this experience and create a complete source record with:
1. An emoji that visually summarizes the experience
2. A narrative (max 200 chars) in the experiencer's voice using present tense and active language
3. Experiential qualities from the 7 Bridge dimensions: embodied, attentional, affective, purposive, spatial, temporal, intersubjective

For each quality, provide:
- type: One of the 7 dimensions above
- manifestation: How this quality specifically shows up in their experience  
- prominence: A number from 0.0 (absent) to 1.0 (dominant)

Return your analysis as a JSON object with "emoji", "narrative", and "qualities" fields.`;

    const messages = [
      {
        role: "user" as const,
        content: analysisPrompt
      }
    ];

    const response = await this.anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1000,
      messages,
    });

    // Extract the analysis from Claude's response
    const responseText = response.content[0].type === "text" ? response.content[0].text : "";
    
    let analysis;
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        // If no JSON found, try to parse the entire response
        analysis = JSON.parse(responseText);
      }
    } catch (parseError) {
      throw new Error(`Failed to parse analysis response: ${parseError}. Response: ${responseText}`);
    }

    // Now call the MCP capture tool with the complete data including the analysis
    const captureArgs = {
      experiences: [{
        content: content,
        experiencer: metadata['Experiencer'] || 'Unknown',
        perspective: metadata['Perspective'] || 'I',
        processing: metadata['Processing'] || 'during',
        occurred: metadata['Occurred'] || 'just now',
        contentType: metadata['Content Type'] || 'text',
        crafted: metadata['Crafted'] === 'true',
        experience: {
          qualities: analysis.qualities || [],
          emoji: analysis.emoji || '📝',
          narrative: analysis.narrative || content.substring(0, 200)
        }
      }]
    };

    // Call the MCP capture tool
    await this.mcp.callTool({
      name: 'capture',
      arguments: captureArgs,
    });

    // Return the analysis for the processed source creation
    return analysis;
  }

  private createProcessedSource(sourceString: string, analysis: any): ProcessedSource {
    // Parse the source string to extract metadata
    const lines = sourceString.split('\n');
    const metadata: Record<string, string> = {};
    
    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();
        metadata[key] = value;
      }
    }

    // Extract experience data from analysis
    const experience = {
      qualities: analysis.qualities || [],
      emoji: analysis.emoji || '📝',
      narrative: analysis.narrative || metadata['Content']?.substring(0, 200) || ''
    };

    return {
      id: `src_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'source',
      system_time: new Date().toISOString(),
      content: metadata['Content'] || '',
      contentType: metadata['Content Type'] || '',
      occurred: metadata['Occurred'] || '',
      perspective: metadata['Perspective'] || '',
      processing: metadata['Processing'] || '',
      crafted: metadata['Crafted'] || 'false',
      experience,
      experiencer: metadata['Experiencer'] || ''
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async processSources(sources: string[]): Promise<ProcessingResult> {
    const result: ProcessingResult = { success: [], failed: [] };
    
    console.log(`🔄 Processing ${sources.length} sources in batches of ${BATCH_SIZE}...`);
    
    for (let i = 0; i < sources.length; i += BATCH_SIZE) {
      const batch = sources.slice(i, i + BATCH_SIZE);
      console.log(`\n📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(sources.length / BATCH_SIZE)} (${batch.length} sources)`);
      
      const batchPromises = batch.map(async (source, index) => {
        const sourceIndex = i + index + 1;
        console.log(`  ${sourceIndex}/${sources.length}: Processing source...`);
        
        try {
          const processed = await this.analyzeSourceWithRetry(source);
          console.log(`  ✅ ${sourceIndex}/${sources.length}: Success`);
          return { success: true, source: processed };
        } catch (error) {
          const preview = source.substring(0, 100) + '...';
          console.log(`  ❌ ${sourceIndex}/${sources.length}: Failed after ${MAX_RETRIES} attempts for source: ${preview} - ${error}`);
          return { 
            success: false, 
            source: source, 
            error: error instanceof Error ? error.message : String(error),
            attempts: MAX_RETRIES
          };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      
      for (const batchResult of batchResults) {
        if (batchResult.success) {
          result.success.push(batchResult.source as ProcessedSource);
        } else {
          result.failed.push({
            source: batchResult.source as string,
            error: batchResult.error || 'Unknown error',
            attempts: batchResult.attempts || MAX_RETRIES
          });
        }
      }
      
      // Small delay between batches to be respectful to the API
      if (i + BATCH_SIZE < sources.length) {
        console.log("  ⏳ Waiting 2 seconds before next batch...");
        await this.delay(2000);
      }
    }
    
    return result;
  }
}

async function main() {
  const inputDir = process.argv[2] || DEFAULT_INPUT_DIR;
  const outputDir = process.argv[3] || DEFAULT_OUTPUT_DIR;
  
  console.log(`🚀 Starting source processing...`);
  console.log(`📁 Input directory: ${inputDir}`);
  console.log(`📁 Output directory: ${outputDir}`);
  
  // Ensure output directory exists
  mkdirSync(outputDir, { recursive: true });
  
  let processor: SourceProcessor | undefined;
  
  try {
    processor = new SourceProcessor();
    
    // Connect to MCP server
    await processor.connectToMCPServer();
  
    // Find all JSON files in the input directory
    const files = readdirSync(inputDir)
      .filter(file => file.endsWith('.json'))
      .filter(file => file.includes('-combined-strings.json')); // Only process combined string files
    
    if (files.length === 0) {
      console.log(`❌ No combined string files found in ${inputDir}`);
      console.log(`   Expected files ending with '-combined-strings.json'`);
      return;
    }
    
    console.log(`📄 Found ${files.length} files to process: ${files.join(', ')}`);
    
    for (const file of files) {
      console.log(`\n🔄 Processing file: ${file}`);
      
      const filePath = join(inputDir, file);
      const fileContent = readFileSync(filePath, 'utf-8');
      const sources: string[] = JSON.parse(fileContent);
      
      console.log(`   Found ${sources.length} sources in ${file}`);
      
      const result = await processor.processSources(sources);
      
      // Save successful results
      if (result.success.length > 0) {
        const outputFile = join(outputDir, file.replace('-combined-strings.json', '-processed-sources.json'));
        writeFileSync(outputFile, JSON.stringify(result.success, null, 2));
        console.log(`   ✅ Saved ${result.success.length} processed sources to ${outputFile}`);
      }
      
      // Save failed results for retry
      if (result.failed.length > 0) {
        const failedFile = join(outputDir, file.replace('-combined-strings.json', '-failed-sources.json'));
        writeFileSync(failedFile, JSON.stringify(result.failed, null, 2));
        console.log(`   ❌ Saved ${result.failed.length} failed sources to ${failedFile} for retry`);
      }
      
      console.log(`   📊 Summary: ${result.success.length} success, ${result.failed.length} failed`);
    }
    
    console.log(`\n🎉 Processing complete!`);
    
  } catch (error) {
    console.error(`❌ Processing failed: ${error}`);
    process.exit(1);
  } finally {
    // Clean up MCP connection
    if (processor?.transport) {
      await processor.transport.close();
    }
  }
}

main().catch(console.error); 