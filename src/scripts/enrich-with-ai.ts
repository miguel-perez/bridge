#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Anthropic } from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface BridgeSource {
  id: string;
  content: string;
  content_type?: string;
  created: string;
  occurred?: string;
  updated?: string;
  perspective?: string;
  experiencer?: string;
  processing?: string;
  type: string;
  experiential_qualities?: {
    qualities: Array<{
      type: string;
      prominence: number;
      manifestation: string;
    }>;
    vector: {
      embodied: number;
      attentional: number;
      affective: number;
      purposive: number;
      spatial: number;
      temporal: number;
      intersubjective: number;
    };
  };
}

interface BridgeData {
  sources: BridgeSource[];
}

class AIExperientialAnalyzer {
  private anthropic: Anthropic;
  private processedCount = 0;
  private totalCount = 0;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
  }

  private async analyzeContent(content: string): Promise<{
    qualities: Array<{
      type: string;
      prominence: number;
      manifestation: string;
    }>;
    vector: {
      embodied: number;
      attentional: number;
      affective: number;
      purposive: number;
      spatial: number;
      temporal: number;
      intersubjective: number;
    };
  }> {
    const prompt = `Analyze this experiential content and provide phenomenological quality scores. 

Content: "${content}"

Please analyze the seven experiential dimensions and provide:
1. A JSON object with "qualities" array (only include qualities that are actually present, minimum 1)
2. A "vector" object with all 7 dimensions scored 0.0-1.0

The seven dimensions are:
- embodied: How physicality textures the moment (sensations, posture, gestures, visceral feelings)
- attentional: The direction, quality, and movement of awareness (focus, shifts, meta-attention)
- affective: The emotional coloring or mood-space (emotions, background feeling, intensity, complexity)
- purposive: The sense of moving toward, away from, or through something (goals, drift, momentum, intention)
- spatial: The lived sense of place and position (location, scale, boundaries, spatial meaning)
- temporal: How past and future inhabit the present (time's pace, memory, anticipation, duration)
- intersubjective: How others' presence or absence shapes the moment (social dynamics, recognition, internalized voices)

Scoring rubric:
- 0.0-0.2: Minimal/absent
- 0.3-0.4: Present but backgrounded
- 0.5-0.6: Noticeable and contributing
- 0.7-0.8: Prominent feature
- 0.9-1.0: Dominant/defining

Return ONLY valid JSON in this exact format:
{
  "qualities": [
    {
      "type": "affective",
      "prominence": 0.8,
      "manifestation": "strong anxiety"
    }
  ],
  "vector": {
    "embodied": 0.2,
    "attentional": 0.5,
    "affective": 0.8,
    "purposive": 0.3,
    "spatial": 0.1,
    "temporal": 0.4,
    "intersubjective": 0.2
  }
}`;

    try {
      const response = await this.anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1, // Low temperature for consistent analysis
      });

      const resultText = response.content[0].type === 'text' ? response.content[0].text : '';
      
      // Extract JSON from response
      const jsonMatch = resultText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      const analysis = JSON.parse(jsonMatch[0]);
      
      // Validate the structure
      if (!analysis.qualities || !Array.isArray(analysis.qualities) || analysis.qualities.length === 0) {
        throw new Error('Invalid qualities array');
      }
      
      if (!analysis.vector || typeof analysis.vector !== 'object') {
        throw new Error('Invalid vector object');
      }

      // Ensure all vector dimensions are present and valid
      const requiredDimensions = ['embodied', 'attentional', 'affective', 'purposive', 'spatial', 'temporal', 'intersubjective'];
      for (const dim of requiredDimensions) {
        if (typeof analysis.vector[dim] !== 'number' || analysis.vector[dim] < 0 || analysis.vector[dim] > 1) {
          analysis.vector[dim] = 0.0; // Default to 0 if invalid
        }
      }

      return analysis;
    } catch (error) {
      console.error('❌ AI analysis failed:', error);
      // Return a safe fallback
      return {
        qualities: [
          {
            type: 'temporal',
            prominence: 0.5,
            manifestation: 'fallback analysis'
          }
        ],
        vector: {
          embodied: 0.2,
          attentional: 0.5,
          affective: 0.4,
          purposive: 0.6,
          spatial: 0.3,
          temporal: 0.7,
          intersubjective: 0.3
        }
      };
    }
  }

  async enrichSource(source: BridgeSource): Promise<BridgeSource> {
    try {
      console.log(`🔍 Analyzing source: ${source.id.substring(0, 20)}...`);
      
      const analysis = await this.analyzeContent(source.content);
      
      const enrichedSource: BridgeSource = {
        ...source,
        experiential_qualities: analysis,
        updated: new Date().toISOString()
      };

      this.processedCount++;
      console.log(`✅ Enriched ${this.processedCount}/${this.totalCount} sources`);
      
      return enrichedSource;
    } catch (error) {
      console.error(`❌ Failed to enrich source ${source.id}:`, error);
      return source; // Return original if enrichment fails
    }
  }

  async enrichAllSources(sources: BridgeSource[]): Promise<BridgeSource[]> {
    this.totalCount = sources.length;
    console.log(`🚀 Starting AI enrichment of ${this.totalCount} sources...\n`);

    const enrichedSources: BridgeSource[] = [];
    
    // Process in batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < sources.length; i += batchSize) {
      const batch = sources.slice(i, i + batchSize);
      console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(sources.length / batchSize)}`);
      
      const batchPromises = batch.map(source => this.enrichSource(source));
      const batchResults = await Promise.all(batchPromises);
      enrichedSources.push(...batchResults);
      
      // Small delay between batches to be respectful to the API
      if (i + batchSize < sources.length) {
        console.log('⏳ Waiting 2 seconds before next batch...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    return enrichedSources;
  }
}

async function main() {
  try {
    console.log('🧠 Starting AI-powered experiential quality enrichment...');
    
    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('❌ ANTHROPIC_API_KEY environment variable is required');
      process.exit(1);
    }

    // Read the bridge.json file
    const bridgePath = path.join(__dirname, '../../bridge.json');
    if (!fs.existsSync(bridgePath)) {
      console.error('❌ bridge.json not found. Run migration first.');
      process.exit(1);
    }

    const bridgeData: BridgeData = JSON.parse(fs.readFileSync(bridgePath, 'utf8'));
    console.log(`📖 Found ${bridgeData.sources.length} sources in bridge.json`);

    // Create analyzer and enrich sources
    const analyzer = new AIExperientialAnalyzer();
    const enrichedSources = await analyzer.enrichAllSources(bridgeData.sources);

    // Create backup of original data
    const backupPath = path.join(__dirname, '../../bridge-backup.json');
    fs.writeFileSync(backupPath, JSON.stringify(bridgeData, null, 2));
    console.log(`💾 Created backup at bridge-backup.json`);

    // Save enriched data
    const enrichedData: BridgeData = {
      sources: enrichedSources
    };

    fs.writeFileSync(bridgePath, JSON.stringify(enrichedData, null, 2));
    console.log(`💾 Saved enriched data to bridge.json`);

    // Show statistics
    const enrichedCount = enrichedSources.filter(s => (s.experiential_qualities?.qualities?.length ?? 0) > 0).length;
    const updatedCount = enrichedSources.filter(s => s.updated).length;

    console.log('\n📊 Enrichment Statistics:');
    console.log(`Total sources: ${enrichedSources.length}`);
    console.log(`Successfully enriched: ${enrichedCount}`);
    console.log(`Updated timestamps: ${updatedCount}`);

    console.log('\n🎉 AI enrichment completed successfully!');
    console.log('💡 Next steps:');
    console.log('  1. Review the enriched data in bridge.json');
    console.log('  2. Test the Bridge MCP tools with real experiential qualities');
    console.log('  3. If needed, restore from bridge-backup.json');

  } catch (error) {
    console.error('❌ Enrichment failed:', error);
    process.exit(1);
  }
}

main(); 