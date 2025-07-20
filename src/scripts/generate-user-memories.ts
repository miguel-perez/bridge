/**
 * Generate synthetic user memory summaries from Bridge data
 * Creates realistic user context for test scenarios
 */

import Anthropic from '@anthropic-ai/sdk';
import { config } from 'dotenv';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

config();

const DATA_DIR = join(process.cwd(), 'data', 'test-bridge');
const BRIDGE_DATA_FILE = join(process.cwd(), 'data', 'development', 'test_DataGeneration_bridge.json');
const OUTPUT_FILE = join(DATA_DIR, 'synthetic-user-context.json');

interface BridgeData {
  sources: Array<{
    id: string;
    source: string;
    experiencer: string;
    perspective: string;
    processing: string;
    experience: string[];
    created: string;
  }>;
}

interface UserContext {
  bridgeMemories: string;
  personalMemories: string;
  generatedAt: string;
}

async function generateUserMemories(): Promise<UserContext> {
  // Read Bridge data
  if (!existsSync(BRIDGE_DATA_FILE)) {
    throw new Error('Bridge data file not found. Run generate:test-data first.');
  }
  
  const bridgeData: BridgeData = JSON.parse(readFileSync(BRIDGE_DATA_FILE, 'utf-8'));
  
  // Sample experiences for summary
  const miguelExperiences = bridgeData.sources.filter(s => s.experiencer === 'Miguel');
  const claudeExperiences = bridgeData.sources.filter(s => s.experiencer === 'Claude');
  
  // Take a representative sample (every 5th experience)
  const sampledMiguel = miguelExperiences.filter((_, i) => i % 5 === 0);
  const sampledClaude = claudeExperiences.filter((_, i) => i % 3 === 0);
  
  console.log(`📊 Sampling from ${miguelExperiences.length} Miguel experiences and ${claudeExperiences.length} Claude partnership experiences`);
  console.log(`   Using ${sampledMiguel.length} Miguel samples and ${sampledClaude.length} Claude samples\n`);
  
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });
  
  // Generate Bridge memories summary
  console.log('🧠 Generating "What I remember with Claude" summary...');
  
  const bridgeMemoriesPrompt = `Based on these captured experiences, write a first-person summary of "What I remember with Claude" from Miguel's perspective. 
Focus on the key themes, patterns, and memorable moments from our partnership. Keep it personal and reflective, about 200-300 words.

My experiences:
${sampledMiguel.map(exp => `- ${exp.source}`).join('\n')}

Our partnership experiences:
${sampledClaude.map(exp => `- ${exp.source}`).join('\n')}

Write the summary as Miguel would, reflecting on these captured moments with Claude.`;

  const bridgeResponse = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: bridgeMemoriesPrompt
    }]
  });
  
  const bridgeMemories = bridgeResponse.content
    .filter(c => c.type === 'text')
    .map(c => c.text)
    .join('');
  
  console.log('✅ Bridge memories generated\n');
  
  // Generate expanded personal memories
  console.log('🌟 Generating expanded personal memories...');
  
  const personalMemoriesPrompt = `Based on Miguel's profile and the experiences shown, generate a much more detailed set of personal memories that Miguel would have but might not have recorded in Bridge.

Miguel's profile:
- UX Designer, Product Manager, AI Researcher
- Science Fiction Fan (Star Trek, Digimon)
- Autism, ADHD, Insomnia, Depression
- Systems Building As Self Soothing
- Cognitive Cartographer Voice
- Likes Trading Card Games, Cooking, Coding, Art, Games Design

Include specific memories about:
1. Childhood experiences with Digimon and early tech
2. Professional journey and key projects
3. Specific Star Trek episodes and what they meant
4. Sensory preferences and aversions
5. Daily routines and coping mechanisms
6. Unfinished projects and ongoing obsessions
7. Social experiences and relationships
8. Creative works and ideas
9. Technical skills and learning moments
10. Dreams, fears, and aspirations

This should be 800-1000 words, written in first person as Miguel's internal narrative. Include specific details, names, places, and feelings that make it feel real and lived-in. These are the kinds of details that shape who Miguel is but might never make it into Bridge.`;

  const personalResponse = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 3000,
    messages: [{
      role: 'user',
      content: personalMemoriesPrompt
    }]
  });
  
  const personalMemories = personalResponse.content
    .filter(c => c.type === 'text')
    .map(c => c.text)
    .join('');
  
  console.log('✅ Personal memories generated\n');
  
  // Save the context
  const userContext: UserContext = {
    bridgeMemories,
    personalMemories,
    generatedAt: new Date().toISOString()
  };
  
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(OUTPUT_FILE, JSON.stringify(userContext, null, 2));
  
  console.log(`💾 Saved user context to ${OUTPUT_FILE}`);
  console.log(`\n📝 Summary:`);
  console.log(`   Bridge memories: ${bridgeMemories.split(' ').length} words`);
  console.log(`   Personal memories: ${personalMemories.split(' ').length} words`);
  
  return userContext;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateUserMemories().catch(console.error);
}

export { generateUserMemories };