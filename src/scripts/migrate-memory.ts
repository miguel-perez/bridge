#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';
import { Anthropic } from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Import the same capture schema used by Bridge
import { captureSchema } from '../services/capture.js';

interface MemorySource {
  id: string;
  content: string;
  contentType: string;
  created: string;
  when: string;
  perspective: string;
  experiencer: string;
  processing: string;
  type: string;
  reflects_on?: string[];
}

interface MemoryData {
  sources: MemorySource[];
  moments: any[];
  scenes: any[];
}

interface QualityEvidence {
  type: "embodied" | "attentional" | "affective" | "purposive" | "spatial" | "temporal" | "intersubjective";
  prominence: number;
  manifestation: string;
}

interface QualityVector {
  embodied: number;
  attentional: number;
  affective: number;
  purposive: number;
  spatial: number;
  temporal: number;
  intersubjective: number;
}

interface ExperientialQualities {
  qualities: QualityEvidence[];
  vector: QualityVector;
}

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
  experiential_qualities?: ExperientialQualities;
}

interface BridgeData {
  sources: BridgeSource[];
}

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function analyzeExperientialQualities(content: string, context: string): Promise<{
  qualities: QualityEvidence[];
  vector: QualityVector;
}> {
  const prompt = `You are an expert in phenomenological analysis of human experience. Analyze the following experiential content and identify the most prominent experiential qualities present.

Content: "${content}"
Context: ${context}

Please analyze this experience using these 7 specific experiential dimensions:
- embodied (bodily sensations, physical experiences, kinesthetic awareness)
- attentional (focus, awareness, cognitive engagement, mental processes)
- affective (emotions, feelings, moods, affective states)
- purposive (goals, intentions, motivations, directed action)
- spatial (location, environment, physical space, spatial awareness)
- temporal (time-related experiences, memories, anticipation, duration)
- intersubjective (social interactions, relationships, shared experiences, communication)

For each dimension, provide:
1. A prominence score (0.0-1.0) indicating how prominent this dimension is in the experience
2. A brief description of how it manifests

Return your response as a JSON object with:
1. "qualities": Array of the 2-3 most prominent dimensions with their manifestations
2. "vector": Object with all 7 dimensions scored from 0.0-1.0

Example response format:
{
  "qualities": [
    {
      "type": "temporal",
      "prominence": 0.8,
      "manifestation": "strong retrospective reflection on past events"
    },
    {
      "type": "affective",
      "prominence": 0.6,
      "manifestation": "mixed feelings of nostalgia and growth"
    }
  ],
  "vector": {
    "embodied": 0.2,
    "attentional": 0.7,
    "affective": 0.6,
    "purposive": 0.4,
    "spatial": 0.3,
    "temporal": 0.8,
    "intersubjective": 0.5
  }
}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 800,
      temperature: 0.1,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const content = response.content[0];
    if (content.type === 'text') {
      try {
        const result = JSON.parse(content.text);
        
        // Validate and ensure all vector dimensions are present
        const defaultVector: QualityVector = {
          embodied: 0.0,
          attentional: 0.0,
          affective: 0.0,
          purposive: 0.0,
          spatial: 0.0,
          temporal: 0.0,
          intersubjective: 0.0
        };
        
        const vector = { ...defaultVector, ...result.vector };
        
        // Ensure qualities have valid types
        const validTypes = ["embodied", "attentional", "affective", "purposive", "spatial", "temporal", "intersubjective"];
        const qualities = result.qualities?.filter((q: any) => validTypes.includes(q.type)) || [];
        
        return {
          qualities,
          vector
        };
      } catch (parseError) {
        console.warn('Failed to parse AI response, using fallback qualities');
        return getFallbackQualities();
      }
    }
  } catch (error) {
    console.warn('AI analysis failed, using fallback qualities:', error);
    return getFallbackQualities();
  }

  return getFallbackQualities();
}

async function analyzeExperientialQualitiesWithRetry(content: string, context: string, maxRetries = 3): Promise<{ qualities: QualityEvidence[]; vector: QualityVector }> {
  let attempt = 0;
  let lastError: any = null;
  while (attempt < maxRetries) {
    try {
      return await analyzeExperientialQualities(content, context);
    } catch (err) {
      lastError = err;
      attempt++;
      if (attempt < maxRetries) {
        console.warn(`Retrying AI analysis for content (attempt ${attempt + 1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
      }
    }
  }
  console.warn('AI analysis failed after retries, using fallback qualities:', lastError);
  return getFallbackQualities();
}

function getFallbackQualities(): { qualities: QualityEvidence[]; vector: QualityVector } {
  return {
    qualities: [
      {
        type: 'temporal',
        prominence: 0.5,
        manifestation: 'general temporal awareness'
      }
    ],
    vector: {
      embodied: 0.0,
      attentional: 0.5,
      affective: 0.0,
      purposive: 0.0,
      spatial: 0.0,
      temporal: 0.5,
      intersubjective: 0.0
    }
  };
}

function validateAsCapture(source: BridgeSource): { isValid: boolean; errors: string[] } {
  try {
    // Convert BridgeSource to capture input format
    const captureInput = {
      content: source.content,
      contentType: source.content_type || 'text',
      perspective: source.perspective || 'I',
      processing: source.processing || 'long-after',
      occurred: source.occurred,
      experiencer: source.experiencer || 'Miguel',
      crafted: false,
      experiential_qualities: source.experiential_qualities || getFallbackQualities()
    };

    // Validate using the same schema as capture service
    captureSchema.parse(captureInput);
    
    return { isValid: true, errors: [] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const details = error.errors.map(e => {
        const field = e.path.join('.');
        const message = e.message;
        
        // Provide specific guidance for common validation errors
        if (field === 'perspective') {
          return `Invalid perspective. Must be one of: I, we, you, they`;
        }
        if (field === 'processing') {
          return `Invalid processing level. Must be one of: during, right-after, long-after, crafted`;
        }
        if (field === 'content') {
          return `Content is required and cannot be empty.`;
        }
        if (field === 'experiencer') {
          return `Experiencer is required. Specify who experienced this.`;
        }
        if (field.includes('experiential_qualities')) {
          return `Invalid experiential qualities: ${message}`;
        }
        
        return `Invalid ${field}: ${message}`;
      });
      return { isValid: false, errors: details };
    }
    
    return { isValid: false, errors: [error instanceof Error ? error.message : 'Unknown validation error'] };
  }
}

async function migrateMemoryToBridge(): Promise<void> {
  console.log('Starting migration from memory.json to bridge.json with AI enrichment, validation, and retry logic...');
  
  // Check if ANTHROPIC_API_KEY is available
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('ANTHROPIC_API_KEY not found. Will use fallback experiential qualities.');
  } else {
    console.log('AI enrichment enabled with Claude.');
  }

  // Read memory.json
  const memoryPath = path.join(process.cwd(), 'memory.json');
  if (!fs.existsSync(memoryPath)) {
    throw new Error('memory.json not found in current directory');
  }

  const memoryData: MemoryData = JSON.parse(fs.readFileSync(memoryPath, 'utf8'));
  console.log(`Found ${memoryData.sources.length} sources to migrate`);

  // Convert sources
  const bridgeSources: BridgeSource[] = [];
  let validCount = 0;
  let invalidCount = 0;

  for (let i = 0; i < memoryData.sources.length; i++) {
    const source = memoryData.sources[i];
    console.log(`Processing source ${i + 1}/${memoryData.sources.length}: ${source.id}`);
    try {
      // Convert basic fields
      const bridgeSource: BridgeSource = {
        id: source.id,
        content: source.content,
        content_type: source.contentType,
        created: source.created,
        occurred: source.when,
        perspective: source.perspective,
        experiencer: source.experiencer,
        processing: source.processing,
        type: source.type
      };

      // Generate experiential qualities using AI with retry
      const context = `Perspective: ${source.perspective}, Experiencer: ${source.experiencer}, Processing: ${source.processing}, Time: ${source.when}`;
      const experientialQualities = await analyzeExperientialQualitiesWithRetry(source.content, context, 3);
      bridgeSource.experiential_qualities = experientialQualities;

      // Validate as capture
      const validation = validateAsCapture(bridgeSource);
      if (validation.isValid) {
        validCount++;
        console.log(`✓ Processed and validated source ${i + 1}/${memoryData.sources.length}: ${source.id}`);
      } else {
        invalidCount++;
        console.log(`⚠ Processed but validation failed for source ${i + 1}/${memoryData.sources.length}: ${source.id}`);
        console.log(`  Errors: ${validation.errors.join(', ')}`);
      }

      bridgeSources.push(bridgeSource);
    } catch (error) {
      console.error(`Error processing source ${source.id}:`, error);
      invalidCount++;
      // Return source with fallback qualities
      bridgeSources.push({
        id: source.id,
        content: source.content,
        content_type: source.contentType,
        created: source.created,
        occurred: source.when,
        perspective: source.perspective,
        experiencer: source.experiencer,
        processing: source.processing,
        type: source.type,
        experiential_qualities: getFallbackQualities()
      });
    }
  }

  // Create bridge data
  const bridgeData: BridgeData = {
    sources: bridgeSources
  };

  // Write to bridge.json
  const bridgePath = path.join(process.cwd(), 'bridge.json');
  fs.writeFileSync(bridgePath, JSON.stringify(bridgeData, null, 2));
  
  console.log(`\n✅ Migration completed successfully!`);
  console.log(`📁 Output: ${bridgePath}`);
  console.log(`📊 Sources migrated: ${bridgeSources.length}`);
  console.log(`✅ Valid captures: ${validCount}`);
  console.log(`⚠ Invalid captures: ${invalidCount}`);
  console.log(`🤖 AI enrichment: ${process.env.ANTHROPIC_API_KEY ? 'Enabled' : 'Disabled (using fallbacks)'}`);
  console.log(`🎯 Experiential dimensions: embodied, attentional, affective, purposive, spatial, temporal, intersubjective`);
  
  if (invalidCount > 0) {
    console.log(`\n⚠️  ${invalidCount} sources failed validation. They may not work properly with Bridge MCP tools.`);
  }
  
  if (process.env.ANTHROPIC_API_KEY) {
    console.log(`\n💡 Next steps:`);
    console.log(`   1. Review the generated experiential qualities and vectors`);
    console.log(`   2. Run 'npm run build' to compile the project`);
    console.log(`   3. Test with 'npm run test:debug' to verify search functionality`);
  }
}

// Run migration
migrateMemoryToBridge().catch(console.error); 