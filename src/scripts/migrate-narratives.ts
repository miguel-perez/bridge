/**
 * Migration script to add narratives to existing Bridge records.
 * 
 * This script connects to the Bridge MCP server and generates narratives
 * for all existing records that don't already have them.
 */

import { Client as MCPClient } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Anthropic } from "@anthropic-ai/sdk";
import { join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class NarrativeMigrator {
  private mcp: MCPClient;
  private anthropic: Anthropic;
  private stats = {
    total: 0,
    migrated: 0,
    skipped: 0,
    errors: 0
  };

  constructor() {
    this.mcp = new MCPClient({ 
      name: "bridge-narrative-migration", 
      version: "1.0.0" 
    });
    
    this.anthropic = new Anthropic({ 
      apiKey: process.env.ANTHROPIC_API_KEY 
    });
  }

  async connectToServer(): Promise<void> {
    console.log('🔌 Connecting to Bridge MCP server...');
    
    const serverPath = join(process.cwd(), 'dist', 'index.js');
    const transport = new StdioClientTransport({ 
      command: "node", 
      args: [serverPath],
      env: { ...process.env, NODE_ENV: 'migration' }
    });
    
    await this.mcp.connect(transport);
    console.log('✅ Connected to MCP server\n');
  }

  async getAllSources(): Promise<any[]> {
    console.log('📚 Fetching all sources...');
    
    // Use search with empty query to get all records
    const result = await this.mcp.callTool({
      name: 'search',
      arguments: {
        queries: [{
          query: '',
          limit: 1000,
          includeContext: true,
          includeFullContent: true
        }]
      }
    });

    // Parse the results from the response
    const content = Array.isArray(result.content) && result.content[0] && typeof result.content[0] === 'object' && 'text' in result.content[0] 
      ? (result.content[0] as { text: string }).text 
      : '';
    const matches = content.match(/ID: (src_[^\s]+)/g) || [];
    const sourceIds = matches.map((m: string) => m.replace('ID: ', ''));
    
    console.log(`✅ Found ${sourceIds.length} sources\n`);
    this.stats.total = sourceIds.length;
    
    return sourceIds;
  }

  async migrateSource(sourceId: string): Promise<void> {
    console.log(`\n🔄 Processing ${sourceId}...`);
    
    try {
      // Get the full source details
      const searchResult = await this.mcp.callTool({
        name: 'search',
        arguments: {
          queries: [{
            query: sourceId,
            limit: 1,
            includeContext: true,
            includeFullContent: true
          }]
        }
      });

      // Parse source from search results
      const resultText = Array.isArray(searchResult.content) && searchResult.content[0] && typeof searchResult.content[0] === 'object' && 'text' in searchResult.content[0] 
        ? (searchResult.content[0] as { text: string }).text 
        : '';
      
      // Check if already has narrative (would be mentioned in the display)
      if (resultText.includes('Narrative:')) {
        console.log('⏭️  Already has narrative, skipping');
        this.stats.skipped++;
        return;
      }

      // Extract content and qualities from the result
      const contentMatch = resultText.match(/Content: ([^\n]+(?:\n(?!Experiential Analysis:).*)*)/);
      const content = contentMatch ? contentMatch[1].trim() : '';
      
      // Extract qualities
      const qualitiesMatch = resultText.match(/Experiential Analysis:\n((?:• .+\n?)+)/);
      const qualitiesText = qualitiesMatch ? qualitiesMatch[1] : '';
      
      // Parse qualities into structured format
      const qualities = this.parseQualities(qualitiesText);
      
      // Generate narrative using Claude
      const narrative = await this.generateNarrative(content, qualities);
      console.log(`📝 Generated narrative: "${narrative.substring(0, 50)}..."`);
      
      // Update the source with the narrative
      await this.mcp.callTool({
        name: 'update',
        arguments: {
          updates: [{
            source_id: sourceId,
            narrative: narrative,
            regenerate_embeddings: true
          }]
        }
      });
      
      console.log('✅ Successfully migrated');
      this.stats.migrated++;
      
    } catch (error) {
      console.error(`❌ Failed to migrate: ${error}`);
      this.stats.errors++;
    }
  }

  private parseQualities(qualitiesText: string): any[] {
    const qualities = [];
    const lines = qualitiesText.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      const match = line.match(/• (\w+) \((\d+)%\): (.+)/);
      if (match) {
        qualities.push({
          type: match[1],
          prominence: parseInt(match[2]) / 100,
          manifestation: match[3]
        });
      }
    }
    
    return qualities;
  }

  private async generateNarrative(content: string, qualities: any[]): Promise<string> {
    // Calculate weights
    const totalProminence = qualities.reduce((sum, q) => sum + q.prominence, 0);
    const weightedQualities = qualities.map(q => ({
      ...q,
      weight: totalProminence > 0 ? (q.prominence / totalProminence * 100).toFixed(1) : 0
    }));

    const prompt = `Generate a narrative that integrates this content with weighted experiential qualities.

Content: "${content}"

Weighted Qualities:
${weightedQualities.map(q => `- ${q.type} (${q.weight}%): ${q.manifestation}`).join('\n')}

Instructions:
1. Preserve key phrases from the content
2. Integrate manifestations proportionally based on weights
3. Maintain natural flow and authentic voice
4. Keep it concise (1-2 sentences)
5. Don't use mechanical templates

Generate only the narrative, nothing else:`;

    const response = await this.anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }]
    });

    return response.content[0].type === 'text' ? response.content[0].text : content;
  }

  async runMigration(): Promise<void> {
    console.log('🚀 Starting narrative migration...\n');
    const startTime = Date.now();
    
    const sourceIds = await this.getAllSources();
    
    for (const sourceId of sourceIds) {
      await this.migrateSource(sourceId);
      // Small delay to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 Migration Summary:');
    console.log(`⏱️  Duration: ${duration} seconds`);
    console.log(`📚 Total sources: ${this.stats.total}`);
    console.log(`✅ Migrated: ${this.stats.migrated}`);
    console.log(`⏭️  Skipped: ${this.stats.skipped}`);
    console.log(`❌ Errors: ${this.stats.errors}`);
    console.log('='.repeat(50));
  }

  async cleanup(): Promise<void> {
    await this.mcp.close();
    console.log('\n🧹 Cleanup completed');
  }
}

async function main() {
  const migrator = new NarrativeMigrator();
  
  try {
    await migrator.connectToServer();
    await migrator.runMigration();
    console.log('\n🎉 Migration completed successfully!');
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  } finally {
    await migrator.cleanup();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
} 